export default function Home() {
  return (
    <div className="min-h-screen bg-[#1a1714] text-white flex flex-col">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5">
        <span className="font-serif text-2xl tracking-tight">
          con<span className="text-[#c9440e]">a</span>tus
        </span>
        <div className="flex items-center gap-3">
          <a href="/auth" className="text-[#7a7268] text-sm hover:text-white transition">
            Se connecter
          </a>
          <a href="/auth" className="bg-[#c9440e] text-white text-sm px-4 py-2 rounded-full font-medium hover:opacity-90 transition">
            Commencer
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20">
        <div className="md:flex md:items-center md:gap-16 md:max-w-5xl md:mx-auto">

          {/* Text */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left md:flex-1">
            <span className="text-[#c9440e] text-xs font-medium tracking-[0.2em] uppercase mb-8">
              Pour les lecteurs qui pensent
            </span>
            <h1 className="font-serif text-[2.8rem] leading-[1.08] text-white mb-6 max-w-xs md:max-w-sm">
              Tes lectures méritent mieux qu&apos;une liste.
            </h1>
            <p className="text-[#7a7268] text-base leading-relaxed max-w-[280px] mb-10">
              Conatus est le journal intime de tes livres — fiches, notes, citations, tout au même endroit.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-[260px]">
              <a href="/auth" className="bg-[#c9440e] text-white py-3.5 rounded-full text-sm font-medium hover:opacity-90 transition text-center">
                Commencer gratuitement →
              </a>
              <a href="/auth" className="border border-white/15 text-white/70 py-3.5 rounded-full text-sm hover:border-white/30 hover:text-white transition text-center">
                Se connecter
              </a>
            </div>
          </div>

          {/* Illustration */}
          <div className="mt-14 md:mt-0 md:flex-shrink-0 flex justify-center">
            <svg
              viewBox="0 0 300 370"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-[220px] md:w-[280px]"
              aria-hidden="true"
            >
              {/* Ambient circles */}
              <circle cx="150" cy="190" r="178" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
              <circle cx="150" cy="190" r="128" stroke="white" strokeOpacity="0.025" strokeWidth="0.5" />

              {/* Floating dots */}
              <circle cx="22" cy="38" r="1.5" fill="white" fillOpacity="0.18" />
              <circle cx="278" cy="56" r="1" fill="white" fillOpacity="0.14" />
              <circle cx="263" cy="22" r="2" fill="#c9440e" fillOpacity="0.45" />
              <circle cx="288" cy="160" r="1" fill="white" fillOpacity="0.1" />
              <circle cx="12" cy="130" r="1.5" fill="white" fillOpacity="0.12" />
              <circle cx="9" cy="210" r="1" fill="#c9440e" fillOpacity="0.3" />
              <circle cx="290" cy="280" r="1.5" fill="white" fillOpacity="0.08" />
              <circle cx="18" cy="310" r="1" fill="white" fillOpacity="0.1" />

              {/* ── COLUMN 1 (center x=72) ── */}
              {/* Shaft — tapered: 52px bottom → 46px top */}
              <path d="M 46,330 L 49,68 L 95,68 L 98,330 Z" stroke="white" strokeOpacity="0.22" strokeWidth="1" />
              {/* Fluting */}
              <line x1="53" y1="70" x2="53" y2="328" stroke="white" strokeOpacity="0.07" strokeWidth="0.5" />
              <line x1="62" y1="70" x2="62" y2="328" stroke="white" strokeOpacity="0.07" strokeWidth="0.5" />
              <line x1="72" y1="70" x2="72" y2="328" stroke="white" strokeOpacity="0.07" strokeWidth="0.5" />
              <line x1="82" y1="70" x2="82" y2="328" stroke="white" strokeOpacity="0.07" strokeWidth="0.5" />
              <line x1="91" y1="70" x2="91" y2="328" stroke="white" strokeOpacity="0.07" strokeWidth="0.5" />
              {/* Echinus */}
              <rect x="43" y="56" width="58" height="12" stroke="white" strokeOpacity="0.18" strokeWidth="0.8" />
              {/* Abacus */}
              <rect x="40" y="46" width="64" height="10" stroke="white" strokeOpacity="0.2" strokeWidth="0.8" />

              {/* ── COLUMN 2 (center x=158) ── */}
              {/* Shaft */}
              <path d="M 132,330 L 135,68 L 181,68 L 184,330 Z" stroke="white" strokeOpacity="0.25" strokeWidth="1" />
              {/* Fluting */}
              <line x1="139" y1="70" x2="139" y2="328" stroke="white" strokeOpacity="0.07" strokeWidth="0.5" />
              <line x1="148" y1="70" x2="148" y2="328" stroke="white" strokeOpacity="0.07" strokeWidth="0.5" />
              <line x1="158" y1="70" x2="158" y2="328" stroke="white" strokeOpacity="0.07" strokeWidth="0.5" />
              <line x1="168" y1="70" x2="168" y2="328" stroke="white" strokeOpacity="0.07" strokeWidth="0.5" />
              <line x1="177" y1="70" x2="177" y2="328" stroke="white" strokeOpacity="0.07" strokeWidth="0.5" />
              {/* Echinus */}
              <rect x="129" y="56" width="58" height="12" stroke="white" strokeOpacity="0.18" strokeWidth="0.8" />
              {/* Abacus */}
              <rect x="126" y="46" width="64" height="10" stroke="white" strokeOpacity="0.2" strokeWidth="0.8" />

              {/* ── ENTABLATURE (cols 1–2) ── */}
              {/* Architrave */}
              <rect x="40" y="28" width="150" height="18" stroke="white" strokeOpacity="0.15" strokeWidth="0.8" />
              {/* Frieze */}
              <rect x="40" y="10" width="150" height="18" stroke="white" strokeOpacity="0.11" strokeWidth="0.8" />
              {/* Cornice */}
              <rect x="36" y="4" width="158" height="6" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
              {/* Orange accent — base of frieze */}
              <line x1="40" y1="28" x2="190" y2="28" stroke="#c9440e" strokeOpacity="0.5" strokeWidth="0.8" />
              {/* Triglyphs — 3 pairs of orange verticals in frieze */}
              <line x1="76" y1="12" x2="76" y2="26" stroke="#c9440e" strokeOpacity="0.38" strokeWidth="1.2" />
              <line x1="80" y1="12" x2="80" y2="26" stroke="#c9440e" strokeOpacity="0.38" strokeWidth="1.2" />
              <line x1="127" y1="12" x2="127" y2="26" stroke="#c9440e" strokeOpacity="0.38" strokeWidth="1.2" />
              <line x1="131" y1="12" x2="131" y2="26" stroke="#c9440e" strokeOpacity="0.38" strokeWidth="1.2" />
              <line x1="166" y1="12" x2="166" y2="26" stroke="#c9440e" strokeOpacity="0.38" strokeWidth="1.2" />
              <line x1="170" y1="12" x2="170" y2="26" stroke="#c9440e" strokeOpacity="0.38" strokeWidth="1.2" />

              {/* ── COLUMN 3 — broken ruin (center x=234) ── */}
              {/* Shaft with irregular broken top */}
              <path d="M 208,330 L 210,148 L 216,141 L 224,150 L 231,136 L 240,145 L 248,139 L 260,330 Z" stroke="white" strokeOpacity="0.16" strokeWidth="1" />
              {/* Fluting */}
              <line x1="216" y1="152" x2="216" y2="328" stroke="white" strokeOpacity="0.06" strokeWidth="0.5" />
              <line x1="225" y1="152" x2="225" y2="328" stroke="white" strokeOpacity="0.06" strokeWidth="0.5" />
              <line x1="234" y1="152" x2="234" y2="328" stroke="white" strokeOpacity="0.06" strokeWidth="0.5" />
              <line x1="243" y1="152" x2="243" y2="328" stroke="white" strokeOpacity="0.06" strokeWidth="0.5" />
              <line x1="252" y1="152" x2="252" y2="328" stroke="white" strokeOpacity="0.06" strokeWidth="0.5" />
              {/* Fallen capital fragment */}
              <rect x="215" y="186" width="48" height="7" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" transform="rotate(-7 239 190)" />

              {/* ── STEPS (stylobate) ── */}
              <rect x="30" y="330" width="248" height="10" stroke="white" strokeOpacity="0.16" strokeWidth="0.8" />
              <rect x="16" y="340" width="268" height="10" stroke="white" strokeOpacity="0.12" strokeWidth="0.8" />
              <rect x="4" y="350" width="292" height="12" stroke="white" strokeOpacity="0.09" strokeWidth="0.8" />

              {/* Ground accent line */}
              <line x1="0" y1="362" x2="300" y2="362" stroke="#c9440e" strokeOpacity="0.18" strokeWidth="0.6" />
            </svg>
          </div>

        </div>
      </section>

      {/* Stats bar */}
      <div className="mx-6 border-y border-white/8 py-8 flex justify-around">
        {[
          { n: '12 000', label: 'livres ajoutés' },
          { n: '2 400', label: 'fiches écrites' },
          { n: '840', label: 'lecteurs actifs' },
        ].map(({ n, label }) => (
          <div key={label} className="text-center">
            <p className="font-serif text-2xl text-white">{n}</p>
            <p className="text-[#7a7268] text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Features */}
      <section className="px-6 py-16">
        <p className="text-[#7a7268] text-xs font-medium tracking-[0.18em] uppercase text-center mb-12">
          Ce que tu peux faire
        </p>
        <div className="flex flex-col gap-8">
          {[
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9440e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              ),
              title: 'Ta bibliothèque, enfin organisée',
              body: 'Cherche parmi des millions de livres, ajoute-les en un tap. Filtre par statut — en cours, lu, à lire.',
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9440e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              ),
              title: 'Des fiches qui durent',
              body: 'Pour chaque lecture : une note sur 5, tes impressions, et tes citations préférées. Ton rapport au livre, écrit noir sur blanc.',
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9440e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              ),
              title: 'Partage ce que tu lis',
              body: `Explore les bibliothèques d'autres lecteurs. Découvre ce qui les a marqués. Partage ta propre vie littéraire.`,
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#c9440e]/10 flex items-center justify-center shrink-0 mt-0.5">
                {icon}
              </div>
              <div>
                <h3 className="font-serif text-base text-white mb-1.5">{title}</h3>
                <p className="text-[#7a7268] text-sm leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-6" />

      {/* Testimonials */}
      <section className="px-6 py-16">
        <p className="text-[#7a7268] text-xs font-medium tracking-[0.18em] uppercase text-center mb-12">
          Ce qu'ils en disent
        </p>
        <div className="flex flex-col gap-5">
          {[
            {
              initial: 'M',
              name: 'Mathilde R.',
              text: `« Enfin un endroit où mes notes de lecture ont du sens. Je relis mes fiches des mois après — c'est comme un journal intime littéraire. »`,
            },
            {
              initial: 'T',
              name: 'Thomas V.',
              text: `« L'interface est sobre et belle. J'ai arrêté Goodreads pour ça — moins de bruit, plus de profondeur. »`,
            },
            {
              initial: 'S',
              name: 'Salomé K.',
              text: `« Pouvoir voir ce que lisent mes amis et commenter leurs fiches, c'est exactement ce qui me manquait. »`,
            },
          ].map(({ initial, name, text }) => (
            <div key={name} className="bg-[#242018] border border-white/8 rounded-2xl p-5">
              <p className="text-white/75 text-sm leading-relaxed mb-5 italic">{text}</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#c9440e]/15 flex items-center justify-center shrink-0">
                  <span className="font-serif text-[#c9440e] text-sm leading-none">{initial}</span>
                </div>
                <span className="text-[#7a7268] text-xs">{name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-20 flex flex-col items-center text-center">
        <div className="w-full max-w-sm bg-[#242018] border border-white/8 rounded-3xl px-8 py-12">
          <p className="font-serif text-[1.6rem] leading-tight text-white mb-3">
            Commence ton journal de lecture.
          </p>
          <p className="text-[#7a7268] text-sm leading-relaxed mb-8">
            Gratuit. Sans algorithme. Juste toi et tes livres.
          </p>
          <a href="/auth" className="block bg-[#c9440e] text-white py-3.5 rounded-full text-sm font-medium hover:opacity-90 transition">
            Créer mon compte →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 flex items-center justify-between">
        <span className="font-serif text-base text-white/50">
          con<span className="text-[#c9440e]">a</span>tus
        </span>
        <p className="text-[#7a7268] text-xs">© 2026</p>
      </footer>

    </div>
  )
}
