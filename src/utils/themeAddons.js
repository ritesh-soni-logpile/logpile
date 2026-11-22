import { Sparkles, Activity, Gamepad2, Moon, Trophy, Zap, Palette } from 'lucide-react'
import bundledThemes from './bundledThemes.json'

/**
 * Get all 8 bundled community themes from /themes directory
 */
export function getBundledCommunityThemes() {
  return bundledThemes || []
}

/**
 * 1-click installer for any of the 8 bundled official community themes
 */
export function installBundledTheme(themeId) {
  const theme = (bundledThemes || []).find((t) => t.id === themeId)
  if (!theme) return null
  return importCustomTheme(theme)
}

/**
 * Apply live custom CSS via injected <style id="custom-theme-style"> element.
 * Zero risk of crashing React or JavaScript runtime.
 */
export function applyCustomCss(cssText) {
  if (typeof document === 'undefined') return
  let styleEl = document.getElementById('custom-theme-style')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'custom-theme-style'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = cssText || ''
  try {
    localStorage.setItem('logpile-custom-css', cssText || '')
    window.dispatchEvent(new CustomEvent('logpile-custom-css-changed', { detail: cssText || '' }))
  } catch {}
}

/**
 * Read currently saved custom CSS from localStorage
 */
export function getCustomCss() {
  if (typeof localStorage === 'undefined') return ''
  try {
    return localStorage.getItem('logpile-custom-css') || ''
  } catch {
    return ''
  }
}

/**
 * High-fidelity preset generator for instant 0ms offline theme synthesis
 */
export function generatePresetThemeCss(presetKey = 'gothic') {
  const k = (presetKey || '').toLowerCase()
  if (k.includes('gothic') || k.includes('vampire')) {
    return `/* Logpile Custom Theme: Gothic Obsidian */
:root {
  --accent: #dc2626 !important;
  --accent-glow: rgba(220, 38, 38, 0.35) !important;
}
.poster-card {
  border-radius: 4px !important;
  background: #0a0507 !important;
  border: 1px solid rgba(220, 38, 38, 0.3) !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.7) !important;
}
.poster-card:hover {
  border-color: #dc2626 !important;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.85), 0 0 24px rgba(220, 38, 38, 0.35) !important;
  transform: translateY(-4px) scale(1.02) !important;
}
.launch-button, .primary-button {
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%) !important;
  border-radius: 4px !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  box-shadow: 0 4px 18px rgba(220, 38, 38, 0.4) !important;
}
.game-details h3, .hero-title {
  font-family: Georgia, serif !important;
  letter-spacing: -0.01em !important;
}`
  } else if (k.includes('cyber') || k.includes('neon')) {
    return `/* Logpile Custom Theme: Cyber Grid 2077 */
:root {
  --accent: #fcee0a !important;
  --accent-glow: rgba(252, 238, 10, 0.35) !important;
}
.poster-card {
  border-radius: 2px !important;
  background: #06070a !important;
  border: 1px solid rgba(252, 238, 10, 0.35) !important;
  box-shadow: 0 0 16px rgba(0, 0, 0, 0.6) !important;
}
.poster-card:hover {
  border-color: #fcee0a !important;
  box-shadow: 0 0 24px rgba(252, 238, 10, 0.4) !important;
  transform: translateY(-4px) scale(1.02) !important;
}
.launch-button, .primary-button {
  background: #fcee0a !important;
  border-radius: 2px !important;
  color: #040508 !important;
  font-weight: 900 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
}`
  } else if (k.includes('nord') || k.includes('frost')) {
    return `/* Logpile Custom Theme: Nordic Frosted Glass */
:root {
  --accent: #88c0d0 !important;
  --accent-glow: rgba(136, 192, 208, 0.35) !important;
}
.poster-card {
  border-radius: 16px !important;
  background: rgba(36, 41, 51, 0.88) !important;
  backdrop-filter: blur(14px) !important;
  -webkit-backdrop-filter: blur(14px) !important;
  border: 1px solid rgba(136, 192, 208, 0.25) !important;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.5) !important;
}
.poster-card:hover {
  border-color: #88c0d0 !important;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.7), 0 0 24px rgba(136, 192, 208, 0.3) !important;
  transform: translateY(-5px) scale(1.02) !important;
}
.launch-button, .primary-button {
  background: linear-gradient(135deg, #88c0d0 0%, #81a1c1 100%) !important;
  border-radius: 9999px !important;
  color: #242933 !important;
  font-weight: 800 !important;
}`
  } else if (k.includes('synth') || k.includes('80s')) {
    return `/* Logpile Custom Theme: Synthwave Outrun 84 */
:root {
  --accent: #ff2a85 !important;
  --accent-glow: rgba(255, 42, 133, 0.35) !important;
}
.poster-card {
  border-radius: 10px !important;
  background: #100718 !important;
  border: 1px solid rgba(255, 42, 133, 0.3) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7) !important;
}
.poster-card:hover {
  border-color: #ff2a85 !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(255, 42, 133, 0.35) !important;
  transform: translateY(-4px) scale(1.025) !important;
}
.launch-button, .primary-button {
  background: linear-gradient(135deg, #ff2a85 0%, #a855f7 100%) !important;
  border-radius: 8px !important;
  color: #ffffff !important;
  font-weight: 800 !important;
}`
  } else if (k.includes('oled') || k.includes('noir') || k.includes('monochrome') || k.includes('minimal')) {
    return `/* Logpile Custom Theme: OLED Noir & Platinum Glass */
:root {
  --accent: #f8fafc !important;
  --accent-glow: rgba(248, 250, 252, 0.25) !important;
  --bg-base: #000000 !important;
  --bg-surface: #0a0a0a !important;
  --bg-card: #000000 !important;
}
.poster-card {
  border-radius: 8px !important;
  background: #000000 !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.95) !important;
}
.poster-card:hover {
  border-color: #ffffff !important;
  box-shadow: 0 14px 38px rgba(0, 0, 0, 1), 0 0 18px rgba(255, 255, 255, 0.25) !important;
  transform: translateY(-4px) scale(1.02) !important;
}
.launch-button, .primary-button {
  background: #ffffff !important;
  border-radius: 6px !important;
  color: #000000 !important;
  font-weight: 800 !important;
  letter-spacing: 0.04em !important;
}
.game-details h3, .hero-title {
  letter-spacing: -0.02em !important;
}`
  } else if (k.includes('gold') || k.includes('royal') || k.includes('baroque') || k.includes('luxury')) {
    return `/* Logpile Custom Theme: Imperial Gold & Dark Marble */
:root {
  --accent: #d4af37 !important;
  --accent-glow: rgba(212, 175, 55, 0.35) !important;
  --bg-base: #0c0a07 !important;
}
.poster-card {
  border-radius: 6px !important;
  background: #110e0a !important;
  border: 1px solid rgba(212, 175, 55, 0.3) !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8) !important;
}
.poster-card:hover {
  border-color: #f0d78c !important;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.9), 0 0 24px rgba(212, 175, 55, 0.4) !important;
  transform: translateY(-4px) scale(1.02) !important;
}
.launch-button, .primary-button {
  background: linear-gradient(135deg, #d4af37 0%, #aa820a 100%) !important;
  border-radius: 6px !important;
  color: #0d0a04 !important;
  font-weight: 900 !important;
  box-shadow: 0 4px 18px rgba(212, 175, 55, 0.35) !important;
}
.game-details h3, .hero-title {
  font-family: Georgia, serif !important;
}`
  } else if (k.includes('matrix') || k.includes('terminal') || k.includes('hacker')) {
    return `/* Logpile Custom Theme: Matrix Operator Green */
:root {
  --accent: #22c55e !important;
  --accent-glow: rgba(34, 197, 94, 0.35) !important;
  --bg-base: #020503 !important;
}
.poster-card {
  border-radius: 0px !important;
  background: #040905 !important;
  border: 1px solid rgba(34, 197, 94, 0.4) !important;
  box-shadow: 0 0 14px rgba(34, 197, 94, 0.15) !important;
}
.poster-card:hover {
  border-color: #22c55e !important;
  box-shadow: 0 0 24px rgba(34, 197, 94, 0.5) !important;
  transform: translateY(-3px) !important;
}
.launch-button, .primary-button {
  background: #22c55e !important;
  border-radius: 0px !important;
  color: #020503 !important;
  font-family: monospace !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.1em !important;
}`
  } else {
    return `/* Logpile Custom Theme: Emerald Temple */
:root {
  --accent: #10b981 !important;
  --accent-glow: rgba(16, 185, 129, 0.35) !important;
}
.poster-card {
  border-radius: 12px !important;
  background: #070b09 !important;
  border: 1px solid rgba(16, 185, 129, 0.25) !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6) !important;
}
.poster-card:hover {
  border-color: #10b981 !important;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.8), 0 0 24px rgba(16, 185, 129, 0.3) !important;
  transform: translateY(-4px) scale(1.02) !important;
}
.launch-button, .primary-button {
  background: #10b981 !important;
  border-radius: 8px !important;
  color: #050f0b !important;
  font-weight: 800 !important;
}`
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
    version: '1.3.7',
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
