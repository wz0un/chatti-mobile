/**
 * Modern Color System - Chat-ti Mobile
 * Deep Orange & Vibrant Green Theme
 */

const baseColors = {
    orange: {
        50: '#FFF7ED',
        100: '#FFEDD5',
        200: '#FED7AA',
        300: '#FDBA74',
        400: '#FB923C',
        500: '#FF6B35', // Main Orange
        600: '#EA580C',
        700: '#C2410C',
        800: '#9A3412',
        900: '#7C2D12',
    },
    green: {
        50: '#F0FDFA',
        100: '#CCFBF1',
        200: '#99F6E4',
        300: '#5EEAD4',
        400: '#2DD4BF',
        500: '#4ECDC4', // Main Green
        600: '#0D9488',
        700: '#0F766E',
        800: '#115E59',
        900: '#134E4A',
    }
};

const shadows = {
    sm: {
        shadowColor: 'rgba(255, 107, 53, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    md: {
        shadowColor: 'rgba(255, 107, 53, 0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    lg: {
        shadowColor: 'rgba(255, 107, 53, 0.4)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
};

const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

const typography = {
    h1: { fontSize: 32, fontWeight: '800', lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
    body: { fontSize: 16, lineHeight: 24 },
    bodySmall: { fontSize: 14, lineHeight: 20 },
    caption: { fontSize: 12, lineHeight: 16 },
};

const borderRadius = {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    full: 9999,
};

export const lightColors = {
    primary: baseColors.orange[500],
    primaryDark: baseColors.orange[700],
    primaryLight: baseColors.orange[300],
    secondary: baseColors.green[500],
    accent: baseColors.orange[200],

    background: '#FDFCFB',
    surface: '#FFFFFF',
    surfaceSecondary: '#F7F2EB',
    surfaceHover: '#FFF5EB',

    text: '#1F2937',
    textSecondary: '#4B5563',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',

    messageSent: baseColors.orange[500],
    messageReceived: '#FFFFFF',
    messageText: '#FFFFFF',
    messageTextReceived: '#1F2937',

    border: '#E5E7EB',
    divider: '#F3F4F6',

    tabBarActive: baseColors.orange[500],
    tabBarInactive: '#9CA3AF',

    success: baseColors.green[500],
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',

    status: {
        online: baseColors.green[500],
        offline: '#9CA3AF',
    },

    inputBackground: '#FFFFFF',
    inputBorder: '#D1D5DB',
    placeholder: '#9CA3AF',

    gradients: {
        primary: [baseColors.orange[500], baseColors.orange[300]],
        secondary: [baseColors.green[500], baseColors.green[300]],
        premium: [baseColors.orange[600], baseColors.green[500]],
    }
};

export const darkColors = {
    primary: baseColors.orange[500],
    primaryDark: baseColors.orange[800],
    primaryLight: baseColors.orange[400],
    secondary: baseColors.green[500],
    accent: baseColors.orange[900],

    background: '#111827',
    surface: '#1F2937',
    surfaceSecondary: '#374151',
    surfaceHover: '#1F2937',

    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',

    messageSent: baseColors.orange[600],
    messageReceived: '#374151',
    messageText: '#FFFFFF',
    messageTextReceived: '#F9FAFB',

    border: '#374151',
    divider: '#1F2937',

    tabBarActive: baseColors.orange[500],
    tabBarInactive: '#9CA3AF',

    success: baseColors.green[500],
    error: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',

    status: {
        online: baseColors.green[500],
        offline: '#6B7280',
    },

    inputBackground: '#1F2937',
    inputBorder: '#374151',
    placeholder: '#6B7280',

    gradients: {
        primary: [baseColors.orange[700], baseColors.orange[400]],
        secondary: [baseColors.green[600], baseColors.green[400]],
        premium: [baseColors.orange[800], baseColors.green[600]],
    }
};

// Export all objects
export { shadows, spacing, typography, borderRadius };

// Backward compatibility (default to light)
const colors = {
    ...lightColors,
    shadows,
    spacing,
    typography,
    borderRadius,
    gradients: lightColors.gradients,
};

export default colors;
