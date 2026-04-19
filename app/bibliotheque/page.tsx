'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

// ── Catégories ─────────────────────────────────────────────────────────────

const CATEGORY_LIST = [
  'Philosophie', 'Littérature française', 'Littérature étrangère',
  'Sciences humaines', 'Histoire', 'Droit & Politique',
  'Sciences & Tech', 'Développement personnel', 'BD & Manga', 'Autre',
] as const
type Category = typeof CATEGORY_LIST[number]

function normalizeCategory(cats?: string[]): Category {
  if (!cats?.length) return 'Autre'
  const s = cats.join(' ').toLowerCase()
  if (/comic|manga|bande.?dessin|graphic.?novel/.test(s)) return 'BD & Manga'
  if (/philo|ethic|ontolog|metaphysic|religion|spiritual|theolog/.test(s)) return 'Philosophie'
  if (/histor|biograph|memoir|autobiograph|ancient|medieval|\bwar\b|military/.test(s)) return 'Histoire'
  if (/self.?help|personal.?develop|motivat|coaching|success|productiv|well.?being|happiness|mindset|leadership/.test(s)) return 'Développement personnel'
  if (/\blaw\b|legal|droit|polit|govern|international.?relation|criminolog/.test(s)) return 'Droit & Politique'
  if (/psycholog|sociolog|anthropolog|linguist|educat|social.?science|cultur|gender|media|business|econom|finance|management|marketing/.test(s)) return 'Sciences humaines'
  if (/\bscience\b|technolog|math|physic|comput|biolog|nature|environment|climat|astronom|medic|engineer|chemistry/.test(s)) return 'Sciences & Tech'
  if (/français|french.?lit|littérature.?(française|fr)|poésie|po[eé]t|roman français/.test(s)) return 'Littérature française'
  if (/fiction|novel|litter|littér|roman|fantasy|thriller|mystery|horror|adventure|drama|classic|poetry|short.?stor|young.?adult|children|juvenile|romance|dystop|sci.?fi|science.?fiction|suspense|crime|detective|essay/.test(s)) return 'Littérature étrangère'
  return 'Autre'
}

// ── Types / constantes ─────────────────────────────────────────────────────

type Status = 'tous' | 'en_cours' | 'lu' | 'a_lire'
type SortBy = 'date' | 'rating' | 'title' | 'author'
type Tab = 'biblio' | 'auteurs' | 'listes'

const STATUS_FILTERS: { key: Status; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'lu', label: 'Lu' },
  { key: 'a_lire', label: 'À lire' },
]

const STATUS_LABEL: Record<string, string> = { a_lire: 'À lire', en_cours: 'En cours', lu: 'Lu' }
const STATUS_COLOR: Record<string, string> = {
  a_lire: 'text-[#9A9690]', en_cours: 'text-[#1A1A2E]', lu: 'text-[#1A1A2E]',
}
const STATUS_DOT: Record<string, string> = {
  a_lire: 'bg-[#D5D0C8]', en_cours: 'bg-[#1A1A2E]', lu: 'bg-[#9A9690]',
}

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'rating', label: 'Note' },
  { key: 'title', label: 'Titre' },
  { key: 'author', label: 'Auteur' },
]

// ── Page ───────────────────────────────────────────────────────────────────

export default function Bibliotheque() {
  const [user, setUser] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [myBooks, setMyBooks] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [activeStatus, setActiveStatus] = useState<Status>('tous')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [activeTab, setActiveTab] = useState<Tab>('biblio')

  const [lists, setLists] = useState<any[]>([])
  const [selectedList, setSelectedList] = useState<any | null>(null)
  const [listBooks, setListBooks] = useState<any[]>([])
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [addingToList, setAddingToList] = useState<string | null>(null)
  const [bookListMemberships, setBookListMemberships] = useState<Record<string, string[]>>({})
  const listPickerRef = useRef<HTMLDivElement>(null)
  const [authorSearch, setAuthorSearch] = useState('')
  const [searchMode, setSearchMode] = useState<'title' | 'author'>('title')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setUser(data.user)
      loadMyBooks(data.user.id)
      loadLists(data.user.id)
    })
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addingToList && listPickerRef.current && !listPickerRef.current.contains(e.target as Node)) {
        setAddingToList(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addingToList])

  const loadMyBooks = async (userId: string) => {
    const { data } = await supabase
      .from('readings').select('*, books(*)')
      .eq('user_id', userId).order('created_at', { ascending: false })
    setMyBooks(data || [])
  }

  const loadLists = async (userId: string) => {
    const { data } = await supabase
      .from('lists').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setLists(data || [])

    const { data: lb } = await supabase
      .from('list_books').select('list_id, reading_id').eq('user_id', userId)
    const map: Record<string, string[]> = {}
    for (const row of lb || []) {
      if (!map[row.reading_id]) map[row.reading_id] = []
      map[row.reading_id].push(row.list_id)
    }
    setBookListMemberships(map)
  }

  const loadListBooks = async (listId: string) => {
    const { data } = await supabase
      .from('list_books').select('*, readings(*, books(*))')
      .eq('list_id', listId).order('added_at', { ascending: false })
    setListBooks((data || []).map((lb: any) => lb.readings).filter(Boolean))
  }

  const searchBooks = async () => {
    if (!search.trim()) return
    setLoadingSearch(true)
    const key = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
    const raw = search.trim()

    try {
      let items: any[] = []

      if (searchMode === 'author') {
        const q = encodeURIComponent(`inauthor:"${raw}"`)
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&key=${key}&maxResults=40&langRestrict=fr`)
        const data = await res.json()
        items = data.items || []
      } else {
        const [titleItems, generalItems] = await Promise.all([
          fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`intitle:"${raw}"`)}&key=${key}&maxResults=20&langRestrict=fr`)
            .then(r => r.json()).then(d => d.items || []).catch(() => []),
          fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(raw)}&key=${key}&maxResults=20&langRestrict=fr`)
            .then(r => r.json()).then(d => d.items || []).catch(() => []),
        ])
        const seen = new Set<string>()
        for (const item of [...titleItems, ...generalItems]) {
          if (!seen.has(item.id)) {
            seen.add(item.id)
            items.push(item)
          }
        }
      }

      const normalized = items.map((item: any) => ({
        _id: item.id,
        title: item.volumeInfo.title,
        author: item.volumeInfo.authors?.[0],
        cover: item.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
        isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier,
        published_year: item.volumeInfo.publishedDate?.slice(0, 4),
        rawCategories: item.volumeInfo.categories,
      }))

      const filtered = normalized.filter((b: any) => b.title?.trim() && b.author?.trim() && b.published_year)

      if (searchMode === 'title') {
        const searchWords = raw.toLowerCase().split(/\s+/).filter(w => w.length > 1)
        const scored = filtered.map((b: any) => {
          let score = 0
          const titleLower = b.title.toLowerCase()
          if (titleLower.includes(raw.toLowerCase())) score += 500
          const allWordsInTitle = searchWords.every(w => titleLower.includes(w))
          if (allWordsInTitle) score += 300
          for (const w of searchWords) {
            if (titleLower.includes(w)) score += 50
          }
          if (titleLower.startsWith(raw.toLowerCase())) score += 200
          return { ...b, _score: score }
        })
        scored.sort((a: any, b: any) => b._score - a._score)
        setResults(scored.map(({ _score, ...rest }: any) => rest))
      } else {
        setResults(filtered)
      }
    } catch {
      setResults([])
    } finally {
      setLoadingSearch(false)
    }
  }

  const addBook = async (book: any) => {
    const category = normalizeCategory(book.rawCategories)
    const { data: existingBook } = await supabase.from('books').select('id').eq('isbn', book.isbn).single()
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

  const createList = async () => {
    if (!newListName.trim() || !user) return
    setCreatingList(true)
    const { data } = await supabase.from('lists')
      .insert({ user_id: user.id, name: newListName.trim() }).select().single()
    if (data) setLists(prev => [data, ...prev])
    setNewListName('')
    setCreatingList(false)
  }

  const deleteList = async (listId: string) => {
    await supabase.from('list_books').delete().eq('list_id', listId)
    await supabase.from('lists').delete().eq('id', listId)
    setLists(prev => prev.filter(l => l.id !== listId))
    if (selectedList?.id === listId) setSelectedList(null)
  }

  const toggleBookInList = async (readingId: string, listId: string) => {
    const inList = (bookListMemberships[readingId] || []).includes(listId)
    if (inList) {
      await supabase.from('list_books').delete().eq('reading_id', readingId).eq('list_id', listId)
      setBookListMemberships(prev => ({
        ...prev,
        [readingId]: (prev[readingId] || []).filter(id => id !== listId),
      }))
    } else {
      await supabase.from('list_books').insert({ list_id: listId, reading_id: readingId, user_id: user.id, added_at: new Date().toISOString() })
      setBookListMemberships(prev => ({
        ...prev,
        [readingId]: [...(prev[readingId] || []), listId],
      }))
    }
    if (selectedList?.id === listId) loadListBooks(listId)
  }

  // ── Dérivés ───────────────────────────────────────────────────────────────

  const authorsMap = myBooks.reduce((acc: Record<string, number>, r) => {
    const name = r.books?.author
    if (!name) return acc
    acc[name] = (acc[name] || 0) + 1
    return acc
  }, {})

  const authors = Object.entries(authorsMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'))

  const filteredAuthors = authorSearch.trim()
    ? authors.filter(a => a.name.toLowerCase().includes(authorSearch.trim().toLowerCase()))
    : authors

  const luCount = myBooks.filter(r => r.status === 'lu').length
  const enCoursCount = myBooks.filter(r => r.status === 'en_cours').length
  const aLireCount = myBooks.filter(r => r.status === 'a_lire').length
  const lastRead = myBooks.find(r => r.status === 'lu')

  const byStatus = activeStatus === 'tous' ? myBooks : myBooks.filter(r => r.status === activeStatus)

  const filtered = activeCategory
    ? byStatus.filter(r => (r.books?.category ?? 'Autre') === activeCategory)
    : byStatus

  const categoryCounts = CATEGORY_LIST.reduce((acc, cat) => {
    acc[cat] = byStatus.filter(r => (r.books?.category ?? 'Autre') === cat).length
    return acc
  }, {} as Record<Category, number>)
  const activeCategories = CATEGORY_LIST.filter(cat => categoryCounts[cat] > 0)

  const searchQuery = search.trim().toLowerCase()
  const afterSearch = searchQuery
    ? filtered.filter(r =>
        r.books?.title?.toLowerCase().includes(searchQuery) ||
        r.books?.author?.toLowerCase().includes(searchQuery)
      )
    : filtered

  const sorted = [...afterSearch].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
    if (sortBy === 'title') return (a.books?.title || '').localeCompare(b.books?.title || '', 'fr')
    if (sortBy === 'author') return (a.books?.author || '').localeCompare(b.books?.author || '', 'fr')
    return 0
  })

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F7F4EE', color: '#1A1A2E' }}>

      {/* ── Header ── */}
      <div className="px-6 pt-12 pb-5" style={{ borderBottom: '1px solid #D5D0C8', paddingBottom: '20px' }}>
        <h1 className="font-serif text-[30px] leading-tight mb-4" style={{ color: '#1A1A2E' }}>Ma bibliothèque</h1>

        {myBooks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 flex-wrap text-[12px]">
              <span style={{ color: '#9A9690' }}>
                <span className="font-medium text-[15px] font-serif" style={{ color: '#1A1A2E' }}>{luCount}</span> {luCount !== 1 ? 'lus' : 'lu'}
              </span>
              <span style={{ color: '#D5D0C8' }}>·</span>
              <span style={{ color: '#9A9690' }}>
                <span className="font-medium text-[15px] font-serif" style={{ color: '#1A1A2E' }}>{enCoursCount}</span> en cours
              </span>
              <span style={{ color: '#D5D0C8' }}>·</span>
              <span style={{ color: '#9A9690' }}>
                <span className="font-medium text-[15px] font-serif" style={{ color: '#9A9690' }}>{aLireCount}</span> à lire
              </span>
            </div>
            {lastRead && (
              <p className="text-[11px] italic font-serif" style={{ color: '#9A9690' }}>
                Dernier lu — <span className="not-italic" style={{ color: '#1A1A2E' }}>{lastRead.books?.title}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex px-6 gap-6" style={{ borderBottom: '1px solid #D5D0C8', marginTop: '16px', marginBottom: '16px' }}>
        {([
          { key: 'biblio', label: 'Bibliothèque' },
          { key: 'auteurs', label: 'Auteurs' },
          { key: 'listes', label: 'Mes listes' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="pb-3 text-[13px] font-medium transition border-b-[1.5px] -mb-px"
            style={{
              color: activeTab === t.key ? '#1A1A2E' : '#9A9690',
              borderColor: activeTab === t.key ? '#1A1A2E' : 'transparent',
            }}
          >
            {t.label}
            {t.key === 'auteurs' && authors.length > 0 && (
              <span className="ml-1.5 text-[10px]" style={{ color: '#9A9690' }}>{authors.length}</span>
            )}
            {t.key === 'listes' && lists.length > 0 && (
              <span className="ml-1.5 text-[10px]" style={{ color: '#9A9690' }}>{lists.length}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'biblio' ? (
        <>
          {/* ── Recherche / ajout ── */}
          <div className="px-5 mb-5">
            <div className="flex flex-col gap-2">
              {/* Toggle titre / auteur */}
              <div className="flex gap-1 w-fit">
                <button
                  onClick={() => { setSearchMode('title'); setResults([]) }}
                  className="text-xs px-3 py-1 rounded-full transition-colors"
                  style={{
                    background: searchMode === 'title' ? '#1A1A2E' : 'transparent',
                    color: searchMode === 'title' ? '#F7F4EE' : '#9A9690',
                    fontWeight: searchMode === 'title' ? 500 : 400,
                  }}
                >
                  Titre
                </button>
                <button
                  onClick={() => { setSearchMode('author'); setResults([]) }}
                  className="text-xs px-3 py-1 rounded-full transition-colors"
                  style={{
                    background: searchMode === 'author' ? '#1A1A2E' : 'transparent',
                    color: searchMode === 'author' ? '#F7F4EE' : '#9A9690',
                    fontWeight: searchMode === 'author' ? 500 : 400,
                  }}
                >
                  Auteur
                </button>
              </div>

              {/* Barre de recherche */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ajouter ou chercher un livre..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (results.length === 0 && searchBooks())}
                  className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={{ background: '#EDEAE3', border: '1px solid #D5D0C8', color: '#1A1A2E' }}
                />
                <button
                  onClick={searchBooks}
                  className="px-4 py-3 rounded-xl hover:opacity-90 transition shrink-0 w-12 flex items-center justify-center"
                  style={{ background: '#1A1A2E' }}
                >
                  {loadingSearch ? (
                    <span className="text-base leading-none" style={{ color: '#F7F4EE' }}>…</span>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F4EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Résultats Google Books ── */}
          {results.length > 0 && (
            <div className="px-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs" style={{ color: '#9A9690' }}>{results.length} résultat{results.length > 1 ? 's' : ''}</p>
                <button onClick={() => setResults([])} className="text-xs transition" style={{ color: '#9A9690' }}>Fermer</button>
              </div>
              <div style={{ borderTop: '1px solid #D5D0C8' }}>
                {results.map((book, i) => (
                  <div key={book._id ?? i} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid #D5D0C8' }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-sm leading-tight line-clamp-1" style={{ color: '#1A1A2E' }}>{book.title}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#9A9690' }}>
                        {book.author}{book.published_year && <span className="ml-1.5 opacity-60">· {book.published_year}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => addBook(book)}
                      className="shrink-0 w-7 h-7 rounded-lg text-lg hover:opacity-90 transition flex items-center justify-center font-medium leading-none"
                      style={{ background: '#1A1A2E', color: '#F7F4EE' }}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Filtres : statut + tri ── */}
          <div className="px-5 mb-3 flex items-center justify-between gap-3" style={{ paddingTop: '16px' }}>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-1">
              {STATUS_FILTERS.map(f => {
                const count = f.key === 'tous' ? myBooks.length : myBooks.filter(r => r.status === f.key).length
                return (
                  <button
                    key={f.key}
                    onClick={() => { setActiveStatus(f.key); setActiveCategory(null) }}
                    className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition"
                    style={{
                      background: activeStatus === f.key ? '#1A1A2E' : 'transparent',
                      color: activeStatus === f.key ? '#F7F4EE' : '#9A9690',
                      border: activeStatus === f.key ? '1px solid #1A1A2E' : '1px solid #D5D0C8',
                    }}
                  >
                    {f.label}
                    {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
                  </button>
                )
              })}
            </div>

            {/* Tri */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] uppercase tracking-wide" style={{ color: '#9A9690' }}>Tri</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="text-[11px] outline-none cursor-pointer transition pr-1"
                style={{ background: 'transparent', color: '#9A9690' }}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.key} value={o.key} style={{ background: '#F7F4EE' }}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Pills catégories ── */}
          {activeCategories.length > 0 && (
            <div className="px-5 mb-5">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {activeCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className="shrink-0 px-3 py-1 rounded-full text-[10px] font-medium transition"
                    style={{
                      background: activeCategory === cat ? '#E3E0D8' : 'transparent',
                      color: activeCategory === cat ? '#1A1A2E' : '#9A9690',
                      border: activeCategory === cat ? '1px solid #D5D0C8' : '1px solid #D5D0C8',
                    }}
                  >
                    {cat} <span className="opacity-50">{categoryCounts[cat]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Liste livres ── */}
          {sorted.length === 0 ? (
            <div className="text-center py-20 px-5" style={{ color: '#9A9690' }}>
              <p className="font-serif text-lg">
                {myBooks.length === 0 ? 'Ta bibliothèque est vide' : 'Aucun livre pour ce filtre'}
              </p>
              <p className="text-sm mt-2">
                {myBooks.length === 0 ? 'Cherche un livre ci-dessus pour commencer' : 'Essaie un autre filtre'}
              </p>
            </div>
          ) : (
            <div className="px-5" style={{ borderTop: '1px solid #D5D0C8' }}>
              {sorted.map((reading) => {
                const book = reading.books
                const category: Category = book?.category ?? 'Autre'
                const inListsCount = (bookListMemberships[reading.id] || []).length
                return (
                  <div key={reading.id} className="relative" style={{ borderBottom: '1px solid #D5D0C8' }}>
                    <div className="flex items-center gap-3 py-3.5 group">
                      <a href={`/fiche/${reading.id}`} className="flex-1 min-w-0">
                        <p className="font-serif text-[15px] leading-snug line-clamp-1" style={{ color: '#1A1A2E' }}>
                          {book?.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {book?.author ? (
                            <a
                              href={`/auteur/${encodeURIComponent(book.author)}`}
                              onClick={e => e.stopPropagation()}
                              className="text-[12px] truncate transition"
                              style={{ color: '#9A9690' }}
                            >
                              {book.author}
                            </a>
                          ) : null}
                          <span className="text-[10px] border rounded px-1.5 py-px leading-none shrink-0" style={{ color: '#9A9690', borderColor: '#D5D0C8', background: '#E3E0D8' }}>
                            {category}
                          </span>
                          {inListsCount > 0 && (
                            <span className="text-[10px] shrink-0" style={{ color: '#9A9690' }}>
                              {inListsCount === 1 ? '1 liste' : `${inListsCount} listes`}
                            </span>
                          )}
                        </div>
                      </a>

                      <div className="shrink-0 flex items-center gap-2">
                        {/* Statut */}
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[reading.status] ?? 'bg-[#D5D0C8]'}`} />
                          <span className={`text-[11px] ${STATUS_COLOR[reading.status]}`}>
                            {STATUS_LABEL[reading.status]}
                          </span>
                        </div>

                        {/* Ajouter à liste */}
                        {lists.length > 0 && (
                          <button
                            onClick={() => setAddingToList(addingToList === reading.id ? null : reading.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: '#9A9690' }}
                            aria-label="Ajouter à une liste"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                          </button>
                        )}

                        {/* Supprimer */}
                        <button
                          onClick={() => setConfirmDeleteId(reading.id === confirmDeleteId ? null : reading.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                          style={{ color: '#9A9690' }}
                          aria-label="Supprimer"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Picker listes */}
                    {addingToList === reading.id && (
                      <div ref={listPickerRef} className="mb-3 -mt-1 rounded-xl overflow-hidden" style={{ border: '1px solid #D5D0C8', background: '#EDEAE3' }}>
                        <p className="text-[10px] uppercase tracking-widest px-4 py-2" style={{ color: '#9A9690', borderBottom: '1px solid #D5D0C8' }}>
                          Ajouter à une liste
                        </p>
                        {lists.map(list => {
                          const checked = (bookListMemberships[reading.id] || []).includes(list.id)
                          return (
                            <button
                              key={list.id}
                              onClick={() => toggleBookInList(reading.id, list.id)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 transition text-left"
                              style={{ borderBottom: '1px solid #D5D0C8' }}
                            >
                              <span className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition" style={{
                                background: checked ? '#1A1A2E' : 'transparent',
                                border: checked ? '1px solid #1A1A2E' : '1px solid #D5D0C8',
                              }}>
                                {checked && (
                                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#F7F4EE" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="2 6 5 9 10 3" />
                                  </svg>
                                )}
                              </span>
                              <span className="text-[13px]" style={{ color: '#1A1A2E' }}>{list.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Confirm suppression */}
                    {confirmDeleteId === reading.id && (
                      <div className="mb-3 -mt-1 rounded-xl px-4 py-3 flex items-center justify-between gap-3" style={{ border: '1px solid rgba(239,68,68,0.15)' }}>
                        <p className="text-xs" style={{ color: '#9A9690' }}>Supprimer ce livre ?</p>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs px-3 py-1.5 rounded-full transition"
                            style={{ color: '#9A9690', border: '1px solid #D5D0C8' }}
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => deleteReading(reading.id)}
                            disabled={deleting}
                            className="text-white text-xs px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
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
        </>
      ) : activeTab === 'auteurs' ? (
        /* ══ TAB AUTEURS ═════════════════════════════════════════════════════ */
        <div className="px-5">

          <div className="mb-5">
            <input
              type="text"
              placeholder="Rechercher un auteur..."
              value={authorSearch}
              onChange={e => setAuthorSearch(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
              style={{ background: '#EDEAE3', border: '1px solid #D5D0C8', color: '#1A1A2E' }}
            />
          </div>

          {filteredAuthors.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-serif text-base" style={{ color: '#9A9690' }}>Aucun auteur trouvé</p>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid #D5D0C8' }}>
              {filteredAuthors.map(({ name, count }) => (
                <a
                  key={name}
                  href={`/auteur/${encodeURIComponent(name)}`}
                  className="flex items-center justify-between py-3.5 group"
                  style={{ borderBottom: '1px solid #D5D0C8' }}
                >
                  <p className="font-serif text-[15px] leading-snug line-clamp-1 transition" style={{ color: '#1A1A2E' }}>
                    {name}
                  </p>
                  <span className="text-[12px] shrink-0 ml-3" style={{ color: '#9A9690' }}>
                    {count} livre{count > 1 ? 's' : ''}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ══ TAB LISTES ══════════════════════════════════════════════════════ */
        <div className="px-5">

          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nouvelle liste... (ex: Mes incontournables)"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createList()}
                className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition"
                style={{ background: '#EDEAE3', border: '1px solid #D5D0C8', color: '#1A1A2E' }}
              />
              <button
                onClick={createList}
                disabled={creatingList || !newListName.trim()}
                className="px-4 py-3 rounded-xl hover:opacity-90 transition shrink-0 w-12 flex items-center justify-center disabled:opacity-40"
                style={{ background: '#1A1A2E' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F4EE" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {lists.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-serif text-base" style={{ color: '#9A9690' }}>Aucune liste pour l'instant</p>
              <p className="text-sm mt-1" style={{ color: '#9A9690' }}>Crée une liste pour organiser ta bibliothèque</p>
            </div>
          ) : selectedList ? (
            <>
              <button
                onClick={() => setSelectedList(null)}
                className="flex items-center gap-1.5 text-xs mb-4 transition"
                style={{ color: '#9A9690' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Toutes les listes
              </button>

              <div className="mb-4">
                <h2 className="font-serif text-[22px]" style={{ color: '#1A1A2E' }}>{selectedList.name}</h2>
                <p className="text-xs mt-0.5" style={{ color: '#9A9690' }}>{listBooks.length} livre{listBooks.length !== 1 ? 's' : ''}</p>
              </div>

              {listBooks.length === 0 ? (
                <p className="text-sm py-8 text-center font-serif italic" style={{ color: '#9A9690' }}>Cette liste est vide — ajoute des livres depuis l'onglet Bibliothèque.</p>
              ) : (
                <div style={{ borderTop: '1px solid #D5D0C8' }}>
                  {listBooks.map((reading: any) => (
                    <div key={reading.id} className="flex items-center gap-3 py-3.5 group" style={{ borderBottom: '1px solid #D5D0C8' }}>
                      <a href={`/fiche/${reading.id}`} className="flex-1 min-w-0">
                        <p className="font-serif text-[15px] leading-snug line-clamp-1" style={{ color: '#1A1A2E' }}>{reading.books?.title}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: '#9A9690' }}>{reading.books?.author}</p>
                      </a>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[reading.status] ?? 'bg-[#D5D0C8]'}`} />
                        <span className={`text-[11px] ${STATUS_COLOR[reading.status]}`}>
                          {STATUS_LABEL[reading.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-1">
              {lists.map((list, i) => {
                const isLast = i === lists.length - 1
                return (
                  <div key={list.id}>
                    <div className="flex items-center gap-3 py-4 group">
                      <button
                        onClick={async () => {
                          setSelectedList(list)
                          await loadListBooks(list.id)
                        }}
                        className="flex-1 text-left"
                      >
                        <p className="font-serif text-[16px] leading-snug" style={{ color: '#1A1A2E' }}>
                          {list.name}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#9A9690' }}>
                          {(bookListMemberships
                            ? Object.values(bookListMemberships).filter(ids => ids.includes(list.id)).length
                            : 0)} livre{Object.values(bookListMemberships).filter(ids => ids.includes(list.id)).length !== 1 ? 's' : ''}
                        </p>
                      </button>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9690" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <button
                          onClick={() => deleteList(list.id)}
                          className="hover:text-red-400 transition"
                          style={{ color: '#9A9690' }}
                          aria-label="Supprimer la liste"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {!isLast && <div className="h-px" style={{ background: '#D5D0C8' }} />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
