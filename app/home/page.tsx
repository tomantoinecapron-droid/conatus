'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

// ── Quotes ───────────────────────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)
  if (days > 6) return `${Math.floor(days / 7)}sem`
  if (days > 0) return `${days}j`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}min`
  return `maintenant`
}

function stars(n: number): string {
  if (!n || n < 1) return ''
  const full = Math.round(n)
  return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full))
}

const STATUS_ACTION: Record<string, string> = {
  a_lire: 'a ajouté', en_cours: 'a commencé', lu: 'a terminé',
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  lu:       { label: 'Terminé',  color: 'text-emerald-500' },
  en_cours: { label: 'En cours', color: 'text-[#c9440e]' },
  a_lire:   { label: 'À lire',   color: 'text-[#7a7268]' },
}

// ── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [enCours, setEnCours] = useState<any[]>([])
  const [myRecentBooks, setMyRecentBooks] = useState<any[]>([])
  const [myCircles, setMyCircles] = useState<any[]>([])
  const [feed, setFeed] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
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
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
    setUnreadCount(count || 0)
  }

  const loadAll = async (userId: string) => {
    // Chargement parallèle : en cours, mes livres récents, follows, mes cercles, tous mes book_ids
    const [enCoursRes, myRecentRes, followsRes, myCirclesRes, allMyBooksRes] = await Promise.all([
      supabase.from('readings').select('*, books(*)')
        .eq('user_id', userId).eq('status', 'en_cours')
        .order('created_at', { ascending: false }).limit(3),
      supabase.from('readings').select('*, books(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(3),
      supabase.from('follows').select('following_id').eq('follower_id', userId),
      supabase.from('circle_members')
        .select('*, circles(*)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false }).limit(3),
      supabase.from('readings').select('book_id').eq('user_id', userId),
    ])

    setEnCours(enCoursRes.data || [])
    setMyRecentBooks(myRecentRes.data || [])
    setMyCircles((myCirclesRes.data || []).filter((m: any) => m.circles))

    // ── Feed : activité des gens que je suis ──
    const followingIds = (followsRes.data || []).map((f: any) => f.following_id)

    if (followingIds.length > 0) {
      const [feedReadingsRes, feedCirclesRes] = await Promise.all([
        supabase.from('readings').select('*, books(*)')
          .in('user_id', followingIds)
          .order('created_at', { ascending: false }).limit(20),
        supabase.from('circle_members').select('*, circles(*)')
          .in('user_id', followingIds)
          .order('joined_at', { ascending: false }).limit(10),
      ])

      const allUids = [
        ...new Set([
          ...(feedReadingsRes.data || []).map((r: any) => r.user_id),
          ...(feedCirclesRes.data || []).map((m: any) => m.user_id),
        ]),
      ]

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

      const circleEvents = (feedCirclesRes.data || [])
        .filter((m: any) => m.circles)
        .map((m: any) => ({
          id: `c_${m.id}`, type: 'circle_join' as const,
          user_id: m.user_id, profile: profileMap[m.user_id],
          date: m.joined_at, circle: m.circles,
        }))

      const merged = [...readingEvents, ...circleEvents]
        .filter(e => e.profile)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15)

      setFeed(merged)
    } else {
      setFeed([])
    }

    // ── Suggestions ──
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

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24 relative overflow-x-hidden">

      {/* ── Décoration ── */}
      <div className="absolute top-0 right-0 w-56 pointer-events-none select-none" aria-hidden="true">
        <svg viewBox="0 0 300 370" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full opacity-[0.035]">
          <circle cx="150" cy="190" r="178" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
          <circle cx="150" cy="190" r="128" stroke="white" strokeOpacity="0.4" strokeWidth="0.5" />
          <path d="M 46,330 L 49,68 L 95,68 L 98,330 Z" stroke="white" strokeWidth="1.2" />
          <line x1="53" y1="70" x2="53" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="62" y1="70" x2="62" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="72" y1="70" x2="72" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="82" y1="70" x2="82" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="91" y1="70" x2="91" y2="328" stroke="white" strokeWidth="0.6" />
          <rect x="43" y="56" width="58" height="12" stroke="white" strokeWidth="1" />
          <rect x="40" y="46" width="64" height="10" stroke="white" strokeWidth="1" />
          <path d="M 132,330 L 135,68 L 181,68 L 184,330 Z" stroke="white" strokeWidth="1.2" />
          <line x1="139" y1="70" x2="139" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="148" y1="70" x2="148" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="158" y1="70" x2="158" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="168" y1="70" x2="168" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="177" y1="70" x2="177" y2="328" stroke="white" strokeWidth="0.6" />
          <rect x="129" y="56" width="58" height="12" stroke="white" strokeWidth="1" />
          <rect x="126" y="46" width="64" height="10" stroke="white" strokeWidth="1" />
          <rect x="40" y="28" width="150" height="18" stroke="white" strokeWidth="1" />
          <rect x="40" y="10" width="150" height="18" stroke="white" strokeWidth="1" />
          <rect x="36" y="4" width="158" height="6" stroke="white" strokeWidth="0.8" />
          <line x1="40" y1="28" x2="190" y2="28" stroke="#c9440e" strokeWidth="1" />
          <line x1="76" y1="12" x2="76" y2="26" stroke="#c9440e" strokeWidth="1.5" />
          <line x1="80" y1="12" x2="80" y2="26" stroke="#c9440e" strokeWidth="1.5" />
          <line x1="127" y1="12" x2="127" y2="26" stroke="#c9440e" strokeWidth="1.5" />
          <line x1="131" y1="12" x2="131" y2="26" stroke="#c9440e" strokeWidth="1.5" />
          <line x1="166" y1="12" x2="166" y2="26" stroke="#c9440e" strokeWidth="1.5" />
          <line x1="170" y1="12" x2="170" y2="26" stroke="#c9440e" strokeWidth="1.5" />
          <path d="M 208,330 L 210,148 L 216,141 L 224,150 L 231,136 L 240,145 L 248,139 L 260,330 Z" stroke="white" strokeWidth="1" />
          <line x1="216" y1="152" x2="216" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="225" y1="152" x2="225" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="234" y1="152" x2="234" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="243" y1="152" x2="243" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="252" y1="152" x2="252" y2="328" stroke="white" strokeWidth="0.6" />
          <rect x="215" y="186" width="48" height="7" stroke="white" strokeWidth="0.8" transform="rotate(-7 239 190)" />
          <rect x="30" y="330" width="248" height="10" stroke="white" strokeWidth="1" />
          <rect x="16" y="340" width="268" height="10" stroke="white" strokeWidth="1" />
          <rect x="4" y="350" width="292" height="12" stroke="white" strokeWidth="1" />
          <line x1="0" y1="362" x2="300" y2="362" stroke="#c9440e" strokeWidth="0.8" />
        </svg>
      </div>

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-2 relative flex items-start justify-between">
        <div>
          <p className="text-[#7a7268] text-sm capitalize">{today}</p>
          <h1 className="font-serif text-3xl text-white mt-1">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <a href="/notifications" className="relative mt-1 p-1.5 -mr-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7a7268" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-[#c9440e] rounded-full flex items-center justify-center px-1">
              <span className="text-white text-[10px] font-bold leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </a>
      </div>

      {/* ── Citation ── */}
      <div className="px-5 pt-4 pb-6 relative">
        <p className="font-serif italic text-white/40 text-sm leading-relaxed">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="text-[#7a7268]/60 text-xs mt-1.5">— {quote.author}</p>
      </div>

      {/* ── EN COURS ── */}
      <section className="px-5 mb-8">
        <h2 className="text-[#7a7268] text-[10px] font-medium tracking-[0.15em] uppercase mb-3">
          En cours
        </h2>

        {enCours.length > 0 ? (
          <div className="flex flex-col gap-3">
            {enCours.map(reading => {
              const progress = reading.progress ?? 0
              return (
                <div key={reading.id} className="bg-[#242018] border border-white/10 rounded-2xl p-4">
                  <div className="flex gap-4">
                    <div className="w-14 h-20 rounded-lg overflow-hidden bg-[#3a3530] shrink-0">
                      {reading.books?.cover_url ? (
                        <img src={reading.books.cover_url} className="w-full h-full object-cover" alt={reading.books.title} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-[#2e2a24] to-[#1a1714]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-[15px] text-white leading-snug line-clamp-2">
                        {reading.books?.title}
                      </p>
                      <p className="text-[#7a7268] text-xs mt-0.5">{reading.books?.author}</p>
                      <div className="mt-3">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-[#7a7268] text-[10px]">Progression</span>
                          <span className="text-[#c9440e] text-[10px] font-medium">{progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                          <div className="h-full bg-[#c9440e] rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
                        </div>
                        <input
                          type="range" min={0} max={100} value={progress}
                          onChange={e => updateProgress(reading.id, Number(e.target.value))}
                          className="w-full -mt-2 h-4 cursor-pointer opacity-0"
                          aria-label="Progression"
                        />
                      </div>
                    </div>
                  </div>
                  <a href={`/fiche/${reading.id}`} className="mt-3 flex justify-end text-[#c9440e] text-xs font-medium hover:opacity-80 transition">
                    Voir ma fiche →
                  </a>
                </div>
              )
            })}
          </div>
        ) : myRecentBooks.length > 0 ? (
          /* Pas de livre en cours → derniers livres de la bibliothèque */
          <div className="bg-[#242018] border border-white/8 rounded-2xl overflow-hidden">
            <p className="px-4 pt-3 pb-2 text-[#7a7268] text-xs">Tes derniers livres</p>
            {myRecentBooks.map((reading, i) => {
              const badge = STATUS_BADGE[reading.status] ?? STATUS_BADGE['a_lire']
              return (
                <a
                  key={reading.id}
                  href={`/fiche/${reading.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition ${i < myRecentBooks.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <div className="w-8 h-11 rounded overflow-hidden bg-[#3a3530] shrink-0">
                    {reading.books?.cover_url ? (
                      <img src={reading.books.cover_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-b from-[#2e2a24] to-[#1a1714]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm text-white leading-tight truncate">{reading.books?.title}</p>
                    <p className="text-[#7a7268] text-[11px] mt-0.5 truncate">{reading.books?.author}</p>
                  </div>
                  <span className={`text-[11px] font-medium shrink-0 ${badge.color}`}>{badge.label}</span>
                </a>
              )
            })}
            <a href="/bibliotheque" className="flex items-center justify-center gap-1 px-4 py-3 text-[#c9440e] text-xs font-medium border-t border-white/5">
              Ma bibliothèque →
            </a>
          </div>
        ) : (
          <div className="bg-[#242018] border border-white/8 rounded-2xl p-6 text-center">
            <p className="font-serif text-base text-white/50 mb-1">Aucun livre en cours</p>
            <p className="text-[#7a7268] text-sm mb-4">Change le statut d&apos;un livre depuis ta bibliothèque</p>
            <a href="/bibliotheque" className="text-[#c9440e] text-sm font-medium">Ma bibliothèque →</a>
          </div>
        )}
      </section>

      {/* ── MES CERCLES ── */}
      {myCircles.length > 0 && (
        <section className="px-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#7a7268] text-[10px] font-medium tracking-[0.15em] uppercase">
              Mes cercles
            </h2>
            <a href="/cercles" className="text-[#c9440e] text-[10px] font-medium">Voir tout</a>
          </div>

          <div className="flex flex-col gap-2">
            {myCircles.map(membership => {
              const circle = membership.circles
              const color = circle.cover_color || '#c9440e'
              return (
                <a
                  key={membership.id ?? circle.id}
                  href={`/cercles/${circle.id}`}
                  className="flex items-center gap-3 bg-[#242018] border border-white/8 rounded-xl px-4 py-3 hover:border-white/20 transition"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <p className="flex-1 font-medium text-white text-sm truncate">{circle.name}</p>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a7268" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              )
            })}
          </div>
        </section>
      )}

      {/* ── FEED ── */}
      <section className="px-5 mb-8">
        <h2 className="text-[#7a7268] text-[10px] font-medium tracking-[0.15em] uppercase mb-3">
          Activité récente
        </h2>

        {feed.length === 0 ? (
          <div className="bg-[#242018] border border-white/8 rounded-2xl p-6 text-center">
            <p className="font-serif text-base text-white/50 mb-1">Aucune activité pour l&apos;instant</p>
            <p className="text-[#7a7268] text-sm mb-4">
              Abonne-toi à des lecteurs pour voir leur activité ici
            </p>
            <a href="/explorer" className="text-[#c9440e] text-sm font-medium">Explorer →</a>
          </div>
        ) : (
          <div className="bg-[#242018] border border-white/8 rounded-2xl overflow-hidden">
            {feed.map((item, i) => {
              const username = item.profile?.username
              const avatarUrl = item.profile?.avatar_url
              const isLast = i === feed.length - 1

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 ${!isLast ? 'border-b border-white/5' : ''}`}
                >
                  {/* Avatar */}
                  <a href={username ? `/profil/${username}` : '#'} className="shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#c9440e]/15 flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="font-serif text-[#c9440e] text-sm leading-none">
                          {username?.[0]?.toUpperCase() ?? '?'}
                        </span>
                      )}
                    </div>
                  </a>

                  {/* Texte */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug">
                      <a href={`/profil/${username}`} className="font-medium text-white hover:text-[#c9440e] transition">
                        @{username}
                      </a>{' '}

                      {item.type === 'reading' && (
                        <>
                          <span className="text-[#7a7268]">{STATUS_ACTION[item.status] ?? 'a ajouté'}</span>{' '}
                          <span className="font-serif italic text-white/80">{item.book?.title}</span>
                          {item.status === 'lu' && item.rating > 0 && (
                            <span className="text-[#c9440e] ml-1 tracking-tight">{stars(item.rating)}</span>
                          )}
                        </>
                      )}

                      {item.type === 'circle_join' && (
                        <>
                          <span className="text-[#7a7268]">a rejoint le cercle</span>{' '}
                          <a href={`/cercles/${item.circle?.id}`} className="font-medium text-white hover:text-[#c9440e] transition">
                            {item.circle?.name}
                          </a>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Cover ou icône + temps */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.type === 'reading' && item.book?.cover_url && (
                      <img src={item.book.cover_url} className="w-5 h-7 rounded object-cover opacity-70" alt="" />
                    )}
                    {item.type === 'circle_join' && (
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${item.circle?.cover_color || '#c9440e'}25` }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={item.circle?.cover_color || '#c9440e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      </div>
                    )}
                    <span className="text-[#7a7268] text-[10px] w-8 text-right">{timeAgo(item.date)}</span>
                  </div>
                </div>
              )
            })}

            <a
              href="/explorer"
              className="flex items-center justify-center gap-1 px-4 py-3 text-[#7a7268] text-xs hover:text-white transition border-t border-white/5"
            >
              Découvrir des lecteurs
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          </div>
        )}
      </section>

      {/* ── SUGGESTIONS ── */}
      {suggestions.length > 0 && (
        <section className="px-5">
          <h2 className="text-[#7a7268] text-[10px] font-medium tracking-[0.15em] uppercase mb-3">
            À découvrir
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {suggestions.map(book => (
              <div key={book.id}>
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#242018] mb-2 group">
                  {book.cover_url ? (
                    <img src={book.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={book.title} />
                  ) : (
                    <div className="w-full h-full flex items-end p-2 bg-gradient-to-b from-[#2e2a24] to-[#1a1714]">
                      <p className="font-serif text-[9px] text-white/60 leading-tight line-clamp-4">{book.title}</p>
                    </div>
                  )}
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

      <BottomNav />
    </div>
  )
}
