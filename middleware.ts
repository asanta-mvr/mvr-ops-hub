import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  const isAuthPage = pathname.startsWith('/login')
  const isApiWebhook = pathname.startsWith('/api/webhooks')
  const isApiAuth = pathname.startsWith('/api/auth')
  const isApiV1 = pathname.startsWith('/api/v1')
  // Public invitation landing — no session yet, the invitee may not even
  // have a User row until after they sign in via Google.
  const isInviteLanding = pathname.startsWith('/invite/')
  // /no-access is reachable from signIn rejection (no session yet), so it
  // must not be gated by the middleware redirect-to-login.
  const isNoAccess = pathname.startsWith('/no-access')

  // API routes handle their own auth (session or API key) — never redirect them
  if (isApiWebhook || isApiAuth || isApiV1) return NextResponse.next()
  if (isInviteLanding || isNoAccess) return NextResponse.next()

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
