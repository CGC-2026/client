/**
 * App color palette with semantic naming
 * Colors defined for light and dark mode
 * Following a modern, clean aesthetic with accessibility in mind
 */

// Primary brand colors
const primary = {
  light: '#4582EC',
  dark: '#5E96FF',
};

// Semantic colors
const semantic = {
  success: {
    light: '#4CAF50',
    dark: '#5ECC62',
  },
  warning: {
    light: '#FF9800',
    dark: '#FFB240',
  },
  error: {
    light: '#FF6347',
    dark: '#FF8A75',
  },
  info: {
    light: '#0a7ea4',
    dark: '#4FBDEC',
  }
};

// Interface colors - base palette
export const Colors = {
  light: {
    // Text colors
    text: '#11181C',
    textSecondary: '#717680',
    textTertiary: '#9EA3A8',
    
    // Background colors
    background: '#F2F2F7', 
    card: '#FFFFFF',
    cardPressed: '#F8F8F8',
    cardHighlighted: '#F6F9FC',
    
    // Border colors
    border: '#E5E5EA',
    divider: '#E5E5EA',
    
    // UI element colors
    icon: '#687076',
    iconActive: primary.light,
    tint: primary.light,
    tabIconDefault: '#687076',
    tabIconSelected: primary.light,
    
    // Semantic colors
    success: semantic.success.light,
    warning: semantic.warning.light,
    error: semantic.error.light,
    info: semantic.info.light,
    
    // Component specific
    signalStrengthHigh: semantic.success.light,
    signalStrengthMedium: semantic.warning.light,
    signalStrengthLow: semantic.error.light,
    buttonText: '#FFFFFF',
  },
  
  dark: {
    // Text colors
    text: '#ECEDEE',
    textSecondary: '#A7ABB0',
    textTertiary: '#747A80',
    
    // Background colors
    background: '#1C1C1E',
    card: '#2C2C2E',
    cardPressed: '#3A3A3C',
    cardHighlighted: '#303844',
    
    // Border colors
    border: '#38383A',
    divider: '#38383A',
    
    // UI element colors
    icon: '#9BA1A6',
    iconActive: primary.dark,
    tint: primary.dark,
    tabIconDefault: '#9BA1A6',
    tabIconSelected: primary.dark,
    
    // Semantic colors
    success: semantic.success.dark,
    warning: semantic.warning.dark,
    error: semantic.error.dark,
    info: semantic.info.dark,
    
    // Component specific
    signalStrengthHigh: semantic.success.dark,
    signalStrengthMedium: semantic.warning.dark,
    signalStrengthLow: semantic.error.dark,
    buttonText: '#FFFFFF',
  },
};