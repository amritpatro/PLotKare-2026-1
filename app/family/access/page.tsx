import Link from 'next/link'
import { FamilyAccessAccept } from '@/components/property-care/family-access-accept'

export default async function FamilyAccessPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  if (!token || token.length < 32) return <main className="min-h-screen bg-[#FAF8F5] px-4 py-16"><div className="mx-auto max-w-lg rounded-xl bg-white p-6"><h1 className="font-serif text-2xl font-bold">Invalid family access link</h1><p className="mt-2 text-sm text-[#4B5563]">Ask the owner to send a new invitation.</p></div></main>
  return <main className="min-h-screen bg-[#FAF8F5] px-4 py-16"><div className="mx-auto max-w-lg"><FamilyAccessAccept token={token} /><Link className="mt-5 inline-block text-sm font-semibold text-[#8B1538]" href={`/auth/login?next=${encodeURIComponent(`/family/access?token=${token}`)}`}>Sign in with the invited email</Link></div></main>
}
