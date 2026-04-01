'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 6) return `il y a ${Math.floor(days / 7)} sem.`
  if (days > 0) return `il y a ${days}j`
  if (hours > 0) return `il y a ${hours}h`
  if (minutes > 0) return `il y a ${minutes}min`
  return `à l'instant`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }

      const { data: notifs } = await supabase
        .from('notifications')
        .select('*, from_profile:profiles!from_user_id(id, username, avatar_url, is_pro)')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications(notifs || [])
      setLoading(false)

      // Marquer tout comme lu
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', data.user.id)
        .eq('read', false)
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="font-serif text-3xl text-white">Notifications</h1>
      </div>

      {/* Liste */}
      <div className="px-5">
        {loading ? (
          <div className="text-center py-10 text-[#7a7268] text-sm">Chargement...</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7a7268" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p className="font-serif text-base text-white/40">Aucune notification</p>
          </div>
        ) : (
          <div className="bg-[#242018] border border-white/8 rounded-2xl overflow-hidden">
            {notifications.map((notif, i) => {
              const from = notif.from_profile
              const isLast = i === notifications.length - 1
              return (
                <a
                  key={notif.id}
                  href={from?.username ? `/profil/${from.username}` : '#'}
                  className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/3 ${!isLast ? 'border-b border-white/5' : ''} ${!notif.read ? 'bg-white/[0.02]' : ''}`}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-[#c9440e]/15 flex items-center justify-center shrink-0 overflow-hidden">
                    {from?.avatar_url ? (
                      <img src={from.avatar_url} className="w-full h-full object-cover" alt={from.username} />
                    ) : (
                      <span className="font-serif text-[#c9440e] text-sm leading-none">
                        {from?.username?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>

                  {/* Texte */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">
                      <span className="font-medium text-white">@{from?.username ?? 'quelqu\'un'}</span>{from?.is_pro && <span className="text-white/60 text-[10px] ml-0.5">✦</span>}
                      {' '}
                      <span className="text-[#7a7268]">s'est abonné à toi</span>
                    </p>
                    <p className="text-[#7a7268] text-[11px] mt-0.5">{timeAgo(notif.created_at)}</p>
                  </div>

                  {/* Point non lu */}
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-[#c9440e] shrink-0" />
                  )}
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
