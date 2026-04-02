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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'saved'>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)

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
      setReading(readingRes.data)
      setRating(readingRes.data.rating || 0)
    }
    if (noteRes.data) {
      setNote(noteRes.data.content || '')
      setNoteId(noteRes.data.id)
    }
    setCitations(citationsRes.data || [])
    setLoading(false)
  }

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

  const updateStatus = async (status: string) => {
    await supabase.from('readings').update({ status }).eq('id', id)
    setReading((r: any) => ({ ...r, status }))
  }

  const addCitation = async () => {
    if (!newCitation.trim() || !reading) return
    const { data } = await supabase.from('citations')
      .insert({ reading_id: id, user_id: reading.user_id, content: newCitation.trim() })
      .select().single()
    if (data) setCitations(prev => [...prev, data])
    setNewCitation('')
  }

  const deleteCitation = async (citId: string) => {
    await supabase.from('citations').delete().eq('id', citId)
    setCitations(prev => prev.filter(c => c.id !== citId))
  }

  const deleteReading = async () => {
    setDeleting(true)
    await supabase.from('readings').delete().eq('id', id)
    window.location.href = '/bibliotheque'
  }

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

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-28">

      {/* ── Retour ── */}
      <div className="px-5 pt-12 pb-2 flex items-center gap-2">
        <a href="/bibliotheque" className="text-[#7a7268] hover:text-white transition flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          <span className="text-xs">Ma bibliothèque</span>
        </a>
      </div>

      {/* ── Header livre ── */}
      <div className="px-5 pt-3 pb-6 border-b border-white/8">
        <h1 className="font-serif text-[26px] leading-tight text-white mb-1.5">
          {book?.title}
        </h1>
        <p className="text-[#7a7268] text-sm mb-3">{book?.author}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {book?.category && (
            <span className="text-white/60 text-[10px] border border-white/20 bg-white/5 rounded px-2 py-0.5 leading-none">
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
          <p className="text-[9px] text-[#7a7268] uppercase tracking-widest">Ma fiche de lecture</p>
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
          className="w-full bg-[#242018] border border-white/8 rounded-xl px-4 py-3.5 text-white placeholder-[#7a7268]/50 text-sm outline-none focus:border-[#c9440e]/50 transition resize-none leading-relaxed"
        />
      </div>

      {/* ── Citations ── */}
      <div className="px-5 py-5 border-b border-white/8">
        <p className="text-[9px] text-[#7a7268] uppercase tracking-widest mb-4">Mes citations</p>

        {citations.length > 0 && (
          <div className="flex flex-col gap-2.5 mb-4">
            {citations.map(c => (
              <div key={c.id} className="flex items-start gap-3 group">
                <div className="flex-1 bg-[#242018] border-l-2 border-[#c9440e]/50 px-3.5 py-2.5 rounded-r-xl">
                  <p className="font-serif italic text-sm leading-relaxed text-white/75">« {c.content} »</p>
                </div>
                <button
                  onClick={() => deleteCitation(c.id)}
                  className="mt-2 text-[#7a7268] opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all shrink-0"
                  aria-label="Supprimer la citation"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ajouter une citation..."
            value={newCitation}
            onChange={e => setNewCitation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCitation()}
            className="flex-1 bg-[#242018] border border-white/8 rounded-xl px-4 py-2.5 text-white placeholder-[#7a7268]/50 text-sm outline-none focus:border-[#c9440e]/50 transition"
          />
          <button
            onClick={addCitation}
            className="bg-[#c9440e] text-white w-11 rounded-xl text-xl hover:opacity-90 transition flex items-center justify-center font-medium leading-none"
          >
            +
          </button>
        </div>
      </div>

      {/* ── Supprimer ── */}
      <div className="px-5 py-6">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-red-500/50 text-xs hover:text-red-500/80 transition"
          >
            Supprimer ce livre de ma bibliothèque
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-white/60 text-xs">Confirmer la suppression ?</p>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[#7a7268] text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:text-white transition"
            >
              Annuler
            </button>
            <button
              onClick={deleteReading}
              disabled={deleting}
              className="text-white text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
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
