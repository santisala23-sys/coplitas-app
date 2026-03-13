'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  // No mostramos la navbar en la pantalla de login
  if (pathname === '/login') return null

  // Agregamos el Inicio (Home) a la lista
  const navLinks = [
    { name: 'Inicio', href: '/', icon: '', exact: true }, // exact: true para que no quede siempre activo
    { name: 'Catálogo', href: '/catalogo', icon: '' },
    { name: 'Planis', href: '/planis', icon: '' },
    // { name: 'Eventos', href: '/eventos', icon: '' },
    // { name: 'Finanzas', href: '/finanzas', icon: '' },
  ]

  // Función para cerrar sesión
  const handleLogout = () => {
    Cookies.remove('coplitas_role')
    Cookies.remove('coplitas_user')
    Cookies.remove('app_pin') // Por las dudas si quedó el viejo
    router.push('/login')
    router.refresh()
  }

  // Obtenemos el nombre de usuario para mostrarlo (opcional pero queda lindo)
  const username = Cookies.get('coplitas_user') || 'Usuario'

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
              // Si es "Inicio" (/), solo se activa si la ruta es EXACTAMENTE "/"
              // Si son las otras, se activan si la ruta EMPieza con su href (ej: /catalogo/algo)
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

        {/* Botón Cerrar Sesión (Abajo de todo en Desktop) */}
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


      {/* --- HEADER SUPERIOR (MOBILE) --- 
          Acá agregamos el botón de salir para no saturar la barra de abajo
      */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white/90 backdrop-blur border-b p-3 px-4 z-40 flex justify-between items-center shadow-sm">
        <h2 className="font-bold text-purple-700">Coplitas</h2>
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
      
      {/* Como agregamos un header fijo en mobile, necesitamos empujar el contenido hacia abajo en el celular para que no quede tapado por el header */}
      <style jsx global>{`
        @media (max-width: 768px) {
          main {
            padding-top: 60px; /* Compensa el header superior */
          }
        }
      `}</style>
    </>
  )
}