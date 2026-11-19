import { Sparkles, Activity, Gamepad2, Moon, Trophy, Zap, Palette } from 'lucide-react'

/**
 * Sample theme that demonstrates the daily drop workflow.
 * Ritesh releases full working themes daily in the official GitHub repository:
 * https://github.com/ritesh-soni-logpile/logpile/tree/main/themes
 */
export const SAMPLE_DAILY_THEME = {
  id: 'cyberpunk-2077',
  name: 'Cyberpunk 2077',
  author: 'Ritesh Soni (Logpile Official)',
  tagline: 'Night City Canary Yellow & High-Tech Cyan',
  version: '1.0.0',
  category: 'Sci-Fi & Cyberware',
  palette: {
    base: '#07080e',
    surface: '#0e101a',
    surfaceHover: '#181b29',
    card: '#0b0d16',
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#fcee0a',
    accentGlow: 'rgba(252, 238, 10, 0.32)',
    accentContrast: '#111000',
    borderColor: 'rgba(252, 238, 10, 0.18)',
    borderHover: 'rgba(0, 240, 255, 0.55)',
    badgeBg: 'rgba(252, 238, 10, 0.15)',
    badgeText: '#fef08a',
  }
}

/**
 * Get all user-imported or custom-added themes from localStorage
 */
export function getCustomThemes() {
  try {
    const raw = localStorage.getItem('logpile-custom-themes')
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * Save custom themes list and dispatch update event
 */
export function saveCustomThemes(themes) {
  try {
    localStorage.setItem('logpile-custom-themes', JSON.stringify(themes))
    window.dispatchEvent(new CustomEvent('logpile-theme-addons-changed', { detail: themes }))
  } catch {}
}

/**
 * Import a validated theme object into local storage
 */
export function importCustomTheme(theme) {
  if (!theme || !theme.id || !theme.name || !theme.palette) {
    throw new Error('Invalid theme format. Required: id, name, and palette object.')
  }

  const existing = getCustomThemes()
  const filtered = existing.filter((t) => t.id !== theme.id)
  const updated = [...filtered, theme]
  saveCustomThemes(updated)

  // Auto-enable newly imported theme in Sanctuary dropdown
  const enabled = getEnabledAddonIds()
  if (!enabled.includes(theme.id)) {
    saveEnabledAddonIds([...enabled, theme.id])
  }

  return updated
}

/**
 * Remove an imported theme
 */
export function removeCustomTheme(themeId) {
  const existing = getCustomThemes()
  const updated = existing.filter((t) => t.id !== themeId)
  saveCustomThemes(updated)

  const enabled = getEnabledAddonIds().filter((id) => id !== themeId)
  saveEnabledAddonIds(enabled)

  return updated
}

/**
 * Enabled addon IDs in Sanctuary top-bar dropdown
 */
export function getEnabledAddonIds() {
  try {
    const raw = localStorage.getItem('logpile-enabled-theme-addons')
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveEnabledAddonIds(ids) {
  try {
    localStorage.setItem('logpile-enabled-theme-addons', JSON.stringify(ids))
    window.dispatchEvent(new CustomEvent('logpile-theme-addons-changed', { detail: ids }))
  } catch {}
}

export function toggleAddonTheme(themeId) {
  const current = getEnabledAddonIds()
  const exists = current.includes(themeId)
  const next = exists ? current.filter((id) => id !== themeId) : [...current, themeId]
  saveEnabledAddonIds(next)
  return next
}

/**
 * Resolve palette for any custom or sample theme
 */
export function getAddonPalette(themeId) {
  const custom = getCustomThemes().find((t) => t.id === themeId)
  if (custom) return custom.palette
  if (themeId === SAMPLE_DAILY_THEME.id) return SAMPLE_DAILY_THEME.palette
  return null
}

/**
 * Bulk remove custom themes by array of IDs
 */
export function bulkRemoveCustomThemes(themeIds) {
  if (!Array.isArray(themeIds) || themeIds.length === 0) return getCustomThemes()
  const idSet = new Set(themeIds)
  const existing = getCustomThemes()
  const updated = existing.filter((t) => !idSet.has(t.id))
  saveCustomThemes(updated)

  const enabled = getEnabledAddonIds().filter((id) => !idSet.has(id))
  saveEnabledAddonIds(enabled)
  return updated
}

/**
 * Export custom themes (all or selected IDs) to a clean JSON string
 */
export function exportCustomThemes(themeIds = null) {
  const themes = getCustomThemes()
  const toExport = themeIds && themeIds.length > 0
    ? themes.filter((t) => themeIds.includes(t.id))
    : themes

  return JSON.stringify({
    format: 'logpile-theme-export',
    version: '1.3.5',
    exportDate: new Date().toISOString(),
    count: toExport.length,
    themes: toExport
  }, null, 2)
}

/**
 * Import custom themes from a parsed object, array, or JSON string
 */
export function importCustomThemesFromJson(jsonStrOrObj) {
  try {
    const parsed = typeof jsonStrOrObj === 'string' ? JSON.parse(jsonStrOrObj) : jsonStrOrObj
    const rawList = Array.isArray(parsed) ? parsed : (parsed.themes || [parsed])
    const validThemes = []

    for (const item of rawList) {
      if (item && item.id && item.name && item.palette) {
        importCustomTheme(item)
        validThemes.push(item)
      }
    }

    return { success: true, count: validThemes.length, themes: getCustomThemes() }
  } catch (err) {
    return { success: false, error: err?.message || 'Invalid JSON format', count: 0 }
  }
}

/**
 * Factory reset: removes all custom themes and resets enabled list
 */
export function resetAllCustomThemes() {
  saveCustomThemes([])
  saveEnabledAddonIds([])
  return []
}
