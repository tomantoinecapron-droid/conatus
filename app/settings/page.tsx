'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-6 mb-1">
      <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#7a7268] shrink-0">{children}</p>
      <div className="flex-1 h-px bg-white/6" />
    </div>
  )
}

function Row({ label, sub, right }: { label: string; sub?: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="min-w-0">
        <p className="text-[14px] text-white leading-snug">{label}</p>
        {sub && <p className="text-[12px] text-[#7a7268] mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${value ? 'bg-[#c9440e]' : 'bg-white/10'}`}
      style={{ height: '22px', width: '40px' }}
    >
      <span
        className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Email / mot de passe
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [credMessage, setCredMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [credSaving, setCredSaving] = useState(false)

  // Préférences (stockées dans profiles)
  const [notifReminders, setNotifReminders] = useState(true)
  const [notifFollowers, setNotifFollowers] = useState(true)
  const [isPublic, setIsPublic] = useState(true)
  const [prefSaving, setPrefSaving] = useState(false)

  // Danger
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setUser(data.user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      if (prof) {
        setProfile(prof)
        setNotifReminders(prof.notif_reminders ?? true)
        setNotifFollowers(prof.notif_followers ?? true)
        setIsPublic(prof.is_public ?? true)
      }
      setLoading(false)
    })
  }, [])

  const saveCredentials = async () => {
    setCredMessage(null)
    if (newPassword && newPassword !== confirmPassword) {
      setCredMessage({ text: 'Les mots de passe ne correspondent pas.', ok: false })
      return
    }
    if (!newEmail && !newPassword) return
    setCredSaving(true)
    const updates: any = {}
    if (newEmail) updates.email = newEmail
    if (newPassword) updates.password = newPassword
    const { error } = await supabase.auth.updateUser(updates)
    if (error) {
      setCredMessage({ text: error.message, ok: false })
    } else {
      setCredMessage({ text: newEmail ? 'Un lien de confirmation a été envoyé.' : 'Mot de passe mis à jour.', ok: true })
      setNewEmail('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setCredSaving(false)
  }

  const savePref = async (patch: Record<string, boolean>) => {
    if (!user) return
    setPrefSaving(true)
    await supabase.from('profiles').update(patch).eq('id', user.id)
    setPrefSaving(false)
  }

  const handleToggle = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val)
    savePref({ [key]: val })
  }

  const deleteAccount = async () => {
    setDeleting(true)
    // Supprimer les données utilisateur puis le compte auth
    await Promise.all([
      supabase.from('readings').delete().eq('user_id', user.id),
      supabase.from('notes').delete().eq('user_id', user.id),
      supabase.from('citations').delete().eq('user_id', user.id),
      supabase.from('follows').delete().eq('follower_id', user.id),
      supabase.from('follows').delete().eq('following_id', user.id),
    ])
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex items-center justify-center">
        <div className="text-[#7a7268] text-sm">Chargement...</div>
      </div>
    )
  }

  const username = profile?.username || user?.user_metadata?.username || ''

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-28">

      {/* ── Top bar ── */}
      <div className="px-6 pt-14 pb-6 flex items-center gap-3">
        <a
          href={username ? `/profil/${username}` : '/profil'}
          className="text-[#7a7268] hover:text-white transition"
          aria-label="Retour"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </a>
        <h1 className="font-serif text-[22px] text-white">Paramètres</h1>
      </div>

      {/* ── Compte ── */}
      <div className="mb-8">
        <SectionTitle>Compte</SectionTitle>

        <Row
          label="Adresse email"
          sub={user?.email}
          right={null}
        />
        <div className="h-px bg-white/5 mx-6" />

        <div className="px-6 py-4 flex flex-col gap-3">
          <div>
            <label className="text-[10px] text-[#7a7268] uppercase tracking-widest mb-1.5 block">Nouvel email</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder={user?.email}
              className="w-full bg-[#242018] border border-white/8 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#c9440e]/50 transition placeholder-[#7a7268]/30"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#7a7268] uppercase tracking-widest mb-1.5 block">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#242018] border border-white/8 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#c9440e]/50 transition placeholder-[#7a7268]/30"
            />
          </div>
          {newPassword && (
            <div>
              <label className="text-[10px] text-[#7a7268] uppercase tracking-widest mb-1.5 block">Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#242018] border border-white/8 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#c9440e]/50 transition placeholder-[#7a7268]/30"
              />
            </div>
          )}

          {credMessage && (
            <p className={`text-[12px] ${credMessage.ok ? 'text-emerald-400' : 'text-[#c9440e]'}`}>
              {credMessage.text}
            </p>
          )}

          {(newEmail || newPassword) && (
            <button
              onClick={saveCredentials}
              disabled={credSaving}
              className="self-start text-[12px] font-medium text-white bg-[#c9440e] px-4 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
            >
              {credSaving ? 'Sauvegarde...' : 'Mettre à jour'}
            </button>
          )}
        </div>
      </div>

      {/* ── Abonnement ── */}
      <div className="mb-8">
        <SectionTitle>Abonnement</SectionTitle>

        {profile?.is_pro ? (
          <>
            <Row
              label="Conatus Pro"
              sub="Abonnement actif"
              right={<span className="text-[#c9440e] text-[11px]">✦ Actif</span>}
            />
            <div className="h-px bg-white/5 mx-6" />
            <div className="px-6 py-3">
              <a
                href="/premium"
                className="text-[12px] text-[#7a7268] hover:text-white transition"
              >
                Gérer ou résilier mon abonnement →
              </a>
            </div>
          </>
        ) : (
          <>
            <Row
              label="Offre gratuite"
              sub="Fonctionnalités limitées"
              right={null}
            />
            <div className="h-px bg-white/5 mx-6" />
            <div className="px-6 py-3">
              <a
                href="/premium"
                className="inline-flex items-center gap-2 text-[12px] font-medium text-white bg-[#c9440e] px-4 py-2 rounded-full hover:opacity-90 transition"
              >
                Passer à Pro ✦
              </a>
            </div>
          </>
        )}
      </div>

      {/* ── Notifications ── */}
      <div className="mb-8">
        <SectionTitle>Notifications</SectionTitle>

        <Row
          label="Rappels de lecture"
          sub="Une notification quotidienne si tu n'as pas ouvert l'app"
          right={
            <Toggle
              value={notifReminders}
              onChange={v => handleToggle('notif_reminders', v, setNotifReminders)}
            />
          }
        />
        <div className="h-px bg-white/5 mx-6" />
        <Row
          label="Nouveaux abonnés"
          sub="Quand quelqu'un commence à te suivre"
          right={
            <Toggle
              value={notifFollowers}
              onChange={v => handleToggle('notif_followers', v, setNotifFollowers)}
            />
          }
        />
        {prefSaving && <p className="text-[10px] text-[#7a7268] px-6 pb-2">Sauvegarde...</p>}
      </div>

      {/* ── Confidentialité ── */}
      <div className="mb-8">
        <SectionTitle>Confidentialité</SectionTitle>

        <Row
          label="Profil public"
          sub="Les autres lecteurs peuvent voir ta bibliothèque et tes fiches"
          right={
            <Toggle
              value={isPublic}
              onChange={v => handleToggle('is_public', v, setIsPublic)}
            />
          }
        />
      </div>

      {/* ── Zone de danger ── */}
      <div className="mb-4">
        <SectionTitle>Zone de danger</SectionTitle>

        <div className="px-6 py-4">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-red-500/40 text-[13px] hover:text-red-500/70 transition"
            >
              Supprimer mon compte
            </button>
          ) : (
            <div className="border border-red-500/20 rounded-xl px-4 py-4">
              <p className="text-white/70 text-[13px] mb-1">Suppression définitive</p>
              <p className="text-[#7a7268] text-[12px] mb-4 leading-snug">
                Toutes tes données seront effacées : bibliothèque, fiches, citations, abonnements.
                Cette action est irréversible.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[#7a7268] text-[12px] px-4 py-1.5 rounded-full border border-white/10 hover:text-white transition"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="text-white text-[12px] px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
                >
                  {deleting ? 'Suppression...' : 'Confirmer la suppression'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
