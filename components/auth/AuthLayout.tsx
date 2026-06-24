'use client'

import Link from 'next/link'
import { LogoMark } from '@/components/logo'

type AuthLayoutProps = {
  children: React.ReactNode
  headline: string
  subtext: string
}

export function AuthLayout({ children, headline, subtext }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#F8F6F3] md:grid-cols-[30fr_70fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#1E1E1E] p-8 md:flex md:flex-col lg:p-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(248,246,243,0.72) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(135deg,rgba(139,21,56,0.24),transparent_38%,rgba(212,175,148,0.10)_100%)]" />

        <div className="relative z-10 flex h-full flex-col">
          <Link href="/" aria-label="PlotKare home" className="w-fit">
            <LogoMark variant="light" />
          </Link>

          <div className="flex flex-1 flex-col justify-center pb-10">
            <div className="max-w-md">
              <div className="mb-7 h-px w-24 bg-[#D4AF94]/40" />
              <p className="font-serif text-4xl font-bold leading-[1.04] tracking-tight text-white xl:text-5xl">
                {headline}
              </p>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-white/65">
                {subtext}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-start bg-[#F8F6F3] px-5 py-10 md:px-8 lg:px-10 xl:px-14">
        <div className="w-full max-w-[980px]">{children}</div>
      </section>
    </main>
  )
}
