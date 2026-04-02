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
      if (!data.user) { window.location.href = '/auth'; return }
      setCurrentUser(data.user)
      loadProfile(data.user)
    })
  }, [])

  const loadProfile = async (user: any) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
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
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!username.trim()) {
      setMessage({ text: "Le nom d'utilisateur est requis.", type: 'error' })
      return
    }
    setSaving(true)
    setMessage(null)

    if (username !== originalUsername) {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', username).neq('id', currentUser.id).single()
      if (existing) {
        setMessage({ text: "Ce nom d'utilisateur est déjà pris.", type: 'error' })
        setSaving(false)
        return
      }
    }

    let newAvatarUrl = avatarUrl

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${currentUser.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(path, avatarFile, { upsert: true })

      if (uploadError) {
        setMessage({ text: "Erreur lors de l'upload.", type: 'error' })
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
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

    await supabase.auth.updateUser({
      data: { full_name: fullName, username: username.toLowerCase().trim() },
    })

    setAvatarUrl(newAvatarUrl)
    setAvatarFile(null)
    setAvatarPreview(null)
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
    <div className="min-h-screen bg-[#1a1714] text-white pb-20">

      {/* Header */}
      <div className="px-4 pt-14 pb-4 flex items-center justify-between border-b border-white/8">
        <div className="flex items-center gap-3">
          <a
            href={username ? `/profil/${username}` : '/profil'}
            className="text-[#7a7268] hover:text-white transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </a>
          <h1 className="text-white font-semibold text-base">Modifier le profil</h1>
        </div>
        <div className="flex items-center gap-3">
          {username && (
            <a href={`/profil/${username}`} className="text-[#7a7268] text-xs hover:text-white transition">
              Voir mon profil →
            </a>
          )}
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
            className="text-[#7a7268] text-xs hover:text-white/60 transition"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 pb-6">

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#c9440e]/15 flex items-center justify-center">
              {displayAvatar ? (
                <img src={displayAvatar} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <span className="font-serif text-[#c9440e] text-2xl leading-none">
                  {username?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#c9440e] rounded-full flex items-center justify-center border-2 border-[#1a1714] hover:opacity-90 transition"
              aria-label="Changer la photo"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Champs */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[#7a7268] text-[9px] uppercase tracking-widest font-medium mb-1.5 block">Prénom</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ton prénom"
              className="w-full bg-[#242018] border border-white/8 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#c9440e]/50 transition placeholder-[#7a7268]/40"
            />
          </div>

          <div>
            <label className="text-[#7a7268] text-[9px] uppercase tracking-widest font-medium mb-1.5 block">Nom d'utilisateur</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7268] text-sm select-none">@</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full bg-[#242018] border border-white/8 rounded-lg pl-7 pr-3 py-2 text-white text-sm outline-none focus:border-[#c9440e]/50 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[#7a7268] text-[9px] uppercase tracking-widest font-medium mb-1.5 block">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="Quelques mots sur toi..."
              className="w-full bg-[#242018] border border-white/8 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#c9440e]/50 transition resize-none placeholder-[#7a7268]/40 leading-relaxed"
            />
            <p className="text-[#7a7268]/30 text-[10px] mt-0.5 text-right">{bio.length}/200</p>
          </div>
        </div>

        {/* Feedback */}
        {message && (
          <p className={`text-xs text-center font-medium mt-4 ${message.type === 'success' ? 'text-green-400' : 'text-[#c9440e]'}`}>
            {message.text}
          </p>
        )}

        {/* Bouton */}
        <div className="flex justify-center mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-7 py-2 rounded-full text-sm font-medium bg-[#c9440e] text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        {/* Lien Pro */}
        <div className="flex justify-center mt-4">
          <a
            href="/premium"
            className="flex items-center gap-1.5 text-[#c9440e] text-xs font-medium hover:opacity-80 transition"
          >
            <span>Passer Pro</span>
            <span className="text-[10px]">✦</span>
          </a>
        </div>

      </div>

      <BottomNav />
    </div>
  )
}
