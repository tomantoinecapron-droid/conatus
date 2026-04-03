'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

const STATUS_LABEL: Record<string, string> = { a_lire: 'À lire', en_cours: 'En cours', lu: 'Lu' }
const RATING_LABEL = ['', 'Pas convaincu', 'Correct', 'Bien', 'Très bon', "Chef-d'œuvre"]

export default function Fiche() {
  const params = useParams()
  const id = params.id as string

  const [reading, setReading] = useState<any>(null)
  const [note, setNote] = useState('')
  const [noteId, setNoteId] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [citations, setCitations] = useState<any[]>([])
  const [newCitation, setNewCitation] = useState('')
  const [newCitationPage, setNewCitationPage] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'saved'>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)

  // Nouveaux champs
  const [startedAt, setStartedAt] = useState('')
  const [finishedAt, setFinishedAt] = useState('')
  const [recommendedBy, setRecommendedBy] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (id) loadAll()
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [id])

  const loadAll = async () => {
    const [readingRes, noteRes, citationsRes] = await Promise.all([
      supabase.from('readings').select('*, books(*)').eq('id', id).single(),
      supabase.from('notes').select('*').eq('reading_id', id).single(),
      supabase.from('citations').select('*').eq('reading_id', id).order('created_at'),
    ])
    if (readingRes.data) {
      const r = readingRes.data
      setReading(r)
      setRating(r.rating || 0)
      setStartedAt(r.started_at ? r.started_at.slice(0, 10) : '')
      setFinishedAt(r.finished_at ? r.finished_at.slice(0, 10) : '')
      setRecommendedBy(r.recommended_by || '')
      setIsPublic(r.is_public || false)
    }
    if (noteRes.data) {
      setNote(noteRes.data.content || '')
      setNoteId(noteRes.data.id)
    }
    setCitations(citationsRes.data || [])
    setLoading(false)
  }

  // ── Sauvegarde note + rating (debounced) ──────────────────────────────────

  const doSave = async (currentNote: string, currentRating: number) => {
    if (!reading) return
    const ops: Promise<any>[] = [
      supabase.from('readings').update({ rating: currentRating }).eq('id', id),
    ]
    if (noteId) {
      ops.push(supabase.from('notes').update({ content: currentNote, updated_at: new Date().toISOString() }).eq('id', noteId))
    } else if (currentNote.trim()) {
      ops.push(
        supabase.from('notes').insert({ reading_id: id, user_id: reading.user_id, content: currentNote })
          .select('id').single()
          .then(({ data }) => { if (data?.id) setNoteId(data.id) })
      )
    }
    await Promise.all(ops)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const handleNoteChange = (value: string) => {
    setNote(value)
    setSaveStatus('pending')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => doSave(value, rating), 2000)
  }

  const handleRatingChange = (n: number) => {
    const next = n === rating ? 0 : n
    setRating(next)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    doSave(note, next)
  }

  // ── Champs annexes (save on blur) ─────────────────────────────────────────

  const saveField = async (field: string, value: string) => {
    await supabase.from('readings').update({ [field]: value || null }).eq('id', id)
  }

  const updateStatus = async (status: string) => {
    await supabase.from('readings').update({ status }).eq('id', id)
    setReading((r: any) => ({ ...r, status }))
  }

  // ── Citations ─────────────────────────────────────────────────────────────

  const addCitation = async () => {
    if (!newCitation.trim() || !reading) return
    const payload: any = { reading_id: id, user_id: reading.user_id, content: newCitation.trim() }
    const pageNum = parseInt(newCitationPage)
    if (!isNaN(pageNum) && pageNum > 0) payload.page = pageNum
    const { data } = await supabase.from('citations').insert(payload).select().single()
    if (data) setCitations(prev => [...prev, data])
    setNewCitation('')
    setNewCitationPage('')
  }

  const deleteCitation = async (citId: string) => {
    await supabase.from('citations').delete().eq('id', citId)
    setCitations(prev => prev.filter(c => c.id !== citId))
  }

  // ── Partage ───────────────────────────────────────────────────────────────

  const handleShare = async () => {
    if (!isPublic) {
      await supabase.from('readings').update({ is_public: true }).eq('id', id)
      setIsPublic(true)
    }
    const url = `${window.location.origin}/fiche/public/${id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // fallback silencieux
    }
    setCopyStatus('copied')
    setTimeout(() => setCopyStatus('idle'), 2500)
  }

  // ── Suppression ───────────────────────────────────────────────────────────

  const deleteReading = async () => {
    setDeleting(true)
    await supabase.from('readings').delete().eq('id', id)
    window.location.href = '/bibliotheque'
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex items-center justify-center">
        <div className="text-[#7a7268] text-sm">Chargement...</div>
      </div>
    )
  }

  if (!reading) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex flex-col items-center justify-center gap-3 pb-24">
        <p className="text-white font-serif text-lg">Lecture introuvable</p>
        <a href="/bibliotheque" className="text-[#c9440e] text-sm">← Bibliothèque</a>
        <BottomNav />
      </div>
    )
  }

  const book = reading.books
  const showStartedAt = reading.status === 'en_cours' || reading.status === 'lu'
  const showFinishedAt = reading.status === 'lu'

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-28">

      {/* ── Navigation ── */}
      <div className="px-5 pt-12 pb-2 flex items-center justify-between">
        <a href="/bibliotheque" className="text-[#7a7268] hover:text-white transition flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          <span className="text-xs">Bibliothèque</span>
        </a>

        {/* Bouton partager */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-[#7a7268] hover:text-white transition text-xs"
        >
          {copyStatus === 'copied' ? (
            <span className="text-emerald-400 text-[11px]">Lien copié ✓</span>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>{isPublic ? 'Partager' : 'Rendre public'}</span>
            </>
          )}
        </button>
      </div>

      {/* ── En-tête livre ── */}
      <div className="px-5 pt-3 pb-6 border-b border-white/8">
        <h1 className="font-serif text-[26px] leading-tight text-white mb-1.5">{book?.title}</h1>
        <p className="text-[#7a7268] text-sm mb-3">{book?.author}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {book?.category && (
            <span className="text-white/50 text-[10px] border border-white/15 rounded px-2 py-0.5 leading-none">
              {book.category}
            </span>
          )}
          {book?.published_year && (
            <span className="text-[#7a7268] text-[11px]">{book.published_year}</span>
          )}
        </div>
      </div>

      {/* ── Statut ── */}
      <div className="px-5 py-5 border-b border-white/8">
        <p className="text-[9px] text-[#7a7268] uppercase tracking-widest mb-3">Statut</p>
        <div className="flex gap-2">
          {(['a_lire', 'en_cours', 'lu'] as const).map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                reading.status === s
                  ? 'bg-[#c9440e] text-white'
                  : 'border border-white/15 text-[#7a7268] hover:border-white/30 hover:text-white'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dates + recommandé par ── */}
      {(showStartedAt || recommendedBy !== undefined) && (
        <div className="px-5 py-5 border-b border-white/8 flex flex-col gap-4">

          {showStartedAt && (
            <div className="flex items-center gap-4">
              <label className="text-[9px] text-[#7a7268] uppercase tracking-widest shrink-0 w-20">Commencé le</label>
              <input
                type="date"
                value={startedAt}
                onChange={e => setStartedAt(e.target.value)}
                onBlur={e => saveField('started_at', e.target.value)}
                className="bg-transparent text-white/70 text-[13px] outline-none border-b border-white/10 focus:border-[#c9440e]/40 transition pb-0.5 flex-1 max-w-[160px]"
              />
            </div>
          )}

          {showFinishedAt && (
            <div className="flex items-center gap-4">
              <label className="text-[9px] text-[#7a7268] uppercase tracking-widest shrink-0 w-20">Terminé le</label>
              <input
                type="date"
                value={finishedAt}
                onChange={e => setFinishedAt(e.target.value)}
                onBlur={e => saveField('finished_at', e.target.value)}
                className="bg-transparent text-white/70 text-[13px] outline-none border-b border-white/10 focus:border-[#c9440e]/40 transition pb-0.5 flex-1 max-w-[160px]"
              />
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="text-[9px] text-[#7a7268] uppercase tracking-widest shrink-0 w-20">Recommandé</label>
            <input
              type="text"
              placeholder="Par qui ou quoi..."
              value={recommendedBy}
              onChange={e => setRecommendedBy(e.target.value)}
              onBlur={e => saveField('recommended_by', e.target.value)}
              className="bg-transparent text-white/70 text-[13px] placeholder-[#7a7268]/30 outline-none border-b border-white/10 focus:border-[#c9440e]/40 transition pb-0.5 flex-1"
            />
          </div>
        </div>
      )}

      {/* ── Note étoiles ── */}
      <div className="px-5 py-5 border-b border-white/8">
        <p className="text-[9px] text-[#7a7268] uppercase tracking-widest mb-3">Ma note</p>
        <div className="flex gap-2 mb-1.5">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => handleRatingChange(n)}
              className={`text-[28px] leading-none transition ${n <= rating ? 'text-[#c9440e]' : 'text-white/15 hover:text-white/35'}`}
            >
              ★
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-[#7a7268] text-xs italic">{RATING_LABEL[rating]}</p>
        )}
      </div>

      {/* ── Fiche de lecture ── */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] text-[#7a7268] uppercase tracking-widest">Ma fiche</p>
          <span className={`text-[10px] transition ${
            saveStatus === 'saved' ? 'text-emerald-400' :
            saveStatus === 'pending' ? 'text-[#7a7268]' : 'opacity-0'
          }`}>
            {saveStatus === 'saved' ? 'Sauvegardé ✓' : 'Sauvegarde...'}
          </span>
        </div>
        <textarea
          value={note}
          onChange={e => handleNoteChange(e.target.value)}
          placeholder="Tes impressions, ce qui t'a marqué, les idées à retenir..."
          rows={8}
          className="w-full bg-[#242018] border border-white/8 rounded-xl px-4 py-3.5 text-white placeholder-[#7a7268]/40 text-sm outline-none focus:border-[#c9440e]/40 transition resize-none leading-relaxed"
        />
      </div>

      {/* ── Citations ── */}
      <div className="px-5 py-5 border-b border-white/8">
        <p className="text-[9px] text-[#7a7268] uppercase tracking-widest mb-4">Citations</p>

        {citations.length > 0 && (
          <div className="flex flex-col gap-3 mb-5">
            {citations.map(c => (
              <div key={c.id} className="flex items-start gap-3 group">
                <div className="flex-1 border-l-2 border-[#c9440e]/30 pl-3.5 py-1">
                  <p className="font-serif italic text-[14px] leading-relaxed text-white/70">
                    « {c.content} »
                  </p>
                  {c.page && (
                    <p className="text-[#7a7268]/50 text-[10px] mt-1">p. {c.page}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteCitation(c.id)}
                  className="mt-1.5 text-[#7a7268] opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all shrink-0"
                  aria-label="Supprimer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter une citation */}
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Ajouter une citation..."
            value={newCitation}
            onChange={e => setNewCitation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addCitation()}
            className="w-full bg-[#242018] border border-white/8 rounded-xl px-4 py-2.5 text-white placeholder-[#7a7268]/40 text-sm outline-none focus:border-[#c9440e]/40 transition"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Page (optionnel)"
              value={newCitationPage}
              onChange={e => setNewCitationPage(e.target.value)}
              min="1"
              className="w-36 bg-[#242018] border border-white/8 rounded-xl px-4 py-2 text-white placeholder-[#7a7268]/40 text-sm outline-none focus:border-[#c9440e]/40 transition"
            />
            <button
              onClick={addCitation}
              disabled={!newCitation.trim()}
              className="flex-1 bg-[#c9440e] text-white rounded-xl text-sm hover:opacity-90 transition disabled:opacity-30 py-2 font-medium"
            >
              Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* ── Supprimer ── */}
      <div className="px-5 py-6">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-red-500/40 text-xs hover:text-red-500/70 transition"
          >
            Supprimer ce livre de ma bibliothèque
          </button>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-white/50 text-xs">Confirmer la suppression ?</p>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[#7a7268] text-xs px-3 py-1.5 rounded-full border border-white/10 hover:text-white transition"
            >
              Annuler
            </button>
            <button
              onClick={deleteReading}
              disabled={deleting}
              className="text-white text-xs px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleting ? '…' : 'Supprimer'}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
