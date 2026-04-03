'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

const RATING_LABEL = ['', 'Pas convaincu', 'Correct', 'Bien', 'Très bon', "Chef-d'œuvre"]

export default function FichePublique() {
  const params = useParams()
  const id = params.id as string

  const [reading, setReading] = useState<any>(null)
  const [note, setNote] = useState('')
  const [citations, setCitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const [readingRes, noteRes, citationsRes] = await Promise.all([
        supabase.from('readings').select('*, books(*)')
          .eq('id', id).eq('is_public', true).single(),
        supabase.from('notes').select('content').eq('reading_id', id).single(),
        supabase.from('citations').select('*').eq('reading_id', id).order('created_at'),
      ])

      if (!readingRes.data) { setNotFound(true); setLoading(false); return }
      setReading(readingRes.data)
      setNote(noteRes.data?.content || '')
      setCitations(citationsRes.data || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex items-center justify-center">
        <div className="text-[#7a7268] text-sm">Chargement...</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-serif text-[22px] text-white">Fiche introuvable</p>
        <p className="text-[#7a7268] text-sm leading-relaxed max-w-xs">
          Cette fiche n'est pas partagée ou n'existe pas.
        </p>
        <a href="/" className="text-[#c9440e] text-sm mt-2">← Conatus</a>
      </div>
    )
  }

  const book = reading.books
  const rating = reading.rating || 0

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-16">

      {/* ── Branding discret ── */}
      <div className="px-6 pt-10 pb-2 flex items-center justify-between">
        <a href="/" className="text-[#7a7268]/50 text-[11px] hover:text-[#7a7268] transition">
          Conatus
        </a>
        <span className="text-[#7a7268]/30 text-[10px] italic">Fiche partagée</span>
      </div>

      {/* ── Livre ── */}
      <div className="px-6 pt-4 pb-6 border-b border-white/6">
        <h1 className="font-serif text-[28px] leading-tight text-white mb-1.5">{book?.title}</h1>
        <p className="text-[#7a7268] text-[14px] mb-3">{book?.author}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {book?.category && (
            <span className="text-white/40 text-[10px] border border-white/10 rounded px-2 py-0.5 leading-none">
              {book.category}
            </span>
          )}
          {book?.published_year && (
            <span className="text-[#7a7268]/60 text-[11px]">{book.published_year}</span>
          )}
        </div>
      </div>

      {/* ── Note ── */}
      {rating > 0 && (
        <div className="px-6 py-5 border-b border-white/6">
          <p className="text-[9px] text-[#7a7268] uppercase tracking-widest mb-2">Note</p>
          <div className="flex items-center gap-2">
            <span className="text-[#c9440e]/70 text-[22px] tracking-[-1px] leading-none">
              {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
            </span>
            <span className="text-[#7a7268] text-[12px] italic">{RATING_LABEL[rating]}</span>
          </div>
        </div>
      )}

      {/* ── Fiche de lecture ── */}
      {note && (
        <div className="px-6 py-5 border-b border-white/6">
          <p className="text-[9px] text-[#7a7268] uppercase tracking-widest mb-4">Fiche de lecture</p>
          <p className="text-white/65 text-[14px] leading-relaxed whitespace-pre-wrap font-serif">
            {note}
          </p>
        </div>
      )}

      {/* ── Citations ── */}
      {citations.length > 0 && (
        <div className="px-6 py-5">
          <p className="text-[9px] text-[#7a7268] uppercase tracking-widest mb-5">Citations</p>
          <div className="flex flex-col gap-4">
            {citations.map(c => (
              <div key={c.id} className="border-l-2 border-[#c9440e]/25 pl-4 py-0.5">
                <p className="font-serif italic text-[14px] leading-relaxed text-white/60">
                  « {c.content} »
                </p>
                {c.page && (
                  <p className="text-[#7a7268]/40 text-[10px] mt-1.5">p. {c.page}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="px-6 pt-8 pb-4 border-t border-white/5 flex items-center justify-between">
        <p className="text-[#7a7268]/30 text-[11px] italic">Partagé via Conatus</p>
        <a
          href="/"
          className="text-[#c9440e]/50 text-[11px] hover:text-[#c9440e] transition"
        >
          Rejoindre →
        </a>
      </div>
    </div>
  )
}
