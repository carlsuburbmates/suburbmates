import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

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

  return await updateSession(request)
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
