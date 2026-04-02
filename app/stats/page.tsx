'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-6 mb-4">
      <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#7a7268] shrink-0">{children}</p>
      <div className="flex-1 h-px bg-white/6" />
    </div>
  )
}

// ── Aperçu non-Pro ─────────────────────────────────────────────────────────

function FakeBar({ w }: { w: number }) {
  return <div className="h-1.5 rounded-full bg-white/15" style={{ width: `${w}%` }} />
}

function NonProView() {
  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-28 relative overflow-hidden">

      {/* ── Contenu flou ── */}
      <div className="px-6 pt-12 pb-6 select-none pointer-events-none blur-[3px] opacity-40">
        <h1 className="font-serif text-[30px] text-white mb-1">Statistiques</h1>
        <p className="text-[#7a7268] text-sm">Année 2025</p>

        <div className="mt-6 mb-8">
          <p className="text-[#7a7268] text-xs uppercase tracking-widest mb-2">Objectif annuel</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-serif text-[40px] text-white leading-none">12</span>
            <span className="text-[#7a7268] text-sm">/ 24 livres</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div className="h-full bg-[#c9440e] rounded-full" style={{ width: '50%' }} />
          </div>
        </div>

        <div className="mb-8">
          <p className="font-serif italic text-white/50 text-[15px] leading-relaxed">
            En avril, tu as lu 3 livres — 1 de plus qu'en mars.
          </p>
        </div>

        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-widest text-[#7a7268] mb-4">Genres les plus lus</p>
          <div className="flex flex-col gap-3">
            {[['Littérature étrangère', 85], ['Philosophie', 55], ['Sciences humaines', 35], ['Histoire', 20]].map(([g, w]) => (
              <div key={g as string}>
                <div className="flex justify-between mb-1">
                  <span className="text-[13px] text-white/60">{g}</span>
                  <span className="text-[12px] text-[#7a7268]">5</span>
                </div>
                <FakeBar w={w as number} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Overlay upsell ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 pb-20">
        <div className="text-center max-w-xs">
          <p className="text-[#c9440e] text-[13px] mb-3">✦</p>
          <h2 className="font-serif text-[24px] text-white mb-3 leading-tight">
            Tes statistiques t'attendent
          </h2>
          <p className="text-[#7a7268] text-[14px] leading-relaxed mb-6">
            Objectifs annuels, bilan mensuel, timeline de lecture, genres favoris — une vue complète de ta vie de lecteur.
          </p>
          <a
            href="/premium"
            className="inline-flex items-center gap-2 bg-[#c9440e] text-white text-[13px] font-medium px-6 py-3 rounded-full hover:opacity-90 transition"
          >
            Passer à Pro ✦
          </a>
          <p className="text-[#7a7268]/50 text-[11px] mt-3">
            Déjà abonné ?{' '}
            <a href="/settings" className="underline hover:text-[#7a7268] transition">Vérifier mon compte</a>
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

// ── Page Pro ───────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [user, setUser] = useState<any>(null)
  const [isPro, setIsPro] = useState(false)
  const [luBooks, setLuBooks] = useState<any[]>([])
  const [readingGoal, setReadingGoal] = useState(0)
  const [goalInput, setGoalInput] = useState('')
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalSaving, setGoalSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setUser(data.user)

      const [profileRes, booksRes] = await Promise.all([
        supabase.from('profiles').select('is_pro, reading_goal').eq('id', data.user.id).single(),
        supabase.from('readings').select('*, books(*)')
          .eq('user_id', data.user.id).eq('status', 'lu')
          .order('updated_at', { ascending: false }),
      ])

      const goal = profileRes.data?.reading_goal ?? 0
      setIsPro(profileRes.data?.is_pro ?? false)
      setReadingGoal(goal)
      setGoalInput(String(goal || 12))
      setLuBooks(booksRes.data || [])
      setLoading(false)
    })
  }, [])

  const saveGoal = async () => {
    const n = Math.max(0, parseInt(goalInput) || 0)
    setGoalSaving(true)
    setReadingGoal(n)
    setEditingGoal(false)
    await supabase.from('profiles').update({ reading_goal: n }).eq('id', user.id)
    setGoalSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex items-center justify-center">
        <div className="text-[#7a7268] text-sm">Chargement...</div>
      </div>
    )
  }

  if (!isPro) return <NonProView />

  // ── Calculs ────────────────────────────────────────────────────────────────

  const now = new Date()
  const cy = now.getFullYear()
  const cm = now.getMonth()

  const thisYear = luBooks.filter(r => new Date(r.updated_at).getFullYear() === cy)
  const thisMonth = thisYear.filter(r => new Date(r.updated_at).getMonth() === cm)
  const prevMonthIdx = cm === 0 ? 11 : cm - 1
  const prevMonthYear = cm === 0 ? cy - 1 : cy
  const prevMonth = luBooks.filter(r => {
    const d = new Date(r.updated_at)
    return d.getMonth() === prevMonthIdx && d.getFullYear() === prevMonthYear
  })

  // Objectif annuel
  const yearCount = thisYear.length
  const goalPct = readingGoal > 0 ? Math.min(100, Math.round((yearCount / readingGoal) * 100)) : 0

  // Bilan mensuel
  const bilanPhrase = (() => {
    const curr = thisMonth.length
    const prev = prevMonth.length
    const monthName = MONTHS_FR[cm]
    const prevName = MONTHS_FR[prevMonthIdx]
    if (curr === 0) return `Tu n'as pas encore lu de livre en ${monthName}.`
    const base = `En ${monthName}, tu as lu ${curr} livre${curr > 1 ? 's' : ''}`
    const diff = curr - prev
    if (prev === 0) return `${base}.`
    if (diff > 0) return `${base} — ${diff} de plus qu'en ${prevName}.`
    if (diff < 0) return `${base} — ${Math.abs(diff)} de moins qu'en ${prevName}.`
    return `${base}, autant qu'en ${prevName}.`
  })()

  // Timeline par mois
  const byMonth: { key: string; label: string; books: any[] }[] = []
  const seenKeys = new Set<string>()
  for (const r of luBooks) {
    const d = new Date(r.updated_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      byMonth.push({ key, label: `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`, books: [] })
    }
    byMonth[byMonth.length - 1].books.push(r)
  }

  // Stats avancées
  const genreCounts: Record<string, number> = {}
  const authorCounts: Record<string, number> = {}
  let ratingSum = 0, ratingCount = 0
  for (const r of luBooks) {
    const cat = r.books?.category || 'Autre'
    genreCounts[cat] = (genreCounts[cat] || 0) + 1
    const author = r.books?.author || 'Inconnu'
    authorCounts[author] = (authorCounts[author] || 0) + 1
    if (r.rating > 0) { ratingSum += r.rating; ratingCount++ }
  }

  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)
  const maxGenreCount = topGenres[0]?.[1] ?? 1
  const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : null

  let pace: string | null = null
  if (luBooks.length >= 2) {
    const oldest = new Date(luBooks[luBooks.length - 1].updated_at)
    const months = Math.max(1, (now.getTime() - oldest.getTime()) / (30 * 24 * 3600 * 1000))
    const perMonth = luBooks.length / months
    pace = perMonth >= 1
      ? `${perMonth.toFixed(1)} livre${parseFloat(perMonth.toFixed(1)) > 1 ? 's' : ''} / mois`
      : `1 livre tous les ${Math.round(1 / perMonth)} mois`
  }

  const dayOfYear = Math.floor((now.getTime() - new Date(cy, 0, 1).getTime()) / 86400000)
  const expectedPace = readingGoal > 0 ? Math.round(readingGoal * dayOfYear / 365) : null
  const aheadBehind = expectedPace !== null
    ? yearCount - expectedPace
    : null

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-28">

      {/* ── Header ── */}
      <div className="px-6 pt-12 pb-6">
        <h1 className="font-serif text-[30px] text-white mb-0.5">Statistiques</h1>
        <p className="text-[#7a7268] text-[12px]">{luBooks.length} livre{luBooks.length !== 1 ? 's' : ''} lu{luBooks.length !== 1 ? 's' : ''} au total</p>
      </div>

      {/* ── Objectif annuel ── */}
      <section className="mb-10">
        <SectionTitle>Objectif {cy}</SectionTitle>

        <div className="px-6">
          {readingGoal > 0 ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-serif text-[44px] text-white leading-none">{yearCount}</span>
                <span className="text-[#7a7268] text-[15px]">/ {readingGoal} livre{readingGoal !== 1 ? 's' : ''}</span>
              </div>

              {/* Barre de progression */}
              <div className="relative h-1 bg-white/8 rounded-full overflow-hidden mb-2">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${goalPct}%`,
                    background: goalPct >= 100
                      ? '#4ade80'
                      : `linear-gradient(90deg, #c9440e, #e05a1c)`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[#7a7268] text-[11px]">
                  {goalPct >= 100 ? 'Objectif atteint ✓' : `${goalPct}% de l'objectif`}
                  {aheadBehind !== null && aheadBehind !== 0 && (
                    <span className={`ml-2 ${aheadBehind > 0 ? 'text-emerald-400/70' : 'text-[#c9440e]/60'}`}>
                      {aheadBehind > 0 ? `+${aheadBehind} d'avance` : `${Math.abs(aheadBehind)} de retard`}
                    </span>
                  )}
                </p>
                <button
                  onClick={() => setEditingGoal(true)}
                  className="text-[#7a7268] text-[11px] hover:text-white transition"
                >
                  Modifier
                </button>
              </div>
            </>
          ) : (
            <p className="text-[#7a7268] text-[14px] mb-2 font-serif italic">
              Définis ton objectif de lecture pour cette année.
            </p>
          )}

          {(editingGoal || readingGoal === 0) && (
            <div className="flex items-center gap-2 mt-3">
              <input
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveGoal()}
                min="1"
                max="365"
                className="w-20 bg-[#242018] border border-white/8 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#c9440e]/50 transition text-center"
              />
              <span className="text-[#7a7268] text-sm">livres cette année</span>
              <button
                onClick={saveGoal}
                disabled={goalSaving}
                className="text-[12px] font-medium text-white bg-[#c9440e] px-4 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50 ml-1"
              >
                {goalSaving ? '…' : 'Valider'}
              </button>
              {editingGoal && (
                <button onClick={() => setEditingGoal(false)} className="text-[#7a7268] text-[12px] hover:text-white transition">
                  Annuler
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Bilan mensuel ── */}
      <section className="mb-10">
        <SectionTitle>Ce mois-ci</SectionTitle>
        <div className="px-6">
          <p className="font-serif italic text-[16px] text-white/60 leading-relaxed">
            {bilanPhrase}
          </p>
          {thisMonth.length > 0 && (
            <div className="flex items-center gap-4 mt-3">
              <span className="text-[#7a7268] text-[12px]">
                <span className="text-white/70 font-medium">{thisMonth.length}</span> ce mois
              </span>
              <span className="text-white/15">·</span>
              <span className="text-[#7a7268] text-[12px]">
                <span className="text-white/70 font-medium">{prevMonth.length}</span> le mois dernier
              </span>
              <span className="text-white/15">·</span>
              <span className="text-[#7a7268] text-[12px]">
                <span className="text-white/70 font-medium">{yearCount}</span> cette année
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Stats avancées ── */}
      {luBooks.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Vue d'ensemble</SectionTitle>

          <div className="px-6 flex flex-col gap-5">

            {/* Chiffres clés inline */}
            <div className="flex items-center gap-4 flex-wrap">
              {avgRating && (
                <div>
                  <p className="font-serif text-[28px] text-white leading-none">{avgRating}</p>
                  <p className="text-[#7a7268] text-[11px] mt-0.5">note moyenne</p>
                </div>
              )}
              {pace && (
                <>
                  <div className="w-px h-8 bg-white/8" />
                  <div>
                    <p className="font-serif text-[28px] text-white leading-none">{pace.split(' ')[0]}</p>
                    <p className="text-[#7a7268] text-[11px] mt-0.5">{pace.split(' ').slice(1).join(' ')}</p>
                  </div>
                </>
              )}
              {topAuthors.length > 0 && (
                <>
                  <div className="w-px h-8 bg-white/8" />
                  <div>
                    <p className="font-serif text-[28px] text-white leading-none">{topAuthors.length > 0 ? topAuthors[0][1] : '—'}</p>
                    <p className="text-[#7a7268] text-[11px] mt-0.5">par {topAuthors[0]?.[0]?.split(' ').pop()}</p>
                  </div>
                </>
              )}
            </div>

            {/* Top genres */}
            {topGenres.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#7a7268] mb-3">Genres</p>
                <div className="flex flex-col gap-3">
                  {topGenres.map(([genre, count]) => (
                    <div key={genre}>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-[13px] text-white/70">{genre}</span>
                        <span className="text-[12px] text-[#7a7268]">{count}</span>
                      </div>
                      <div className="h-px bg-white/6 relative overflow-hidden rounded-full">
                        <div
                          className="absolute inset-y-0 left-0 bg-[#c9440e]/50 transition-all"
                          style={{ width: `${Math.round((count / maxGenreCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top auteurs */}
            {topAuthors.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#7a7268] mb-3">Auteurs</p>
                <div className="flex flex-col gap-2">
                  {topAuthors.map(([author, count]) => (
                    <div key={author} className="flex items-baseline justify-between">
                      <span className="text-[13px] text-white/70 truncate flex-1 pr-3">{author}</span>
                      <span className="text-[12px] text-[#7a7268] shrink-0">{count} livre{count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Timeline ── */}
      {luBooks.length > 0 ? (
        <section className="mb-10">
          <SectionTitle>Journal de lecture</SectionTitle>

          <div className="px-6 flex flex-col gap-7">
            {byMonth.map(({ label, books }) => (
              <div key={label}>
                <p className="text-[11px] font-medium tracking-wide text-[#7a7268] capitalize mb-3">{label}</p>
                <div className="flex flex-col gap-3">
                  {books.map((r: any) => {
                    const d = new Date(r.updated_at)
                    const dayLabel = `${d.getDate()} ${MONTHS_FR[d.getMonth()].slice(0, 3)}.`
                    return (
                      <a
                        key={r.id}
                        href={`/fiche/${r.id}`}
                        className="flex items-baseline gap-3 group"
                      >
                        <span className="text-[#7a7268]/50 text-[11px] shrink-0 w-12 text-right">{dayLabel}</span>
                        <div className="flex-1 min-w-0 border-l border-white/6 pl-3">
                          <p className="font-serif text-[14px] text-white/80 leading-snug group-hover:text-white transition line-clamp-1">
                            {r.books?.title}
                          </p>
                          <p className="text-[#7a7268] text-[11px] mt-0.5 truncate">
                            {r.books?.author}
                            {r.rating > 0 && (
                              <span className="ml-2 text-[#c9440e]/50">
                                {'★'.repeat(Math.round(r.rating))}
                              </span>
                            )}
                          </p>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="px-6 py-12 text-center">
          <p className="font-serif text-white/30 text-base">Aucun livre terminé pour l'instant</p>
          <p className="text-[#7a7268] text-sm mt-1">Tes stats s'afficheront ici au fil de tes lectures.</p>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
