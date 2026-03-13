'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  // No mostramos la navbar en la pantalla de login
  if (pathname === '/login') return null

  const navLinks = [
    { name: 'Catálogo', href: '/catalogo', icon: '🎵' },
    { name: 'Planis', href: '/planis', icon: '📋' },
   // { name: 'Eventos', href: '/eventos', icon: '🎉' },
    //{ name: 'Finanzas', href: '/finanzas', icon: '💰' },
  ]

  return (
    <>
      {/* --- MENÚ LATERAL (DESKTOP) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r min-h-screen fixed left-0 top-0 p-4">
        <div className="mb-8 p-2">
          <h2 className="text-xl font-bold text-purple-700">Coplitas App</h2>
          <p className="text-xs text-gray-500">Gestión de Rondas</p>
        </div>

        <nav className="flex flex-col gap-2">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href)
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className={`flex items-center gap-3 p-3 rounded-xl transition ${
                  isActive 
                    ? 'bg-purple-100 text-purple-800 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                {link.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* --- BARRA INFERIOR (MOBILE) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t flex justify-around p-2 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href)
          return (
            <Link 
              key={link.name} 
              href={link.href}
              className={`flex flex-col items-center p-2 min-w-[64px] ${
                isActive ? 'text-purple-700' : 'text-gray-500'
              }`}
            >
              <span className={`text-2xl mb-1 ${isActive ? 'scale-110 transition-transform' : ''}`}>
                {link.icon}
              </span>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {link.name}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}