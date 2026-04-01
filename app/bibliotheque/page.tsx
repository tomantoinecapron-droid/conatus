'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

// ── Catégories normalisées ─────────────────────────────────────────────────

const CATEGORY_LIST = [
  'Philosophie',
  'Littérature française',
  'Littérature étrangère',
  'Sciences humaines',
  'Histoire',
  'Droit & Politique',
  'Sciences & Tech',
  'Développement personnel',
  'BD & Manga',
  'Autre',
] as const

type Category = typeof CATEGORY_LIST[number]

function normalizeCategory(cats?: string[]): Category {
  if (!cats?.length) return 'Autre'
  const s = cats.join(' ').toLowerCase()
  if (/philo/.test(s)) return 'Philosophie'
  if (/litt.*fr|french lit|po[eé]sie/.test(s)) return 'Littérature française'
  if (/fiction|novel|litt[eé]|roman/.test(s)) return 'Littérature étrangère'
  if (/social|psycho|sociolog|anthropo|linguist|educat/.test(s)) return 'Sciences humaines'
  if (/histor|biograph/.test(s)) return 'Histoire'
  if (/\blaw\b|droit|polit/.test(s)) return 'Droit & Politique'
  if (/science|technolog|math|physic|comput|biolog|nature/.test(s)) return 'Sciences & Tech'
  if (/self.help|personal.develop|self develop|motivat|coaching/.test(s)) return 'Développement personnel'
  if (/comic|manga|bande.dessin|graphic novel/.test(s)) return 'BD & Manga'
  return 'Autre'
}

// ── Statuts ────────────────────────────────────────────────────────────────

type Status = 'tous' | 'en_cours' | 'lu' | 'a_lire'

const STATUS_FILTERS: { key: Status; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'lu', label: 'Lu' },
  { key: 'a_lire', label: 'À lire' },
]

const STATUS_LABEL: Record<string, string> = {
  a_lire: 'À lire',
  en_cours: 'En cours',
  lu: 'Lu',
}

const STATUS_COLOR: Record<string, string> = {
  a_lire: 'text-[#7a7268]',
  en_cours: 'text-[#c9440e]',
  lu: 'text-emerald-400',
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Bibliotheque() {
  const [user, setUser] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [myBooks, setMyBooks] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [activeStatus, setActiveStatus] = useState<Status>('tous')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setUser(data.user)
      loadMyBooks(data.user.id)
    })
  }, [])

  const loadMyBooks = async (userId: string) => {
    const { data } = await supabase
      .from('readings')
      .select('*, books(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setMyBooks(data || [])
  }

  const searchBooks = async () => {
    if (!search.trim()) return
    setLoadingSearch(true)
    const q = encodeURIComponent(search.trim())
    const key = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&key=${key}&maxResults=20`)
      const data = await res.json()
      const items = (data.items || [])
        .map((item: any) => ({
          _id: item.id,
          title: item.volumeInfo.title,
          author: item.volumeInfo.authors?.[0],
          cover: item.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
          isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier,
          published_year: item.volumeInfo.publishedDate?.slice(0, 4),
          rawCategories: item.volumeInfo.categories,
        }))
        .filter((b: any) => b.title?.trim() && b.author?.trim() && b.published_year)
      setResults(items)
    } catch {
      setResults([])
    } finally {
      setLoadingSearch(false)
    }
  }

  const addBook = async (book: any) => {
    const category = normalizeCategory(book.rawCategories)
    const { data: existingBook } = await supabase
      .from('books').select('id').eq('isbn', book.isbn).single()
    let bookId
    if (existingBook) {
      bookId = existingBook.id
    } else {
      const { data: newBook } = await supabase.from('books').insert({
        title: book.title,
        author: book.author || 'Auteur inconnu',
        cover_url: book.cover || null,
        isbn: book.isbn || book._id,
        published_year: book.published_year ? Number(book.published_year) : null,
        category,
      }).select().single()
      bookId = newBook?.id
    }
    if (!bookId) return
    await supabase.from('readings').insert({ user_id: user.id, book_id: bookId, status: 'a_lire' })
    setResults([])
    setSearch('')
    loadMyBooks(user.id)
  }

  const deleteReading = async (readingId: string) => {
    setDeleting(true)
    await supabase.from('readings').delete().eq('id', readingId)
    setMyBooks(prev => prev.filter(r => r.id !== readingId))
    setConfirmDeleteId(null)
    setDeleting(false)
  }

  // ── Dérivés ──────────────────────────────────────────────────────────────

  // Livres filtrés par statut
  const byStatus = activeStatus === 'tous'
    ? myBooks
    : myBooks.filter(r => r.status === activeStatus)

  // Livres filtrés par catégorie + statut
  const filtered = activeCategory
    ? byStatus.filter(r => (r.books?.category ?? 'Autre') === activeCategory)
    : byStatus

  // Comptage des catégories (sur les livres déjà filtrés par statut)
  const categoryCounts = CATEGORY_LIST.reduce((acc, cat) => {
    acc[cat] = byStatus.filter(r => (r.books?.category ?? 'Autre') === cat).length
    return acc
  }, {} as Record<Category, number>)

  // Catégories présentes (avec au moins 1 livre dans le filtre statut courant)
  const activeCategories = CATEGORY_LIST.filter(cat => categoryCounts[cat] > 0)

  const searchQuery = search.trim().toLowerCase()
  const displayedBooks = searchQuery
    ? filtered.filter(r =>
        r.books?.title?.toLowerCase().includes(searchQuery) ||
        r.books?.author?.toLowerCase().includes(searchQuery)
      )
    : filtered

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24">

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="font-serif text-3xl text-white">Ma bibliothèque</h1>
        <p className="text-[#7a7268] text-sm mt-1">
          {myBooks.length} livre{myBooks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Barre de recherche / ajout ── */}
      <div className="px-5 mb-5">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ajouter ou chercher un livre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (results.length > 0 ? undefined : searchBooks())}
            className="flex-1 bg-[#242018] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e] transition"
          />
          <button
            onClick={searchBooks}
            className="bg-[#c9440e] text-white px-4 py-3 rounded-xl hover:opacity-90 transition shrink-0 w-12 flex items-center justify-center"
          >
            {loadingSearch ? (
              <span className="text-base leading-none">…</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Résultats de recherche Google Books ── */}
      {results.length > 0 && (
        <div className="px-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[#7a7268] text-xs">
              {results.length} résultat{results.length > 1 ? 's' : ''} — appuie sur + pour ajouter
            </p>
            <button onClick={() => setResults([])} className="text-[#7a7268] text-xs hover:text-white transition">
              Fermer
            </button>
          </div>
          <div className="bg-[#242018] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
            {results.map((book, i) => (
              <div key={book._id ?? i} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm text-white leading-tight line-clamp-1">{book.title}</p>
                  <p className="text-[#7a7268] text-xs mt-0.5 truncate">
                    {book.author}
                    {book.published_year && <span className="ml-1.5 opacity-60">· {book.published_year}</span>}
                  </p>
                  <p className="text-[#7a7268]/50 text-[10px] mt-0.5">
                    {normalizeCategory(book.rawCategories)}
                  </p>
                </div>
                <button
                  onClick={() => addBook(book)}
                  className="shrink-0 bg-[#c9440e] text-white w-7 h-7 rounded-lg text-lg hover:opacity-90 transition flex items-center justify-center font-medium leading-none"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filtre statut ── */}
      <div className="px-5 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_FILTERS.map(f => {
            const count = f.key === 'tous' ? myBooks.length : myBooks.filter(r => r.status === f.key).length
            return (
              <button
                key={f.key}
                onClick={() => { setActiveStatus(f.key); setActiveCategory(null) }}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                  activeStatus === f.key
                    ? 'bg-[#c9440e] text-white'
                    : 'bg-[#242018] text-[#7a7268] border border-white/10 hover:border-white/20'
                }`}
              >
                {f.label}
                {count > 0 && <span className="ml-1.5 opacity-60">{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Pills catégories ── */}
      {activeCategories.length > 0 && (
        <div className="px-5 mb-5">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {activeCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition ${
                  activeCategory === cat
                    ? 'bg-white/15 text-white border border-white/30'
                    : 'bg-white/5 text-[#7a7268] border border-white/8 hover:border-white/20 hover:text-white/80'
                }`}
              >
                {cat}
                <span className="ml-1.5 opacity-50">{categoryCounts[cat]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Liste des livres ── */}
      {displayedBooks.length === 0 ? (
        <div className="text-center py-20 text-[#7a7268] px-5">
          <p className="font-serif text-lg">
            {myBooks.length === 0 ? 'Ta bibliothèque est vide' : 'Aucun livre pour ce filtre'}
          </p>
          <p className="text-sm mt-2">
            {myBooks.length === 0 ? 'Cherche un livre ci-dessus pour commencer' : 'Essaie un autre filtre'}
          </p>
        </div>
      ) : (
        <div className="px-5 divide-y divide-white/5">
          {displayedBooks.map((reading) => {
            const book = reading.books
            const category: Category = book?.category ?? 'Autre'
            return (
              <div key={reading.id}>
                <div className="flex items-center gap-3 py-3.5 group">
                  {/* Titre + auteur + catégorie */}
                  <a href={`/fiche/${reading.id}`} className="flex-1 min-w-0">
                    <p className="font-serif text-[15px] text-white leading-snug line-clamp-1">
                      {book?.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-[#7a7268] text-xs truncate">{book?.author}</p>
                      <span className="text-white/70 text-[10px] border border-white/30 bg-white/5 rounded px-1.5 py-px leading-none shrink-0">
                        {category}
                      </span>
                    </div>
                  </a>

                  {/* Statut + suppression */}
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`text-xs font-medium ${STATUS_COLOR[reading.status]}`}>
                      {STATUS_LABEL[reading.status]}
                    </span>
                    <button
                      onClick={() => setConfirmDeleteId(reading.id === confirmDeleteId ? null : reading.id)}
                      className="p-1 text-[#7a7268] opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                      aria-label="Supprimer"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Confirmation suppression inline */}
                {confirmDeleteId === reading.id && (
                  <div className="mb-3 -mt-1 bg-[#242018] border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-white text-xs">Supprimer ce livre de ta bibliothèque ?</p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[#7a7268] text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:text-white transition"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => deleteReading(reading.id)}
                        disabled={deleting}
                        className="text-white text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
                      >
                        {deleting ? '…' : 'Supprimer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
