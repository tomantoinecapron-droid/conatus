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
          .from('profiles').select('id, username, avatar_url, is_pro').in('id', allUids)
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
      <div className="min-h-screen bg-[#0e1a14] flex items-center justify-center">
        <div className="text-[#9a9485] text-sm">Chargement...</div>
      </div>
    )
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.username || ''

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-[#0e1a14] text-[#f0ebe0] pb-28 relative overflow-x-hidden">

      {/* ── Vignetting bords ── */}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{ boxShadow: 'inset 0 0 120px 40px rgba(0,0,0,0.30)' }}
        aria-hidden
      />

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-5 flex items-center justify-between relative overflow-hidden">

        <div className="flex-1 min-w-0 pr-3">
          {/* Date */}
          <p className="text-[#9a9485] text-[11px] capitalize tracking-wide mb-0.5">{today}</p>

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
        <a href="/notifications" className="relative p-1.5 shrink-0">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#9a9485" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] bg-[#c9440e] rounded-full flex items-center justify-center px-0.5">
              <span className="text-white text-[9px] font-bold leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
            </span>
          )}
        </a>

        {/* Colonnes grecques décoratives */}
        <svg
          aria-hidden
          viewBox="0 0 80 60"
          width="80"
          height="60"
          fill="none"
          stroke="white"
          strokeOpacity="0.15"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none shrink-0 ml-3"
        >
          {/* Entablement */}
          <line x1="2" y1="6" x2="78" y2="6" />
          <line x1="4" y1="9" x2="76" y2="9" />
          {/* Stylobate */}
          <line x1="2" y1="54" x2="78" y2="54" />
          <line x1="4" y1="57" x2="76" y2="57" />
          {/* Colonne 1, cx=16 */}
          <line x1="9" y1="10" x2="23" y2="10" />
          <line x1="10" y1="12" x2="22" y2="12" />
          <line x1="11" y1="13" x2="11" y2="52" strokeWidth="0.6" />
          <line x1="16" y1="13" x2="16" y2="52" strokeWidth="0.6" />
          <line x1="21" y1="13" x2="21" y2="52" strokeWidth="0.6" />
          <line x1="10" y1="52" x2="22" y2="52" />
          <line x1="9" y1="54" x2="23" y2="54" />
          {/* Colonne 2, cx=40 */}
          <line x1="33" y1="10" x2="47" y2="10" />
          <line x1="34" y1="12" x2="46" y2="12" />
          <line x1="35" y1="13" x2="35" y2="52" strokeWidth="0.6" />
          <line x1="40" y1="13" x2="40" y2="52" strokeWidth="0.6" />
          <line x1="45" y1="13" x2="45" y2="52" strokeWidth="0.6" />
          <line x1="34" y1="52" x2="46" y2="52" />
          <line x1="33" y1="54" x2="47" y2="54" />
          {/* Colonne 3, cx=64 */}
          <line x1="57" y1="10" x2="71" y2="10" />
          <line x1="58" y1="12" x2="70" y2="12" />
          <line x1="59" y1="13" x2="59" y2="52" strokeWidth="0.6" />
          <line x1="64" y1="13" x2="64" y2="52" strokeWidth="0.6" />
          <line x1="69" y1="13" x2="69" y2="52" strokeWidth="0.6" />
          <line x1="58" y1="52" x2="70" y2="52" />
          <line x1="57" y1="54" x2="71" y2="54" />
        </svg>
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
          <h2 className="text-[#9a9485] text-[10px] font-medium tracking-[0.14em] uppercase">Lecture</h2>
          <a href="/bibliotheque" className="text-[#9a9485] text-[10px] hover:text-white transition">Bibliothèque →</a>
        </div>

        {enCours.length > 0 || nextBook ? (
          <div className="grid grid-cols-2 gap-2.5">
            {/* Colonne gauche : en cours */}
            {enCours[0] ? (() => {
              const reading = enCours[0]
              const progress = reading.progress ?? 0
              return (
                <div className="bg-[#152318] border border-white/8 rounded-xl p-3 flex gap-2.5">
                  <a href={`/fiche/${reading.id}`} className="shrink-0">
                    <div className="w-[56px] h-[82px] rounded-lg overflow-hidden bg-[#1e3028] relative">
                      {reading.books?.cover_url
                        ? <img src={reading.books.cover_url} className="w-full h-full object-cover" alt={reading.books.title} />
                        : <div className="w-full h-full bg-gradient-to-b from-[#1a2b1e] to-[#0e1a14]" />}
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
              <a href="/bibliotheque" className="bg-[#152318] border border-white/8 rounded-xl p-3 flex items-center justify-center text-center">
                <div>
                  <p className="text-white/30 font-serif text-xs mb-1">Rien en cours</p>
                  <p className="text-[#c9440e] text-[10px]">Commencer →</p>
                </div>
              </a>
            )}

            {/* Colonne droite : à lire */}
            {nextBook ? (
              <a href={`/fiche/${nextBook.id}`} className="bg-[#152318] border border-white/8 rounded-xl p-3 flex gap-2.5">
                <div className="shrink-0">
                  <div className="w-[56px] h-[82px] rounded-lg overflow-hidden bg-[#1e3028] relative">
                    {nextBook.books?.cover_url
                      ? <img src={nextBook.books.cover_url} className="w-full h-full object-cover" alt={nextBook.books.title} />
                      : <div className="w-full h-full bg-gradient-to-b from-[#1a2b1e] to-[#0e1a14]" />}
                    <div aria-hidden className="absolute inset-0 rounded-lg" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', opacity: 0.03, mixBlendMode: 'overlay' }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <p className="text-[9px] text-[#9a9485] font-medium uppercase tracking-wide mb-0.5">À lire</p>
                    <p className="font-serif text-[13px] text-white leading-snug line-clamp-3">{nextBook.books?.title}</p>
                  </div>
                  <p className="text-[#9a9485] text-[10px] truncate">{nextBook.books?.author?.split(' ').pop()}</p>
                </div>
              </a>
            ) : (
              <a href="/bibliotheque" className="bg-[#152318] border border-white/8 rounded-xl p-3 flex items-center justify-center text-center">
                <div>
                  <p className="text-white/30 font-serif text-xs mb-1">File vide</p>
                  <p className="text-[#c9440e] text-[10px]">Ajouter →</p>
                </div>
              </a>
            )}
          </div>
        ) : myRecentBooks.length > 0 ? (
          <div className="bg-[#152318] border border-white/8 rounded-2xl overflow-hidden">
            {myRecentBooks.map((reading, i) => (
              <a key={reading.id} href={`/fiche/${reading.id}`}
                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition ${i < myRecentBooks.length - 1 ? 'border-b border-white/5' : ''}`}
              >
                <div className="w-7 h-10 rounded overflow-hidden bg-[#1e3028] shrink-0">
                  {reading.books?.cover_url
                    ? <img src={reading.books.cover_url} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full bg-gradient-to-b from-[#1a2b1e] to-[#0e1a14]" />}
                </div>
                <p className="flex-1 font-serif text-sm text-white leading-tight truncate">{reading.books?.title}</p>
                <span className="text-[#9a9485] text-[10px] shrink-0">{reading.books?.author?.split(' ').pop()}</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-[#152318] border border-white/8 rounded-2xl px-5 py-6 text-center">
            <p className="text-white/40 text-sm font-serif mb-3">Ta bibliothèque est vide</p>
            <a href="/bibliotheque" className="text-[#c9440e] text-xs font-medium">Ajouter un livre →</a>
          </div>
        )}
      </section>

      {/* ── MA SEMAINE EN CHIFFRES ── */}
      <section className="px-5 mb-5">
        <h2 className="text-[#9a9485] text-[10px] font-medium tracking-[0.14em] uppercase mb-2.5">Ce mois-ci</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#152318] border border-white/8 rounded-xl px-3 py-2.5 text-center">
            <p className="font-serif text-white text-2xl leading-none mb-0.5">{stats.booksThisMonth}</p>
            <p className="text-[#9a9485] text-[10px]">lu{stats.booksThisMonth !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-[#152318] border border-white/8 rounded-xl px-3 py-2.5 text-center">
            <p className="font-serif text-white text-2xl leading-none mb-0.5">{stats.totalNotes}</p>
            <p className="text-[#9a9485] text-[10px]">fiche{stats.totalNotes !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-[#152318] border border-white/8 rounded-xl px-3 py-2.5 text-center">
            <p className="font-serif text-white text-2xl leading-none mb-0.5">{stats.streak}</p>
            <p className="text-[#9a9485] text-[10px]">j. consécutif{stats.streak !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </section>

      {/* ── MES CERCLES — pills horizontal ── */}
      {myCircles.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between px-5 mb-2.5">
            <h2 className="text-[#9a9485] text-[10px] font-medium tracking-[0.14em] uppercase">Mes cercles</h2>
            <a href="/cercles" className="text-[#9a9485] text-[10px] hover:text-white transition">Voir tout →</a>
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
              className="shrink-0 flex items-center px-3 py-1.5 rounded-full border border-white/10 text-[#9a9485] text-xs hover:text-white transition"
            >
              + Nouveau
            </a>
          </div>
        </section>
      )}

      {/* ── OBJECTIFS ── */}
      <section className="px-5 mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[#9a9485] text-[10px] font-medium tracking-[0.14em] uppercase">Objectifs</h2>
          <a href="/objectifs" className="text-[#9a9485] text-[10px] hover:text-white transition">Voir →</a>
        </div>
        <a href="/objectifs" className="flex items-center gap-3 bg-[#152318] border border-white/8 rounded-xl px-4 py-3 hover:bg-white/3 transition">
          <div className="w-8 h-8 rounded-lg bg-[#c9440e]/10 border border-[#c9440e]/20 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9440e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium">Définis tes objectifs de lecture</p>
            <p className="text-[#9a9485] text-[10px] mt-0.5">Rythme quotidien, hebdomadaire...</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a9485" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      </section>

      {/* ── FEED ── */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[#9a9485] text-[10px] font-medium tracking-[0.14em] uppercase">Activité</h2>
          <a href="/explorer" className="text-[#9a9485] text-[10px] hover:text-white transition">Explorer →</a>
        </div>

        {feed.length === 0 ? (
          <div className="bg-[#152318] border border-white/8 rounded-2xl px-5 py-6 text-center">
            <p className="text-white/40 text-sm font-serif mb-3">Aucune activité</p>
            <a href="/explorer" className="text-[#c9440e] text-xs font-medium">Suivre des lecteurs →</a>
          </div>
        ) : (
          <div className="bg-[#152318] border border-white/8 rounded-2xl overflow-hidden">
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
                    <a href={`/profil/${username}`} className="font-medium text-white">@{username}</a>{item.profile?.is_pro && <span className="text-white/60 text-[10px] ml-0.5">✦</span>}
                    {' '}
                    {item.type === 'reading' && (
                      <>
                        <span className="text-[#9a9485]">{STATUS_ACTION[item.status] ?? 'a ajouté'}</span>
                        {' '}
                        <span className="font-serif italic text-white/70">{item.book?.title}</span>
                        {item.status === 'lu' && item.rating > 0 && (
                          <span className="text-[#c9440e] ml-0.5">{stars(item.rating)}</span>
                        )}
                      </>
                    )}
                    {item.type === 'circle_join' && (
                      <>
                        <span className="text-[#9a9485]">a rejoint</span>
                        {' '}
                        <a href={`/cercles/${item.circle?.id}`} className="font-medium text-white">{item.circle?.name}</a>
                      </>
                    )}
                  </p>

                  {/* Timestamp */}
                  <span className="text-[#9a9485] text-[10px] shrink-0 ml-1">{timeAgo(item.date)}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── SUGGESTIONS ── */}
      {suggestions.length > 0 && (
        <section className="px-5 mb-6">
          <h2 className="text-[#9a9485] text-[10px] font-medium tracking-[0.14em] uppercase mb-2.5">À découvrir</h2>
          <div className="bg-[#152318] border border-white/8 rounded-2xl overflow-hidden divide-y divide-white/5">
            {suggestions.map(book => (
              <div key={book.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm text-white leading-snug line-clamp-1">{book.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-[#9a9485] text-xs truncate">{book.author}</p>
                    {book.category && book.category !== 'Autre' && (
                      <span className="text-white/70 text-[10px] border border-white/30 bg-white/5 rounded px-1.5 py-px leading-none shrink-0">
                        {book.category}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => addToLibrary(book)}
                  className="shrink-0 w-7 h-7 bg-[#c9440e] rounded-lg flex items-center justify-center hover:opacity-90 transition"
                  aria-label={`Ajouter ${book.title}`}
                >
                  <span className="text-white text-base font-medium leading-none">+</span>
                </button>
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
