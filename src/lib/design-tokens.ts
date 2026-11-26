// Design Tokens — ForgeDocs
// Centralized design system for typography, spacing, color, and motion.

export const typography = {
  // Font sizes
  xs: "0.75rem",    // 12px
  sm: "0.875rem",   // 14px
  base: "1rem",     // 16px
  lg: "1.125rem",   // 18px
  xl: "1.25rem",    // 20px
  "2xl": "1.5rem",  // 24px
  "3xl": "1.875rem", // 30px
  "4xl": "2.25rem", // 36px
  "5xl": "3rem",    // 48px
  "6xl": "3.75rem", // 60px
  "7xl": "4.5rem",  // 72px

  // Line heights
  leadingTight: "1.25",
  leadingNormal: "1.5",
  leadingRelaxed: "1.75",

  // Font weights
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,

  // Letter spacing
  letterTight: "-0.025em",
  letterNormal: "0em",
  letterWide: "0.05em",
} as const

export const spacing = {
  xs: "0.25rem",   // 4px
  sm: "0.5rem",    // 8px
  md: "1rem",      // 16px
  lg: "1.5rem",    // 24px
  xl: "2rem",      // 32px
  "2xl": "3rem",   // 48px
} as const

// Max content widths for readability (optimal 45-75 chars per line)
export const measure = {
  narrow: "40ch",
  standard: "65ch",
  wide: "75ch",
} as const

// Border radius scale
export const radius = {
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  full: "9999px",
} as const

// Animation durations
export const motion = {
  fast: "150ms",
  normal: "250ms",
  slow: "350ms",
} as const
