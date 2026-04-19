'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

export default function CerclesPage() {
  const [circles, setCircles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      loadCircles(data.user.id)
    })
  }, [])

  const loadCircles = async (userId: string) => {
    setError('')
    try {
      const { data: memberships, error: err1 } = await supabase
        .from('circle_members')
        .select('circle_id')
        .eq('user_id', userId)

      if (err1) throw new Error(err1.message)

      const ids = (memberships || []).map((m: any) => m.circle_id)

      if (ids.length === 0) {
        setCircles([])
        setLoading(false)
        return
      }

      const [circlesRes, allMembersRes] = await Promise.all([
        supabase
          .from('circles')
          .select('*')
          .in('id', ids)
          .order('created_at', { ascending: false }),
        supabase
          .from('circle_members')
          .select('circle_id')
          .in('circle_id', ids),
      ])

      if (circlesRes.error) throw new Error(circlesRes.error.message)

      const counts: Record<number, number> = {}
      for (const m of (allMembersRes.data || [])) {
        counts[m.circle_id] = (counts[m.circle_id] || 0) + 1
      }

      setCircles(
        (circlesRes.data || []).map((c: any) => ({ ...c, membersCount: counts[c.id] || 0 }))
      )
    } catch (e: any) {
      setError(`Erreur : ${e.message || 'impossible de charger les cercles.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F7F4EE', color: '#1A1A2E' }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl" style={{ color: '#1A1A2E' }}>Cercles</h1>
          <p className="text-sm mt-1" style={{ color: '#9A9690' }}>Tes clubs de lecture</p>
        </div>
        <a
          href="/cercles/nouveau"
          className="mt-1 w-9 h-9 rounded-full flex items-center justify-center hover:opacity-90 transition shrink-0"
          style={{ background: '#1A1A2E' }}
          aria-label="Créer un cercle"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F4EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </a>
      </div>

      {/* Contenu */}
      <div className="px-5">
        {loading && (
          <div className="text-center py-10 text-sm" style={{ color: '#9A9690' }}>Chargement...</div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && circles.length === 0 && (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9A9690" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div>
              <p className="font-serif text-base" style={{ color: '#9A9690' }}>Aucun cercle pour l&apos;instant</p>
              <p className="text-sm mt-1" style={{ color: '#9A9690' }}>Crée ton premier club de lecture</p>
            </div>
            <a
              href="/cercles/nouveau"
              className="mt-1 px-6 py-2.5 text-sm font-medium hover:opacity-90 transition"
              style={{ background: '#1A1A2E', color: '#F7F4EE', borderRadius: '6px' }}
            >
              Créer un cercle
            </a>
          </div>
        )}

        {!loading && circles.length > 0 && (
          <div className="flex flex-col gap-3">
            {circles.map(circle => {
              const memberCount = circle.membersCount ?? 0
              const color = circle.cover_color || '#9A9690'
              return (
                <a
                  key={circle.id}
                  href={`/cercles/${circle.id}`}
                  className="flex items-center gap-4 rounded-2xl p-4 active:opacity-70 transition"
                  style={{ background: '#EDEAE3', border: '1px solid #D5D0C8' }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: '#E3E0D8', border: '1px solid #D5D0C8' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate" style={{ color: '#1A1A2E' }}>{circle.name}</p>
                      {circle.is_private && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9A9690" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      )}
                    </div>
                    {circle.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#9A9690' }}>{circle.description}</p>
                    )}
                    <p className="text-[11px] mt-1" style={{ color: '#9A9690' }}>
                      {memberCount} membre{memberCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9A9690" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
