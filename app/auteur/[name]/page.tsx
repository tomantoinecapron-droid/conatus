'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

// ── Utilitaires ────────────────────────────────────────────────────────────

function getBio(bio: any): string {
  if (!bio) return ''
  if (typeof bio === 'string') return bio
  if (typeof bio === 'object' && bio.value) return bio.value
  return ''
}

function getYear(dateStr: string | undefined): string {
  if (!dateStr) return ''
  const m = dateStr.match(/\d{4}/)
  return m ? m[0] : dateStr
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .trim()
}

function isLatinTitle(title: string): boolean {
  if (!title) return false
  return /^[\u0020-\u007E\u00C0-\u024F\u1E00-\u1EFF0-9\s\-'',.!?:;()&"«»–—\[\]\/]+$/.test(title.trim())
}

const SUSPICIOUS_TITLE_RE = /^(letter[s]? (to|from|of)|speech(es)?|discourse|about |a study (of|on)|selected works? (by|of|from)|collected works? (by|of|from)|works? of |writings? of |à propos|lettres? (à|de)|discours |étude (sur|de)|essais? sur|notes? on|comments? on|introduction to|preface to|introduction à|préface|tributes? to|in memoriam|memorial)/i

function isSuspiciousWork(title: string): boolean {
  return SUSPICIOUS_TITLE_RE.test(title.trim())
}

// ── Types ──────────────────────────────────────────────────────────────────

type Work = { title: string; year: string; id: string }

// ── Sources de données ─────────────────────────────────────────────────────

async function fetchWorksFromWikidata(authorName: string): Promise<Work[]> {
  // 1. Trouver l'ID Wikidata de l'auteur
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(authorName)}&language=fr&format=json&origin=*&limit=5`
  const searchRes = await fetch(searchUrl)
  const searchData = await searchRes.json()

  const entity = searchData.search?.find((e: any) =>
    e.description?.toLowerCase().includes('écrivain') ||
    e.description?.toLowerCase().includes('auteur') ||
    e.description?.toLowerCase().includes('romancier') ||
    e.description?.toLowerCase().includes('poète') ||
    e.description?.toLowerCase().includes('philosophe') ||
    e.description?.toLowerCase().includes('writer') ||
    e.description?.toLowerCase().includes('novelist') ||
    e.description?.toLowerCase().includes('poet') ||
    e.description?.toLowerCase().includes('author')
  ) || searchData.search?.[0]

  if (!entity?.id) return []

  const wikidataId = entity.id // ex: "Q535"

  // 2. SPARQL pour récupérer les œuvres littéraires
  const sparql = `
SELECT ?work ?workLabel ?date WHERE {
  ?work wdt:P50 wd:${wikidataId}.
  ?work wdt:P31 wd:Q7725634.
  OPTIONAL { ?work wdt:P577 ?date. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
ORDER BY ?date
LIMIT 20
`.trim()

  const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`
  const sparqlRes = await fetch(sparqlUrl, {
    headers: { Accept: 'application/sparql-results+json' },
  })
  if (!sparqlRes.ok) return []

  const sparqlData = await sparqlRes.json()
  const bindings: any[] = sparqlData.results?.bindings || []

  // Dédupliquer par label (parfois plusieurs dates pour la même œuvre)
  const seen = new Set<string>()
  const works: Work[] = []
  for (const b of bindings) {
    const title = b.workLabel?.value || ''
    const id = b.work?.value?.split('/').pop() || ''
    const year = getYear(b.date?.value)
    if (!title || title.startsWith('Q') || seen.has(title.toLowerCase())) continue
    if (!isLatinTitle(title) || isSuspiciousWork(title)) continue
    seen.add(title.toLowerCase())
    works.push({ title, year, id })
  }

  return works.slice(0, 15)
}

async function fetchWorksFromOL(olId: string): Promise<Work[]> {
  const res = await fetch(`https://openlibrary.org/authors/${olId}/works.json?limit=50`)
  const data = await res.json()
  return (data.entries || [])
    .filter((w: any) => isLatinTitle(w.title || '') && !isSuspiciousWork(w.title || ''))
    .sort((a: any, b: any) => (b.edition_count || 0) - (a.edition_count || 0))
    .slice(0, 10)
    .map((w: any) => ({
      title: w.title || '',
      year: getYear(w.first_publish_date),
      id: w.key || '',
    }))
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AuteurPage() {
  const params = useParams()
  const authorName = decodeURIComponent(params.name as string)

  const [olId, setOlId] = useState<string | null>(null)
  const [author, setAuthor] = useState<any>(null)
  const [works, setWorks] = useState<Work[]>([])
  const [worksSource, setWorksSource] = useState<'wikidata' | 'ol' | null>(null)
  const [userBookTitles, setUserBookTitles] = useState<Set<string>>(new Set())
  const [userReadCount, setUserReadCount] = useState(0)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [photoError, setPhotoError] = useState(false)
  const [bio, setBio] = useState('')

  useEffect(() => {
    if (!authorName) return
    loadAll()
  }, [authorName])

  const loadAll = async () => {
    try {
      // 1. Résoudre le nom → OL ID (pour photo + données auteur)
      const searchRes = await fetch(
        `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(authorName)}&limit=3`
      )
      const searchData = await searchRes.json()

      if (!searchData.docs?.length) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const match = searchData.docs.find((d: any) =>
        d.name?.toLowerCase().includes(authorName.split(' ').pop()?.toLowerCase() || '')
      ) || searchData.docs[0]

      const id = match.key
      setOlId(id)

      // 2. Données OL + Supabase en parallèle
      const [authorRes, authRes] = await Promise.all([
        fetch(`https://openlibrary.org/authors/${id}.json`).then(r => r.json()),
        supabase.auth.getUser(),
      ])

      setAuthor(authorRes)
      const resolvedName = authorRes.name || authorName

      // 3. Bio Wikipedia FR
      let resolvedBio = ''
      try {
        const wikiNameUnderscore = resolvedName.replace(/ /g, '_')
        let wikiRes = await fetch(
          `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiNameUnderscore)}`
        )
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json()
          resolvedBio = wikiData.extract || ''
        }
        if (!resolvedBio) {
          wikiRes = await fetch(
            `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(resolvedName)}`
          )
          if (wikiRes.ok) {
            const wikiData = await wikiRes.json()
            resolvedBio = wikiData.extract || ''
          }
        }
      } catch (e) {
        console.error('[auteur] Wikipedia error:', e)
      }
      setBio(resolvedBio || cleanMarkdown(getBio(authorRes.bio)))

      // 4. Œuvres : Wikidata en priorité, OL en fallback
      try {
        const wikidataWorks = await fetchWorksFromWikidata(resolvedName)
        if (wikidataWorks.length > 0) {
          setWorks(wikidataWorks)
          setWorksSource('wikidata')
        } else {
          const olWorks = await fetchWorksFromOL(id)
          setWorks(olWorks)
          setWorksSource('ol')
        }
      } catch (e) {
        console.error('[auteur] Wikidata error:', e)
        const olWorks = await fetchWorksFromOL(id)
        setWorks(olWorks)
        setWorksSource('ol')
      }

      // 5. Données personnalisées utilisateur
      if (authRes.data?.user) {
        const { data: readings } = await supabase
          .from('readings')
          .select('status, books(title, author)')
          .eq('user_id', authRes.data.user.id)

        const lastName = authorName.split(' ').pop()?.toLowerCase() || ''
        const byAuthor = (readings || []).filter((r: any) =>
          r.books?.author?.toLowerCase().includes(lastName)
        )
        setUserReadCount(byAuthor.filter((r: any) => r.status === 'lu').length)
        setUserBookTitles(new Set(
          (readings || []).map((r: any) => r.books?.title?.toLowerCase().trim()).filter(Boolean)
        ))
      }
    } catch (e) {
      console.error('[auteur]', e)
      setNotFound(true)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex items-center justify-center">
        <div className="text-[#7a7268] text-sm">Chargement...</div>
      </div>
    )
  }

  if (notFound || !author) {
    return (
      <div className="min-h-screen bg-[#1a1714] flex flex-col items-center justify-center gap-3 pb-24 px-6 text-center">
        <p className="font-serif text-[20px] text-white">Auteur introuvable</p>
        <p className="text-[#7a7268] text-sm">Aucun résultat pour « {authorName} ».</p>
        <button onClick={() => window.history.back()} className="text-[#c9440e] text-sm mt-1">← Retour</button>
        <BottomNav />
      </div>
    )
  }

  const name = author.name || authorName
  const birthYear = getYear(author.birth_date)
  const deathYear = getYear(author.death_date)
  const photoUrl = olId && !photoError
    ? `https://covers.openlibrary.org/a/olid/${olId}-L.jpg`
    : null
  const BIO_LIMIT = 320

  return (
    <div className="min-h-screen bg-[#1a1714] text-white pb-28">

      {/* ── Retour ── */}
      <div className="px-6 pt-12 pb-4">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-[#7a7268] hover:text-white transition text-xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Retour
        </button>
      </div>

      {/* ── Header auteur ── */}
      <div className="px-6 pb-7 border-b border-white/6">

        {/* Photo */}
        {photoUrl && (
          <div className="mb-5">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#2a2520] border border-white/8">
              <img
                src={photoUrl}
                alt={name}
                className="w-full h-full object-cover object-top"
                onError={() => setPhotoError(true)}
              />
            </div>
          </div>
        )}

        {/* Nom */}
        <h1 className="font-serif text-[34px] leading-[1.1] text-white tracking-tight mb-1">
          {name}
        </h1>

        {/* Dates */}
        {(birthYear || deathYear) && (
          <p className="text-[#7a7268] text-[13px] mb-3">
            {birthYear && deathYear ? `${birthYear} — ${deathYear}` :
             birthYear ? `Né en ${birthYear}` : ''}
          </p>
        )}

        {/* Stat personnelle */}
        {userReadCount > 0 && (
          <p className="text-[12px] text-[#7a7268] mb-4">
            <span className="text-white/70 font-medium">{userReadCount}</span>{' '}
            livre{userReadCount !== 1 ? 's' : ''} de cet auteur dans ta bibliothèque
          </p>
        )}

        {/* Bio */}
        {bio && (
          <div>
            <p className="text-white/55 text-[14px] leading-relaxed font-serif italic">
              {!bioExpanded && bio.length > BIO_LIMIT
                ? bio.slice(0, BIO_LIMIT).trimEnd() + '…'
                : bio}
            </p>
            {bio.length > BIO_LIMIT && (
              <button
                onClick={() => setBioExpanded(v => !v)}
                className="text-[#7a7268] text-[12px] mt-2 hover:text-white transition"
              >
                {bioExpanded ? 'Réduire' : 'Lire plus'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Œuvres ── */}
      {works.length > 0 && (
        <section className="mt-7 mb-4">
          <div className="flex items-center gap-4 px-6 mb-4">
            <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#7a7268] shrink-0">
              Œuvres
            </p>
            <div className="flex-1 h-px bg-white/6" />
            <p className="text-[10px] text-[#7a7268]/50 shrink-0">{works.length}</p>
          </div>

          <div className="px-6 divide-y divide-white/5">
            {works.map((work, i) => {
              const inLibrary = userBookTitles.has(work.title.toLowerCase().trim())
              return (
                <div key={work.id || i} className="flex items-baseline justify-between gap-3 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className={`font-serif text-[15px] leading-snug line-clamp-1 ${inLibrary ? 'text-white/50' : 'text-white/80'}`}>
                      {work.title}
                    </p>
                    {work.year && (
                      <p className="text-[#7a7268] text-[11px] mt-0.5">{work.year}</p>
                    )}
                  </div>
                  {inLibrary && (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] text-[#c9440e]/60">
                      <span className="w-1 h-1 rounded-full bg-[#c9440e]/50 shrink-0" />
                      Dans ta biblio
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Attribution ── */}
      <div className="px-6 pt-4 pb-2">
        <p className="text-[#7a7268]/30 text-[10px]">
          Données :{' '}
          {worksSource === 'wikidata' ? (
            <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#7a7268] transition">Wikidata</a>
          ) : (
            <a href={`https://openlibrary.org/authors/${olId}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#7a7268] transition">Open Library</a>
          )}
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
