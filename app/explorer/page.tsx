'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

export default function ExplorerPage() {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/auth'
    })
    loadUsers('')
  }, [])

  const loadUsers = async (query: string) => {
    setLoading(true)
    let q = supabase.from('profiles').select('id, username, bio')
    if (query.trim()) {
      q = q.ilike('username', `%${query}%`)
    }
    const { data } = await q.limit(20)
    setUsers(data || [])
    setLoading(false)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    loadUsers(value)
  }

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24">
      <div className="px-5 pt-12 pb-4">
        <h1 className="font-serif text-3xl text-white">Explorer</h1>
        <p className="text-[#7a7268] text-sm mt-1">Découvre d'autres lecteurs</p>
      </div>

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
            placeholder="Chercher par nom d'utilisateur..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-[#242018] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e] transition"
          />
        </div>
      </div>

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
            {users.map((profile) => (
              <a
                key={profile.id}
                href={`/profil/${profile.username}`}
                className="flex items-center gap-4 bg-[#242018] border border-white/10 rounded-xl p-4 hover:border-white/25 transition"
              >
                <div className="w-11 h-11 rounded-full bg-[#c9440e]/15 flex items-center justify-center shrink-0">
                  <span className="font-serif text-[#c9440e] text-lg leading-none">
                    {profile.username?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">@{profile.username}</p>
                  {profile.bio && (
                    <p className="text-[#7a7268] text-xs mt-0.5 truncate">{profile.bio}</p>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a7268" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
