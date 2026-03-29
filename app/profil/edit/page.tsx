'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

export default function EditProfilPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = '/auth'
        return
      }
      setCurrentUser(data.user)
      loadProfile(data.user)
    })
  }, [])

  const loadProfile = async (user: any) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setFullName(data.full_name || user.user_metadata?.full_name || '')
      setUsername(data.username || user.user_metadata?.username || '')
      setOriginalUsername(data.username || user.user_metadata?.username || '')
      setBio(data.bio || '')
      setAvatarUrl(data.avatar_url || null)
    } else {
      setFullName(user.user_metadata?.full_name || '')
      setUsername(user.user_metadata?.username || '')
      setOriginalUsername(user.user_metadata?.username || '')
    }
    setLoading(false)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!username.trim()) {
      setMessage({ text: "Le nom d'utilisateur est requis.", type: 'error' })
      return
    }
    setSaving(true)
    setMessage(null)

    // Check username uniqueness if changed
    if (username !== originalUsername) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', currentUser.id)
        .single()
      if (existing) {
        setMessage({ text: "Ce nom d'utilisateur est déjà pris.", type: 'error' })
        setSaving(false)
        return
      }
    }

    let newAvatarUrl = avatarUrl

    // Upload avatar if changed
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${currentUser.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })

      if (uploadError) {
        setMessage({ text: "Erreur lors de l'upload de la photo.", type: 'error' })
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      newAvatarUrl = urlData.publicUrl
    }

    // Upsert profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: currentUser.id,
        username: username.toLowerCase().trim(),
        full_name: fullName,
        bio,
        avatar_url: newAvatarUrl,
      })

    if (profileError) {
      setMessage({ text: 'Erreur lors de la sauvegarde.', type: 'error' })
      setSaving(false)
      return
    }

    // Sync auth metadata
    await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        username: username.toLowerCase().trim(),
      },
    })

    setAvatarUrl(newAvatarUrl)
    setAvatarFile(null)
    setOriginalUsername(username)
    setMessage({ text: 'Profil mis à jour !', type: 'success' })
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex items-center justify-center">
        <div className="text-[#7a7268] text-sm">Chargement...</div>
      </div>
    )
  }

  const displayAvatar = avatarPreview || avatarUrl

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24">

      {/* Header */}
      <div className="px-5 pt-12 pb-5 flex items-center gap-3 border-b border-white/10">
        <a
          href={username ? `/profil/${username}` : '/profil'}
          className="w-8 h-8 flex items-center justify-center text-[#7a7268] hover:text-white transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </a>
        <h1 className="font-serif text-2xl text-white">Modifier le profil</h1>
      </div>

      <div className="px-5 py-8 flex flex-col gap-7">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden bg-[#c9440e]/15 flex items-center justify-center group cursor-pointer"
          >
            {displayAvatar ? (
              <img src={displayAvatar} className="w-full h-full object-cover" alt="Avatar" />
            ) : (
              <span className="font-serif text-[#c9440e] text-4xl leading-none">
                {username?.[0]?.toUpperCase() || '?'}
              </span>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[#c9440e] text-sm font-medium"
          >
            Changer la photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-[#7a7268] text-xs font-medium mb-2 block">Prénom</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ton prénom"
              className="w-full bg-[#242018] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#c9440e] transition placeholder-[#7a7268]"
            />
          </div>

          <div>
            <label className="text-[#7a7268] text-xs font-medium mb-2 block">Nom d'utilisateur</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7268] text-sm select-none">@</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full bg-[#242018] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white text-sm outline-none focus:border-[#c9440e] transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[#7a7268] text-xs font-medium mb-2 block">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={4}
              maxLength={200}
              placeholder="Quelques mots sur toi, tes genres préférés..."
              className="w-full bg-[#242018] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#c9440e] transition resize-none placeholder-[#7a7268] leading-relaxed"
            />
            <p className="text-[#7a7268]/50 text-xs mt-1 text-right">{bio.length}/200</p>
          </div>
        </div>

        {message && (
          <p className={`text-sm text-center font-medium ${message.type === 'success' ? 'text-green-400' : 'text-[#c9440e]'}`}>
            {message.text}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#c9440e] text-white py-3.5 rounded-full text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
