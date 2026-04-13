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

const SELECTION_DU_MOIS = [
  {
    category: 'ROMAN CONTEMPORAIN',
    title: 'Normal People',
    author: 'Sally Rooney',
    comment: 'Une exploration sincère de l\'amour entre deux êtres que tout oppose. Rooney saisit avec précision quelque chose d\'essentiel sur la jeunesse et le désir.',
    rating: 4,
    bg: '#EDE6D6',
    amazon: 'https://www.amazon.fr/s?k=Normal+People+Sally+Rooney',
  },
  {
    category: 'CLASSIQUE',
    title: 'Les Frères Karamazov',
    author: 'Fiodor Dostoïevski',
    comment: 'Le testament littéraire de Dostoïevski. Une fresque sur la foi, la liberté et la culpabilité sans équivalent dans la littérature mondiale.',
    rating: 5,
    bg: '#E8DFC8',
    amazon: 'https://www.amazon.fr/s?k=Les+Frères+Karamazov',
  },
  {
    category: 'SÉLECTION PRINTEMPS',
    title: "L'Élégance du hérisson",
    author: 'Muriel Barbery',
    comment: 'Une gardienne d\'immeuble secrètement cultivée, une enfant désabusée. Barbery écrit avec grâce sur la beauté cachée du quotidien.',
    rating: 4,
    bg: '#E8E4D4',
    amazon: "https://www.amazon.fr/s?k=Elegance+Herisson+Barbery",
  },
]

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
  const [isPro, setIsPro] = useState(false)
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

    const [enCoursRes, nextBookRes, myRecentRes, followsRes, myCirclesRes, allMyBooksRes, booksMonthRes, notesCountRes, profileRes] = await Promise.all([
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
      supabase.from('profiles').select('is_pro').eq('id', userId).single(),
    ])

    setEnCours(enCoursRes.data || [])
    setNextBook((nextBookRes.data || [])[0] ?? null)
    setMyRecentBooks(myRecentRes.data || [])
    setIsPro(profileRes.data?.is_pro ?? false)

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8' }}>
        <div className="text-sm" style={{ color: '#7A7A68' }}>Chargement...</div>
      </div>
    )
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.username || ''

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen pb-28 relative overflow-x-hidden" style={{ background: '#F5F0E8', color: '#2A2A1E' }}>

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-5 flex items-center justify-between relative overflow-hidden" style={{ background: '#F5F0E8' }}>

        <div className="flex-1 min-w-0 pr-3">
          {/* Date */}
          <p className="text-[11px] capitalize tracking-wide mb-0.5" style={{ color: '#7A7A68', letterSpacing: '0.12em' }}>{today}</p>

          {/* Salutation */}
          <h1 className="font-serif text-[40px] font-normal leading-tight" style={{ color: '#2A2A1E' }}>
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>

          {/* Stats inline */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px]" style={{ color: '#7A7A68' }}>
              <span className="font-medium" style={{ color: '#4A4A38' }}>{stats.booksThisMonth}</span> lu{stats.booksThisMonth !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(90,80,50,0.3)' }}>·</span>
            <span className="text-[11px]" style={{ color: '#7A7A68' }}>
              <span className="font-medium" style={{ color: '#4A4A38' }}>{stats.totalNotes}</span> fiche{stats.totalNotes !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(90,80,50,0.3)' }}>·</span>
            <span className="text-[11px]" style={{ color: '#7A7A68' }}>
              <span className="font-medium" style={{ color: '#4A4A38' }}>{stats.streak}</span>j streak
            </span>
          </div>

          {/* Citation inline */}
          <p className="text-[11px] italic font-serif leading-snug mt-1.5" style={{ color: '#7A7A68' }}>
            &ldquo;{quote.text.length > 80 ? quote.text.slice(0, 80) + '…' : quote.text}&rdquo; — {quote.author}
          </p>
        </div>

        {/* Cloche */}
        <a href="/notifications" className="relative p-1.5 shrink-0">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#4A4A38" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5" style={{ background: '#3D5C38' }}>
              <span className="text-[9px] font-bold leading-none" style={{ color: '#F5F0E8' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
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
          stroke="#8A9E7A"
          strokeOpacity="0.04"
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

      {/* ── Séparateur ── */}
      <div
        aria-hidden
        className="mx-5 mb-5 h-px"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(90,80,50,0.08) 30%, rgba(90,80,50,0.18) 50%, rgba(90,80,50,0.08) 70%, transparent 100%)' }}
      />

      {/* ── EN COURS + À LIRE ── */}
      <section className="px-5 mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[10px] font-medium tracking-[0.14em] uppercase" style={{ color: '#7A7A68' }}>Lecture</h2>
          <a href="/bibliotheque" className="text-[10px] transition" style={{ color: '#5E7A52' }}>Bibliothèque →</a>
        </div>

        {enCours.length > 0 || nextBook ? (
          <div className="grid grid-cols-2 gap-2.5">
            {/* Colonne gauche : en cours */}
            {enCours[0] ? (() => {
              const reading = enCours[0]
              const progress = reading.progress ?? 0
              return (
                <div className="rounded-xl p-3 flex gap-2.5" style={{ background: '#EDE6D6', border: '1px solid rgba(90,80,50,0.15)' }}>
                  <a href={`/fiche/${reading.id}`} className="shrink-0">
                    <div className="w-[56px] h-[82px] rounded-lg overflow-hidden relative" style={{ background: '#D4CEBF' }}>
                      {reading.books?.cover_url
                        ? <img src={reading.books.cover_url} className="w-full h-full object-cover" alt={reading.books.title} />
                        : <div className="w-full h-full" style={{ background: 'linear-gradient(to bottom, #D4CEBF, #C8C0AB)' }} />}
                    </div>
                  </a>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <p className="text-[9px] font-medium uppercase tracking-wide mb-0.5" style={{ color: '#5E7A52' }}>En cours</p>
                      <p className="font-serif text-[13px] leading-snug line-clamp-3" style={{ color: '#2A2A1E' }}>{reading.books?.title}</p>
                    </div>
                    <div>
                      <div className="relative w-full h-0.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(90,80,50,0.12)' }}>
                        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#3D5C38' }} />
                        <input type="range" min={0} max={100} value={progress}
                          onChange={e => updateProgress(reading.id, Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      <a href={`/fiche/${reading.id}`} className="text-[10px] font-medium" style={{ color: '#3D5C38' }}>
                        {progress > 0 ? `${progress}% · ` : ''}Reprendre →
                      </a>
                    </div>
                  </div>
                </div>
              )
            })() : (
              <a href="/bibliotheque" className="rounded-xl p-3 flex items-center justify-center text-center" style={{ background: '#EDE6D6', border: '1px solid rgba(90,80,50,0.15)' }}>
                <div>
                  <p className="font-serif text-xs mb-1" style={{ color: '#7A7A68' }}>Rien en cours</p>
                  <p className="text-[10px]" style={{ color: '#3D5C38' }}>Commencer →</p>
                </div>
              </a>
            )}

            {/* Colonne droite : à lire */}
            {nextBook ? (
              <a href={`/fiche/${nextBook.id}`} className="rounded-xl p-3 flex gap-2.5" style={{ background: '#EDE6D6', border: '1px solid rgba(90,80,50,0.15)' }}>
                <div className="shrink-0">
                  <div className="w-[56px] h-[82px] rounded-lg overflow-hidden relative" style={{ background: '#D4CEBF' }}>
                    {nextBook.books?.cover_url
                      ? <img src={nextBook.books.cover_url} className="w-full h-full object-cover" alt={nextBook.books.title} />
                      : <div className="w-full h-full" style={{ background: 'linear-gradient(to bottom, #D4CEBF, #C8C0AB)' }} />}
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <span className="text-[9px] font-medium uppercase tracking-wide mb-1.5 inline-block px-1.5 py-0.5 rounded-full" style={{ background: '#C4D4B8', color: '#3D5C38' }}>À lire</span>
                    <p className="font-serif text-[13px] leading-snug line-clamp-3" style={{ color: '#2A2A1E' }}>{nextBook.books?.title}</p>
                  </div>
                  <p className="text-[10px] truncate" style={{ color: '#7A7A68' }}>{nextBook.books?.author?.split(' ').pop()}</p>
                </div>
              </a>
            ) : (
              <a href="/bibliotheque" className="rounded-xl p-3 flex items-center justify-center text-center" style={{ background: '#EDE6D6', border: '1px solid rgba(90,80,50,0.15)' }}>
                <div>
                  <p className="font-serif text-xs mb-1" style={{ color: '#7A7A68' }}>File vide</p>
                  <p className="text-[10px]" style={{ color: '#3D5C38' }}>Ajouter →</p>
                </div>
              </a>
            )}
          </div>
        ) : myRecentBooks.length > 0 ? (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#EDE6D6', border: '1px solid rgba(90,80,50,0.15)' }}>
            {myRecentBooks.map((reading, i) => (
              <a key={reading.id} href={`/fiche/${reading.id}`}
                className={`flex items-center gap-3 px-4 py-2.5 transition ${i < myRecentBooks.length - 1 ? 'border-b' : ''}`}
                style={i < myRecentBooks.length - 1 ? { borderColor: 'rgba(90,80,50,0.1)' } : {}}
              >
                <div className="w-7 h-10 rounded overflow-hidden shrink-0" style={{ background: '#D4CEBF' }}>
                  {reading.books?.cover_url
                    ? <img src={reading.books.cover_url} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full" style={{ background: 'linear-gradient(to bottom, #D4CEBF, #C8C0AB)' }} />}
                </div>
                <p className="flex-1 font-serif text-sm leading-tight truncate" style={{ color: '#2A2A1E' }}>{reading.books?.title}</p>
                <span className="text-[10px] shrink-0" style={{ color: '#7A7A68' }}>{reading.books?.author?.split(' ').pop()}</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl px-5 py-6 text-center" style={{ background: '#EDE6D6', border: '1px solid rgba(90,80,50,0.15)' }}>
            <p className="text-sm font-serif mb-3" style={{ color: '#7A7A68' }}>Ta bibliothèque est vide</p>
            <a href="/bibliotheque" className="text-xs font-medium" style={{ color: '#3D5C38' }}>Ajouter un livre →</a>
          </div>
        )}
      </section>

      {/* ── Upsell Pro (non-Pro uniquement) ── */}
      {!isPro && (
        <section className="px-5 mb-5">
          <a
            href="/premium"
            className="flex items-center gap-3 rounded-xl px-4 py-3 transition group"
            style={{ border: '1px solid rgba(61,92,56,0.2)', background: 'rgba(61,92,56,0.05)' }}
          >
            <span className="text-base leading-none shrink-0" style={{ color: '#3D5C38' }}>✦</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium leading-tight" style={{ color: '#2A2A1E' }}>Passe à Conatus Pro</p>
              <p className="text-[11px] mt-0.5 leading-snug" style={{ color: '#7A7A68' }}>
                Bibliothèque illimitée · Cercles sans limite · Stats avancées
              </p>
            </div>
            <span className="text-xs font-medium shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: '#3D5C38' }}>
              Voir →
            </span>
          </a>
        </section>
      )}

      {/* ── MES CERCLES — pills horizontal ── */}
      {myCircles.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between px-5 mb-2.5">
            <h2 className="text-[10px] font-medium tracking-[0.14em] uppercase" style={{ color: '#7A7A68' }}>Mes cercles</h2>
            <a href="/cercles" className="text-[10px] transition" style={{ color: '#5E7A52' }}>Voir tout →</a>
          </div>

          <div className="flex gap-2 px-5 overflow-x-auto pb-1 scrollbar-hide">
            {myCircles.map(membership => {
              const circle = membership.circles
              const color = circle.cover_color || '#8A9E7A'
              return (
                <a
                  key={circle.id}
                  href={`/cercles/${circle.id}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition active:opacity-70"
                  style={{
                    backgroundColor: `${color}18`,
                    borderColor: `${color}40`,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#4A4A38' }}>{circle.name}</span>
                </a>
              )
            })}
            <a
              href="/cercles"
              className="shrink-0 flex items-center px-3 py-1.5 rounded-full text-xs transition"
              style={{ border: '1px dashed rgba(90,80,50,0.3)', color: '#7A7A68' }}
            >
              + Nouveau
            </a>
          </div>
        </section>
      )}

      {/* ── SÉLECTION DU MOIS ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 className="text-[10px] font-medium tracking-[0.14em] uppercase" style={{ color: '#7A7A68' }}>Sélection du mois</h2>
        </div>

        <div className="flex gap-3 px-5 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {SELECTION_DU_MOIS.map((book, i) => (
            <div
              key={i}
              className="shrink-0 w-[72vw] max-w-[280px] snap-start rounded-2xl p-4 flex flex-col justify-between gap-3"
              style={{ backgroundColor: book.bg, border: '1px solid rgba(90,80,50,0.12)', borderRadius: '8px' }}
            >
              {/* Haut */}
              <div>
                <p className="text-[9px] uppercase font-medium mb-2" style={{ color: '#8A9E7A', letterSpacing: '0.18em' }}>
                  {book.category}
                </p>
                <p className="font-serif text-[20px] font-normal leading-snug mb-1" style={{ color: '#2A2A1E' }}>
                  {book.title}
                </p>
                <p className="text-xs mb-3" style={{ color: '#7A7A68' }}>{book.author}</p>
                <p className="text-[13px] italic leading-relaxed line-clamp-3" style={{ color: '#4A4A38' }}>
                  {book.comment}
                </p>
              </div>

              {/* Bas */}
              <div className="flex items-center justify-between">
                <span className="text-sm tracking-tight leading-none" style={{ color: '#C8A96E' }}>
                  {'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}
                </span>
                <a
                  href={book.amazon}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] transition"
                  style={{ color: '#5E7A52' }}
                >
                  Amazon →
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── OBJECTIFS ── */}
      <section className="px-5 mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[10px] font-medium tracking-[0.14em] uppercase" style={{ color: '#7A7A68' }}>Objectifs</h2>
          <a href="/objectifs" className="text-[10px] transition" style={{ color: '#5E7A52' }}>Voir →</a>
        </div>
        <a href="/objectifs" className="flex items-center gap-3 rounded-xl px-4 py-3 transition" style={{ background: '#EDE6D6', border: '1px solid rgba(90,80,50,0.15)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(61,92,56,0.08)', border: '1px solid rgba(61,92,56,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3D5C38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: '#2A2A1E' }}>Définis tes objectifs de lecture</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#7A7A68' }}>Rythme quotidien, hebdomadaire...</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A7A68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      </section>

      {/* ── FEED ── */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[10px] font-medium tracking-[0.14em] uppercase" style={{ color: '#7A7A68' }}>Activité</h2>
          <a href="/social" className="text-[10px] transition" style={{ color: '#5E7A52' }}>Explorer →</a>
        </div>

        {feed.length === 0 ? (
          <div className="rounded-2xl px-5 py-6 text-center" style={{ background: '#EDE6D6', border: '1px solid rgba(90,80,50,0.15)' }}>
            <p className="text-sm font-serif mb-3" style={{ color: '#7A7A68' }}>Aucune activité</p>
            <a href="/social" className="text-xs font-medium" style={{ color: '#3D5C38' }}>Suivre des lecteurs →</a>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#EDE6D6', border: '1px solid rgba(90,80,50,0.15)' }}>
            {feed.map((item, i) => {
              const username = item.profile?.username
              const avatarUrl = item.profile?.avatar_url
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < feed.length - 1 ? 'border-b' : ''}`}
                  style={i < feed.length - 1 ? { borderColor: 'rgba(90,80,50,0.1)' } : {}}
                >
                  {/* Avatar 32px */}
                  <a href={`/profil/${username}`} className="shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'rgba(61,92,56,0.1)' }}>
                      {avatarUrl
                        ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                        : <span className="font-serif text-xs leading-none" style={{ color: '#3D5C38' }}>{username?.[0]?.toUpperCase() ?? '?'}</span>}
                    </div>
                  </a>

                  {/* Texte compact sur une ligne */}
                  <p className="flex-1 min-w-0 text-xs leading-none truncate">
                    <a href={`/profil/${username}`} className="font-medium" style={{ color: '#2A2A1E' }}>@{username}</a>
                    {item.profile?.is_pro && <span className="text-[10px] ml-0.5" style={{ color: '#7A7A68' }}>✦</span>}
                    {' '}
                    {item.type === 'reading' && (
                      <>
                        <span style={{ color: '#7A7A68' }}>{STATUS_ACTION[item.status] ?? 'a ajouté'}</span>
                        {' '}
                        <span className="font-serif italic" style={{ color: '#4A4A38' }}>{item.book?.title}</span>
                        {item.status === 'lu' && item.rating > 0 && (
                          <span className="ml-0.5" style={{ color: '#C8A96E' }}>{stars(item.rating)}</span>
                        )}
                      </>
                    )}
                    {item.type === 'circle_join' && (
                      <>
                        <span style={{ color: '#7A7A68' }}>a rejoint</span>
                        {' '}
                        <a href={`/cercles/${item.circle?.id}`} className="font-medium" style={{ color: '#2A2A1E' }}>{item.circle?.name}</a>
                      </>
                    )}
                  </p>

                  {/* Timestamp */}
                  <span className="text-[10px] shrink-0 ml-1" style={{ color: '#7A7A68' }}>{timeAgo(item.date)}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── SUGGESTIONS ── */}
      {suggestions.length > 0 && (
        <section className="px-5 mb-6">
          <h2 className="text-[10px] font-medium tracking-[0.14em] uppercase mb-2.5" style={{ color: '#7A7A68' }}>À découvrir</h2>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#EDE6D6', border: '1px solid rgba(90,80,50,0.15)' }}>
            {suggestions.map((book, i) => (
              <div key={book.id} className={`flex items-center gap-3 px-4 py-3 ${i < suggestions.length - 1 ? 'border-b' : ''}`}
                style={i < suggestions.length - 1 ? { borderColor: 'rgba(90,80,50,0.1)' } : {}}>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm leading-snug line-clamp-1" style={{ color: '#2A2A1E' }}>{book.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xs truncate" style={{ color: '#7A7A68' }}>{book.author}</p>
                    {book.category && book.category !== 'Autre' && (
                      <span className="text-[10px] rounded px-1.5 py-px leading-none shrink-0" style={{ color: '#8A9E7A', border: '1px solid rgba(90,80,50,0.2)', background: 'rgba(90,80,50,0.05)' }}>
                        {book.category}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => addToLibrary(book)}
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-90 transition"
                  style={{ background: '#3D5C38' }}
                  aria-label={`Ajouter ${book.title}`}
                >
                  <span className="text-base font-medium leading-none" style={{ color: '#F5F0E8' }}>+</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Bouton flottant "+" ── */}
      <a
        href="/bibliotheque"
        className="fixed bottom-20 right-5 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-transform"
        style={{ background: '#3D5C38', boxShadow: '0 4px 16px rgba(61,92,56,0.35)' }}
        aria-label="Ajouter un livre"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="#F5F0E8">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </a>

      <BottomNav />
    </div>
  )
}
