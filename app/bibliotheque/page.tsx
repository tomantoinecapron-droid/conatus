'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

type FilterType = 'tous' | 'en_cours' | 'lu' | 'a_lire'
type ViewType = 'grid' | 'list'

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'lu', label: 'Lu' },
  { key: 'a_lire', label: 'À lire' },
]

const statusDot: Record<string, string> = {
  a_lire: 'bg-[#7a7268]',
  en_cours: 'bg-[#c9440e]',
  lu: 'bg-green-400',
}

const statusLabel: Record<string, string> = {
  a_lire: 'À lire',
  en_cours: 'En cours',
  lu: 'Lu',
}

const statusTextColor: Record<string, string> = {
  a_lire: 'text-[#7a7268]',
  en_cours: 'text-[#c9440e]',
  lu: 'text-green-400',
}

function IconGrid({ active }: { active: boolean }) {
  const color = active ? '#ffffff' : '#7a7268'
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function IconList({ active }: { active: boolean }) {
  const color = active ? '#ffffff' : '#7a7268'
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

export default function Bibliotheque() {
  const [user, setUser] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [myBooks, setMyBooks] = useState<any[]>([])
  const [filter, setFilter] = useState<FilterType>('tous')
  const [view, setView] = useState<ViewType>('list')

  useEffect(() => {
    const saved = localStorage.getItem('bibliotheque-view') as ViewType | null
    if (saved === 'grid' || saved === 'list') setView(saved)

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/auth'
      else {
        setUser(data.user)
        loadMyBooks(data.user.id)
      }
    })
  }, [])

  const switchView = (v: ViewType) => {
    setView(v)
    localStorage.setItem('bibliotheque-view', v)
  }

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
    setLoading(true)

    const q = encodeURIComponent(search.trim())
    const key = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY

    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${q}&key=${key}&maxResults=20`
      )
      const data = await res.json()

      const items = (data.items || [])
        .map((item: any) => ({
          _id: item.id,
          title: item.volumeInfo.title,
          author: item.volumeInfo.authors?.[0],
          cover: item.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
          isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier,
          published_year: item.volumeInfo.publishedDate?.slice(0, 4),
          edition_count: null,
        }))
        .filter((b: any) => b.title?.trim() && b.author?.trim() && b.published_year)

      setResults(items)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const addBook = async (book: any) => {
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
      }).select().single()
      bookId = newBook?.id
    }
    if (!bookId) return
    await supabase.from('readings').insert({ user_id: user.id, book_id: bookId, status: 'a_lire' })
    setResults([])
    setSearch('')
    loadMyBooks(user.id)
  }

  const filteredBooks = filter === 'tous' ? myBooks : myBooks.filter(r => r.status === filter)

  const counts: Record<FilterType, number> = {
    tous: myBooks.length,
    en_cours: myBooks.filter(r => r.status === 'en_cours').length,
    lu: myBooks.filter(r => r.status === 'lu').length,
    a_lire: myBooks.filter(r => r.status === 'a_lire').length,
  }

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-white">Ma bibliothèque</h1>
          <p className="text-[#7a7268] text-sm mt-1">
            {myBooks.length} livre{myBooks.length !== 1 ? 's' : ''}
          </p>
        </div>
        {/* View toggle */}
        <div className="flex gap-1 bg-[#242018] border border-white/10 rounded-lg p-1">
          <button
            onClick={() => switchView('grid')}
            className={`p-1.5 rounded transition ${view === 'grid' ? 'bg-[#c9440e]' : 'hover:bg-white/5'}`}
            aria-label="Vue grille"
          >
            <IconGrid active={view === 'grid'} />
          </button>
          <button
            onClick={() => switchView('list')}
            className={`p-1.5 rounded transition ${view === 'list' ? 'bg-[#c9440e]' : 'hover:bg-white/5'}`}
            aria-label="Vue liste"
          >
            <IconList active={view === 'list'} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-5 mb-5">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ajouter un livre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchBooks()}
            className="flex-1 bg-[#242018] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e] transition"
          />
          <button
            onClick={searchBooks}
            className="bg-[#c9440e] text-white px-4 py-3 rounded-xl hover:opacity-90 transition shrink-0 flex items-center justify-center w-12"
          >
            {loading ? (
              <span className="text-base">…</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="px-5 mb-6">
          <p className="text-[#7a7268] text-xs mb-3">
            {results.length} résultat{results.length > 1 ? 's' : ''} — appuie sur + pour ajouter
          </p>
          <div className="flex flex-col gap-2">
            {results.map((book, i) => (
              <div key={book._id ?? i} className="flex gap-3 bg-[#242018] border border-white/10 rounded-xl p-3 items-center">
                {book.cover ? (
                  <img
                    src={book.cover}
                    className="w-10 h-14 rounded object-cover shrink-0"
                    alt={book.title}
                  />
                ) : (
                  <div className="w-10 h-14 bg-[#3a3530] rounded shrink-0 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a7268" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm leading-tight line-clamp-2">{book.title}</p>
                  <p className="text-[#7a7268] text-xs mt-0.5 truncate">{book.author}</p>
                  {book.published_year && (
                    <span className="text-[#7a7268] text-[10px]">{book.published_year}</span>
                  )}
                </div>
                <button
                  onClick={() => addBook(book)}
                  className="shrink-0 bg-[#c9440e] text-white w-8 h-8 rounded-lg text-lg hover:opacity-90 transition flex items-center justify-center font-medium leading-none"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="px-5 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filter === f.key
                  ? 'bg-[#c9440e] text-white'
                  : 'bg-[#242018] text-[#7a7268] border border-white/10'
              }`}
            >
              {f.label}
              {counts[f.key] > 0 && (
                <span className="ml-1.5 opacity-60 text-xs">{counts[f.key]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Books */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-20 text-[#7a7268] px-5">
          <p className="font-serif text-lg">
            {filter === 'tous'
              ? 'Ta bibliothèque est vide'
              : `Aucun livre « ${FILTERS.find(f => f.key === filter)?.label} »`}
          </p>
          <p className="text-sm mt-2">
            {filter === 'tous'
              ? 'Cherche un livre ci-dessus pour commencer'
              : 'Change de filtre ou ajoute un livre'}
          </p>
        </div>
      ) : view === 'grid' ? (
        /* Grid view */
        <div className="px-5 grid grid-cols-3 gap-x-3 gap-y-5">
          {filteredBooks.map((reading) => (
            <a key={reading.id} href={`/fiche/${reading.id}`} className="block group">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#242018] mb-2">
                {reading.books?.cover_url ? (
                  <img
                    src={reading.books.cover_url}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    alt={reading.books.title}
                  />
                ) : (
                  <div className="w-full h-full flex items-end p-2 bg-gradient-to-b from-[#2e2a24] to-[#1a1714]">
                    <p className="font-serif text-xs text-white/60 leading-tight line-clamp-3">
                      {reading.books?.title}
                    </p>
                  </div>
                )}
                <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${statusDot[reading.status]}`} />
              </div>
              <p className="font-serif text-xs text-white leading-tight line-clamp-2">{reading.books?.title}</p>
              <p className="text-[#7a7268] text-[10px] mt-0.5 truncate">{reading.books?.author}</p>
            </a>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="px-5 flex flex-col divide-y divide-white/5">
          {filteredBooks.map((reading) => (
            <a key={reading.id} href={`/fiche/${reading.id}`} className="flex gap-3 py-3 items-center group">
              <div className="w-10 h-14 rounded overflow-hidden bg-[#242018] shrink-0">
                {reading.books?.cover_url ? (
                  <img
                    src={reading.books.cover_url}
                    className="w-full h-full object-cover"
                    alt={reading.books.title}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-[#2e2a24] to-[#1a1714]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-sm text-white leading-tight line-clamp-1 group-hover:text-white/80 transition-colors">
                  {reading.books?.title}
                </p>
                <p className="text-[#7a7268] text-xs mt-0.5 truncate">{reading.books?.author}</p>
                {reading.books?.published_year && (
                  <p className="text-[#7a7268]/60 text-[10px] mt-0.5">{reading.books.published_year}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className={`text-xs font-medium ${statusTextColor[reading.status]}`}>
                  {statusLabel[reading.status]}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
