import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/dashboard'
  const origin = url.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`)
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/?error=auth_callback_failed`)
    }

    return NextResponse.redirect(`${origin}${next}`)
  } catch (error) {
    console.error(error)
    return NextResponse.redirect(`${origin}/?error=callback_exception`)
  }
}
