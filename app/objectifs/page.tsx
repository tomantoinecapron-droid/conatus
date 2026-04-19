'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

const DAYS = [
  { key: 'lun', label: 'Lundi' },
  { key: 'mar', label: 'Mardi' },
  { key: 'mer', label: 'Mercredi' },
  { key: 'jeu', label: 'Jeudi' },
  { key: 'ven', label: 'Vendredi' },
  { key: 'sam', label: 'Samedi' },
  { key: 'dim', label: 'Dimanche' },
]

const DURATIONS = [15, 20, 30, 45, 60]

type DayGoal = { active: boolean; minutes: number }
type WeekGoals = Record<string, DayGoal>

const DEFAULT_GOALS: WeekGoals = Object.fromEntries(
  DAYS.map(d => [d.key, { active: d.key !== 'dim', minutes: 30 }])
)

// Quel jour sommes-nous ? (0=dim, 1=lun…)
function getTodayIndex(): number {
  return new Date().getDay()
}

// Retourne les jours de la semaine courante (lun→dim) sous forme de dates
function getWeekDates(): Date[] {
  const today = new Date()
  const dow = today.getDay() // 0=dim
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isFuture(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d > today
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export default function ObjectifsPage() {
  const [goals, setGoals] = useState<WeekGoals>(DEFAULT_GOALS)
  // Simule 3 jours validés pour le visuel
  const [checked] = useState<Record<string, boolean>>({
    lun: true,
    mar: true,
    mer: false,
    jeu: false,
    ven: false,
    sam: false,
    dim: false,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/auth'
    })
  }, [])

  const toggleDay = (key: string) => {
    setGoals(prev => ({
      ...prev,
      [key]: { ...prev[key], active: !prev[key].active },
    }))
  }

  const setMinutes = (key: string, minutes: number) => {
    setGoals(prev => ({
      ...prev,
      [key]: { ...prev[key], minutes },
    }))
  }

  const handleSave = () => {
    // UI only — Supabase integration à venir
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const totalMinutes = Object.values(goals)
    .filter(g => g.active)
    .reduce((acc, g) => acc + g.minutes, 0)

  const activeDays = Object.values(goals).filter(g => g.active).length
  const checkedCount = Object.values(checked).filter(Boolean).length
  const weekDates = getWeekDates()

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-28">

      {/* Header */}
      <div className="px-5 pt-12 pb-5 border-b border-white/10">
        <h1 className="font-serif text-3xl text-white">Mes objectifs</h1>
        <p className="text-[#7a7268] text-sm mt-1">Planifie ta routine de lecture</p>
      </div>

      {/* Bannière en cours de développement */}
      <div className="mx-5 mt-5 bg-[#c9440e]/10 border border-[#c9440e]/25 rounded-xl px-4 py-3 flex items-start gap-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9440e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-[#c9440e] text-sm leading-relaxed">
          Cette section est en cours de développement. Le visuel est finalisé, la sauvegarde arrive bientôt.
        </p>
      </div>

      {/* Résumé hebdo */}
      <div className="px-5 pt-6">
        <div className="bg-[#242018] border border-white/10 rounded-2xl p-5 flex justify-between items-center">
          <div>
            <p className="text-[#7a7268] text-xs mb-1">Cette semaine</p>
            <p className="font-serif text-2xl text-white">{activeDays} <span className="text-base font-sans text-[#7a7268]">jours</span></p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <p className="text-[#7a7268] text-xs mb-1">Par semaine</p>
            <p className="font-serif text-2xl text-white">{totalMinutes} <span className="text-base font-sans text-[#7a7268]">min</span></p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <p className="text-[#7a7268] text-xs mb-1">Validés</p>
            <p className="font-serif text-2xl text-[#c9440e]">{checkedCount}<span className="text-base font-sans text-[#7a7268]">/{activeDays}</span></p>
          </div>
        </div>
      </div>

      {/* Objectif hebdomadaire */}
      <section className="px-5 pt-7">
        <h2 className="text-[10px] text-[#7a7268] uppercase tracking-[0.15em] font-medium mb-4">
          Objectif hebdomadaire
        </h2>
        <div className="flex flex-col gap-2">
          {DAYS.map(({ key, label }) => {
            const goal = goals[key]
            return (
              <div
                key={key}
                className={`bg-[#242018] border rounded-xl px-4 py-3 transition ${goal.active ? 'border-white/10' : 'border-white/5 opacity-50'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Toggle + label */}
                  <button
                    onClick={() => toggleDay(key)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition shrink-0 ${goal.active ? 'border-[#c9440e] bg-[#c9440e]' : 'border-white/20'}`}>
                      {goal.active && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-medium transition ${goal.active ? 'text-white' : 'text-[#7a7268]'}`}>
                      {label}
                    </span>
                  </button>

                  {/* Duration selector */}
                  {goal.active && (
                    <div className="flex gap-1.5 shrink-0">
                      {DURATIONS.map(min => (
                        <button
                          key={min}
                          onClick={() => setMinutes(key, min)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition ${goal.minutes === min ? 'bg-[#c9440e] text-white' : 'bg-white/5 text-[#7a7268] hover:text-white'}`}
                        >
                          {min}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[#7a7268]/40 text-[10px] mt-2 text-right">durée en minutes</p>
      </section>

      {/* Cette semaine */}
      <section className="px-5 pt-8">
        <h2 className="text-[10px] text-[#7a7268] uppercase tracking-[0.15em] font-medium mb-4">
          Cette semaine
        </h2>
        <div className="bg-[#242018] border border-white/10 rounded-2xl p-4">
          <div className="flex justify-between">
            {DAYS.map(({ key }, i) => {
              const date = weekDates[i]
              const future = isFuture(date)
              const today = isToday(date)
              const active = goals[key].active
              const done = checked[key]

              return (
                <div key={key} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[9px] uppercase font-medium ${today ? 'text-[#c9440e]' : 'text-[#7a7268]'}`}>
                    {DAYS[i].key}
                  </span>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                    !active
                      ? 'bg-white/4 border border-white/5'
                      : done
                      ? 'bg-[#c9440e] border-2 border-[#c9440e]'
                      : future
                      ? 'bg-white/5 border border-white/10'
                      : today
                      ? 'bg-white/5 border-2 border-[#c9440e]/60'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    {!active ? (
                      <span className="text-white/15 text-xs">—</span>
                    ) : done ? (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l4 4 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : future ? (
                      <span className="text-white/20 text-xs font-mono">{date.getDate()}</span>
                    ) : (
                      <span className="text-[#7a7268] text-xs font-mono">{date.getDate()}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Légende */}
          <div className="flex gap-4 justify-center mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#c9440e]" />
              <span className="text-[#7a7268] text-[10px]">Objectif atteint</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-[#c9440e]/60" />
              <span className="text-[#7a7268] text-[10px]">Aujourd'hui</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="text-[#7a7268] text-[10px]">À venir</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bouton sauvegarder */}
      <div className="px-5 pt-8">
        <button
          onClick={handleSave}
          className={`w-full py-3.5 rounded-full text-sm font-medium transition ${saved ? 'bg-[#9A9690] text-white' : 'bg-[#c9440e] text-white hover:opacity-90'}`}
        >
          {saved ? 'Sauvegardé ✓' : 'Sauvegarder mes objectifs'}
        </button>
      </div>

      {/* Message motivant */}
      <div className="px-5 pt-10 pb-4 text-center">
        <p className="font-serif italic text-white/25 text-sm leading-relaxed">
          &ldquo;Les grandes bibliothèques se construisent page après page.&rdquo;
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
