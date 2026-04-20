import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  const isAuthPage = pathname.startsWith('/login')
  const isApiWebhook = pathname.startsWith('/api/webhooks')
  const isApiAuth = pathname.startsWith('/api/auth')

  // Webhooks and auth callbacks are public (webhooks protected by HMAC)
  if (isApiWebhook || isApiAuth) return NextResponse.next()

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from login
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|images).*)'],
}
