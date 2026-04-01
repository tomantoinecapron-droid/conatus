'use client'

import BottomNav from '../components/BottomNav'

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#1a1714] text-white flex flex-col pb-20">

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">

        <div className="w-16 h-16 rounded-full bg-[#c9440e]/15 flex items-center justify-center mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c9440e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="font-serif text-2xl text-white mb-2">Bienvenue dans Pro ✦</h1>
        <p className="text-[#7a7268] text-sm leading-relaxed max-w-xs">
          Ton abonnement est actif. Tu as désormais accès à toutes les fonctionnalités Pro de Conatus.
        </p>

        <a
          href="/home"
          className="mt-8 px-7 py-2.5 rounded-full text-sm font-medium bg-[#c9440e] text-white hover:opacity-90 transition"
        >
          Commencer
        </a>

      </div>

      <BottomNav />
    </div>
  )
}
