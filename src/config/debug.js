/**
 * Debug configuration constants
 * Control debug logging throughout the application
 */

// Environment variable to enable/disable debug logging
// Set to 'true' to enable debug logging, 'false' or undefined to disable
const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_LOGGING === 'true'

export const DEBUG_CONFIG = {
  // Master switch for all debug logging
  enabled: DEBUG_ENABLED,

  // Specific debug categories (can be individually controlled)
  backgammon: {
    engine: DEBUG_ENABLED,
    ui: DEBUG_ENABLED,
    validation: DEBUG_ENABLED,
    moves: DEBUG_ENABLED,
  },

  // API debug logging
  api: {
    documents: DEBUG_ENABLED,
    photos: DEBUG_ENABLED,
    family: DEBUG_ENABLED,
  },

  // General application debug
  general: DEBUG_ENABLED,
}

// Helper function to check if debug logging is enabled for a specific category
export const isDebugEnabled = (category = 'general') => {
  if (!DEBUG_CONFIG.enabled) return false

  if (category === 'general') return DEBUG_CONFIG.general

  // Check nested categories
  const [mainCategory, subCategory] = category.split('.')
  if (DEBUG_CONFIG[mainCategory] && typeof DEBUG_CONFIG[mainCategory] === 'object') {
    return DEBUG_CONFIG[mainCategory][subCategory] ?? DEBUG_CONFIG[mainCategory]
  }

  return DEBUG_CONFIG[category] ?? false
}

// Conditional debug logging function
export const debugLog = (category, ...args) => {
  if (isDebugEnabled(category)) {
    console.log(`[DEBUG ${category.toUpperCase()}]`, ...args)
  }
}