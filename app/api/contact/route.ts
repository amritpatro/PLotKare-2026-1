import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email and message are required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()
    const normalizedMessage = String(message ?? '').trim()
    const hasListingRef = /listing reference:/i.test(normalizedMessage)

    const { error } = await supabase.from('consultation_requests').insert({
      user_id: null,
      role: 'public_visitor',
      source: hasListingRef ? 'landing_listing_inquiry' : 'website_contact',
      subject: hasListingRef ? `Listing inquiry from ${name}` : `Website contact from ${name}`,
      message: normalizedMessage,
      status: 'open',
      metadata: {
        name,
        email,
        phone: phone || null,
        user_agent: request.headers.get('user-agent'),
      },
    })

    if (error) {
      console.error('Contact form persistence error:', error)
      return NextResponse.json(
        { error: 'Could not submit your request right now. Please try again.' },
        { status: 500 }
      )
    }

    console.info('Contact form submission stored', {
      source: hasListingRef ? 'landing_listing_inquiry' : 'website_contact',
      email,
      hasPhone: Boolean(phone),
    })

    return NextResponse.json({ success: true, message: 'Message received' })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
