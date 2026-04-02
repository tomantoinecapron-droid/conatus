'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

const STATUS_LABEL: Record<string, string> = {
  lu: 'Lu', en_cours: 'En cours', a_lire: 'À lire',
}
const STATUS_COLOR: Record<string, string> = {
  lu: 'text-emerald-400', en_cours: 'text-[#c9440e]', a_lire: 'text-[#7a7268]',
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

  useEffect(() => {
    if (!profile || !currentUser) return
    if (currentUser.id === profile.id) return

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
      await supabase.from('follows').delete()
        .eq('follower_id', currentUser.id).eq('following_id', profile.id)
      setIsFollowing(false)
      setFollowersCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id })
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
        <a href="/explorer" className="text-[#c9440e] text-sm mt-3">← Explorer</a>
        <BottomNav />
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-20">

      {/* ── En-tête éditorial ── */}
      <div className="px-5 pt-14 pb-6 border-b border-white/8">

        {/* Nom + crayon modifier */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="font-serif text-[32px] leading-tight text-white">
            {profile.full_name || `@${username}`}
          </h1>
          {isOwnProfile && (
            <a
              href="/profil/edit"
              className="mt-2 text-[#7a7268] hover:text-white/70 transition shrink-0"
              aria-label="Modifier le profil"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </a>
          )}
        </div>

        {/* @username + badge pro */}
        <p className="text-[#7a7268] text-sm mb-3">
          @{username}
          {profile.is_pro && (
            <span className="ml-2 text-white/40 text-[10px] border border-white/15 rounded px-1.5 py-0.5 leading-none">✦ Pro</span>
          )}
        </p>

        {/* Bio */}
        {profile.bio && (
          <p className="text-white/55 text-sm italic leading-relaxed mb-4 max-w-xs">{profile.bio}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-5 text-xs text-[#7a7268]">
          <span>
            <span className="text-white font-medium">{readings.length}</span>
            {' '}livre{readings.length !== 1 ? 's' : ''}
          </span>
          <span>
            <span className="text-white font-medium">{notesCount}</span>
            {' '}fiche{notesCount !== 1 ? 's' : ''}
          </span>
          <span>
            <span className="text-white font-medium">{followersCount}</span>
            {' '}abonné{followersCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Bouton s'abonner (autres profils) */}
        {!isOwnProfile && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`mt-4 text-xs font-medium px-4 py-1.5 rounded-lg border transition disabled:opacity-50 ${
              isFollowing
                ? 'border-white/30 text-white bg-white/8 hover:bg-white/5'
                : 'border-white/15 text-[#7a7268] hover:border-white/30 hover:text-white'
            }`}
          >
            {isFollowing ? 'Abonné' : "S'abonner"}
          </button>
        )}
      </div>

      {/* ── Encart Pro (non-Pro, profil perso) ── */}
      {isOwnProfile && !profile.is_pro && (
        <div className="mx-5 mt-5 border border-[#c9440e]/20 rounded-xl px-4 py-3 bg-[#c9440e]/5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">Conatus Pro <span className="text-[#c9440e]">✦</span></p>
            <p className="text-[#7a7268] text-xs mt-0.5 leading-snug">Bibliothèque illimitée, cercles sans limite, statistiques avancées.</p>
          </div>
          <a
            href="/premium"
            className="shrink-0 text-xs font-medium text-[#c9440e] border border-[#c9440e]/40 rounded-lg px-3 py-1.5 hover:opacity-80 transition"
          >
            Voir →
          </a>
        </div>
      )}

      {/* ── Liste des lectures ── */}
      {readings.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-2 text-[#7a7268]">
          <p className="font-serif text-base">Aucun livre pour l'instant</p>
          {isOwnProfile && (
            <a href="/bibliotheque" className="text-[#c9440e] text-sm">Ajouter des livres →</a>
          )}
        </div>
      ) : (
        <div className="px-5 divide-y divide-white/5">
          {readings.map((reading) => (
            <a
              key={reading.id}
              href={isOwnProfile ? `/fiche/${reading.id}` : '#'}
              className={`flex items-center gap-3 py-3.5 ${isOwnProfile ? 'hover:opacity-80 transition' : 'pointer-events-none'}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-serif text-[15px] text-white leading-snug line-clamp-1">
                  {reading.books?.title}
                </p>
                <p className="text-[#7a7268] text-xs mt-0.5 truncate">
                  {reading.books?.author}
                </p>
              </div>
              <span className={`text-xs font-medium shrink-0 ${STATUS_COLOR[reading.status] ?? 'text-[#7a7268]'}`}>
                {STATUS_LABEL[reading.status] ?? ''}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* ── Déconnexion ── */}
      {isOwnProfile && (
        <div className="flex justify-center pt-8 pb-4">
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
            className="text-[#7a7268] text-xs hover:text-white/60 transition"
          >
            Déconnexion
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
