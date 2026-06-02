'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/logo'

const navLinks = [
  { href: '/listings/', label: 'Listings' },
  { href: '/blog/', label: 'Blog' },
  { href: '#about', label: 'About' },
  { href: '#services', label: 'Services' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/visakhapatnam/', label: 'Visakhapatnam Services' },
  { href: '#investors', label: 'For Investors' },
  { href: '#contact', label: 'Contact' },
]

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  // Smooth and reliable hash scrolling for anchor links
  useEffect(() => {
    function handleAnchorClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return
      const a = target.closest('a') as HTMLAnchorElement | null
      if (!a || !a.hash) return
      const id = a.hash.replace('#', '')
      if (!id) return
      const el = document.getElementById(id)
      if (el) {
        e.preventDefault()
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // update history so link works as expected
        window.history.replaceState(null, '', a.getAttribute('href') || a.href)
        // close mobile menu if open
        setIsMobileMenuOpen(false)
      } else {
        // if element not present yet, retry a few times
        let attempts = 0
        const tryScroll = () => {
          const el2 = document.getElementById(id)
          if (el2) {
            e.preventDefault()
            el2.scrollIntoView({ behavior: 'smooth', block: 'start' })
            window.history.replaceState(null, '', a.getAttribute('href') || a.href)
            setIsMobileMenuOpen(false)
            return
          }
          attempts += 1
          if (attempts < 6) requestAnimationFrame(tryScroll)
        }
        tryScroll()
      }
    }

    document.addEventListener('click', handleAnchorClick)
    return () => document.removeEventListener('click', handleAnchorClick)
  }, [])

  return (
    <>
      <nav
        data-scrolled={isScrolled}
        className="premium-nav fixed top-0 left-0 right-0 z-50 border-b border-border bg-white/95"
      >
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <Link href="/">
              <LogoMark />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-5 xl:gap-6 2xl:gap-9 lg:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="premium-nav-link font-sans text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden items-center gap-4 xl:gap-6 lg:flex">
              <Link
                href="/signup"
                className="premium-nav-link font-sans text-sm font-medium text-primary transition-colors hover:text-primary/90"
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className="premium-button-dark inline-flex items-center justify-center rounded-sm bg-foreground px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-foreground/90"
              >
                Owner Login
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="premium-interactive flex h-10 w-10 items-center justify-center rounded-sm lg:hidden"
              aria-label="Open menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[60] bg-charcoal">
            <div className="flex h-full min-h-0 flex-col px-6 py-8">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LogoMark />
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center text-white"
                  aria-label="Close menu"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <nav className="mt-10 flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto pb-6">
                {navLinks.map((link) => (
                  <div key={link.href}>
                    <Link
                  href={link.href}
                      className="block max-w-full break-words font-serif text-3xl font-semibold leading-tight text-white transition-colors hover:text-primary sm:text-4xl"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </div>
                ))}
              </nav>

              <div className="mt-6 flex shrink-0 flex-col gap-4">
                <Link
                  href="/signup"
                  className="text-center font-sans text-base font-medium text-primary transition-colors hover:text-primary/90"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className="premium-button inline-flex w-full items-center justify-center rounded-sm bg-primary px-6 py-4 font-sans text-base font-medium text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Owner Login
                </Link>
              </div>
            </div>
          </div>
      )}
    </>
  )
}
