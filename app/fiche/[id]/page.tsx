'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

export default function Fiche() {
  const params = useParams()
  const id = params.id as string
  const [reading, setReading] = useState<any>(null)
  const [note, setNote] = useState('')
  const [rating, setRating] = useState(0)
  const [citation, setCitation] = useState('')
  const [citations, setCitations] = useState<any[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (id) loadReading()
  }, [id])

  const loadReading = async () => {
    const { data } = await supabase
      .from('readings').select('*, books(*)').eq('id', id).single()
    if (data) { setReading(data); setRating(data.rating || 0) }
    const { data: notesData } = await supabase
      .from('notes').select('*').eq('reading_id', id).single()
    if (notesData) setNote(notesData.content || '')
    const { data: citationsData } = await supabase
      .from('citations').select('*').eq('reading_id', id)
    setCitations(citationsData || [])
  }

  const saveNote = async () => {
    const { data: existing } = await supabase.from('notes').select('id').eq('reading_id', id).single()
    if (existing) {
      await supabase.from('notes').update({ content: note, updated_at: new Date() }).eq('id', existing.id)
    } else {
      await supabase.from('notes').insert({ reading_id: id, user_id: reading.user_id, content: note })
    }
    await supabase.from('readings').update({ rating }).eq('id', id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addCitation = async () => {
    if (!citation.trim()) return
    await supabase.from('citations').insert({ reading_id: id, user_id: reading.user_id, content: citation })
    setCitation('')
    loadReading()
  }

  const updateStatus = async (status: string) => {
    await supabase.from('readings').update({ status }).eq('id', id)
    setReading({ ...reading, status })
  }

  if (!reading) return (
    <div className="min-h-screen bg-[#1a1714] flex items-center justify-center">
      <div className="text-[#7a7268] text-sm">Chargement...</div>
    </div>
  )

  const statusLabel: Record<string, string> = { a_lire: 'À lire', en_cours: 'En cours', lu: 'Lu' }
  const ratingLabel = ['', 'Pas convaincu', 'Correct', 'Bien', 'Très bon', "Chef-d'œuvre"]

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <a href="/bibliotheque" className="text-[#7a7268] hover:text-white transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </a>
        <span className="text-[#7a7268] text-sm">Ma bibliothèque</span>
      </div>

      {/* Book header */}
      <div className="px-5 pb-6 border-b border-white/10">
        <div className="flex gap-4 items-start">
          <div className="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-[#242018]">
            {reading.books?.cover_url ? (
              <img src={reading.books.cover_url} className="w-full h-full object-cover" alt={reading.books.title} />
            ) : (
              <div className="w-full h-full flex items-end p-2 bg-gradient-to-b from-[#2e2a24] to-[#1a1714]">
                <p className="font-serif text-xs text-white/50 leading-tight line-clamp-4">{reading.books?.title}</p>
              </div>
            )}
          </div>
          <div className="flex-1 pt-1">
            <h1 className="font-serif text-xl leading-tight mb-1">{reading.books?.title}</h1>
            <p className="text-[#7a7268] text-sm mb-4">{reading.books?.author}</p>
            <div className="flex gap-2 flex-wrap">
              {(['a_lire', 'en_cours', 'lu'] as const).map(s => (
                <button key={s} onClick={() => updateStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${reading.status === s ? 'bg-[#c9440e] text-white' : 'border border-white/15 text-[#7a7268] hover:text-white'}`}>
                  {statusLabel[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-6 flex flex-col gap-8">
        {/* Rating */}
        <div>
          <p className="text-[10px] text-[#7a7268] uppercase tracking-widest mb-3">Ma note</p>
          <div className="flex gap-3 mb-2">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)} className={`text-3xl transition ${n <= rating ? 'text-[#c9440e]' : 'text-white/15 hover:text-white/40'}`}>★</button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-[#7a7268] text-sm italic">{ratingLabel[rating]}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <p className="text-[10px] text-[#7a7268] uppercase tracking-widest mb-3">Ma fiche de lecture</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Tes impressions, ce qui t'a marqué, l'essentiel du livre..."
            rows={6}
            className="w-full bg-[#242018] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e] transition resize-none leading-relaxed"
          />
        </div>

        <button
          onClick={saveNote}
          className={`py-3 rounded-full text-sm font-medium transition ${saved ? 'bg-[#2e7d32] text-white' : 'bg-[#c9440e] text-white hover:opacity-90'}`}
        >
          {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
        </button>

        {/* Citations */}
        <div>
          <p className="text-[10px] text-[#7a7268] uppercase tracking-widest mb-3">Mes citations</p>
          {citations.length > 0 && (
            <div className="flex flex-col gap-3 mb-4">
              {citations.map(c => (
                <div key={c.id} className="bg-[#242018] border-l-2 border-[#c9440e] px-4 py-3 rounded-r-xl">
                  <p className="font-serif italic text-sm leading-relaxed text-white/80">« {c.content} »</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ajouter une citation..."
              value={citation}
              onChange={e => setCitation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCitation()}
              className="flex-1 bg-[#242018] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e] transition"
            />
            <button onClick={addCitation} className="bg-[#c9440e] text-white w-12 rounded-xl text-lg hover:opacity-90 transition flex items-center justify-center">+</button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}