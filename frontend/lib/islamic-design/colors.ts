/**
 * Islamic Design System - Color Palette
 * Professional, elegant colors inspired by Islamic art and architecture
 */

export const islamicColors = {
  // Primary - Deep Forest Green (Tranquility)
  primary: {
    50: '#F0F9F4',
    100: '#D9F2E3',
    200: '#B3E5C7',
    300: '#80D4A5',
    400: '#4DB87F',
    500: '#0F4C3A', // Main deep green
    600: '#0C3D2E',
    700: '#092E23',
    800: '#061F17',
    900: '#03100C',
  },

  // Secondary - Sacred Gold (Illumination)
  gold: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#D4AF37', // Main gold
    600: '#B8941E',
    700: '#8B6914',
    800: '#5C450D',
    900: '#2E2207',
  },

  // Tertiary - Midnight Blue (Night Prayer)
  midnight: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#0E1A2B', // Main midnight blue
    600: '#0B1521',
    700: '#081018',
    800: '#050B10',
    900: '#020508',
  },

  // Neutral - Sand Tones (Desert Purity)
  sand: {
    50: '#FDFCFB',
    100: '#F9F7F4',
    200: '#F4E9D8', // Main sand
    300: '#E8D5BB',
    400: '#DCC19E',
    500: '#C9A776',
    600: '#A6885E',
    700: '#7D6546',
    800: '#544330',
    900: '#2A2118',
  },

  // Accent - Emerald (Spiritual Growth)
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  // Accent - Ruby (Passion for Knowledge)
  ruby: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#BE123C',
    600: '#9F1239',
    700: '#881337',
    800: '#4C0519',
    900: '#26020C',
  },

  // Semantic Colors
  success: {
    light: '#D1FAE5',
    main: '#10B981',
    dark: '#065F46',
  },
  warning: {
    light: '#FEF3C7',
    main: '#F59E0B',
    dark: '#92400E',
  },
  error: {
    light: '#FEE2E2',
    main: '#DC2626',
    dark: '#991B1B',
  },
  info: {
    light: '#DBEAFE',
    main: '#3B82F6',
    dark: '#1E40AF',
  },
};

// Gradient Combinations
export const islamicGradients = {
  primary: 'from-primary-600 via-primary-500 to-emerald-600',
  gold: 'from-gold-500 via-gold-400 to-gold-300',
  midnight: 'from-midnight-500 via-midnight-600 to-primary-700',
  sunset: 'from-gold-400 via-ruby-400 to-primary-500',
  dawn: 'from-sand-200 via-gold-100 to-emerald-50',
  ocean: 'from-emerald-500 via-primary-500 to-midnight-500',
};

// Tailwind CSS Custom Colors Export
export const tailwindIslamicColors = {
  'islamic-primary': islamicColors.primary,
  'islamic-gold': islamicColors.gold,
  'islamic-midnight': islamicColors.midnight,
  'islamic-sand': islamicColors.sand,
  'islamic-emerald': islamicColors.emerald,
  'islamic-ruby': islamicColors.ruby,
};
