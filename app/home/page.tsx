'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

const QUOTES = [
  { text: "La vraie vie, la vie enfin découverte et éclaircie, c'est la littérature.", author: "Marcel Proust" },
  { text: "J'ai toujours imaginé que le Paradis serait une sorte de bibliothèque.", author: "Jorge Luis Borges" },
  { text: "Un livre doit être la hache qui brise la mer gelée en nous.", author: "Franz Kafka" },
  { text: "Lisez afin de vivre.", author: "Gustave Flaubert" },
  { text: "La beauté sauvera le monde.", author: "Fiodor Dostoïevski" },
  { text: "La littérature est la preuve que la vie ne suffit pas.", author: "Fernando Pessoa" },
  { text: "Un roman est un miroir qui se promène sur une grande route.", author: "Stendhal" },
  { text: "Les livres sont les miroirs de l'âme.", author: "Virginia Woolf" },
  { text: "Il faut imaginer Sisyphe heureux.", author: "Albert Camus" },
  { text: "Un bon lecteur, un grand lecteur est un relecteur.", author: "Vladimir Nabokov" },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)
  if (days > 6) return `${Math.floor(days / 7)}sem`
  if (days > 0) return `${days}j`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}min`
  return 'maintenant'
}

function stars(n: number): string {
  if (!n || n < 1) return ''
  const full = Math.round(n)
  return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full))
}

const STATUS_ACTION: Record<string, string> = {
  a_lire: 'a ajouté', en_cours: 'a commencé', lu: 'a terminé',
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [enCours, setEnCours] = useState<any[]>([])
  const [nextBook, setNextBook] = useState<any>(null)
  const [myRecentBooks, setMyRecentBooks] = useState<any[]>([])
  const [myCircles, setMyCircles] = useState<any[]>([])
  const [feed, setFeed] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [stats, setStats] = useState({ booksThisMonth: 0, totalNotes: 0, streak: 0 })
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('Bonjour')
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir')
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setUser(data.user)
      loadAll(data.user.id)
      loadUnread(data.user.id)
    })
  }, [])

  const loadUnread = async (userId: string) => {
    const { count } = await supabase
      .from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('read', false)
    setUnreadCount(count || 0)
  }

  const loadAll = async (userId: string) => {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [enCoursRes, nextBookRes, myRecentRes, followsRes, myCirclesRes, allMyBooksRes, booksMonthRes, notesCountRes] = await Promise.all([
      supabase.from('readings').select('*, books(*)')
        .eq('user_id', userId).eq('status', 'en_cours')
        .order('created_at', { ascending: false }).limit(1),
      supabase.from('readings').select('*, books(*)')
        .eq('user_id', userId).eq('status', 'a_lire')
        .order('created_at', { ascending: false }).limit(1),
      supabase.from('readings').select('*, books(*)')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
      supabase.from('follows').select('following_id').eq('follower_id', userId),
      supabase.from('circle_members').select('*, circles(*)')
        .eq('user_id', userId).order('joined_at', { ascending: false }).limit(6),
      supabase.from('readings').select('book_id').eq('user_id', userId),
      supabase.from('readings').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('status', 'lu').gte('updated_at', startOfMonth.toISOString()),
      supabase.from('notes').select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ])

    setEnCours(enCoursRes.data || [])
    setNextBook((nextBookRes.data || [])[0] ?? null)
    setMyRecentBooks(myRecentRes.data || [])

    // Streak: count consecutive days with notes activity (last 30 days)
    const { data: recentNotes } = await supabase
      .from('notes').select('created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('created_at', { ascending: false })

    const uniqueDays = new Set((recentNotes || []).map((n: any) =>
      new Date(n.created_at).toDateString()
    ))
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      if (uniqueDays.has(d.toDateString())) streak++
      else if (i > 0) break
    }

    setStats({
      booksThisMonth: booksMonthRes.count || 0,
      totalNotes: notesCountRes.count || 0,
      streak,
    })
    setMyCircles((myCirclesRes.data || []).filter((m: any) => m.circles))

    const followingIds = (followsRes.data || []).map((f: any) => f.following_id)

    if (followingIds.length > 0) {
      const [feedReadingsRes, feedCirclesRes] = await Promise.all([
        supabase.from('readings').select('*, books(*)')
          .in('user_id', followingIds).order('created_at', { ascending: false }).limit(20),
        supabase.from('circle_members').select('*, circles(*)')
          .in('user_id', followingIds).order('joined_at', { ascending: false }).limit(10),
      ])

      const allUids = [...new Set([
        ...(feedReadingsRes.data || []).map((r: any) => r.user_id),
        ...(feedCirclesRes.data || []).map((m: any) => m.user_id),
      ])]

      let profileMap: Record<string, any> = {}
      if (allUids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles').select('id, username, avatar_url').in('id', allUids)
        profileMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
      }

      const readingEvents = (feedReadingsRes.data || []).map((r: any) => ({
        id: `r_${r.id}`, type: 'reading' as const,
        user_id: r.user_id, profile: profileMap[r.user_id],
        date: r.created_at, status: r.status, rating: r.rating, book: r.books,
      }))

      const circleEvents = (feedCirclesRes.data || []).filter((m: any) => m.circles).map((m: any) => ({
        id: `c_${m.id}`, type: 'circle_join' as const,
        user_id: m.user_id, profile: profileMap[m.user_id],
        date: m.joined_at, circle: m.circles,
      }))

      setFeed([...readingEvents, ...circleEvents]
        .filter(e => e.profile)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15))
    } else {
      setFeed([])
    }

    const myIds = (allMyBooksRes.data || []).map((r: any) => r.book_id)
    const { data: books } = await supabase
      .from('books').select('*').order('created_at', { ascending: false }).limit(24)
    setSuggestions((books || []).filter((b: any) => !myIds.includes(b.id)).slice(0, 6))

    setLoading(false)
  }

  const updateProgress = (readingId: string, value: number) => {
    setEnCours(prev => prev.map(r => r.id === readingId ? { ...r, progress: value } : r))
    if (progressTimer.current) clearTimeout(progressTimer.current)
    progressTimer.current = setTimeout(() => {
      supabase.from('readings').update({ progress: value }).eq('id', readingId)
    }, 500)
  }

  const addToLibrary = async (book: any) => {
    if (!user) return
    setSuggestions(prev => prev.filter(b => b.id !== book.id))
    await supabase.from('readings').insert({ user_id: user.id, book_id: book.id, status: 'a_lire' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex items-center justify-center">
        <div className="text-[#7a7268] text-sm">Chargement...</div>
      </div>
    )
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.username || ''

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-28 relative overflow-x-hidden">

      {/* ── Vignetting bords ── */}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{ boxShadow: 'inset 0 0 120px 40px rgba(0,0,0,0.30)' }}
        aria-hidden
      />

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-5 flex items-start justify-between relative overflow-hidden">
        {/* Panorama décoratif pleine largeur */}
        <svg
          aria-hidden
          viewBox="0 0 800 120"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-0 left-0 w-full"
          style={{ opacity: 0.13, height: '120px', zIndex: -1 }}
          fill="none"
          stroke="white"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ── Colonnes grecques (gauche) ── */}
          {/* Stylobate */}
          <line x1="8" y1="118" x2="232" y2="118" />
          <line x1="12" y1="114" x2="228" y2="114" />
          {/* Entablement */}
          <line x1="6" y1="16" x2="234" y2="16" />
          <line x1="10" y1="20" x2="230" y2="20" />
          <line x1="14" y1="24" x2="226" y2="24" />
          {/* Colonne 1, cx=52 */}
          <line x1="38" y1="26" x2="66" y2="26" />
          <line x1="41" y1="28" x2="63" y2="28" />
          <line x1="42" y1="30" x2="42" y2="112" strokeWidth="0.7" />
          <line x1="52" y1="30" x2="52" y2="112" strokeWidth="0.7" />
          <line x1="62" y1="30" x2="62" y2="112" strokeWidth="0.7" />
          <line x1="40" y1="112" x2="64" y2="112" />
          <line x1="37" y1="114" x2="67" y2="114" />
          {/* Colonne 2, cx=118 */}
          <line x1="104" y1="26" x2="132" y2="26" />
          <line x1="107" y1="28" x2="129" y2="28" />
          <line x1="108" y1="30" x2="108" y2="112" strokeWidth="0.7" />
          <line x1="118" y1="30" x2="118" y2="112" strokeWidth="0.7" />
          <line x1="128" y1="30" x2="128" y2="112" strokeWidth="0.7" />
          <line x1="106" y1="112" x2="130" y2="112" />
          <line x1="103" y1="114" x2="133" y2="114" />
          {/* Colonne 3, cx=184 */}
          <line x1="170" y1="26" x2="198" y2="26" />
          <line x1="173" y1="28" x2="195" y2="28" />
          <line x1="174" y1="30" x2="174" y2="112" strokeWidth="0.7" />
          <line x1="184" y1="30" x2="184" y2="112" strokeWidth="0.7" />
          <line x1="194" y1="30" x2="194" y2="112" strokeWidth="0.7" />
          <line x1="172" y1="112" x2="196" y2="112" />
          <line x1="169" y1="114" x2="199" y2="114" />

          {/* ── Montagne (centre) ── */}
          {/* Pic principal */}
          <polyline points="280,120 390,10 500,120" />
          {/* Pic secondaire (devant, droite) */}
          <polyline points="430,120 492,46 558,120" />
          {/* Suggestion neige */}
          <polyline points="383,26 390,10 397,26" />

          {/* ── Forêt de sapins (droite) ── */}
          {/* Arbre 1, cx=612, grand */}
          <line x1="612" y1="48" x2="612" y2="120" />
          <line x1="612" y1="62" x2="596" y2="76" /><line x1="612" y1="62" x2="628" y2="76" />
          <line x1="612" y1="76" x2="592" y2="94" /><line x1="612" y1="76" x2="632" y2="94" />
          <line x1="612" y1="90" x2="588" y2="112" /><line x1="612" y1="90" x2="636" y2="112" />
          {/* Arbre 2, cx=650, moyen */}
          <line x1="650" y1="62" x2="650" y2="120" />
          <line x1="650" y1="74" x2="636" y2="86" /><line x1="650" y1="74" x2="664" y2="86" />
          <line x1="650" y1="86" x2="632" y2="102" /><line x1="650" y1="86" x2="668" y2="102" />
          <line x1="650" y1="98" x2="628" y2="118" /><line x1="650" y1="98" x2="672" y2="118" />
          {/* Arbre 3, cx=688, grand */}
          <line x1="688" y1="44" x2="688" y2="120" />
          <line x1="688" y1="58" x2="672" y2="72" /><line x1="688" y1="58" x2="704" y2="72" />
          <line x1="688" y1="72" x2="668" y2="90" /><line x1="688" y1="72" x2="708" y2="90" />
          <line x1="688" y1="86" x2="664" y2="108" /><line x1="688" y1="86" x2="712" y2="108" />
          {/* Arbre 4, cx=724, moyen */}
          <line x1="724" y1="58" x2="724" y2="120" />
          <line x1="724" y1="70" x2="710" y2="82" /><line x1="724" y1="70" x2="738" y2="82" />
          <line x1="724" y1="82" x2="706" y2="98" /><line x1="724" y1="82" x2="742" y2="98" />
          <line x1="724" y1="94" x2="702" y2="116" /><line x1="724" y1="94" x2="746" y2="116" />
          {/* Arbre 5, cx=758, petit */}
          <line x1="758" y1="66" x2="758" y2="120" />
          <line x1="758" y1="78" x2="746" y2="88" /><line x1="758" y1="78" x2="770" y2="88" />
          <line x1="758" y1="88" x2="742" y2="104" /><line x1="758" y1="88" x2="774" y2="104" />
          <line x1="758" y1="100" x2="740" y2="118" /><line x1="758" y1="100" x2="776" y2="118" />
          {/* Arbre 6, cx=790, moyen */}
          <line x1="790" y1="54" x2="790" y2="120" />
          <line x1="790" y1="66" x2="776" y2="78" /><line x1="790" y1="66" x2="800" y2="78" />
          <line x1="790" y1="78" x2="772" y2="94" /><line x1="790" y1="78" x2="800" y2="94" />
          <line x1="790" y1="92" x2="768" y2="114" /><line x1="790" y1="92" x2="800" y2="114" />
        </svg>

        <div className="flex-1 min-w-0 pr-3">
          {/* Date */}
          <p className="text-[#7a7268] text-[11px] capitalize tracking-wide mb-0.5">{today}</p>

          {/* Salutation */}
          <h1 className="font-serif text-[28px] leading-tight text-white">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>

          {/* Citation inline */}
          <p className="text-white/30 text-[11px] italic font-serif leading-snug mt-1.5">
            &ldquo;{quote.text.length > 80 ? quote.text.slice(0, 80) + '…' : quote.text}&rdquo; — {quote.author}
          </p>
        </div>

        {/* Cloche */}
        <a href="/notifications" className="relative p-1.5 -mr-1 shrink-0 mt-0.5">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#7a7268" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] bg-[#c9440e] rounded-full flex items-center justify-center px-0.5">
              <span className="text-white text-[9px] font-bold leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
            </span>
          )}
        </a>
      </div>

      {/* ── Séparateur dégradé ── */}
      <div
        aria-hidden
        className="mx-5 mb-5 h-px"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #c9440e22 30%, #c9440e40 50%, #c9440e22 70%, transparent 100%)' }}
      />

      {/* ── EN COURS + À LIRE ── */}
      <section className="px-5 mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[#7a7268] text-[10px] font-medium tracking-[0.14em] uppercase">Lecture</h2>
          <a href="/bibliotheque" className="text-[#7a7268] text-[10px] hover:text-white transition">Bibliothèque →</a>
        </div>

        {enCours.length > 0 || nextBook ? (
          <div className="grid grid-cols-2 gap-2.5">
            {/* Colonne gauche : en cours */}
            {enCours[0] ? (() => {
              const reading = enCours[0]
              const progress = reading.progress ?? 0
              return (
                <div className="bg-[#211e1a] border border-white/8 rounded-xl p-3 flex gap-2.5">
                  <a href={`/fiche/${reading.id}`} className="shrink-0">
                    <div className="w-[56px] h-[82px] rounded-lg overflow-hidden bg-[#3a3530] relative">
                      {reading.books?.cover_url
                        ? <img src={reading.books.cover_url} className="w-full h-full object-cover" alt={reading.books.title} />
                        : <div className="w-full h-full bg-gradient-to-b from-[#2e2a24] to-[#1a1714]" />}
                      <div aria-hidden className="absolute inset-0 rounded-lg" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', opacity: 0.03, mixBlendMode: 'overlay' }} />
                    </div>
                  </a>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <p className="text-[9px] text-[#c9440e] font-medium uppercase tracking-wide mb-0.5">En cours</p>
                      <p className="font-serif text-[13px] text-white leading-snug line-clamp-3">{reading.books?.title}</p>
                    </div>
                    <div>
                      <div className="relative w-full h-0.5 bg-white/8 rounded-full overflow-hidden mb-1.5">
                        <div className="h-full bg-[#c9440e] rounded-full" style={{ width: `${progress}%` }} />
                        <input type="range" min={0} max={100} value={progress}
                          onChange={e => updateProgress(reading.id, Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      <a href={`/fiche/${reading.id}`} className="text-[#c9440e] text-[10px] font-medium">
                        {progress > 0 ? `${progress}% · ` : ''}Reprendre →
                      </a>
                    </div>
                  </div>
                </div>
              )
            })() : (
              <a href="/bibliotheque" className="bg-[#211e1a] border border-white/8 rounded-xl p-3 flex items-center justify-center text-center">
                <div>
                  <p className="text-white/30 font-serif text-xs mb-1">Rien en cours</p>
                  <p className="text-[#c9440e] text-[10px]">Commencer →</p>
                </div>
              </a>
            )}

            {/* Colonne droite : à lire */}
            {nextBook ? (
              <a href={`/fiche/${nextBook.id}`} className="bg-[#211e1a] border border-white/8 rounded-xl p-3 flex gap-2.5">
                <div className="shrink-0">
                  <div className="w-[56px] h-[82px] rounded-lg overflow-hidden bg-[#3a3530] relative">
                    {nextBook.books?.cover_url
                      ? <img src={nextBook.books.cover_url} className="w-full h-full object-cover" alt={nextBook.books.title} />
                      : <div className="w-full h-full bg-gradient-to-b from-[#2e2a24] to-[#1a1714]" />}
                    <div aria-hidden className="absolute inset-0 rounded-lg" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', opacity: 0.03, mixBlendMode: 'overlay' }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <p className="text-[9px] text-[#7a7268] font-medium uppercase tracking-wide mb-0.5">À lire</p>
                    <p className="font-serif text-[13px] text-white leading-snug line-clamp-3">{nextBook.books?.title}</p>
                  </div>
                  <p className="text-[#7a7268] text-[10px] truncate">{nextBook.books?.author?.split(' ').pop()}</p>
                </div>
              </a>
            ) : (
              <a href="/bibliotheque" className="bg-[#211e1a] border border-white/8 rounded-xl p-3 flex items-center justify-center text-center">
                <div>
                  <p className="text-white/30 font-serif text-xs mb-1">File vide</p>
                  <p className="text-[#c9440e] text-[10px]">Ajouter →</p>
                </div>
              </a>
            )}
          </div>
        ) : myRecentBooks.length > 0 ? (
          <div className="bg-[#211e1a] border border-white/8 rounded-2xl overflow-hidden">
            {myRecentBooks.map((reading, i) => (
              <a key={reading.id} href={`/fiche/${reading.id}`}
                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition ${i < myRecentBooks.length - 1 ? 'border-b border-white/5' : ''}`}
              >
                <div className="w-7 h-10 rounded overflow-hidden bg-[#3a3530] shrink-0">
                  {reading.books?.cover_url
                    ? <img src={reading.books.cover_url} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full bg-gradient-to-b from-[#2e2a24] to-[#1a1714]" />}
                </div>
                <p className="flex-1 font-serif text-sm text-white leading-tight truncate">{reading.books?.title}</p>
                <span className="text-[#7a7268] text-[10px] shrink-0">{reading.books?.author?.split(' ').pop()}</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-[#211e1a] border border-white/8 rounded-2xl px-5 py-6 text-center">
            <p className="text-white/40 text-sm font-serif mb-3">Ta bibliothèque est vide</p>
            <a href="/bibliotheque" className="text-[#c9440e] text-xs font-medium">Ajouter un livre →</a>
          </div>
        )}
      </section>

      {/* ── MA SEMAINE EN CHIFFRES ── */}
      <section className="px-5 mb-5">
        <h2 className="text-[#7a7268] text-[10px] font-medium tracking-[0.14em] uppercase mb-2.5">Ce mois-ci</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#211e1a] border border-white/8 rounded-xl px-3 py-2.5 text-center">
            <p className="font-serif text-white text-2xl leading-none mb-0.5">{stats.booksThisMonth}</p>
            <p className="text-[#7a7268] text-[10px]">lu{stats.booksThisMonth !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-[#211e1a] border border-white/8 rounded-xl px-3 py-2.5 text-center">
            <p className="font-serif text-white text-2xl leading-none mb-0.5">{stats.totalNotes}</p>
            <p className="text-[#7a7268] text-[10px]">fiche{stats.totalNotes !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-[#211e1a] border border-white/8 rounded-xl px-3 py-2.5 text-center">
            <p className="font-serif text-white text-2xl leading-none mb-0.5">{stats.streak}</p>
            <p className="text-[#7a7268] text-[10px]">j. consécutif{stats.streak !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </section>

      {/* ── MES CERCLES — pills horizontal ── */}
      {myCircles.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between px-5 mb-2.5">
            <h2 className="text-[#7a7268] text-[10px] font-medium tracking-[0.14em] uppercase">Mes cercles</h2>
            <a href="/cercles" className="text-[#7a7268] text-[10px] hover:text-white transition">Voir tout →</a>
          </div>

          <div className="flex gap-2 px-5 overflow-x-auto pb-1 scrollbar-hide">
            {myCircles.map(membership => {
              const circle = membership.circles
              const color = circle.cover_color || '#c9440e'
              return (
                <a
                  key={circle.id}
                  href={`/cercles/${circle.id}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition active:opacity-70"
                  style={{
                    backgroundColor: `${color}15`,
                    borderColor: `${color}35`,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-white text-xs font-medium whitespace-nowrap">{circle.name}</span>
                </a>
              )
            })}
            <a
              href="/cercles"
              className="shrink-0 flex items-center px-3 py-1.5 rounded-full border border-white/10 text-[#7a7268] text-xs hover:text-white transition"
            >
              + Nouveau
            </a>
          </div>
        </section>
      )}

      {/* ── OBJECTIFS ── */}
      <section className="px-5 mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[#7a7268] text-[10px] font-medium tracking-[0.14em] uppercase">Objectifs</h2>
          <a href="/objectifs" className="text-[#7a7268] text-[10px] hover:text-white transition">Voir →</a>
        </div>
        <a href="/objectifs" className="flex items-center gap-3 bg-[#211e1a] border border-white/8 rounded-xl px-4 py-3 hover:bg-white/3 transition">
          <div className="w-8 h-8 rounded-lg bg-[#c9440e]/10 border border-[#c9440e]/20 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9440e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium">Définis tes objectifs de lecture</p>
            <p className="text-[#7a7268] text-[10px] mt-0.5">Rythme quotidien, hebdomadaire...</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a7268" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      </section>

      {/* ── FEED ── */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[#7a7268] text-[10px] font-medium tracking-[0.14em] uppercase">Activité</h2>
          <a href="/explorer" className="text-[#7a7268] text-[10px] hover:text-white transition">Explorer →</a>
        </div>

        {feed.length === 0 ? (
          <div className="bg-[#211e1a] border border-white/8 rounded-2xl px-5 py-6 text-center">
            <p className="text-white/40 text-sm font-serif mb-3">Aucune activité</p>
            <a href="/explorer" className="text-[#c9440e] text-xs font-medium">Suivre des lecteurs →</a>
          </div>
        ) : (
          <div className="bg-[#211e1a] border border-white/8 rounded-2xl overflow-hidden">
            {feed.map((item, i) => {
              const username = item.profile?.username
              const avatarUrl = item.profile?.avatar_url
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < feed.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  {/* Avatar 32px */}
                  <a href={`/profil/${username}`} className="shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#c9440e]/15 flex items-center justify-center overflow-hidden">
                      {avatarUrl
                        ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                        : <span className="font-serif text-[#c9440e] text-xs leading-none">{username?.[0]?.toUpperCase() ?? '?'}</span>}
                    </div>
                  </a>

                  {/* Texte compact sur une ligne */}
                  <p className="flex-1 min-w-0 text-xs leading-none truncate">
                    <a href={`/profil/${username}`} className="font-medium text-white">@{username}</a>
                    {' '}
                    {item.type === 'reading' && (
                      <>
                        <span className="text-[#7a7268]">{STATUS_ACTION[item.status] ?? 'a ajouté'}</span>
                        {' '}
                        <span className="font-serif italic text-white/70">{item.book?.title}</span>
                        {item.status === 'lu' && item.rating > 0 && (
                          <span className="text-[#c9440e] ml-0.5">{stars(item.rating)}</span>
                        )}
                      </>
                    )}
                    {item.type === 'circle_join' && (
                      <>
                        <span className="text-[#7a7268]">a rejoint</span>
                        {' '}
                        <a href={`/cercles/${item.circle?.id}`} className="font-medium text-white">{item.circle?.name}</a>
                      </>
                    )}
                  </p>

                  {/* Timestamp */}
                  <span className="text-[#7a7268] text-[10px] shrink-0 ml-1">{timeAgo(item.date)}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── SUGGESTIONS ── */}
      {suggestions.length > 0 && (
        <section className="px-5 mb-6">
          <h2 className="text-[#7a7268] text-[10px] font-medium tracking-[0.14em] uppercase mb-2.5">À découvrir</h2>
          <div className="grid grid-cols-3 gap-3">
            {suggestions.map(book => (
              <div key={book.id}>
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#242018] mb-1.5 group">
                  {book.cover_url
                    ? <img src={book.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={book.title} />
                    : <div className="w-full h-full flex items-end p-2 bg-gradient-to-b from-[#2e2a24] to-[#1a1714]">
                        <p className="font-serif text-[9px] text-white/50 leading-tight line-clamp-4">{book.title}</p>
                      </div>}
                  <button
                    onClick={() => addToLibrary(book)}
                    className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-[#c9440e] rounded-full flex items-center justify-center hover:opacity-90 transition shadow-lg"
                    aria-label={`Ajouter ${book.title}`}
                  >
                    <span className="text-white text-base font-medium leading-none">+</span>
                  </button>
                </div>
                <p className="font-serif text-[10px] text-white leading-tight line-clamp-2">{book.title}</p>
                <p className="text-[#7a7268] text-[10px] mt-0.5 truncate">{book.author}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Bouton flottant "+" ── */}
      <a
        href="/bibliotheque"
        className="fixed bottom-20 right-5 z-40 w-12 h-12 bg-[#c9440e] rounded-full flex items-center justify-center shadow-lg shadow-[#c9440e]/30 hover:opacity-90 active:scale-95 transition-transform"
        aria-label="Ajouter un livre"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </a>

      <BottomNav />
    </div>
  )
}
