/**
 * Modern Color System - Chat-ti Mobile
 * Orange/Green Theme (Web Inspired)
 */

// Define constants first
const shadows = {
    sm: {
        shadowColor: 'rgba(255, 107, 53, 0.2)', // Orange tinted shadow
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
    xl: {
        shadowColor: 'rgba(255, 107, 53, 0.5)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
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
    h1: {
        fontSize: 32,
        fontWeight: 'bold',
        lineHeight: 40,
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 32,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 28,
    },
    body: {
        fontSize: 16,
        lineHeight: 24,
    },
    bodySmall: {
        fontSize: 14,
        lineHeight: 20,
    },
    caption: {
        fontSize: 12,
        lineHeight: 16,
    },
};

const borderRadius = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

const gradients = {
    primary: ['#FF6B35', '#FFB84D'],
    secondary: ['#4ECDC4', '#81C784'],
    accent: ['#FFB84D', '#FFD180'],
    dark: ['#2C2C2C', '#1A1A1A'],
    light: ['#FFFFFF', '#FFF8F0'],
    orangeToGreen: ['#FF6B35', '#4ECDC4'], // Web desktop gradient style
};

const colors = {
    // Primary Brand Colors (Orange Theme)
    primary: '#FF6B35', // Primary Orange
    primaryDark: '#E55A2B',
    primaryLight: '#FFB84D',
    primaryGradient: ['#FF6B35', '#FFB84D'],

    // Secondary Colors (Green Accent)
    secondary: '#4ECDC4', // Primary Green
    secondaryDark: '#3DBDB4',
    secondaryLight: '#81C784',
    secondaryGradient: ['#4ECDC4', '#81C784'],

    // Accent Colors
    accent: '#FFB84D',
    accentDark: '#FFA033',
    accentLight: '#FFD180',

    // Background Colors
    background: '#FFF8F0', // Cream background
    backgroundDark: '#1A1A1A',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#F7F2EB',

    // Surface Colors
    surface: '#FFFFFF',
    surfaceDark: '#2C2C2C',
    surfaceElevated: '#FFFFFF',
    surfaceHover: '#FFF5EB',

    // Text Colors
    text: '#333333', // Dark text
    textSecondary: '#666666', // Light text
    textTertiary: '#999999',
    textInverse: '#FFFFFF',
    textMuted: '#B0B0B0',

    // Message Bubble Colors
    messageSent: '#FF6B35',
    messageSentGradient: ['#FF6B35', '#FF8F66'],
    messageReceived: '#FFFFFF',
    messageReceivedDark: '#2C2C2C',
    messageText: '#FFFFFF',
    messageTextReceived: '#333333',

    // Status Colors
    success: '#4ECDC4',
    warning: '#FFB84D',
    error: '#FF4D4D',
    info: '#4ECDC4',
    connected: '#4ECDC4',
    disconnected: '#FF4D4D',
    online: '#4ECDC4',
    offline: '#B0B0B0',

    // UI Elements
    border: '#E0E0E0',
    divider: '#F0F0F0',
    inputBackground: '#FFFFFF',
    inputBorder: '#E0E0E0',
    placeholder: '#A0A0A0',

    // Tab Bar
    tabBarActive: '#FF6B35',
    tabBarInactive: '#999999',

    // Notifications
    badge: '#FF4D4D',
    badgeText: '#FFFFFF',
};

// Also attach sub-objects to default export for backward compatibility
// but avoid circular references by creating a new object for default export
const defaultExport = {
    ...colors,
    shadows,
    spacing,
    typography,
    borderRadius,
    gradients
};

export { colors, shadows, spacing, typography, borderRadius, gradients };
export default defaultExport;
