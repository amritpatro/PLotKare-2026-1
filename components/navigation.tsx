'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { LogoMark } from '@/components/logo'

const navLinks = [
  { href: '/listings/', label: 'Listings' },
  { href: '/blog/', label: 'Blog' },
  { href: '#about', label: 'About' },
  { href: '#services', label: 'Services' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#presence', label: 'Cities' },
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

  return (
    <>
      <motion.nav
        initial={false}
        className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-300 ${
          isScrolled ? 'shadow-md' : 'border-b border-border'
        }`}
      >
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <Link href="/">
              <LogoMark />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-10 lg:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-sans text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden items-center gap-6 lg:flex">
              <Link
                href="/signup"
                className="font-sans text-sm font-medium text-primary transition-colors hover:text-primary/90"
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-sm bg-foreground px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-foreground/90"
              >
                Owner Login
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center lg:hidden"
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
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-charcoal"
          >
            <div className="flex h-full flex-col px-6 py-8">
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

              <nav className="mt-16 flex flex-1 flex-col gap-8">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={link.href}
                      className="font-serif text-4xl font-semibold text-white transition-colors hover:text-primary"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <div className="mt-auto flex flex-col gap-4">
                <Link
                  href="/signup"
                  className="text-center font-sans text-base font-medium text-primary transition-colors hover:text-primary/90"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-sm bg-primary px-6 py-4 font-sans text-base font-medium text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Owner Login
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
