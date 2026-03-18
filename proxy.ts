import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Solo cambiamos la palabra "middleware" por "proxy" en esta línea
export function proxy(request: NextRequest) {
  // Leemos la nueva "credencial" (la cookie del rol que creamos en el login)
  const userRole = request.cookies.get('coplitas_role')?.value

  // Si no está logueado y quiere entrar a una página que NO sea /login, lo pateamos al login
  if (!userRole && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si ya está logueado y quiere volver a entrar a /login, lo mandamos al Inicio
  if (userRole && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Configuración para ignorar archivos estáticos (como el logo, imágenes y código interno de Next.js)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}