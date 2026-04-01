'use client'

import { useState } from 'react'
import BottomNav from '../components/BottomNav'

const FREE_FEATURES = [
  'Bibliothèque jusqu\'à 50 livres',
  'Notes de lecture basiques',
  'Cercles de lecture (max 2)',
  'Profil public',
]

const PRO_FEATURES = [
  'Bibliothèque illimitée',
  'Notes enrichies & fiches détaillées',
  'Cercles illimités',
  'Statistiques de lecture avancées',
  'Badge Pro sur ton profil',
  'Accès prioritaire aux nouvelles fonctionnalités',
]

export default function PremiumPage() {
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    setLoading(plan)
    setError(null)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json()
      console.log('[checkout] status:', res.status, 'body:', data)

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/auth'
          return
        }
        throw new Error(data.error || `Erreur ${res.status}`)
      }

      if (!data.url) {
        throw new Error('URL Stripe manquante dans la réponse')
      }

      window.location.href = data.url
    } catch (err) {
      console.error('[checkout] erreur:', err)
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-20">

      {/* Header */}
      <div className="px-4 pt-14 pb-4 flex items-center gap-3 border-b border-white/8">
        <a href="/profil/edit" className="text-[#7a7268] hover:text-white transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </a>
        <h1 className="text-white font-semibold text-base">Passer Pro</h1>
      </div>

      <div className="px-4 pt-8 pb-6 max-w-lg mx-auto">

        {/* Titre */}
        <div className="text-center mb-8">
          <span className="text-[#c9440e] text-xs font-medium tracking-widest uppercase">Conatus Pro</span>
          <h2 className="font-serif text-2xl text-white mt-1">Lis plus, retiens mieux</h2>
          <p className="text-[#7a7268] text-sm mt-2">Débloques tout le potentiel de ta bibliothèque.</p>
        </div>

        {/* Comparaison Gratuit / Pro */}
        <div className="grid grid-cols-2 gap-3 mb-8">

          {/* Gratuit */}
          <div className="bg-[#242018] border border-white/8 rounded-xl p-4">
            <p className="text-[#7a7268] text-[10px] uppercase tracking-widest font-medium mb-3">Gratuit</p>
            <ul className="flex flex-col gap-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full border border-white/15 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-[#7a7268]" />
                  </span>
                  <span className="text-[#7a7268] text-xs leading-snug">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="bg-[#c9440e]/8 border border-[#c9440e]/30 rounded-xl p-4 relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#c9440e] text-white text-[9px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full whitespace-nowrap">
              ✦ PRO
            </div>
            <p className="text-[#c9440e] text-[10px] uppercase tracking-widest font-medium mb-3 mt-1">Pro</p>
            <ul className="flex flex-col gap-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <svg className="mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9440e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-white text-xs leading-snug">{f}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Plans tarifaires */}
        <div className="flex flex-col gap-3">

          {/* Annuel — le plus populaire */}
          <div className="relative border border-[#c9440e]/50 rounded-xl p-4 bg-[#c9440e]/5">
            <div className="absolute -top-3 left-4 bg-[#c9440e] text-white text-[9px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full">
              Le plus populaire
            </div>
            <div className="flex items-center justify-between mt-1">
              <div>
                <p className="text-white font-semibold text-base">12,99 €<span className="text-[#7a7268] text-xs font-normal"> / an</span></p>
                <p className="text-[#7a7268] text-xs mt-0.5">soit 1,08 €/mois</p>
              </div>
              <span className="text-[10px] font-semibold text-[#c9440e] bg-[#c9440e]/15 px-2 py-0.5 rounded-full">
                −62 %
              </span>
            </div>
            <button
              onClick={() => handleCheckout('yearly')}
              disabled={loading !== null}
              className="mt-3 w-full py-2.5 rounded-full text-sm font-semibold bg-[#c9440e] text-white hover:opacity-90 transition disabled:opacity-50"
            >
              {loading === 'yearly' ? 'Redirection…' : 'S\'abonner — 12,99 €/an'}
            </button>
          </div>

          {/* Mensuel */}
          <div className="border border-white/10 rounded-xl p-4 bg-white/2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-base">3,49 €<span className="text-[#7a7268] text-xs font-normal"> / mois</span></p>
                <p className="text-[#7a7268] text-xs mt-0.5">Sans engagement</p>
              </div>
            </div>
            <button
              onClick={() => handleCheckout('monthly')}
              disabled={loading !== null}
              className="mt-3 w-full py-2.5 rounded-full text-sm font-medium border border-white/20 text-white hover:border-white/40 transition disabled:opacity-50"
            >
              {loading === 'monthly' ? 'Redirection…' : 'S\'abonner — 3,49 €/mois'}
            </button>
          </div>

        </div>

        {error && (
          <p className="text-center text-[#c9440e] text-xs font-medium mt-4">
            {error}
          </p>
        )}

        <p className="text-center text-[#7a7268]/50 text-[10px] mt-5">
          Paiement sécurisé par Stripe · Résiliation à tout moment
        </p>

      </div>

      <BottomNav />
    </div>
  )
}
