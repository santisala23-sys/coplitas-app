import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pinCookie = request.cookies.get('app_pin')?.value
  const validPin = process.env.NEXT_PUBLIC_APP_PIN

  // Si no está en la página de login y el PIN es incorrecto
  if (pinCookie !== validPin && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si está logueada y quiere ir a /login, la mandamos al inicio
  if (pinCookie === validPin && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Proteger todas las rutas excepto la API, Next.js internals y estáticos
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}