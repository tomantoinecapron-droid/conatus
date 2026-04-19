'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

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
    comment: "Une exploration sincère de l'amour entre deux êtres que tout oppose. Rooney saisit avec précision quelque chose d'essentiel sur la jeunesse et le désir.",
    rating: 4,
    bg: '#EDEAE3',
    amazon: 'https://www.amazon.fr/s?k=Normal+People+Sally+Rooney',
  },
  {
    category: 'CLASSIQUE',
    title: 'Les Frères Karamazov',
    author: 'Fiodor Dostoïevski',
    comment: 'Le testament littéraire de Dostoïevski. Une fresque sur la foi, la liberté et la culpabilité sans équivalent dans la littérature mondiale.',
    rating: 5,
    bg: '#E3E0D8',
    amazon: 'https://www.amazon.fr/s?k=Les+Frères+Karamazov',
  },
  {
    category: 'SÉLECTION PRINTEMPS',
    title: "L'Élégance du hérisson",
    author: 'Muriel Barbery',
    comment: 'Une gardienne d\'immeuble secrètement cultivée, une enfant désabusée. Barbery écrit avec grâce sur la beauté cachée du quotidien.',
    rating: 4,
    bg: '#EDEAE3',
    amazon: 'https://www.amazon.fr/s?k=Elegance+Herisson+Barbery',
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
  const [totalBooks, setTotalBooks] = useState(0)
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(true)
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
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
    setTotalBooks((allMyBooksRes.data || []).length)

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F4EE' }}>
        <div className="text-sm" style={{ color: '#9A9690' }}>Chargement...</div>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen pb-28 relative overflow-x-hidden" style={{ background: '#F7F4EE', color: '#1A1A2E' }}>

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between relative overflow-hidden"
        style={{
          background: '#F7F4EE',
          backgroundImage: 'radial-gradient(circle, rgba(26,26,46,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          padding: '32px 20px 24px',
          borderBottom: '1px solid #D5D0C8',
        }}
      >
        <div className="flex-1 min-w-0 pr-3">
          <p style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '13px', color: '#9A9690', marginBottom: '8px' }}>
            {today}
          </p>
          <p style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '28px', fontWeight: '400', color: '#1A1A2E', lineHeight: '1.1' }}>
            {totalBooks} livre{totalBooks !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Cloche */}
        <a href="/notifications" className="relative p-1.5 shrink-0">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5" style={{ background: '#1A1A2E' }}>
              <span className="text-[9px] font-bold leading-none" style={{ color: '#F7F4EE' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
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
          stroke="#9A9690"
          strokeOpacity="0.08"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none shrink-0 ml-3"
        >
          <line x1="2" y1="6" x2="78" y2="6" />
          <line x1="4" y1="9" x2="76" y2="9" />
          <line x1="2" y1="54" x2="78" y2="54" />
          <line x1="4" y1="57" x2="76" y2="57" />
          <line x1="9" y1="10" x2="23" y2="10" />
          <line x1="10" y1="12" x2="22" y2="12" />
          <line x1="11" y1="13" x2="11" y2="52" strokeWidth="0.6" />
          <line x1="16" y1="13" x2="16" y2="52" strokeWidth="0.6" />
          <line x1="21" y1="13" x2="21" y2="52" strokeWidth="0.6" />
          <line x1="10" y1="52" x2="22" y2="52" />
          <line x1="9" y1="54" x2="23" y2="54" />
          <line x1="33" y1="10" x2="47" y2="10" />
          <line x1="34" y1="12" x2="46" y2="12" />
          <line x1="35" y1="13" x2="35" y2="52" strokeWidth="0.6" />
          <line x1="40" y1="13" x2="40" y2="52" strokeWidth="0.6" />
          <line x1="45" y1="13" x2="45" y2="52" strokeWidth="0.6" />
          <line x1="34" y1="52" x2="46" y2="52" />
          <line x1="33" y1="54" x2="47" y2="54" />
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
        style={{ background: 'linear-gradient(90deg, transparent 0%, #D5D0C8 50%, transparent 100%)' }}
      />

      {/* ── EN COURS + À LIRE ── */}
      <section className="px-5 mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9690', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#9A9690', marginRight: '8px' }} />
            Lecture
          </h2>
          <a href="/bibliotheque" style={{ fontSize: '10px', color: '#9A9690' }}>Bibliothèque →</a>
        </div>

        {enCours.length > 0 || nextBook ? (
          <div className="grid grid-cols-2 gap-2.5">
            {enCours[0] ? (() => {
              const reading = enCours[0]
              const progress = reading.progress ?? 0
              return (
                <div className="p-3 flex gap-2.5" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8', borderRadius: '10px' }}>
                  <a href={`/fiche/${reading.id}`} className="shrink-0">
                    <div className="w-[56px] h-[82px] rounded-lg overflow-hidden" style={{ background: '#D5D0C8' }}>
                      {reading.books?.cover_url
                        ? <img src={reading.books.cover_url} className="w-full h-full object-cover" alt={reading.books.title} />
                        : <div className="w-full h-full" style={{ background: 'linear-gradient(to bottom, #D5D0C8, #EDEAE3)' }} />}
                    </div>
                  </a>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <p style={{ fontSize: '9px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9A9690', marginBottom: '2px' }}>En cours</p>
                      <p className="font-serif text-[13px] leading-snug line-clamp-3" style={{ color: '#1A1A2E' }}>{reading.books?.title}</p>
                    </div>
                    <div>
                      <div className="relative w-full h-0.5 rounded-full overflow-hidden mb-1.5" style={{ background: '#D5D0C8' }}>
                        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#1A1A2E' }} />
                        <input type="range" min={0} max={100} value={progress}
                          onChange={e => updateProgress(reading.id, Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      <a href={`/fiche/${reading.id}`} className="text-[10px] font-medium" style={{ color: '#1A1A2E' }}>
                        {progress > 0 ? `${progress}% · ` : ''}Reprendre →
                      </a>
                    </div>
                  </div>
                </div>
              )
            })() : (
              <a href="/bibliotheque" className="flex items-center justify-center text-center" style={{ background: '#EDEAE3', border: '1px dashed #D5D0C8', borderRadius: '10px', padding: '40px 24px' }}>
                <div>
                  <p className="font-serif text-xs mb-1" style={{ color: '#9A9690' }}>Rien en cours</p>
                  <p className="text-[10px]" style={{ color: '#1A1A2E' }}>Commencer →</p>
                </div>
              </a>
            )}

            {nextBook ? (
              <a href={`/fiche/${nextBook.id}`} className="p-3 flex gap-2.5" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8', borderRadius: '10px' }}>
                <div className="shrink-0">
                  <div className="w-[56px] h-[82px] rounded-lg overflow-hidden" style={{ background: '#D5D0C8' }}>
                    {nextBook.books?.cover_url
                      ? <img src={nextBook.books.cover_url} className="w-full h-full object-cover" alt={nextBook.books.title} />
                      : <div className="w-full h-full" style={{ background: 'linear-gradient(to bottom, #D5D0C8, #EDEAE3)' }} />}
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <span className="text-[9px] font-medium uppercase tracking-wide mb-1.5 inline-block px-1.5 py-0.5 rounded-full" style={{ background: '#E3E0D8', color: '#9A9690' }}>À lire</span>
                    <p className="line-clamp-3" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '17px', fontWeight: '400', color: '#1A1A2E', lineHeight: '1.2', marginTop: '4px' }}>{nextBook.books?.title}</p>
                  </div>
                  <p className="text-[10px] truncate" style={{ color: '#9A9690' }}>{nextBook.books?.author?.split(' ').pop()}</p>
                </div>
              </a>
            ) : (
              <a href="/bibliotheque" className="p-3 flex items-center justify-center text-center" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8', borderRadius: '10px' }}>
                <div>
                  <p className="font-serif text-xs mb-1" style={{ color: '#9A9690' }}>File vide</p>
                  <p className="text-[10px]" style={{ color: '#1A1A2E' }}>Ajouter →</p>
                </div>
              </a>
            )}
          </div>
        ) : myRecentBooks.length > 0 ? (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8' }}>
            {myRecentBooks.map((reading, i) => (
              <a key={reading.id} href={`/fiche/${reading.id}`}
                className={`flex items-center gap-3 px-4 py-2.5 transition ${i < myRecentBooks.length - 1 ? 'border-b' : ''}`}
                style={i < myRecentBooks.length - 1 ? { borderColor: '#D5D0C8' } : {}}
              >
                <div className="w-7 h-10 rounded overflow-hidden shrink-0" style={{ background: '#D5D0C8' }}>
                  {reading.books?.cover_url
                    ? <img src={reading.books.cover_url} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full" style={{ background: 'linear-gradient(to bottom, #D5D0C8, #EDEAE3)' }} />}
                </div>
                <p className="flex-1 font-serif text-sm leading-tight truncate" style={{ color: '#1A1A2E' }}>{reading.books?.title}</p>
                <span className="text-[10px] shrink-0" style={{ color: '#9A9690' }}>{reading.books?.author?.split(' ').pop()}</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl px-5 py-6 text-center" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8' }}>
            <p className="text-sm font-serif mb-3" style={{ color: '#9A9690' }}>Ta bibliothèque est vide</p>
            <a href="/bibliotheque" className="text-xs font-medium" style={{ color: '#1A1A2E' }}>Ajouter un livre →</a>
          </div>
        )}
      </section>

      {/* ── Upsell Pro ── */}
      {!isPro && (
        <section className="px-5 mb-5">
          <a
            href="/premium"
            className="flex items-center gap-3 rounded-xl px-4 py-3 transition group"
            style={{ border: '1px solid #D5D0C8', background: '#EDEAE3' }}
          >
            <span className="text-base leading-none shrink-0" style={{ color: '#1A1A2E' }}>✦</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium leading-tight" style={{ color: '#1A1A2E' }}>Passe à Conatus Pro</p>
              <p className="text-[11px] mt-0.5 leading-snug" style={{ color: '#9A9690' }}>
                Bibliothèque illimitée · Cercles sans limite · Stats avancées
              </p>
            </div>
            <span className="text-xs font-medium shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: '#1A1A2E' }}>
              Voir →
            </span>
          </a>
        </section>
      )}

      {/* ── MES CERCLES ── */}
      {myCircles.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between px-5 mb-2.5">
            <h2 style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9690', display: 'flex', alignItems: 'center' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#9A9690', marginRight: '8px' }} />
              Mes cercles
            </h2>
            <a href="/cercles" style={{ fontSize: '10px', color: '#9A9690' }}>Voir tout →</a>
          </div>

          <div className="flex gap-2 px-5 overflow-x-auto pb-1 scrollbar-hide">
            {myCircles.map(membership => {
              const circle = membership.circles
              const dotColor = circle.cover_color || '#9A9690'
              return (
                <a
                  key={circle.id}
                  href={`/cercles/${circle.id}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition active:opacity-70"
                  style={{ border: '1px solid #D5D0C8', backgroundColor: 'transparent' }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                  <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#1A1A2E' }}>{circle.name}</span>
                </a>
              )
            })}
            <a
              href="/cercles"
              className="shrink-0 flex items-center px-3 py-1.5 rounded-full text-xs transition"
              style={{ border: '1px dashed #D5D0C8', color: '#9A9690' }}
            >
              + Nouveau
            </a>
          </div>
        </section>
      )}

      {/* ── SÉLECTION DU MOIS ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9690', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#9A9690', marginRight: '8px' }} />
            Sélection du mois
          </h2>
        </div>

        <div className="flex gap-3 px-5 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {SELECTION_DU_MOIS.map((book, i) => (
            <div
              key={i}
              className="shrink-0 w-[72vw] max-w-[280px] snap-start p-4 flex flex-col justify-between gap-3"
              style={{ backgroundColor: book.bg, border: '1px solid #D5D0C8', borderRadius: '10px', boxShadow: '0 2px 8px rgba(26,26,46,0.06)' }}
            >
              <div>
                <p style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: '#E3E0D8', color: '#9A9690', padding: '3px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>
                  {book.category}
                </p>
                <p style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '20px', fontWeight: '400', color: '#1A1A2E', lineHeight: '1.2', marginBottom: '4px' }}>
                  {book.title}
                </p>
                <p className="text-xs mb-3" style={{ color: '#9A9690' }}>{book.author}</p>
                <p className="text-[13px] italic leading-relaxed line-clamp-3" style={{ color: '#1A1A2E' }}>
                  {book.comment}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm tracking-tight leading-none" style={{ color: '#9A9690' }}>
                  {'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}
                </span>
                <a href={book.amazon} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: '#9A9690' }}>
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
          <h2 style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9690' }}>Objectifs</h2>
          <a href="/objectifs" style={{ fontSize: '10px', color: '#9A9690' }}>Voir →</a>
        </div>
        <a href="/objectifs" className="flex items-center gap-3 px-4 py-3 transition" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8', borderRadius: '10px' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#E3E0D8', border: '1px solid #D5D0C8' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: '#1A1A2E' }}>Définis tes objectifs de lecture</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#9A9690' }}>Rythme quotidien, hebdomadaire...</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9690" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      </section>

      {/* ── FEED ── */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9690' }}>Activité</h2>
          <a href="/social" style={{ fontSize: '10px', color: '#9A9690' }}>Explorer →</a>
        </div>

        {feed.length === 0 ? (
          <div className="rounded-2xl px-5 py-6 text-center" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8' }}>
            <p className="text-sm font-serif mb-3" style={{ color: '#9A9690' }}>Aucune activité</p>
            <a href="/social" className="text-xs font-medium" style={{ color: '#1A1A2E' }}>Suivre des lecteurs →</a>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8' }}>
            {feed.map((item, i) => {
              const username = item.profile?.username
              const avatarUrl = item.profile?.avatar_url
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < feed.length - 1 ? 'border-b' : ''}`}
                  style={i < feed.length - 1 ? { borderColor: '#D5D0C8' } : {}}
                >
                  <a href={`/profil/${username}`} className="shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style={{ background: '#E3E0D8' }}>
                      {avatarUrl
                        ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                        : <span className="font-serif text-xs leading-none" style={{ color: '#1A1A2E' }}>{username?.[0]?.toUpperCase() ?? '?'}</span>}
                    </div>
                  </a>
                  <p className="flex-1 min-w-0 text-xs leading-none truncate">
                    <a href={`/profil/${username}`} className="font-medium" style={{ color: '#1A1A2E' }}>@{username}</a>
                    {item.profile?.is_pro && <span className="text-[10px] ml-0.5" style={{ color: '#9A9690' }}>✦</span>}
                    {' '}
                    {item.type === 'reading' && (
                      <>
                        <span style={{ color: '#9A9690' }}>{STATUS_ACTION[item.status] ?? 'a ajouté'}</span>
                        {' '}
                        <span className="font-serif italic" style={{ color: '#1A1A2E' }}>{item.book?.title}</span>
                        {item.status === 'lu' && item.rating > 0 && (
                          <span className="ml-0.5" style={{ color: '#9A9690' }}>{stars(item.rating)}</span>
                        )}
                      </>
                    )}
                    {item.type === 'circle_join' && (
                      <>
                        <span style={{ color: '#9A9690' }}>a rejoint</span>
                        {' '}
                        <a href={`/cercles/${item.circle?.id}`} className="font-medium" style={{ color: '#1A1A2E' }}>{item.circle?.name}</a>
                      </>
                    )}
                  </p>
                  <span className="text-[10px] shrink-0 ml-1" style={{ color: '#9A9690' }}>{timeAgo(item.date)}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── SUGGESTIONS ── */}
      {suggestions.length > 0 && (
        <section className="px-5 mb-6">
          <h2 style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9690', marginBottom: '10px' }}>À découvrir</h2>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8' }}>
            {suggestions.map((book, i) => (
              <div key={book.id} className={`flex items-center gap-3 px-4 py-3 ${i < suggestions.length - 1 ? 'border-b' : ''}`}
                style={i < suggestions.length - 1 ? { borderColor: '#D5D0C8' } : {}}>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm leading-snug line-clamp-1" style={{ color: '#1A1A2E' }}>{book.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xs truncate" style={{ color: '#9A9690' }}>{book.author}</p>
                    {book.category && book.category !== 'Autre' && (
                      <span className="text-[10px] rounded px-1.5 py-px leading-none shrink-0" style={{ color: '#9A9690', border: '1px solid #D5D0C8', background: '#E3E0D8' }}>
                        {book.category}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => addToLibrary(book)}
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-90 transition"
                  style={{ background: '#1A1A2E' }}
                  aria-label={`Ajouter ${book.title}`}
                >
                  <span className="text-base font-medium leading-none" style={{ color: '#F7F4EE' }}>+</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FAB ── */}
      <a
        href="/bibliotheque"
        className="fixed bottom-20 right-5 z-40 w-12 h-12 rounded-full flex items-center justify-center hover:opacity-90 active:scale-95 transition-transform"
        style={{ background: '#1A1A2E', boxShadow: '0 4px 12px rgba(26,26,46,0.2)' }}
        aria-label="Ajouter un livre"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="#F7F4EE">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </a>

      <BottomNav />
    </div>
  )
}
