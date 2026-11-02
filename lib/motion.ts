import type { Transition, Variants } from 'framer-motion'

/** Shared motion values for public-facing UI. All durations stay below 600ms. */
export const motionTokens = {
  duration: {
    micro: 0.15,
    standard: 0.2,
    emphasis: 0.3,
    reveal: 0.48,
  },
  ease: [0.16, 1, 0.3, 1] as const,
  revealDistance: 14,
} as const

export const revealTransition: Transition = {
  duration: motionTokens.duration.reveal,
  ease: motionTokens.ease,
}

export const revealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: motionTokens.revealDistance,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: revealTransition,
  },
}
