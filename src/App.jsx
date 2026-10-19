import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Activity, Archive, ArrowDownAZ, ArrowLeft, ArrowUpAZ, Check, ChevronDown, CircleHelp, Clock, Cpu, Database, Download,
  FileSpreadsheet, Filter, FolderOpen, Gamepad2, HardDrive, LayoutGrid, ListFilter, Maximize2, Minimize2, Minus,
  Monitor, PackageCheck, PackageOpen, Palette, Play, Search, ScanLine, Settings2,
  ShieldCheck, Sparkles, Star, Sun, TerminalSquare, UploadCloud, Wrench, X, Moon, SlidersHorizontal,
  Dices, KeyRound, RefreshCw, ImagePlus, Trophy, WandSparkles, EyeOff, Eye, FileDown, Trash2, AlertTriangle, ArrowRightLeft,
  Bookmark, MoreHorizontal, Building2, Calendar, PlugZap, Info, Film, Camera, ChevronRight, ZoomIn,
  PanelLeftClose, PanelLeft, ChevronUp,
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import './styles/tokens.css'
import './styles.css'
import '@fontsource/outfit'
import { normalizeArtworkUrl } from './utils/artworkUrl'
import { SourceIcon } from './components/SourceIcons'
import { CustomDropdown } from './components/CustomDropdown'
import { AboutView } from './components/views/AboutView'
import logoDark from './assets/logo.png'
import logoLight from './assets/logo-light.png'
const logo = logoDark

const fallbackApi = {
  async clearArtCache() { return 0 },
  async selectCustomArtwork() { return null },
  async setGameCategory() { return null },
  async updateGameStatus() { return null },
  window: { minimize() {}, maximize() {}, close() {} },
  database: { async seedCheck() { return { seeded: false, count: 0 } }, async getGames() { return [] }, async getLibraryStats() { return { totalGames: 0, installedGames: 0, utilityTools: 0, installedUtilities: 0, visibleGames: 0, visibleInstalledGames: 0, dlcGames: 0, installedDlc: 0, hiddenGames: 0, hiddenInstalledGames: 0, hiddenDlc: 0, hiddenInstalledDlc: 0, readyToInstallCount: 0, artworkCovered: 0, missingArtwork: 0, totalStorageGb: 0, platformBreakdown: [] } }, async getLibrarySettings() { return { autoHideSupportEntries: true, steamGridDbApiKey: '', preferAnimatedArtwork: false } }, async getActivityLog() { return [] }, async getLibraryHealth() { return { totalGames: 0, installedGames: 0, lastBackupTimestamp: null, lastBackupPath: null, lastScanTimestamp: null, backupsDirectory: null } }, async backupNow() { return { ok: true, backupPath: '' } }, async listBackups() { return { directory: 'UserData/backups', backups: [] } }, async openBackupsFolder() { return { success: true } }, async chooseBackupFile() { return null }, async restoreBackup() { return { success: true } }, async setLibrarySettings() { return { autoHideSupportEntries: true, steamGridDbApiKey: '', preferAnimatedArtwork: false } }, async setGameHidden() { return null }, async updateGameStatus() { return null }, async updateGameMetadata() { return null }, async deleteGames() { return null }, async bulkUpdateGames() { return null }, async bulkMoveGameCategory() { return null }, async bulkSetGameHidden() { return null }, async moveGameCategory() { return null }, async exportCsv() { return null }, async exportSelectedCsv() { return null }, async purgeLibrary() { return { deletedGames: 0 } }, async backupArtworkCache() { return null }, async restoreArtworkCache() { return null }, onUpdated() { return () => {} } },
  scanner: { async scanAll() { return {} }, async chooseImportFile() { return null }, async importFile() { return {} }, async importBuffer() { return {} }, onProgress() { return () => {} } },
  games: { async openUri() {}, async getMedia() { return { success: false, screenshots: [], movies: [] } }, async changeArtwork() { return null }, async refetchArtwork() { return null }, async refetchSelectedArtwork() { return null }, async chooseAndSaveArtwork() { return null }, async chooseExecutable() { return null }, async launchExecutable() { return null } },
  roulette: { async pick() { return null } },
  scraper: { async isSyncing() { return false }, async fetchMissingArt() { return { candidates: 0, matched: 0, covers: 0, heroes: 0 } }, async runBulkArtworkSync() { return { candidates: 0, updated: 0, matched: 0, skipped: 0, failed: 0 } }, async cancelSync() { return { cancelled: false } }, async syncMetadataAndArt() { return { candidates: 0, fastTracked: 0, updated: 0, metadataUpdated: 0, heroesUpdated: 0, matched: 0, skipped: 0, failed: 0 } }, async syncMetadata() { return { candidates: 0, metadataUpdated: 0, heroesUpdated: 0, matched: 0, skipped: 0, failed: 0 } }, async generateAutomaticFallbacks() { return { candidates: 0, fallbackCovers: 0, fallbackHeroes: 0, steamAssets: 0 } }, async testIgdb() { return { success: false, error: 'Unavailable' } }, async fetchGameMetadata() { return null }, async backupCache() { return null }, async restoreCache() { return null }, onProgress() { return () => {} }, onUpdated() { return () => {} }, async chooseOverride() { return null } },
}
const api = window.api || fallbackApi

const LAYOUT_PALETTES = {
  cinematic: {
    base: '#000000',
    surface: '#080808',
    surfaceHover: '#121212',
    card: '#0a0a0a',
    textPrimary: '#ffffff',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    accent: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.25)',
    accentContrast: '#041017',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(56, 189, 248, 0.40)',
    badgeBg: 'rgba(56, 189, 248, 0.12)',
    badgeText: '#bae6fd',
  },
  kinetic: {
    base: '#000000',
    surface: '#080808',
    surfaceHover: '#121212',
    card: '#0a0a0a',
    textPrimary: '#ffffff',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    accent: '#f97316',
    accentGlow: 'rgba(249, 115, 22, 0.28)',
    accentContrast: '#180700',
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderHover: 'rgba(249, 115, 22, 0.45)',
    badgeBg: 'rgba(249, 115, 22, 0.14)',
    badgeText: '#fed7aa',
  },
  atmospheric: {
    base: '#000000',
    surface: '#060807',
    surfaceHover: '#0d1310',
    card: '#080b09',
    textPrimary: '#f0fdf4',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    accent: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.22)',
    accentContrast: '#021810',
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderHover: 'rgba(16, 185, 129, 0.40)',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeText: '#a7f3d0',
  },
  playful: {
    base: '#000000',
    surface: '#080808',
    surfaceHover: '#121212',
    card: '#0a0a0a',
    textPrimary: '#ffffff',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    accent: '#d6ff4b',
    accentGlow: 'rgba(214, 255, 75, 0.25)',
    accentContrast: '#121703',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderHover: 'rgba(214, 255, 75, 0.45)',
    badgeBg: 'rgba(214, 255, 75, 0.12)',
    badgeText: '#ecfccb',
  },
  competitive: {
    base: '#000000',
    surface: '#080808',
    surfaceHover: '#121212',
    card: '#0a0a0a',
    textPrimary: '#ffffff',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.26)',
    accentContrast: '#180e00',
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderHover: 'rgba(245, 158, 11, 0.45)',
    badgeBg: 'rgba(245, 158, 11, 0.14)',
    badgeText: '#fde68a',
  },
}

function themeVars(layoutKey = 'cinematic') {
  const p = LAYOUT_PALETTES[layoutKey] || LAYOUT_PALETTES.cinematic
  return {
    '--bg-base': p.base,
    '--bg-primary': p.base,
    '--bg-app': p.base,
    '--bg-surface': p.surface,
    '--bg-surface-hover': p.surfaceHover,
    '--bg-card': p.card || p.surface,
    '--text-primary': p.textPrimary,
    '--text-secondary': p.textSecondary,
    '--text-muted': p.textMuted,
    '--text-highlight': p.accent,
    '--accent': p.accent,
    '--accent-color': p.accent,
    '--accent-glow': p.accentGlow,
    '--accent-contrast': p.accentContrast,
    '--border-color': p.borderColor,
    '--border-hover': p.borderHover,
    '--badge-bg': p.badgeBg,
    '--badge-text': p.badgeText,
  }
}
function cn(...inputs) { return twMerge(clsx(inputs)) }
function formatGb(value) { return `${Number(value || 0).toFixed(value < 10 ? 2 : 1)} GB` }
function formatBytes(bytes) {
  if (!bytes || Number.isNaN(Number(bytes))) return '0 B'
  const num = Number(bytes)
  if (num < 1024) return `${num} B`
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`
  return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
function formatPlayTime(seconds) { const minutes = Math.round(Number(seconds || 0) / 60); if (minutes < 1) return 'No play time'; if (minutes < 60) return `${minutes}m played`; const hours = Math.floor(minutes / 60); const remainder = minutes % 60; return remainder ? `${hours}h ${remainder}m played` : `${hours}h played` }
function normalizePlatform(platform) { const key = String(platform || '').toLowerCase().replace(/[^a-z0-9]/g, ''); return key.includes('steam') ? 'steam' : key.includes('epic') ? 'epic' : key.includes('gog') ? 'gog' : key.includes('amazon') ? 'amazon' : 'custom' }
function platformLabel(platform) { return ({ steam: 'Steam', epic: 'Epic Games', gog: 'GOG', amazon: 'Amazon Games', custom: 'Custom' })[normalizePlatform(platform)] || platform }
function platformClass(platform) { return ({ steam: 'platform-steam', epic: 'platform-epic', gog: 'platform-gog', amazon: 'platform-amazon', custom: 'platform-custom' })[normalizePlatform(platform)] || 'platform-custom' }
function sourcePlatforms(sources = []) { if (!Array.isArray(sources)) return []; return [...new Set(sources.filter(Boolean).map((source) => normalizePlatform(source?.platform)))] }
const MENU_WIDTH = 220
const MENU_HEIGHT = 280
const MENU_PADDING = 12
function sourceKey(label) { return String(label || '').trim().toLowerCase().replace(/\s+/g, ' ') }
const TITLE_SUFFIXES = [
  'game of the year edition',
  'game of the year',
  'goty edition',
  'goty',
  'director s cut',
  'directors cut',
  'master assassin edition',
  'golden edition',
  'gold edition',
  'definitive edition',
  'definitive series',
  'the definitive edition',
  'telltale definitive series',
  'complete edition',
  'the complete edition',
  'complete collection',
  'deluxe edition',
  'digital deluxe edition',
  'deluxe',
  'ultimate edition',
  'the ultimate edition',
  'enhanced edition directors cut',
  'enhanced edition director s cut',
  'enhanced edition',
  'enhanced',
  'remastered',
  'remaster',
  'challenger edition',
  'rampage edition',
  'premier edition',
  'special edition',
  'anniversary edition',
  '20th anniversary edition',
  'legendary edition',
  'premium edition',
  'standard edition',
  'collector s edition',
  'collectors edition',
  'legacy collection',
  'the collection',
  'handsome collection',
  'xbox game studios',
  'amazon prime',
  'amazon luna',
  'epic games',
  'windows',
  'steam',
  'pc',
]
function normalizedGameTitle(title) {
  const raw = String(title || '').trim()
  const isEditionYear = /\b(?:edition|collection|bundle|remaster|cut)\s*\((?:19\d\d|20\d\d)\)/i.test(raw)
  const yearMatch = !isEditionYear ? raw.match(/\((19\d\d|20\d\d)\)/) : null
  const yearTag = yearMatch ? ` ${yearMatch[1]}` : ''

  let normalized = raw
    .replace(/[\u2122\u00ae\u00a9]/g, '')
    .replace(/\s*\((?:pc|windows|mac|linux)\)\s*/gi, ' ')
    .replace(/\((19\d\d|20\d\d)\)/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  let changed = true
  while (changed && normalized) {
    changed = false
    for (const suffix of TITLE_SUFFIXES) {
      if (normalized === suffix) continue
      const marker = ` ${suffix}`
      if (normalized.endsWith(marker)) {
        normalized = normalized.slice(0, -marker.length).trim()
        changed = true
        break
      }
    }
  }
  return (normalized + yearTag).trim()
}
function normalizeSearchText(value) { return String(value || '').trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ') }
function titleMatchesQuery(title, query) {
  const titleText = normalizeSearchText(title)
  const queryText = normalizeSearchText(query)
  if (!queryText) return true
  const words = queryText.split(' ').filter(Boolean)
  if (words.length > 1) return titleText.includes(queryText)
  const token = words[0]
  if (/^\d+$/.test(token)) return titleText.split(' ').includes(token)
  return titleText.includes(token)
}
function titleSearchRank(title, query) {
  const titleText = normalizeSearchText(title)
  const queryText = normalizeSearchText(query)
  if (!queryText) return 0
  if (titleText === queryText) return 0
  if (titleText.startsWith(`${queryText} `)) return 1
  if (titleText.includes(queryText)) return 2
  return 3
}
function strictTitleSearch(games, query) {
  const queryText = normalizeSearchText(query)
  if (!queryText) return [...games]
  return games.filter((game) => titleMatchesQuery(game.canonical_title, queryText)).sort((a, b) => titleSearchRank(a.canonical_title, queryText) - titleSearchRank(b.canonical_title, queryText) || a.canonical_title.localeCompare(b.canonical_title))
}
function getEditionTierScore(title) {
  const t = String(title || '').toLowerCase()
  if (/\b(?:master assassin|ultimate|complete|collector'?s|legacy collection|handsome collection)\b/i.test(t)) return 5
  if (/\b(?:game of the year|goty|gold|golden|director'?s cut|enhanced edition)\b/i.test(t)) return 4
  if (/\b(?:deluxe|premium|special|anniversary|remastered|remaster|definitive|challenger|rampage|premier)\b/i.test(t)) return 3
  if (/\b(?:enhanced|digital)\b/i.test(t)) return 2
  return 1
}

function consolidateGames(games = []) {
  const groups = new Map()
  for (const game of games) {
    const category = game.is_utility ? 'util' : game.is_dlc ? 'dlc' : 'game'
    const key = `${category}:${normalizedGameTitle(game.canonical_title)}`
    if (!key) continue
    const variants = groups.get(key) || []
    variants.push(game)
    groups.set(key, variants)
  }
  return [...groups.values()].map((variants) => {
    const sortedVariants = [...variants].sort((a, b) => {
      const tierDiff = getEditionTierScore(b.canonical_title) - getEditionTierScore(a.canonical_title)
      if (tierDiff !== 0) return tierDiff
      const installDiff = Number(Boolean(b.is_installed && b.executable_path)) - Number(Boolean(a.is_installed && a.executable_path))
      if (installDiff !== 0) return installDiff
      const anyInstallDiff = Number(Boolean(b.is_installed)) - Number(Boolean(a.is_installed))
      if (anyInstallDiff !== 0) return anyInstallDiff
      const lenDiff = String(b.canonical_title || '').length - String(a.canonical_title || '').length
      if (lenDiff !== 0) return lenDiff
      return String(a.canonical_title || '').localeCompare(String(b.canonical_title || ''))
    })
    const representative = sortedVariants[0]
    const sources = [...new Map(sortedVariants.flatMap((variant) => variant.sources || []).map((source) => [`${source.platform}|${source.platformGameId}|${source.launchUri || ''}`, source])).values()]
    const installedVariant = variants.find((variant) => variant.is_installed && variant.executable_path) || variants.find((variant) => variant.is_installed) || representative
    const merged = { ...representative, variants: sortedVariants, sources, is_utility: Boolean(representative.is_utility), is_dlc: Boolean(representative.is_dlc), is_installed: variants.some((variant) => Boolean(variant.is_installed)), play_time_seconds: variants.reduce((total, variant) => total + Number(variant.play_time_seconds || 0), 0), install_size_bytes: variants.reduce((total, variant) => total + Number(variant.install_size_bytes || 0), 0), install_size_gb: Number((variants.reduce((total, variant) => total + Number(variant.install_size_bytes || 0), 0) / (1024 ** 3)).toFixed(2)), executable_path: installedVariant.executable_path || null, drive_letter: installedVariant.drive_letter || representative.drive_letter, install_path: installedVariant.install_path || representative.install_path }
    return merged
  })
}
function normalizeStoreLabel(label) {
  const clean = String(label || '').trim()
  const lower = clean.toLowerCase()
  if (lower === 'ea' || lower === 'ea games' || lower === 'origin' || lower === 'origin2') return 'EA Games'
  if (lower === 'ubisoft' || lower === 'uplay') return 'Ubisoft'
  if (lower === 'epic' || lower === 'epic games') return 'Epic Games'
  if (lower === 'gog' || lower === 'gog galaxy') return 'GOG'
  if (lower === 'steam') return 'Steam'
  if (lower === 'xbox' || lower === 'microsoft' || lower === 'ms-xbl' || lower === 'ms-windows-store') return 'Xbox'
  if (lower === 'repack') return 'Repack'
  if (lower === 'amazon' || lower === 'amazon games') return 'Amazon Games'
  if (lower === 'battlenet' || lower === 'battle.net') return 'Battle.net'
  if (lower === 'itch' || lower === 'itch.io') return 'Itch.io'
  return clean
}
function launcherLabelFromUri(uri) {
  const scheme = String(uri || '').match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1]?.toLowerCase()
  return ({ ea: 'EA Games', origin2: 'EA Games', ubisoft: 'Ubisoft', uplay: 'Ubisoft', xbox: 'Xbox', 'ms-xbl': 'Xbox', 'ms-windows-store': 'Xbox', 'amazon-games': 'Amazon Games', itch: 'Itch.io', 'battle-net': 'Battle.net', battlenet: 'Battle.net', riotclient: 'Riot Games' })[scheme] || null
}
function splitSourceLabels(value) { return String(value || '').split(/[,;|]/).map((label) => normalizeStoreLabel(label.trim())).filter((label) => label && label.toLowerCase() !== 'custom') }
function sourceLabelsForGame(game) {
  if (!game) return []
  const rawVariants = game.variants || [game]
  const variants = [...rawVariants].sort((a, b) => {
    const tierDiff = getEditionTierScore(b.canonical_title) - getEditionTierScore(a.canonical_title)
    if (tierDiff !== 0) return tierDiff
    return Number(Boolean(b.is_installed)) - Number(Boolean(a.is_installed))
  })
  const labels = variants.flatMap((variant) => {
    const customLabels = splitSourceLabels(variant.store_name || variant.storeName || variant.source)
    const sources = variant.sources || []
    const sourceLabels = sources.flatMap((source) => {
      const split = splitSourceLabels(source.sourceName || source.source_name)
      if (split.length) return split
      const plat = platformLabel(source.platform)
      if (plat === 'Custom') {
        const fromUri = launcherLabelFromUri(source.launchUri) || launcherLabelFromUri(source.installUri)
        return fromUri ? [normalizeStoreLabel(fromUri)] : []
      }
      return [normalizeStoreLabel(plat)]
    }).filter((label) => label && label.toLowerCase() !== 'custom')
    return [...customLabels, ...sourceLabels]
  })
  return [...new Set(labels.map(normalizeStoreLabel))]
}
function sourceLabelForGame(game) { return sourceLabelsForGame(game)[0] }
function sourceOptionsForGames(games = []) {
  const counts = new Map()
  for (const game of games) {
    if (game.is_hidden) continue
    for (const label of sourceLabelsForGame(game)) {
      const key = sourceKey(label)
      if (!key) continue
      const current = counts.get(key) || { key, label, count: 0 }
      current.count += 1
      counts.set(key, current)
    }
  }
  return [...counts.values()]
    .filter((source) => source.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}
function isLauncherUri(uri) { return /^(steam|com\.epicgames\.launcher|goggalaxy|origin2|origin|ea|ubisoft|uplay|xbox|ms-xbl|ms-windows-store|amazon-games|itch|battle-net|battlenet|riotclient):\/\//i.test(String(uri || '')) }
function sourceLauncherFamily(source) {
  const platform = normalizePlatform(source?.platform)
  const label = String(source?.sourceName || source?.source_name || '').toLowerCase()
  if (platform !== 'custom') return platform
  if (label.includes('ea') || label.includes('origin') || label.includes('electronic arts')) return 'ea'
  if (label.includes('gog')) return 'gog'
  if (label.includes('ubisoft') || label.includes('uplay')) return 'ubisoft'
  if (label.includes('xbox') || label.includes('microsoft')) return 'xbox'
  if (label.includes('amazon')) return 'amazon'
  return null
}
function isPlaceholderId(value) { return /^(?:text|title)[-_ ]?fallback$/i.test(String(value || '').trim()) }
function sourceHasRealId(source, game) {
  const value = String(source?.platformGameId || '').trim()
  if (!value || source?.idSource === 'title-fallback' || isPlaceholderId(value)) return false
  return normalizedGameTitle(value) !== normalizedGameTitle(game?.canonical_title)
}
function validSteamAppId(source, game) {
  const value = String(source?.platformGameId || '').trim()
  return /^\d+$/.test(value) && Number(value) > 0 && value !== '7' && source?.idSource !== 'title-fallback' && !isPlaceholderId(value) && normalizedGameTitle(value) !== normalizedGameTitle(game?.canonical_title)
}
function launcherUriForSource(source, game) {
  const family = sourceLauncherFamily(source)
  const rawId = String(source?.platformGameId || '').trim()
  const rawLaunchId = String(source?.platformLaunchId || rawId).trim()
  const launchId = family === 'epic' ? rawLaunchId.split(':').filter(Boolean).pop() || rawId : rawId
  const id = encodeURIComponent(family === 'epic' ? launchId : rawId)
  const title = encodeURIComponent(String(game.canonical_title || '').trim())
  if ((family === 'ea' || family === 'ubisoft') && !sourceHasRealId(source, game)) return null
  if (family === 'steam') return validSteamAppId(source, game) ? `steam://rungameid/${id}` : null
  if (family === 'epic') return id ? `com.epicgames.launcher://apps/${id}?action=launch&silent=true` : 'com.epicgames.launcher://'
  if (family === 'gog') return id ? `goggalaxy://openGameView/${id}` : 'goggalaxy://'
  if (family === 'ea') return id ? `origin2://game/launch?offerIds=${id}` : null
  if (family === 'ubisoft') return id ? `uplay://launch/${id}/0` : null
  if (family === 'xbox') return `ms-windows-store://search/?query=${title}`
  if (family === 'amazon') return id ? `amazon-games://play/${id}` : 'amazon-games://'
  return null
}
function fallbackLauncherUri(game) {
  const sources = game.sources || []
  for (const source of sources) {
    const generated = launcherUriForSource({ ...source, sourceName: source.sourceName || source.source_name || game.store_name || game.storeName }, game)
    if (generated) return generated
  }
  const labels = sourceLabelsForGame(game).map((label) => String(label).toLowerCase())
  const source = labels.find((label) => label.includes('steam') || label.includes('epic') || label.includes('gog') || label.includes('xbox') || label.includes('ea') || label.includes('origin') || label.includes('ubisoft') || label.includes('amazon')) || labels[0] || ''
  if (source.includes('steam')) return null
  if (source.includes('epic')) return 'com.epicgames.launcher://'
  if (source.includes('gog')) return 'goggalaxy://'
  if (source.includes('xbox') || source.includes('microsoft')) return `ms-windows-store://search/?query=${encodeURIComponent(String(game.canonical_title || '').trim())}`
  if (source.includes('ea') || source.includes('origin') || source.includes('electronic arts')) return null
  if (source.includes('ubisoft') || source.includes('uplay')) return null
  if (source.includes('amazon')) return 'amazon-games://'
  return null
}
function gameYear(game) {
  if (!game?.release_date) return ''
  const match = String(game.release_date).match(/\b(19\d\d|20\d\d)\b/)
  return match ? match[0] : ''
}
function greetingForHour(hour) { return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening' }
function cleanDriveLabel(drive) { const value = String(drive || '').trim().replace(/:+$/, ''); return value ? `${value}:` : '—' }
const EMPTY_LIBRARY_STATS = { totalGames: 0, installedGames: 0, utilityTools: 0, installedUtilities: 0, visibleGames: 0, visibleInstalledGames: 0, dlcGames: 0, installedDlc: 0, hiddenGames: 0, hiddenInstalledGames: 0, hiddenDlc: 0, hiddenInstalledDlc: 0, readyToInstallCount: 0, artworkCovered: 0, missingArtwork: 0, totalStorageGb: 0, platformBreakdown: [], systemSpecs: null }
function safeInteger(value) { return Number.isInteger(value) ? value : 0 }
function safeText(value, fallback = '') { return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback }
function safeFiniteNumber(value, fallback = 0) { return typeof value === 'number' && Number.isFinite(value) ? value : fallback }
function normalizeActivityLog(value) {
  if (!Array.isArray(value)) return []
  return value.filter((item) => item && typeof item === 'object' && !Array.isArray(item)).map((item, index) => {
    const rawDetails = item.details || item.details_json
    let details = {}
    if (typeof rawDetails === 'string') {
      try { details = JSON.parse(rawDetails) || {} } catch {}
    } else if (rawDetails && typeof rawDetails === 'object' && !Array.isArray(rawDetails)) {
      details = rawDetails
    }
    const timestamp = item.timestamp ? Number(item.timestamp) : (item.created_at ? new Date(item.created_at).getTime() : Date.now())
    return {
      id: safeText(item.id, `activity-${index}`),
      event_type: safeText(item.event_type || item.status, 'unknown'),
      status: safeText(item.status || item.event_type, 'unknown'),
      game_id: item.game_id || null,
      timestamp,
      details,
      title: safeText(item.title || details.title, ''),
      message: safeText(item.message || details.message, ''),
      created_at: safeText(item.created_at, ''),
    }
  })
}

function formatTimestamp(unixMs) {
  if (!unixMs || !Number(unixMs)) return 'Never'
  const date = new Date(Number(unixMs))
  if (Number.isNaN(date.getTime())) return 'Never'
  const now = Date.now()
  const diff = now - date.getTime()
  if (diff < 60000 && diff >= 0) return 'Just now'
  if (diff < 3600000 && diff >= 0) {
    const mins = Math.floor(diff / 60000)
    return `${mins} min${mins === 1 ? '' : 's'} ago`
  }
  if (diff < 86400000 && diff >= 0) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatActivityEventTime(unixMs) {
  if (!unixMs || !Number(unixMs)) return ''
  const date = new Date(Number(unixMs))
  if (Number.isNaN(date.getTime())) return ''
  const now = Date.now()
  const diff = now - date.getTime()
  if (diff < 60000 && diff >= 0) return 'Just now'
  if (diff < 3600000 && diff >= 0) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000 && diff >= 0) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatActivityMessage(item) {
  const type = item.event_type || 'activity'
  const details = item.details || {}
  if (type === 'game_launch') {
    const title = details.title || 'Game'
    if (details.method === 'executable') return `Launched ${title} (Direct executable)`
    if (details.storefront) return `Launched ${title} via ${details.storefront}`
    return `Launched ${title}`
  }
  if (type === 'scan') {
    if (details.type === 'import') {
      const count = details.importedCatalogGames || 0
      const file = details.filename ? ` from ${details.filename}` : ''
      return `Imported catalog${file}: ${count} titles indexed (${details.created || 0} new, ${details.updated || 0} merged)`
    }
    const installed = details.scannedInstalledGames || 0
    return `Local drive scan completed: ${installed} installed games detected (${details.created || 0} new records)`
  }
  if (type === 'metadata_update') {
    const updated = details.metadataUpdated ?? details.updated ?? 0
    const matched = details.matched ? ` (${details.matched} matched)` : ''
    return `Metadata sync completed: ${updated} titles updated${matched}`
  }
  if (type === 'artwork_update') {
    const updated = details.updated ?? details.covers ?? 0
    const heroes = details.heroesUpdated ?? details.heroes ?? 0
    return `Artwork sync completed: ${updated} covers & ${heroes} heroes updated`
  }
  if (type === 'backup') {
    const file = details.dbSnapshot ? ` (${details.dbSnapshot})` : ''
    return `Database & artwork cache backed up${file}`
  }
  return details.title || details.message || item.message || item.title || 'System event recorded'
}

function getActivityIcon(eventType) {
  switch (eventType) {
    case 'scan': return ScanLine
    case 'metadata_update': return Database
    case 'artwork_update': return ImagePlus
    case 'game_launch': return Play
    case 'backup': return Archive
    default: return Activity
  }
}

function getActivityTone(eventType) {
  switch (eventType) {
    case 'scan': return 'lime'
    case 'metadata_update': return 'blue'
    case 'artwork_update': return 'violet'
    case 'game_launch': return 'green'
    case 'backup': return 'amber'
    default: return 'cyan'
  }
}

function LibraryHealthSection({
  health,
  stats,
  backupsList,
  backupBusy,
  restoreBusy,
  onBackupNow,
  onOpenBackupsFolder,
  onOpenBackupsManager,
}) {
  const totalCount = health?.totalGames ?? stats?.totalGames ?? 0
  const artworkCovered = health?.artworkCovered ?? stats?.artworkCovered ?? Math.max(0, totalCount - (stats?.missingArtwork || 0))
  const artworkPercent = totalCount > 0 ? Math.round((artworkCovered / totalCount) * 100) : 100
  const cachedFiles = health?.cachedArtworkFiles ?? artworkCovered
  const missingArt = health?.missingArtworkCount ?? stats?.missingArtwork ?? Math.max(0, totalCount - artworkCovered)

  const installedCount = health?.installedGames ?? stats?.installedGames ?? 0
  const lastScan = formatTimestamp(health?.lastScanTimestamp)
  const snapshotCount = health?.snapshotsCount ?? (Array.isArray(backupsList) ? backupsList.length : 0)
  const totalBackupBytes = health?.totalBackupsSizeBytes ?? (Array.isArray(backupsList) ? backupsList.reduce((acc, b) => acc + (b.sizeBytes || 0), 0) : 0)
  const backupSizeLabel = totalBackupBytes ? formatBytes(totalBackupBytes) : ''

  return (
    <section className="health-section library-health-section">
      <div className="section-header compact">
        <div>
          <h2>Library health & backups</h2>
          <p>Visual asset coverage, play readiness, and point-in-time snapshot recovery.</p>
        </div>
        <span className="sync-label"><ShieldCheck size={13} /> Local-first reliability</span>
      </div>
      <div className="library-health-grid">
        <div className="stat-card">
          <div className="stat-icon stat-violet"><Palette size={18} /></div>
          <div className="stat-copy">
            <p>Artwork status</p>
            <strong>{totalCount > 0 ? `${artworkPercent}% Covered` : '—'}</strong>
            <span>{cachedFiles.toLocaleString()} covers cached{missingArt > 0 ? ` · ${missingArt} missing` : ''}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-green"><Play size={18} fill="currentColor" /></div>
          <div className="stat-copy">
            <p>Play readiness</p>
            <strong>{installedCount > 0 ? 'All systems ready' : '—'}</strong>
            <span>{installedCount.toLocaleString()} installed titles linked</span>
          </div>
        </div>
        <div
          className="stat-card stat-card-interactive"
          onClick={onOpenBackupsManager}
          title="Click to check backups and restore"
        >
          <div className="stat-icon stat-blue"><ShieldCheck size={18} /></div>
          <div className="stat-copy">
            <p>Backups & safety</p>
            <strong>{snapshotCount > 0 ? `${snapshotCount} snapshot${snapshotCount === 1 ? '' : 's'}` : 'No backups yet'}</strong>
            <span>{snapshotCount > 0 ? (backupSizeLabel ? `${backupSizeLabel} total on disk` : 'Point-in-time recovery ready') : 'No snapshots yet'}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-amber"><ScanLine size={18} /></div>
          <div className="stat-copy">
            <p>Last library scan</p>
            <strong>{lastScan}</strong>
            <span>Drive scans & catalog imports</span>
          </div>
        </div>
      </div>

      <div className="automation-disclaimer library-health-disclaimer">
        <Info size={14} className="disclaimer-icon" />
        <p>
          Automated scrapers occasionally miss on franchise subtitles. You can override any poster instantly using our SteamGridDB quick-picker.
        </p>
      </div>

      <div className="backup-control-bar">
        <div
          className="backup-path-section"
          onClick={() => onOpenBackupsFolder?.(health?.lastBackupPath || health?.backupsDirectory)}
          title={`Click to open containing folder in Explorer: ${health?.backupsDirectory || 'UserData/backups'}`}
        >
          <div className="backup-path-icon">
            <FolderOpen size={16} />
          </div>
          <div className="backup-path-meta">
            <span className="backup-path-label">Backups storage path</span>
            <span className="backup-path-value">{health?.backupsDirectory || 'UserData/backups'}</span>
          </div>
          <span className="backup-open-hint">Open in Explorer ↗</span>
        </div>

        <div className="backup-bar-actions">
          <button
            type="button"
            className="outline-button backup-bar-btn"
            disabled={backupBusy || restoreBusy}
            onClick={onOpenBackupsManager}
            title="Check all backup snapshots, view file paths, or restore"
          >
            <UploadCloud size={14} />
            <span>Check backups & restore</span>
          </button>
          <button
            type="button"
            className="primary-button backup-bar-btn"
            disabled={backupBusy || restoreBusy}
            onClick={onBackupNow}
            title="Take a point-in-time snapshot of your database and artwork"
          >
            {backupBusy ? <RefreshCw size={14} className="spin-icon" /> : <Archive size={14} />}
            <span>{backupBusy ? 'Backing up…' : 'Backup now'}</span>
          </button>
        </div>
      </div>
    </section>
  )
}

function MetadataProvidersSection({ onRefresh }) {
  const [steamGridDbApiKey, setSteamGridDbApiKey] = useState('')
  const [igdbClientId, setIgdbClientId] = useState('')
  const [igdbClientSecret, setIgdbClientSecret] = useState('')
  const [heroResolution, setHeroResolution] = useState('2.5k')
  const [preferAnimatedArtwork, setPreferAnimatedArtwork] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const [activeSync, setActiveSync] = useState('none')
  const [syncNotice, setSyncNotice] = useState('')
  const [syncProgress, setSyncProgress] = useState(null)
  const [igdbTestStatus, setIgdbTestStatus] = useState(null)

  useEffect(() => {
    api.scraper.isSyncing?.().then((active) => {
      if (active) setActiveSync('external')
    }).catch(() => {})
  }, [])

  useEffect(() => {
    return api.scraper.onProgress?.((next) => {
      const norm = normalizeSyncProgress(next)
      setSyncProgress(norm)
      if (norm.total > 0 && norm.current > 0 && norm.current < norm.total) {
        // active
      } else if (norm.phase === 'complete' || (norm.total > 0 && norm.current >= norm.total)) {
        setActiveSync('none')
        setTimeout(() => setSyncProgress(null), 4000)
      }
    })
  }, [])

  useEffect(() => {
    const off = api.scraper.onUpdated?.(() => {
      setActiveSync('none')
    })
    return () => off?.()
  }, [])

  useEffect(() => {
    let active = true
    Promise.resolve(api.database.getLibrarySettings?.()).then((settings) => {
      if (!active || !settings) return
      setSteamGridDbApiKey(typeof settings.steamGridDbApiKey === 'string' ? settings.steamGridDbApiKey : '')
      setIgdbClientId(typeof settings.igdbClientId === 'string' ? settings.igdbClientId : '')
      setIgdbClientSecret(typeof settings.igdbClientSecret === 'string' ? settings.igdbClientSecret : '')
      setHeroResolution(typeof settings.heroResolution === 'string' && settings.heroResolution ? settings.heroResolution : '2.5k')
      setPreferAnimatedArtwork(Boolean(settings.preferAnimatedArtwork))
      setLoading(false)
    }).catch(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const handleTestIgdb = async () => {
    if (!igdbClientId.trim() || !igdbClientSecret.trim()) {
      setIgdbTestStatus({ ok: false, message: 'Enter both Client ID and Client Secret first.' })
      return
    }
    setIgdbTestStatus({ testing: true, ok: null, message: 'Authenticating with Twitch OAuth...' })
    try {
      let res = null
      try {
        if (api.scraper?.testIgdb) {
          res = await api.scraper.testIgdb(igdbClientId.trim(), igdbClientSecret.trim())
        }
      } catch (ipcErr) {
        console.warn('IPC testIgdb not available or failed; falling back to direct Twitch OAuth check:', ipcErr)
      }

      // Fallback directly to Twitch OAuth token endpoint if IPC handler isn't registered or returned unavailable
      if (!res || res.error === 'Unavailable' || (res.success === undefined && res.error)) {
        const bodyParams = new URLSearchParams({
          client_id: igdbClientId.trim(),
          client_secret: igdbClientSecret.trim(),
          grant_type: 'client_credentials',
        })
        const oauthRes = await fetch('https://id.twitch.tv/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: bodyParams.toString(),
        })
        const data = await oauthRes.json()
        if (oauthRes.ok && data.access_token) {
          res = { success: true, expiresIn: data.expires_in }
        } else {
          res = { success: false, error: data.message || `Twitch OAuth error (${oauthRes.status})` }
        }
      }

      if (res?.success) {
        setIgdbTestStatus({ ok: true, message: 'Connected! IGDB credentials are valid.' })
      } else {
        setIgdbTestStatus({ ok: false, message: res?.error || 'Authentication failed. Check your Twitch Client ID/Secret.' })
      }
    } catch (err) {
      setIgdbTestStatus({ ok: false, message: err?.message || 'Connection test failed.' })
    }
  }

  const handleSave = async (e) => {
    e?.preventDefault()
    setSaving(true)
    try {
      await api.database.setLibrarySettings?.({
        steamGridDbApiKey: steamGridDbApiKey.trim(),
        igdbClientId: igdbClientId.trim(),
        igdbClientSecret: igdbClientSecret.trim(),
        heroResolution,
        preferAnimatedArtwork,
      })
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 3000)
      if (igdbClientId.trim() && igdbClientSecret.trim()) {
        handleTestIgdb()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const isBusy = activeSync !== 'none' || Boolean(syncProgress?.total > 0 && syncProgress?.current > 0 && syncProgress?.current < syncProgress?.total)

  const handleSyncMetadata = async () => {
    setActiveSync('metadata')
    setSyncNotice('')
    try {
      await api.database.setLibrarySettings?.({
        steamGridDbApiKey: steamGridDbApiKey.trim(),
        igdbClientId: igdbClientId.trim(),
        igdbClientSecret: igdbClientSecret.trim(),
        heroResolution,
        preferAnimatedArtwork,
      })
      const res = await api.scraper.syncMetadata?.(steamGridDbApiKey.trim())
      setSyncNotice(`Metadata synced: ${res?.metadataUpdated ?? 0} titles updated${res?.matched ? `, ${res.matched} matched` : ''}.`)
      await onRefresh?.()
    } catch (err) {
      setSyncNotice(err?.message || 'Metadata sync failed.')
    } finally {
      setActiveSync('none')
    }
  }

  const handleSyncArtwork = async () => {
    if (!steamGridDbApiKey.trim()) {
      setSyncNotice('SteamGridDB API key is required to sync artwork.')
      return
    }
    setActiveSync('artwork')
    setSyncNotice('')
    try {
      await api.database.setLibrarySettings?.({
        steamGridDbApiKey: steamGridDbApiKey.trim(),
        igdbClientId: igdbClientId.trim(),
        igdbClientSecret: igdbClientSecret.trim(),
        heroResolution,
        preferAnimatedArtwork,
      })
      const res = await api.scraper.runBulkArtworkSync?.(steamGridDbApiKey.trim())
      setSyncNotice(`Artwork synced: ${res?.updated ?? 0} items updated.`)
      await onRefresh?.()
    } catch (err) {
      setSyncNotice(err?.message || 'Artwork sync failed.')
    } finally {
      setActiveSync('none')
    }
  }

  const handleSyncAll = async () => {
    setActiveSync('all')
    setSyncNotice('')
    try {
      await api.database.setLibrarySettings?.({
        steamGridDbApiKey: steamGridDbApiKey.trim(),
        igdbClientId: igdbClientId.trim(),
        igdbClientSecret: igdbClientSecret.trim(),
        heroResolution,
        preferAnimatedArtwork,
      })
      const res = await api.scraper.syncMetadataAndArt?.(steamGridDbApiKey.trim())
      const artCount = res?.updated || res?.heroesUpdated || 0
      const metaCount = res?.metadataUpdated || 0
      setSyncNotice(`Full sync complete: ${artCount} artwork, ${metaCount} metadata updated.`)
      await onRefresh?.()
    } catch (err) {
      setSyncNotice(err?.message || 'Sync failed.')
    } finally {
      setActiveSync('none')
    }
  }

  const handleCancelSync = async () => {
    try {
      await api.scraper.cancelSync?.()
      setSyncNotice('Sync cancellation requested.')
    } catch (err) {
      setSyncNotice(err?.message || 'Failed to cancel sync.')
    }
  }

  return (
    <section className="metadata-providers-section">
      <div className="section-header compact">
        <div>
          <div className="eyebrow">
            <KeyRound size={12} />
            <span>INTEGRATIONS &amp; ENRICHMENT</span>
            <span className="eyebrow-line" />
          </div>
          <h2>Metadata Providers</h2>
          <p>Configure credentials for dual-fetch metadata: IGDB for textual lore &amp; credits, SteamGridDB for high-resolution heroes and transparent logos.</p>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="outline-button small-button"
            onClick={() => setShowKeys(!showKeys)}
            title={showKeys ? 'Hide masked keys' : 'Reveal keys'}
          >
            {showKeys ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{showKeys ? 'Hide' : 'Reveal'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="metadata-providers-card">
        <div className="provider-fields-grid">
          <div className="provider-field-block">
            <label className="provider-label">
              <span>SteamGridDB API Key</span>
              <small>Visual assets: 16:9 heroes, grid covers, transparent logos</small>
            </label>
            <input
              type={showKeys ? 'text' : 'password'}
              value={steamGridDbApiKey}
              onChange={(e) => setSteamGridDbApiKey(e.target.value)}
              placeholder="Paste SteamGridDB API key"
              className="provider-input"
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          <div className="provider-field-block">
            <label className="provider-label">
              <span>Hero Image Quality</span>
              <small>Preferred SteamGridDB resolution for hero landscape backdrops</small>
            </label>
            <select
              value={heroResolution}
              onChange={(e) => setHeroResolution(e.target.value)}
              className="provider-select"
            >
              <option value="720p">720p / Compact (Lowest Storage ~200-400 KB)</option>
              <option value="1080p">1080p / Full HD (Balanced ~600 KB-1.2 MB)</option>
              <option value="2.5k">2.5K / 1440p (High Quality - Recommended)</option>
              <option value="4k">4K / 2160p (Ultra HD - Maximum Quality)</option>
            </select>
          </div>

          <div className="provider-field-block">
            <label className="provider-label">
              <span>Animated Artwork</span>
              <small>Prefer animated WebP heroes on game details screen (Single hero only, zero library grid lag)</small>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <input
                id="prefer-animated-artwork-toggle"
                type="checkbox"
                checked={preferAnimatedArtwork}
                onChange={(e) => setPreferAnimatedArtwork(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent, #6366f1)' }}
              />
              <label htmlFor="prefer-animated-artwork-toggle" style={{ fontSize: '13px', cursor: 'pointer', userSelect: 'none', color: preferAnimatedArtwork ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {preferAnimatedArtwork ? 'Enabled (Animated WebP heroes on Game Details)' : 'Disabled (High-res static WebP — ultra-smooth)'}
              </label>
            </div>
          </div>

          <div className="provider-field-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="provider-label">
                <span>IGDB Client ID</span>
                <small>Twitch Developer Application Client ID</small>
              </label>
              <button
                type="button"
                className="outline-button small-button"
                style={{ height: '24px', padding: '0 8px', fontSize: '11px', gap: '4px' }}
                disabled={igdbTestStatus?.testing || !igdbClientId.trim()}
                onClick={handleTestIgdb}
                title="Test whether these credentials authenticate with Twitch OAuth"
              >
                {igdbTestStatus?.testing ? <RefreshCw size={11} className="spin-icon" /> : <PlugZap size={11} />}
                <span>{igdbTestStatus?.testing ? 'Testing…' : 'Test Connection'}</span>
              </button>
            </div>
            <input
              type={showKeys ? 'text' : 'password'}
              value={igdbClientId}
              onChange={(e) => { setIgdbClientId(e.target.value); setIgdbTestStatus(null); }}
              placeholder="Paste IGDB / Twitch Client ID"
              className="provider-input"
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          <div className="provider-field-block">
            <label className="provider-label">
              <span>IGDB Client Secret</span>
              <small>Twitch Developer Application Client Secret</small>
            </label>
            <input
              type={showKeys ? 'text' : 'password'}
              value={igdbClientSecret}
              onChange={(e) => { setIgdbClientSecret(e.target.value); setIgdbTestStatus(null); }}
              placeholder="Paste IGDB / Twitch Client Secret"
              className="provider-input"
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          {igdbTestStatus && (
            <div style={{
              gridColumn: '1 / -1',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: igdbTestStatus.ok ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: igdbTestStatus.ok ? '#4ade80' : '#f87171',
              border: `1px solid ${igdbTestStatus.ok ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}>
              {igdbTestStatus.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
              <span>{igdbTestStatus.message}</span>
            </div>
          )}
        </div>

        <div className="provider-actions-footer" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <button
            type="submit"
            disabled={saving || loading || isBusy}
            className="primary-button"
          >
            {saving ? <RefreshCw size={14} className="spin-icon" /> : <Check size={14} />}
            <span>{saving ? 'Saving...' : 'Save Keys'}</span>
          </button>

          <button
            type="button"
            disabled={isBusy || saving || loading}
            className="outline-button"
            onClick={handleSyncMetadata}
            title="Scan games missing metadata and fetch lore, developer, publisher, and genres from IGDB & Steam without touching artwork"
          >
            {activeSync === 'metadata' ? <RefreshCw size={14} className="spin-icon" /> : <Database size={14} />}
            <span>
              {activeSync === 'metadata' && syncProgress?.total
                ? `Syncing Metadata ${syncProgress.current} / ${syncProgress.total}…`
                : activeSync === 'metadata'
                ? 'Syncing metadata…'
                : 'Sync Library Metadata'}
            </span>
          </button>

          <button
            type="button"
            disabled={isBusy || saving || loading}
            className="outline-button"
            onClick={handleSyncArtwork}
            title="Scan games missing artwork and fetch 600x900 covers, heroes, and logos from SteamGridDB"
          >
            {activeSync === 'artwork' ? <RefreshCw size={14} className="spin-icon" /> : <ImagePlus size={14} />}
            <span>
              {activeSync === 'artwork' && syncProgress?.total
                ? `Syncing Artwork ${syncProgress.current} / ${syncProgress.total}…`
                : activeSync === 'artwork'
                ? 'Syncing artwork…'
                : 'Sync Missing Artwork'}
            </span>
          </button>

          <button
            type="button"
            disabled={isBusy || saving || loading}
            className="outline-button"
            onClick={handleSyncAll}
            title="Comprehensive full scan of all games in your library for both metadata and visual artwork"
          >
            {activeSync === 'all' ? <RefreshCw size={14} className="spin-icon" /> : <RefreshCw size={14} />}
            <span>
              {activeSync === 'all' && syncProgress?.total
                ? `Syncing ${syncProgress.current} / ${syncProgress.total}…`
                : activeSync === 'all'
                ? 'Syncing library…'
                : 'Sync Artwork & Metadata for All Games'}
            </span>
          </button>

          {isBusy && (
            <button
              type="button"
              className="danger-button"
              onClick={handleCancelSync}
              title="Cancel the running sync"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <X size={14} />
              <span>Cancel Sync</span>
            </button>
          )}

          {savedNotice && !isBusy && (
            <span className="provider-saved-badge">
              <Check size={13} /> Keys saved to local settings.
            </span>
          )}

          {syncNotice && !isBusy && (
            <span className="provider-saved-badge" style={{ color: 'var(--accent, #d6ff4b)' }}>
              <Sparkles size={13} /> {syncNotice}
            </span>
          )}
        </div>

        {isBusy && syncProgress?.total > 0 && (
          <div style={{ marginTop: '14px', width: '100%', background: 'rgba(255, 255, 255, 0.035)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary, #cbd5e1)', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600 }}>{syncProgress.title ? `Syncing: ${syncProgress.current} / ${syncProgress.total} — ${syncProgress.title}` : (syncProgress.message || 'Processing...')}</span>
              <span style={{ color: 'var(--accent, #d6ff4b)', fontWeight: 700 }}>{Math.round((syncProgress.current / syncProgress.total) * 100)}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%`, background: 'var(--accent, #d6ff4b)', boxShadow: '0 0 10px var(--accent-glow)', transition: 'width 0.25s ease' }} />
            </div>
          </div>
        )}
      </form>
    </section>
  )
}

function AdvancedDiagnosticsSection({ themeName, health }) {
  const [expanded, setExpanded] = useState(false)
  const dbSizeLabel = health?.dbSizeBytes ? formatBytes(health.dbSizeBytes) : 'Local'

  return (
    <section className="advanced-diagnostics-section">
      <button
        type="button"
        className="advanced-diagnostics-toggle"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <div className="advanced-toggle-left">
          <Wrench size={15} />
          <span className="advanced-toggle-title">Developer & engine diagnostics</span>
          <span className="advanced-badge">Advanced</span>
        </div>
        <div className="advanced-toggle-right">
          <span className="advanced-toggle-hint">
            {expanded ? 'Hide technical details' : 'Show technical details (IPC, SQLite, Renderer)'}
          </span>
          <ChevronDown size={14} className={cn('advanced-chevron', expanded && 'open')} />
        </div>
      </button>

      {expanded && (
        <div className="advanced-diagnostics-body">
          <div className="health-card">
            <div className="health-overview">
              <div className="health-orbit">
                <div className="orbit-inner">
                  <ShieldCheck size={31} />
                </div>
              </div>
              <div>
                <span className="health-overline">DATABASE CONNECTION</span>
                <h3>Connected</h3>
                <p>better-sqlite3 · Local only ({dbSizeLabel})</p>
              </div>
            </div>
            <div className="health-grid">
              <StatusRow icon={Database} title="SQLite database" subtitle={`logpile.db · ${health?.integrity === 'Warning' ? 'Integrity warning' : 'Verified OK'}`} />
              <StatusRow icon={ShieldCheck} title="IPC communication" subtitle="Active" />
              <StatusRow icon={Monitor} title="Renderer bridge" subtitle="Context isolated" />
            </div>
            <div className="health-foot">
              <span><Check size={14} /> Database ready</span>
              <small>Theme: {themeName}</small>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function RecentActivitySection({ activityLog, loading, onRefresh }) {
  return (
    <section className="activity-section">
      <div className="section-header compact">
        <div>
          <h2>Recent activity feed</h2>
          <p>Audit trail of local scans, metadata updates, artwork downloads, game launches, and backups.</p>
        </div>
        <button
          type="button"
          className="outline-button small-button"
          disabled={loading}
          onClick={onRefresh}
          title="Refresh activity feed"
        >
          <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>
      <div className="activity-feed-container">
        {loading && !activityLog.length ? (
          <div className="activity-feed-empty">
            <div className="loader" />
            <span>Loading activity logs…</span>
          </div>
        ) : activityLog.length ? (
          <div className="activity-feed-list">
            {activityLog.map((event, idx) => {
              const Icon = getActivityIcon(event.event_type)
              const tone = getActivityTone(event.event_type)
              const message = formatActivityMessage(event)
              const timeStr = formatActivityEventTime(event.timestamp)
              const rawType = event.event_type || 'event'
              const displayType = rawType.replace(/_/g, ' ').toUpperCase()

              return (
                <div key={event.id || idx} className="activity-feed-item">
                  <span className={cn('activity-type-badge', `badge-${tone}`)}>
                    <Icon size={14} />
                  </span>
                  <div className="activity-item-content">
                    <div className="activity-item-row">
                      <span className="activity-item-type">{displayType}</span>
                      <span className="activity-item-time">{timeStr}</span>
                    </div>
                    <p className="activity-item-text">{message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="activity-feed-empty">
            <Activity size={20} />
            <span>No activity recorded yet. Scans, syncs, launches, and backups will appear here.</span>
          </div>
        )}
      </div>
    </section>
  )
}
function normalizeLibraryStats(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return { totalGames: safeInteger(source.totalGames), installedGames: safeInteger(source.installedGames), utilityTools: safeInteger(source.utilityTools), installedUtilities: safeInteger(source.installedUtilities), visibleGames: safeInteger(source.visibleGames), visibleInstalledGames: safeInteger(source.visibleInstalledGames), dlcGames: safeInteger(source.dlcGames), installedDlc: safeInteger(source.installedDlc), hiddenGames: safeInteger(source.hiddenGames), hiddenInstalledGames: safeInteger(source.hiddenInstalledGames), hiddenDlc: safeInteger(source.hiddenDlc), hiddenInstalledDlc: safeInteger(source.hiddenInstalledDlc), readyToInstallCount: safeInteger(source.readyToInstallCount), artworkCovered: safeInteger(source.artworkCovered), missingArtwork: safeInteger(source.missingArtwork), totalStorageGb: typeof source.totalStorageGb === 'number' && Number.isFinite(source.totalStorageGb) ? source.totalStorageGb : 0, platformBreakdown: Array.isArray(source.platformBreakdown) ? source.platformBreakdown : [], systemSpecs: source.systemSpecs || null }
}
function normalizeSyncProgress(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return { message: typeof source.message === 'string' ? source.message : '', title: typeof source.title === 'string' ? source.title : '', source: typeof source.source === 'string' ? source.source : 'sync', current: safeInteger(source.current), total: safeInteger(source.total) }
}
function normalizeSyncResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const result = { ...value }
  for (const key of ['candidates', 'fastTracked', 'metadataUpdated', 'updated', 'heroesUpdated', 'skipped', 'failed', 'matched', 'covers', 'heroes', 'steamAssets', 'fallbackCovers', 'fallbackHeroes']) result[key] = safeFiniteNumber(value[key], 0)
  result.cancelled = value.cancelled === true
  result.unified = value.unified === true
  result.failedTitles = Array.isArray(value.failedTitles) ? value.failedTitles.filter((item) => item && typeof item === 'object' && !Array.isArray(item)).map((item, index) => ({ title: safeText(item.title, `Entry ${index + 1}`), reason: safeText(item.reason, 'Unknown error') })) : []
  return result
}
function safeErrorText(error, fallback) { return typeof error === 'string' ? error : typeof error?.message === 'string' && error.message ? error.message : fallback }

function WindowControls() { return <div className="window-controls"><button aria-label="Minimize" onClick={() => api.window.minimize()}><Minus size={15} /></button><button aria-label="Maximize" onClick={() => api.window.maximize()}><Maximize2 size={13} /></button><button aria-label="Close" className="close-control" onClick={() => api.window.close()}><X size={15} /></button></div> }
function StatusDot({ tone = 'green' }) { return <span className={cn('status-dot', `status-${tone}`)} /> }
function PlatformBadge({ platform, label }) { return <span className={cn('platform-badge', platformClass(platform))}><span className="platform-mark" />{label || platformLabel(platform)}</span> }
function PosterImage({ game, className = '', onImageError }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    setFailed(false)
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true)
    } else {
      setLoaded(false)
    }
  }, [game.cover_url])

  return failed || !game.cover_url ? (
    <div className={cn('poster-fallback', className)}>
      <span>{game.canonical_title.slice(0, 1)}</span>
      <strong>{game.canonical_title}</strong>
      <small>{game.developer || 'Local collection'}</small>
    </div>
  ) : (
    <img
      ref={imgRef}
      className={cn(className, loaded && 'is-loaded')}
      src={normalizeArtworkUrl(game.cover_url)}
      alt={`${game.canonical_title} cover`}
      loading="eager"
      decoding="sync"
      onLoad={() => setLoaded(true)}
      onError={() => {
        setFailed(true)
        onImageError?.(game.id)
      }}
    />
  )
}
class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('[logpile renderer boundary]', error, info) }
  render() {
    if (!this.state.hasError) return this.props.children
    if (typeof this.props.fallback === 'function') {
      return this.props.fallback({
        error: this.state.error,
        reset: () => this.setState({ hasError: false, error: null })
      })
    }
    if (this.props.fallback !== undefined) {
      return this.props.fallback
    }
    return (
      <div className="scan-message scan-error grid-error-boundary">
        <AlertTriangle size={15} />
        <span>Some library cards could not be rendered.</span>
        {this.state.error?.message ? <small style={{ opacity: 0.7, margin: '0 4px' }}>({this.state.error.message})</small> : null}
        <button className="outline-button small-button" onClick={() => this.setState({ hasError: false, error: null })}>Retry grid</button>
      </div>
    )
  }
}

function TabErrorFallback({ error, onBack, reset }) {
  const handleRecover = () => {
    reset?.()
    onBack?.()
  }

  return (
    <div className="tab-error-fallback">
      <AlertTriangle size={24} style={{ color: '#ef4444' }} />
      <h2>This section could not be rendered</h2>
      <p>The library is still available. Return to the main collection and try the section again.</p>
      {error?.message && (
        <details className="error-details-box" style={{ maxWidth: 640, margin: '14px auto', textAlign: 'left', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#fca5a5' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Error details: {error.message}</summary>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: 8, fontSize: 11, color: '#cbd5e1' }}>{error.stack || error.message}</pre>
        </details>
      )}
      <button className="outline-button" onClick={handleRecover}>
        <LayoutGrid size={14} /> Back to Library
      </button>
    </div>
  )
}

function GameEditorModal({ game, onClose, onSaved }) {
  const [currentGame, setCurrentGame] = useState(game)
  const [form, setForm] = useState({ title: '', description: '', genres: '', developer: '', publisher: '', releaseDate: '', storeName: '', executablePath: '', launchArguments: '', steamGridDbId: '' })
  const [matchId, setMatchId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (!game) return
    setCurrentGame(game)
    const steam = game.sources?.find((source) => normalizePlatform(source.platform) === 'steam')
    const initialId = String(game.steamgriddb_id || game.steamGridDbId || steam?.platformGameId || '')
    setForm({ title: game.canonical_title || '', description: game.description || '', genres: game.genres || game.genre || '', developer: game.developer || '', publisher: game.publisher || '', releaseDate: game.release_date || '', storeName: game.store_name || game.storeName || sourceLabelForGame(game), executablePath: game.executable_path || game.executablePath || '', launchArguments: game.launch_arguments || game.launchArguments || '', steamGridDbId: initialId })
    setMatchId(initialId)
    setError('')
    setSuccessMsg('')
    api.database?.getLibrarySettings?.().then((settings) => {
      if (settings?.steamGridDbApiKey) setApiKey(settings.steamGridDbApiKey)
    }).catch(() => {})
  }, [game])

  if (!game) return null

  const change = (key) => (event) => {
    const val = event.target.value
    setForm((current) => ({ ...current, [key]: val }))
    if (key === 'steamGridDbId') setMatchId(val)
  }

  const handleMatchIdChange = (event) => {
    const val = event.target.value
    setMatchId(val)
    setForm((current) => ({ ...current, steamGridDbId: val }))
  }

  const save = async () => {
    setBusy(true); setError(''); setSuccessMsg('')
    try {
      const idToUse = (matchId || form.steamGridDbId || '').trim()
      const originalId = String(game.steamgriddb_id || '').trim()
      let updatedGame = currentGame

      if (idToUse && (idToUse !== originalId || !currentGame?.cover_url)) {
        try {
          const refetched = await api.games.refetchArtwork(game.id, idToUse, apiKey.trim())
          if (refetched) updatedGame = refetched
        } catch (fetchErr) {
          console.warn('Auto-refetch on save note:', fetchErr.message)
        }
      }

      const dataToSend = { ...form, steamGridDbId: idToUse }
      const finalUpdated = await api.database.updateGameMetadata(game.id, dataToSend)
      onSaved?.(finalUpdated || updatedGame || game, true)
      onClose()
    } catch (err) {
      setError(err.message || 'Metadata could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  const autoFillMetadata = async () => {
    setBusy(true); setError(''); setSuccessMsg('')
    try {
      const meta = await api.scraper.fetchGameMetadata(game.id)
      if (meta) {
        setForm((prev) => ({
          ...prev,
          description: meta.description || prev.description,
          genres: meta.genres || prev.genres,
          developer: meta.developer || prev.developer,
          publisher: meta.publisher || prev.publisher,
          releaseDate: meta.releaseDate || prev.releaseDate,
        }))
        const filled = []
        if (meta.developer) filled.push('developer')
        if (meta.publisher) filled.push('publisher')
        if (meta.description) filled.push('synopsis')
        if (meta.genres) filled.push('genres')
        if (meta.releaseDate) filled.push('release date')
        setSuccessMsg(filled.length ? `Auto-filled details: ${filled.join(', ')}!` : 'No additional metadata found from Steam/IGDB.')
      } else {
        setError('No metadata could be found for this game.')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch metadata.')
    } finally {
      setBusy(false)
    }
  }

  const refetch = async () => {
    const idToUse = (matchId || form.steamGridDbId || '').trim()
    if (!idToUse) { setError('Enter a Steam App ID or SteamGridDB game ID first.'); return }
    setBusy(true); setError(''); setSuccessMsg('')
    try {
      const updated = await api.games.refetchArtwork(game.id, idToUse, apiKey.trim())
      if (updated) {
        setCurrentGame(updated)
        setForm((current) => ({ ...current, steamGridDbId: idToUse }))
        setMatchId(idToUse)
        setSuccessMsg('Artwork and hero banner fetched and saved locally!')
        onSaved?.(updated, false)
      }
    } catch (err) {
      setError(err.message || 'Artwork could not be re-fetched.')
    } finally {
      setBusy(false)
    }
  }

  const chooseArtwork = async (kind) => {
    setBusy(true); setError(''); setSuccessMsg('')
    try {
      const updated = await api.games.chooseAndSaveArtwork(game.id, kind)
      if (updated) {
        setCurrentGame((prev) => ({ ...prev, [kind === 'hero' ? 'hero_url' : 'cover_url']: updated[kind === 'hero' ? 'hero_url' : 'cover_url'] }))
        setSuccessMsg(`${kind === 'hero' ? 'Hero banner' : 'Cover artwork'} updated!`)
        onSaved?.(updated, false)
      }
    } catch (err) {
      setError(err.message || 'Artwork could not be uploaded.')
    } finally {
      setBusy(false)
    }
  }

  const chooseExecutable = async () => {
    setBusy(true); setError('')
    try {
      const executablePath = await api.games.chooseExecutable()
      if (executablePath) setForm((current) => ({ ...current, executablePath }))
    } catch (err) {
      setError(err.message || 'Executable could not be selected.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="editor-modal">
        <div className="scan-modal-header">
          <div>
            <div className="eyebrow"><span>LIBRARY OVERRIDE</span><span className="eyebrow-line" /></div>
            <h2>Edit Metadata & Artwork</h2>
            <p>{game.canonical_title}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="editor-body">
          {/* Live Artwork Previews */}
          <div className="flex gap-4 p-3 bg-zinc-900/60 rounded-lg border border-zinc-800/80 items-center">
            <div className="w-20 h-28 shrink-0 rounded bg-zinc-800 overflow-hidden border border-zinc-700 flex items-center justify-center text-xs text-zinc-500 text-center">
              {currentGame?.cover_url ? (
                <img src={normalizeArtworkUrl(currentGame.cover_url)} alt="Cover preview" className="w-full h-full object-cover" />
              ) : (
                <span>No cover</span>
              )}
            </div>
            <div className="flex-1 h-28 rounded bg-zinc-800 overflow-hidden border border-zinc-700 flex items-center justify-center text-xs text-zinc-500 text-center relative">
              {currentGame?.hero_url ? (
                <img src={normalizeArtworkUrl(currentGame.hero_url)} alt="Hero banner preview" className="w-full h-full object-cover" />
              ) : (
                <span>No hero banner</span>
              )}
            </div>
          </div>

          <div className="editor-artwork-row">
            <div>
              <span className="editor-label">Steam App ID / SteamGridDB ID</span>
              <div className="editor-id-row">
                <input className="editor-input" value={matchId} onChange={handleMatchIdChange} placeholder="e.g. 1593500 or SGDB Game ID" />
                <button className="outline-button" disabled={busy} onClick={refetch} title="Re-fetch cover and hero from SteamGridDB">
                  <RefreshCw size={14} className={busy ? 'spin-icon' : ''} /> {busy ? 'Fetching…' : 'Re-fetch Artwork'}
                </button>
                <button className="outline-button" type="button" disabled={busy} onClick={autoFillMetadata} title="Query Steam & IGDB to automatically fill description, developer, publisher, and genre">
                  <Sparkles size={14} className={busy ? 'spin-icon' : ''} /> Auto-fill Details
                </button>
              </div>
              <small className="editor-help">Numeric Steam IDs use official Steam CDN; SteamGridDB IDs fetch cover and hero banner locally.</small>
              <input className="editor-input editor-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="SteamGridDB API key (saved automatically)" autoComplete="off" />
            </div>
            <div className="editor-upload-grid">
              <button className="outline-button" disabled={busy} onClick={() => chooseArtwork('cover')}><UploadCloud size={14} /> Poster (Vertical)</button>
              <button className="outline-button" disabled={busy} onClick={() => chooseArtwork('hero')}><UploadCloud size={14} /> Hero Banner (Horizontal)</button>
            </div>
          </div>

          {successMsg ? <div className="scan-message scan-success"><Check size={14} /> {successMsg}</div> : null}
          {error ? <div className="scan-message scan-error"><X size={14} /> {error}</div> : null}

          <div className="editor-fields">
            <label><span>Title</span><input className="editor-input" value={form.title} onChange={change('title')} /></label>
            <label className="editor-field-wide"><span>Description</span><textarea className="editor-input editor-textarea" value={form.description} onChange={change('description')} rows={4} /></label>
            <label><span>Genres</span><input className="editor-input" value={form.genres} onChange={change('genres')} placeholder="Action, RPG" /></label>
            <label><span>Developer</span><input className="editor-input" value={form.developer} onChange={change('developer')} /></label>
            <label><span>Publisher</span><input className="editor-input" value={form.publisher} onChange={change('publisher')} /></label>
            <label><span>Store / Launcher</span><input className="editor-input" value={form.storeName} onChange={change('storeName')} placeholder="Steam, EA Games, Itch.io, Standalone" /></label>
            <label><span>SteamGridDB ID (Optional)</span><input className="editor-input" value={form.steamGridDbId} onChange={change('steamGridDbId')} placeholder="e.g. 12345" inputMode="numeric" /></label>
            <label><span>Executable Path (.exe)</span>
              <div className="editor-path-row">
                <input className="editor-input" value={form.executablePath} onChange={change('executablePath')} placeholder="Optional local .exe path" />
                <button className="outline-button" type="button" disabled={busy} onClick={chooseExecutable} title="Choose executable"><FolderOpen size={14} /></button>
              </div>
            </label>
            <label><span>Launch Arguments (Optional)</span><input className="editor-input" value={form.launchArguments} onChange={change('launchArguments')} placeholder="e.g. -windowed -novid" /></label>
            <label><span>Release date</span><input className="editor-input" value={form.releaseDate} onChange={change('releaseDate')} placeholder="YYYY-MM-DD" /></label>
          </div>
        </div>
        <div className="editor-footer">
          <button className="outline-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={busy} onClick={save}><Check size={14} /> Save changes</button>
        </div>
      </div>
    </div>
  )
}

function ContextMenu({ menu, menuRef, onClose, onMoveCategory, onEditGame, onHideGame, onArtworkChanged, onArtworkError }) {
  if (!menu) return null
  const game = menu.game
  const run = (action) => { onClose?.(); action?.(); }
  return <div ref={menuRef} className="art-context-menu" style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 9999 }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation() }}><button onClick={() => run(() => onMoveCategory?.(game, 'main'))}><LayoutGrid size={14} /> Move to Main Games</button><button onClick={() => run(() => onMoveCategory?.(game, 'dlc'))}><PackageOpen size={14} /> Move to DLC & Add-ons</button><button onClick={() => run(() => onMoveCategory?.(game, 'utility'))}><Wrench size={14} /> Move to Utility Tools</button><div className="context-divider" /><button onClick={() => run(() => onEditGame?.(game))}><SlidersHorizontal size={14} /> Edit Metadata & Artwork</button><button onClick={() => run(async () => { try { const result = await api.selectCustomArtwork(game.id); if (result) onArtworkChanged?.(result, game) } catch (error) { onArtworkError?.(error) } })}><ImagePlus size={14} /> Change cover artwork</button><button onClick={() => run(() => onHideGame?.(game))}><EyeOff size={14} /> Hide from library</button></div>
}

function GameCard({ game, onLaunch, onSelect, onHideGame, onContextMenu, compact = false, selectMode = false, selected = false, onToggleSelect, onImageError, isRestored = false }) {
  const platforms = sourcePlatforms(game.sources)
  const storeLabels = sourceLabelsForGame(game)
  const rawStatus = String(game.status || game.backlog_status || 'unplayed').toLowerCase()
  const currentStatus = rawStatus === 'dropped' ? 'paused' : (['playing', 'paused', 'completed', 'unplayed'].includes(rawStatus) ? rawStatus : 'unplayed')
  const statusLabel = currentStatus === 'playing' ? '● Playing' : currentStatus === 'paused' ? '⏸ On Pause' : currentStatus === 'completed' ? '✓ Completed' : '○ Unplayed'

  return (
    <article
      tabIndex={0}
      data-status={currentStatus}
      className={cn('poster-card', `status-${currentStatus}`, compact && 'poster-card-compact', selectMode && 'poster-card-selectable', selected && 'poster-card-selected', isRestored && 'poster-card-restored')}
      onClick={() => selectMode ? onToggleSelect?.(game) : onSelect?.(game)}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !selectMode && !event.target.closest('button')) {
          event.preventDefault()
          onSelect?.(game)
        }
      }}
      onContextMenu={(event) => onContextMenu?.(event, game)}
    >
      <div className="poster-art">
        {selectMode ? (
          <button
            type="button"
            className={cn('card-select-toggle', selected && 'active')}
            aria-label={`${selected ? 'Deselect' : 'Select'} ${game.canonical_title}`}
            onClick={(event) => { event.stopPropagation(); onToggleSelect?.(game) }}
          >
            <Check size={13} />
          </button>
        ) : null}

        {game.is_favorite ? (
          <div className="poster-favorite-badge" title="Favorite title">
            <Star size={11} fill="currentColor" />
          </div>
        ) : null}

        <PosterImage game={game} className="poster-image" onImageError={onImageError} />
        <div className="poster-gradient" />

        {/* Machined Optical Hover Tray */}
        <div className="poster-drawer">
          <div className="drawer-header-row">
            <div className="drawer-badges">
              {storeLabels.map((label) => (
                <PlatformBadge key={label} platform={normalizePlatform(label)} label={label} />
              ))}
            </div>
            <div className="drawer-telemetry">
              <span className={cn('drawer-status-pip', `pip-${currentStatus}`)} />
              <span className="drawer-status-text">
                {game.is_installed ? 'Installed' : 'Ready'}
              </span>
              {game.play_time_seconds > 0 ? (
                <span className="drawer-playtime">{formatPlayTime(game.play_time_seconds)}</span>
              ) : game.install_size_gb ? (
                <span className="drawer-playtime">{formatGb(game.install_size_gb)}</span>
              ) : null}
            </div>
          </div>
          <div className="drawer-actions">
            <button
              type="button"
              className="drawer-action"
              onClick={(event) => {
                event.stopPropagation()
                onLaunch(game)
              }}
              title={game.is_installed ? `Play ${game.canonical_title}` : `Install via ${storeLabels[0] || 'store'}`}
            >
              {game.is_installed ? (
                <>
                  <Play size={12} fill="currentColor" /> Play
                </>
              ) : (
                <>
                  <Download size={12} /> Install
                </>
              )}
            </button>
            <button
              type="button"
              className="drawer-icon-action"
              title="Hide from library"
              aria-label={`Hide ${game.canonical_title} from library`}
              onClick={(event) => {
                event.stopPropagation()
                onHideGame?.(game)
              }}
            >
              <EyeOff size={13} />
            </button>
          </div>
        </div>
      </div>
      <div className="poster-caption">
        <strong title={game.canonical_title}>{game.canonical_title}</strong>
        <small>{game.is_utility ? 'Utility tool' : game.developer || 'Unknown developer'}</small>
      </div>
    </article>
  )
}
function StatusRow({ icon: Icon, title, subtitle }) { return <div className="status-row"><div className="status-icon"><Icon size={16} /></div><div className="status-copy"><span>{title}</span><small>{subtitle}</small></div><StatusDot /></div> }
function HiddenItemsPanel({ games, onRestore }) { return <section className="hidden-items-panel"><div className="section-header compact"><div><h2>Hidden library entries</h2><p>Support components, DLC, add-ons, and anything you hide manually stay out of the main collection.</p></div><span className="sync-label"><EyeOff size={13} /> {games.length} hidden</span></div>{games.length ? <div className="hidden-items-list">{games.map((game) => <div className="hidden-item" key={game.id}><div className="hidden-item-copy"><strong>{game.canonical_title}</strong><small>{game.hidden_reason === 'support-component-or-addon' ? 'Automatically hidden support or add-on entry' : 'Hidden manually'} · {game.backlog_status || 'unplayed'} · {formatPlayTime(game.play_time_seconds)}</small></div><button className="outline-button small-button" onClick={() => onRestore(game)}><Eye size={14} /> Restore</button></div>)}</div> : <div className="hidden-empty"><Eye size={18} /><span>No hidden library entries.</span></div>}</section> }
function StatCard({ icon: Icon, label, value, meta, accent = 'green' }) { return <div className="stat-card"><div className={cn('stat-icon', `stat-${accent}`)}><Icon size={18} /></div><div className="stat-copy"><p>{label}</p><strong>{value}</strong><span>{meta}</span></div></div> }

function ScanImportPanel({ open, onClose, onRefresh }) {
  const [running, setRunning] = useState(false); const [progress, setProgress] = useState({ message: 'Choose a local scan or catalog import to begin.', current: 0, total: 0 }); const [result, setResult] = useState(null); const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  useEffect(() => { if (!open) return undefined; return api.scanner.onProgress(setProgress) }, [open])
  if (!open) return null
  const run = async (action) => { setRunning(true); setResult(null); setError(''); try { const next = await action(); setResult(next); await onRefresh() } catch (e) { setError(e.message || 'Operation failed.') } finally { setRunning(false) } }
  const importViaPicker = () => run(async () => { const file = await api.scanner.chooseImportFile(); if (!file) throw new Error('No catalog file selected.'); return api.scanner.importFile(file) })
  const processDroppedFile = async (dropped) => {
    if (!dropped) { setError('Drop an .xlsx, .xls, or .csv file.'); return }
    const filename = String(dropped.name || '').toLowerCase()
    const accepted = filename.endsWith('.csv') || filename.endsWith('.xls') || filename.endsWith('.xlsx')
    if (!accepted) { setError('Drop an .xlsx, .xls, or .csv file.'); return }
    // Always prefer reading as buffer — works regardless of Electron version / sandbox
    try {
      const buffer = await dropped.arrayBuffer()
      if (buffer && buffer.byteLength > 0) {
        run(() => api.scanner.importBuffer(new Uint8Array(buffer), dropped.name))
        return
      }
    } catch {}
    // Fallback: try to get native file path via preload bridge
    let filePath = ''
    try { if (typeof api.getPathForFile === 'function') filePath = api.getPathForFile(dropped) } catch {}
    if (!filePath && dropped.path) filePath = dropped.path
    if (filePath) {
      run(() => api.scanner.importFile(filePath))
    } else {
      setError('Could not read the dropped file. Please use "Import Excel catalog" instead.')
    }
  }
  const drop = (event) => { event.preventDefault(); const dropped = event.dataTransfer.files?.[0]; processDroppedFile(dropped) }
  const handleFileInput = (event) => { const file = event.target.files?.[0]; if (file) processDroppedFile(file); event.target.value = '' }
  const percent = progress.total ? Math.round((progress.current / progress.total) * 100) : running ? 8 : 0
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="scan-modal">
        <div className="scan-modal-header">
          <div>
            <div className="eyebrow">
              <span>LIBRARY TOOLS</span>
              <span className="eyebrow-line" />
            </div>
            <h2>Scan & Import</h2>
            <p>Bring local installs and your complete owned catalog into one canonical library.</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={17} /></button>
        </div>

        <div className="scan-action-grid">
          <button className="scan-action-card" disabled={running} onClick={() => run(() => api.scanner.scanAll())}>
            <span className="scan-action-icon scan-lime"><ScanLine size={21} /></span>
            <span><strong>Scan local drives</strong><small>Steam · Epic Games · GOG · Amazon Games</small></span>
            <ChevronDown className="action-arrow" size={15} />
          </button>
          <button className="scan-action-card" disabled={running} onClick={importViaPicker}>
            <span className="scan-action-icon scan-violet"><FileSpreadsheet size={21} /></span>
            <span><strong>Import Excel catalog</strong><small>XLSX · XLS · CSV · multi-sheet</small></span>
            <ChevronDown className="action-arrow" size={15} />
          </button>
        </div>

        <div className="import-instructions-banner">
          <div className="import-instructions-row">
            <Info size={14} className="import-instructions-icon" />
            <p className="import-instructions-text">
              To populate your 'Ready to install' backlog, upload an Excel/CSV file containing your uninstalled library.
            </p>
          </div>
          <div className="import-headers-guide">
            <span className="import-headers-label">Required headers:</span>
            <div className="import-headers-tags">
              <span className="import-header-tag"><code>title</code></span>
              <span className="import-header-tag"><code>source</code></span>
              <span className="import-header-tag"><code>is_installed</code></span>
              <span className="import-header-tag"><code>is_utility</code></span>
              <span className="import-header-tag"><code>is_dlc</code></span>
              <span className="import-header-tag"><code>playtime_h</code></span>
            </div>
          </div>
        </div>

        <div className="drop-zone" style={{ cursor: 'pointer' }} onDragOver={(event) => event.preventDefault()} onDrop={drop} onClick={() => fileInputRef.current?.click()}>
          <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={handleFileInput} style={{ display: 'none' }} />
          <UploadCloud size={20} />
          <div>
            <strong>Drop your catalog here</strong>
            <small>Use Game list.xlsx or a CSV export (click to browse)</small>
          </div>
        </div>

        <div className="scan-progress">
          <div className="progress-heading">
            <span>{running ? 'Working…' : 'Ready to scan'}</span>
            <small>{running ? `${percent}%` : 'Local-only processing'}</small>
          </div>
          <div className="progress-track">
            <span style={{ width: `${percent}%` }} />
          </div>
          <p>{progress.message}</p>
        </div>

        {error ? <div className="scan-message scan-error"><X size={14} /> {error}</div> : null}
        {result ? (
          <div className="scan-result">
            <div className="result-title"><Check size={15} /> {result.type === 'import' ? 'Catalog import complete' : 'Drive scan complete'}</div>
            <div className="result-grid">
              <span><strong>{result.importedCatalogGames || result.scannedInstalledGames || 0}</strong> {result.type === 'import' ? 'catalog titles' : 'installed games'}</span>
              <span><strong>{result.created || 0}</strong> new records</span>
              <span><strong>{result.updated || 0}</strong> merged records</span>
              <span><strong>{result.multiPlatformDuplicates || result.offlineDrives || 0}</strong> {result.type === 'import' ? 'cross-store links' : 'offline drives'}</span>
            </div>
          </div>
        ) : null}

        <div className="automation-disclaimer modal-disclaimer">
          <Info size={13} className="disclaimer-icon" />
          <p>
            Automated scrapers occasionally miss on franchise subtitles. You can override any poster instantly using our SteamGridDB quick-picker.
          </p>
        </div>
      </div>
    </div>
  )
}

function RoulettePanel({ onWinner }) {
  const [rolling, setRolling] = useState(false)
  const [candidate, setCandidate] = useState(null)
  const [winner, setWinner] = useState(null)
  const [error, setError] = useState('')
  const start = async () => {
    if (rolling) return
    setError('')
    setWinner(null)
    setRolling(true)
    try {
      const [pool, target] = await Promise.all([
        api.database.getGames({ installed: true, utility: false }, { field: 'canonical_title', direction: 'asc' }),
        api.roulette.pick(),
      ])
      if (!target) throw new Error('No installed non-utility games are available for a pick.')
      const animationPool = pool.length ? pool : [target]
      let step = 0
      const tick = () => {
        setCandidate(step >= 18 ? target : animationPool[Math.floor(Math.random() * animationPool.length)])
        if (step >= 18) {
          setWinner(target)
          setRolling(false)
          onWinner(target)
          return
        }
        step += 1
        window.setTimeout(tick, 80 + (step * 22))
      }
      tick()
    } catch (err) {
      setRolling(false)
      setError(err.message || 'Unable to choose a title.')
    }
  }
  const shown = candidate || winner
  return <section className="pick-panel"><div className="pick-orbit"><div className="pick-orbit-ring" /><div className="pick-card-window">{shown ? <PosterImage game={shown} className={cn('pick-poster', rolling && 'pick-poster-rolling')} /> : <div className="pick-placeholder"><Dices size={36} /><span>Ready when you are</span></div>}</div></div><div className="pick-copy"><div className="eyebrow"><span>LOCAL RANDOMIZER</span><span className="eyebrow-line" /></div><h2>{winner ? 'Your next session' : 'Today’s Pick'}</h2><p>{winner ? `${winner.canonical_title} is installed, owned, and ready for a focused session.` : 'A private roulette wheel for the games already installed on your connected drives.'}</p><div className="pick-rule"><span><Trophy size={14} /> Installed only</span><span><WandSparkles size={14} /> Utilities excluded</span></div><button className="hero-action pick-button" disabled={rolling} onClick={start}>{rolling ? <><RefreshCw size={16} className="spin-icon" /> Shuffling…</> : <><Dices size={16} /> {winner ? 'Spin again' : 'Spin the wheel'}</>}</button>{error ? <div className="scan-message scan-error"><X size={14} /> {error}</div> : null}</div></section>
}

function ArtworkManager({ onRefresh, onCancel }) {
  const [apiKey, setApiKey] = useState('')
  const [keyLoaded, setKeyLoaded] = useState(false)
  const [running, setRunning] = useState(false)
  const [syncType, setSyncType] = useState('none')
  const [fallbackRunning, setFallbackRunning] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [progress, setProgress] = useState(() => normalizeSyncProgress({ message: 'Use official Steam assets or generate local fallback art for missing artwork.', current: 0, total: 0 }))
  const [rawResult, setResult] = useState(null)
  const [activity, setActivity] = useState([])
  const [error, setError] = useState('')
  const loadActivity = async () => { try { const next = await api.database.getActivityLog?.(24); setActivity(normalizeActivityLog(next)) } catch { setActivity([]) } }

  useEffect(() => {
    api.scraper.isSyncing?.().then((active) => {
      if (active) setRunning(true)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    return api.scraper.onProgress?.((next) => {
      const norm = normalizeSyncProgress(next)
      setProgress(norm)
      if (norm.total > 0 && norm.current > 0 && norm.current < norm.total) {
        setRunning(true)
      } else if (norm.phase === 'complete' || (norm.total > 0 && norm.current >= norm.total)) {
        setRunning(false)
        setSyncType('none')
      }
    })
  }, [])

  useEffect(() => {
    const off = api.scraper.onUpdated?.(() => {
      setRunning(false)
      setSyncType('none')
    })
    return () => off?.()
  }, [])

  useEffect(() => { loadActivity(); const off = api.database.onUpdated?.(() => loadActivity()); return () => off?.() }, [])
  useEffect(() => { let active = true; Promise.resolve(api.database.getLibrarySettings?.()).then((settings) => { if (!active) return; const safeSettings = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {}; setApiKey(typeof safeSettings.steamGridDbApiKey === 'string' ? safeSettings.steamGridDbApiKey : ''); setKeyLoaded(true) }).catch(() => { if (active) { setApiKey(''); setKeyLoaded(true) } }); return () => { active = false } }, [])
  const persistKey = async (value = apiKey) => { const key = typeof value === 'string' ? value.trim() : ''; try { await api.database.setLibrarySettings?.({ steamGridDbApiKey: key }) } catch (err) { setError(safeErrorText(err, 'SteamGridDB key could not be saved.')) } }
  useEffect(() => { if (!keyLoaded) return undefined; const timer = window.setTimeout(() => persistKey(apiKey), 450); return () => window.clearTimeout(timer) }, [apiKey, keyLoaded])

  const runMetadata = async () => {
    if (apiKey.trim()) await persistKey(apiKey)
    setRunning(true); setSyncType('metadata'); setError(''); setResult(null)
    try {
      const next = await api.scraper.syncMetadata(apiKey.trim())
      setResult(normalizeSyncResult(next))
      await onRefresh()
      await loadActivity()
    } catch (err) {
      setError(safeErrorText(err, 'Metadata sync failed.'))
    } finally {
      setRunning(false)
      setSyncType('none')
    }
  }

  const runMissingArtwork = async () => {
    if (!apiKey.trim()) { setError('Paste your SteamGridDB API key first.'); return }
    await persistKey(apiKey)
    setRunning(true); setSyncType('artwork'); setError(''); setResult(null)
    try {
      const next = await api.scraper.runBulkArtworkSync(apiKey.trim())
      setResult(normalizeSyncResult(next))
      await onRefresh()
      await loadActivity()
    } catch (err) {
      setError(safeErrorText(err, 'Missing artwork sync failed.'))
    } finally {
      setRunning(false)
      setSyncType('none')
    }
  }

  const cancel = async () => {
    setCanceling(true)
    try {
      await onCancel?.()
      setRunning(false)
      setSyncType('none')
    } catch (err) {
      setError(safeErrorText(err, 'Unable to cancel the sync.'))
    } finally {
      setCanceling(false)
    }
  }

  const runFallbacks = async () => {
    setFallbackRunning(true); setSyncType('fallback'); setError(''); setResult(null)
    try {
      const next = await api.scraper.generateAutomaticFallbacks()
      setResult(normalizeSyncResult(next))
      await onRefresh()
    } catch (err) {
      setError(safeErrorText(err, 'Automatic artwork fallback failed.'))
    } finally {
      setFallbackRunning(false)
      setSyncType('none')
    }
  }

  const isSyncProgressActive = Boolean(progress.total > 0 && progress.current > 0 && progress.current < progress.total)
  const busy = running || fallbackRunning || canceling || isSyncProgressActive
  const safeActivityLog = normalizeActivityLog(activity)
  const safeResult = normalizeSyncResult(rawResult)
  const result = safeResult
  const safeFailedTitles = Array.isArray(safeResult?.failedTitles) ? safeResult.failedTitles : []
  const percent = progress.total ? Math.round((progress.current / progress.total) * 100) : busy ? 6 : 0

  return <section className="artwork-manager"><div className="section-header compact"><div><h2>Artwork & Metadata cache</h2><p>Sync descriptions, genres, studios, release dates, and official SteamGridDB covers and heroes.</p></div><span className="sync-label"><span className="pulse-dot" /> Local cache</span></div><div className="artwork-form"><div className="artwork-input"><KeyRound size={15} /><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} onBlur={() => keyLoaded && persistKey()} placeholder="SteamGridDB API key" autoComplete="off" /><span>Private · saved locally</span></div><div className="artwork-buttons"><button className="outline-button" disabled={busy} onClick={runMetadata}>{busy && (syncType === 'metadata' || progress.source === 'metadata') ? <RefreshCw size={14} className="spin-icon" /> : <Database size={14} />} {busy && (syncType === 'metadata' || progress.source === 'metadata') ? 'Syncing Metadata…' : 'Sync Library Metadata'}</button><button className="outline-button" disabled={busy} onClick={runMissingArtwork}>{busy && (syncType === 'artwork' || progress.source !== 'metadata') ? <RefreshCw size={14} className="spin-icon" /> : <RefreshCw size={14} />} {busy && (syncType === 'artwork' || progress.source !== 'metadata') ? 'Syncing Artwork…' : 'Sync Missing Artwork'}</button>{busy ? <button className="danger-button" disabled={canceling} onClick={cancel}><X size={14} /> {canceling ? 'Cancelling…' : 'Cancel Sync'}</button> : null}<button className="outline-button" disabled={busy} onClick={runFallbacks}>{fallbackRunning ? <RefreshCw size={14} className="spin-icon" /> : <Sparkles size={14} />} {fallbackRunning ? 'Generating…' : 'Automatic fallback art'}</button></div></div><div className="scan-progress artwork-progress"><div className="progress-heading"><span>{busy ? (progress.title ? `Syncing: ${progress.current} / ${progress.total} — ${progress.title}` : (progress.message || 'Working…')) : 'Ready'}</span><small>{busy ? `${percent}%` : 'User-triggered'}</small>{busy ? <button className="outline-button small-button" style={{ marginLeft: '12px', height: '22px', padding: '0 8px', fontSize: '10px' }} disabled={canceling} onClick={cancel}><X size={11} /> Cancel</button> : null}</div><div className="progress-track"><span style={{ width: `${percent}%` }} /></div><p>{progress.message}</p></div>{error ? <div className="scan-message scan-error"><X size={14} /> {error}</div> : null}{result ? <div className="scan-result"><div className="result-title"><Check size={15} /> {result.cancelled ? 'Sync cancelled safely' : result.metadataUpdated !== undefined ? `Metadata sync finished: ${result.metadataUpdated} updated` : result.updated !== undefined ? `Artwork cache updated: ${result.updated} covers/heroes` : 'Sync finished'}</div>{result.metadataUpdated !== undefined ? <div className="result-grid"><span><strong>{result.candidates || 0}</strong> queued</span><span><strong>{result.metadataUpdated || 0}</strong> metadata updated</span></div> : result.updated !== undefined ? <><div className="result-grid"><span><strong>{result.candidates || 0}</strong> queued</span><span><strong>{result.updated || 0}</strong> updated</span></div>{safeFailedTitles.length ? <div className="artwork-failure-list"><strong>Sample failures</strong>{safeFailedTitles.map((item, index) => item ? <small key={item.title || index}>{item.title || 'Unknown title'}: {item.reason || 'Unknown error'}</small> : null)}</div> : null}</> : result.fallbackCovers !== undefined ? <div className="result-grid"><span><strong>{result.candidates || 0}</strong> candidates</span><span><strong>{result.fallbackCovers || 0}</strong> fallback covers</span></div> : null}</div> : null}{safeActivityLog.length ? <div className="activity-log"><div className="activity-log-heading"><strong>Recent sync activity</strong><small>SQLite activity_log</small></div>{safeActivityLog.slice(0, 12).map((item, index) => item ? <div className="activity-log-row" key={item.id || `${item.status || 'unknown'}-${item.title || 'entry'}-${index}`}><span className={`activity-status activity-${item.status || 'unknown'}`}>{item.status || 'unknown'}</span><span className="activity-log-title">{item.title || 'Library sync'}</span><small>{item.message || ''}</small></div> : null)}</div> : null}</section>
}

function DatabaseManagement({ onExport, onPurge, onBackup, onRestore, onOpenBackups }) {
  const [exporting, setExporting] = useState(false); const [archiving, setArchiving] = useState(false); const [error, setError] = useState('')
  const runAction = async (action, fallbackMessage) => { setError(''); try { await action?.() } catch (err) { setError(err.message || fallbackMessage) } }
  const exportCsv = async () => { setExporting(true); await runAction(onExport, 'Library export failed.'); setExporting(false) }
  const backupCache = async () => { setArchiving(true); await runAction(onBackup, 'Artwork cache backup failed.'); setArchiving(false) }
  const restoreCache = async () => { setArchiving(true); await runAction(onRestore, 'Artwork cache restore failed.'); setArchiving(false) }
  return <section className="database-management"><div className="section-header compact"><div><h2>Database management</h2><p>Export your catalog, manage point-in-time database backups, or archive the local artwork cache.</p></div><span className="sync-label"><Database size={13} /> Local cache</span></div><div className="management-actions"><button className="outline-button" disabled={exporting || archiving} onClick={exportCsv}><FileDown size={15} /> {exporting ? 'Exporting…' : 'Export library to CSV'}</button><button className="outline-button" disabled={exporting || archiving} onClick={onOpenBackups} title="Open database snapshot and restore manager"><Archive size={15} /> Database backups & restore</button><button className="outline-button" disabled={exporting || archiving} onClick={backupCache}><FileDown size={15} /> {archiving ? 'Working…' : 'Backup artwork cache'}</button><button className="outline-button" disabled={exporting || archiving} onClick={restoreCache}><UploadCloud size={15} /> {archiving ? 'Working…' : 'Restore artwork cache'}</button><button className="danger-button" disabled={exporting || archiving} onClick={onPurge}><Trash2 size={15} /> Purge library</button></div>{error ? <div className="scan-message scan-error"><X size={14} /> {error}</div> : null}</section>
}
function BulkEditModal({ open, count, busy, onClose, onApply }) {
  const [storeName, setStoreName] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setStoreName(''); setTags(''); setError('') } }, [open])
  if (!open) return null
  const submit = async () => {
    if (!storeName.trim() && !tags.trim()) { setError('Enter a Store / Source or Tag value.') ; return }
    setError('')
    try { await onApply?.({ ...(storeName.trim() ? { storeName: storeName.trim() } : {}), ...(tags.trim() ? { tags: tags.trim() } : {}) }) } catch (err) { setError(err.message || 'Bulk edit failed.') }
  }
  return <div className="modal-backdrop editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}><div className="editor-modal bulk-edit-modal"><div className="scan-modal-header"><div><div className="eyebrow"><span>BULK LIBRARY EDIT</span><span className="eyebrow-line" /></div><h2>Edit selected games</h2><p>Apply one or both values to {count} selected card{count === 1 ? '' : 's'}.</p></div><button className="modal-close" disabled={busy} onClick={onClose}><X size={17} /></button></div><div className="editor-body"><div className="editor-fields bulk-edit-fields"><label><span>Store / Source</span><input className="editor-input" value={storeName} onChange={(event) => setStoreName(event.target.value)} placeholder="EA Games, Xbox, Itch.io" /></label><label><span>Tag</span><input className="editor-input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Backlog, Co-op, Priority" /></label></div>{error ? <div className="scan-message scan-error"><X size={14} /> {error}</div> : null}</div><div className="editor-footer"><button className="outline-button" disabled={busy} onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy} onClick={submit}><Check size={14} /> {busy ? 'Applying…' : 'Apply to selected'}</button></div></div></div>
}

function PurgeConfirmModal({ open, busy, onClose, onConfirm }) {
  if (!open) return null
  return <div className="modal-backdrop purge-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}><div className="purge-modal"><div className="purge-icon"><AlertTriangle size={25} /></div><div><div className="eyebrow"><span>DANGER ZONE</span><span className="eyebrow-line" /></div><h2>Purge library?</h2><p>Are you sure? This will delete all records from your library. Physical poster, hero, and icon files in the local artwork cache will be preserved.</p></div><div className="editor-footer"><button className="outline-button" disabled={busy} onClick={onClose}>Cancel</button><button className="danger-button" disabled={busy} onClick={onConfirm}><Trash2 size={14} /> {busy ? 'Purging…' : 'Yes, purge database'}</button></div></div></div>
}

function ConfirmActionModal({ config, onClose }) {
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!config) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault()
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [config, busy, onClose])

  if (!config) return null
  const {
    eyebrow = 'CONFIRM ACTION',
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = false,
    icon: Icon = isDanger ? Trash2 : ArrowRightLeft,
    onConfirm,
  } = config

  const handleConfirm = async () => {
    setBusy(true)
    try {
      await onConfirm?.()
      onClose?.()
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop confirm-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose?.()}>
      <div className="confirm-modal">
        <div className={cn('confirm-icon', isDanger && 'confirm-icon-danger')}>
          <Icon size={22} />
        </div>
        <div className="confirm-content">
          <div className="eyebrow">
            <span>{eyebrow}</span>
            <span className="eyebrow-line" />
          </div>
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
        <div className="editor-footer">
          <button className="outline-button" disabled={busy} onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={isDanger ? 'danger-button' : 'primary-button'}
            disabled={busy}
            autoFocus
            onClick={handleConfirm}
          >
            {busy ? <RefreshCw size={14} className="spin-icon" /> : <Check size={14} />}
            {busy ? 'Working…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

function BackupsManagerModal({
  open,
  busy,
  backups,
  loading,
  backupsDirectory,
  onClose,
  onBackupNow,
  onOpenFolder,
  onRestoreBackup,
  onChooseAndRestoreFile,
}) {
  if (!open) return null

  return (
    <div
      className="modal-backdrop backups-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose?.()}
    >
      <div className="editor-modal backups-modal">
        <div className="scan-modal-header">
          <div>
            <div className="eyebrow">
              <span>DATABASE MANAGEMENT</span>
              <span className="eyebrow-line" />
            </div>
            <h2>Database snapshots & restore</h2>
            <p>Review point-in-time library backups, reveal backup files on disk, or restore a snapshot.</p>
          </div>
          <button className="modal-close" disabled={busy} onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="backups-modal-toolbar">
          <div
            className="backups-folder-pill"
            onClick={() => onOpenFolder(backupsDirectory)}
            title={`Click to reveal folder in Windows Explorer: ${backupsDirectory || 'UserData/backups'}`}
          >
            <FolderOpen size={14} className="backups-folder-icon" />
            <div className="backups-folder-info">
              <span className="backups-folder-label">Backups location</span>
              <span className="backups-folder-path">{backupsDirectory || 'UserData/backups'}</span>
            </div>
            <span className="backups-folder-open-hint">Open ↗</span>
          </div>

          <div className="backups-toolbar-actions">
            <button
              type="button"
              className="outline-button small-button"
              disabled={busy}
              onClick={onChooseAndRestoreFile}
              title="Select an external .db backup file to restore"
            >
              <FileDown size={13} />
              <span>Restore from file…</span>
            </button>
            <button
              type="button"
              className="primary-button small-button"
              disabled={busy}
              onClick={onBackupNow}
            >
              {busy ? <RefreshCw size={13} className="spin-icon" /> : <Archive size={13} />}
              <span>{busy ? 'Working…' : 'Create backup now'}</span>
            </button>
          </div>
        </div>

        <div className="backups-modal-body">
          {loading ? (
            <div className="empty-state">
              <div className="loader" />
              <span>Scanning backup snapshots…</span>
            </div>
          ) : !backups?.length ? (
            <div className="empty-state backups-empty-state">
              <Archive size={30} className="empty-state-icon" />
              <strong>No database snapshots found</strong>
              <p>Snapshots are saved as point-in-time SQLite files in your backups folder.</p>
              <button
                type="button"
                className="primary-button small-button"
                disabled={busy}
                onClick={onBackupNow}
              >
                <Archive size={13} />
                <span>Create first backup now</span>
              </button>
            </div>
          ) : (
            <div className="backups-list">
              {backups.map((item) => (
                <div key={item.filePath || item.fileName} className="backup-card">
                  <div className={cn('backup-icon', item.isSafetyBackup ? 'backup-icon-safety' : 'backup-icon-db')}>
                    <Database size={16} />
                  </div>
                  <div className="backup-details">
                    <div className="backup-title-row">
                      <strong className="backup-filename" title={item.filePath}>{item.fileName}</strong>
                      <span className="backup-badge badge-size">{formatBytes(item.sizeBytes)}</span>
                      {item.hasArtwork ? (
                        <span className="backup-badge badge-art">Artwork cache</span>
                      ) : null}
                      {item.isSafetyBackup ? (
                        <span className="backup-badge badge-safety">Safety snapshot</span>
                      ) : null}
                    </div>
                    <div className="backup-sub-row">
                      <span className="backup-date">{formatTimestamp(item.mtimeMs)}</span>
                      <span className="backup-bullet">•</span>
                      <button
                        type="button"
                        className="backup-path-link"
                        title={`Reveal in Explorer: ${item.filePath}`}
                        onClick={() => onOpenFolder(item.filePath)}
                      >
                        <FolderOpen size={11} />
                        <span>{item.filePath}</span>
                      </button>
                    </div>
                  </div>
                  <div className="backup-actions">
                    <button
                      type="button"
                      className="outline-button small-button"
                      title="Reveal this snapshot file in Windows Explorer"
                      onClick={() => onOpenFolder(item.filePath)}
                    >
                      <FolderOpen size={12} />
                      <span>Reveal</span>
                    </button>
                    <button
                      type="button"
                      className="primary-button small-button restore-btn"
                      disabled={busy}
                      title="Restore database from this snapshot"
                      onClick={() => onRestoreBackup(item)}
                    >
                      <UploadCloud size={12} />
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="editor-footer">
          <small className="backups-footer-note">
            Restoring replaces <code>logpile.db</code>. An automatic safety snapshot is always taken before restoring.
          </small>
          <button className="outline-button" disabled={busy} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const COMMON_SINGLE_WORD_STEMS = new Set([
  'the', 'a', 'an', 'beyond', 'project', 'tales', 'chronicles', 'world', 'age',
  'star', 'super', 'dead', 'call', 'total', 'shadow', 'legend', 'legends',
  'battle', 'war', 'dark', 'heroes', 'dragon', 'monster', 'final', 'kingdom',
  'space', 'city', 'island', 'warrior', 'warriors', 'odyssey', 'chronicle'
])

function extractFranchiseStem(rawTitle) {
  if (!rawTitle) return { stem: '', isKnown: false }
  let cleaned = String(rawTitle).replace(/[\u2122\u00ae\u00a9]/g, '').trim()
  let hasSuffix = false
  for (const suffix of TITLE_SUFFIXES) {
    const marker = ` ${suffix}`
    if (cleaned.toLowerCase().endsWith(marker)) {
      cleaned = cleaned.slice(0, -marker.length).trim()
      hasSuffix = true
    }
  }

  const KNOWN_FRANCHISES = [
    "A Plague Tale", "Plague Tale", "Alan Wake", "Assassin's Creed", "Batman", "BioShock", "Borderlands", "Call of Duty", 
    "Castlevania", "Control", "Dark Souls", "Dead Space", "Deus Ex", "Devil May Cry", "Dishonored", 
    "Doom", "Dragon Age", "Fallout", "Far Cry", "Final Fantasy", "God of War", 
    "Grand Theft Auto", "GTA", "Half-Life", "Halo", "Hitman", "Kingdom Hearts", 
    "Lego", "Life is Strange", "Mass Effect", "Max Payne", "Metal Gear", 
    "Metro", "Monster Hunter", "Mortal Kombat", "Need for Speed", "Portal", 
    "Quantum Break", "Resident Evil", "Saints Row", "Silent Hill", "Sniper Elite", "Star Wars", 
    "The Elder Scrolls", "The Witcher", "Tomb Raider", "Total War", "Uncharted", 
    "Wolfenstein", "Yakuza", "Civilization", "Age of Empires", "Watch Dogs",
    "Mafia", "Just Cause", "Crysis", "Darksiders", "Payday", "Like a Dragon", "Red Dead",
    "Spider-Man", "The Last of Us", "Horizon", "Forza", "Gears of War", "Dying Light",
    "Hellblade", "Little Nightmares", "Outlast", "Amnesia", "Subnautica", "Middle-earth"
  ]
  const lower = cleaned.toLowerCase()
  for (const franchise of KNOWN_FRANCHISES) {
    const fLower = franchise.toLowerCase()
    const hasPhrase =
      lower === fLower ||
      lower.startsWith(fLower + ' ') ||
      lower.startsWith(fLower + ':') ||
      lower.startsWith(fLower + ' -') ||
      lower.startsWith(fLower + '-') ||
      lower.includes(` ${fLower} `) ||
      lower.includes(`: ${fLower}`) ||
      lower.includes(`- ${fLower}`) ||
      lower.includes(`${fLower}:`) ||
      lower.endsWith(` ${fLower}`)

    if (hasPhrase) {
      return { stem: franchise, isKnown: true }
    }
  }

  const colonPart = cleaned.split(/[:\-–—]/)[0].trim()
  if (colonPart.length >= 3 && colonPart.length < cleaned.length) {
    return { stem: colonPart, isKnown: false }
  }

  const withoutNum = cleaned.replace(/\s+(?:\d+|[IVXLCDM]+)$/i, '').trim()
  if (withoutNum && withoutNum.length >= 3 && withoutNum.length < cleaned.length) {
    return { stem: withoutNum, isKnown: false }
  }

  if (hasSuffix && cleaned.length >= 3 && cleaned.includes(' ')) {
    return { stem: cleaned, isKnown: false }
  }

  return { stem: '', isKnown: false }
}

function normalizeStudio(str) {
  if (!str) return ''
  return String(str)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function sameStudio(gameA, gameB) {
  const a = normalizeStudio(gameA?.developer)
  const b = normalizeStudio(gameB?.developer)
  if (!a || !b || a.length < 2 || b.length < 2) return false
  if (a === b) return true
  if (a.length >= 4 && b.length >= 4) {
    if (a.includes(b) || b.includes(a)) return true
  }
  return false
}

function sameStudioOrPublisher(gameA, gameB) {
  const aDev = normalizeStudio(gameA?.developer)
  const bDev = normalizeStudio(gameB?.developer)
  const aPub = normalizeStudio(gameA?.publisher)
  const bPub = normalizeStudio(gameB?.publisher)

  const matchPair = (x, y) => {
    if (!x || !y || x.length < 2 || y.length < 2) return false
    if (x === y) return true
    if (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))) return true
    return false
  }

  if (matchPair(aDev, bDev)) return true
  if (matchPair(aPub, bPub)) return true
  if (matchPair(aDev, bPub)) return true
  if (matchPair(aPub, bDev)) return true
  return false
}

function getFranchiseGames(activeGame, allGames = []) {
  if (!activeGame || !allGames.length) return { stem: '', games: [] }
  const { stem, isKnown } = extractFranchiseStem(activeGame.canonical_title)
  if (!stem) return { stem: '', games: [] }

  const stemLower = stem.toLowerCase().trim()
  const isSingleWord = !stem.trim().includes(' ')
  const isCommonWord = COMMON_SINGLE_WORD_STEMS.has(stemLower)

  // Matching: title must start with stem OR contain stem as a phrase
  const matches = allGames.filter((g) => {
    if (g.id === activeGame.id || g.is_hidden) return false
    const titleLower = g.canonical_title.toLowerCase().trim()

    const matchesPrefix =
      titleLower === stemLower ||
      titleLower.startsWith(stemLower + ' ') ||
      titleLower.startsWith(stemLower + ':') ||
      titleLower.startsWith(stemLower + '-') ||
      titleLower.startsWith(stemLower + '–') ||
      titleLower.startsWith(stemLower + '—')

    const matchesContains =
      (isKnown || sameStudioOrPublisher(activeGame, g)) &&
      (titleLower.includes(stemLower) || titleLower.includes(stemLower.replace(/['’]/g, '')))

    if (!matchesPrefix && !matchesContains) return false

    // Single-word filter: if the extracted stem is a single common word,
    // must NOT match unless developer or publisher also matches.
    if ((isSingleWord && !isKnown) || isCommonWord) {
      if (!sameStudioOrPublisher(activeGame, g)) {
        return false
      }
    }

    return true
  })

  return { stem, games: matches }
}

function getRelatedGames(activeGame, allGames = []) {
  if (!activeGame || !allGames.length) return { title: '', eyebrow: '', games: [] }

  // 1. "More by [Developer]"
  const dev = activeGame.developer ? activeGame.developer.trim() : ''
  const isGenericDev =
    !dev ||
    dev.toLowerCase() === 'unknown' ||
    dev.toLowerCase() === 'unknown developer' ||
    dev.toLowerCase() === 'unknown studio'

  if (!isGenericDev) {
    const devMatches = allGames.filter((g) => {
      if (g.id === activeGame.id || g.is_hidden) return false
      return sameStudio(activeGame, g)
    })

    if (devMatches.length > 0) {
      return {
        title: `More by ${dev}`,
        eyebrow: 'FROM THE SAME STUDIO',
        games: devMatches.slice(0, 18),
      }
    }
  }

  // 2. Fallback: Games with similar genre tags
  const activeGenres = String(activeGame.genres || activeGame.genre || '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)

  if (activeGenres.length > 0) {
    const activeGenresLower = activeGenres.map((g) => g.toLowerCase())
    const primaryGenre = activeGenres[0]

    const scored = []
    for (const g of allGames) {
      if (g.id === activeGame.id || g.is_hidden) continue
      const gGenres = String(g.genres || g.genre || '')
        .split(',')
        .map((x) => x.toLowerCase().trim())
        .filter(Boolean)

      let shared = 0
      for (const ag of activeGenresLower) {
        if (gGenres.includes(ag)) shared++
      }
      if (shared > 0) {
        scored.push({ game: g, score: shared })
      }
    }

    scored.sort((a, b) => b.score - a.score || a.game.canonical_title.localeCompare(b.game.canonical_title))
    const genreMatches = scored.slice(0, 18).map((s) => s.game)

    if (genreMatches.length > 0) {
      return {
        title: `Similar in ${primaryGenre}`,
        eyebrow: 'GENRE RECOMMENDATIONS',
        games: genreMatches,
      }
    }
  }

  // 3. Fallback: Series / Franchise titles if studio or genre metadata is missing
  const franchiseData = getFranchiseGames(activeGame, allGames)
  if (franchiseData.games.length > 0) {
    return {
      title: `${franchiseData.stem} Series`,
      eyebrow: 'FRANCHISE RECOMMENDATIONS',
      games: franchiseData.games,
    }
  }

  return { title: 'Related Games', eyebrow: 'RECOMMENDATIONS', games: [] }
}

const LAYOUT_THEMES = [
  { value: 'cinematic', label: '🎬 Cinematic', icon: Sparkles },
  { value: 'kinetic', label: '⚡ Kinetic', icon: Activity },
  { value: 'playful', label: '🪵 Playful', icon: Gamepad2 },
  { value: 'atmospheric', label: '🕵️ Atmospheric', icon: Moon },
  { value: 'competitive', label: '🏆 Competitive', icon: Trophy },
]

function SanctuaryControls({ layoutTheme, setLayoutTheme }) {
  return (
    <div className="sanctuary-controls-group">
      <div className="sanctuary-capsule">
        <CustomDropdown
          value={layoutTheme}
          onChange={setLayoutTheme}
          options={LAYOUT_THEMES}
          icon={Sparkles}
          className="capsule-trigger capsule-layout"
          menuClassName="sanctuary-dropdown-menu"
          title="Select visual layout theme"
        />
      </div>
    </div>
  )
}

function ShelfCardArt({ game }) {
  const [heroFailed, setHeroFailed] = useState(false)

  useEffect(() => {
    setHeroFailed(false)
  }, [game?.id, game?.hero_url])

  const heroUrl = !heroFailed && game?.hero_url && String(game.hero_url).trim() ? normalizeArtworkUrl(game.hero_url) : null
  const coverUrl = game?.cover_url && String(game.cover_url).trim() ? normalizeArtworkUrl(game.cover_url) : null

  if (heroUrl) {
    return (
      <img
        src={heroUrl}
        alt={game?.canonical_title || 'Game'}
        className="shelf-card-img"
        loading="eager"
        decoding="sync"
        onError={() => setHeroFailed(true)}
      />
    )
  }

  if (coverUrl) {
    return (
      <div className="shelf-card-art-fallback-wrap">
        <div
          className="shelf-card-blur-backdrop"
          style={{ backgroundImage: `url("${coverUrl}")` }}
          aria-hidden="true"
        />
        <img
          src={coverUrl}
          alt={game?.canonical_title || 'Game'}
          className="shelf-card-img shelf-card-img-contain"
          loading="eager"
          decoding="sync"
        />
      </div>
    )
  }

  return (
    <div className="shelf-card-fallback">{String(game?.canonical_title || '').slice(0, 1) || '?'}</div>
  )
}

function HomeSpotlightAndShelf({
  games,
  onLaunch,
  onSelect,
  layoutTheme,
  isCollapsed = false,
  onToggleCollapse,
}) {
  const spotlightCandidates = useMemo(() => {
    if (!games || !games.length) return []
    const valid = games.filter((g) => g.is_installed && !g.is_utility && !g.is_dlc && (g.hero_url || g.cover_url))
    if (!valid.length) return []

    return [...valid].sort((a, b) => {
      const aTime = Number(a.play_time_seconds || 0)
      const bTime = Number(b.play_time_seconds || 0)
      if (aTime !== bTime) return bTime - aTime

      const aLast = a.last_played ? new Date(a.last_played).getTime() : 0
      const bLast = b.last_played ? new Date(b.last_played).getTime() : 0
      if (aLast !== bLast) return bLast - aLast

      const aHero = a.hero_url ? 1 : 0
      const bHero = b.hero_url ? 1 : 0
      return bHero - aHero
    }).slice(0, 5)
  }, [games])

  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (isHovered || spotlightCandidates.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % spotlightCandidates.length)
    }, 7500)
    return () => clearInterval(timer)
  }, [isHovered, spotlightCandidates.length])

  const featured = spotlightCandidates.length ? spotlightCandidates[activeIndex % spotlightCandidates.length] : null

  const suggestedGames = useMemo(() => {
    if (!games || !games.length || !featured) return []
    const nonFeatured = games.filter((g) => g.is_installed && !g.is_utility && !g.is_dlc && g.id !== featured.id && (g.cover_url || g.hero_url))
    if (!nonFeatured.length) return []

    return [...nonFeatured].sort((a, b) => {
      const aInst = a.is_installed ? 1 : 0
      const bInst = b.is_installed ? 1 : 0
      if (aInst !== bInst) return bInst - aInst

      const aLast = a.last_played ? new Date(a.last_played).getTime() : 0
      const bLast = b.last_played ? new Date(b.last_played).getTime() : 0
      if (aLast !== bLast) return bLast - aLast

      const aTime = Number(a.play_time_seconds || 0)
      const bTime = Number(b.play_time_seconds || 0)
      return bTime - aTime
    }).slice(0, 6)
  }, [games, featured?.id])

  if (!spotlightCandidates.length || !featured) return null

  const heroArt = featured.hero_url ? normalizeArtworkUrl(featured.hero_url) : (featured.cover_url ? normalizeArtworkUrl(featured.cover_url) : null)
  const genres = String(featured.genres || featured.genre || '').split(',').map((g) => g.trim()).filter(Boolean)
  const primaryGenre = genres[0] || 'Action'
  const platforms = sourcePlatforms(featured.sources)
  const mainPlatform = platforms[0] || normalizePlatform(featured.source) || 'custom'
  const platformName = platformLabel(mainPlatform)

  return (
    <div className={cn("home-hero-container", isCollapsed && "is-collapsed")}>
      {/* 1. Interactive Spotlight Hero Banner or Collapsed Ribbon */}
      {isCollapsed ? (
        <div className="home-spotlight-collapsed-ribbon">
          <div className="collapsed-ribbon-left">
            <span className="pulse-dot" />
            <span className="collapsed-ribbon-tag">SPOTLIGHT</span>
            <strong className="collapsed-ribbon-title">{featured.canonical_title}</strong>
            <span className="collapsed-ribbon-platform">{platformName}</span>
          </div>
          <div className="collapsed-ribbon-actions">
            {featured.is_installed && (
              <button
                type="button"
                className="collapsed-ribbon-play"
                onClick={() => onLaunch(featured)}
              >
                <Play size={12} fill="currentColor" />
                <span>Play</span>
              </button>
            )}
            <button
              type="button"
              className="collapsed-ribbon-toggle"
              onClick={onToggleCollapse}
              title="Expand Spotlight (Ctrl+H)"
            >
              <ChevronDown size={14} />
              <span>Show Hero (Ctrl+H)</span>
            </button>
          </div>
        </div>
      ) : (
        <section
          className="home-spotlight"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className="home-spotlight-bg"
            key={featured.id}
            style={{ backgroundImage: heroArt ? `url("${heroArt}")` : undefined }}
          />
          <div className="home-spotlight-scrim" />
          <div className="home-spotlight-vignette" />

          <div className="home-spotlight-body">
            <div className="home-spotlight-content">
              <div className="home-spotlight-eyebrow">
                <span className="pulse-dot" />
                <span>
                  {layoutTheme === 'kinetic' ? '// SANCTUARY DISPATCH //' :
                   layoutTheme === 'competitive' ? 'RANKED SPOTLIGHT' :
                   layoutTheme === 'atmospheric' ? 'THE SANCTUARY ARCHIVE' :
                   layoutTheme === 'playful' ? 'READY TO PLAY' :
                   'SANCTUARY SPOTLIGHT'}
                </span>
              </div>

              <h2 className="home-spotlight-title" title={featured.canonical_title}>
                {featured.canonical_title}
              </h2>

              <div className="home-spotlight-chips">
                <span className="spotlight-chip spotlight-platform-chip">
                  <SourceIcon source={mainPlatform} size={12} />
                  <span>{platformName}</span>
                </span>

                {featured.is_installed ? (
                  <span className="spotlight-chip spotlight-status-chip is-installed">
                    <Check size={11} />
                    <span>Installed & Ready</span>
                  </span>
                ) : (
                  <span className="spotlight-chip spotlight-status-chip is-ready">
                    <span>In Library</span>
                  </span>
                )}

                {featured.play_time_seconds > 0 && (
                  <span className="spotlight-chip spotlight-time-chip">
                    <Clock size={11} />
                    <span>{formatPlayTime(featured.play_time_seconds)}</span>
                  </span>
                )}

                {primaryGenre && (
                  <span className="spotlight-chip spotlight-genre-chip">
                    <span>{primaryGenre}</span>
                  </span>
                )}
              </div>

              <p className="home-spotlight-desc">
                {featured.description || featured.synopsis || (featured.is_installed ? 'Installed locally on your high-speed drive. Ready for immediate launch.' : 'Available in your library collection. Jump in to view full media, achievements, and stats.')}
              </p>

              <div className="home-spotlight-actions">
                {featured.is_installed ? (
                  <button
                    type="button"
                    className="spotlight-btn-primary"
                    onClick={() => onLaunch(featured)}
                  >
                    <Play size={14} fill="currentColor" />
                    <span>Play Now</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="spotlight-btn-primary"
                    onClick={() => onSelect(featured, 'spotlight')}
                  >
                    <Sparkles size={14} />
                    <span>Inspect Title</span>
                  </button>
                )}

                <button
                  type="button"
                  className="spotlight-btn-secondary"
                  onClick={() => onSelect(featured, 'spotlight')}
                >
                  <Info size={13} />
                  <span>Game Details</span>
                </button>
              </div>
            </div>

            {/* Interactive Switcher Rail */}
            {spotlightCandidates.length > 1 && (
              <div className="home-spotlight-switcher" aria-label="Spotlight carousel">
                {spotlightCandidates.map((game, idx) => {
                  const isActive = idx === (activeIndex % spotlightCandidates.length)
                  const thumbImg = game.cover_url ? normalizeArtworkUrl(game.cover_url) : (game.hero_url ? normalizeArtworkUrl(game.hero_url) : null)
                  return (
                    <button
                      key={game.id}
                      type="button"
                      className={cn("spotlight-switch-pill", isActive && "is-active")}
                      onClick={() => setActiveIndex(idx)}
                      title={game.canonical_title}
                    >
                      <div className="switch-thumb-wrap">
                        {thumbImg ? (
                          <img src={thumbImg} alt="" className="switch-thumb-img" loading="eager" decoding="sync" />
                        ) : (
                          <div className="switch-thumb-fallback">{String(game?.canonical_title || '').slice(0, 1) || '?'}</div>
                        )}
                      </div>
                      <div className="switch-info">
                        <span className="switch-name">{game.canonical_title}</span>
                        <small className="switch-sub">
                          {game.is_installed ? (game.play_time_seconds > 0 ? formatPlayTime(game.play_time_seconds) : 'Installed') : 'In Library'}
                        </small>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. Suggested Games Shelf */}
      {!isCollapsed && suggestedGames.length >= 2 && (
        <section className="home-shelf-section">
          <div className="shelf-header">
            <div className="shelf-title-wrap">
              <div className="shelf-eyebrow">
                <Gamepad2 size={13} />
                <span>SUGGESTED TITLES</span>
              </div>
              <h3 className="shelf-title">Jump Back In</h3>
            </div>
            <span className="shelf-badge">{suggestedGames.length} titles ready</span>
          </div>

          <div className="shelf-track">
            {suggestedGames.map((game) => {
              const pForm = sourcePlatforms(game.sources)[0] || normalizePlatform(game.source)
              return (
                <div
                  key={game.id}
                  className="shelf-card"
                  onClick={() => onSelect(game, 'shelf')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') onSelect(game, 'shelf') }}
                >
                  <div className="shelf-card-art">
                    <ShelfCardArt game={game} />
                    <button
                      type="button"
                      className="shelf-quick-launch"
                      onClick={(e) => {
                        e.stopPropagation()
                        onLaunch(game)
                      }}
                      title={`Launch ${game.canonical_title}`}
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                  </div>
                  <div className="shelf-card-info">
                    <h4 className="shelf-card-name" title={game.canonical_title}>
                      {game.canonical_title}
                    </h4>
                    <div className="shelf-card-meta">
                      <span className="shelf-card-time">
                        {game.play_time_seconds > 0 ? formatPlayTime(game.play_time_seconds) : (game.is_installed ? 'Installed' : 'Ready')}
                      </span>
                      <span className="shelf-card-platform">
                        <SourceIcon source={pForm} size={11} />
                        <span>{platformLabel(pForm)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function VirtualGrid({
  games,
  onLaunch,
  onSelect,
  onHideGame,
  onContextMenu,
  scrollElementRef,
  selectMode = false,
  selectedIds = [],
  onToggleSelect,
  onImageError,
  initialScrollTop = 0,
  restoreGameId = null,
  restoredGameId = null,
}) {
  const gridRef = useRef(null)
  const [columns, setColumns] = useState(() => (typeof window !== 'undefined' ? (window.innerWidth >= 1180 ? 5 : window.innerWidth >= 880 ? 4 : window.innerWidth >= 600 ? 3 : 2) : 4))
  const [scrollMargin, setScrollMargin] = useState(0)

  useEffect(() => {
    const update = () => {
      const width = gridRef.current?.clientWidth || window.innerWidth
      setColumns(width >= 1180 ? 5 : width >= 880 ? 4 : width >= 600 ? 3 : 2)
      const scrollEl = scrollElementRef?.current
      if (gridRef.current && scrollEl) {
        const gridRect = gridRef.current.getBoundingClientRect()
        const scrollRect = scrollEl.getBoundingClientRect()
        const margin = Math.round(gridRect.top - scrollRect.top + scrollEl.scrollTop)
        setScrollMargin(Math.max(0, margin))
      } else {
        setScrollMargin(gridRef.current?.offsetTop || 0)
      }
    }
    update()
    const observer = new ResizeObserver(update)
    if (gridRef.current) observer.observe(gridRef.current)
    if (gridRef.current?.parentElement) observer.observe(gridRef.current.parentElement)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [scrollElementRef])

  const rows = useMemo(() => {
    const next = []
    for (let index = 0; index < games.length; index += columns) {
      next.push(games.slice(index, index + columns))
    }
    return next
  }, [games, columns])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElementRef?.current || gridRef.current,
    estimateSize: () => 360,
    overscan: 4,
    scrollMargin,
    initialOffset: initialScrollTop || 0,
  })

  // Restore scroll position to exact original space or target game placement
  useLayoutEffect(() => {
    const el = scrollElementRef?.current
    if (!el) return
    if (initialScrollTop > 0) {
      el.scrollTop = initialScrollTop
      virtualizer.scrollToOffset(initialScrollTop)
    } else if (restoreGameId) {
      const gameIdx = games.findIndex((g) => g.id === restoreGameId)
      if (gameIdx >= 0) {
        const rowIndex = Math.floor(gameIdx / columns)
        virtualizer.scrollToIndex(rowIndex, { align: 'center' })
      }
    }
  }, [initialScrollTop, restoreGameId, scrollElementRef])

  // Extra safety frame to ensure virtualizer measurements have settled with scroll container
  useEffect(() => {
    if (!initialScrollTop && !restoreGameId) return
    const raf = requestAnimationFrame(() => {
      const el = scrollElementRef?.current
      if (!el) return
      if (initialScrollTop > 0) {
        if (Math.abs(el.scrollTop - initialScrollTop) > 4) {
          el.scrollTop = initialScrollTop
          virtualizer.scrollToOffset(initialScrollTop)
        }
      } else if (restoreGameId) {
        const gameIdx = games.findIndex((g) => g.id === restoreGameId)
        if (gameIdx >= 0) {
          const rowIndex = Math.floor(gameIdx / columns)
          virtualizer.scrollToIndex(rowIndex, { align: 'center' })
        }
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [initialScrollTop, restoreGameId, columns, games, scrollElementRef, virtualizer])

  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef(null)

  useEffect(() => {
    const el = scrollElementRef?.current
    if (!el) return
    const handleScroll = () => {
      setIsScrolling(true)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
      }, 150)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [scrollElementRef])

  return (
    <div ref={gridRef} className={cn("virtual-grid-scroll", isScrolling && "is-scrolling")}>
      <div className="virtual-grid-inner" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            ref={virtualizer.measureElement}
            data-index={row.index}
            className="virtual-row"
            style={{
              transform: `translateY(${row.start - scrollMargin}px)`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {rows[row.index]?.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onLaunch={onLaunch}
                onSelect={onSelect}
                onHideGame={onHideGame}
                onContextMenu={onContextMenu}
                selectMode={selectMode}
                selected={(game.variants || [game]).every((variant) => selectedIds.includes(variant.id))}
                onToggleSelect={onToggleSelect}
                onImageError={onImageError}
                isRestored={game.id === restoredGameId}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MediaLightbox({ items = [], initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        onClose?.()
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setIndex((prev) => (prev + 1) % items.length)
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setIndex((prev) => (prev - 1 + items.length) % items.length)
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [items.length, onClose])

  if (!items.length) return null
  const current = items[index] || items[0]

  return (
    <div
      className="modal-backdrop lightbox-backdrop"
      onClick={onClose}
      style={{
        zIndex: 10000,
        backgroundColor: 'rgba(5, 7, 12, 0.95)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10001,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{current.title}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #71717a)' }}>
            ({index + 1} of {items.length})
          </span>
          <span
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary, #cbd5e1)',
              fontWeight: 700,
            }}
          >
            {current.type}
          </span>
        </div>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Close (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Image View */}
      <div
        style={{
          position: 'relative',
          maxWidth: '92vw',
          maxHeight: '82vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.length > 1 && (
          <button
            type="button"
            className="lightbox-nav-btn lightbox-prev"
            onClick={(e) => {
              e.stopPropagation()
              setIndex((prev) => (prev - 1 + items.length) % items.length)
            }}
            title="Previous (←)"
            style={{
              position: 'absolute',
              left: '-56px',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s, transform 0.15s',
            }}
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <img
          src={current.url}
          alt={current.title}
          style={{
            maxWidth: '90vw',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
          }}
        />

        {items.length > 1 && (
          <button
            type="button"
            className="lightbox-nav-btn lightbox-next"
            onClick={(e) => {
              e.stopPropagation()
              setIndex((prev) => (prev + 1) % items.length)
            }}
            title="Next (→)"
            style={{
              position: 'absolute',
              right: '-56px',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s, transform 0.15s',
            }}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Thumbnails strip at bottom if multiple */}
      {items.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '85vw',
            overflowX: 'auto',
            padding: '8px',
            background: 'rgba(10, 12, 18, 0.8)',
            backdropFilter: 'blur(8px)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, idx) => (
            <button
              key={item.id || idx}
              type="button"
              onClick={() => setIndex(idx)}
              style={{
                width: '64px',
                height: '40px',
                padding: 0,
                border: idx === index ? '2px solid var(--accent, #d6ff4b)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
                background: '#090a0f',
                cursor: 'pointer',
                opacity: idx === index ? 1 : 0.6,
                transform: idx === index ? 'scale(1.05)' : 'none',
                transition: 'opacity 0.15s, transform 0.15s',
              }}
            >
              <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const SANCTUARY_STATUS_OPTIONS = [
  {
    key: 'playing',
    symbol: '●',
    label: 'Playing',
    subtext: 'Active in current rotation',
  },
  {
    key: 'paused',
    symbol: '⏸',
    label: 'On Pause',
    subtext: 'Taking a break / shelved',
  },
  {
    key: 'completed',
    symbol: '✓',
    label: 'Completed',
    subtext: 'Finished campaign / had my fill',
  },
  {
    key: 'unplayed',
    symbol: '○',
    label: 'Unplayed',
    subtext: 'Reset to vault / backlog',
  },
]

function SanctuaryStatusDropdown({ game, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, openUpwards: false })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const currentKey = useMemo(() => {
    const raw = String(game?.status || game?.backlog_status || 'unplayed').toLowerCase()
    if (raw === 'dropped') return 'paused'
    return ['playing', 'paused', 'completed', 'unplayed'].includes(raw) ? raw : 'unplayed'
  }, [game?.status, game?.backlog_status])

  const activeOption = useMemo(
    () => SANCTUARY_STATUS_OPTIONS.find((opt) => opt.key === currentKey) || SANCTUARY_STATUS_OPTIONS[3],
    [currentKey]
  )

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    if (rect.bottom < 30 || rect.top > window.innerHeight) {
      setOpen(false)
      return
    }
    const menuEstimatedHeight = 240
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUpwards = spaceBelow < menuEstimatedHeight && spaceAbove > 140

    const menuWidth = 260
    let left = rect.left
    if (left + menuWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - menuWidth - 16)
    }
    if (left < 16) left = 16

    setMenuPosition({
      top: openUpwards ? rect.top - 8 : rect.bottom + 8,
      left,
      openUpwards,
    })
  }, [])

  const toggle = () => {
    if (!open) {
      updatePosition()
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  useLayoutEffect(() => {
    if (open) {
      updatePosition()
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const handleReposition = () => updatePosition()
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside, true)
    return () => document.removeEventListener('pointerdown', handleClickOutside, true)
  }, [open])

  useEffect(() => {
    if (!open) {
      setFocusedIndex(-1)
    } else {
      const curIdx = SANCTUARY_STATUS_OPTIONS.findIndex((o) => o.key === currentKey)
      setFocusedIndex(curIdx >= 0 ? curIdx : 0)
    }
  }, [open, currentKey])

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        updatePosition()
        setOpen(true)
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      triggerRef.current?.querySelector('button.status-dropdown-pill')?.focus()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      setFocusedIndex((prev) => (prev + 1) % SANCTUARY_STATUS_OPTIONS.length)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      setFocusedIndex((prev) => (prev - 1 + SANCTUARY_STATUS_OPTIONS.length) % SANCTUARY_STATUS_OPTIONS.length)
      return
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      if (focusedIndex >= 0 && focusedIndex < SANCTUARY_STATUS_OPTIONS.length) {
        const selected = SANCTUARY_STATUS_OPTIONS[focusedIndex].key
        setOpen(false)
        if (selected !== currentKey) {
          onStatusChange?.(selected)
        }
        triggerRef.current?.querySelector('button.status-dropdown-pill')?.focus()
      }
    }
  }

  const handleSelect = (key) => {
    setOpen(false)
    if (key !== currentKey) {
      onStatusChange?.(key)
    }
    triggerRef.current?.querySelector('button.status-dropdown-pill')?.focus()
  }

  const menu = open ? (
    <div
      ref={menuRef}
      role="listbox"
      aria-label="Select Game Progress Status"
      className={cn(
        'status-dropdown-menu',
        menuPosition.openUpwards ? 'open-upwards' : 'open-downwards'
      )}
      style={{
        position: 'fixed',
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        zIndex: 999999,
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="status-menu-header">Sanctuary Status</div>
      {SANCTUARY_STATUS_OPTIONS.map((opt, idx) => {
        const isSelected = opt.key === currentKey
        const isFocused = idx === focusedIndex
        return (
          <button
            key={opt.key}
            type="button"
            role="option"
            aria-selected={isSelected}
            tabIndex={-1}
            className={cn(
              'status-menu-item',
              `status-item-${opt.key}`,
              isSelected && 'is-selected',
              isFocused && 'is-focused'
            )}
            onClick={() => handleSelect(opt.key)}
            onMouseEnter={() => setFocusedIndex(idx)}
          >
            <div className="status-item-leading">
              <span className="status-item-glyph">{opt.symbol}</span>
            </div>
            <div className="status-item-text">
              <span className="status-item-label">{opt.label}</span>
              <span className="status-item-subtext">{opt.subtext}</span>
            </div>
            {isSelected ? (
              <Check size={13} className="status-item-check" />
            ) : null}
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <div
      ref={triggerRef}
      className={cn('status-dropdown-anchor', open && 'is-open')}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className={cn('status-dropdown-pill', `status-pill-${currentKey}`, open && 'active')}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Sanctuary status: ${activeOption.label}. Click to toggle.`}
      >
        <span className="status-pill-glyph">{activeOption.symbol}</span>
        <span className="status-pill-label">{activeOption.label}</span>
        <ChevronDown size={11} className={cn('status-pill-chevron', open && 'rotate-180')} />
      </button>
      {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
    </div>
  )
}

function HeroView({
  games,
  activeGame,
  onSelect,
  onLaunch,
  onBack,
  onEdit,
  onHideGame,
  onMoveCategory,
  onToggleFavorite,
  onUpdateBacklog,
  onUpdateStatus,
  onSelectGenre,
  onGameUpdated,
  onContextMenu,
  scrollContainerRef,
  isCinematicTheme = true,
  layoutTheme = 'cinematic',
  onIdleChange,
  onScrollStateChange,
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isScrolled, setIsScrolled] = useState(false)
  const [launchMenuOpen, setLaunchMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [launchMenuPlacement, setLaunchMenuPlacement] = useState('up')
  const [moreMenuPlacement, setMoreMenuPlacement] = useState('up')
  const launchMenuRef = useRef(null)
  const moreMenuRef = useRef(null)

  const updateMenuPlacements = useCallback(() => {
    if (launchMenuOpen && launchMenuRef.current) {
      const rect = launchMenuRef.current.getBoundingClientRect()
      if (rect.bottom < 50 || rect.top > window.innerHeight - 20) {
        setLaunchMenuOpen(false)
        return
      }
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top - 50
      const estHeight = 220
      if (spaceAbove >= estHeight && spaceBelow < estHeight) {
        setLaunchMenuPlacement('up')
      } else if (spaceBelow >= estHeight) {
        setLaunchMenuPlacement('down')
      } else {
        setLaunchMenuPlacement(spaceBelow >= spaceAbove ? 'down' : 'up')
      }
    }

    if (moreMenuOpen && moreMenuRef.current) {
      const rect = moreMenuRef.current.getBoundingClientRect()
      if (rect.bottom < 50 || rect.top > window.innerHeight - 20) {
        setMoreMenuOpen(false)
        return
      }
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top - 50
      const estHeight = 360
      if (spaceAbove >= estHeight && spaceBelow < estHeight) {
        setMoreMenuPlacement('up')
      } else if (spaceBelow >= estHeight) {
        setMoreMenuPlacement('down')
      } else {
        setMoreMenuPlacement(spaceBelow >= spaceAbove ? 'down' : 'up')
      }
    }
  }, [launchMenuOpen, moreMenuOpen])

  useLayoutEffect(() => {
    if (launchMenuOpen || moreMenuOpen) {
      updateMenuPlacements()
    }
  }, [launchMenuOpen, moreMenuOpen, updateMenuPlacements])

  useEffect(() => {
    if (!launchMenuOpen && !moreMenuOpen) return
    const handleScrollOrResize = () => updateMenuPlacements()
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [launchMenuOpen, moreMenuOpen, updateMenuPlacements])

  const [isIdle, setIsIdle] = useState(false)
  const isIdleRef = useRef(false)
  isIdleRef.current = isIdle

  useEffect(() => {
    onIdleChange?.(isIdle)
  }, [isIdle, onIdleChange])

  useEffect(() => {
    let timer = null

    const resetIdle = () => {
      // 0ms instant wake safeguard
      if (isIdleRef.current) {
        setIsIdle(false)
      }
      if (timer) clearTimeout(timer)

      // Only schedule idle fade if scrolled to top (scrollTop <= 10)
      const scrollEl = scrollContainerRef?.current || document.querySelector('.main-scroll')
      if (scrollEl && scrollEl.scrollTop > 10) {
        return
      }

      timer = setTimeout(() => {
        const currentScroll = scrollContainerRef?.current || document.querySelector('.main-scroll')
        if (!currentScroll || currentScroll.scrollTop <= 10) {
          setIsIdle(true)
        }
      }, 4000)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel']
    const handleActivity = () => resetIdle()

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }))

    const scrollEl = scrollContainerRef?.current || document.querySelector('.main-scroll')
    if (scrollEl) {
      scrollEl.addEventListener('scroll', handleActivity, { passive: true })
    }

    resetIdle()

    return () => {
      if (timer) clearTimeout(timer)
      events.forEach((ev) => window.removeEventListener(ev, handleActivity))
      if (scrollEl) {
        scrollEl.removeEventListener('scroll', handleActivity)
      }
    }
  }, [isCinematicTheme, scrollContainerRef, activeGame?.id])

  useEffect(() => {
    const scrollEl = scrollContainerRef?.current || document.querySelector('.main-scroll')
    if (scrollEl) {
      scrollEl.scrollTop = 0
    }
    setIsScrolled(false)
    onScrollStateChange?.(false)
  }, [activeGame?.id, scrollContainerRef, onScrollStateChange])

  useEffect(() => {
    const scrollEl = scrollContainerRef?.current || document.querySelector('.main-scroll')
    if (!scrollEl) return

    const handleScroll = () => {
      const scrolled = scrollEl.scrollTop > 50
      setIsScrolled(scrolled)
      onScrollStateChange?.(scrolled)
    }

    handleScroll()
    scrollEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      scrollEl.removeEventListener('scroll', handleScroll)
    }
  }, [scrollContainerRef, onScrollStateChange, activeGame?.id])

  useEffect(() => {
    if (!launchMenuOpen && !moreMenuOpen) return
    const handleOutside = (e) => {
      if (launchMenuRef.current && !launchMenuRef.current.contains(e.target)) {
        setLaunchMenuOpen(false)
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setLaunchMenuOpen(false)
        setMoreMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handleOutside)
    window.addEventListener('keydown', handleEscape, true)
    return () => {
      window.removeEventListener('pointerdown', handleOutside)
      window.removeEventListener('keydown', handleEscape, true)
    }
  }, [launchMenuOpen, moreMenuOpen])

  useEffect(() => {
    setLaunchMenuOpen(false)
    setMoreMenuOpen(false)
  }, [activeGame?.id])

  if (!activeGame) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={24} />
        <span>No title selected.</span>
        <button type="button" className="outline-button small-button" onClick={onBack} style={{ marginTop: 12 }}>
          <ArrowLeft size={13} /> Back to Library
        </button>
      </div>
    )
  }

  const platforms = sourcePlatforms(activeGame.sources)
  const storeLabels = sourceLabelsForGame(activeGame)
  const genres = String(activeGame.genres || activeGame.genre || '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)

  const franchise = useMemo(() => getFranchiseGames(activeGame, games), [activeGame, games])
  const relatedGamesData = useMemo(() => getRelatedGames(activeGame, games), [activeGame, games])
  const logoArtwork = activeGame.logo_url ? normalizeArtworkUrl(activeGame.logo_url) : null
  const detailHero = activeGame.hero_url ? normalizeArtworkUrl(activeGame.hero_url) : null
  const detailCover = activeGame.cover_url ? normalizeArtworkUrl(activeGame.cover_url) : null
  const detailBackdropUrl = detailHero

  const steamSource = (activeGame.sources || []).find(
    (s) => String(s.platform || '').toLowerCase().includes('steam') && s.platformGameId
  )
  const steamAppId = steamSource?.platformGameId || null

  const epicSource = (activeGame.sources || []).find(
    (s) => String(s.platform || '').toLowerCase().includes('epic') || String(s.sourceName || '').toLowerCase().includes('epic')
  )
  const isEpic = Boolean(epicSource) || storeLabels.some((l) => l.toLowerCase().includes('epic'))
  const epicAppName = epicSource?.platformGameId || null

  const gogSource = (activeGame.sources || []).find(
    (s) => String(s.platform || '').toLowerCase().includes('gog') || String(s.sourceName || '').toLowerCase().includes('gog')
  )
  const isGog = Boolean(gogSource) || storeLabels.some((l) => l.toLowerCase().includes('gog'))

  const isSteam = Boolean(steamSource) || storeLabels.some((l) => l.toLowerCase().includes('steam'))

  const [localCaptures, setLocalCaptures] = useState([])
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [failedImages, setFailedImages] = useState(() => new Set())

  const loadCaptures = useCallback(async () => {
    if (!activeGame?.id) {
      setLocalCaptures([])
      return
    }
    try {
      const rows = await api.games.getCaptures(activeGame.id)
      setLocalCaptures(Array.isArray(rows) ? rows : [])
    } catch (err) {
      console.warn('[HeroView] Failed to load local captures:', err)
      setLocalCaptures([])
    }
  }, [activeGame?.id])

  useEffect(() => {
    loadCaptures()
  }, [loadCaptures])

  const handleAddCaptures = async () => {
    try {
      const added = await api.games.addCaptures(activeGame.id)
      if (added && added.length > 0) {
        await loadCaptures()
      }
    } catch (err) {
      console.warn('[HeroView] Failed to add captures:', err)
    }
  }

  const handleDeleteCapture = async (e, captureId) => {
    e.stopPropagation()
    try {
      await api.games.deleteCapture(captureId)
      await loadCaptures()
    } catch (err) {
      console.warn('[HeroView] Failed to delete capture:', err)
    }
  }

  const screenshotItems = useMemo(() => {
    const items = []
    // 1. User's personal local captures
    if (localCaptures && localCaptures.length > 0) {
      localCaptures.forEach((cap, idx) => {
        const url = normalizeArtworkUrl(cap.file_path)
        if (url && !failedImages.has(url)) {
          items.push({
            id: `user_cap_${cap.id || idx}`,
            rawId: cap.id,
            isUserCapture: true,
            title: cap.caption || `${activeGame.canonical_title} Capture ${idx + 1}`,
            type: 'Local Screenshot',
            url: url,
            createdAt: cap.created_at,
          })
        }
      })
    }
    // 2. Official local hero banner
    if (detailHero && !failedImages.has(detailHero)) {
      items.push({
        id: 'hero',
        title: 'Cinematic Hero Banner',
        type: '16:9 Backdrop',
        url: detailHero,
      })
    }
    // 3. Official local cover art
    if (detailCover && !failedImages.has(detailCover)) {
      items.push({
        id: 'cover',
        title: 'Official Cover Poster',
        type: 'Key Poster',
        url: detailCover,
      })
    }
    // 4. Official local logo
    if (logoArtwork && !failedImages.has(logoArtwork)) {
      items.push({
        id: 'logo',
        title: 'Official Title Logo',
        type: 'Vector / Clear PNG',
        url: logoArtwork,
        isLogo: true,
      })
    }
    return items
  }, [localCaptures, detailHero, detailCover, logoArtwork, failedImages, activeGame.canonical_title])

  // Pre-title: Clean studio & platform branding
  const primaryPlatform = platforms[0] || 'custom'
  const pub = (activeGame.publisher || '').trim()
  const rawDev = (activeGame.developer || '').trim()
  const primaryDev = useMemo(() => {
    if (!rawDev) return ''
    const devList = rawDev.split(',').map((s) => s.trim()).filter(Boolean)
    return devList[0] || rawDev
  }, [rawDev])

  const billingCredit = useMemo(() => {
    const parts = []
    if (primaryDev) parts.push(primaryDev)
    if (pub) {
      if (!primaryDev || pub.toLowerCase() !== primaryDev.toLowerCase()) {
        parts.push(pub)
      }
    }
    const y = gameYear(activeGame)
    if (y) parts.push(y)
    return parts.map((s) => s.toUpperCase()).join('   ·   ')
  }, [primaryDev, pub, activeGame])

  const statusCredit = useMemo(() => {
    const parts = []
    parts.push(activeGame.is_installed ? 'INSTALLED' : 'READY TO INSTALL')
    if (storeLabels.length > 0) {
      storeLabels.forEach((lbl) => parts.push(lbl.toUpperCase()))
    }
    if (activeGame.backlog_status && activeGame.backlog_status !== 'unplayed') {
      parts.push(activeGame.backlog_status.toUpperCase())
    }
    if (activeGame.executable_path) {
      parts.push('DIRECT EXE')
    }
    return parts.join('   ·   ')
  }, [activeGame, storeLabels])

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'screenshots', label: localCaptures.length > 0 ? `Captures (${localCaptures.length})` : 'Screenshots & Captures' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'related', label: 'Related Games' },
  ]

  return (
    <div
      className={cn("cinematic-showcase-container", isIdle && "is-hud-idle")}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu?.(e, activeGame)
      }}
    >
      {/* Tier 1: The IMAX Poster View (100vh stage) */}
      <div className="cinematic-hero-stage">
        {/* Main Hero Header Body */}
        <div className="cinematic-hero-body">
          <div className="cinematic-hero-left">
            {/* Game Title: Official Logo if available, fallback to styled text */}
            <div className="hero-title-area">
              {logoArtwork ? (
                <img
                  src={logoArtwork}
                  alt={activeGame.canonical_title}
                  className="hero-logo-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.style.display = 'block'
                    }
                  }}
                />
              ) : null}
              <h1
                className="cinematic-title"
                style={{ display: logoArtwork ? 'none' : 'block' }}
              >
                {activeGame.canonical_title}
              </h1>
            </div>

            {/* Tactical / Theatrical Metadata Line */}
            {layoutTheme === 'kinetic' ? (
              <p className="hero-billing-block kinetic-meta-line">
                {[primaryDev || 'DEV UNKNOWN', pub !== primaryDev ? pub : null, gameYear(activeGame)].filter(Boolean).join(' · ')}
              </p>
            ) : layoutTheme === 'competitive' ? (
              (() => {
                const parts = [primaryDev, pub !== primaryDev ? pub : null, gameYear(activeGame)].filter(Boolean)
                return parts.length > 0 ? (
                  <p className="hero-billing-block competitive-meta-line">
                    {parts.join(' · ')}
                  </p>
                ) : null
              })()
            ) : layoutTheme === 'playful' ? (
              (() => {
                const parts = [primaryDev, gameYear(activeGame)].filter(Boolean)
                return parts.length > 0 ? (
                  <p className="hero-billing-block playful-meta-line">
                    {parts.join(' · ')}
                  </p>
                ) : null
              })()
            ) : layoutTheme === 'atmospheric' ? null : billingCredit ? (
              <p className="hero-billing-block">
                {billingCredit}
              </p>
            ) : null}

            {/* Interactive Sanctuary Status Sub-header Row: INSTALLED · [STORE] · [STATUS] */}
            <div className="hero-sub-metadata-row">
              <span className="hero-sub-chip">
                {activeGame.is_installed ? 'INSTALLED' : 'READY TO INSTALL'}
              </span>
              {storeLabels.map((lbl) => (
                <span key={lbl} className="hero-sub-chip-group">
                  <span className="hero-sub-sep">·</span>
                  <span className="hero-sub-chip">{lbl.toUpperCase()}</span>
                </span>
              ))}
              <span className="hero-sub-sep">·</span>
              <SanctuaryStatusDropdown
                game={activeGame}
                onStatusChange={(nextStatus) => {
                  if (onUpdateStatus) {
                    onUpdateStatus(activeGame, nextStatus)
                  } else if (onUpdateBacklog) {
                    onUpdateBacklog(activeGame, nextStatus)
                  }
                }}
              />
              {activeGame.executable_path && (
                <span className="hero-sub-chip-group">
                  <span className="hero-sub-sep">·</span>
                  <span className="hero-sub-chip">DIRECT EXE</span>
                </span>
              )}
            </div>

            {/* Launch Trigger */}
            <div className="hero-cta-row">
              <div className="hero-action-anchor" ref={launchMenuRef} style={launchMenuOpen ? { zIndex: 100 } : undefined}>
                <div className="hero-play-split">
                  <button
                    type="button"
                    className="hero-play-button"
                    onClick={() => onLaunch(activeGame)}
                  >
                    {layoutTheme === 'atmospheric' ? (
                      activeGame.is_installed ? (
                        <>
                          <Play size={16} fill="currentColor" />
                          <span>Play</span>
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          <span>Install</span>
                        </>
                      )
                    ) : layoutTheme === 'kinetic' ? (
                      activeGame.is_installed ? (
                        <>
                          <Play size={14} fill="currentColor" />
                          <span>PLAY NOW</span>
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          <span>INSTALL</span>
                        </>
                      )
                    ) : layoutTheme === 'playful' ? (
                      activeGame.is_installed ? (
                        <>
                          <Play size={16} fill="currentColor" />
                          <span>PRESS START</span>
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          <span>INSERT GAME</span>
                        </>
                      )
                    ) : layoutTheme === 'competitive' ? (
                      activeGame.is_installed ? (
                        <>
                          <Play size={15} fill="currentColor" />
                          <span>QUEUE MATCH</span>
                        </>
                      ) : (
                        <>
                          <Download size={15} />
                          <span>PRE-LOAD</span>
                        </>
                      )
                    ) : (
                      activeGame.is_installed ? (
                        <>
                          <Play size={16} fill="currentColor" />
                          <span>Play Now</span>
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          <span>Install via {storeLabels[0] || platformLabel(primaryPlatform)}</span>
                        </>
                      )
                    )}
                  </button>
                  <button
                    type="button"
                    className="hero-split-arrow"
                    title="Launch &amp; Store Options"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setLaunchMenuOpen((prev) => !prev)
                      setMoreMenuOpen(false)
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {launchMenuOpen && (
                  <div className={cn("hero-dropdown-menu", `placement-${launchMenuPlacement}`)}>
                    <div className="hero-menu-header">Launch Options</div>
                    <button
                      type="button"
                      className="hero-menu-item"
                      onClick={() => {
                        setLaunchMenuOpen(false)
                        onLaunch(activeGame)
                      }}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>{activeGame.is_installed ? 'Play Default Launcher' : `Install via ${storeLabels[0] || platformLabel(primaryPlatform)}`}</span>
                    </button>

                    {(activeGame.sources || []).map((source, index) => {
                      const label = source.sourceName || platformLabel(source.platform)
                      return (
                        <button
                          key={`${source.platform}-${source.platformGameId}-${index}`}
                          type="button"
                          className="hero-menu-item"
                          onClick={() => {
                            setLaunchMenuOpen(false)
                            onLaunch({ ...activeGame, sources: [source] })
                          }}
                        >
                          <SourceIcon source={normalizePlatform(source.platform)} size={14} />
                          <span>Launch via {label}</span>
                        </button>
                      )
                    })}

                    {activeGame.executable_path ? (
                      <button
                        type="button"
                        className="hero-menu-item"
                        onClick={() => {
                          setLaunchMenuOpen(false)
                          api.games.launchExecutable(activeGame.executable_path, activeGame.launch_arguments || '', {
                            gameId: activeGame.id,
                            title: activeGame.canonical_title,
                          })
                        }}
                      >
                        <FolderOpen size={14} />
                        <span>Launch Executable (.exe)</span>
                      </button>
                    ) : null}

                    <div className="hero-menu-divider" />

                    <button
                      type="button"
                      className="hero-menu-item"
                      onClick={async () => {
                        setLaunchMenuOpen(false)
                        try {
                          const exe = await api.games.chooseExecutable()
                          if (exe) {
                            await api.database.updateGameMetadata(activeGame.id, { executablePath: exe })
                            onGameUpdated?.({ ...activeGame, executable_path: exe })
                          }
                        } catch (err) {
                          console.warn(err)
                        }
                      }}
                    >
                      <FolderOpen size={14} />
                      <span>{activeGame.executable_path ? 'Change Executable (.exe)...' : 'Set Executable (.exe)...'}</span>
                    </button>

                    <button
                      type="button"
                      className="hero-menu-item"
                      onClick={() => {
                        setLaunchMenuOpen(false)
                        onEdit?.(activeGame)
                      }}
                    >
                      <Settings2 size={14} />
                      <span>Configure Launch Options...</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Luxury Companion Ghost Buttons */}
              <button
                type="button"
                className={cn('hero-ghost-btn', Boolean(activeGame.is_favorite) && 'active')}
                title={activeGame.is_favorite ? 'Favorited · Click to remove' : 'Add to Favorites'}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onToggleFavorite?.(activeGame)
                }}
              >
                <Bookmark size={14} fill={Boolean(activeGame.is_favorite) ? 'currentColor' : 'none'} />
                <span>{activeGame.is_favorite ? 'Favorited' : 'Favorite'}</span>
              </button>

              <button
                type="button"
                className={cn('hero-ghost-btn', activeTab === 'screenshots' && 'active')}
                title={localCaptures.length > 0 ? `View ${localCaptures.length} Local Captures` : 'View In-Game Captures'}
                onClick={() => {
                  setActiveTab('screenshots')
                  const dossierEl = document.querySelector('.cinematic-dossier-section')
                  dossierEl?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <Camera size={14} />
                <span>Captures{localCaptures.length > 0 ? ` (${localCaptures.length})` : ''}</span>
              </button>

              {onEdit ? (
                <button
                  type="button"
                  className="hero-ghost-btn"
                  onClick={() => onEdit(activeGame)}
                  title="Edit metadata & artwork"
                >
                  <Settings2 size={14} />
                  <span>Edit Details</span>
                </button>
              ) : null}

              <button
                type="button"
                className="hero-ghost-btn hero-details-scroll-btn"
                title="Scroll to specifications & story overview"
                onClick={() => {
                  const dossierEl = document.querySelector('.cinematic-dossier-section')
                  dossierEl?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <ChevronDown size={14} />
                <span>Details</span>
              </button>

              {/* More Options Dropdown Ghost Capsule */}
              <div className="hero-action-anchor" ref={moreMenuRef} style={moreMenuOpen ? { zIndex: 100 } : undefined}>
                <button
                  type="button"
                  className={cn('hero-ghost-btn hero-ghost-icon-btn', moreMenuOpen && 'active')}
                  title="More options"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMoreMenuOpen((prev) => !prev)
                    setLaunchMenuOpen(false)
                  }}
                >
                  <MoreHorizontal size={15} />
                </button>

                {moreMenuOpen && (
                  <div className={cn("hero-dropdown-menu hero-more-menu", `placement-${moreMenuPlacement}`)}>
                    <button
                      type="button"
                      className="hero-menu-item"
                      onClick={() => {
                        setMoreMenuOpen(false)
                        onEdit?.(activeGame)
                      }}
                    >
                      <SlidersHorizontal size={14} />
                      <span>Edit Metadata & Artwork</span>
                    </button>

                    <button
                      type="button"
                      className="hero-menu-item"
                      onClick={async () => {
                        setMoreMenuOpen(false)
                        try {
                          const updated = await api.games.chooseAndSaveArtwork(activeGame.id, 'cover')
                          if (updated) onGameUpdated?.(updated)
                        } catch (err) {
                          console.warn(err)
                        }
                      }}
                    >
                      <ImagePlus size={14} />
                      <span>Upload Custom Cover Poster</span>
                    </button>

                    <button
                      type="button"
                      className="hero-menu-item"
                      onClick={async () => {
                        setMoreMenuOpen(false)
                        try {
                          const updated = await api.games.chooseAndSaveArtwork(activeGame.id, 'hero')
                          if (updated) onGameUpdated?.(updated)
                        } catch (err) {
                          console.warn(err)
                        }
                      }}
                    >
                      <UploadCloud size={14} />
                      <span>Upload Custom Hero Banner</span>
                    </button>

                    <div className="hero-menu-divider" />

                    {/* Sanctuary Status Quick Selector */}
                    <div className="hero-menu-header">Sanctuary Status</div>
                    <div className="hero-backlog-chips">
                      {[
                        { key: 'playing', label: 'Playing' },
                        { key: 'paused', label: 'On Pause' },
                        { key: 'completed', label: 'Completed' },
                        { key: 'unplayed', label: 'Unplayed' }
                      ].map((item) => {
                        const cur = String(activeGame.status || (activeGame.backlog_status === 'dropped' ? 'paused' : (activeGame.backlog_status || 'unplayed'))).toLowerCase()
                        return (
                          <button
                            key={item.key}
                            type="button"
                            className={cn('hero-backlog-chip', cur === item.key && 'active')}
                            onClick={() => {
                              setMoreMenuOpen(false)
                              if (onUpdateStatus) onUpdateStatus(activeGame, item.key)
                              else onUpdateBacklog?.(activeGame, item.key)
                            }}
                          >
                            {item.label}
                          </button>
                        )
                      })}
                    </div>

                    <div className="hero-menu-divider" />

                    {/* Move Category */}
                    <div className="hero-menu-header">Move Category</div>
                    <button
                      type="button"
                      className="hero-menu-item"
                      onClick={() => {
                        setMoreMenuOpen(false)
                        onMoveCategory?.(activeGame, 'main')
                      }}
                    >
                      <LayoutGrid size={14} />
                      <span>Move to Main Games</span>
                    </button>
                    <button
                      type="button"
                      className="hero-menu-item"
                      onClick={() => {
                        setMoreMenuOpen(false)
                        onMoveCategory?.(activeGame, 'dlc')
                      }}
                    >
                      <PackageOpen size={14} />
                      <span>Move to DLC & Add-ons</span>
                    </button>
                    <button
                      type="button"
                      className="hero-menu-item"
                      onClick={() => {
                        setMoreMenuOpen(false)
                        onMoveCategory?.(activeGame, 'utility')
                      }}
                    >
                      <Wrench size={14} />
                      <span>Move to Utility Tools</span>
                    </button>

                    <div className="hero-menu-divider" />

                    <button
                      type="button"
                      className="hero-menu-item hero-menu-danger"
                      onClick={() => {
                        setMoreMenuOpen(false)
                        onHideGame?.(activeGame)
                      }}
                    >
                      <EyeOff size={14} />
                      <span>Hide from Library</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tactical / Broadcast Telemetry Rows Situated Cleanly Below Primary CTA */}
            {layoutTheme === 'competitive' && (
              <div className="competitive-telemetry-strip">
                <span className="competitive-telemetry-chip">
                  <span className="telemetry-label">SERVER:</span>
                  <span className="telemetry-val">{(storeLabels[0] || platformLabel(primaryPlatform) || 'ONLINE').toUpperCase()}</span>
                </span>
                <span className="competitive-telemetry-chip">
                  <span className="telemetry-label">CLIENT:</span>
                  <span className="telemetry-val">{activeGame.install_size_gb ? formatGb(activeGame.install_size_gb) : (activeGame.install_size_bytes ? formatBytes(activeGame.install_size_bytes) : 'SYNCED')}</span>
                </span>
                <span className="competitive-telemetry-chip">
                  <span className="telemetry-label">LOGGED:</span>
                  <span className="telemetry-val">{activeGame.play_time_seconds > 0 ? formatPlayTime(activeGame.play_time_seconds).toUpperCase() : '0H'}</span>
                </span>
              </div>
            )}

            {layoutTheme === 'kinetic' && (
              <div className="kinetic-telemetry-strip">
                <span className="kinetic-telemetry-chip">
                  {(storeLabels[0] || platformLabel(primaryPlatform) || 'LOCAL').toUpperCase()}
                </span>
                <span className="kinetic-telemetry-chip">
                  {activeGame.install_size_gb ? formatGb(activeGame.install_size_gb) : (activeGame.install_size_bytes ? formatBytes(activeGame.install_size_bytes) : 'N/A')}
                </span>
                <span className="kinetic-telemetry-chip">
                  {activeGame.play_time_seconds > 0 ? formatPlayTime(activeGame.play_time_seconds).toUpperCase() : 'NO LOG'}
                </span>
              </div>
            )}

            {layoutTheme === 'atmospheric' && (
              <div className="atmospheric-meta-line">
                {[
                  activeGame.developer || 'Unknown',
                  gameYear(activeGame) || activeGame.release_date || null,
                  storeLabels[0] || platformLabel(primaryPlatform) || null,
                ].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          {!detailHero && detailCover && (
            <div className="hero-fallback-poster-card" title={activeGame.canonical_title}>
              <img src={detailCover} alt={activeGame.canonical_title} className="hero-fallback-poster-img" />
            </div>
          )}
        </div>
      </div>

      {/* Tier 2: The Dossier Section (Below the fold) */}
      <div className="cinematic-dossier-section">
        <div className="cinematic-tabs-header">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn('cinematic-tab-nav-btn', activeTab === tab.id && 'active')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {activeTab === tab.id && <span className="cinematic-tab-glow-line" />}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="cinematic-tab-pane">
            <div className="cinematic-dossier-grid">
              {/* Left Column (~40%): Synopsis, Genres, Technical Specs */}
              <div className="cinematic-dossier-col cinematic-dossier-col-left">
                <div className="cinematic-synopsis-box">
                  <h4 className="cinematic-dossier-heading">Story & Synopsis</h4>
                  {activeGame.description ? (
                    <p className="cinematic-synopsis">{activeGame.description}</p>
                  ) : (
                    <p className="cinematic-synopsis" style={{ opacity: 0.65, fontStyle: 'italic' }}>
                      No story synopsis indexed yet. Click &quot;Edit Details&quot; or configure your IGDB API keys to fetch rich narrative summaries.
                    </p>
                  )}

                  {genres.length > 0 && (
                    <div className="cinematic-dossier-genres">
                      {genres.map((genre) => (
                        <button
                          key={genre}
                          type="button"
                          className="hero-tag-pill hero-tag-btn"
                          onClick={() => onSelectGenre?.(genre)}
                          title={`Filter library by ${genre}`}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Technical Specs Sheet */}
                <div className="cinematic-specs-sheet">
                  <h4 className="cinematic-dossier-heading">Specifications & Details</h4>
                  <div className="cinematic-specs-list">
                    <div className="cinematic-spec-row">
                      <span className="cinematic-spec-label">Developer</span>
                      <span className="cinematic-spec-val" title={activeGame.developer || 'Unknown'}>{activeGame.developer || '—'}</span>
                    </div>
                    {activeGame.publisher && (
                      <div className="cinematic-spec-row">
                        <span className="cinematic-spec-label">Publisher</span>
                        <span className="cinematic-spec-val" title={activeGame.publisher}>{activeGame.publisher}</span>
                      </div>
                    )}
                    <div className="cinematic-spec-row">
                      <span className="cinematic-spec-label">Release Year</span>
                      <span className="cinematic-spec-val">{activeGame.release_date || gameYear(activeGame) || '—'}</span>
                    </div>
                    <div className="cinematic-spec-row">
                      <span className="cinematic-spec-label">Platform / Source</span>
                      <span className="cinematic-spec-val">{storeLabels.join(', ') || platformLabel(primaryPlatform)}</span>
                    </div>
                    <div className="cinematic-spec-row">
                      <span className="cinematic-spec-label">Status</span>
                      <span className="cinematic-spec-val cinematic-spec-status">
                        {activeGame.is_installed ? 'Installed' : 'Ready to Install'}
                      </span>
                    </div>
                    {activeGame.backlog_status && (
                      <div className="cinematic-spec-row">
                        <span className="cinematic-spec-label">Backlog</span>
                        <span className="cinematic-spec-val">
                          {activeGame.backlog_status.charAt(0).toUpperCase() + activeGame.backlog_status.slice(1)}
                        </span>
                      </div>
                    )}
                    {activeGame.executable_path && (
                      <div className="cinematic-spec-row">
                        <span className="cinematic-spec-label">Launch Mode</span>
                        <span className="cinematic-spec-val">Direct Executable (.exe)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column (~60%): Media Showcase & Franchise */}
              <div className="cinematic-dossier-col cinematic-dossier-col-right">
                {/* Series & Franchise Carousel - if available */}
                {franchise.games.length > 0 && (
                  <section className="franchise-carousel-section">
                    <div className="franchise-header">
                      <div>
                        <div className="eyebrow">
                          <span>SERIES & FRANCHISE</span>
                          <span className="eyebrow-line" />
                        </div>
                        <h3>{`${franchise.stem} Series`}</h3>
                      </div>
                      <span>{franchise.games.length} related {franchise.games.length === 1 ? 'title' : 'titles'}</span>
                    </div>

                    <div className="franchise-scroll-track cinematic-series-row franchise-rack">
                      {franchise.games.map((game) => (
                        <button
                          key={game.id}
                          type="button"
                          className={cn('franchise-card', game.id === activeGame.id && 'active')}
                          onClick={() => onSelect(game)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onContextMenu?.(e, game)
                          }}
                          title={game.canonical_title}
                        >
                          <div className="franchise-card-art">
                            <PosterImage game={game} className="franchise-card-image" />
                            <div className="franchise-hover-overlay">
                              <strong className="franchise-overlay-title">{game.canonical_title}</strong>
                              <small className="franchise-overlay-meta">{gameYear(game)} · {game.is_installed ? 'Installed' : 'Ready'}</small>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Media Showcase Preview */}
                {screenshotItems.length > 0 && (
                  <section className="cinematic-overview-media-section">
                    <div className="franchise-header">
                      <div>
                        <div className="eyebrow">
                          <span>MEDIA & CAPTURES</span>
                          <span className="eyebrow-line" />
                        </div>
                        <h3>Visual Showcase</h3>
                      </div>
                      <button
                        type="button"
                        className="outline-button small-button"
                        onClick={() => setActiveTab('screenshots')}
                        style={{ fontSize: '11px', height: '28px', padding: '0 10px' }}
                      >
                        <span>View All ({screenshotItems.length})</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    <div className="cinematic-overview-media-grid">
                      {screenshotItems.slice(0, 4).map((item, idx) => (
                        <div
                          key={item.id}
                          className="cinematic-media-card"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setLightboxIndex(idx)}
                          title={`Click to view ${item.title}`}
                        >
                          <div
                            className="cinematic-media-img-wrap"
                            style={item.isLogo ? { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' } : undefined}
                          >
                            <img
                              src={item.url}
                              alt={item.title}
                              className="cinematic-media-img"
                              style={item.isLogo ? { objectFit: 'contain', maxHeight: '70px' } : undefined}
                              onError={() => {
                                setFailedImages((prev) => new Set(prev).add(item.url))
                              }}
                            />
                            <div className="cinematic-media-zoom-overlay">
                              <ZoomIn size={18} className="cinematic-zoom-icon" />
                            </div>
                          </div>
                          <div className="cinematic-media-info" style={{ padding: '8px 10px' }}>
                            <span className="cinematic-media-label" style={{ fontSize: '10.5px' }} title={item.title}>{item.title}</span>
                            <span className="cinematic-media-type" style={{ fontSize: '8.5px', padding: '1.5px 5px' }}>{item.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* If neither franchise nor screenshots exist, show related titles preview if any */}
                {franchise.games.length === 0 && screenshotItems.length === 0 && relatedGamesData.games.length > 0 && (
                  <section className="franchise-carousel-section studio-section cinematic-studio-section">
                    <div className="franchise-header">
                      <div>
                        <div className="eyebrow">
                          <span>{relatedGamesData.eyebrow}</span>
                          <span className="eyebrow-line" />
                        </div>
                        <h3>{relatedGamesData.title}</h3>
                      </div>
                      <span>{relatedGamesData.games.length} titles</span>
                    </div>

                    <div className="franchise-scroll-track studio-scroll-track studio-row cinematic-studio-track related-games-row">
                      {relatedGamesData.games.slice(0, 6).map((game) => (
                        <button
                          key={game.id}
                          type="button"
                          className="franchise-card"
                          onClick={() => onSelect(game)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onContextMenu?.(e, game)
                          }}
                          title={game.canonical_title}
                        >
                          <div className="franchise-card-art">
                            <PosterImage game={game} className="franchise-card-image" />
                            <div className="franchise-hover-overlay">
                              <strong className="franchise-overlay-title">{game.canonical_title}</strong>
                              <small className="franchise-overlay-meta">{gameYear(game)} · {game.is_installed ? 'Installed' : 'Ready'}</small>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'related' && (
          <div className="cinematic-tab-pane" style={{ overflow: 'visible' }}>
            {relatedGamesData.games.length > 0 ? (
              <section className="franchise-carousel-section studio-section cinematic-studio-section">
                <div className="franchise-header">
                  <div>
                    <div className="eyebrow">
                      <span>{relatedGamesData.eyebrow}</span>
                      <span className="eyebrow-line" />
                    </div>
                    <h3>{relatedGamesData.title}</h3>
                  </div>
                  <span>{relatedGamesData.games.length} related {relatedGamesData.games.length === 1 ? 'title' : 'titles'}</span>
                </div>

                <div className="franchise-scroll-track studio-scroll-track studio-row cinematic-studio-track related-games-row">
                  {relatedGamesData.games.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      className={cn('franchise-card', game.id === activeGame.id && 'active')}
                      onClick={() => onSelect(game)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onContextMenu?.(e, game)
                      }}
                      title={game.canonical_title}
                    >
                      <div className="franchise-card-art">
                        <PosterImage game={game} className="franchise-card-image" />
                        <div className="franchise-hover-overlay">
                          <strong className="franchise-overlay-title">{game.canonical_title}</strong>
                          <small className="franchise-overlay-meta">{gameYear(game)} · {game.is_installed ? 'Installed' : 'Ready'}</small>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="empty-tab-state" style={{ padding: '32px 0' }}>
                <div className="empty-tab-content">
                  <div className="empty-tab-icon">
                    <Sparkles size={20} />
                  </div>
                  <div className="empty-tab-info">
                    <h4>No Related Titles Found</h4>
                    <p>No additional games by this studio or with matching genre tags were found in your library.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'screenshots' && (
          <div className="cinematic-tab-pane">
            {/* Gallery Toolbar: Add local captures */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary, #ffffff)' }}>
                  In-Game Captures & Artwork ({screenshotItems.length})
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted, #71717a)' }}>
                  100% local images stored safely on your PC. Click any capture to open full-screen.
                </p>
              </div>

              <button
                type="button"
                className="primary-button small-button"
                onClick={handleAddCaptures}
                title="Add local screenshots from your PC"
              >
                <Camera size={14} />
                <span>Add Local Screenshot…</span>
              </button>
            </div>

            {screenshotItems.length > 0 ? (
              <div className="cinematic-media-grid">
                {screenshotItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="cinematic-media-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setLightboxIndex(idx)}
                    title={`Click to view ${item.title} in full screen`}
                  >
                    <div
                      className="cinematic-media-img-wrap"
                      style={item.isLogo ? { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' } : undefined}
                    >
                      <img
                        src={item.url}
                        alt={item.title}
                        className="cinematic-media-img"
                        style={item.isLogo ? { objectFit: 'contain', maxHeight: '100px' } : undefined}
                        onError={() => {
                          setFailedImages((prev) => new Set(prev).add(item.url))
                        }}
                      />
                      <div className="cinematic-media-zoom-overlay">
                        <ZoomIn size={22} className="cinematic-zoom-icon" />
                      </div>
                    </div>
                    <div className="cinematic-media-info">
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span className="cinematic-media-label" title={item.title}>{item.title}</span>
                        <span className="cinematic-media-type">{item.type}</span>
                      </div>
                      {item.isUserCapture && (
                        <button
                          type="button"
                          className="outline-button small-button"
                          style={{ padding: '2px 6px', height: '22px', fontSize: '10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          onClick={(e) => handleDeleteCapture(e, item.rawId)}
                          title="Remove capture"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-tab-state" style={{ padding: '36px 0' }}>
                <div className="empty-tab-content">
                  <div className="empty-tab-icon">
                    <Camera size={22} />
                  </div>
                  <div className="empty-tab-info">
                    <h4>No Local Captures Yet</h4>
                    <p>
                      Keep your memories and favorite in-game moments here without sending data over the internet.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="primary-button small-button"
                    onClick={handleAddCaptures}
                  >
                    <Camera size={14} />
                    <span>Add Your First Screenshot</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="empty-tab-state">
            <div className="empty-tab-content">
              <div className="empty-tab-icon">
                <Trophy size={22} />
              </div>
              <div className="empty-tab-info">
                <h4>Achievements & Trophies</h4>
                <p>
                  Achievement progression and trophy tracking for {activeGame.canonical_title} will be synced here in upcoming releases.
                </p>
              </div>
              <div className="empty-tab-badges">
                <span className="cinematic-badge cinematic-badge-accent">Coming Soon</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxIndex !== null && (
        <MediaLightbox
          items={screenshotItems}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}


function App() {
  const greeting = greetingForHour(new Date().getHours())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('logpile-sidebar-collapsed') === 'true'
  })
  const librarySidebarPrefRef = useRef(sidebarCollapsed)
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('logpile-sidebar-collapsed', String(next))
      librarySidebarPrefRef.current = next
      return next
    })
  }, [])

  const [isSpotlightCollapsed, setIsSpotlightCollapsed] = useState(() => localStorage.getItem('logpile-spotlight-collapsed') === 'true')
  const handleToggleSpotlight = useCallback(() => {
    setIsSpotlightCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('logpile-spotlight-collapsed', String(next))
      return next
    })
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !e.target.matches('input, textarea')) {
        e.preventDefault()
        toggleSidebar()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h' && !e.target.matches('input, textarea')) {
        e.preventDefault()
        handleToggleSpotlight()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      } else if (e.key === 'F11') {
        e.preventDefault()
        if (api?.window?.toggleFullScreen) {
          api.window.toggleFullScreen()
        } else if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        } else {
          document.documentElement.requestFullscreen().catch(() => {})
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggleSidebar, handleToggleSpotlight])

  const mainScrollRef = useRef(null); const searchInputRef = useRef(null); const libraryScrollRef = useRef(0); const lastClickedGameIdRef = useRef(null); const navOriginRef = useRef({ view: 'installed', source: 'grid', scrollTop: 0 }); const hasSeededRef = useRef(false); const [restoredGameId, setRestoredGameId] = useState(null); const [games, setGames] = useState([]); const [hiddenGames, setHiddenGames] = useState([]); const [stats, setStats] = useState(() => ({ ...EMPTY_LIBRARY_STATS })); const [query, setQuery] = useState(''); const [debouncedQuery, setDebouncedQuery] = useState(''); const [view, setView] = useState('installed'); const [sourceFilters, setSourceFilters] = useState([]); const [genreFilter, setGenreFilter] = useState('all'); const [backlogFilter, setBacklogFilter] = useState('all'); const [sortKey, setSortKey] = useState('title-asc'); const [viewMode, setViewMode] = useState('grid'); const [activeGame, setActiveGame] = useState(null); const isDetailView = viewMode === 'hero' && Boolean(activeGame); const [layoutTheme, setLayoutTheme] = useState(() => localStorage.getItem('logpile-layout-theme') || 'cinematic'); const handleLayoutThemeChange = (newTheme) => { setLayoutTheme(newTheme); localStorage.setItem('logpile-layout-theme', newTheme); }; const mode = 'dark'; const [loading, setLoading] = useState(true); const [notice, setNotice] = useState(''); const [noticeTone, setNoticeTone] = useState('success'); const [scanOpen, setScanOpen] = useState(false); const [editorGame, setEditorGame] = useState(null); const [purgeOpen, setPurgeOpen] = useState(false); const [purgeBusy, setPurgeBusy] = useState(false); const [confirmModal, setConfirmModal] = useState(null); const [contextMenu, setContextMenu] = useState(null); const contextMenuRef = useRef(null); const [selectMode, setSelectMode] = useState(false); const [selectedIds, setSelectedIds] = useState([]); const [bulkEditOpen, setBulkEditOpen] = useState(false); const [bulkBusy, setBulkBusy] = useState(false); const [qualityFilters, setQualityFilters] = useState([]); const [failedImageIds, setFailedImageIds] = useState(new Set()); const [scannerStatus, setScannerStatus] = useState(null); const [isDetailHudIdle, setIsDetailHudIdle] = useState(false); const [isDetailScrolled, setIsDetailScrolled] = useState(false)
  const [libraryHealth, setLibraryHealth] = useState(null)
  const [activityLog, setActivityLog] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupsModalOpen, setBackupsModalOpen] = useState(false)
  const [backupsList, setBackupsList] = useState([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [backupsDirectory, setBackupsDirectory] = useState(null)
  const [restoreBusy, setRestoreBusy] = useState(false)

  const refreshBackupsList = useCallback(async () => {
    setBackupsLoading(true)
    try {
      const res = await api.database.listBackups?.()
      if (res && typeof res === 'object' && !Array.isArray(res)) {
        setBackupsList(Array.isArray(res.backups) ? res.backups : [])
        if (res.directory) setBackupsDirectory(res.directory)
      } else if (Array.isArray(res)) {
        setBackupsList(res)
      }
    } catch (err) {
      console.warn('Failed loading backups list:', err)
    } finally {
      setBackupsLoading(false)
    }
  }, [])

  const handleOpenBackupsFolder = async (targetPath) => {
    try {
      await api.database.openBackupsFolder?.(targetPath || backupsDirectory)
    } catch (err) {
      console.warn('Failed opening backups folder:', err)
      setNoticeTone('error')
      setNotice('Could not open folder in Explorer.')
      window.setTimeout(() => setNotice(''), 3000)
    }
  }

  const handleOpenBackupsManager = () => {
    setBackupsModalOpen(true)
    if (libraryHealth?.backupsDirectory) {
      setBackupsDirectory(libraryHealth.backupsDirectory)
    }
    refreshBackupsList()
  }

  const handleRestoreBackup = (backupOrPath) => {
    const targetPath = typeof backupOrPath === 'string' ? backupOrPath : backupOrPath?.filePath
    const fileName = typeof backupOrPath === 'string' ? targetPath.split(/[/\\]/).pop() : (backupOrPath?.fileName || 'this snapshot')
    const timeLabel = typeof backupOrPath === 'object' && backupOrPath?.mtimeMs ? formatTimestamp(backupOrPath.mtimeMs) : ''

    setConfirmModal({
      eyebrow: 'RESTORE DATABASE',
      title: `Restore from ${fileName}?`,
      message: `This will replace your current library database with ${fileName}${timeLabel ? ` (from ${timeLabel})` : ''}. An automatic safety snapshot of your current database will be saved before restoring. Are you sure you want to proceed?`,
      confirmText: 'Yes, restore database',
      isDanger: true,
      icon: UploadCloud,
      onConfirm: async () => {
        setRestoreBusy(true)
        try {
          const res = await api.database.restoreBackup(targetPath)
          if (res?.cancelled) return
          await loadData({ preserveScroll: true })
          await fetchSystemHealthAndActivity()
          await refreshBackupsList()
          setNoticeTone('success')
          setNotice(`Database restored successfully from ${res?.restoredFrom || fileName}.${res?.restoredArtwork ? ' Associated artwork cache was also restored.' : ''}`)
          window.setTimeout(() => setNotice(''), 5000)
          setBackupsModalOpen(false)
        } catch (err) {
          setNoticeTone('error')
          setNotice(err.message || 'Failed to restore database backup.')
          window.setTimeout(() => setNotice(''), 5000)
        } finally {
          setRestoreBusy(false)
        }
      }
    })
  }

  const handleChooseAndRestoreFile = async () => {
    try {
      const selectedPath = await api.database.chooseBackupFile()
      if (!selectedPath) return
      handleRestoreBackup(selectedPath)
    } catch (err) {
      setNoticeTone('error')
      setNotice(err.message || 'Could not select backup file.')
      window.setTimeout(() => setNotice(''), 4000)
    }
  }

  const fetchSystemHealthAndActivity = useCallback(async () => {
    setActivityLoading(true)
    try {
      const [health, log] = await Promise.all([
        api.database.getLibraryHealth?.(),
        api.database.getActivityLog?.(50),
      ])
      if (health) {
        setLibraryHealth(health)
        if (health.backupsDirectory) setBackupsDirectory(health.backupsDirectory)
      }
      if (Array.isArray(log)) setActivityLog(normalizeActivityLog(log))
    } catch (err) {
      console.warn('Failed loading library health or activity log:', err)
    } finally {
      setActivityLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === 'system') {
      fetchSystemHealthAndActivity()
    }
  }, [view, fetchSystemHealthAndActivity])

  const handleBackupNow = async () => {
    if (backupBusy) return
    setBackupBusy(true)
    try {
      const res = await api.database.backupNow?.()
      await fetchSystemHealthAndActivity()
      await refreshBackupsList()
      setNoticeTone('success')
      const pathSuffix = res?.dbSnapshot ? ` (${res.dbSnapshot})` : ''
      setNotice(`Library snapshot created successfully${pathSuffix}.`)
      window.setTimeout(() => setNotice(''), 4500)
    } catch (err) {
      setNoticeTone('error')
      setNotice(err.message || 'Failed to create database backup.')
      window.setTimeout(() => setNotice(''), 4500)
    } finally {
      setBackupBusy(false)
    }
  }
  const handleImageError = useCallback((gameId) => { setFailedImageIds((current) => { if (current.has(gameId)) return current; const next = new Set(current); next.add(gameId); return next }) }, [])
  const handleArtworkChanged = async (result, game) => {
    if (game?.id) {
      setFailedImageIds((prev) => {
        const next = new Set(prev)
        next.delete(game.id)
        return next
      })
    }
    await loadData({ preserveScroll: true })
    setNoticeTone('success')
    setNotice(`Artwork updated for ${game?.canonical_title || 'the selected title'}.`)
    window.setTimeout(() => setNotice(''), 3000)
  }
  const handleArtworkError = useCallback((error) => {
    setNoticeTone('error')
    setNotice(error?.message || 'Failed to update custom artwork.')
    window.setTimeout(() => setNotice(''), 3500)
  }, [])
  const handleCardContextMenu = (event, game) => { event.preventDefault(); event.stopPropagation(); const left = event.clientX + MENU_WIDTH > window.innerWidth ? Math.max(MENU_PADDING, window.innerWidth - MENU_WIDTH - MENU_PADDING) : event.clientX; const top = event.clientY + MENU_HEIGHT > window.innerHeight ? Math.max(MENU_PADDING, event.clientY - MENU_HEIGHT) : event.clientY; setContextMenu({ game, anchorX: event.clientX, anchorY: event.clientY, x: left, y: top }) }
  const handleSelectGame = useCallback((game, originSource = 'grid') => {
    const currentScroll = mainScrollRef.current?.scrollTop || 0
    if (originSource === 'grid') {
      libraryScrollRef.current = currentScroll
      lastClickedGameIdRef.current = game?.id || null
    } else {
      lastClickedGameIdRef.current = null
    }
    navOriginRef.current = {
      view,
      source: originSource,
      scrollTop: originSource === 'grid' ? currentScroll : 0,
    }
    setActiveGame(game)
    setViewMode('hero')
    librarySidebarPrefRef.current = sidebarCollapsed
    setSidebarCollapsed(true)
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0
    }
  }, [view, sidebarCollapsed])

  const handlePickWinner = (game) => {
    handleSelectGame(game, 'today')
  }
  const handleEditorSaved = async (updated, shouldClose = true) => {
    setNoticeTone('success')
    setNotice(`Updated metadata and artwork for ${updated?.canonical_title || 'the selected title'}.`)
    if (shouldClose) setEditorGame(null)
    else setEditorGame(updated)
    if (updated?.id) {
      setFailedImageIds((prev) => {
        const next = new Set(prev)
        next.delete(updated.id)
        return next
      })
    }
    await loadData({ preserveScroll: true })
    window.setTimeout(() => setNotice(''), 3000)
  }
  const handleExport = async () => { const result = await api.database.exportCsv(); if (result) { setNoticeTone('success'); setNotice(`Exported ${result.rows} library record${result.rows === 1 ? '' : 's'} to CSV.`); window.setTimeout(() => setNotice(''), 4000) } }
  const handleExportSelected = async () => { if (!selectedIds.length) return; setBulkBusy(true); try { const result = await api.database.exportSelectedCsv(selectedIds); if (result) { setNoticeTone('success'); setNotice(`Exported ${result.rows} selected record${result.rows === 1 ? '' : 's'} to CSV.`); window.setTimeout(() => setNotice(''), 4000) } } catch (error) { setNoticeTone('error'); setNotice(error.message || 'Selected records could not be exported.') } finally { setBulkBusy(false) } }
  const handleBackupCache = async () => { const result = await api.scraper.backupCache(); if (result) { setNoticeTone('success'); setNotice(`Artwork backup saved with ${result.files} file${result.files === 1 ? '' : 's'}.`); window.setTimeout(() => setNotice(''), 4000) } }
  const handleRestoreCache = async () => { const result = await api.scraper.restoreCache(); if (result) { await loadData(); setNoticeTone('success'); setNotice(`Artwork cache restored: ${result.files} file${result.files === 1 ? '' : 's'} extracted.`); window.setTimeout(() => setNotice(''), 4000) } }
  const handleCancelSync = async () => { const result = await api.scraper.cancelSync(); if (result?.cancelled) { setNoticeTone('warning'); setNotice('Sync cancellation requested.'); window.setTimeout(() => setNotice(''), 3000) } }
  const handlePurge = async () => { setPurgeBusy(true); try { const result = await api.database.purgeLibrary(); setPurgeOpen(false); setGames([]); setHiddenGames([]); setActiveGame(null); setSourceFilters([]); setStats({ ...EMPTY_LIBRARY_STATS }); setNoticeTone('success'); setNotice(`Library purged: ${result.deletedGames} records removed. Artwork cache preserved.`); await loadData(); window.setTimeout(() => setNotice(''), 5000) } catch (error) { setNoticeTone('error'); setNotice(error.message || 'Library purge failed.') } finally { setPurgeBusy(false) } }
  const loadData = async ({ preserveScroll = false } = {}) => {
    const scrollTop = preserveScroll ? mainScrollRef.current?.scrollTop || 0 : null
    if (!preserveScroll) setLoading(true)
    try {
      if (!hasSeededRef.current) {
        hasSeededRef.current = true
        await api.database.seedCheck().catch(() => {})
      }
      const sort = sortKey === 'size-desc' ? { field: 'install_size_bytes', direction: 'desc' } : sortKey === 'title-desc' ? { field: 'canonical_title', direction: 'desc' } : sortKey === 'last-played' ? { field: 'last_played', direction: 'desc' } : { field: 'canonical_title', direction: 'asc' }
      const libraryFilters = { utility: view === 'utilities', dlc: view === 'dlc', installed: view === 'installed' ? true : view === 'ready' ? false : undefined }

      const nextGamesPromise = api.database.getGames(libraryFilters, sort)
      const statsPromise = api.database.getLibraryStats().catch(() => null)
      const hiddenPromise = api.database.getGames({ utility: false, includeHidden: true, includeDlc: true }, { field: 'canonical_title', direction: 'asc' }).catch(() => [])

      const nextGames = await nextGamesPromise
      const consolidated = consolidateGames(Array.isArray(nextGames) ? nextGames : [])
      setGames(consolidated)
      if (!preserveScroll) setLoading(false)

      statsPromise.then((nextStats) => {
        if (nextStats) setStats(normalizeLibraryStats(nextStats))
      })
      hiddenPromise.then((allLibraryRows) => {
        setHiddenGames((Array.isArray(allLibraryRows) ? allLibraryRows : []).filter((game) => game && game.is_hidden))
      })

      setFailedImageIds((prev) => {
        if (!prev.size) return prev
        const next = new Set(prev)
        for (const g of consolidated) {
          if (g.cover_url && !g.cover_url.includes('fallback') && !g.cover_url.includes('.svg')) {
            next.delete(g.id)
          }
        }
        return next
      })
    } catch (error) { setNotice(error.message || 'Unable to read the local library database.'); if (!preserveScroll) setLoading(false) }
    finally {
      if (preserveScroll && scrollTop !== null) {
        window.requestAnimationFrame(() => {
          if (mainScrollRef.current) mainScrollRef.current.scrollTop = scrollTop
        })
        window.setTimeout(() => {
          if (mainScrollRef.current) mainScrollRef.current.scrollTop = scrollTop
        }, 30)
      }
    }
  }
  useEffect(() => { loadData() }, [view, sortKey, qualityFilters]); useEffect(() => { const close = () => setContextMenu(null); window.addEventListener('pointerdown', close); window.addEventListener('click', close); window.addEventListener('contextmenu', close); window.addEventListener('scroll', close, true); return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('click', close); window.removeEventListener('contextmenu', close); window.removeEventListener('scroll', close, true) } }, []); useLayoutEffect(() => { if (!contextMenu || !contextMenuRef.current) return; const bounds = contextMenuRef.current.getBoundingClientRect(); const menuWidth = bounds.width || MENU_WIDTH; const menuHeight = bounds.height || MENU_HEIGHT; const anchorX = contextMenu.anchorX; const anchorY = contextMenu.anchorY; const left = anchorX + menuWidth > window.innerWidth ? Math.max(MENU_PADDING, window.innerWidth - menuWidth - MENU_PADDING) : anchorX; const top = anchorY + menuHeight > window.innerHeight ? Math.max(MENU_PADDING, anchorY - menuHeight) : anchorY; const clampedLeft = Math.max(MENU_PADDING, Math.min(left, Math.max(MENU_PADDING, window.innerWidth - menuWidth - MENU_PADDING))); const clampedTop = Math.max(MENU_PADDING, Math.min(top, Math.max(MENU_PADDING, window.innerHeight - menuHeight - MENU_PADDING))); if (clampedLeft !== contextMenu.x || clampedTop !== contextMenu.y) setContextMenu((current) => current ? { ...current, x: clampedLeft, y: clampedTop } : current) }, [contextMenu]); useEffect(() => { const offArtwork = api.scraper.onUpdated?.(() => loadData({ preserveScroll: true })); const offLibrary = api.database.onUpdated?.(() => loadData({ preserveScroll: true })); return () => { offArtwork?.(); offLibrary?.() } }, [view, sortKey, qualityFilters]); useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query), 150); return () => clearTimeout(timer) }, [query]); useEffect(() => { localStorage.setItem('logpile-layout-theme', layoutTheme) }, [layoutTheme]);
  useEffect(() => {
    let isMounted = true
    const offProgress = api.scanner.onProgress?.((payload) => {
      if (!isMounted) return
      if (payload?.phase === 'complete') {
        setScannerStatus(null)
      } else if (payload?.message) {
        setScannerStatus(payload.message)
      }
    })
    return () => {
      isMounted = false
      offProgress?.()
    }
  }, [])
  const handleBackToLibrary = useCallback(() => {
    const origin = navOriginRef.current || { view: 'all', source: 'grid', scrollTop: 0 }
    const targetGameId = activeGame?.id || lastClickedGameIdRef.current

    setActiveGame(null)
    setViewMode('grid')
    setIsDetailScrolled(false)
    if (librarySidebarPrefRef.current !== undefined) {
      setSidebarCollapsed(librarySidebarPrefRef.current)
    }

    // Restore the originating view (e.g. today, installed, all, etc.)
    setView(origin.view || 'all')

    if (origin.source === 'today' || origin.view === 'today') {
      setRestoredGameId(null)
      lastClickedGameIdRef.current = null
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = 0
      }
    } else if (origin.source === 'spotlight' || origin.source === 'shelf') {
      // Kept at the top of Page 1 (Spotlight and Shelf) without auto-scrolling down
      setRestoredGameId(null)
      lastClickedGameIdRef.current = null
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = 0
      }
    } else {
      // Grid: restore exact scroll & focused card
      if (targetGameId) {
        setRestoredGameId(targetGameId)
        window.setTimeout(() => setRestoredGameId(null), 2200)
      }
      if (mainScrollRef.current && typeof origin.scrollTop === 'number') {
        mainScrollRef.current.scrollTop = origin.scrollTop
      }
    }
  }, [activeGame])

  useEffect(() => {
    const el = mainScrollRef.current
    if (!el || isDetailView) return
    const handleScroll = () => {
      libraryScrollRef.current = el.scrollTop
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [isDetailView])

  useEffect(() => {
    if (isDetailView && mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0
    }
  }, [isDetailView, activeGame?.id])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R'))) {
        e.preventDefault()
        if (window.api?.window?.reload) {
          window.api.window.reload()
        } else {
          window.location.reload()
        }
      } else if (e.key === 'F11') {
        e.preventDefault()
        if (window.api?.window?.toggleFullScreen) {
          window.api.window.toggleFullScreen()
        } else if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        } else {
          document.documentElement.requestFullscreen().catch(() => {})
        }
      } else if (e.key === 'Escape' && isDetailView) {
        if (document.querySelector('.lightbox-backdrop, .modal-backdrop, .hero-dropdown-menu, .status-dropdown-menu, .custom-dropdown-portal, .art-context-menu')) {
          return
        }
        handleBackToLibrary()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDetailView, handleBackToLibrary])
  const genres = useMemo(() => [...new Set(games.flatMap((game) => String(game.genres || game.genre || '').split(',').map((genre) => genre.trim()).filter(Boolean)))].sort(), [games]); const sourceOptions = useMemo(() => sourceOptionsForGames(games), [games])
  const sortOptions = useMemo(() => [
    { value: 'title-asc', label: 'Title A–Z' },
    { value: 'title-desc', label: 'Title Z–A' },
    { value: 'size-desc', label: 'Largest first' },
    { value: 'drive-asc', label: 'Drive C: → K:' },
    { value: 'last-played', label: 'Last played' },
    { value: 'platform', label: 'Platform' },
  ], [])
  const genreOptions = useMemo(() => [
    { value: 'all', label: 'All genres' },
    ...genres.map((g) => ({ value: g, label: g })),
  ], [genres])
  const backlogOptions = useMemo(() => [
    { value: 'all', label: 'All backlog' },
    { value: 'unplayed', label: 'Unplayed' },
    { value: 'playing', label: 'Playing' },
    { value: 'completed', label: 'Completed' },
    { value: 'dropped', label: 'Dropped' },
  ], [])
  const filteredGames = useMemo(() => { let result = strictTitleSearch(games, debouncedQuery); if (view === 'installed') result = result.filter((game) => game.is_installed && !game.is_utility && !game.is_dlc); if (view === 'ready') result = result.filter((game) => !game.is_installed && !game.is_utility && !game.is_dlc); if (view === 'utilities') result = result.filter((game) => game.is_utility); if (view === 'dlc') result = result.filter((game) => game.is_dlc && !game.is_utility); if (view !== 'utilities' && view !== 'dlc' && view !== 'system') result = result.filter((game) => !game.is_utility && !game.is_dlc); if (qualityFilters.includes('missingArtwork')) { result = result.filter((game) => { const artwork = String(game.cover_url ?? '').trim().toLowerCase(); const hasNoArt = !artwork || artwork === 'null' || artwork === 'undefined'; return hasNoArt || failedImageIds.has(game.id) }) } if (qualityFilters.includes('missingIds')) result = result.filter((game) => { const id = String(game.steamgriddb_id ?? '').trim().toLowerCase(); return !id || id === 'null' || id === 'undefined' }); if (sourceFilters.length) result = result.filter((game) => sourceFilters.some((source) => sourceLabelsForGame(game).some((label) => sourceKey(label) === source))); if (genreFilter !== 'all') result = result.filter((game) => String(game.genres || game.genre || '').split(',').map((genre) => genre.trim()).includes(genreFilter)); if (backlogFilter !== 'all') result = result.filter((game) => game.backlog_status === backlogFilter); return result.sort((a, b) => { if (debouncedQuery.trim()) { const rank = titleSearchRank(a.canonical_title, debouncedQuery) - titleSearchRank(b.canonical_title, debouncedQuery); if (rank) return rank } if (sortKey === 'title-desc') return b.canonical_title.localeCompare(a.canonical_title); if (sortKey === 'size-desc') return (b.install_size_bytes || 0) - (a.install_size_bytes || 0); if (sortKey === 'drive-asc') return String(a.drive_letter || 'Z:').localeCompare(String(b.drive_letter || 'Z:')); if (sortKey === 'last-played') return String(b.last_played || '').localeCompare(String(a.last_played || '')); if (sortKey === 'platform') return platformLabel(sourcePlatforms(a.sources)[0] || '').localeCompare(platformLabel(sourcePlatforms(b.sources)[0] || '')); return a.canonical_title.localeCompare(b.canonical_title) }) }, [games, debouncedQuery, view, sourceFilters, genreFilter, backlogFilter, sortKey, qualityFilters, failedImageIds])
  const filteredRecordIds = useMemo(() => [...new Set(filteredGames.flatMap((game) => (game.variants || [game]).map((variant) => variant.id).filter(Boolean)))], [filteredGames])
  const isHomeView = !query && !debouncedQuery && !selectMode && genreFilter === 'all' && backlogFilter === 'all' && qualityFilters.length === 0 && sourceFilters.length === 0 && (view === 'all' || view === 'installed')
  const collectionHeading = useMemo(() => {
    if (sourceFilters.length === 1) {
      const found = sourceOptions.find((s) => s.key === sourceFilters[0])
      return found ? found.label : 'Filtered Collection'
    }
    if (sourceFilters.length > 1) {
      return 'Filtered Collection'
    }
    if (view === 'installed') return 'Installed Games'
    if (view === 'ready') return 'Ready to Install'
    if (view === 'utilities') return 'Utility Tools'
    if (view === 'dlc') return 'DLC & Add-ons'
    return 'Full Collection'
  }, [sourceFilters, sourceOptions, view])
  const setSidebarView = (nextView) => {
    if (nextView !== view) {
      libraryScrollRef.current = 0
      lastClickedGameIdRef.current = null
    }
    setView(nextView)
    setActiveGame(null)
    setSelectedIds([])
    setSelectMode(false)
    setViewMode('grid')
  }
  const selectAllFiltered = () => setSelectedIds(filteredRecordIds)
  const deselectAll = () => setSelectedIds([])
  const idsForGame = (game) => [...new Set((game.variants || [game]).map((variant) => variant.id).filter(Boolean))]
  const toggleGameSelection = (game) => { const ids = idsForGame(game); setSelectedIds((current) => ids.every((id) => current.includes(id)) ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]) }
  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return
    setConfirmModal({
      title: 'Delete selected library records?',
      eyebrow: 'DANGER ZONE',
      message: `Delete ${selectedIds.length} selected library record${selectedIds.length === 1 ? '' : 's'} from your database? This will not delete any installed files.`,
      confirmText: `Delete ${selectedIds.length} record${selectedIds.length === 1 ? '' : 's'}`,
      isDanger: true,
      icon: Trash2,
      onConfirm: async () => {
        setBulkBusy(true)
        try {
          const result = await api.database.deleteGames(selectedIds)
          setSelectedIds([])
          setSelectMode(false)
          setActiveGame(null)
          await loadData({ preserveScroll: true })
          setNoticeTone('success')
          setNotice(`${result?.deletedGames || selectedIds.length} selected record${(result?.deletedGames || selectedIds.length) === 1 ? '' : 's'} deleted.`)
        } catch (error) {
          setNoticeTone('error')
          setNotice(error.message || 'Selected records could not be deleted.')
        } finally {
          setBulkBusy(false)
          window.setTimeout(() => setNotice(''), 3500)
        }
      }
    })
  }
  const handleBulkApply = async (fields) => { if (!selectedIds.length) return; setBulkBusy(true); try { const result = await api.database.bulkUpdateGames(selectedIds, fields); setBulkEditOpen(false); setSelectedIds([]); setSelectMode(false); await loadData(); setNoticeTone('success'); setNotice(`${result?.updatedGames || selectedIds.length} selected record${(result?.updatedGames || selectedIds.length) === 1 ? '' : 's'} updated.`) } catch (error) { throw error } finally { setBulkBusy(false); window.setTimeout(() => setNotice(''), 3500) } }
  const handleBulkMove = async (category) => {
    if (!selectedIds.length) return
    const label = category === 'dlc' ? 'DLC & add-ons' : category === 'utility' ? 'Utility tools' : 'Main games'
    const Icon = category === 'dlc' ? PackageOpen : category === 'utility' ? Wrench : LayoutGrid
    setConfirmModal({
      title: `Move to ${label}?`,
      eyebrow: 'BULK CATEGORY MOVE',
      message: `Move ${selectedIds.length} selected item${selectedIds.length === 1 ? '' : 's'} to ${label}?`,
      confirmText: `Move to ${label}`,
      isDanger: false,
      icon: Icon,
      onConfirm: async () => {
        setBulkBusy(true)
        try {
          const result = await api.database.bulkMoveGameCategory(selectedIds, category)
          setSelectedIds([])
          setSelectMode(false)
          setActiveGame(null)
          await loadData({ preserveScroll: true })
          setNoticeTone('success')
          setNotice(`${result?.updatedGames || selectedIds.length} selected record${(result?.updatedGames || selectedIds.length) === 1 ? '' : 's'} moved to ${label}.`)
        } catch (error) {
          setNoticeTone('error')
          setNotice(error.message || 'Selected records could not be moved.')
        } finally {
          setBulkBusy(false)
          window.setTimeout(() => setNotice(''), 3500)
        }
      }
    })
  }
  const handleBulkHide = async () => {
    if (!selectedIds.length) return
    setConfirmModal({
      title: 'Hide from library?',
      eyebrow: 'LIBRARY VISIBILITY',
      message: `Hide ${selectedIds.length} selected item${selectedIds.length === 1 ? '' : 's'} from the active library? You can restore them anytime from System Settings.`,
      confirmText: `Hide ${selectedIds.length} item${selectedIds.length === 1 ? '' : 's'}`,
      isDanger: false,
      icon: EyeOff,
      onConfirm: async () => {
        setBulkBusy(true)
        try {
          const result = await api.database.bulkSetGameHidden(selectedIds, true)
          setSelectedIds([])
          setSelectMode(false)
          setActiveGame(null)
          await loadData({ preserveScroll: true })
          setNoticeTone('success')
          setNotice(`${result?.updatedGames || selectedIds.length} selected record${(result?.updatedGames || selectedIds.length) === 1 ? '' : 's'} hidden from the library.`)
        } catch (error) {
          setNoticeTone('error')
          setNotice(error.message || 'Selected records could not be hidden.')
        } finally {
          setBulkBusy(false)
          window.setTimeout(() => setNotice(''), 3500)
        }
      }
    })
  }
  const handleRefetchSelected = async () => {
    if (!selectedIds.length) return
    setBulkBusy(true)
    try {
      const result = await api.games.refetchSelectedArtwork(selectedIds)
      setFailedImageIds((prev) => {
        const next = new Set(prev)
        for (const id of selectedIds) next.delete(id)
        return next
      })
      await loadData({ preserveScroll: true })
      setNoticeTone(result?.failed ? 'warning' : 'success')
      setNotice(`Artwork re-fetch finished: ${result?.updated || 0} updated, ${result?.skipped || 0} skipped, ${result?.failed || 0} failed.`)
    } catch (error) {
      setNoticeTone('error')
      setNotice(error.message || 'Selected artwork could not be re-fetched.')
    } finally {
      setBulkBusy(false)
      window.setTimeout(() => setNotice(''), 4500)
    }
  }
  const updateHiddenState = async (game, hidden) => {
    if (hidden) {
      setConfirmModal({
        title: 'Hide from library?',
        eyebrow: 'LIBRARY VISIBILITY',
        message: `Hide "${game.canonical_title}" from your library? It will be moved to Hidden Items in System Settings.`,
        confirmText: 'Hide game',
        isDanger: false,
        icon: EyeOff,
        onConfirm: async () => {
          try {
            await api.database.setGameHidden(game.id, true)
            setNoticeTone('success')
            setNotice(`${game.canonical_title} hidden from your library.`)
            await loadData({ preserveScroll: true })
          } catch (error) {
            setNoticeTone('error')
            setNotice(error.message || 'Unable to update the library entry.')
          }
          window.setTimeout(() => setNotice(''), 3000)
        }
      })
      return
    }
    try {
      await api.database.setGameHidden(game.id, false)
      setNoticeTone('success')
      setNotice(`${game.canonical_title} restored to your library.`)
      await loadData({ preserveScroll: true })
    } catch (error) {
      setNoticeTone('error')
      setNotice(error.message || 'Unable to update the library entry.')
    }
    window.setTimeout(() => setNotice(''), 3000)
  }
  const moveCategory = async (game, category) => {
    const labels = { main: 'Main Games', dlc: 'DLC & Add-ons', utility: 'Utility Tools' }
    const targetLabel = labels[category] || 'the selected category'
    const Icon = category === 'dlc' ? PackageOpen : category === 'utility' ? Wrench : LayoutGrid
    setConfirmModal({
      title: `Move to ${targetLabel}?`,
      eyebrow: 'CATEGORY CHANGE',
      message: `Move "${game.canonical_title}" to ${targetLabel}? It will appear under the ${targetLabel} section.`,
      confirmText: `Move to ${targetLabel}`,
      isDanger: false,
      icon: Icon,
      onConfirm: async () => {
        try {
          await api.setGameCategory(game.id, category === 'main' ? 'game' : category)
          setNoticeTone('success')
          setNotice(`${game.canonical_title} moved to ${targetLabel}.`)
          setActiveGame(null)
          await loadData({ preserveScroll: true })
        } catch (error) {
          setNoticeTone('error')
          setNotice(error.message || 'Unable to move the library entry.')
        }
        window.setTimeout(() => setNotice(''), 3000)
      }
    })
  }
  const displayTotalGames = Math.max(0, stats.visibleGames ?? (stats.totalGames - stats.utilityTools - (stats.dlcGames || 0) - (stats.hiddenGames || 0) - (stats.hiddenDlc || 0))); const displayInstalledGames = Math.max(0, stats.visibleInstalledGames ?? (stats.installedGames - (stats.installedUtilities || 0) - (stats.installedDlc || 0) - (stats.hiddenInstalledGames || 0) - (stats.hiddenInstalledDlc || 0))); const displayDlcGames = Math.max(0, stats.dlcGames || 0); const readyToInstallCount = Math.max(0, Number(stats.readyToInstallCount || 0)); const installedPercent = displayTotalGames ? Math.round((displayInstalledGames / displayTotalGames) * 100) : 0; const vars = themeVars(layoutTheme);

  const workspaceItems = useMemo(() => {
    const remaining = [
      { key: 'ready', icon: Download, label: 'Ready to install', count: readyToInstallCount },
      { key: 'dlc', icon: PackageOpen, label: 'DLC & add-ons', count: displayDlcGames },
      { key: 'utilities', icon: Wrench, label: 'Utility tools', count: stats.utilityTools || 0 },
    ]
    remaining.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
    return remaining
  }, [readyToInstallCount, displayDlcGames, stats.utilityTools])

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', 'dark')
    document.documentElement.setAttribute('data-layout', layoutTheme)
  }, [layoutTheme])
  const toggleSource = (source) => setSourceFilters((current) => current.includes(source) ? current.filter((item) => item !== source) : [...current, source])
  const chooseLaunchVariant = (game) => {
    const installed = (game.variants || [game]).filter((variant) => variant.is_installed)
    if (installed.length <= 1) return installed[0] || game
    const hasExecutable = installed.find((variant) => variant.executable_path)
    if (hasExecutable) return hasExecutable
    const choices = installed.map((variant, index) => `${index + 1}. ${sourceLabelsForGame(variant).join(', ') || 'Store launcher'}`).join('\n')
    const selected = Number.parseInt(window.prompt(`This title is installed from multiple stores. Choose a launcher:\n${choices}`, '1') || '1', 10)
    return installed[selected >= 1 && selected <= installed.length ? selected - 1 : 0]
  }
  const handleLaunch = async (game) => {
    const variant = game.is_installed ? chooseLaunchVariant(game) : game
    const sources = variant.sources || []
    const source = sources.find((candidate) => sourceLauncherFamily({ ...candidate, sourceName: candidate.sourceName || candidate.source_name || variant.store_name || variant.storeName })) || sources[0]
    const launchSource = source ? { ...source, sourceName: source.sourceName || source.source_name || variant.store_name || variant.storeName } : null
    const family = sourceLauncherFamily(launchSource)
    const storedUri = variant.is_installed ? source?.launchUri : source?.installUri
    const generatedUri = variant.is_installed ? launcherUriForSource(launchSource, variant) : null
    const canUseStoredUri = family === 'steam' ? validSteamAppId(launchSource, variant) : (!(family === 'ea' || family === 'ubisoft') || sourceHasRealId(launchSource, variant))
    const uri = generatedUri || (canUseStoredUri && isLauncherUri(storedUri) ? storedUri : (launcherUriForSource(launchSource, variant) || fallbackLauncherUri(variant)))
    const notify = (message, tone = 'success') => { setNoticeTone(tone); setNotice(message); window.setTimeout(() => setNotice(''), 3000) }
    const storefront = sourceLabelsForGame(variant)[0] || (family === 'ea' ? 'EA Games' : family === 'ubisoft' ? 'Ubisoft' : family === 'amazon' ? 'Amazon Games' : 'storefront')
    const launchMeta = {
      gameId: variant.id,
      title: variant.canonical_title || game.canonical_title,
      storefront,
      id: launchSource?.platformGameId,
      idSource: launchSource?.idSource,
    }
    try {
      if (variant.is_installed && variant.executable_path) {
        try { await api.games.launchExecutable(variant.executable_path, variant.launch_arguments || game.launch_arguments || '', launchMeta); notify(`Launching ${game.canonical_title}...`); return } catch (executableError) { if (!uri) throw executableError }
      }
      if (uri) { await api.games.openUri(uri, launchMeta); notify(variant.is_installed ? `Launching ${game.canonical_title}...` : `Opening install channel for ${game.canonical_title}...`); return }
      if (family === 'steam' && !validSteamAppId(launchSource, variant)) { await api.games.logLaunchAttempt?.({ storefront: 'Steam', id: launchSource?.platformGameId, idSource: launchSource?.idSource || 'unknown', uri: '', result: 'invalid-steam-appid' }); notify('Invalid Steam configuration / missing AppID', 'error'); return }
      if ((family === 'ea' || family === 'ubisoft') && !sourceHasRealId(launchSource, variant)) { await api.games.logLaunchAttempt?.({ storefront, id: launchSource?.platformGameId, idSource: launchSource?.idSource || 'title-fallback', uri: '', result: 'missing-storefront-id' }); notify(`No valid ${storefront} ID for this game — add manually or re-scan.`, 'warning'); return }
      await api.games.logLaunchAttempt?.({ storefront, id: launchSource?.platformGameId, idSource: launchSource?.idSource, uri: '', result: 'no-launcher-fallback' })
      throw new Error('No executable or launcher URI is mapped for this title.')
    } catch (error) {
      if (error?.message === 'Unsupported launcher protocol.') notify(`Unsupported launcher protocol for ${storefront}.`, 'error')
      else if (error?.message === 'OS rejected launcher URI.') notify('The operating system rejected the launcher request.', 'error')
      else if (error?.message === 'No executable or launcher URI is mapped for this title.') notify(`No supported launcher is mapped for ${storefront}.`, 'error')
    }
  }
  const detailHero = activeGame?.hero_url ? normalizeArtworkUrl(activeGame.hero_url) : null
  const detailCover = activeGame?.cover_url ? normalizeArtworkUrl(activeGame.cover_url) : null
  const isAmbientCoverFallback = !detailHero && Boolean(detailCover)
  const detailBackdropUrl = detailHero || detailCover

  return <div className={cn("app-shell", isDetailView && "is-detail-view", isDetailView && isDetailHudIdle && "detail-hud-idle", isDetailView && isDetailScrolled && "detail-is-scrolled", sidebarCollapsed && "sidebar-is-collapsed", `layout-${layoutTheme}`)} data-layout-theme={layoutTheme} data-layout={layoutTheme} data-mode="dark" style={vars}>
    {isDetailView && detailBackdropUrl && (
      <div className={cn("global-detail-backdrop-wrap", isAmbientCoverFallback && "is-ambient-cover-wrap")}>
        <div
          className={cn("global-detail-backdrop-img", isAmbientCoverFallback && "is-ambient-cover-blur")}
          style={{ backgroundImage: `url("${detailBackdropUrl}")` }}
        />
        <div className="global-detail-backdrop-gradient" />
      </div>
    )}
    <header className="titlebar">
      <div className="drag-region">
        {isDetailView ? (
          <div className="titlebar-detail-nav">
            <button
              type="button"
              className="titlebar-back-btn"
              onClick={handleBackToLibrary}
              title="Return to library (Esc)"
            >
              <ArrowLeft size={14} />
              <span>{navOriginRef.current?.view === 'today' ? "Back to Today's Pick" : (navOriginRef.current?.view === 'installed' ? 'Back to Installed' : 'Back to Library')}</span>
            </button>
            <div
              className="titlebar-brand-capsule titlebar-brand-interactive"
              onClick={handleBackToLibrary}
              title="Logpile — Return to library"
            >
              <img
                src={logoDark}
                alt="Logpile"
                className="w-5 h-5 object-contain flex-shrink-0 shrink-0 aspect-square select-none pointer-events-none app-logo titlebar-logo"
                style={{ width: '18px', height: '18px', minWidth: '18px', minHeight: '18px', maxWidth: '18px', maxHeight: '18px', objectFit: 'contain', flexShrink: 0 }}
              />
              <span className="titlebar-brand-label">Logpile</span>
            </div>
          </div>
        ) : (
          <div className="titlebar-brand-capsule">
            <img
              src={logoDark}
              alt="Logpile"
              className="w-5 h-5 object-contain flex-shrink-0 shrink-0 aspect-square select-none pointer-events-none app-logo titlebar-logo"
              style={{ width: '18px', height: '18px', minWidth: '18px', minHeight: '18px', maxWidth: '18px', maxHeight: '18px', objectFit: 'contain', flexShrink: 0 }}
            />
            <span className="titlebar-brand-label">Logpile</span>
          </div>
        )}
      </div>
      <div className="titlebar-center">
        {!isDetailView && (
          <div className="titlebar-search">
            <Search size={13} />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                if (view === 'system' || view === 'today' || view === 'about') setSidebarView('all')
              }}
              placeholder="Search titles, studios... (Ctrl+K)"
              autoComplete="off"
              spellCheck="false"
            />
            {query ? (
              <button
                type="button"
                className="titlebar-search-clear"
                aria-label="Clear search"
                title="Clear search"
                onClick={(e) => {
                  e.preventDefault()
                  setQuery('')
                  searchInputRef.current?.focus()
                }}
              >
                <X size={11} />
              </button>
            ) : (
              <kbd className="titlebar-search-kbd">Ctrl K</kbd>
            )}
          </div>
        )}
      </div>
      <div className="titlebar-tools">
        <SanctuaryControls layoutTheme={layoutTheme} setLayoutTheme={handleLayoutThemeChange} />
        <WindowControls />
      </div>
    </header>
    <div className="app-body">
      {!isDetailView && (
        <aside className={cn("sidebar", sidebarCollapsed && "is-collapsed")}>
        <div className="sidebar-top">
          {!sidebarCollapsed && <span className="sidebar-top-title">LIBRARY</span>}
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>
        <nav className="nav-stack">
          {(query || sourceFilters.length || genreFilter !== 'all' || backlogFilter !== 'all' || qualityFilters.length) ? (
            <div className="sidebar-filter-summary">
              <span>{filteredGames.length} of {games.length} titles</span>
              <button type="button" className="sidebar-reset-btn" onClick={() => { setQuery(''); setSourceFilters([]); setGenreFilter('all'); setBacklogFilter('all'); setQualityFilters([]) }}>Reset all</button>
            </div>
          ) : null}

          <div className="nav-group nav-group-workspace">
            <p className="nav-label">Workspace</p>
            <button
              className={cn('nav-item', view === 'installed' && 'active')}
              onClick={() => setSidebarView('installed')}
              title="Installed"
            >
              <PackageCheck size={15} />
              <span>Installed</span>
              <em>{displayInstalledGames}</em>
            </button>
            <button
              className={cn('nav-item', view === 'all' && 'active')}
              onClick={() => setSidebarView('all')}
              title="All games"
            >
              <LayoutGrid size={15} />
              <span>All games</span>
              <em>{displayTotalGames}</em>
            </button>
            {workspaceItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  className={cn('nav-item', view === item.key && 'active')}
                  onClick={() => setSidebarView(item.key)}
                  title={item.label}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                  <em>{item.count}</em>
                </button>
              )
            })}
            <button
              className={cn('nav-item', view === 'today' && 'active')}
              onClick={() => setSidebarView('today')}
              title="Today’s Pick"
            >
              <Dices size={15} />
              <span>Today’s Pick</span>
            </button>
          </div>

          <div className="nav-divider" />

          <div className="nav-group nav-group-sources">
            <p className="nav-label nav-label-spaced">Sources</p>
            <button
              className={cn('nav-item nav-item-source nav-item-all-sources', !sourceFilters.length && 'active')}
              onClick={() => { setSourceFilters([]); setViewMode('grid'); if (view === 'system' || view === 'today') setSidebarView('all') }}
              title="All sources"
            >
              <SourceIcon source="all" size={14} className="sidebar-source-icon" />
              <span>All sources</span>
              <em>{games.length}</em>
            </button>
            {sourceOptions.map((source) => (
              <button
                key={source.key}
                className={cn('nav-item nav-item-source', sourceFilters.includes(source.key) && 'active')}
                onClick={() => { toggleSource(source.key); setViewMode('grid'); if (view === 'system' || view === 'today') setSidebarView('all') }}
                title={source.label}
              >
                <SourceIcon source={source.key} size={14} className="sidebar-source-icon" />
                <span>{source.label}</span>
                <em>{source.count}</em>
              </button>
            ))}
          </div>
        </nav>

        <div className="sidebar-bottom-dock">
          <button
            type="button"
            className={cn('sidebar-dock-btn', view === 'system' && 'active')}
            onClick={() => setSidebarView('system')}
            title="Settings"
          >
            <Settings2 size={14} />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
          <button
            type="button"
            className={cn('sidebar-dock-btn', view === 'about' && 'active')}
            onClick={() => setSidebarView('about')}
            title="About Logpile"
          >
            <CircleHelp size={14} />
            {!sidebarCollapsed && <span>About</span>}
          </button>
        </div>
      </aside>
      )}
      <main className="main-content"><div ref={mainScrollRef} className={cn('main-scroll', isDetailView && 'main-scroll-fullbleed')}><ErrorBoundary key={`${view}-${viewMode}-${activeGame?.id || 'none'}`} fallback={({ error, reset }) => <TabErrorFallback error={error} reset={reset} onBack={handleBackToLibrary} />}>{isDetailView ? <HeroView games={filteredGames} activeGame={activeGame || filteredGames[0]} onSelect={setActiveGame} onLaunch={handleLaunch} onBack={handleBackToLibrary} onEdit={setEditorGame} onHideGame={(game) => updateHiddenState(game, true)} onMoveCategory={moveCategory} onContextMenu={handleCardContextMenu} isCinematicTheme={layoutTheme === 'cinematic'} layoutTheme={layoutTheme} scrollContainerRef={mainScrollRef} onIdleChange={setIsDetailHudIdle} onScrollStateChange={setIsDetailScrolled} onToggleFavorite={async (game) => {
  const nextFav = !game.is_favorite
  try {
    await api.database.updateGameMetadata(game.id, { is_favorite: nextFav })
    const updated = { ...game, is_favorite: nextFav }
    setActiveGame(updated)
    setNoticeTone('success')
    setNotice(nextFav ? `Added "${game.canonical_title}" to favorites.` : `Removed "${game.canonical_title}" from favorites.`)
    window.setTimeout(() => setNotice(''), 3000)
    await loadData({ preserveScroll: true })
  } catch (err) {
    setNoticeTone('error')
    setNotice(err.message || 'Failed to update favorite.')
  }
}} onUpdateStatus={async (game, newStatus) => {
  const allowed = ['unplayed', 'playing', 'paused', 'completed']
  if (!allowed.includes(newStatus)) return

  const backlogVal = ['unplayed', 'playing', 'completed'].includes(newStatus)
    ? newStatus
    : (game.backlog_status === 'dropped' ? 'dropped' : 'playing')
  const completedAt = newStatus === 'completed' ? (game.completed_at || new Date().toISOString()) : null

  // 1. Instant Optimistic Update
  const optimisticGame = {
    ...game,
    status: newStatus,
    backlog_status: backlogVal,
    completed_at: completedAt,
  }
  setActiveGame(optimisticGame)
  setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, ...optimisticGame } : g)))

  const labelMap = {
    playing: 'Playing',
    paused: 'On Pause',
    completed: 'Completed',
    unplayed: 'Unplayed',
  }
  setNoticeTone('success')
  setNotice(`Marked "${game.canonical_title}" as ${labelMap[newStatus] || newStatus}.`)
  window.setTimeout(() => setNotice(''), 3000)

  // 2. Local SQLite Persistence via IPC
  try {
    const updateFn = api.database?.updateGameStatus || api.updateGameStatus
    let updated = null
    if (updateFn) {
      updated = await updateFn(game.id, newStatus)
    } else {
      updated = await api.database.updateGameMetadata(game.id, {
        status: newStatus,
        backlog_status: backlogVal,
        completed_at: completedAt,
      })
    }
    if (updated && typeof updated === 'object') {
      setActiveGame((prev) => ({ ...prev, ...updated }))
      setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, ...updated } : g)))
    }
    await loadData({ preserveScroll: true })
  } catch (err) {
    console.error('[App] Failed to update game status:', err)
    setNoticeTone('error')
    setNotice(err.message || 'Failed to persist status change.')
  }
}} onUpdateBacklog={async (game, status) => {
  const mapped = status === 'dropped' ? 'paused' : status
  const backlogVal = ['unplayed', 'playing', 'completed'].includes(mapped) ? mapped : 'playing'
  const completedAt = mapped === 'completed' ? (game.completed_at || new Date().toISOString()) : null
  const optimisticGame = { ...game, status: mapped, backlog_status: backlogVal, completed_at: completedAt }
  setActiveGame(optimisticGame)
  setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, ...optimisticGame } : g)))
  try {
    const updateFn = api.database?.updateGameStatus || api.updateGameStatus
    if (updateFn) await updateFn(game.id, mapped)
    else await api.database.updateGameMetadata(game.id, { backlog_status: status })
    await loadData({ preserveScroll: true })
  } catch (err) {
    setNoticeTone('error')
    setNotice(err.message || 'Failed to update backlog status.')
  }
}} onSelectGenre={(genre) => {
  setGenreFilter(genre)
  setViewMode('grid')
  if (librarySidebarPrefRef.current !== undefined) {
    setSidebarCollapsed(librarySidebarPrefRef.current)
  }
}} onGameUpdated={(updated) => {
  setActiveGame(updated)
  loadData({ preserveScroll: true })
}} /> : view === 'about' ? <AboutView /> : view === 'system' ? <>
      <LibraryHealthSection health={libraryHealth} stats={stats} backupsList={backupsList} backupBusy={backupBusy} restoreBusy={restoreBusy} onBackupNow={handleBackupNow} onOpenBackupsFolder={handleOpenBackupsFolder} onOpenBackupsManager={handleOpenBackupsManager} />
      <RecentActivitySection activityLog={activityLog} loading={activityLoading} onRefresh={fetchSystemHealthAndActivity} />
      <section className="stats-section"><div className="section-header compact"><div><h2>Library overview</h2><p>At-a-glance footprint across all connected sources.</p></div><span className="sync-label"><span className="pulse-dot" /> Synced locally</span></div><div className="stats-grid"><StatCard icon={Gamepad2} label="Visible games" value={displayTotalGames} meta={`${stats.hiddenGames || 0} hidden support/add-on entries`} /><StatCard icon={PackageOpen} label="DLC & add-ons" value={displayDlcGames} meta={`${stats.installedDlc || 0} installed add-ons`} accent="amber" /><StatCard icon={PackageCheck} label="Installed" value={displayInstalledGames} meta={`${installedPercent}% of visible library`} accent="violet" /><StatCard icon={Wrench} label="Utility tools" value={stats.utilityTools} meta="Performance & creator tools" accent="amber" /><StatCard icon={HardDrive} label="Disk footprint" value={formatGb(stats.totalStorageGb)} meta="Used by game library" accent="neutral" /><StatCard icon={Database} label="Available storage" value={stats.systemSpecs?.freeStorageGb ? `${stats.systemSpecs.freeStorageGb} GB` : '—'} meta={stats.systemSpecs?.driveCount ? `Free on ${stats.systemSpecs.driveCount} drives (${stats.systemSpecs.driveLetters || '—'})` : '—'} accent="green" /><StatCard icon={HardDrive} label="Total capacity" value={stats.systemSpecs?.totalStorageGb ? `${stats.systemSpecs.totalStorageGb} GB` : '—'} meta="Across all connected drives" accent="violet" /><StatCard icon={Cpu} label="System specs" value={stats.systemSpecs?.gpu ? stats.systemSpecs.gpu.replace(/NVIDIA\s+|GeForce\s+/gi, '') : 'Unknown GPU'} meta={`${stats.systemSpecs?.cpu ? stats.systemSpecs.cpu.replace(/Intel\s+|Core\s+/gi, '') : 'Unknown CPU'} · ${stats.systemSpecs?.ram || '—'}`} accent="neutral" /></div></section><HiddenItemsPanel games={hiddenGames} onRestore={(game) => updateHiddenState(game, false)} /><ArtworkManager onRefresh={loadData} onCancel={handleCancelSync} /><MetadataProvidersSection onRefresh={loadData} /><AdvancedDiagnosticsSection themeName={LAYOUT_THEMES.find((t) => t.value === layoutTheme)?.label || layoutTheme} health={libraryHealth} /><DatabaseManagement onExport={handleExport} onBackup={handleBackupCache} onRestore={handleRestoreCache} onOpenBackups={handleOpenBackupsManager} onPurge={() => setPurgeOpen(true)} />
      </> : view === 'today' ? <section className="library-section today-section"><div className="section-header compact"><div><div className="eyebrow"><span>DAILY ROTATION</span><span className="eyebrow-line" /></div><h2>Today’s Pick</h2><p>One installed, non-utility title selected from your local library.</p></div></div><RoulettePanel onWinner={handlePickWinner} /></section> : <section className="library-section library-pure-games">{isHomeView && (
  <ErrorBoundary fallback={null}>
    <HomeSpotlightAndShelf
      games={games}
      onLaunch={handleLaunch}
      onSelect={handleSelectGame}
      layoutTheme={layoutTheme}
      isCollapsed={isSpotlightCollapsed}
      onToggleCollapse={handleToggleSpotlight}
    />
  </ErrorBoundary>
)}<div className="library-top-bar">
  <div className="library-top-bar-left">
    <div className="collection-header-brand">
      <h2 className="collection-title">{collectionHeading}</h2>
      <span className="collection-count">{filteredGames.length} titles</span>
    </div>
    <div className="top-bar-divider" />
    <CustomDropdown value={sortKey} onChange={setSortKey} options={sortOptions} icon={ArrowDownAZ} className="top-bar-dropdown" title="Sort games" />
    <CustomDropdown value={genreFilter} onChange={setGenreFilter} options={genreOptions} icon={Filter} className="top-bar-dropdown" title="Filter by genre" />
    <CustomDropdown value={backlogFilter} onChange={setBacklogFilter} options={backlogOptions} icon={SlidersHorizontal} className="top-bar-dropdown" title="Filter by backlog status" />
    <div className="top-bar-chip-group">
      <button type="button" className={cn('top-bar-chip', qualityFilters.includes('missingArtwork') && 'active')} onClick={() => setQualityFilters((current) => current.includes('missingArtwork') ? current.filter((item) => item !== 'missingArtwork') : [...current, 'missingArtwork'])}>Missing Artwork</button>
      <button type="button" className={cn('top-bar-chip', qualityFilters.includes('missingIds') && 'active')} onClick={() => setQualityFilters((current) => current.includes('missingIds') ? current.filter((item) => item !== 'missingIds') : [...current, 'missingIds'])}>Missing IDs</button>
    </div>
  </div>
  <div className="library-top-bar-right">
    {isHomeView && !isSpotlightCollapsed && (
      <button
        type="button"
        className="outline-button compact-hero-top-btn"
        onClick={handleToggleSpotlight}
        title="Compact hero spotlight (Ctrl+H)"
      >
        <Minimize2 size={13} />
        <span>Compact Hero</span>
      </button>
    )}
    <button
      type="button"
      className={cn('outline-button select-mode-btn', selectMode && 'active')}
      onClick={() => {
        setSelectMode((current) => !current)
        if (selectMode) setSelectedIds([])
      }}
    >
      <Check size={14} />
      <span>{selectMode ? 'Exit select' : 'Select mode'}</span>
    </button>
    <button
      type="button"
      className="outline-button scan-import-btn"
      onClick={() => setScanOpen(true)}
    >
      <ScanLine size={13} />
      <span>Scan & import</span>
    </button>
  </div>
</div>{selectMode ? <div className="bulk-action-bar"><span><Check size={14} /> {selectedIds.length} selected · {filteredRecordIds.length} filtered</span><div className="bulk-action-group"><button className="outline-button" disabled={bulkBusy || !filteredRecordIds.length} onClick={selectAllFiltered}><Check size={14} /> Select All Filtered</button><button className="outline-button" disabled={bulkBusy || !selectedIds.length} onClick={deselectAll}><X size={14} /> Deselect All</button><button className="outline-button" disabled={bulkBusy || !selectedIds.length} onClick={() => handleBulkMove('dlc')}><PackageOpen size={14} /> Move to DLC</button><button className="outline-button" disabled={bulkBusy || !selectedIds.length} onClick={handleBulkHide}><EyeOff size={14} /> Hide from Library</button><button className="outline-button" disabled={bulkBusy || !selectedIds.length} onClick={handleRefetchSelected}><RefreshCw size={14} /> Re-fetch Artwork</button><button className="outline-button" disabled={bulkBusy || !selectedIds.length} onClick={handleExportSelected}><FileDown size={14} /> Export Selected to CSV</button><button className="outline-button" disabled={bulkBusy || !selectedIds.length} onClick={() => setBulkEditOpen(true)}><SlidersHorizontal size={14} /> Edit Selected</button><button className="danger-button" disabled={bulkBusy || !selectedIds.length} onClick={handleDeleteSelected}><Trash2 size={14} /> Delete Selected</button></div></div> : null}{notice ? <div className={cn('notice', noticeTone === 'error' && 'notice-error', noticeTone === 'warning' && 'notice-warning')}>{noticeTone === 'error' ? <X size={14} /> : noticeTone === 'warning' ? <AlertTriangle size={14} /> : <Check size={14} />} {notice}</div> : null}{loading ? <div className="empty-state"><div className="loader" /> Loading and indexing your library…</div> : filteredGames.length ? <ErrorBoundary><VirtualGrid games={filteredGames} onLaunch={handleLaunch} onSelect={handleSelectGame} onHideGame={(game) => updateHiddenState(game, true)} onMoveCategory={moveCategory} onEditGame={setEditorGame} onContextMenu={handleCardContextMenu} onArtworkChanged={handleArtworkChanged} onArtworkError={handleArtworkError} selectMode={selectMode} selectedIds={selectedIds} onToggleSelect={toggleGameSelection} scrollElementRef={mainScrollRef} onImageError={handleImageError} initialScrollTop={activeGame?.id === lastClickedGameIdRef.current ? libraryScrollRef.current : 0} restoreGameId={activeGame?.id || lastClickedGameIdRef.current} restoredGameId={restoredGameId} /></ErrorBoundary> : (!games.length && !query && !sourceFilters.length && genreFilter === 'all' && backlogFilter === 'all' && !qualityFilters.length) ? <div className="empty-state"><strong>Your library is empty.</strong><span>Click Scan & import (top right) to add your games.</span></div> : <div className="empty-state"><Search size={21} /><span>No titles match these filters.</span></div>}</section>}</ErrorBoundary></div><footer className="statusbar"><span className="statusbar-item statusbar-terminal"><TerminalSquare size={13} /> {scannerStatus ? <span className="inline-flex items-center gap-1.5"><span className="pulse-dot" /> {scannerStatus}</span> : 'Ready'}</span><span className="statusbar-item statusbar-storage"><span className="pulse-dot" /> Offline · Local storage</span><span className="statusbar-item statusbar-version">Version 1.2.0</span></footer></main>
    </div><ScanImportPanel open={scanOpen} onClose={() => setScanOpen(false)} onRefresh={loadData} /><GameEditorModal game={editorGame} onClose={() => setEditorGame(null)} onSaved={handleEditorSaved} /><PurgeConfirmModal open={purgeOpen} busy={purgeBusy} onClose={() => setPurgeOpen(false)} onConfirm={handlePurge} /><BulkEditModal open={bulkEditOpen} count={selectedIds.length} busy={bulkBusy} onClose={() => setBulkEditOpen(false)} onApply={handleBulkApply} /><ContextMenu menu={contextMenu} menuRef={contextMenuRef} onClose={() => setContextMenu(null)} onMoveCategory={moveCategory} onEditGame={setEditorGame} onHideGame={(game) => updateHiddenState(game, true)} onArtworkChanged={handleArtworkChanged} onArtworkError={handleArtworkError} /><ConfirmActionModal config={confirmModal} onClose={() => setConfirmModal(null)} /><BackupsManagerModal open={backupsModalOpen} busy={backupBusy || restoreBusy} backups={backupsList} loading={backupsLoading} backupsDirectory={backupsDirectory || libraryHealth?.backupsDirectory} onClose={() => setBackupsModalOpen(false)} onBackupNow={handleBackupNow} onOpenFolder={handleOpenBackupsFolder} onRestoreBackup={handleRestoreBackup} onChooseAndRestoreFile={handleChooseAndRestoreFile} /></div>
}
export default App