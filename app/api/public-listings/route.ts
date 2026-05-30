import { NextResponse } from 'next/server'
import { getVerifiedPublicListings } from '@/lib/public-listings-server'

export async function GET() {
  const listings = await getVerifiedPublicListings()
  return NextResponse.json({ listings })
}
