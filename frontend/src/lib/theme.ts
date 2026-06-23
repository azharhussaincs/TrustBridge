/**
 * TrustBridge design tokens — WCAG AA contrast on blue surfaces.
 * Consumed by globals.css (CSS variables) and tailwind.config.js.
 */

export const theme = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#0f172a',
    },
    surface: {
      DEFAULT: '#1e40af',
      raised: '#2563eb',
      card: '#2563eb',
      cardSecondary: '#1d4ed8',
      sidebar: '#1e3a8a',
      tableHeader: '#1e3a8a',
      tableRow: '#1d4ed8',
      tableRowAlt: '#1e40af',
      overlay: 'rgba(30, 64, 175, 0.92)',
      panelLight: 'rgba(255, 255, 255, 0.97)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#e5e7eb',
      muted: '#cbd5e1',
      onLight: '#0f172a',
      onLightMuted: '#475569',
      onLightSubtle: '#64748b',
    },
    border: {
      DEFAULT: 'rgba(255, 255, 255, 0.15)',
      strong: 'rgba(255, 255, 255, 0.25)',
      light: '#e2e8f0',
    },
    accent: {
      gradientFrom: '#2563eb',
      gradientTo: '#1d4ed8',
      glow: 'rgba(37, 99, 235, 0.45)',
    },
    status: {
      online: '#34d399',
      offline: '#94a3b8',
      unread: '#f43f5e',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
    },
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    '3xl': '1.5rem',
  },
  shadow: {
    card: '0 4px 14px rgba(0, 0, 0, 0.22)',
    elevated: '0 20px 40px rgba(0, 0, 0, 0.28)',
    glow: '0 0 32px rgba(37, 99, 235, 0.35)',
  },
} as const;

export type Theme = typeof theme;

export const cssVars = {
  bgPrimary: '--tb-bg-primary',
  bgSurface: '--tb-bg-surface',
  bgCard: '--tb-bg-card',
  bgCardSecondary: '--tb-bg-card-secondary',
  bgSidebar: '--tb-bg-sidebar',
  bgTableHeader: '--tb-bg-table-header',
  textPrimary: '--tb-text-primary',
  textSecondary: '--tb-text-secondary',
  textMuted: '--tb-text-muted',
  borderDefault: '--tb-border',
  gradientFrom: '--tb-gradient-from',
  gradientTo: '--tb-gradient-to',
} as const;
