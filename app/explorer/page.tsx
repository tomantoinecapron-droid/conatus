'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

export default function ExplorerPage() {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setCurrentUser(data.user)
      loadUsers('', data.user.id)
    })
  }, [])

  const loadUsers = async (query: string, userId?: string) => {
    setLoading(true)
    const uid = userId ?? currentUser?.id

    let q = supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .limit(30)

    if (query.trim()) {
      q = q.or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    }

    const { data: profiles } = await q

    if (!profiles || profiles.length === 0) {
      setUsers([])
      setLoading(false)
      return
    }

    const selfFiltered = uid ? profiles.filter((p: any) => p.id !== uid) : profiles
    const ids = selfFiltered.map((p: any) => p.id)

    const [readingsRes, followsRes] = await Promise.all([
      supabase.from('readings').select('user_id').in('user_id', ids),
      uid
        ? supabase.from('follows').select('following_id').eq('follower_id', uid).in('following_id', ids)
        : Promise.resolve({ data: [] }),
    ])

    // Count books per user
    const bookCount: Record<string, number> = {}
    for (const r of (readingsRes.data || [])) {
      bookCount[r.user_id] = (bookCount[r.user_id] || 0) + 1
    }

    const following = new Set((followsRes.data || []).map((f: any) => f.following_id))
    setFollowingIds(following)

    setUsers(selfFiltered.map((p: any) => ({ ...p, booksCount: bookCount[p.id] || 0 })))
    setLoading(false)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    loadUsers(value)
  }

  const handleFollow = async (profileId: string) => {
    if (!currentUser || followLoading.has(profileId)) return
    setFollowLoading(prev => new Set(prev).add(profileId))

    if (followingIds.has(profileId)) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUser.id).eq('following_id', profileId)
      setFollowingIds(prev => { const s = new Set(prev); s.delete(profileId); return s })
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profileId })
      setFollowingIds(prev => new Set(prev).add(profileId))
    }

    setFollowLoading(prev => { const s = new Set(prev); s.delete(profileId); return s })
  }

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24">
      <div className="px-5 pt-12 pb-4">
        <h1 className="font-serif text-3xl text-white">Explorer</h1>
        <p className="text-[#7a7268] text-sm mt-1">Découvre d'autres lecteurs</p>
      </div>

      {/* Barre de recherche */}
      <div className="px-5 mb-6">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7268]"
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Chercher par nom ou @username..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-[#242018] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e] transition"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="px-5">
        {loading ? (
          <div className="text-center py-10 text-[#7a7268] text-sm">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-[#7a7268]">
            <p className="font-serif text-lg">Aucun utilisateur trouvé</p>
            <p className="text-sm mt-2">Essaie un autre nom</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((profile) => {
              const isFollowing = followingIds.has(profile.id)
              const isLoadingThis = followLoading.has(profile.id)
              return (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 bg-[#242018] border border-white/10 rounded-xl p-3"
                >
                  {/* Avatar cliquable */}
                  <a href={`/profil/${profile.username}`} className="shrink-0">
                    <div className="w-11 h-11 rounded-full bg-[#c9440e]/15 flex items-center justify-center overflow-hidden">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.username} />
                      ) : (
                        <span className="font-serif text-[#c9440e] text-lg leading-none">
                          {profile.username?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </a>

                  {/* Infos */}
                  <a href={`/profil/${profile.username}`} className="flex-1 min-w-0">
                    {profile.full_name && (
                      <p className="font-semibold text-white text-sm leading-tight truncate">{profile.full_name}</p>
                    )}
                    <p className="text-[#7a7268] text-xs truncate">@{profile.username}</p>
                    <p className="text-[#7a7268] text-[11px] mt-0.5">
                      {profile.booksCount} livre{profile.booksCount !== 1 ? 's' : ''}
                    </p>
                  </a>

                  {/* Bouton follow */}
                  <button
                    onClick={() => handleFollow(profile.id)}
                    disabled={isLoadingThis}
                    className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${
                      isFollowing
                        ? 'border-white/30 text-white bg-white/8'
                        : 'border-white/15 text-[#7a7268] hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {isFollowing ? 'Abonné' : "S'abonner"}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
