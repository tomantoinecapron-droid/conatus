'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

const STATUS_LABEL: Record<string, string> = {
  lu: 'Lu', en_cours: 'En cours', a_lire: 'À lire',
}
const STATUS_COLOR: Record<string, string> = {
  lu: 'text-[#9A9690]',
  en_cours: 'text-[#1A1A2E]',
  a_lire: 'text-[#9A9690]',
}
const STATUS_DOT: Record<string, string> = {
  lu: 'bg-[#9A9690]',
  en_cours: 'bg-[#1A1A2E]',
  a_lire: 'bg-[#D5D0C8]',
}

function Stars({ n }: { n: number }) {
  if (!n || n < 1) return null
  const full = Math.round(n)
  return (
    <span className="text-[11px] tracking-[-1px]" style={{ color: '#9A9690' }}>
      {'★'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))}
    </span>
  )
}

export default function ProfilPage() {
  const params = useParams()
  const username = params?.username as string

  const [profile, setProfile] = useState<any>(null)
  const [readings, setReadings] = useState<any[]>([])
  const [recentNotes, setRecentNotes] = useState<any[]>([])
  const [notesCount, setNotesCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) return

    const init = async () => {
      const [authRes, profileRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profiles').select('*').eq('username', username).single(),
      ])

      if (!authRes.data.user) { window.location.href = '/auth'; return }
      const user = authRes.data.user
      setCurrentUser(user)

      if (!profileRes.data) { setLoading(false); return }
      const profileData = profileRes.data
      setProfile(profileData)

      const isOwn = user.id === profileData.id

      const [readingsRes, notesRes, recentNotesRes, followingRes] = await Promise.all([
        supabase.from('readings').select('*, books(*)')
          .eq('user_id', profileData.id).order('created_at', { ascending: false }),
        supabase.from('notes').select('id', { count: 'exact', head: true })
          .eq('user_id', profileData.id),
        supabase.from('notes').select('*, readings(*, books(*))')
          .eq('user_id', profileData.id)
          .not('content', 'is', null)
          .neq('content', '')
          .order('updated_at', { ascending: false })
          .limit(3),
        supabase.from('follows').select('id', { count: 'exact', head: true })
          .eq('follower_id', profileData.id),
      ])

      setReadings(readingsRes.data || [])
      setNotesCount(notesRes.count || 0)
      setRecentNotes(recentNotesRes.data || [])
      setFollowingCount(followingRes.count ?? 0)

      if (!isOwn) {
        const [followRes, countRes] = await Promise.all([
          supabase.from('follows').select('id', { count: 'exact', head: true })
            .eq('follower_id', user.id).eq('following_id', profileData.id),
          supabase.from('follows').select('id', { count: 'exact', head: true })
            .eq('following_id', profileData.id),
        ])
        setIsFollowing((followRes.count ?? 0) > 0)
        setFollowersCount(countRes.count ?? 0)
      } else {
        const { count } = await supabase.from('follows')
          .select('id', { count: 'exact', head: true }).eq('following_id', profileData.id)
        setFollowersCount(count ?? 0)
      }

      setLoading(false)
    }

    init()
  }, [username])

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F4EE' }}>
        <div className="text-sm" style={{ color: '#9A9690' }}>Chargement...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pb-24" style={{ background: '#F7F4EE' }}>
        <p className="font-serif text-xl" style={{ color: '#1A1A2E' }}>Utilisateur introuvable</p>
        <a href="/social" className="text-sm mt-3" style={{ color: '#9A9690' }}>← Explorer</a>
        <BottomNav />
      </div>
    )
  }

  const isOwnProfile = currentUser.id === profile.id
  const luCount = readings.filter(r => r.status === 'lu').length

  return (
    <div className="min-h-screen pb-28" style={{ background: '#F7F4EE', color: '#1A1A2E' }}>

      {/* ── Header ── */}
      <div className="px-6 pt-14 pb-8">

        {/* Avatar + actions */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0" style={{ background: '#E3E0D8', border: '0.5px solid #D5D0C8' }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-serif text-[22px]" style={{ color: '#9A9690' }}>
                    {(profile.full_name || username || '?')[0].toUpperCase()}
                  </span>
                </div>
              )
            }
          </div>
          {isOwnProfile && (
            <div className="flex items-center gap-3 mt-1">
              <a
                href="/profil/edit"
                className="transition"
                style={{ color: '#9A9690' }}
                aria-label="Modifier le profil"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </a>
              <a
                href="/settings"
                className="transition"
                style={{ color: '#9A9690' }}
                aria-label="Paramètres"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </a>
            </div>
          )}
        </div>

        {/* Nom */}
        <h1 className="font-serif text-[36px] leading-[1.1] tracking-tight mb-1" style={{ color: '#1A1A2E' }}>
          {profile.full_name || `@${username}`}
        </h1>

        {/* Handle + Pro */}
        <p className="text-[13px] mb-4" style={{ color: '#9A9690' }}>
          @{username}
          {profile.is_pro && (
            <span className="ml-2 text-[10px] rounded px-1.5 py-0.5 leading-none" style={{ color: '#1A1A2E', border: '1px solid #D5D0C8' }}>✦ Pro</span>
          )}
        </p>

        {/* Bio */}
        {profile.bio && (
          <p className="text-[14px] italic leading-relaxed mb-5 max-w-[280px] font-serif" style={{ color: '#9A9690' }}>
            {profile.bio}
          </p>
        )}

        {/* Stats inline */}
        <div className="flex items-center gap-2.5 flex-wrap text-[12px]" style={{ color: '#9A9690' }}>
          <span>
            <span className="font-medium" style={{ color: '#1A1A2E' }}>{luCount}</span>{' '}
            lu{luCount !== 1 ? 's' : ''}
          </span>
          <span style={{ color: '#D5D0C8' }}>·</span>
          <span>
            <span className="font-medium" style={{ color: '#1A1A2E' }}>{notesCount}</span>{' '}
            fiche{notesCount !== 1 ? 's' : ''}
          </span>
          <span style={{ color: '#D5D0C8' }}>·</span>
          <span>
            <span className="font-medium" style={{ color: '#1A1A2E' }}>{followersCount}</span>{' '}
            abonné{followersCount !== 1 ? 's' : ''}
          </span>
          <span style={{ color: '#D5D0C8' }}>·</span>
          <span>
            <span className="font-medium" style={{ color: '#1A1A2E' }}>{followingCount}</span>{' '}
            abonnement{followingCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Bouton follow */}
        {!isOwnProfile && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className="mt-5 text-[12px] px-5 py-2 transition disabled:opacity-40"
            style={{
              border: '1px solid #D5D0C8',
              color: isFollowing ? '#9A9690' : '#1A1A2E',
              borderRadius: '6px',
            }}
          >
            {isFollowing ? 'Abonné' : "S'abonner"}
          </button>
        )}
      </div>

      {/* ── Bibliothèque ── */}
      {readings.length > 0 && (
        <section className="mb-10">
          <div className="px-6 mb-4 pb-2" style={{ borderBottom: '0.5px solid #D5D0C8' }}>
            <h2 className="text-[11px] font-medium tracking-[0.12em] uppercase" style={{ color: '#9A9690' }}>
              Bibliothèque
            </h2>
          </div>

          <div className="px-6">
            {readings.map((reading, i) => {
              const isLast = i === readings.length - 1
              return (
                <div key={reading.id}>
                  <a
                    href={isOwnProfile ? `/fiche/${reading.id}` : '#'}
                    className={`flex items-baseline justify-between gap-4 py-3.5 group ${isOwnProfile ? 'cursor-pointer' : 'pointer-events-none'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-[15px] leading-snug line-clamp-1 transition" style={{ color: '#1A1A2E' }}>
                        {reading.books?.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {reading.books?.author ? (
                          <a
                            href={`/auteur/${encodeURIComponent(reading.books.author)}`}
                            onClick={e => e.stopPropagation()}
                            className="text-[12px] truncate transition"
                            style={{ color: '#9A9690' }}
                          >
                            {reading.books.author}
                          </a>
                        ) : null}
                        {reading.rating > 0 && (
                          <>
                            <span className="text-[10px]" style={{ color: '#D5D0C8' }}>·</span>
                            <Stars n={reading.rating} />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[reading.status] ?? 'bg-[#D5D0C8]'}`} />
                      <span className={`text-[11px] ${STATUS_COLOR[reading.status] ?? 'text-[#9A9690]'}`}>
                        {STATUS_LABEL[reading.status] ?? ''}
                      </span>
                    </div>
                  </a>
                  {!isLast && <div className="h-px" style={{ background: '#D5D0C8' }} />}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Fiches récentes ── */}
      {recentNotes.length > 0 && (
        <section className="mb-10">
          <div className="px-6 mb-4 pb-2" style={{ borderBottom: '0.5px solid #D5D0C8' }}>
            <h2 className="text-[11px] font-medium tracking-[0.12em] uppercase" style={{ color: '#9A9690' }}>
              Fiches récentes
            </h2>
          </div>

          <div className="px-6 flex flex-col gap-6">
            {recentNotes.map((note) => {
              const bookTitle = note.readings?.books?.title
              const excerpt = note.content?.length > 120
                ? note.content.slice(0, 120).trimEnd() + '…'
                : note.content
              return (
                <div key={note.id} className="group">
                  <p className="font-serif italic text-[14px] leading-relaxed mb-2" style={{ color: '#9A9690' }}>
                    &ldquo;{excerpt}&rdquo;
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12px] truncate" style={{ color: '#9A9690' }}>{bookTitle}</p>
                    {isOwnProfile && note.reading_id && (
                      <a
                        href={`/fiche/${note.reading_id}`}
                        className="text-[11px] transition shrink-0"
                        style={{ color: '#9A9690' }}
                      >
                        Lire →
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── État vide ── */}
      {readings.length === 0 && (
        <div className="px-6 py-16 flex flex-col items-center gap-2">
          <p className="font-serif text-base" style={{ color: '#9A9690' }}>Bibliothèque vide pour l&apos;instant</p>
          {isOwnProfile && (
            <a href="/bibliotheque" className="text-sm mt-1" style={{ color: '#1A1A2E' }}>Ajouter des livres →</a>
          )}
        </div>
      )}

      {/* ── Déconnexion ── */}
      {isOwnProfile && (
        <div className="flex justify-center pt-4 pb-2">
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
            className="flex items-center gap-2 text-[12px] rounded-full px-5 py-2 transition"
            style={{ color: '#9A9690', border: '1px solid #D5D0C8' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Déconnexion
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
