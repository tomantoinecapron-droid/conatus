'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
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
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [renewalDate, setRenewalDate] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setUserEmail(data.user.email ?? null)
      const { data: profile } = await supabase
        .from('profiles').select('is_pro').eq('id', data.user.id).single()
      setIsPro(profile?.is_pro ?? false)
      setProfileLoading(false)

      if (profile?.is_pro && data.user.email) {
        fetch('/api/create-portal-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: data.user.email }),
        })
          .then(r => r.json())
          .then(d => { if (d.renewalDate) setRenewalDate(d.renewalDate) })
          .catch(() => {})
      }
    })
  }, [])

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    setLoading(plan)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth'; return }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, userId: user.id, userEmail: user.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)
      if (!data.url) throw new Error('URL Stripe manquante dans la réponse')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setLoading(null)
    }
  }

  const handlePortal = async () => {
    if (!userEmail) return
    setPortalLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)
      if (!data.url) throw new Error('URL du portail manquante')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setPortalLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: '#F7F4EE', color: '#1A1A2E' }}>

      {/* Header */}
      <div className="px-4 pt-14 pb-4 flex items-center gap-3" style={{ borderBottom: '1px solid #D5D0C8' }}>
        <a href="/profil" className="transition" style={{ color: '#9A9690' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </a>
        <h1 className="font-semibold text-base" style={{ color: '#1A1A2E' }}>Conatus Pro ✦</h1>
      </div>

      <div className="px-4 pt-8 pb-6 max-w-lg mx-auto">

        {/* Titre */}
        <div className="text-center mb-8">
          <span className="text-xs font-medium tracking-widest uppercase" style={{ color: '#9A9690' }}>Conatus Pro</span>
          <h2 className="font-serif text-2xl mt-1" style={{ color: '#1A1A2E' }}>Lis plus, retiens mieux</h2>
          <p className="text-sm mt-2" style={{ color: '#9A9690' }}>Débloques tout le potentiel de ta bibliothèque.</p>
        </div>

        {/* Comparaison Gratuit / Pro */}
        <div className="grid grid-cols-2 gap-3 mb-8">

          {/* Gratuit */}
          <div className="rounded-xl p-4" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8' }}>
            <p className="text-[10px] uppercase tracking-widest font-medium mb-3" style={{ color: '#9A9690' }}>Gratuit</p>
            <ul className="flex flex-col gap-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full flex items-center justify-center" style={{ border: '1px solid #D5D0C8' }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: '#9A9690' }} />
                  </span>
                  <span className="text-xs leading-snug" style={{ color: '#9A9690' }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="rounded-xl p-4 relative" style={{ background: '#EDEAE3', border: '1px solid #1A1A2E' }}>
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: '#1A1A2E', color: '#F7F4EE' }}>
              ✦ PRO
            </div>
            <p className="text-[10px] uppercase tracking-widest font-medium mb-3 mt-1" style={{ color: '#1A1A2E' }}>Pro</p>
            <ul className="flex flex-col gap-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <svg className="mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-xs leading-snug" style={{ color: '#1A1A2E' }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {profileLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-sm" style={{ color: '#9A9690' }}>Chargement...</div>
          </div>
        ) : isPro ? (
          <div className="rounded-xl p-6" style={{ border: '1px solid #D5D0C8', background: '#EDEAE3' }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-[10px] font-medium rounded px-2 py-0.5" style={{ color: '#1A1A2E', border: '1px solid #D5D0C8' }}>✦ Pro</span>
            </div>
            <p className="font-semibold text-center" style={{ color: '#1A1A2E' }}>Tu es abonné Pro</p>
            {renewalDate ? (
              <p className="text-xs text-center mt-1.5" style={{ color: '#9A9690' }}>
                Prochain renouvellement : <span style={{ color: '#1A1A2E' }}>{renewalDate}</span>
              </p>
            ) : (
              <p className="text-xs text-center mt-1.5" style={{ color: '#9A9690' }}>
                Toutes les fonctionnalités Pro sont débloquées.
              </p>
            )}
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="mt-4 w-full py-2.5 rounded text-sm font-medium transition disabled:opacity-50"
              style={{ border: '1px solid #D5D0C8', color: '#9A9690', borderRadius: '6px' }}
            >
              {portalLoading ? 'Redirection…' : 'Gérer mon abonnement →'}
            </button>
            {error && (
              <p className="text-center text-red-500 text-xs font-medium mt-3">{error}</p>
            )}
          </div>
        ) : (
          <>
            {/* Plans tarifaires */}
            <div className="flex flex-col gap-3">

              {/* Annuel */}
              <div className="relative rounded-xl p-4" style={{ border: '1px solid #1A1A2E', background: '#EDEAE3' }}>
                <div className="absolute -top-3 left-4 text-[9px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full" style={{ background: '#1A1A2E', color: '#F7F4EE' }}>
                  Le plus populaire
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div>
                    <p className="font-semibold text-base" style={{ color: '#1A1A2E' }}>12,99 €<span className="text-xs font-normal" style={{ color: '#9A9690' }}> / an</span></p>
                    <p className="text-xs mt-0.5" style={{ color: '#9A9690' }}>soit 1,08 €/mois</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: '#E3E0D8', color: '#1A1A2E' }}>
                    −62 %
                  </span>
                </div>
                <button
                  onClick={() => handleCheckout('yearly')}
                  disabled={loading !== null}
                  className="mt-3 w-full py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                  style={{ background: '#1A1A2E', color: '#F7F4EE', borderRadius: '6px' }}
                >
                  {loading === 'yearly' ? 'Redirection…' : 'S\'abonner — 12,99 €/an'}
                </button>
              </div>

              {/* Mensuel */}
              <div className="rounded-xl p-4" style={{ border: '1px solid #D5D0C8', background: '#EDEAE3' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-base" style={{ color: '#1A1A2E' }}>3,49 €<span className="text-xs font-normal" style={{ color: '#9A9690' }}> / mois</span></p>
                    <p className="text-xs mt-0.5" style={{ color: '#9A9690' }}>Sans engagement</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCheckout('monthly')}
                  disabled={loading !== null}
                  className="mt-3 w-full py-2.5 text-sm font-medium transition disabled:opacity-50"
                  style={{ border: '1px solid #D5D0C8', color: '#1A1A2E', borderRadius: '6px' }}
                >
                  {loading === 'monthly' ? 'Redirection…' : 'S\'abonner — 3,49 €/mois'}
                </button>
              </div>

            </div>

            {error && (
              <p className="text-center text-red-500 text-xs font-medium mt-4">{error}</p>
            )}

            <p className="text-center text-[10px] mt-5" style={{ color: '#9A9690' }}>
              Paiement sécurisé par Stripe · Résiliation à tout moment
            </p>
          </>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
