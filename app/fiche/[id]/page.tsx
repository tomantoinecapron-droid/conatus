'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Fiche() {
  const params = useParams()
  const id = params.id
  const [reading, setReading] = useState(null)
  const [note, setNote] = useState('')
  const [rating, setRating] = useState(0)
  const [citation, setCitation] = useState('')
  const [citations, setCitations] = useState([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (id) loadReading()
  }, [id])

  const loadReading = async () => {
    const { data } = await supabase
      .from('readings')
      .select('*, books(*)')
      .eq('id', id)
      .single()
    if (data) {
      setReading(data)
      setRating(data.rating || 0)
    }
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

  const updateStatus = async (status) => {
    await supabase.from('readings').update({ status }).eq('id', id)
    setReading({ ...reading, status })
  }

  if (!reading) return (
    <div className="min-h-screen bg-[#1a1714] flex items-center justify-center text-white">
      Chargement...
    </div>
  )

  const statusLabel = { a_lire: 'À lire', en_cours: 'En cours', lu: 'Lu ✓' }

  return (
    <div className="min-h-screen bg-[#1a1714] text-white">
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <a href="/bibliotheque" className="text-[#7a7268] text-sm hover:text-white transition">← Ma bibliothèque</a>
        <a href="/" className="text-2xl font-serif">con<span className="text-[#c9440e]">a</span>tus</a>
        <div className="w-24" />
      </div>

      <div className="bg-[#242018] border-b border-white/10 px-6 py-8">
        <div className="max-w-2xl mx-auto flex gap-6 items-start">
          {reading.books?.cover_url ? (
            <img src={reading.books.cover_url} className="w-20 h-28 rounded object-cover flex-shrink-0 shadow-lg" />
          ) : (
            <div className="w-20 h-28 bg-[#3a3530] rounded flex-shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="font-serif text-2xl leading-tight mb-1">{reading.books?.title}</h1>
            <p className="text-[#7a7268] mb-4">{reading.books?.author}</p>
            <div className="flex gap-2 flex-wrap">
              {['a_lire', 'en_cours', 'lu'].map(s => (
                <button key={s} onClick={() => updateStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${reading.status === s ? 'bg-[#c9440e] text-white' : 'border border-white/20 text-[#7a7268] hover:text-white'}`}>
                  {statusLabel[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div>
          <p className="text-xs text-[#7a7268] uppercase tracking-widest mb-3">Ma note</p>
          <div className="flex gap-2 mb-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)} className={`text-3xl transition ${n <= rating ? 'text-[#c9440e]' : 'text-white/20'}`}>★</button>
            ))}
          </div>
          <p className="text-[#7a7268] text-sm italic">
            {['', 'Pas convaincu', 'Correct', 'Bien', 'Très bon', 'Chef-d\'œuvre'][rating]}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#7a7268] uppercase tracking-widest mb-3">Ma fiche de lecture</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Tes impressions, ce qui t'a marqué, l'essentiel du livre..."
            rows={6}
            className="w-full bg-[#242018] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e] transition resize-none"
          />
        </div>

        <button onClick={saveNote} className={`py-3 rounded-xl text-sm font-medium transition ${saved ? 'bg-green-600 text-white' : 'bg-[#c9440e] text-white hover:opacity-90'}`}>
          {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
        </button>

        <div>
          <p className="text-xs text-[#7a7268] uppercase tracking-widest mb-3">Mes citations</p>
          {citations.map(c => (
            <div key={c.id} className="bg-[#242018] border-l-2 border-[#c9440e] px-4 py-3 rounded-r-xl mb-3">
              <p className="font-serif italic text-sm leading-relaxed">« {c.content} »</p>
            </div>
          ))}
          <div className="flex gap-3 mt-3">
            <input
              type="text"
              placeholder="Ajouter une citation..."
              value={citation}
              onChange={e => setCitation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCitation()}
              className="flex-1 bg-[#242018] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e] transition"
            />
            <button onClick={addCitation} className="bg-[#c9440e] text-white px-4 py-3 rounded-xl text-sm hover:opacity-90 transition">+</button>
          </div>
        </div>
      </div>
    </div>
  )
}