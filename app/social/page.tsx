'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

type Tab = 'lecteurs' | 'cercles'

export default function SocialPage() {
  const [tab, setTab] = useState<Tab>('lecteurs')
  const [currentUser, setCurrentUser] = useState<any>(null)

  // ── Lecteurs ──────────────────────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set())
  const [usersLoading, setUsersLoading] = useState(true)

  // ── Cercles ───────────────────────────────────────────────────────────────
  const [circleSearch, setCircleSearch] = useState('')
  const [myCircles, setMyCircles] = useState<any[]>([])
  const [publicCircles, setPublicCircles] = useState<any[]>([])
  const [circlesLoading, setCirclesLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setCurrentUser(data.user)
      loadUsers('', data.user.id)
      loadCircles(data.user.id)
    })
  }, [])

  // ── Chargement lecteurs ───────────────────────────────────────────────────

  const loadUsers = async (query: string, uid?: string) => {
    setUsersLoading(true)
    const userId = uid ?? currentUser?.id

    let q = supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, is_pro')
      .limit(40)

    if (query.trim()) q = q.or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)

    const { data: profiles } = await q
    if (!profiles?.length) { setUsers([]); setUsersLoading(false); return }

    const self = userId ? profiles.filter((p: any) => p.id !== userId) : profiles
    const ids = self.map((p: any) => p.id)

    const [readingsRes, followsRes] = await Promise.all([
      supabase.from('readings').select('user_id').in('user_id', ids),
      userId
        ? supabase.from('follows').select('following_id').eq('follower_id', userId).in('following_id', ids)
        : Promise.resolve({ data: [] }),
    ])

    const bookCount: Record<string, number> = {}
    for (const r of (readingsRes.data || [])) bookCount[r.user_id] = (bookCount[r.user_id] || 0) + 1

    setFollowingIds(new Set((followsRes.data || []).map((f: any) => f.following_id)))
    setUsers(self.map((p: any) => ({ ...p, booksCount: bookCount[p.id] || 0 })))
    setUsersLoading(false)
  }

  const handleFollow = async (profileId: string) => {
    if (!currentUser || followLoading.has(profileId)) return
    setFollowLoading(prev => new Set(prev).add(profileId))
    if (followingIds.has(profileId)) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profileId)
      setFollowingIds(prev => { const s = new Set(prev); s.delete(profileId); return s })
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profileId })
      setFollowingIds(prev => new Set(prev).add(profileId))
    }
    setFollowLoading(prev => { const s = new Set(prev); s.delete(profileId); return s })
  }

  // ── Chargement cercles ────────────────────────────────────────────────────

  const loadCircles = async (userId: string) => {
    setCirclesLoading(true)

    // Mes adhésions
    const { data: memberships } = await supabase
      .from('circle_members').select('circle_id').eq('user_id', userId)
    const myIds: string[] = (memberships || []).map((m: any) => m.circle_id)

    const [myRes, publicRes] = await Promise.all([
      myIds.length > 0
        ? supabase.from('circles').select('*').in('id', myIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from('circles').select('*').eq('is_private', false)
        .order('created_at', { ascending: false }).limit(30),
    ])

    // Compter les membres pour tous les cercles concernés
    const allIds = [
      ...(myRes.data || []).map((c: any) => c.id),
      ...(publicRes.data || []).filter((c: any) => !myIds.includes(c.id)).map((c: any) => c.id),
    ]
    const { data: memberRows } = allIds.length > 0
      ? await supabase.from('circle_members').select('circle_id').in('circle_id', allIds)
      : { data: [] }

    const counts: Record<string, number> = {}
    for (const m of (memberRows || [])) counts[m.circle_id] = (counts[m.circle_id] || 0) + 1

    const withCount = (arr: any[]) => arr.map(c => ({ ...c, membersCount: counts[c.id] || 0 }))

    setMyCircles(withCount(myRes.data || []))
    setPublicCircles(withCount((publicRes.data || []).filter((c: any) => !myIds.includes(c.id))))
    setCirclesLoading(false)
  }

  // ── Filtres ───────────────────────────────────────────────────────────────

  const filteredMy = circleSearch.trim()
    ? myCircles.filter(c => c.name.toLowerCase().includes(circleSearch.toLowerCase()))
    : myCircles

  const filteredPublic = circleSearch.trim()
    ? publicCircles.filter(c => c.name.toLowerCase().includes(circleSearch.toLowerCase()))
    : publicCircles

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24">

      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-white">Social</h1>
          <p className="text-[#7a7268] text-sm mt-1">Lecteurs & cercles</p>
        </div>
        {tab === 'cercles' && (
          <a
            href="/cercles/nouveau"
            className="mt-1 w-9 h-9 bg-[#c9440e] rounded-full flex items-center justify-center hover:opacity-90 transition shrink-0"
            aria-label="Créer un cercle"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="px-5 mb-5">
        <div className="flex gap-1 bg-[#242018] rounded-xl p-1">
          {(['lecteurs', 'cercles'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition capitalize ${
                tab === t ? 'bg-[#1a1714] text-white shadow-sm' : 'text-[#7a7268] hover:text-white/70'
              }`}
            >
              {t === 'lecteurs' ? 'Lecteurs' : 'Cercles'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Onglet Lecteurs ── */}
      {tab === 'lecteurs' && (
        <div className="px-5">
          <div className="relative mb-5">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7268]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Chercher par nom ou @username..."
              value={userSearch}
              onChange={e => { setUserSearch(e.target.value); loadUsers(e.target.value) }}
              className="w-full bg-[#242018] border border-white/8 rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e]/50 transition"
            />
          </div>

          {usersLoading ? (
            <div className="text-center py-10 text-[#7a7268] text-sm">Chargement...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-[#7a7268]">
              <p className="font-serif text-base">Aucun lecteur trouvé</p>
              <p className="text-sm mt-1.5">Essaie un autre nom</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {users.map(profile => {
                const isFollowing = followingIds.has(profile.id)
                return (
                  <div key={profile.id} className="flex items-center gap-3 bg-[#242018] border border-white/8 rounded-xl p-3">
                    <a href={`/profil/${profile.username}`} className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#c9440e]/15 flex items-center justify-center overflow-hidden">
                        {profile.avatar_url
                          ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.username} />
                          : <span className="font-serif text-[#c9440e] text-base leading-none">{profile.username?.[0]?.toUpperCase()}</span>
                        }
                      </div>
                    </a>
                    <a href={`/profil/${profile.username}`} className="flex-1 min-w-0">
                      {profile.full_name && (
                        <p className="font-medium text-white text-sm leading-tight truncate">{profile.full_name}</p>
                      )}
                      <p className="text-[#7a7268] text-xs truncate">
                        @{profile.username}
                        {profile.is_pro && <span className="text-white/50 text-[10px] ml-1">✦</span>}
                      </p>
                      <p className="text-[#7a7268] text-[11px] mt-0.5">
                        {profile.booksCount} livre{profile.booksCount !== 1 ? 's' : ''}
                      </p>
                    </a>
                    <button
                      onClick={() => handleFollow(profile.id)}
                      disabled={followLoading.has(profile.id)}
                      className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${
                        isFollowing
                          ? 'border-white/30 text-white bg-white/8 hover:bg-white/5'
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
      )}

      {/* ── Onglet Cercles ── */}
      {tab === 'cercles' && (
        <div className="px-5">
          <div className="relative mb-5">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7268]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Chercher un cercle..."
              value={circleSearch}
              onChange={e => setCircleSearch(e.target.value)}
              className="w-full bg-[#242018] border border-white/8 rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e]/50 transition"
            />
          </div>

          {circlesLoading ? (
            <div className="text-center py-10 text-[#7a7268] text-sm">Chargement...</div>
          ) : (
            <>
              {/* Mes cercles */}
              {filteredMy.length > 0 && (
                <div className="mb-6">
                  <p className="text-[#7a7268] text-[10px] uppercase tracking-widest font-medium mb-3">
                    Mes cercles
                  </p>
                  <div className="flex flex-col gap-2">
                    {filteredMy.map(circle => <CircleCard key={circle.id} circle={circle} />)}
                  </div>
                </div>
              )}

              {/* Cercles publics à découvrir */}
              {filteredPublic.length > 0 && (
                <div className="mb-4">
                  <p className="text-[#7a7268] text-[10px] uppercase tracking-widest font-medium mb-3">
                    À rejoindre
                  </p>
                  <div className="flex flex-col gap-2">
                    {filteredPublic.map(circle => <CircleCard key={circle.id} circle={circle} />)}
                  </div>
                </div>
              )}

              {/* État vide */}
              {filteredMy.length === 0 && filteredPublic.length === 0 && (
                <div className="flex flex-col items-center py-16 gap-4 text-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7a7268" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <div>
                    <p className="font-serif text-base text-white/40">Aucun cercle trouvé</p>
                    <p className="text-[#7a7268] text-sm mt-1">Crée le premier</p>
                  </div>
                  <a href="/cercles/nouveau" className="px-5 py-2.5 bg-[#c9440e] text-white text-sm font-medium rounded-xl hover:opacity-90 transition">
                    Créer un cercle
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function CircleCard({ circle }: { circle: any }) {
  const color = circle.cover_color || '#c9440e'
  return (
    <a
      href={`/cercles/${circle.id}`}
      className="flex items-center gap-3 bg-[#242018] border border-white/8 rounded-xl p-3.5 hover:border-white/15 transition"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-white text-sm truncate">{circle.name}</p>
          {circle.is_private && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7a7268" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
        </div>
        {circle.description && (
          <p className="text-[#7a7268] text-xs mt-0.5 truncate">{circle.description}</p>
        )}
        <p className="text-[#7a7268] text-[11px] mt-0.5">
          {circle.membersCount} membre{circle.membersCount !== 1 ? 's' : ''}
        </p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a7268" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </a>
  )
}
