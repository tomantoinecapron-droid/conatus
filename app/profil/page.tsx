'use client'

import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ProfilRedirect() {
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }

      // Priorité 1 : user_metadata (mis à jour via profil/edit)
      const metaUsername = data.user.user_metadata?.username
      if (metaUsername) {
        window.location.href = `/profil/${metaUsername}`
        return
      }

      // Priorité 2 : table profiles (source de vérité)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', data.user.id)
        .single()

      if (profile?.username) {
        window.location.href = `/profil/${profile.username}`
        return
      }

      // Aucun username trouvé → page d'édition pour en choisir un
      window.location.href = '/profil/edit'
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F4EE' }}>
      <div className="text-sm" style={{ color: '#9A9690' }}>Chargement...</div>
    </div>
  )
}
