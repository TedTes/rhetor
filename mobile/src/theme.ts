// Design tokens — clean, confident, not purple-heavy
export const colors = {
  // Backgrounds
  bg: '#F8FAFC',
  bgDark: '#0F172A',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',

  // Text
  ink: '#0F172A',
  inkMid: '#334155',
  inkLight: '#64748B',
  inkFaint: '#94A3B8',

  // Accent — clear blue
  accent: '#1D4ED8',
  accentDeep: '#1E40AF',
  accentLight: '#DBEAFE',
  accentSurface: '#EFF6FF',

  // Status
  error: '#DC2626',
  errorBg: '#FEF2F2',
  success: '#059669',
  successBg: '#ECFDF5',

  // Borders
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const typography = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    '2xl': 28,
    '3xl': 36,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeight: {
    tight: 1.15,
    snug: 1.35,
    normal: 1.55,
    relaxed: 1.75,
  },
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
