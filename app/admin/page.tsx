'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [circles, setCircles] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [tab, setTab] = useState<'circles' | 'users'>('circles')
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'circle' | 'user'; id: string | number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .single()

      if (!profile?.is_admin) {
        window.location.href = '/home'
        return
      }

      setAuthorized(true)
      loadData()
    })
  }, [])

  const loadData = async () => {
    setError('')
    const [circlesRes, membersRes, usersRes] = await Promise.all([
      supabase.from('circles').select('*, owner:profiles!owner_id(username)').order('created_at', { ascending: false }),
      supabase.from('circle_members').select('circle_id'),
      supabase.from('profiles').select('id, username, full_name, avatar_url, is_admin, created_at').order('created_at', { ascending: false }),
    ])

    // Count members per circle
    const counts: Record<number, number> = {}
    for (const m of (membersRes.data || [])) {
      counts[m.circle_id] = (counts[m.circle_id] || 0) + 1
    }

    setCircles((circlesRes.data || []).map((c: any) => ({ ...c, membersCount: counts[c.id] || 0 })))
    setUsers(usersRes.data || [])
    setLoading(false)
  }

  const handleDeleteCircle = async (circleId: number) => {
    setDeleting(true)
    setError('')
    const { error } = await supabase.from('circles').delete().eq('id', circleId)
    if (error) {
      setError('Erreur : ' + error.message)
    } else {
      setCircles(prev => prev.filter(c => c.id !== circleId))
    }
    setConfirmDelete(null)
    setDeleting(false)
  }

  const handleDeleteUser = async (userId: string) => {
    setDeleting(true)
    setError('')
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) {
      setError('Erreur : ' + error.message)
    } else {
      setUsers(prev => prev.filter(u => u.id !== userId))
    }
    setConfirmDelete(null)
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex items-center justify-center">
        <p className="text-[#7a7268] text-sm">Chargement...</p>
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-16">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-white/8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">ADMIN</span>
          </div>
          <h1 className="font-serif text-2xl text-white">Administration</h1>
        </div>
        <a href="/home" className="text-[#7a7268] text-sm hover:text-white transition">← Accueil</a>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-3 px-5 py-4 border-b border-white/8">
        <div className="bg-[#242018] border border-white/8 rounded-xl px-4 py-3">
          <p className="text-[#7a7268] text-xs">Cercles</p>
          <p className="text-white font-bold text-2xl mt-0.5">{circles.length}</p>
        </div>
        <div className="bg-[#242018] border border-white/8 rounded-xl px-4 py-3">
          <p className="text-[#7a7268] text-xs">Utilisateurs</p>
          <p className="text-white font-bold text-2xl mt-0.5">{users.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/8 px-5">
        {(['circles', 'users'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 mr-6 text-sm font-medium border-b-2 -mb-px transition pt-3 ${
              tab === t ? 'text-white border-[#c9440e]' : 'text-[#7a7268] border-transparent'
            }`}
          >
            {t === 'circles' ? `Cercles (${circles.length})` : `Utilisateurs (${users.length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-5 mt-4 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ── Cercles ── */}
      {tab === 'circles' && (
        <div className="px-5 pt-4 flex flex-col gap-2">
          {circles.length === 0 && (
            <p className="text-center text-[#7a7268] text-sm py-12">Aucun cercle</p>
          )}
          {circles.map(circle => {
            const color = circle.cover_color || '#c9440e'
            return (
              <div key={circle.id} className="flex items-center gap-3 bg-[#242018] border border-white/8 rounded-xl px-4 py-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{circle.name}</p>
                  <p className="text-[#7a7268] text-xs">
                    @{circle.owner?.username ?? '?'} · {circle.membersCount} membre{circle.membersCount !== 1 ? 's' : ''}
                    {circle.is_private && ' · privé'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/cercles/${circle.id}`}
                    className="text-[#7a7268] hover:text-white transition p-1"
                    aria-label="Voir"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </a>
                  <button
                    onClick={() => setConfirmDelete({ type: 'circle', id: circle.id, name: circle.name })}
                    className="text-[#7a7268] hover:text-red-400 transition p-1"
                    aria-label="Supprimer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Utilisateurs ── */}
      {tab === 'users' && (
        <div className="px-5 pt-4 flex flex-col gap-2">
          {users.length === 0 && (
            <p className="text-center text-[#7a7268] text-sm py-12">Aucun utilisateur</p>
          )}
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-3 bg-[#242018] border border-white/8 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-[#c9440e]/15 flex items-center justify-center overflow-hidden shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} className="w-full h-full object-cover" alt={user.username} />
                ) : (
                  <span className="font-serif text-[#c9440e] text-sm leading-none">
                    {user.username?.[0]?.toUpperCase() ?? '?'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-medium truncate">
                    {user.full_name || user.username}
                  </p>
                  {user.is_admin && (
                    <span className="text-[10px] text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded-full shrink-0">admin</span>
                  )}
                </div>
                <p className="text-[#7a7268] text-xs truncate">@{user.username}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/profil/${user.username}`}
                  className="text-[#7a7268] hover:text-white transition p-1"
                  aria-label="Voir profil"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
                {!user.is_admin && (
                  <button
                    onClick={() => setConfirmDelete({ type: 'user', id: user.id, name: user.username })}
                    className="text-[#7a7268] hover:text-red-400 transition p-1"
                    aria-label="Supprimer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Confirmation suppression ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setConfirmDelete(null)}
          />
          <div className="relative w-full bg-[#1e1b17] border-t border-white/10 rounded-t-3xl px-5 pt-5 pb-10 z-10">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            <p className="text-white font-medium text-base mb-1">
              {confirmDelete.type === 'circle' ? 'Supprimer ce cercle ?' : 'Supprimer cet utilisateur ?'}
            </p>
            <p className="text-[#7a7268] text-sm mb-1">
              <span className="text-white">« {confirmDelete.name} »</span>
            </p>
            <p className="text-[#7a7268] text-xs mb-6">
              {confirmDelete.type === 'circle'
                ? 'Tous les membres seront retirés. Action irréversible.'
                : 'Le profil sera supprimé. Le compte auth restera actif.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 py-3 border border-white/15 rounded-xl text-[#7a7268] text-sm hover:text-white transition disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                onClick={() =>
                  confirmDelete.type === 'circle'
                    ? handleDeleteCircle(confirmDelete.id as number)
                    : handleDeleteUser(confirmDelete.id as string)
                }
                disabled={deleting}
                className="flex-1 py-3 bg-red-600 rounded-xl text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
