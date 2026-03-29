'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Bibliotheque() {
  const [user, setUser] = useState(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [myBooks, setMyBooks] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/auth'
      else {
        setUser(data.user)
        loadMyBooks(data.user.id)
      }
    })
  }, [])

  const loadMyBooks = async (userId) => {
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
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(search)}&limit=10`)
    const data = await res.json()
    setResults(data.docs || [])
    setLoading(false)
  }

  const addBook = async (book) => {
    const { data: existingBook } = await supabase
      .from('books').select('id').eq('isbn', book.isbn_13?.[0] || book.key).single()
    let bookId
    if (existingBook) {
      bookId = existingBook.id
    } else {
      const { data: newBook } = await supabase.from('books').insert({
        title: book.title,
        author: book.author_name?.[0] || 'Auteur inconnu',
        cover_url: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null,
        isbn: book.isbn_13?.[0] || book.key,
        published_year: book.first_publish_year,
      }).select().single()
      bookId = newBook.id
    }
    await supabase.from('readings').insert({ user_id: user.id, book_id: bookId, status: 'a_lire' })
    setResults([])
    setSearch('')
    loadMyBooks(user.id)
  }

  const statusLabel = { a_lire: 'À lire', en_cours: 'En cours', lu: 'Lu' }
  const statusColor = { a_lire: 'text-[#7a7268]', en_cours: 'text-[#c9440e]', lu: 'text-green-400' }

  return (
    <div className="min-h-screen bg-[#1a1714] text-white">
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-2xl font-serif">con<span className="text-[#c9440e]">a</span>tus</a>
        <span className="text-[#7a7268] text-sm">{user?.email}</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-serif mb-8">Ma bibliothèque</h1>

        {/* Recherche */}
        <div className="flex gap-3 mb-10">
          <input
            type="text"
            placeholder="Ajouter un livre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchBooks()}
            className="flex-1 bg-[#242018] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e] transition"
          />
          <button onClick={searchBooks} className="bg-[#c9440e] text-white px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition">
            {loading ? '...' : 'Chercher'}
          </button>
        </div>

        {/* Résultats de recherche */}
        {results.length > 0 && (
          <div className="flex flex-col gap-3 mb-10">
            <p className="text-[#7a7268] text-sm mb-1">{results.length} résultats — clique sur + pour ajouter</p>
            {results.map((book, i) => (
              <div key={i} className="flex gap-4 bg-[#242018] border border-white/10 rounded-xl p-4 items-center">
                {book.cover_i ? (
                  <img src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`} className="w-12 h-16 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-16 bg-[#3a3530] rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-base leading-tight mb-1">{book.title}</p>
                  <p className="text-[#7a7268] text-sm">{book.author_name?.[0] || 'Auteur inconnu'}</p>
                  {book.first_publish_year && <p className="text-[#7a7268] text-xs mt-1">{book.first_publish_year}</p>}
                </div>
                <button onClick={() => addBook(book)} className="flex-shrink-0 bg-[#c9440e] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 transition">
                  + Ajouter
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mes livres */}
        {myBooks.length === 0 ? (
          <div className="text-center py-20 text-[#7a7268]">
            <p className="text-4xl mb-4">📚</p>
            <p className="font-serif text-lg">Ta bibliothèque est vide</p>
            <p className="text-sm mt-2">Cherche un livre ci-dessus pour commencer</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[#7a7268] text-sm mb-1">{myBooks.length} livre{myBooks.length > 1 ? 's' : ''}</p>
            {myBooks.map((reading) => (
              <div key={reading.id} className="flex gap-4 bg-[#242018] border border-white/10 rounded-xl p-4 items-center">
                {reading.books?.cover_url ? (
                  <img src={reading.books.cover_url} className="w-12 h-16 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-16 bg-[#3a3530] rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-base leading-tight mb-1">{reading.books?.title}</p>
                  <p className="text-[#7a7268] text-sm">{reading.books?.author}</p>
                  <p className={`text-xs mt-1 font-medium ${statusColor[reading.status]}`}>
                    {statusLabel[reading.status]}
                  </p>
                </div>
                <a href={`/fiche/${reading.id}`} className="flex-shrink-0 border border-white/20 text-white px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition">
                  Fiche →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}