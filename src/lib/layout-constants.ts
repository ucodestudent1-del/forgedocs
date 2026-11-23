// Centralized layout tokens for consistent spacing and sizing across the application.
// All layout-critical values should be defined here and referenced via CSS variables
// to ensure a single source of truth.

export const LAYOUT_TOKENS = {
  // Header heights
  headerHeight: "64px",      // h-16
  headerHeightMobile: "64px", // h-16
  headerHeightDesktop: "64px", // h-16

  // Sidebar widths
  sidebarWidth: "256px",     // w-64
  sidebarWidthCollapsed: "72px", // w-18

  // Container max-widths
  containerMaxWidth: "1280px", // max-w-7xl
  containerMaxWidthNarrow: "768px", // max-w-md
  containerMaxWidthWide: "1536px", // max-w-8xl

  // Page padding
  pagePaddingX: "1rem",      // px-4
  pagePaddingXMobile: "1rem",
  pagePaddingXDesktop: "1.5rem", // px-6
  pagePaddingXLDesktop: "2rem",    // px-8

  // Section padding
  sectionPaddingY: "6rem",   // py-24
  sectionPaddingYMobile: "3rem",   // py-12

  // Z-index scale
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    toast: 1600,
  },
} as const

// CSS variable names mapped to token values
export const LAYOUT_CSS_VARS = {
  "--layout-header-height": LAYOUT_TOKENS.headerHeight,
  "--layout-sidebar-width": LAYOUT_TOKENS.sidebarWidth,
} as const
