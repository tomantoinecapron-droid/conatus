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
type Tab = 'biblio' | 'listes'

const STATUS_FILTERS: { key: Status; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'lu', label: 'Lu' },
  { key: 'a_lire', label: 'À lire' },
]

const STATUS_LABEL: Record<string, string> = { a_lire: 'À lire', en_cours: 'En cours', lu: 'Lu' }
const STATUS_COLOR: Record<string, string> = {
  a_lire: 'text-[#7a7268]', en_cours: 'text-[#c9440e]', lu: 'text-emerald-400',
}
const STATUS_DOT: Record<string, string> = {
  a_lire: 'bg-white/20', en_cours: 'bg-[#c9440e]', lu: 'bg-emerald-400/70',
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

  // Tabs
  const [activeTab, setActiveTab] = useState<Tab>('biblio')

  // Listes
  const [lists, setLists] = useState<any[]>([])
  const [selectedList, setSelectedList] = useState<any | null>(null)
  const [listBooks, setListBooks] = useState<any[]>([])
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [addingToList, setAddingToList] = useState<string | null>(null) // reading id
  const [bookListMemberships, setBookListMemberships] = useState<Record<string, string[]>>({}) // readingId -> listIds[]
  const listPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/auth'; return }
      setUser(data.user)
      loadMyBooks(data.user.id)
      loadLists(data.user.id)
    })
  }, [])

  // Close list picker on outside click
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

    // Charger les appartenances pour afficher les coches
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
    } catch { setResults([]) }
    finally { setLoadingSearch(false) }
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
    // Refresh si on est dans la vue liste
    if (selectedList?.id === listId) loadListBooks(listId)
  }

  // ── Dérivés ───────────────────────────────────────────────────────────────

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
    return 0 // 'date' → already sorted by created_at desc
  })

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-24">

      {/* ── Header ── */}
      <div className="px-6 pt-12 pb-5">
        <h1 className="font-serif text-[30px] leading-tight text-white mb-4">Ma bibliothèque</h1>

        {/* Stats inline */}
        {myBooks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 flex-wrap text-[12px]">
              <span className="text-[#7a7268]">
                <span className="text-white/80 font-medium text-[15px] font-serif">{luCount}</span> {luCount !== 1 ? 'lus' : 'lu'}
              </span>
              <span className="text-white/15">·</span>
              <span className="text-[#7a7268]">
                <span className="text-[#c9440e]/80 font-medium text-[15px] font-serif">{enCoursCount}</span> en cours
              </span>
              <span className="text-white/15">·</span>
              <span className="text-[#7a7268]">
                <span className="text-white/50 font-medium text-[15px] font-serif">{aLireCount}</span> à lire
              </span>
            </div>
            {lastRead && (
              <p className="text-[11px] text-[#7a7268]/60 italic font-serif">
                Dernier lu — <span className="text-white/40 not-italic">{lastRead.books?.title}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex px-6 mb-5 gap-6 border-b border-white/6">
        {([{ key: 'biblio', label: 'Bibliothèque' }, { key: 'listes', label: 'Mes listes' }] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`pb-3 text-[13px] font-medium transition border-b-[1.5px] -mb-px ${
              activeTab === t.key
                ? 'text-white border-[#c9440e]'
                : 'text-[#7a7268] border-transparent hover:text-white/60'
            }`}
          >
            {t.label}
            {t.key === 'listes' && lists.length > 0 && (
              <span className="ml-1.5 text-[10px] text-[#7a7268]/60">{lists.length}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'biblio' ? (
        <>
          {/* ── Recherche / ajout ── */}
          <div className="px-5 mb-5">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ajouter ou chercher un livre..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (results.length === 0 && searchBooks())}
                className="flex-1 bg-[#242018] border border-white/8 rounded-xl px-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e]/50 transition"
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

          {/* ── Résultats Google Books ── */}
          {results.length > 0 && (
            <div className="px-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#7a7268] text-xs">{results.length} résultat{results.length > 1 ? 's' : ''}</p>
                <button onClick={() => setResults([])} className="text-[#7a7268] text-xs hover:text-white transition">Fermer</button>
              </div>
              <div className="divide-y divide-white/5">
                {results.map((book, i) => (
                  <div key={book._id ?? i} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-sm text-white leading-tight line-clamp-1">{book.title}</p>
                      <p className="text-[#7a7268] text-xs mt-0.5 truncate">
                        {book.author}{book.published_year && <span className="ml-1.5 opacity-60">· {book.published_year}</span>}
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

          {/* ── Filtres : statut + tri ── */}
          <div className="px-5 mb-3 flex items-center justify-between gap-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-1">
              {STATUS_FILTERS.map(f => {
                const count = f.key === 'tous' ? myBooks.length : myBooks.filter(r => r.status === f.key).length
                return (
                  <button
                    key={f.key}
                    onClick={() => { setActiveStatus(f.key); setActiveCategory(null) }}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition ${
                      activeStatus === f.key
                        ? 'bg-[#c9440e] text-white'
                        : 'text-[#7a7268] border border-white/8 hover:border-white/20 hover:text-white/70'
                    }`}
                  >
                    {f.label}
                    {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
                  </button>
                )
              })}
            </div>

            {/* Tri */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[#7a7268] text-[10px] uppercase tracking-wide">Tri</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="bg-transparent text-[#7a7268] text-[11px] outline-none cursor-pointer hover:text-white transition pr-1"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.key} value={o.key} className="bg-[#1a1714]">{o.label}</option>
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
                    className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-medium transition ${
                      activeCategory === cat
                        ? 'bg-white/15 text-white border border-white/30'
                        : 'bg-white/4 text-[#7a7268] border border-white/8 hover:border-white/20 hover:text-white/70'
                    }`}
                  >
                    {cat} <span className="opacity-50">{categoryCounts[cat]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Liste livres ── */}
          {sorted.length === 0 ? (
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
              {sorted.map((reading) => {
                const book = reading.books
                const category: Category = book?.category ?? 'Autre'
                const inListsCount = (bookListMemberships[reading.id] || []).length
                return (
                  <div key={reading.id} className="relative">
                    <div className="flex items-center gap-3 py-3.5 group">
                      <a href={`/fiche/${reading.id}`} className="flex-1 min-w-0">
                        <p className="font-serif text-[15px] text-white leading-snug line-clamp-1">
                          {book?.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {book?.author ? (
                            <a
                              href={`/auteur/${encodeURIComponent(book.author)}`}
                              onClick={e => e.stopPropagation()}
                              className="text-[#7a7268] text-[12px] truncate hover:text-white transition"
                            >
                              {book.author}
                            </a>
                          ) : null}
                          <span className="text-white/40 text-[10px] border border-white/15 rounded px-1.5 py-px leading-none shrink-0">
                            {category}
                          </span>
                          {inListsCount > 0 && (
                            <span className="text-[#c9440e]/50 text-[10px] shrink-0">
                              {inListsCount === 1 ? '1 liste' : `${inListsCount} listes`}
                            </span>
                          )}
                        </div>
                      </a>

                      <div className="shrink-0 flex items-center gap-2">
                        {/* Statut */}
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[reading.status] ?? 'bg-white/20'}`} />
                          <span className={`text-[11px] ${STATUS_COLOR[reading.status]}`}>
                            {STATUS_LABEL[reading.status]}
                          </span>
                        </div>

                        {/* Ajouter à liste */}
                        {lists.length > 0 && (
                          <button
                            onClick={() => setAddingToList(addingToList === reading.id ? null : reading.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7a7268] hover:text-white"
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
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7a7268] hover:text-red-400"
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
                      <div ref={listPickerRef} className="mb-3 -mt-1 border border-white/8 rounded-xl overflow-hidden">
                        <p className="text-[10px] text-[#7a7268] uppercase tracking-widest px-4 py-2 border-b border-white/5">
                          Ajouter à une liste
                        </p>
                        {lists.map(list => {
                          const checked = (bookListMemberships[reading.id] || []).includes(list.id)
                          return (
                            <button
                              key={list.id}
                              onClick={() => toggleBookInList(reading.id, list.id)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/4 transition text-left border-b border-white/4 last:border-0"
                            >
                              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${checked ? 'bg-[#c9440e] border-[#c9440e]' : 'border-white/20'}`}>
                                {checked && (
                                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="2 6 5 9 10 3" />
                                  </svg>
                                )}
                              </span>
                              <span className="text-[13px] text-white/80">{list.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Confirm suppression */}
                    {confirmDeleteId === reading.id && (
                      <div className="mb-3 -mt-1 border border-red-500/15 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <p className="text-white/60 text-xs">Supprimer ce livre ?</p>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[#7a7268] text-xs px-3 py-1.5 rounded-full border border-white/10 hover:text-white transition"
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
      ) : (
        /* ══ TAB LISTES ══════════════════════════════════════════════════════ */
        <div className="px-5">

          {/* Créer une liste */}
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nouvelle liste... (ex: Mes incontournables)"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createList()}
                className="flex-1 bg-[#242018] border border-white/8 rounded-xl px-4 py-3 text-white placeholder-[#7a7268]/50 text-sm outline-none focus:border-[#c9440e]/50 transition"
              />
              <button
                onClick={createList}
                disabled={creatingList || !newListName.trim()}
                className="bg-[#c9440e] text-white px-4 py-3 rounded-xl hover:opacity-90 transition shrink-0 w-12 flex items-center justify-center disabled:opacity-40"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {lists.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-serif text-white/30 text-base">Aucune liste pour l'instant</p>
              <p className="text-[#7a7268] text-sm mt-1">Crée une liste pour organiser ta bibliothèque</p>
            </div>
          ) : selectedList ? (
            /* Vue d'une liste */
            <>
              <button
                onClick={() => setSelectedList(null)}
                className="flex items-center gap-1.5 text-[#7a7268] text-xs mb-4 hover:text-white transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Toutes les listes
              </button>

              <div className="mb-4">
                <h2 className="font-serif text-[22px] text-white">{selectedList.name}</h2>
                <p className="text-[#7a7268] text-xs mt-0.5">{listBooks.length} livre{listBooks.length !== 1 ? 's' : ''}</p>
              </div>

              {listBooks.length === 0 ? (
                <p className="text-[#7a7268] text-sm py-8 text-center font-serif italic">Cette liste est vide — ajoute des livres depuis l'onglet Bibliothèque.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {listBooks.map((reading: any) => (
                    <div key={reading.id} className="flex items-center gap-3 py-3.5 group">
                      <a href={`/fiche/${reading.id}`} className="flex-1 min-w-0">
                        <p className="font-serif text-[15px] text-white leading-snug line-clamp-1">{reading.books?.title}</p>
                        <p className="text-[#7a7268] text-[12px] mt-0.5">{reading.books?.author}</p>
                      </a>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[reading.status] ?? 'bg-white/20'}`} />
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
            /* Vue toutes les listes */
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
                        <p className="font-serif text-[16px] text-white group-hover:text-white/80 transition leading-snug">
                          {list.name}
                        </p>
                        <p className="text-[#7a7268] text-[11px] mt-0.5">
                          {(bookListMemberships
                            ? Object.values(bookListMemberships).filter(ids => ids.includes(list.id)).length
                            : 0)} livre{Object.values(bookListMemberships).filter(ids => ids.includes(list.id)).length !== 1 ? 's' : ''}
                        </p>
                      </button>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a7268" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <button
                          onClick={() => deleteList(list.id)}
                          className="text-[#7a7268] hover:text-red-400 transition"
                          aria-label="Supprimer la liste"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {!isLast && <div className="h-px bg-white/5" />}
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
