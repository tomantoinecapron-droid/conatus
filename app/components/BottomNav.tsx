'use client'

import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  const tabs = [
    {
      href: '/home',
      label: 'Accueil',
      active: pathname === '/home',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#c9440e' : '#7a7268'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      href: '/bibliotheque',
      label: 'Biblio',
      active: pathname.startsWith('/bibliotheque') || pathname.startsWith('/fiche'),
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#c9440e' : '#7a7268'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      href: '/stats',
      label: 'Stats',
      active: pathname.startsWith('/stats'),
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#c9440e' : '#7a7268'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      href: '/social',
      label: 'Social',
      active: pathname.startsWith('/social') || pathname.startsWith('/explorer') || pathname.startsWith('/cercles'),
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#c9440e' : '#7a7268'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      href: '/profil',
      label: 'Profil',
      active: pathname.startsWith('/profil'),
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#c9440e' : '#7a7268'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1714]/95 backdrop-blur border-t border-white/10 z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-opacity"
          >
            {tab.icon(tab.active)}
            <span className={`text-[10px] font-medium transition-colors ${tab.active ? 'text-[#c9440e]' : 'text-[#7a7268]'}`}>
              {tab.label}
            </span>
          </a>
        ))}
      </div>
    </nav>
  )
}
