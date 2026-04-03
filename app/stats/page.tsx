'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

// ── Constantes ─────────────────────────────────────────────────────────────

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const MONTHLY_CHALLENGES: { title: string; desc: string; category: string | null }[] = [
  { title: 'Livre oublié', desc: 'Lis un livre que tu remets depuis trop longtemps.', category: null },
  { title: 'Voyage littéraire', desc: 'Un roman se déroulant dans un pays que tu n\'as jamais visité.', category: 'Littérature étrangère' },
  { title: 'Printemps philosophique', desc: 'Un essai ou un texte de philosophie.', category: 'Philosophie' },
  { title: 'Classique', desc: 'Un titre de la littérature mondiale considéré comme classique.', category: 'Littérature étrangère' },
  { title: 'Comprendre le monde', desc: 'Un livre de sciences humaines ou sociales.', category: 'Sciences humaines' },
  { title: 'Récit de vie', desc: 'Une biographie, un journal, des mémoires.', category: 'Histoire' },
  { title: 'Évasion estivale', desc: 'Un roman d\'aventure ou de dépaysement total.', category: 'Littérature étrangère' },
  { title: 'Rentrée littéraire', desc: 'Un auteur français contemporain.', category: 'Littérature française' },
  { title: 'Regard intérieur', desc: 'Un livre qui change ta façon de voir les choses.', category: 'Développement personnel' },
  { title: 'Voix française', desc: 'Un titre d\'un auteur français, classique ou moderne.', category: 'Littérature française' },
  { title: 'Grand roman', desc: 'Un roman dense, de plus de 400 pages.', category: null },
  { title: 'Bilan de l\'année', desc: 'Relis ou achève un livre commencé cette année.', category: null },
]

const MILESTONES: { count: number; label: string; detail: string }[] = [
  { count: 1, label: 'Premier livre', detail: 'Tu as terminé ton premier livre — le reste s\'écrit.' },
  { count: 5, label: '5 livres lus', detail: 'Une belle cadence s\'installe.' },
  { count: 10, label: '10 livres lus', detail: 'Double chiffre. Tu lis, vraiment.' },
  { count: 25, label: '25 livres lus', detail: 'Un quart de centaine. Impressionnant.' },
  { count: 50, label: '50 livres lus', detail: 'Cinquante livres. Une bibliothèque en toi.' },
  { count: 100, label: '100 livres lus', detail: 'Centenaire. Un lecteur accompli.' },
]

const LS_KEY = 'conatus_milestones_seen'

// ── Composants utilitaires ─────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-6 mb-4">
      <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#7a7268] shrink-0">{children}</p>
      <div className="flex-1 h-px bg-white/6" />
    </div>
  )
}

// ── Aperçu non-Pro ─────────────────────────────────────────────────────────

function NonProView() {
  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-28 relative overflow-hidden">
      <div className="px-6 pt-12 pb-6 select-none pointer-events-none blur-[3px] opacity-40">
        <h1 className="font-serif text-[30px] text-white mb-1">Statistiques</h1>
        <p className="text-[#7a7268] text-sm">Année 2026</p>
        <div className="mt-6 mb-8">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-serif text-[44px] text-white leading-none">12</span>
            <span className="text-[#7a7268] text-sm">/ 24 livres</span>
          </div>
          <div className="h-1 rounded-full bg-white/8 overflow-hidden mb-1">
            <div className="h-full rounded-full" style={{ width: '50%', background: 'linear-gradient(90deg, #c9440e, #e05a1c)' }} />
          </div>
        </div>
        <div className="mb-8">
          <p className="font-serif italic text-white/50 text-[15px]">En avril, tu as lu 3 livres — 1 de plus qu'en mars.</p>
        </div>
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-widest text-[#7a7268] mb-3">Défi du mois</p>
          <p className="text-white/60 text-[14px]">Classique — Lis un titre de la littérature mondiale.</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#7a7268] mb-3">Genres</p>
          {[['Littérature étrangère', 85], ['Philosophie', 55], ['Sciences humaines', 35]].map(([g, w]) => (
            <div key={g as string} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-[13px] text-white/60">{g}</span>
                <span className="text-[12px] text-[#7a7268]">5</span>
              </div>
              <div className="h-px bg-white/15" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 pb-20">
        <div className="text-center max-w-xs">
          <p className="text-[#c9440e] text-[13px] mb-3">✦</p>
          <h2 className="font-serif text-[24px] text-white mb-3 leading-tight">Tes statistiques t'attendent</h2>
          <p className="text-[#7a7268] text-[14px] leading-relaxed mb-6">
            Objectifs annuels, défis mensuels, journal de lecture, milestones — une vue complète de ta vie de lecteur.
          </p>
          <a href="/premium" className="inline-flex items-center gap-2 bg-[#c9440e] text-white text-[13px] font-medium px-6 py-3 rounded-full hover:opacity-90 transition">
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

// ── Page principale ────────────────────────────────────────────────────────

export default function StatsPage() {
  const [user, setUser] = useState<any>(null)
  const [isPro, setIsPro] = useState(false)
  const [luBooks, setLuBooks] = useState<any[]>([])
  const [enCoursBooks, setEnCoursBooks] = useState<any[]>([])

  // Objectifs
  const [readingGoal, setReadingGoal] = useState(0)
  const [goalInput, setGoalInput] = useState('12')
  const [pagesGoal, setPagesGoal] = useState(0)
  const [pagesInput, setPagesInput] = useState('50')
  const [goalsValidated, setGoalsValidated] = useState(false)
  const [saving, setSaving] = useState(false)

  // Milestones
  const [milestone, setMilestone] = useState<{ label: string; detail: string } | null>(null)

  const [loading, setLoading] = useState(true)

  // ── Chargement ─────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setUser(data.user)

      const [profileRes, luRes, enCoursRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', data.user.id).single(),
        supabase.from('readings').select('*, books(*)')
          .eq('user_id', data.user.id).eq('status', 'lu')
          .order('updated_at', { ascending: false }),
        supabase.from('readings').select('id, progress, updated_at')
          .eq('user_id', data.user.id).eq('status', 'en_cours'),
      ])

      console.log('[stats] profileRes.error:', profileRes.error)
      console.log('[stats] profile row:', profileRes.data)
      console.log('[stats] yearly_goal:', profileRes.data?.yearly_goal)
      console.log('[stats] weekly_pages_goal:', profileRes.data?.weekly_pages_goal)
      console.log('[stats] goals_validated:', profileRes.data?.goals_validated)

      const prof = profileRes.data
      const goal = prof?.yearly_goal ?? 0
      const pages = prof?.weekly_pages_goal ?? 0
      const validated = prof?.goals_validated === true
      setIsPro(prof?.is_pro === true)
      setReadingGoal(goal)
      setGoalInput(String(goal || 12))
      setPagesGoal(pages)
      setPagesInput(String(pages || 50))
      setGoalsValidated(validated)
      setLuBooks(luRes.data || [])
      setEnCoursBooks(enCoursRes.data || [])
      setLoading(false)
    })
  }, [])

  // ── Milestones (post-load) ─────────────────────────────────────────────────

  useEffect(() => {
    if (!luBooks.length) return
    try {
      const seen: string[] = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
      // On cherche le milestone le plus élevé atteint et pas encore vu
      const newOnes = MILESTONES.filter(m => luBooks.length >= m.count && !seen.includes(m.label))
      if (newOnes.length > 0) setMilestone(newOnes[newOnes.length - 1])
    } catch { /* localStorage indisponible */ }
  }, [luBooks])

  const dismissMilestone = useCallback(() => {
    if (!milestone) return
    try {
      const seen: string[] = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
      localStorage.setItem(LS_KEY, JSON.stringify([...seen, milestone.label]))
    } catch { /* */ }
    setMilestone(null)
  }, [milestone])

  // ── Sauvegarde unifiée des objectifs ──────────────────────────────────────

  const saveGoals = async () => {
    const g = Math.max(1, parseInt(goalInput) || 12)
    const p = Math.max(1, parseInt(pagesInput) || 50)
    console.log('[stats] saveGoals → envoi:', { id: user.id, yearly_goal: g, weekly_pages_goal: p, goals_validated: true })
    setSaving(true)
    setReadingGoal(g)
    setPagesGoal(p)
    setGoalsValidated(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({ yearly_goal: g, weekly_pages_goal: p, goals_validated: true })
      .eq('id', user.id)
      .select()
    console.log('[stats] saveGoals ← data:', data)
    console.log('[stats] saveGoals ← error:', error)
    setSaving(false)
  }

  const startModify = async () => {
    setGoalsValidated(false)
    console.log('[stats] startModify → goals_validated: false pour', user.id)
    const { data, error } = await supabase
      .from('profiles')
      .update({ goals_validated: false })
      .eq('id', user.id)
      .select()
    console.log('[stats] startModify ← data:', data)
    console.log('[stats] startModify ← error:', error)
  }

  // ── États de chargement / gate ─────────────────────────────────────────────

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

  // Objectif annuel
  const thisYear = luBooks.filter(r => new Date(r.updated_at).getFullYear() === cy)
  const yearCount = thisYear.length
  const goalPct = readingGoal > 0 ? Math.min(100, Math.round((yearCount / readingGoal) * 100)) : 0

  const endOfYear = new Date(cy + 1, 0, 1)
  const daysLeft = Math.ceil((endOfYear.getTime() - now.getTime()) / 86400000)
  const booksLeft = readingGoal > 0 ? Math.max(0, readingGoal - yearCount) : 0

  const dayOfYear = Math.floor((now.getTime() - new Date(cy, 0, 1).getTime()) / 86400000)
  const expectedPace = readingGoal > 0 ? Math.round(readingGoal * dayOfYear / 365) : null
  const aheadBehind = expectedPace !== null ? yearCount - expectedPace : null

  // Bilan mensuel
  const thisMonth = thisYear.filter(r => new Date(r.updated_at).getMonth() === cm)
  const prevMonthIdx = cm === 0 ? 11 : cm - 1
  const prevMonthYear = cm === 0 ? cy - 1 : cy
  const prevMonth = luBooks.filter(r => {
    const d = new Date(r.updated_at)
    return d.getMonth() === prevMonthIdx && d.getFullYear() === prevMonthYear
  })

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

  // Défi du mois
  const challenge = MONTHLY_CHALLENGES[cm]
  const challengeDone = challenge.category
    ? thisMonth.some(r => r.books?.category === challenge.category)
    : thisMonth.length > 0

  // Pages cette semaine (estimation depuis progress des livres en cours)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const pagesEstimate = enCoursBooks
    .filter(r => new Date(r.updated_at) >= startOfWeek && r.progress > 0)
    .reduce((sum, r) => sum + Math.round((r.progress / 100) * 300), 0)
  const pagesPct = pagesGoal > 0 ? Math.min(100, Math.round((pagesEstimate / pagesGoal) * 100)) : 0

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

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-28">

      {/* ── Header ── */}
      <div className="px-6 pt-12 pb-5">
        <h1 className="font-serif text-[30px] text-white mb-0.5">Statistiques</h1>
        <p className="text-[#7a7268] text-[12px]">
          {luBooks.length} livre{luBooks.length !== 1 ? 's' : ''} lu{luBooks.length !== 1 ? 's' : ''} au total
        </p>
      </div>

      {/* ── Milestone ── */}
      {milestone && (
        <div className="mx-6 mb-6 flex items-start justify-between gap-3 border-l-2 border-[#c9440e]/50 pl-4 py-1">
          <div>
            <p className="text-white/80 text-[13px] font-medium">{milestone.label}</p>
            <p className="text-[#7a7268] text-[12px] italic font-serif mt-0.5">{milestone.detail}</p>
          </div>
          <button
            onClick={dismissMilestone}
            className="text-[#7a7268] hover:text-white transition shrink-0 mt-0.5"
            aria-label="Fermer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Objectifs ── */}
      <section className="mb-10">
        <div className="flex items-center gap-4 px-6 mb-4">
          <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#7a7268] shrink-0">Objectif {cy}</p>
          <div className="flex-1 h-px bg-white/6" />
          {goalsValidated && (
            <button onClick={startModify} className="text-[#7a7268] text-[11px] hover:text-white transition shrink-0">
              Modifier
            </button>
          )}
        </div>

        <div className="px-6">
          {goalsValidated ? (
            /* ── Mode validé ── */
            <>
              {/* Livres */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-serif text-[44px] text-white leading-none">{yearCount}</span>
                  <span className="text-[#7a7268] text-[15px]">/ {readingGoal} livre{readingGoal !== 1 ? 's' : ''}</span>
                </div>
                <div className="relative h-1 bg-white/8 rounded-full overflow-hidden mb-2">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{
                      width: `${goalPct}%`,
                      background: goalPct >= 100 ? '#4ade80' : 'linear-gradient(90deg, #c9440e, #e05a1c)',
                    }}
                  />
                </div>
                <p className="text-[#7a7268] text-[11px]">
                  {goalPct >= 100 ? 'Objectif atteint ✓' : `${goalPct}%`}
                  {aheadBehind !== null && aheadBehind !== 0 && (
                    <span className={`ml-2 ${aheadBehind > 0 ? 'text-emerald-400/70' : 'text-[#c9440e]/60'}`}>
                      {aheadBehind > 0 ? `+${aheadBehind} d'avance` : `${Math.abs(aheadBehind)} de retard`}
                    </span>
                  )}
                </p>
                {booksLeft > 0 && daysLeft > 0 && (
                  <p className="text-[#7a7268]/45 text-[11px] mt-0.5 italic">
                    Il te reste {daysLeft} jour{daysLeft !== 1 ? 's' : ''} pour lire {booksLeft} livre{booksLeft !== 1 ? 's' : ''} de plus.
                  </p>
                )}
                {goalPct >= 100 && (
                  <p className="text-emerald-400/50 text-[11px] mt-0.5 italic">
                    Bravo — encore {daysLeft} jours pour aller plus loin.
                  </p>
                )}
              </div>

              {/* Pages */}
              <div>
                <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#7a7268] mb-3">Pages cette semaine</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-serif text-[36px] text-white leading-none">~{pagesEstimate}</span>
                  <span className="text-[#7a7268] text-[14px]">/ {pagesGoal} pages</span>
                </div>
                <div className="relative h-1 bg-white/8 rounded-full overflow-hidden mb-2">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-white/25 transition-all" style={{ width: `${pagesPct}%` }} />
                </div>
                <p className="text-[#7a7268]/45 text-[11px] italic">Estimation via la progression des livres en cours</p>
              </div>
            </>
          ) : (
            /* ── Mode formulaire ── */
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="number"
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  min="1" max="365"
                  className="w-20 bg-[#242018] border border-white/8 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#c9440e]/50 transition text-center"
                />
                <span className="text-[#7a7268] text-sm">livres cette année</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="number"
                  value={pagesInput}
                  onChange={e => setPagesInput(e.target.value)}
                  min="1" max="2000"
                  className="w-24 bg-[#242018] border border-white/8 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#c9440e]/50 transition text-center"
                />
                <span className="text-[#7a7268] text-sm">pages par semaine</span>
              </div>
              <button
                onClick={saveGoals}
                disabled={saving}
                className="self-start text-[12px] font-medium text-white bg-[#c9440e] px-5 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? '…' : 'Valider'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Défi du mois ── */}
      <section className="mb-10">
        <SectionTitle>Défi du mois</SectionTitle>
        <div className="px-6">
          <div className={`border-l-2 pl-5 py-0.5 ${challengeDone ? 'border-emerald-400/35' : 'border-[#c9440e]/40'}`}>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#7a7268] mb-2 capitalize">
              {MONTHS_FR[cm]}
            </p>
            <h3 className={`font-serif text-[24px] leading-tight mb-2 ${challengeDone ? 'text-white/40' : 'text-white'}`}>
              {challenge.title}
            </h3>
            <p className={`text-[14px] leading-relaxed mb-3 ${challengeDone ? 'text-[#7a7268]/40 italic' : 'text-[#7a7268]'}`}>
              {challenge.desc}
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              {challenge.category && (
                <span className="text-[10px] border border-white/10 rounded px-2 py-0.5 text-[#7a7268]/50 uppercase tracking-wide">
                  {challenge.category}
                </span>
              )}
              {challengeDone ? (
                <span className="text-emerald-400/65 text-[12px] italic">Relevé ce mois ✓</span>
              ) : (
                <span className="text-[#7a7268]/35 text-[11px] italic">À relever avant fin {MONTHS_FR[cm]}</span>
              )}
            </div>
          </div>
        </div>
      </section>


      {/* ── Bilan mensuel ── */}
      <section className="mb-10">
        <SectionTitle>Ce mois-ci</SectionTitle>
        <div className="px-6">
          <p className="font-serif italic text-[16px] text-white/60 leading-relaxed">{bilanPhrase}</p>
          {thisMonth.length > 0 && (
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-[#7a7268] text-[12px]">
                <span className="text-white/70 font-medium">{thisMonth.length}</span> ce mois
              </span>
              <span className="text-white/15">·</span>
              <span className="text-[#7a7268] text-[12px]">
                <span className="text-white/70 font-medium">{prevMonth.length}</span> mois dernier
              </span>
              <span className="text-white/15">·</span>
              <span className="text-[#7a7268] text-[12px]">
                <span className="text-white/70 font-medium">{yearCount}</span> cette année
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Vue d'ensemble ── */}
      {luBooks.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Vue d'ensemble</SectionTitle>
          <div className="px-6 flex flex-col gap-6">

            {/* Chiffres clés */}
            <div className="flex items-center gap-5 flex-wrap">
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
              {topAuthors[0] && (
                <>
                  <div className="w-px h-8 bg-white/8" />
                  <div>
                    <p className="font-serif text-[28px] text-white leading-none">{topAuthors[0][1]}</p>
                    <p className="text-[#7a7268] text-[11px] mt-0.5">par {topAuthors[0][0].split(' ').pop()}</p>
                  </div>
                </>
              )}
            </div>

            {/* Genres */}
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
                      <div className="h-px bg-white/6 relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-[#c9440e]/40"
                          style={{ width: `${Math.round((count / maxGenreCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Auteurs */}
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

      {/* ── Journal de lecture ── */}
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
                      <a key={r.id} href={`/fiche/${r.id}`} className="flex items-baseline gap-3 group">
                        <span className="text-[#7a7268]/50 text-[11px] shrink-0 w-12 text-right">{dayLabel}</span>
                        <div className="flex-1 min-w-0 border-l border-white/6 pl-3">
                          <p className="font-serif text-[14px] text-white/80 leading-snug group-hover:text-white transition line-clamp-1">
                            {r.books?.title}
                          </p>
                          <p className="text-[#7a7268] text-[11px] mt-0.5 truncate">
                            {r.books?.author}
                            {r.rating > 0 && (
                              <span className="ml-2 text-[#c9440e]/50">{'★'.repeat(Math.round(r.rating))}</span>
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
