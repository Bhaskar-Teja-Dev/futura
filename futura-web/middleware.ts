import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/onboarding', '/projection', '/learn', '/settings', '/upgrade']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session }
  } = await supabase.auth.getSession()

  const isProtected = PROTECTED.some((path) => req.nextUrl.pathname.startsWith(path))

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (session && req.nextUrl.pathname !== '/onboarding') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', session.user.id)
      .maybeSingle()

    if (!profile?.onboarding_complete && req.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
