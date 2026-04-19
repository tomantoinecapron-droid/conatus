'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

const STATUS_ACTION: Record<string, string> = {
  a_lire: 'a ajouté', en_cours: 'a commencé', lu: 'a terminé',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)
  if (days > 6) return `${Math.floor(days / 7)}sem`
  if (days > 0) return `${days}j`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}min`
  return `maintenant`
}

export default function CerclePage() {
  const params = useParams()
  const circleId = Number(params?.id)

  const [circle, setCircle] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [feed, setFeed] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMemberOnly, setIsMemberOnly] = useState(false)
  const [tab, setTab] = useState<'activite' | 'membres'>('activite')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const [confirmAction, setConfirmAction] = useState<'leave' | 'delete' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteResults, setInviteResults] = useState<any[]>([])
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!circleId) return
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setCurrentUser(data.user)
      loadPage(data.user.id)
    })
  }, [circleId])

  const loadPage = async (userId: string) => {
    setPageError('')
    try {
      const [circleRes, membersRes, profileRes] = await Promise.all([
        supabase.from('circles').select('*').eq('id', circleId).single(),
        supabase.from('circle_members')
          .select('user_id, role, joined_at, profile:profiles(id, username, full_name, avatar_url, is_pro)')
          .eq('circle_id', circleId)
          .order('joined_at', { ascending: true }),
        supabase.from('profiles').select('is_admin').eq('id', userId).single(),
      ])

      if (circleRes.error) throw new Error('Cercle introuvable ou accès refusé')

      const circleData = circleRes.data
      const membersData = membersRes.data || []
      const adminStatus = profileRes.data?.is_admin ?? false

      const userIsMember = membersData.some((m: any) => m.user_id === userId)
      const userIsOwner = circleData.owner_id === userId

      if (!userIsMember && !adminStatus && circleData.is_private) {
        setPageError("Tu n'es pas membre de ce cercle.")
        setLoading(false)
        return
      }

      setCircle(circleData)
      setMembers(membersData)
      setIsOwner(userIsOwner)
      setIsAdmin(adminStatus)
      setIsMemberOnly(userIsMember && !userIsOwner)

      const memberIds = membersData.map((m: any) => m.user_id).filter(Boolean)
      if (memberIds.length > 0) {
        const { data: readingsData } = await supabase
          .from('readings')
          .select('id, user_id, status, created_at, books(title, author, cover_url)')
          .in('user_id', memberIds)
          .order('created_at', { ascending: false })
          .limit(30)

        const profileMap: Record<string, any> = {}
        for (const m of membersData) {
          if (m.profile) profileMap[m.user_id] = m.profile
        }
        setFeed((readingsData || []).map((r: any) => ({ ...r, profile: profileMap[r.user_id] })))
      }
    } catch (e: any) {
      setPageError(e.message || 'Erreur lors du chargement.')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveCircle = async () => {
    if (!currentUser || actionLoading) return
    setActionLoading(true)
    setActionError('')
    const { error } = await supabase
      .from('circle_members')
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', currentUser.id)
    if (error) {
      setActionError('Impossible de quitter le cercle.')
      setActionLoading(false)
      return
    }
    window.location.href = '/cercles'
  }

  const handleDeleteCircle = async () => {
    if (!currentUser || actionLoading) return
    setActionLoading(true)
    setActionError('')
    const { error } = await supabase
      .from('circles')
      .delete()
      .eq('id', circleId)
    if (error) {
      setActionError('Impossible de supprimer le cercle.')
      setActionLoading(false)
      return
    }
    window.location.href = '/cercles'
  }

  const handleInviteSearch = (q: string) => {
    setInviteQuery(q)
    setInviteError('')
    setInviteSuccess('')
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!q.trim()) { setInviteResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setInviteLoading(true)
      const memberIds = members.map((m: any) => m.user_id)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(6)
      if (error) {
        setInviteError('Erreur lors de la recherche.')
      } else {
        setInviteResults((data || []).filter((p: any) => !memberIds.includes(p.id)))
      }
      setInviteLoading(false)
    }, 350)
  }

  const handleAddMember = async (profile: any) => {
    setInviteError('')
    setInviteSuccess('')
    const { error } = await supabase
      .from('circle_members')
      .insert({ circle_id: circleId, user_id: profile.id, role: 'member' })
    if (error) {
      setInviteError(error.code === '23505' ? 'Déjà membre.' : "Impossible d'ajouter ce membre.")
      return
    }
    setMembers(prev => [...prev, { user_id: profile.id, role: 'member', joined_at: new Date().toISOString(), profile }])
    setInviteResults(prev => prev.filter(p => p.id !== profile.id))
    setInviteSuccess(`@${profile.username} a été ajouté au cercle.`)
    setInviteQuery('')
    setTimeout(() => setInviteSuccess(''), 3000)
  }

  const handleRemoveMember = async (userId: string) => {
    const { error } = await supabase
      .from('circle_members')
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', userId)
    if (error) { alert('Impossible de retirer ce membre.'); return }
    setMembers(prev => prev.filter(m => m.user_id !== userId))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F4EE' }}>
        <p className="text-sm" style={{ color: '#9A9690' }}>Chargement...</p>
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-5 pb-24" style={{ background: '#F7F4EE' }}>
        <p className="font-serif text-lg text-center" style={{ color: '#1A1A2E' }}>{pageError}</p>
        <a href="/cercles" className="text-sm" style={{ color: '#9A9690' }}>← Mes cercles</a>
        <BottomNav />
      </div>
    )
  }

  const color = circle?.cover_color || '#9A9690'
  const canDelete = isOwner || isAdmin
  const canLeave = isMemberOnly

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F7F4EE', color: '#1A1A2E' }}>

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-5">
        <a href="/cercles" className="flex items-center gap-1 text-sm mb-5 transition w-fit" style={{ color: '#9A9690' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Cercles
        </a>

        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: '#E3E0D8', border: '1px solid #D5D0C8' }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl leading-tight" style={{ color: '#1A1A2E' }}>{circle.name}</h1>
              {circle.is_private && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9A9690" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
              {isAdmin && !isOwner && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: '#9A9690', border: '1px solid #D5D0C8' }}>admin</span>
              )}
            </div>
            {circle.description && (
              <p className="text-sm mt-0.5 leading-snug" style={{ color: '#9A9690' }}>{circle.description}</p>
            )}
            <p className="text-xs mt-1" style={{ color: '#9A9690' }}>
              {members.length} membre{members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex px-5" style={{ borderBottom: '1px solid #D5D0C8' }}>
        {(['activite', 'membres'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="pb-3 mr-6 text-sm font-medium border-b-2 -mb-px transition"
            style={{
              color: tab === t ? '#1A1A2E' : '#9A9690',
              borderColor: tab === t ? '#1A1A2E' : 'transparent',
            }}
          >
            {t === 'activite' ? 'Activité' : 'Membres'}
          </button>
        ))}
      </div>

      {/* ── Tab Activité ── */}
      {tab === 'activite' && (
        <div className="px-5 pt-4">
          {feed.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-serif text-base" style={{ color: '#9A9690' }}>Aucune activité pour l&apos;instant</p>
              <p className="text-sm mt-2" style={{ color: '#9A9690' }}>Les lectures des membres apparaîtront ici</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8' }}>
              {feed.map((item, i) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3" style={i < feed.length - 1 ? { borderBottom: '1px solid #D5D0C8' } : {}}>
                  <a href={`/profil/${item.profile?.username}`} className="shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style={{ background: '#E3E0D8' }}>
                      {item.profile?.avatar_url ? (
                        <img src={item.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="font-serif text-sm leading-none" style={{ color: '#1A1A2E' }}>
                          {item.profile?.username?.[0]?.toUpperCase() ?? '?'}
                        </span>
                      )}
                    </div>
                  </a>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug">
                      <a href={`/profil/${item.profile?.username}`} className="font-medium transition" style={{ color: '#1A1A2E' }}>
                        @{item.profile?.username}
                      </a>{item.profile?.is_pro && <span className="text-[10px] ml-0.5" style={{ color: '#9A9690' }}>✦</span>}{' '}
                      <span style={{ color: '#9A9690' }}>{STATUS_ACTION[item.status] ?? 'a ajouté'}</span>{' '}
                      <span className="font-serif italic" style={{ color: '#1A1A2E' }}>{item.books?.title}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.books?.cover_url && (
                      <img src={item.books.cover_url} className="w-5 h-7 rounded object-cover opacity-60" alt="" />
                    )}
                    <span className="text-[10px] w-8 text-right" style={{ color: '#9A9690' }}>{timeAgo(item.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Membres ── */}
      {tab === 'membres' && (
        <div className="px-5 pt-4 flex flex-col gap-4">

          {/* Liste membres */}
          <div className="flex flex-col gap-2">
            {members.map(member => {
              const p = member.profile
              const canRemove = (isOwner && member.role !== 'owner') || (isAdmin && member.user_id !== currentUser?.id)
              return (
                <div key={member.user_id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8' }}>
                  <a href={`/profil/${p?.username}`} className="shrink-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{ background: '#E3E0D8' }}>
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} className="w-full h-full object-cover" alt={p.username} />
                      ) : (
                        <span className="font-serif text-base leading-none" style={{ color: '#1A1A2E' }}>
                          {p?.username?.[0]?.toUpperCase() ?? '?'}
                        </span>
                      )}
                    </div>
                  </a>
                  <a href={`/profil/${p?.username}`} className="flex-1 min-w-0">
                    {p?.full_name && (
                      <p className="font-medium text-sm truncate" style={{ color: '#1A1A2E' }}>
                        {p.full_name}{p?.is_pro && <span className="text-[10px] ml-1" style={{ color: '#9A9690' }}>✦</span>}
                      </p>
                    )}
                    <p className="text-xs truncate" style={{ color: '#9A9690' }}>@{p?.username}</p>
                  </a>
                  {member.role === 'owner' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0" style={{ color, borderColor: `${color}50` }}>
                      admin
                    </span>
                  )}
                  {canRemove && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="hover:text-red-400 transition p-1 shrink-0"
                      style={{ color: '#9A9690' }}
                      aria-label="Retirer"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Invitation */}
          {(isOwner || isAdmin) && (
            <div className="rounded-2xl p-4" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8' }}>
              <p className="text-sm font-medium mb-3" style={{ color: '#1A1A2E' }}>Inviter un membre</p>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9A9690" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={inviteQuery}
                  onChange={e => handleInviteSearch(e.target.value)}
                  placeholder="Chercher par @username ou nom…"
                  className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition"
                  style={{ background: '#F7F4EE', border: '1px solid #D5D0C8', color: '#1A1A2E' }}
                />
              </div>
              {inviteError && <p className="text-red-400 text-xs mt-2">{inviteError}</p>}
              {inviteSuccess && <p className="text-xs mt-2" style={{ color: '#1A1A2E' }}>{inviteSuccess}</p>}
              {inviteLoading && <p className="text-xs mt-3 text-center" style={{ color: '#9A9690' }}>Recherche...</p>}
              {!inviteLoading && inviteQuery.trim() && inviteResults.length === 0 && (
                <p className="text-xs mt-3 text-center" style={{ color: '#9A9690' }}>Aucun résultat</p>
              )}
              {inviteResults.length > 0 && (
                <div className="flex flex-col gap-2 mt-3">
                  {inviteResults.map(profile => (
                    <div key={profile.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: '#F7F4EE', border: '1px solid #D5D0C8' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0" style={{ background: '#E3E0D8' }}>
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.username} />
                        ) : (
                          <span className="font-serif text-sm leading-none" style={{ color: '#1A1A2E' }}>{profile.username?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {profile.full_name && <p className="text-xs font-medium truncate" style={{ color: '#1A1A2E' }}>{profile.full_name}</p>}
                        <p className="text-xs truncate" style={{ color: '#9A9690' }}>@{profile.username}</p>
                      </div>
                      <button
                        onClick={() => handleAddMember(profile)}
                        className="text-xs font-medium hover:opacity-80 transition shrink-0"
                        style={{ color: '#1A1A2E' }}
                      >
                        Ajouter
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Zone d'action */}
          <div className="mt-2">
            {confirmAction ? (
              <div className="rounded-2xl p-4" style={{ border: '1px solid rgba(239,68,68,0.2)', background: '#EDEAE3' }}>
                <p className="text-sm font-medium mb-1" style={{ color: '#1A1A2E' }}>
                  {confirmAction === 'delete' ? 'Supprimer ce cercle ?' : 'Quitter ce cercle ?'}
                </p>
                <p className="text-xs mb-4" style={{ color: '#9A9690' }}>
                  {confirmAction === 'delete'
                    ? 'Tous les membres seront retirés. Cette action est irréversible.'
                    : 'Tu pourras être réinvité plus tard.'}
                </p>
                {actionError && <p className="text-red-400 text-xs mb-3">{actionError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setConfirmAction(null); setActionError('') }}
                    className="flex-1 py-2.5 rounded-xl text-sm transition"
                    style={{ border: '1px solid #D5D0C8', color: '#9A9690' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmAction === 'delete' ? handleDeleteCircle : handleLeaveCircle}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 bg-red-600 rounded-xl text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {actionLoading ? '…' : confirmAction === 'delete' ? 'Supprimer' : 'Quitter'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {canDelete && (
                  <button
                    onClick={() => setConfirmAction('delete')}
                    className="w-full py-2.5 text-red-400 text-sm rounded-xl hover:bg-red-500/10 transition"
                    style={{ border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    Supprimer le cercle
                  </button>
                )}
                {canLeave && (
                  <button
                    onClick={() => setConfirmAction('leave')}
                    className="w-full py-2.5 text-sm rounded-xl transition"
                    style={{ color: '#9A9690', border: '1px solid #D5D0C8' }}
                  >
                    Quitter le cercle
                  </button>
                )}
                {isOwner && !isAdmin && (
                  <p className="text-center text-xs px-4" style={{ color: '#9A9690' }}>
                    Tu es l&apos;admin de ce cercle. Supprime-le pour en partir.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
