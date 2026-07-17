import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// Public release is opt-in. Until the owner explicitly enables it at build
// time, only the holding page and private operational paths are reachable.
const publicLaunchEnabled = process.env.NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED === 'true'

function isHoldingPostureAllowedPath(pathname: string) {
  return pathname === '/' ||
    pathname === '/sitemap.xml' ||
    pathname === '/login' ||
    pathname.startsWith('/auth/') ||
    pathname === '/ops' ||
    pathname.startsWith('/ops/') ||
    pathname.startsWith('/api/')
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.hostname === 'www.suburbmates.com.au') {
    const canonicalUrl = request.nextUrl.clone()
    canonicalUrl.hostname = 'suburbmates.com.au'
    canonicalUrl.protocol = 'https:'
    return NextResponse.redirect(canonicalUrl, 308)
  }

  // Supabase falls back to the configured Site URL when a requested redirect
  // URL is not on its allow list. Preserve the one-time code and complete the
  // existing server-side exchange route rather than leaving the user at home.
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = '/auth/callback'
    return NextResponse.redirect(callbackUrl)
  }

  if (!publicLaunchEnabled && !isHoldingPostureAllowedPath(request.nextUrl.pathname)) {
    const holdingUrl = request.nextUrl.clone()
    holdingUrl.pathname = '/'
    holdingUrl.search = ''
    return NextResponse.redirect(holdingUrl, 307)
  }

  const response = await updateSession(request)
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/auth/')) {
    response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate')
  }
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
