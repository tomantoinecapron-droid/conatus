'use client'

import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ProfilRedirect() {
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = '/auth'
        return
      }
      const username = data.user.user_metadata?.username
      if (username) {
        window.location.href = `/profil/${username}`
      } else {
        window.location.href = '/bibliotheque'
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#1a1714] flex items-center justify-center">
      <div className="text-[#7a7268] text-sm">Chargement...</div>
    </div>
  )
}
