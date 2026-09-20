/**
 * Lecture Whisper Motion System Tokens
 * Source of truth for animations, springs, durations, and easings.
 * Adheres strictly to transform + opacity rules and 60fps targets.
 */

export const motionDurations = {
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
  hero: 0.8,
  loader: 1.2,
} as const;

export const motionEasings = {
  expoOut: [0.16, 1, 0.3, 1] as const,
  easeInOut: [0.65, 0, 0.35, 1] as const,
  gentle: [0.25, 0.1, 0.25, 1] as const,
} as const;

export const springPresets = {
  // Snappy: fast interactive feedback (button clicks, toggle switches)
  snappy: {
    type: 'spring' as const,
    stiffness: 420,
    damping: 30,
    mass: 0.8,
  },
  // Gentle: smooth reveals, card expands, drawer sliding
  gentle: {
    type: 'spring' as const,
    stiffness: 220,
    damping: 24,
  },
  // Bouncy: celebratory chips (e.g. "Filler removed", status checkmark)
  bouncy: {
    type: 'spring' as const,
    stiffness: 340,
    damping: 18,
  },
  // Morph: Whisper Bar floating pill state transitions
  morph: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 28,
  },
} as const;

// Transition variants
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: motionDurations.base, ease: motionEasings.expoOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: motionDurations.fast },
  },
};

export const slideUpVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDurations.slow, ease: motionEasings.expoOut },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: motionDurations.fast },
  },
};

export const splitWordVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: motionDurations.slow,
      ease: motionEasings.expoOut,
    },
  }),
};
