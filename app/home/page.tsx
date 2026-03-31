'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

// ── Quotes ──────────────────────────────────────────────────────────────────
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
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 6) return `${Math.floor(days / 7)}sem`
  if (days > 0) return `${days}j`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}min`
  return `à l'instant`
}

/** Usernames auto-générés par Supabase contiennent '.' ou '-'. */
function resolveDisplayName(username: string | undefined): { label: string; isAnon: boolean } {
  if (!username || username.includes('.') || username.includes('-')) {
    return { label: 'un lecteur', isAnon: true }
  }
  return { label: username, isAnon: false }
}

const STATUS_ACTION: Record<string, string> = {
  a_lire: 'a ajouté',
  en_cours: 'a commencé',
  lu: 'a terminé',
}

// ── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [enCours, setEnCours] = useState<any[]>([])
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
    const [enCoursRes, myBooksRes, recentRes] = await Promise.all([
      supabase.from('readings').select('*, books(*)')
        .eq('user_id', userId).eq('status', 'en_cours')
        .order('created_at', { ascending: false }).limit(3),
      supabase.from('readings').select('book_id').eq('user_id', userId),
      supabase.from('readings').select('*, books(*)')
        .neq('user_id', userId)
        .order('created_at', { ascending: false }).limit(12),
    ])

    setEnCours(enCoursRes.data || [])

    const rawFeed = recentRes.data || []
    const uids = [...new Set(rawFeed.map((r: any) => r.user_id))]
    if (uids.length > 0) {
      const { data: profs } = await supabase
        .from('profiles').select('id, username, avatar_url').in('id', uids)
      const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
      setFeed(rawFeed.map((r: any) => ({ ...r, profile: map[r.user_id] })).filter((r: any) => r.profile))
    }

    const myIds = (myBooksRes.data || []).map((r: any) => r.book_id)
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
    || user?.user_metadata?.username
    || ''

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24 relative overflow-x-hidden">

      {/* ── Décoration colonnes grecques (fond) ── */}
      <div
        className="absolute top-0 right-0 w-56 pointer-events-none select-none"
        aria-hidden="true"
      >
        <svg viewBox="0 0 300 370" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full opacity-[0.035]">
          <circle cx="150" cy="190" r="178" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
          <circle cx="150" cy="190" r="128" stroke="white" strokeOpacity="0.4" strokeWidth="0.5" />
          {/* Column 1 */}
          <path d="M 46,330 L 49,68 L 95,68 L 98,330 Z" stroke="white" strokeWidth="1.2" />
          <line x1="53" y1="70" x2="53" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="62" y1="70" x2="62" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="72" y1="70" x2="72" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="82" y1="70" x2="82" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="91" y1="70" x2="91" y2="328" stroke="white" strokeWidth="0.6" />
          <rect x="43" y="56" width="58" height="12" stroke="white" strokeWidth="1" />
          <rect x="40" y="46" width="64" height="10" stroke="white" strokeWidth="1" />
          {/* Column 2 */}
          <path d="M 132,330 L 135,68 L 181,68 L 184,330 Z" stroke="white" strokeWidth="1.2" />
          <line x1="139" y1="70" x2="139" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="148" y1="70" x2="148" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="158" y1="70" x2="158" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="168" y1="70" x2="168" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="177" y1="70" x2="177" y2="328" stroke="white" strokeWidth="0.6" />
          <rect x="129" y="56" width="58" height="12" stroke="white" strokeWidth="1" />
          <rect x="126" y="46" width="64" height="10" stroke="white" strokeWidth="1" />
          {/* Entablature */}
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
          {/* Column 3 — broken */}
          <path d="M 208,330 L 210,148 L 216,141 L 224,150 L 231,136 L 240,145 L 248,139 L 260,330 Z" stroke="white" strokeWidth="1" />
          <line x1="216" y1="152" x2="216" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="225" y1="152" x2="225" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="234" y1="152" x2="234" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="243" y1="152" x2="243" y2="328" stroke="white" strokeWidth="0.6" />
          <line x1="252" y1="152" x2="252" y2="328" stroke="white" strokeWidth="0.6" />
          <rect x="215" y="186" width="48" height="7" stroke="white" strokeWidth="0.8" transform="rotate(-7 239 190)" />
          {/* Steps */}
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

        {/* Cloche notifications */}
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

      {/* ── Citation du jour ── */}
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

        {enCours.length === 0 ? (
          <div className="bg-[#242018] border border-white/8 rounded-2xl p-6 text-center">
            <p className="font-serif text-base text-white/50 mb-1">Aucun livre en cours</p>
            <p className="text-[#7a7268] text-sm mb-4">
              Change le statut d&apos;un livre depuis ta bibliothèque
            </p>
            <a href="/bibliotheque" className="text-[#c9440e] text-sm font-medium">
              Ma bibliothèque →
            </a>
          </div>
        ) : (
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
                          <div
                            className="h-full bg-[#c9440e] rounded-full transition-all duration-200"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={progress}
                          onChange={e => updateProgress(reading.id, Number(e.target.value))}
                          className="w-full -mt-2 h-4 cursor-pointer opacity-0"
                          aria-label="Progression"
                        />
                      </div>
                    </div>
                  </div>
                  <a
                    href={`/fiche/${reading.id}`}
                    className="mt-3 flex justify-end text-[#c9440e] text-xs font-medium hover:opacity-80 transition"
                  >
                    Voir ma fiche →
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── FEED ── */}
      <section className="px-5 mb-8">
        <h2 className="text-[#7a7268] text-[10px] font-medium tracking-[0.15em] uppercase mb-3">
          Activité récente
        </h2>

        {feed.length === 0 ? (
          <div className="bg-[#242018] border border-white/8 rounded-2xl p-6 text-center">
            <p className="font-serif text-base text-white/50 mb-1">Aucune activité pour l&apos;instant</p>
            <p className="text-[#7a7268] text-sm mb-4">Explore d&apos;autres lecteurs pour voir leur activité</p>
            <a href="/explorer" className="text-[#c9440e] text-sm font-medium">Explorer →</a>
          </div>
        ) : (
          <div className="bg-[#242018] border border-white/8 rounded-2xl overflow-hidden">
            {feed.slice(0, 7).map((item, i) => {
              const { label, isAnon } = resolveDisplayName(item.profile?.username)
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < Math.min(feed.length, 7) - 1 ? 'border-b border-white/5' : ''}`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#c9440e]/15 flex items-center justify-center shrink-0 overflow-hidden">
                    {item.profile?.avatar_url ? (
                      <img src={item.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="font-serif text-[#c9440e] text-sm leading-none">
                        {isAnon ? '·' : label[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug">
                      {isAnon ? (
                        <span className="font-medium text-white/50">un lecteur</span>
                      ) : (
                        <a
                          href={`/profil/${label}`}
                          className="font-medium text-white hover:text-[#c9440e] transition"
                        >
                          @{label}
                        </a>
                      )}{' '}
                      <span className="text-[#7a7268]">
                        {STATUS_ACTION[item.status] ?? 'a ajouté'}
                      </span>{' '}
                      <span className="font-serif italic text-white/80 line-clamp-1">
                        {item.books?.title}
                      </span>
                    </p>
                  </div>

                  {/* Cover + time */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.books?.cover_url && (
                      <img src={item.books.cover_url} className="w-5 h-7 rounded object-cover opacity-70" alt="" />
                    )}
                    <span className="text-[#7a7268] text-[10px] w-7 text-right">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}

            <a
              href="/explorer"
              className="flex items-center justify-center gap-1 px-4 py-3 text-[#7a7268] text-xs hover:text-white transition border-t border-white/5"
            >
              Voir plus de lecteurs
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
                    <img
                      src={book.cover_url}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={book.title}
                    />
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
