'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Menu, X } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const primaryNavLinks = [
  { href: '/listings/', label: 'Listings' },
  { href: '#services', label: 'Services' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/visakhapatnam/', label: 'Visakhapatnam Services' },
]

const moreNavLinks = [
  { href: '/blog/', label: 'Blog' },
  { href: '#about', label: 'About' },
  { href: '#investors', label: 'For Investors' },
  { href: '#contact', label: 'Contact' },
]

const mobileNavLinks = [...primaryNavLinks, ...moreNavLinks]
const MOBILE_MENU_ID = 'plotkare-mobile-menu'

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const previousOverflow = document.body.style.overflow
    const main = document.querySelector('main')
    const menuButton = menuButtonRef.current
    document.body.style.overflow = 'hidden'
    main?.setAttribute('inert', '')
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsMobileMenuOpen(false)
        return
      }

      if (event.key !== 'Tab' || !mobileMenuRef.current) return
      const focusable = Array.from(
        mobileMenuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      main?.removeAttribute('inert')
      menuButton?.focus()
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
          <div className="flex h-20 items-center gap-5">
            {/* Logo */}
            <Link href="/" className="shrink-0">
              <LogoMark />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden flex-1 items-center justify-center gap-5 2xl:gap-7 xl:flex">
              {primaryNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="premium-nav-link whitespace-nowrap font-sans text-[13px] font-medium text-foreground/80 transition-colors hover:text-primary xl:text-sm"
                >
                  {link.label}
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger className="premium-nav-link inline-flex items-center gap-1 whitespace-nowrap font-sans text-[13px] font-medium text-foreground/80 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary xl:text-sm">
                  More
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={12}
                  className="min-w-52 rounded-sm border-border bg-white p-2 shadow-xl"
                >
                  {moreNavLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild className="cursor-pointer px-3 py-2.5">
                      <Link href={link.href}>{link.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* CTA */}
            <div className="hidden shrink-0 items-center gap-6 xl:flex">
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
              ref={menuButtonRef}
              onClick={() => setIsMobileMenuOpen(true)}
              className="premium-interactive flex h-10 w-10 items-center justify-center rounded-sm xl:hidden"
              aria-label="Open menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls={MOBILE_MENU_ID}
            >
              <Menu className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            id={MOBILE_MENU_ID}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="fixed inset-0 z-[60] bg-charcoal"
          >
            <div className="flex h-full min-h-0 flex-col px-6 py-8">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LogoMark variant="light" />
                </Link>
                <button
                  ref={closeButtonRef}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center text-white"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                </button>
              </div>

              <nav className="mt-10 flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto pb-6">
                {mobileNavLinks.map((link) => (
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
