'use client'

import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

export default function ObjectifsPage() {
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/auth'
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24">
      <div className="px-5 pt-12 pb-4">
        <h1 className="font-serif text-3xl text-white">Objectifs</h1>
        <p className="text-[#7a7268] text-sm mt-1">Bientôt disponible</p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-[#7a7268] px-5">
        <svg
          width="48" height="48" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
          className="mb-5 opacity-30"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
        <p className="font-serif text-xl text-white/60 text-center">Définis tes objectifs de lecture</p>
        <p className="text-sm mt-2 text-center max-w-xs">
          Fixe-toi un nombre de livres à lire par an, par mois, par genre. Cette fonctionnalité arrive bientôt.
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
