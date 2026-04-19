import Link from 'next/link'

export default function Home() {
  return (
    <div
      style={{
        background: '#F7F4EE',
        color: '#1A1A2E',
        backgroundImage: 'radial-gradient(circle, rgba(26,26,46,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
      className="min-h-screen flex flex-col"
    >

      {/* Nav */}
      <header
        style={{ background: '#F7F4EE', borderBottom: '1px solid #D5D0C8' }}
        className="flex items-center justify-between px-6 py-5"
      >
        <span style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '28px',
          fontWeight: '400',
          color: '#1A1A2E',
          letterSpacing: '0.02em',
          lineHeight: '1',
        }}>
          conatus
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            style={{ color: '#9A9690' }}
            className="text-sm hover:opacity-70 transition"
          >
            Se connecter
          </Link>
          <Link
            href="/auth"
            style={{ background: '#1A1A2E', color: '#F7F4EE', borderRadius: '20px' }}
            className="text-sm px-5 py-2 font-medium hover:opacity-90 transition"
          >
            Commencer
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: '#F7F4EE' }} className="px-6 pt-16 pb-20">
        <div className="md:flex md:items-center md:gap-16 md:max-w-5xl md:mx-auto">

          {/* Text column */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left md:flex-1">
            <span
              style={{ fontSize: '11px', fontWeight: 500, color: '#9A9690', letterSpacing: '0.14em', textTransform: 'uppercase' }}
              className="mb-6 block"
            >
              TA BIBLIOTHÈQUE, ENFIN VIVANTE.
            </span>
            <div style={{ width: '32px', height: '1px', background: '#D5D0C8', marginBottom: '16px' }} />
            <h1
              className="mb-6 max-w-sm"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '48px',
                fontWeight: '400',
                lineHeight: '1.1',
                color: '#1A1A2E',
              }}
            >
              Tes lectures méritent mieux qu&apos;une{' '}
              <em style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', color: '#1A1A2E' }}>liste.</em>
            </h1>
            <p
              style={{ color: '#9A9690' }}
              className="text-base leading-relaxed max-w-[300px] mb-10"
            >
              Conatus est le journal intime de tes livres — fiches, notes, citations, tout au même endroit.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-[260px]">
              <Link
                href="/auth"
                style={{ background: '#1A1A2E', color: '#F7F4EE', borderRadius: '24px' }}
                className="py-3.5 text-sm font-medium hover:opacity-90 transition text-center"
              >
                Commencer gratuitement →
              </Link>
              <Link
                href="/auth"
                style={{
                  border: '1px solid #D5D0C8',
                  borderRadius: '24px',
                  color: '#9A9690',
                }}
                className="py-3.5 text-sm hover:opacity-70 transition text-center"
              >
                Se connecter
              </Link>
            </div>
          </div>

          {/* Book cards column */}
          <div className="mt-20 md:mt-0 md:flex-shrink-0 flex justify-center" style={{ paddingTop: '40px' }}>
            <div style={{ position: 'relative', width: '280px', height: '340px' }}>
              {/* Carte 1 */}
              <div style={{
                position: 'absolute', top: 0, right: '20px',
                width: '200px', padding: '18px 16px',
                background: '#E3E0D8', borderRadius: '6px',
                border: '1px solid #D5D0C8',
                boxShadow: '3px 3px 0 rgba(26,26,46,0.04)',
                transform: 'rotate(2deg)'
              }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#1A1A2E', marginBottom: '4px' }}>Les Misérables</div>
                <div style={{ fontSize: '11px', color: '#9A9690', marginBottom: '10px' }}>Victor Hugo</div>
                <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '10px', background: '#E3E0D8', color: '#9A9690' }}>Lu</span>
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#9A9690', letterSpacing: '2px' }}>★★★★★</div>
              </div>

              {/* Carte 2 */}
              <div style={{
                position: 'absolute', top: '90px', right: 0,
                width: '200px', padding: '18px 16px',
                background: '#D5D0C8', borderRadius: '6px',
                border: '1px solid #D5D0C8',
                boxShadow: '3px 3px 0 rgba(26,26,46,0.04)',
                transform: 'rotate(-1.5deg)'
              }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#1A1A2E', marginBottom: '4px' }}>L&apos;Étranger</div>
                <div style={{ fontSize: '11px', color: '#9A9690', marginBottom: '10px' }}>Albert Camus</div>
                <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '10px', background: '#E3E0D8', color: '#9A9690' }}>En cours</span>
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#9A9690', letterSpacing: '2px' }}>★★★★</div>
              </div>

              {/* Carte 3 */}
              <div style={{
                position: 'absolute', top: '180px', right: '14px',
                width: '200px', padding: '18px 16px',
                background: '#EDEAE3', borderRadius: '6px',
                border: '1px solid #D5D0C8',
                boxShadow: '3px 3px 0 rgba(26,26,46,0.04)',
                transform: 'rotate(1deg)'
              }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#1A1A2E', marginBottom: '4px' }}>Bonjour Tristesse</div>
                <div style={{ fontSize: '11px', color: '#9A9690', marginBottom: '10px' }}>Françoise Sagan</div>
                <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '10px', background: '#E3E0D8', color: '#9A9690' }}>À lire</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Séparateur dégradé */}
      <div style={{ margin: '0 48px', height: '1px', background: 'linear-gradient(to right, transparent, #D5D0C8, transparent)' }} />

      {/* Features */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        margin: '40px 48px', gap: '1px',
        background: '#D5D0C8',
        border: '1px solid #D5D0C8',
        borderRadius: '10px', overflow: 'hidden',
      }}>
        {[
          { titre: 'Bibliothèque', desc: 'Tous tes livres, statuts, et notes dans un seul espace.' },
          { titre: 'Citations', desc: 'Capture les passages qui comptent, retrouve-les facilement.' },
          { titre: 'Statistiques', desc: 'Visualise tes habitudes de lecture au fil du temps.' },
        ].map((f) => (
          <div key={f.titre} style={{ background: '#F7F4EE', padding: '28px 24px' }}>
            <div style={{
              fontFamily: 'Georgia, serif', fontSize: '16px',
              color: '#1A1A2E', marginBottom: '8px', fontWeight: '400',
            }}>{f.titre}</div>
            <div style={{ fontSize: '13px', color: '#9A9690', lineHeight: '1.6' }}>{f.desc}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
