'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

const STATUS_BADGE: Record<string, { label: string; dot: string; text: string }> = {
  lu:       { label: 'Lu',       dot: 'bg-emerald-500',  text: 'text-emerald-500' },
  en_cours: { label: 'En cours', dot: 'bg-[#c9440e]',    text: 'text-[#c9440e]' },
  a_lire:   { label: 'À lire',   dot: 'bg-[#7a7268]',    text: 'text-[#7a7268]' },
}

export default function ProfilPage() {
  const params = useParams()
  const username = params?.username as string

  const [profile, setProfile] = useState<any>(null)
  const [readings, setReadings] = useState<any[]>([])
  const [notesCount, setNotesCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setCurrentUser(data.user)
    })
    if (username) loadProfile()
  }, [username])

  // Charge l'état du follow une fois qu'on a le profil ET currentUser
  useEffect(() => {
    if (!profile || !currentUser) return
    const isOwn = currentUser.user_metadata?.username === username
    if (isOwn) return

    Promise.all([
      supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id),
      supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', profile.id),
    ]).then(([followRes, countRes]) => {
      setIsFollowing((followRes.count ?? 0) > 0)
      setFollowersCount(countRes.count ?? 0)
    })
  }, [profile, currentUser])

  const loadProfile = async () => {
    const { data: profileData } = await supabase
      .from('profiles').select('*').eq('username', username).single()

    if (!profileData) { setLoading(false); return }
    setProfile(profileData)

    const [readingsRes, notesRes, followersRes] = await Promise.all([
      supabase.from('readings').select('*, books(*)')
        .eq('user_id', profileData.id).order('created_at', { ascending: false }),
      supabase.from('notes').select('id', { count: 'exact' }).eq('user_id', profileData.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileData.id),
    ])

    setReadings(readingsRes.data || [])
    setNotesCount(notesRes.count || 0)
    setFollowersCount(followersRes.count || 0)
    setLoading(false)
  }

  const handleFollow = async () => {
    if (!currentUser || !profile || followLoading) return
    setFollowLoading(true)

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id)
      setIsFollowing(false)
      setFollowersCount(c => Math.max(0, c - 1))
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: currentUser.id, following_id: profile.id })
      setIsFollowing(true)
      setFollowersCount(c => c + 1)
    }

    setFollowLoading(false)
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
      <div className="min-h-screen bg-[#1a1714] flex flex-col items-center justify-center pb-24">
        <p className="font-serif text-xl text-white">Utilisateur introuvable</p>
        <a href="/explorer" className="text-[#c9440e] text-sm mt-3">← Explorateur</a>
        <BottomNav />
      </div>
    )
  }

  const isOwnProfile = currentUser?.user_metadata?.username === username

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-20">

      {/* ── Header ── */}
      <div className="px-4 pt-14 pb-3">

        {/* Ligne 1 : avatar + stats */}
        <div className="flex items-center gap-5 mb-3">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#c9440e]/15 flex items-center justify-center shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" alt={username} />
            ) : (
              <span className="font-serif text-[#c9440e] text-2xl leading-none">
                {username?.[0]?.toUpperCase()}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-1 justify-around">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-white font-bold text-lg leading-tight">{readings.length}</span>
              <span className="text-[#7a7268] text-[11px]">Livres</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-white font-bold text-lg leading-tight">{notesCount}</span>
              <span className="text-[#7a7268] text-[11px]">Fiches</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-white font-bold text-lg leading-tight">{followersCount}</span>
              <span className="text-[#7a7268] text-[11px]">Abonnés</span>
            </div>
          </div>
        </div>

        {/* Ligne 2 : identité */}
        <div className="mb-3">
          {profile.full_name && (
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold text-sm leading-tight">{profile.full_name}</p>
              {profile.is_pro && (
                <span className="text-[10px] font-medium text-white/60 border border-white/20 rounded px-1.5 py-0.5 leading-none">
                  ✦ Pro
                </span>
              )}
            </div>
          )}
          <p className="text-[#7a7268] text-xs mt-0.5">@{username}</p>
          {profile.bio && (
            <p className="text-white/70 text-xs mt-1.5 leading-relaxed">{profile.bio}</p>
          )}
        </div>

        {/* Bouton modifier / abonner */}
        {isOwnProfile ? (
          <a
            href="/profil/edit"
            className="block w-full text-center border border-white/20 text-white text-sm font-medium py-1.5 rounded-lg hover:border-white/40 transition"
          >
            Modifier le profil
          </a>
        ) : (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`w-full text-center border text-sm font-medium py-1.5 rounded-lg transition disabled:opacity-50 ${
              isFollowing
                ? 'border-white/40 text-white bg-white/8 hover:bg-white/5'
                : 'border-white/20 text-[#7a7268] hover:border-white/40 hover:text-white'
            }`}
          >
            {isFollowing ? 'Abonné' : "S'abonner"}
          </button>
        )}
      </div>

      {/* ── Liste des lectures ── */}
      <div className="border-t border-white/8">
        {readings.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2">
            <p className="font-serif text-base text-white/40">Aucun livre pour l'instant</p>
            {isOwnProfile && (
              <a href="/bibliotheque" className="text-[#c9440e] text-sm">Ajouter des livres →</a>
            )}
          </div>
        ) : (
          readings.map((reading, i) => {
            const s = STATUS_BADGE[reading.status] ?? STATUS_BADGE['a_lire']
            return (
              <a
                key={reading.id}
                href={isOwnProfile ? `/fiche/${reading.id}` : '#'}
                className={`flex items-center gap-3 px-4 py-3 ${i < readings.length - 1 ? 'border-b border-white/5' : ''} ${isOwnProfile ? 'hover:bg-white/3 transition' : 'pointer-events-none'}`}
              >
                {/* Badge statut */}
                <span className={`shrink-0 flex items-center gap-1 text-[10px] font-medium ${s.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>

                {/* Titre + auteur */}
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm text-white leading-tight truncate">
                    {reading.books?.title}
                  </p>
                  <p className="text-[#7a7268] text-[11px] mt-0.5 truncate">
                    {reading.books?.author}
                  </p>
                </div>

                {isOwnProfile && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a7268" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </a>
            )
          })
        )}
      </div>

      {isOwnProfile && (
        <div className="flex justify-center py-8">
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/'
            }}
            className="text-red-500/70 text-sm hover:text-red-500 transition"
          >
            Se déconnecter
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
