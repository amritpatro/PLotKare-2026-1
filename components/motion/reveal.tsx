'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { motionTokens, revealVariants } from '@/lib/motion'

type RevealProps = {
  children: ReactNode
  delay?: number
  className?: string
}

/** A small, once-only viewport reveal that becomes static for reduced motion. */
export function Reveal({
  children,
  delay = 0,
  className,
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={revealVariants}
      transition={{ delay, duration: motionTokens.duration.reveal, ease: motionTokens.ease }}
    >
      {children}
    </motion.div>
  )
}
