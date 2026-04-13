import Link from 'next/link'

const books = [
  {
    title: 'Les Misérables',
    author: 'Victor Hugo',
    status: 'Lu' as const,
    stars: 5,
    bg: '#EDE6D6',
    rotate: '2deg',
  },
  {
    title: "L'Étranger",
    author: 'Albert Camus',
    status: 'En cours' as const,
    stars: 4,
    bg: '#D4CEBF',
    rotate: '-1.5deg',
  },
  {
    title: 'Bonjour Tristesse',
    author: 'Françoise Sagan',
    status: 'À lire' as const,
    stars: 0,
    bg: '#EDE6D6',
    rotate: '1deg',
  },
]

function StatusBadge({ status }: { status: 'Lu' | 'En cours' | 'À lire' }) {
  const styles: Record<string, { bg: string; color: string }> = {
    'À lire':   { bg: '#C4D4B8', color: '#3D5C38' },
    'En cours': { bg: '#E8D5A8', color: '#7A5010' },
    'Lu':       { bg: '#D8E8D0', color: '#3D5C38' },
  }
  const { bg, color } = styles[status]
  return (
    <span
      style={{ background: bg, color, borderRadius: '999px' }}
      className="text-[10px] px-2 py-0.5 font-medium inline-block"
    >
      {status}
    </span>
  )
}

function Stars({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="flex gap-0.5 mt-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < count ? '#C8A96E' : '#D4CEBF' }} className="text-sm leading-none">
          ★
        </span>
      ))}
    </div>
  )
}

export default function Home() {
  return (
    <div style={{ background: 'var(--cream)', color: 'var(--text-dark)' }} className="min-h-screen flex flex-col">

      {/* Nav */}
      <header
        style={{ background: 'var(--cream)', borderBottom: '1px solid rgba(90, 80, 50, 0.12)' }}
        className="flex items-center justify-between px-6 py-5"
      >
        <span className="font-serif text-[22px] tracking-tight" style={{ color: 'var(--text-dark)' }}>
          conatus
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            style={{ color: 'var(--text-muted)' }}
            className="text-sm hover:opacity-70 transition"
          >
            Se connecter
          </Link>
          <Link
            href="/auth"
            style={{ background: 'var(--moss)', color: 'var(--cream)', borderRadius: '20px' }}
            className="text-sm px-5 py-2 font-medium hover:opacity-90 transition"
          >
            Commencer
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: 'var(--cream)' }} className="px-6 pt-16 pb-20">
        <div className="md:flex md:items-center md:gap-16 md:max-w-5xl md:mx-auto">

          {/* Text column */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left md:flex-1">
            <span
              style={{ color: 'var(--sage-dark)', letterSpacing: '0.18em' }}
              className="text-xs font-medium uppercase mb-6"
            >
              POUR LES LECTEURS QUI PENSENT
            </span>
            <h1
              className="font-serif text-[52px] font-normal leading-[1.1] mb-6 max-w-sm"
              style={{ color: 'var(--text-dark)' }}
            >
              Tes lectures méritent mieux qu&apos;une{' '}
              <em style={{ color: 'var(--moss)', fontStyle: 'italic' }}>liste.</em>
            </h1>
            <p
              style={{ color: 'var(--text-mid)' }}
              className="text-base leading-relaxed max-w-[300px] mb-10"
            >
              Conatus est le journal intime de tes livres — fiches, notes, citations, tout au même endroit.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-[260px]">
              <Link
                href="/auth"
                style={{ background: 'var(--moss)', color: 'var(--cream)', borderRadius: '24px' }}
                className="py-3.5 text-sm font-medium hover:opacity-90 transition text-center"
              >
                Commencer gratuitement →
              </Link>
              <Link
                href="/auth"
                style={{
                  border: '1px solid rgba(90, 80, 50, 0.25)',
                  borderRadius: '24px',
                  color: 'var(--text-mid)',
                }}
                className="py-3.5 text-sm hover:opacity-70 transition text-center"
              >
                Se connecter
              </Link>
            </div>
          </div>

          {/* Book cards column */}
          <div className="mt-20 md:mt-0 md:flex-shrink-0 flex justify-center">
            <div className="relative" style={{ width: '220px', height: '280px' }}>
              {books.map((book, i) => (
                <div
                  key={book.title}
                  style={{
                    position: 'absolute',
                    background: book.bg,
                    border: '1px solid rgba(90, 80, 50, 0.18)',
                    borderRadius: '10px',
                    transform: `rotate(${book.rotate})`,
                    width: '200px',
                    padding: '16px',
                    top: `${i * 14}px`,
                    left: '10px',
                    zIndex: books.length - i,
                    boxShadow: '0 2px 8px rgba(60, 50, 30, 0.08)',
                  }}
                >
                  <p className="font-serif text-[15px] leading-tight mb-0.5" style={{ color: 'var(--text-dark)' }}>
                    {book.title}
                  </p>
                  <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
                    {book.author}
                  </p>
                  <StatusBadge status={book.status} />
                  <Stars count={book.stars} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Features */}
      <section
        style={{ background: 'var(--cream)', borderTop: '1px solid rgba(90, 80, 50, 0.1)' }}
        className="px-6 py-16"
      >
        <div className="md:grid md:grid-cols-3 md:max-w-4xl md:mx-auto flex flex-col gap-10 md:gap-0">
          {[
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D5C38" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              ),
              title: 'Bibliothèque',
              desc: 'Cherche parmi des millions de livres, ajoute-les en un tap. Filtre par statut de lecture.',
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D5C38" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                </svg>
              ),
              title: 'Citations',
              desc: "Note les passages qui t'ont marqué. Retrouve-les en un instant, des années plus tard.",
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D5C38" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              ),
              title: 'Statistiques',
              desc: 'Suis ta progression. Visualise tes habitudes de lecture au fil des mois et des années.',
            },
          ].map(({ icon, title, desc }, i) => (
            <div
              key={title}
              style={i > 0 ? { borderLeft: '1px solid rgba(90, 80, 50, 0.1)' } : {}}
              className="flex flex-col items-center text-center px-8 gap-3"
            >
              <div
                style={{ background: 'rgba(61, 92, 56, 0.08)', borderRadius: '10px' }}
                className="w-10 h-10 flex items-center justify-center mb-1"
              >
                {icon}
              </div>
              <h3 className="font-serif text-base" style={{ color: 'var(--text-dark)' }}>
                {title}
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
