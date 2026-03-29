'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

export default function ProfilPage() {
  const params = useParams()
  const username = params?.username as string
  const [profile, setProfile] = useState<any>(null)
  const [books, setBooks] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/auth'
      else setCurrentUser(data.user)
    })
    if (username) loadProfile()
  }, [username])

  const loadProfile = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (!profileData) {
      setLoading(false)
      return
    }
    setProfile(profileData)

    const { data: readingsData } = await supabase
      .from('readings')
      .select('*, books(*)')
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false })

    setBooks(readingsData || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex items-center justify-center">
        <div className="text-[#7a7268] text-sm">Chargement...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex flex-col items-center justify-center pb-24 px-5">
        <p className="font-serif text-xl text-white text-center">Utilisateur introuvable</p>
        <a href="/explorer" className="text-[#c9440e] text-sm mt-4">← Retour à l'explorateur</a>
        <BottomNav />
      </div>
    )
  }

  const stats = {
    lu: books.filter(r => r.status === 'lu').length,
    en_cours: books.filter(r => r.status === 'en_cours').length,
    a_lire: books.filter(r => r.status === 'a_lire').length,
  }

  const isOwnProfile = currentUser?.user_metadata?.username === username

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 border-b border-white/10">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#c9440e]/15 flex items-center justify-center shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" alt={username} />
            ) : (
              <span className="font-serif text-[#c9440e] text-2xl leading-none">
                {username?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-serif text-2xl text-white leading-tight">@{username}</h1>
              {isOwnProfile && (
                <a
                  href="/profil/edit"
                  className="shrink-0 border border-white/15 text-[#7a7268] hover:text-white hover:border-white/30 transition px-3 py-1 rounded-full text-xs font-medium"
                >
                  Modifier
                </a>
              )}
            </div>
            {profile.bio ? (
              <p className="text-[#7a7268] text-sm mt-1.5 leading-relaxed">{profile.bio}</p>
            ) : isOwnProfile ? (
              <a href="/profil/edit" className="text-[#7a7268]/40 text-sm mt-1.5 italic block hover:text-[#7a7268] transition">
                Ajoute une bio...
              </a>
            ) : null}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex-1 text-center">
            <p className="font-serif text-2xl text-white">{stats.lu}</p>
            <p className="text-[#7a7268] text-xs mt-0.5">Lu</p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex-1 text-center">
            <p className="font-serif text-2xl text-[#c9440e]">{stats.en_cours}</p>
            <p className="text-[#7a7268] text-xs mt-0.5">En cours</p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex-1 text-center">
            <p className="font-serif text-2xl text-white">{stats.a_lire}</p>
            <p className="text-[#7a7268] text-xs mt-0.5">À lire</p>
          </div>
        </div>
      </div>

      {/* Recent books */}
      <div className="px-5 pt-6">
        <h2 className="font-serif text-lg text-white mb-4">
          {isOwnProfile ? 'Mes lectures' : 'Dernières lectures'}
        </h2>
        {books.length === 0 ? (
          <p className="text-[#7a7268] text-sm text-center py-8">Aucun livre pour l'instant</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {books.map((reading) => (
              <a
                key={reading.id}
                href={isOwnProfile ? `/fiche/${reading.id}` : '#'}
                className={`block group ${!isOwnProfile ? 'pointer-events-none' : ''}`}
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#242018] mb-1.5">
                  {reading.books?.cover_url ? (
                    <img
                      src={reading.books.cover_url}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={reading.books.title}
                    />
                  ) : (
                    <div className="w-full h-full flex items-end p-2 bg-gradient-to-b from-[#2e2a24] to-[#1a1714]">
                      <p className="font-serif text-xs text-white/60 leading-tight line-clamp-3">
                        {reading.books?.title}
                      </p>
                    </div>
                  )}
                  {reading.rating > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} className={`text-[8px] ${s <= reading.rating ? 'text-[#c9440e]' : 'text-white/20'}`}>★</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="font-serif text-[10px] text-white leading-tight line-clamp-2">
                  {reading.books?.title}
                </p>
                <p className="text-[#7a7268] text-[10px] mt-0.5 truncate">{reading.books?.author}</p>
              </a>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
