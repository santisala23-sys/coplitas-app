'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  
  // Guardamos el nombre de usuario en un estado
  const [username, setUsername] = useState('Equipo')

  useEffect(() => {
    // Apenas carga el componente, leemos la cookie con el nombre
    const user = Cookies.get('coplitas_user')
    if (user) {
      setUsername(user)
    }
  }, [])

  // No mostramos la navbar en la pantalla de login
  if (pathname === '/login') return null

  const navLinks = [
    { name: 'Inicio', href: '/', icon: '🏠', exact: true },
    { name: 'Catálogo', href: '/catalogo', icon: '🎵' },
    { name: 'Tareas', href: '/tareas', icon: '✅' },
    { name: 'Planis', href: '/planis', icon: '📋' },
  ]

  const handleLogout = () => {
    Cookies.remove('coplitas_role')
    Cookies.remove('coplitas_user')
    Cookies.remove('app_pin')
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* --- MENÚ LATERAL (DESKTOP) --- */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-white border-r min-h-screen fixed left-0 top-0 p-4 z-50">
        <div>
          <div className="mb-8 p-2">
            <h2 className="text-xl font-bold text-purple-700">Coplitas App</h2>
            <p className="text-xs text-gray-500">Hola, <span className="capitalize font-semibold">{username}</span> 👋</p>
          </div>

          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const isActive = link.exact 
                ? pathname === link.href 
                : pathname.startsWith(link.href)

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
                  <span className="text-xl w-6 text-center">{link.icon}</span>
                  {link.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t pt-4">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-xl transition font-medium"
          >
            <span className="text-xl w-6 text-center">🚪</span>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- HEADER SUPERIOR (MOBILE) --- */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white/90 backdrop-blur border-b p-3 px-4 z-40 flex justify-between items-center shadow-sm">
        {/* ACÁ AGREGAMOS EL NOMBRE DEL USUARIO */}
        <div className="flex items-baseline gap-2">
          <h2 className="font-bold text-purple-700 text-lg">Coplitas</h2>
          <span className="text-sm font-medium text-gray-500 capitalize">| {username}</span>
        </div>

        <button 
          onClick={handleLogout}
          className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-1"
        >
          <span>🚪</span> Salir
        </button>
      </div>

      {/* --- BARRA INFERIOR (MOBILE) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t flex justify-around p-2 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navLinks.map((link) => {
          const isActive = link.exact 
                ? pathname === link.href 
                : pathname.startsWith(link.href)

          return (
            <Link 
              key={link.name} 
              href={link.href}
              className={`flex flex-col items-center p-2 min-w-[64px] ${
                isActive ? 'text-purple-700' : 'text-gray-500'
              }`}
            >
              <span className={`text-2xl mb-1 ${isActive ? 'scale-110 transition-transform' : 'grayscale opacity-80'}`}>
                {link.icon}
              </span>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {link.name}
              </span>
            </Link>
          )
        })}
      </nav>
      
      <style jsx global>{`
        @media (max-width: 768px) {
          main {
            padding-top: 60px;
          }
        }
      `}</style>
    </>
  )
}