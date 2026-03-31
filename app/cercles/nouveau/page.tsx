'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const COLORS = [
  { value: '#c9440e', label: 'Terracotta' },
  { value: '#7c6fcd', label: 'Violet' },
  { value: '#2a9d8f', label: 'Emeraude' },
  { value: '#e9c46a', label: 'Or' },
  { value: '#457b9d', label: 'Bleu' },
  { value: '#e76f51', label: 'Corail' },
]

export default function NouveauCerclePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#c9440e')
  const [isPrivate, setIsPrivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setUserId(data.user.id)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !userId || submitting) return

    setSubmitting(true)
    setError('')

    try {
      const { data: circle, error: circleErr } = await supabase
        .from('circles')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          cover_color: color,
          is_private: isPrivate,
          owner_id: userId,
        })
        .select('id')
        .single()

      if (circleErr) throw new Error(circleErr.message)
      if (!circle) throw new Error('Cercle non créé')

      const { error: memberErr } = await supabase
        .from('circle_members')
        .insert({ circle_id: circle.id, user_id: userId, role: 'owner' })

      if (memberErr) throw new Error(memberErr.message)

      window.location.href = `/cercles/${circle.id}`
    } catch (e: any) {
      setError(e.message || 'Une erreur est survenue. Réessaie.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1714] text-white">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 flex items-center gap-3">
        <a
          href="/cercles"
          className="text-[#7a7268] p-1 -ml-1 hover:text-white transition"
          aria-label="Retour"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </a>
        <h1 className="font-serif text-2xl text-white">Nouveau cercle</h1>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="px-5 flex flex-col gap-5 pb-16">

        {/* Nom */}
        <div>
          <label className="text-[#7a7268] text-xs font-medium uppercase tracking-wide block mb-2">
            Nom du cercle *
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex : Club philo, Romans noirs…"
            maxLength={60}
            className="w-full bg-[#242018] border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-[#7a7268] outline-none focus:border-[#c9440e] transition"
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[#7a7268] text-xs font-medium uppercase tracking-wide block mb-2">
            Description <span className="normal-case">(optionnel)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="En quelques mots…"
            maxLength={200}
            rows={3}
            className="w-full bg-[#242018] border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-[#7a7268] outline-none focus:border-[#c9440e] transition resize-none"
          />
        </div>

        {/* Couleur */}
        <div>
          <label className="text-[#7a7268] text-xs font-medium uppercase tracking-wide block mb-3">
            Couleur
          </label>
          <div className="flex gap-3 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                aria-label={c.label}
                className="w-10 h-10 rounded-full transition-transform active:scale-95"
                style={{
                  backgroundColor: c.value,
                  boxShadow: color === c.value ? `0 0 0 3px #1a1714, 0 0 0 5px ${c.value}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Privé */}
        <div>
          <label className="text-[#7a7268] text-xs font-medium uppercase tracking-wide block mb-3">
            Visibilité
          </label>
          <button
            type="button"
            onClick={() => setIsPrivate(p => !p)}
            className="flex items-center gap-4 w-full bg-[#242018] border border-white/10 rounded-xl px-4 py-4 text-left"
          >
            <div
              className="w-12 h-6 rounded-full relative shrink-0 transition-colors duration-200"
              style={{ backgroundColor: isPrivate ? color : 'rgba(255,255,255,0.15)' }}
            >
              <span
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
                style={{ left: isPrivate ? '28px' : '4px' }}
              />
            </div>
            <div>
              <p className="text-white text-sm font-medium">{isPrivate ? 'Cercle privé' : 'Cercle public'}</p>
              <p className="text-[#7a7268] text-xs mt-0.5">
                {isPrivate ? 'Visible uniquement par les membres' : 'Visible par tous les utilisateurs'}
              </p>
            </div>
          </button>
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Aperçu couleur */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3 border"
          style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}25` }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-medium">{name || 'Nom du cercle'}</p>
            <p className="text-[#7a7268] text-xs mt-0.5">Aperçu</p>
          </div>
        </div>

        {/* Bouton */}
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="w-full bg-[#c9440e] text-white font-medium py-4 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Création en cours…' : 'Créer le cercle'}
        </button>
      </form>
    </div>
  )
}
