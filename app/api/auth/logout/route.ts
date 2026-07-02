import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ ok: false, error: { message: 'Logout failed.' } }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
