import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Activity, Archive, ArrowDownAZ, ArrowLeft, Check, ChevronDown, CircleHelp, Clock, Cpu, Database, Download,
  FileSpreadsheet, Filter, FolderOpen, Gamepad2, HardDrive, LayoutGrid, Maximize2, Minimize2, Minus,
  Monitor, PackageCheck, PackageOpen, Palette, Play, Search, ScanLine, Settings2,
  ShieldCheck, Smartphone, Sparkles, Square, Star, TerminalSquare, UploadCloud, Wrench, X, Moon, SlidersHorizontal,
  Dices, KeyRound, RefreshCw, RotateCw, ImagePlus, Trophy, WandSparkles, EyeOff, Eye, FileDown, Trash2, AlertTriangle, ArrowRightLeft,
  Bookmark, MoreHorizontal, PlugZap, Info, Film, Camera, ChevronRight, ZoomIn,
  PanelLeftClose, PanelLeft, Shuffle, Layers, Users, LayoutDashboard, BookOpen,
  Mic, MicOff, Keyboard, Gauge, Zap, Flame, Waves, Compass, Tv,
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import './styles/tokens.css'
import './styles.css'
import '@fontsource/outfit'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import { normalizeArtworkUrl } from './utils/artworkUrl'
import { SourceIcon } from './components/SourceIcons'
import { normalizePlatform, platformLabel, platformClass, normalizeStoreLabel, launcherLabelFromUri, isLauncherUri } from './utils/platformMeta.mjs'
import { normalizeTitleSpaced, getEditionTierScore, TITLE_SUFFIXES } from './utils/titleNormalizer.mjs'
import { analyzeDuplicateInstalls } from './utils/duplicateAdvisor.mjs'
import { CustomDropdown } from './components/CustomDropdown'
import { AboutView } from './components/views/AboutView'
import { SettingsModal, renderHudPreview } from './components/SettingsModal'
import { DashboardView } from './components/views/DashboardView'
import { InGameOverlayView } from './components/views/InGameOverlayView'
import { LAYOUT_PALETTES, themeVars } from './utils/themePalettes'
import { PcgwTechSyncButton, SaveBackupsPanel, ModProfilePanel, JumpBackInCard } from './components/views/GameDossierView'
import { AiAssistantDrawer, parseAiResponse } from './components/AiAssistantDrawer'
import { speakConfirmation, getVoiceSettings, saveVoiceSettings } from './utils/voiceService'
import { useGamepad } from './utils/useGamepad'
import { GamepadGlyph } from './components/GamepadGlyph'
import { VirtualKeyboard, KEYBOARD_LAYOUT } from './components/VirtualKeyboard'
import { ConsoleTelemetryBar } from './components/ConsoleTelemetryBar'
import { ConsoleStageView } from './components/ConsoleStageView'
import {
  isConsoleAudioEnabled,
  setConsoleAudioEnabled,
  playNavTick,
  playSelectChime,
  playBackClick,
} from './utils/consoleAudio'
import { generateBragCollage } from './utils/generateBragCollage'
import { IntroSplash, THEME_LOGOS } from './components/IntroSplash'
import { InstallerApp } from './components/InstallerApp'
import { getCustomThemes, getEnabledAddonIds, getCustomCss, applyCustomCss } from './utils/themeAddons'
import logoDark from './assets/logo.png'
import logoLight from './assets/logo-light.png'
const logo = logoDark

const fallbackApi = {
  async invoke() { return null },
  async clearArtCache() { return 0 },
  async selectCustomArtwork() { return null },
  async setGameCategory() { return null },
  async updateGameStatus() { return null },
  async openExternal(url) { window.open(url, '_blank'); return { success: true } },
  window: { minimize() {}, maximize() {}, close() {}, async captureScreen() { return { success: true } }, async captureRect() { return { success: true, dataUrl: '' } }, async saveBragCollage() { return { success: true } }, async openCapturesFolder() { return { success: true } }, async openPicturesFolder() { return { success: true } } },
  database: { async seedCheck() { return { seeded: false, count: 0 } }, async getGames() { return [] }, async getLibraryStats() { return { totalGames: 0, installedGames: 0, utilityTools: 0, installedUtilities: 0, visibleGames: 0, visibleInstalledGames: 0, dlcGames: 0, installedDlc: 0, hiddenGames: 0, hiddenInstalledGames: 0, hiddenDlc: 0, hiddenInstalledDlc: 0, readyToInstallCount: 0, artworkCovered: 0, missingArtwork: 0, totalStorageGb: 0, platformBreakdown: [] } }, async getLibrarySettings() { return { autoHideSupportEntries: true, customScanFolders: [], steamGridDbApiKey: '', preferAnimatedArtwork: false, preferAnimatedCovers: false, overlayShortcut: 'CommandOrControl+Shift+Space', fpsShortcut: 'CommandOrControl+Shift+F', searchShortcut: 'CommandOrControl+F', fpsEnabled: false, fpsPosition: 'top-right', fpsOpacity: 80, fpsStyle: 'minimalist-pill' } }, async getActivityLog() { return [] }, async getLibraryHealth() { return { totalGames: 0, installedGames: 0, lastBackupTimestamp: null, lastBackupPath: null, lastScanTimestamp: null, backupsDirectory: null } }, async backupNow() { return { ok: true, backupPath: '' } }, async listBackups() { return { directory: 'UserData/backups', backups: [] } }, async openBackupsFolder() { return { success: true } }, async chooseBackupFile() { return null }, async restoreBackup() { return { success: true } }, async setLibrarySettings() { return { autoHideSupportEntries: true, customScanFolders: [], steamGridDbApiKey: '', preferAnimatedArtwork: false, preferAnimatedCovers: false, overlayShortcut: 'CommandOrControl+Shift+Space', fpsShortcut: 'CommandOrControl+Shift+F', searchShortcut: 'CommandOrControl+F', fpsEnabled: false, fpsPosition: 'top-right', fpsOpacity: 80, fpsStyle: 'minimalist-pill' } }, async setGameHidden() { return null }, async updateGameStatus() { return null }, async updateGameMetadata() { return null }, async deleteGames() { return null }, async bulkUpdateGames() { return null }, async bulkMoveGameCategory() { return null }, async bulkSetGameHidden() { return null }, async moveGameCategory() { return null }, async exportCsv() { return null }, async exportSelectedCsv() { return null }, async purgeLibrary() { return { deletedGames: 0 } }, async backupArtworkCache() { return null }, async restoreArtworkCache() { return null }, onUpdated() { return () => {} } },
  scanner: { async scanAll() { return {} }, async chooseFolder() { return null }, async chooseImportFile() { return null }, async importFile() { return {} }, async importBuffer() { return {} }, onProgress() { return () => {} } },
  games: { async openUri() {}, async getMedia() { return { success: false, screenshots: [], movies: [] } }, async changeArtwork() { return null }, async refetchArtwork() { return null }, async refetchSelectedArtwork() { return null }, async chooseAndSaveArtwork() { return null }, async chooseExecutable() { return null }, async launchExecutable() { return null }, async addCustomGame() { return null }, async openInstallFolder() { return true }, async triggerUninstallCopy() { return {} }, async markSourceUninstalled() { return {} }, async updateModProfile() { return true } },
  roulette: { async pick() { return null } },
  scraper: { async isSyncing() { return false }, async fetchMissingArt() { return { candidates: 0, matched: 0, covers: 0, heroes: 0 } }, async runBulkArtworkSync() { return { candidates: 0, updated: 0, matched: 0, skipped: 0, failed: 0 } }, async cancelSync() { return { cancelled: false } }, async syncMetadataAndArt() { return { candidates: 0, fastTracked: 0, updated: 0, metadataUpdated: 0, heroesUpdated: 0, matched: 0, skipped: 0, failed: 0 } }, async syncMetadata() { return { candidates: 0, metadataUpdated: 0, heroesUpdated: 0, matched: 0, skipped: 0, failed: 0 } }, async generateAutomaticFallbacks() { return { candidates: 0, fallbackCovers: 0, fallbackHeroes: 0, steamAssets: 0 } }, async testIgdb() { return { success: false, error: 'Unavailable' } }, async fetchGameMetadata() { return null }, async backupCache() { return null }, async restoreCache() { return null }, onProgress() { return () => {} }, onUpdated() { return () => {} }, async chooseOverride() { return null } },
  steam: { async getFamilyLocks() { return {} }, onFamilyLocksUpdated() { return () => {} } },
  ai: { async getStatus() { return { installed: false, modelName: '', sizeMb: 0 } }, async askQuestion() { return '' }, async openFolder() {}, async parseFilter() { return {} } },
  guides: { async getStatus() { return { running: false, progress: null } }, async cancelBatch() { return true }, onBatchProgress() { return () => {} } },
  pcgw: { async fetchManual() { return { success: false, error: 'Unavailable' } } },
  saves: { async list() { return [] }, async backupNow() { return { success: false } } },
}
const api = window.api || fallbackApi

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
// Platform mapping helpers imported from ./utils/platformMeta
function sourcePlatforms(sources = []) { if (!Array.isArray(sources)) return []; return [...new Set(sources.filter(Boolean).map((source) => normalizePlatform(source?.platform)))] }
function getFamilyLockForGame(game, familyLocks) {
  if (!game || !familyLocks || Object.keys(familyLocks).length === 0) return null
  const candidates = game.variants || [game]
  for (const item of candidates) {
    for (const source of (item.sources || [])) {
      const isSteam = String(source.platform || '').toLowerCase().includes('steam') ||
                      String(source.sourceName || '').toLowerCase().includes('steam') ||
                      String(source.launchUri || '').toLowerCase().includes('steam://') ||
                      String(source.installUri || '').toLowerCase().includes('steam://')
      if (isSteam) {
        const id = source.platformGameId || source.platformLaunchId ||
                   source.launchUri?.match(/rungameid\/(\d+)/)?.[1] ||
                   source.installUri?.match(/install\/(\d+)/)?.[1]
        if (id && familyLocks[id]?.isLocked) {
          return familyLocks[id]
        }
      }
    }
  }

  // Fallback: match by normalized game title if source ID was not numeric
  const title = String(game.canonical_title || game.normalized_title || '').trim()
  if (title) {
    const norm = title
      .replace(/[®™©]/g, '')
      .replace(/[:\-_.,!?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()

    if (norm) {
      if (familyLocks.byNormTitle && familyLocks.byNormTitle[norm]?.isLocked) {
        return familyLocks.byNormTitle[norm]
      }
      if (familyLocks.byTitle && familyLocks.byTitle[norm]?.isLocked) {
        return familyLocks.byTitle[norm]
      }
      for (const key of Object.keys(familyLocks)) {
        const lock = familyLocks[key]
        if (lock?.isLocked && lock.gameTitle) {
          const lockNorm = lock.gameTitle
            .replace(/[®™©]/g, '')
            .replace(/[:\-_.,!?]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase()
          if (lockNorm === norm) return lock
        }
      }
    }
  }

  return null
}
const MENU_WIDTH = 220
const MENU_HEIGHT = 280
const MENU_PADDING = 12
function sourceKey(label) { return String(label || '').trim().toLowerCase().replace(/\s+/g, ' ') }
const normalizedGameTitle = normalizeTitleSpaced
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
// Edition tier score imported from ./utils/titleNormalizer.mjs

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
    const sources = [...new Map(sortedVariants.flatMap((variant) => variant.sources || []).map((source) => [`${source.platform}|${normalizeStoreLabel(source.sourceName || source.source_name || '')}|${source.platformGameId}|${source.launchUri || ''}`, source])).values()]
    const installedVariant = variants.find((variant) => variant.is_installed && variant.executable_path) || variants.find((variant) => variant.is_installed) || representative
    const merged = { ...representative, variants: sortedVariants, sources, is_utility: Boolean(representative.is_utility), is_dlc: Boolean(representative.is_dlc), is_installed: variants.some((variant) => Boolean(variant.is_installed)), play_time_seconds: variants.reduce((total, variant) => total + Number(variant.play_time_seconds || 0), 0), install_size_bytes: variants.reduce((total, variant) => total + Number(variant.install_size_bytes || 0), 0), install_size_gb: Number((variants.reduce((total, variant) => total + Number(variant.install_size_bytes || 0), 0) / (1024 ** 3)).toFixed(2)), executable_path: installedVariant.executable_path || null, drive_letter: installedVariant.drive_letter || representative.drive_letter, install_path: installedVariant.install_path || representative.install_path }
    return merged
  })
}
function splitSourceLabels(value) { return String(value || '').split(/[,;|]/).map((label) => normalizeStoreLabel(label.trim())).filter((label) => label && label.toLowerCase() !== 'custom') }
function sourceLabelsForGame(game, installedOnly = false) {
  if (!game) return []
  const rawVariants = game.variants || [game]
  const filteredVariants = installedOnly ? rawVariants.filter((v) => Boolean(v.is_installed)) : rawVariants
  const variants = [...filteredVariants].sort((a, b) => {
    const tierDiff = getEditionTierScore(b.canonical_title) - getEditionTierScore(a.canonical_title)
    if (tierDiff !== 0) return tierDiff
    return Number(Boolean(b.is_installed)) - Number(Boolean(a.is_installed))
  })
  const labels = variants.flatMap((variant) => {
    const customLabels = splitSourceLabels(variant.store_name || variant.storeName || variant.source)
    const sources = variant.sources || []
    const sourceLabels = sources.flatMap((source) => {
      if (installedOnly && source.is_installed === false) return []
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
function sourceOptionsForGames(games = [], installedOnly = false) {
  const counts = new Map()
  for (const game of games) {
    if (game.is_hidden) continue
    for (const label of sourceLabelsForGame(game, installedOnly)) {
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
function sourceLauncherFamily(source) {
  const platform = normalizePlatform(source?.platform)
  const label = String(source?.sourceName || source?.source_name || '').toLowerCase()
  if (platform !== 'custom') return platform
  if (label.includes('ea') || label.includes('origin') || label.includes('electronic arts')) return 'ea'
  if (label.includes('gog')) return 'gog'
  if (label.includes('ubisoft') || label.includes('uplay')) return 'ubisoft'
  if (label.includes('xbox') || label.includes('microsoft')) return 'xbox'
  if (label.includes('amazon')) return 'amazon'
  if (label.includes('itch')) return 'itch'
  if (label.includes('battle') || label.includes('blizzard')) return 'battlenet'
  if (label.includes('riot')) return 'riot'
  if (label.includes('roblox')) return 'roblox'
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
  if (family === 'itch') return id ? `itch://games/${id}` : 'itch://'
  if (family === 'battlenet') return (rawId && /^[A-Z0-9_]{2,10}$/i.test(rawId)) ? `battlenet://game/${id}` : 'battlenet://'
  if (family === 'riot') return 'riotclient://'
  if (family === 'roblox') return 'roblox-player://'
  return null
}
function fallbackLauncherUri(game) {
  const sources = game.sources || []
  for (const source of sources) {
    const generated = launcherUriForSource({ ...source, sourceName: source.sourceName || source.source_name || game.store_name || game.storeName }, game)
    if (generated) return generated
  }
  const labels = sourceLabelsForGame(game).map((label) => String(label).toLowerCase())
  const source = labels.find((label) => /steam|epic|gog|xbox|ea|origin|ubisoft|amazon|itch|battle|riot|roblox/.test(label)) || labels[0] || ''
  if (source.includes('steam')) return null
  if (source.includes('epic')) return 'com.epicgames.launcher://'
  if (source.includes('gog')) return 'goggalaxy://'
  if (source.includes('xbox') || source.includes('microsoft')) return `ms-windows-store://search/?query=${encodeURIComponent(String(game.canonical_title || '').trim())}`
  if (source.includes('ea') || source.includes('origin') || source.includes('electronic arts')) return null
  if (source.includes('ubisoft') || source.includes('uplay')) return null
  if (source.includes('amazon')) return 'amazon-games://'
  if (source.includes('itch')) return 'itch://'
  if (source.includes('battle')) return 'battlenet://'
  if (source.includes('riot')) return 'riotclient://'
  if (source.includes('roblox')) return 'roblox-player://'
  return null
}
function gameYear(game) {
  if (!game?.release_date) return ''
  const match = String(game.release_date).match(/\b(19\d\d|20\d\d)\b/)
  return match ? match[0] : ''
}
function greetingForHour(hour) { return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening' }
function cleanDriveLabel(drive) { const value = String(drive || '').trim().replace(/:+$/, ''); return value ? `${value}:` : '—' }
const EMPTY_LIBRARY_STATS = { totalGames: 0, installedGames: 0, utilityTools: 0, installedUtilities: 0, visibleGames: 0, visibleInstalledGames: 0, dlcGames: 0, installedDlc: 0, hiddenGames: 0, hiddenInstalledGames: 0, hiddenDlc: 0, hiddenInstalledDlc: 0, readyToInstallCount: 0, artworkCovered: 0, missingArtwork: 0, totalStorageGb: 0, platformBreakdown: [], systemSpecs: null, gamesWithGuides: 0, missingGuidesCount: 0, installedWithGuides: 0, missingInstalledGuidesCount: 0, totalKnowledgeChunks: 0 }
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

function matchesShortcut(e, accel) {
  if (!accel || typeof accel !== 'string') return false
  const parts = accel.split('+')
  const targetKey = parts[parts.length - 1].toLowerCase()
  const needsCtrl = parts.includes('CommandOrControl') || parts.includes('Ctrl')
  const needsShift = parts.includes('Shift')
  const needsAlt = parts.includes('Alt')

  const hasCtrl = Boolean(e.ctrlKey || e.metaKey)
  const hasShift = Boolean(e.shiftKey)
  const hasAlt = Boolean(e.altKey)

  if (hasCtrl !== needsCtrl) return false
  if (hasShift !== needsShift) return false
  if (hasAlt !== needsAlt) return false

  const eventKey = e.key.toLowerCase()
  if (e.code === 'Space' && targetKey === 'space') return true
  if (e.code.startsWith('Key') && e.code.replace('Key', '').toLowerCase() === targetKey) return true
  if (e.code.startsWith('Digit') && e.code.replace('Digit', '').toLowerCase() === targetKey) return true
  return eventKey === targetKey
}

function ShortcutKeyRecorder({ value, defaultValue, onChange, label, description }) {
  const [recording, setRecording] = useState(false)

  const handleKeyDown = (e) => {
    if (!recording) return
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      setRecording(false)
      return
    }

    const hasCtrl = e.ctrlKey || e.metaKey
    const hasShift = e.shiftKey
    const hasAlt = e.altKey

    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      return
    }

    if (!hasCtrl && !hasAlt) {
      return
    }

    const parts = []
    if (hasCtrl) parts.push('CommandOrControl')
    if (hasAlt) parts.push('Alt')
    if (hasShift) parts.push('Shift')

    let keyPart = ''
    if (e.code === 'Space') {
      keyPart = 'Space'
    } else if (e.code.startsWith('Key')) {
      keyPart = e.code.replace('Key', '').toUpperCase()
    } else if (e.code.startsWith('Digit')) {
      keyPart = e.code.replace('Digit', '')
    } else if (/^F\d{1,2}$/i.test(e.key)) {
      keyPart = e.key.toUpperCase()
    } else if (e.key.length === 1) {
      keyPart = e.key.toUpperCase()
    } else {
      keyPart = e.key
    }

    if (keyPart) {
      parts.push(keyPart)
      const newShortcut = parts.join('+')
      onChange(newShortcut)
      setRecording(false)
    }
  }

  const displayString = (value || defaultValue || '')
    .replace(/CommandOrControl/g, 'Ctrl')
    .replace(/\+/g, ' + ')

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 14px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.07)',
      borderRadius: '10px',
      gap: '12px',
      flexWrap: 'wrap'
    }}>
      <div style={{ flex: '1 1 200px' }}>
        <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>{label}</strong>
        <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{description}</small>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setRecording(!recording)}
          onKeyDown={handleKeyDown}
          className="outline-button small-button"
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            minWidth: '130px',
            justifyContent: 'center',
            borderColor: recording ? 'var(--accent, #d6ff4b)' : 'rgba(255, 255, 255, 0.15)',
            background: recording ? 'rgba(214, 255, 75, 0.12)' : 'rgba(0, 0, 0, 0.3)',
            color: recording ? 'var(--accent, #d6ff4b)' : 'var(--text-primary)',
            padding: '4px 10px',
            borderRadius: '6px'
          }}
          title={recording ? 'Press your key combination (2 or 3 keys) or Esc to cancel' : 'Click to remap shortcut'}
        >
          {recording ? 'Press 2 or 3 keys…' : displayString}
        </button>
        {value && value !== defaultValue && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className="outline-button small-button"
            style={{ height: '28px', padding: '0 8px', fontSize: '11px', gap: '4px' }}
            title="Reset to default shortcut"
          >
            <RotateCw size={11} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  )
}

function MetadataProvidersSection({ onRefresh, globalSyncRunning = false, globalSyncProgress = null, onCancelSync }) {
  const [steamGridDbApiKey, setSteamGridDbApiKey] = useState('')
  const [igdbClientId, setIgdbClientId] = useState('')
  const [igdbClientSecret, setIgdbClientSecret] = useState('')
  const [heroResolution, setHeroResolution] = useState('2.5k')
  const [preferAnimatedArtwork, setPreferAnimatedArtwork] = useState(false)
  const [preferAnimatedCovers, setPreferAnimatedCovers] = useState(false)
  const [minimizeToTray, setMinimizeToTray] = useState(false)
  const [overlayShortcut, setOverlayShortcut] = useState('CommandOrControl+Shift+Space')
  const [fpsShortcut, setFpsShortcut] = useState('CommandOrControl+Shift+F')
  const [searchShortcut, setSearchShortcut] = useState('CommandOrControl+F')
  const [fpsEnabled, setFpsEnabled] = useState(false)
  const [fpsPosition, setFpsPosition] = useState('top-right')
  const [fpsOpacity, setFpsOpacity] = useState(80)
  const [fpsStyle, setFpsStyle] = useState('minimalist-pill')
  const [shortcutSavedNotice, setShortcutSavedNotice] = useState(false)
  const [aiStatus, setAiStatus] = useState(null)
  const [aiPersonality, setAiPersonality] = useState(() => {
    try {
      return localStorage.getItem('logpile-ai-personality') || 'auto'
    } catch {
      return 'auto'
    }
  })
  const [voiceSettings, setVoiceSettings] = useState(getVoiceSettings)

  useEffect(() => {
    api.ai?.getStatus?.().then((st) => {
      if (st) setAiStatus(st)
    }).catch(() => {})
  }, [])
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
      setPreferAnimatedCovers(Boolean(settings.preferAnimatedCovers))
      setMinimizeToTray(Boolean(settings.minimizeToTray))
      setOverlayShortcut(settings.overlayShortcut || 'CommandOrControl+Shift+Space')
      setFpsShortcut(settings.fpsShortcut || 'CommandOrControl+Shift+F')
      setSearchShortcut(settings.searchShortcut || 'CommandOrControl+F')
      setFpsEnabled(Boolean(settings.fpsEnabled))
      setFpsPosition(settings.fpsPosition || 'top-right')
      setFpsOpacity(Number(settings.fpsOpacity) || 80)
      setFpsStyle(settings.fpsStyle || 'minimalist-pill')
      setLoading(false)
    }).catch(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const handleUpdateShortcutSetting = async (fields) => {
    try {
      await api.database.setLibrarySettings?.(fields)
      setShortcutSavedNotice(true)
      setTimeout(() => setShortcutSavedNotice(false), 3000)
    } catch (err) {
      console.warn('Failed to update shortcut setting:', err)
    }
  }

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
        preferAnimatedCovers,
        minimizeToTray,
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

  const displayProgress = globalSyncProgress || syncProgress
  const isBusy = globalSyncRunning || activeSync !== 'none' || Boolean(displayProgress?.total > 0 && displayProgress?.current > 0 && displayProgress?.current < displayProgress?.total)

  const handleGenerateFallbacks = async () => {
    setActiveSync('fallbacks')
    setSyncNotice('')
    try {
      const res = await api.scraper.generateAutomaticFallbacks?.()
      setSyncNotice(`Fallback art generated: ${res?.fallbackCovers || 0} covers, ${res?.fallbackHeroes || 0} heroes.`)
      await onRefresh?.()
    } catch (err) {
      setSyncNotice(err?.message || 'Fallback generation failed.')
    } finally {
      setActiveSync('none')
    }
  }

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
        preferAnimatedCovers,
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
        preferAnimatedCovers,
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
        preferAnimatedCovers,
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

    const handleSyncAnimatedArtwork = async () => {
    if (!steamGridDbApiKey.trim()) {
      setSyncNotice('SteamGridDB API key is required to sync artwork.')
      return
    }
    setActiveSync('animated')
    setSyncNotice('')
    try {
      setPreferAnimatedArtwork(true)
      setPreferAnimatedCovers(false)
      await api.database.setLibrarySettings?.({
        steamGridDbApiKey: steamGridDbApiKey.trim(),
        igdbClientId: igdbClientId.trim(),
        igdbClientSecret: igdbClientSecret.trim(),
        heroResolution: heroResolution === 'animated' ? 'animated' : heroResolution,
        preferAnimatedArtwork: true,
        preferAnimatedCovers: false,
      })
      const res = await api.scraper.runBulkArtworkSync?.(steamGridDbApiKey.trim(), {
        preferAnimated: true,
        preferAnimatedCovers: false,
        forceAll: true,
      })
      setSyncNotice(`Animated hero sync complete: ${res?.updated ?? 0} motion items updated.`)
      await onRefresh?.()
    } catch (err) {
      setSyncNotice(err?.message || 'Animated artwork sync failed.')
    } finally {
      setActiveSync('none')
    }
  }

  const handleRestoreSmoothStaticCovers = async () => {
    setActiveSync('static-covers')
    setSyncNotice('')
    try {
      setPreferAnimatedArtwork(false)
      setPreferAnimatedCovers(false)
      await api.database.setLibrarySettings?.({
        preferAnimatedArtwork: false,
        preferAnimatedCovers: false,
      })
      const res = await api.scraper.restoreStaticCoversLocal?.()
      setSyncNotice(`Smooth static artwork restored: ${res?.updated ?? 0} titles updated for instant 120+ FPS grid scrolling and zero lag.`)
      await onRefresh?.()
    } catch (err) {
      setSyncNotice(err?.message || 'Failed to restore static artwork.')
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
    <section className="metadata-providers-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="section-header compact">
        <div>
          <div className="eyebrow">
            <KeyRound size={12} />
            <span>INTEGRATIONS &amp; ENRICHMENT</span>
            <span className="eyebrow-line" />
          </div>
          <h2>Settings &amp; Library Enrichment</h2>
          <p>Configure provider credentials, customize visual quality, and enrich your library with high-res covers, motion hero backdrops, and lore.</p>
        </div>
      </div>

      {/* CARD 1: API Credentials & Provider Keys */}
      <form onSubmit={handleSave} className="metadata-providers-card" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(214, 255, 75, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent, #d6ff4b)' }}>
              <KeyRound size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>API Credentials &amp; Provider Keys</strong>
              <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>SteamGridDB for posters and motion heroes, IGDB for synopsis and genres</small>
            </div>
          </div>
          <button
            type="button"
            className="outline-button small-button"
            onClick={() => setShowKeys(!showKeys)}
            title={showKeys ? 'Hide masked keys' : 'Reveal keys'}
            style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
          >
            {showKeys ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{showKeys ? 'Hide Keys' : 'Reveal Keys'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '18px' }}>
          {/* SteamGridDB API Key (Full Width) */}
          <div className="provider-field-block">
            <label className="provider-label">
              <span>SteamGridDB API Key</span>
              <small>Visual assets: 16:9 heroes, 600×900 covers, transparent logos</small>
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

          {/* IGDB Credentials (2 Columns side by side) */}
          <div className="provider-fields-grid" style={{ marginBottom: 0 }}>
            <div className="provider-field-block">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="provider-label">
                  <span>IGDB Client ID</span>
                  <small>Twitch Developer Application Client ID</small>
                </label>
                <button
                  type="button"
                  className="outline-button small-button"
                  style={{ height: '22px', padding: '0 8px', fontSize: '11px', gap: '4px' }}
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
          </div>

          {igdbTestStatus && (
            <div style={{
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

        <div className="provider-actions-footer" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="submit"
            disabled={saving || loading || isBusy}
            className="primary-button"
            style={{ padding: '0 18px', height: '36px' }}
          >
            {saving ? <RefreshCw size={14} className="spin-icon" /> : <Check size={14} />}
            <span>{saving ? 'Saving...' : 'Save Keys'}</span>
          </button>
          {savedNotice && !isBusy && (
            <span className="provider-saved-badge">
              <Check size={13} /> Keys saved to local settings.
            </span>
          )}
        </div>
      </form>

      {/* CARD 2: App Preferences & Visual Quality */}
      <div className="metadata-providers-card" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.07)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
            <SlidersHorizontal size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>App Preferences &amp; Visual Quality</strong>
            <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Tune artwork resolution, frame rates, window behavior, and offline AI personality</small>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Row 1: Dropdowns side by side */}
          <div className="provider-fields-grid" style={{ marginBottom: 0 }}>
            <div className="provider-field-block">
              <label className="provider-label">
                <span>Hero Backdrop Quality</span>
                <small>Preferred resolution for widescreen landscape hero backdrops</small>
              </label>
              <select
                value={heroResolution}
                onChange={(e) => {
                  const val = e.target.value
                  setHeroResolution(val)
                  api.database.setLibrarySettings?.({ heroResolution: val }).catch(() => {})
                }}
                className="provider-select"
              >
                <option value="2.5k">2.5K / 1440p (High Quality — Recommended)</option>
                <option value="1080p">1080p / Full HD (Fast &amp; Crisp ~800 KB)</option>
                <option value="4k">4K / 2160p (Ultra HD — Maximum Detail)</option>
                <option value="720p">720p / Compact (Low Storage footprint)</option>
                <option value="animated">Animated / Motion Hero (WebM / MP4)</option>
              </select>
            </div>

            <div className="provider-field-block">
              <label className="provider-label">
                <span>Gaming AI Personality</span>
                <small>Set offline AI persona (or automatically match your active theme)</small>
              </label>
              <select
                value={aiPersonality}
                onChange={(e) => {
                  const val = e.target.value
                  setAiPersonality(val)
                  try { localStorage.setItem('logpile-ai-personality', val) } catch {}
                }}
                className="provider-select"
              >
                <option value="auto">Auto — Match Active Theme</option>
                <option value="storyteller">🎬 The Storyteller (Cinematic — Narrative &amp; Lore)</option>
                <option value="speedrunner">⚡ Action Speedrunner (Kinetic — High Tempo &amp; Direct)</option>
                <option value="lorekeeper">🌿 The Lore-Keeper (Atmospheric — Deep RPG &amp; Exploration)</option>
                <option value="coop">🎮 The Co-op Buddy (Playful — Sarcastic, Blunt &amp; Uncensored)</option>
                <option value="coach">🏆 The Tactical Coach (Competitive — Meta, Builds &amp; Mechanics)</option>
              </select>
            </div>
          </div>

          {/* AI Model Status & Explorer */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: aiStatus?.installed ? '#22c55e' : '#eab308',
                boxShadow: aiStatus?.installed ? '0 0 10px #22c55e' : 'none',
                flexShrink: 0
              }} />
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>
                  {aiStatus?.installed
                    ? `Offline Engine: Ready (${aiStatus.sizeMb ? (aiStatus.sizeMb / 1024).toFixed(1) + ' GB' : ''})`
                    : 'Offline Engine: Not Installed (Bring Your Own Model)'}
                </strong>
                <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {aiStatus?.installed
                    ? '100% private local CPU/GPU execution · Auto-unloads from RAM after 30s of inactivity to preserve 100% gaming FPS.'
                    : 'Drop any standard .gguf model file into your models folder to enable offline game strategy, lore, and backlog picks.'}
                </small>
              </div>
            </div>
            <button
              type="button"
              className="outline-button small-button"
              onClick={() => api.ai?.openFolder?.()}
              style={{ height: '28px', padding: '0 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
              title="Open local models directory in Windows Explorer"
            >
              <FolderOpen size={13} />
              <span>Open Models Folder</span>
            </button>
          </div>

          {/* Hands-Free Voice Control & Wake Word */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                id="voice-tts-toggle"
                type="checkbox"
                checked={voiceSettings.ttsEnabled}
                onChange={(e) => {
                  const val = e.target.checked
                  const next = saveVoiceSettings({ ttsEnabled: val })
                  setVoiceSettings(next)
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent, #d6ff4b)', flexShrink: 0 }}
              />
              <label htmlFor="voice-tts-toggle" style={{ cursor: 'pointer', userSelect: 'none' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>Voice Feedback (TTS)</strong>
                <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {voiceSettings.ttsEnabled ? 'Enabled (Spoken launch & guide confirmations)' : 'Disabled (Silent operation)'}
                </small>
              </label>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                id="voice-wake-word-toggle"
                type="checkbox"
                checked={voiceSettings.wakeWordEnabled}
                onChange={(e) => {
                  const val = e.target.checked
                  const next = saveVoiceSettings({ wakeWordEnabled: val })
                  setVoiceSettings(next)
                  window.api?.voice?.setWakeWord?.(val)
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent, #d6ff4b)', flexShrink: 0 }}
              />
              <label htmlFor="voice-wake-word-toggle" style={{ cursor: 'pointer', userSelect: 'none' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>"Hey Logpile" Wake Word</strong>
                <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {voiceSettings.wakeWordEnabled ? 'Active (Continuous offline mic listening)' : 'Off (Use Gamepad R3 or mic icon to talk)'}
                </small>
              </label>
            </div>
          </div>

          {/* Row 2: 3 Clean Toggle Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {/* Toggle 1: Motion Hero Banners */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                id="prefer-animated-artwork-toggle"
                type="checkbox"
                checked={preferAnimatedArtwork}
                onChange={(e) => {
                  const val = e.target.checked
                  setPreferAnimatedArtwork(val)
                  api.database.setLibrarySettings?.({ preferAnimatedArtwork: val }).catch(() => {})
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent, #d6ff4b)', flexShrink: 0 }}
              />
              <label htmlFor="prefer-animated-artwork-toggle" style={{ cursor: 'pointer', userSelect: 'none' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>Motion Hero Banners</strong>
                <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {preferAnimatedArtwork ? 'Enabled (Smooth WebM video in Spotlight & Details)' : 'Disabled (Static high-res hero banners)'}
                </small>
              </label>
            </div>

            {/* Toggle 2: Animated Vertical Posters */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                id="prefer-animated-covers-toggle"
                type="checkbox"
                checked={preferAnimatedCovers}
                onChange={(e) => {
                  const val = e.target.checked
                  setPreferAnimatedCovers(val)
                  api.database.setLibrarySettings?.({ preferAnimatedCovers: val }).catch(() => {})
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent, #d6ff4b)', flexShrink: 0 }}
              />
              <label htmlFor="prefer-animated-covers-toggle" style={{ cursor: 'pointer', userSelect: 'none' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>Animated Grid Posters</strong>
                <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {preferAnimatedCovers ? 'Enabled (Animated covers — may drop FPS)' : 'Disabled (Smooth static covers — 120+ FPS guaranteed)'}
                </small>
              </label>
            </div>

            {/* Toggle 3: Minimize to System Tray */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                id="minimize-to-tray-toggle"
                type="checkbox"
                checked={minimizeToTray}
                onChange={(e) => {
                  const val = e.target.checked
                  setMinimizeToTray(val)
                  api.database.setLibrarySettings?.({ minimizeToTray: val }).catch(() => {})
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent, #d6ff4b)', flexShrink: 0 }}
              />
              <label htmlFor="minimize-to-tray-toggle" style={{ cursor: 'pointer', userSelect: 'none' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>Minimize to System Tray</strong>
                <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {minimizeToTray ? 'Enabled (Hides to notification tray near clock)' : 'Disabled (Standard Windows taskbar behavior)'}
                </small>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: Shortcuts & In-Game Performance HUD */}
      <div className="metadata-providers-card" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
              <Keyboard size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>Shortcuts &amp; In-Game Performance HUD</strong>
              <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Customizable 2 or 3-key global shortcuts, conflict prevention (Excel safe), and FPS counter settings</small>
            </div>
          </div>
          {shortcutSavedNotice && (
            <span className="provider-saved-badge" style={{ color: 'var(--accent, #d6ff4b)' }}>
              <Check size={13} /> Saved
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Global Shortcut 1: In-Game Overlay / Companion */}
          <ShortcutKeyRecorder
            label="In-Game Overlay / AI Companion"
            description="Global hotkey to toggle the in-game guide and AI companion. Customizable to avoid clashing with Excel (Ctrl+Space) or game controls."
            value={overlayShortcut}
            defaultValue="CommandOrControl+Shift+Space"
            onChange={(next) => {
              setOverlayShortcut(next)
              handleUpdateShortcutSetting({ overlayShortcut: next })
            }}
          />

          {/* Global Shortcut 2: In-Game FPS Counter Toggle */}
          <ShortcutKeyRecorder
            label="Toggle In-Game FPS Display"
            description="Global hotkey to toggle the themed FPS display while playing games."
            value={fpsShortcut}
            defaultValue="CommandOrControl+Shift+F"
            onChange={(next) => {
              setFpsShortcut(next)
              handleUpdateShortcutSetting({ fpsShortcut: next })
            }}
          />

          {/* In-App Shortcut: Quick Library Search */}
          <ShortcutKeyRecorder
            label="Quick Library Search (In-App Only)"
            description="Shortcut to instantly focus the search bar while Logpile is open. Customizable to any 2 or 3-key combo (e.g. Ctrl+F, Ctrl+K, Ctrl+Shift+S)."
            value={searchShortcut}
            defaultValue="CommandOrControl+F"
            onChange={(next) => {
              setSearchShortcut(next)
              handleUpdateShortcutSetting({ searchShortcut: next })
            }}
          />

          {/* FPS Counter Preferences Grid */}
          <div style={{ marginTop: '6px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Gauge size={15} style={{ color: 'var(--accent, #d6ff4b)' }} />
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>FPS Counter Options</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {/* FPS Toggle Checkbox */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  id="fps-enabled-toggle"
                  type="checkbox"
                  checked={fpsEnabled}
                  onChange={(e) => {
                    const val = e.target.checked
                    setFpsEnabled(val)
                    handleUpdateShortcutSetting({ fpsEnabled: val })
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent, #d6ff4b)', flexShrink: 0 }}
                />
                <label htmlFor="fps-enabled-toggle" style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>Enable FPS Display</strong>
                  <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {fpsEnabled ? 'Active during gameplay' : 'Disabled (Hidden)'}
                  </small>
                </label>
              </div>

              {/* Position Selector */}
              <div className="provider-field-block" style={{ margin: 0 }}>
                <label className="provider-label">
                  <span>Screen Position</span>
                  <small>Corner location for the in-game widget</small>
                </label>
                <select
                  value={fpsPosition}
                  onChange={(e) => {
                    const val = e.target.value
                    setFpsPosition(val)
                    handleUpdateShortcutSetting({ fpsPosition: val })
                  }}
                  className="provider-select"
                >
                  <option value="top-right">Top-Right (Default)</option>
                  <option value="top-left">Top-Left</option>
                  <option value="bottom-right">Bottom-Right</option>
                  <option value="bottom-left">Bottom-Left</option>
                </select>
              </div>

              {/* Style Selector */}
              <div className="provider-field-block" style={{ margin: 0 }}>
                <label className="provider-label">
                  <span>Widget Style</span>
                  <small>Visual aesthetic profile</small>
                </label>
                <select
                  value={fpsStyle}
                  onChange={(e) => {
                    const val = e.target.value
                    setFpsStyle(val)
                    handleUpdateShortcutSetting({ fpsStyle: val })
                  }}
                  className="provider-select"
                >
                  <optgroup label="Atmospheric, Horror & Elemental">
                    <option value="bonfire-ember">Kindled Bonfire (Molten Flame & Embers Telemetry)</option>
                    <option value="elden-grace">Lost Grace & Embers (Crimson Estus & Golden Souls Counter)</option>
                    <option value="silent-fog">Silent Fog EKG (Psychological Horror Heartbeat & Static Panic)</option>
                    <option value="neon-downpour">Neon Downpour (Rain-Slicked Glass & Hydro-Pressure Drops)</option>
                    <option value="blood-moon">Blood Moon Frenzy (Eldritch Eye & Sanguine Vials)</option>
                  </optgroup>
                  <optgroup label="Motorsport & Velocity">
                    <option value="tachometer-gauge">Apex Redline Tachometer (Arc Dial, Needle & 9000 RPM)</option>
                    <option value="f1-telemetry">Grand Prix Cockpit (12 LED Shift Lights & Delta Telemetry)</option>
                    <option value="fighter-jet-hud">Mach 3 Flight Ladder (Vector Jet HUD & Airspeed)</option>
                    <option value="gran-turismo">Apex Apex Apex (Touring Dual Arc Throttle/Brake & G-Force)</option>
                    <option value="rally-dash">Mud & Gravel Digital Dash (Rally LED Ladder & Gear)</option>
                    <option value="nfs-underground">Midnight Drift Purge (Nitrous Flame Bar & Street Glow)</option>
                  </optgroup>
                  <optgroup label="Hardware Labs & Overclocking">
                    <option value="frametime-sparkline">Frametime Oscilloscope (Real-Time Micro-Stutter Sparkline)</option>
                    <option value="liquid-cooling-rig">Liquid Cooling Rig (Dual Coolant Reservoirs & Flow Rate)</option>
                    <option value="rtss-classic">Overclocker's OSD (Classic High-Viz Orange Telemetry)</option>
                    <option value="steam-deck-os">Deckmaster Handheld (Quick-Access Hardware Drawer)</option>
                    <option value="sensor-panel">Hardware Lab Sensor Rig (Dense Multi-Column Diagnostics)</option>
                    <option value="evga-precision">Sub-Zero Hexagon Core (Voltage & Clock Rig)</option>
                  </optgroup>
                  <optgroup label="Tactical Shooters & Esports">
                    <option value="cs2-pro">Defusal Clutch Pro (128-Tick Esports & Low-Latency Ping)</option>
                    <option value="apex-jumpkit">Hot-Drop Jump-Kit (Shield Batteries & Thruster Boost)</option>
                    <option value="overwatch-ult">Ultimate Ready (100% Ult Charge Pulse Ring)</option>
                    <option value="halo-spartan">Mjolnir Energy Shield (Super-Soldier Tactical Radar & Shields)</option>
                    <option value="doom-slayer">Hellwalker Berserk (Demonic Blood Runes & Pure Rage)</option>
                    <option value="subtle-stealth">Ghost Whisper (Zero-Occlusion Minimalist Crosshair)</option>
                  </optgroup>
                  <optgroup label="RPG & Lore-Rich Fantasy">
                    <option value="skyrim-compass">Dragonborn Compass (Nordic Iron Heading & Waypoint Crest)</option>
                    <option value="witcher-medallion">Silver Wolf Medallion (Monster Hunter Toxicity & Vigor)</option>
                    <option value="cyberpunk-neon">Chrome Kiroshi Optics (Canary Yellow & Night City Cyberware)</option>
                    <option value="pipboy-crt">Vault-Dweller Wrist CRT (Radiation Rads & Pip Phosphor Scanlines)</option>
                  </optgroup>
                  <optgroup label="Arcade, Retro & Sci-Fi">
                    <option value="matrix-cascade">Matrix Digital Stream (Phosphor Green Falling Hex)</option>
                    <option value="deadspace-rig">Spinal Bio-RIG (Vertebrae Health Segments & Stasis Ring)</option>
                    <option value="subnautica-depth">Abyssal Crush Depth (Pressure Hull Integrity & Oxygen Ring)</option>
                    <option value="starfield-chrono">NASA-Punk Chronomark (Orbital Horizon & Gravity Bezel)</option>
                    <option value="holo-arc-reactor">Holo Arc Reactor (Orbital Plasma Ring & Core Power)</option>
                    <option value="retro-gameboy">8-Bit Dot-Matrix (1989 Monochrome Green Pocket Screen)</option>
                    <option value="arcade-1984">Quarter Eater 1984 (Flashing 1UP Scanlines & High Score)</option>
                    <option value="synthwave-neon">Outrun Wireframe Horizon (Hot Neon Pink & Laser Grid)</option>
                    <option value="vfd-tape-deck">Hi-Fi Vacuum Fluorescent (80s Stereo VFD & VU Peak)</option>
                    <option value="fighting-game-health">Versus Fighting Gauge (Health Bars, Combo Hits & Super Meter)</option>
                  </optgroup>
                  <optgroup label="Minimalist & Modern">
                    <option value="minimalist-pill">Minimalist Capsule (Floating Glass Accent)</option>
                    <option value="minimal-ticker">Micro Statusbar 1-Line Ticker (Ultra-Compact)</option>
                    <option value="luxury-chronograph">Swiss Luxury Chronograph (Titanium Bezel)</option>
                  </optgroup>
                </select>
              </div>

              {/* Opacity Selector */}
              <div className="provider-field-block" style={{ margin: 0 }}>
                <label className="provider-label">
                  <span>Readability Opacity ({fpsOpacity}%)</span>
                  <small>Crisp &amp; clear over skies and dark scenes</small>
                </label>
                <select
                  value={fpsOpacity}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 80
                    setFpsOpacity(val)
                    handleUpdateShortcutSetting({ fpsOpacity: val })
                  }}
                  className="provider-select"
                >
                  <option value={80}>80% — Optimal Readability (Recommended)</option>
                  <option value={90}>90% — High Contrast</option>
                  <option value={100}>100% — Opaque / Solid</option>
                  <option value={70}>70% — Subtle Translucent</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 4: Library Enrichment Hub */}
      <div className="metadata-providers-card" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Sparkles size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>Library Enrichment Hub</strong>
              <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>High-speed concurrent sync for posters, logos, hero backdrops, and IGDB synopsis</small>
            </div>
          </div>
          {isBusy && (
            <button
              type="button"
              className="danger-button small-button"
              onClick={onCancelSync || handleCancelSync}
              title="Cancel the running sync"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '28px', padding: '0 10px', fontSize: '11px' }}
            >
              <X size={13} />
              <span>Cancel Sync</span>
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          {/* Action 1: Sync Missing Artwork & Data */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <ImagePlus size={15} style={{ color: 'var(--accent, #d6ff4b)' }} />
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Sync Missing Artwork &amp; Data</strong>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                Scans games missing covers, heroes, logos, or IGDB lore and fills only missing slots.
              </p>
            </div>
            <button
              type="button"
              disabled={isBusy || saving || loading || !steamGridDbApiKey.trim()}
              className="outline-button"
              onClick={handleSyncArtwork}
              style={{ borderColor: 'var(--accent, #d6ff4b)', color: 'var(--accent, #d6ff4b)', width: '100%', justifyContent: 'center' }}
            >
              {activeSync === 'artwork' ? <RefreshCw size={13} className="spin-icon" /> : <ImagePlus size={13} />}
              <span>{activeSync === 'artwork' ? 'Syncing Missing…' : 'Sync Missing Artwork'}</span>
            </button>
          </div>

          {/* Action 2: Download Motion Heroes */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Film size={15} style={{ color: '#a5b4fc' }} />
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Download Motion Heroes</strong>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                Bulk upgrades existing hero backdrops to high-framerate WebM video for Spotlight &amp; Details.
              </p>
            </div>
            <button
              type="button"
              disabled={isBusy || saving || loading || !steamGridDbApiKey.trim()}
              className="outline-button"
              onClick={handleSyncAnimatedArtwork}
              style={{ borderColor: '#6366f1', color: '#a5b4fc', width: '100%', justifyContent: 'center' }}
            >
              {activeSync === 'animated' ? <RefreshCw size={13} className="spin-icon" /> : <Film size={13} />}
              <span>{activeSync === 'animated' ? 'Downloading Heroes…' : '🎬 Motion Heroes Sync'}</span>
            </button>
          </div>

          {/* Action 3: Restore 120+ FPS Static Covers & Heroes */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <RefreshCw size={15} style={{ color: '#38bdf8' }} />
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Restore Static Artwork (120+ FPS)</strong>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                Restores crisp static 600×900 covers and static hero backdrops for instant 120+ FPS grid scrolling with zero lag or freezes.
              </p>
            </div>
            <button
              type="button"
              disabled={isBusy || saving || loading}
              className="outline-button"
              onClick={handleRestoreSmoothStaticCovers}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {activeSync === 'static-covers' ? <RefreshCw size={13} className="spin-icon" /> : <RefreshCw size={13} />}
              <span>{activeSync === 'static-covers' ? 'Restoring Artwork…' : '🖼️ Restore Smooth Static Artwork'}</span>
            </button>
          </div>

          {/* Action 4: Full Library Re-Scan */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Database size={15} style={{ color: 'var(--text-secondary)' }} />
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Full Library Re-Scan</strong>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                Comprehensive concurrent scan of all games for both IGDB lore and high-resolution artwork.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={isBusy || saving || loading}
                className="outline-button"
                onClick={handleSyncAll}
                style={{ flex: 1, justifyContent: 'center' }}
                title="Full library rescan"
              >
                {activeSync === 'all' ? <RefreshCw size={13} className="spin-icon" /> : <RefreshCw size={13} />}
                <span>{activeSync === 'all' ? 'Scanning All…' : '🔄 Full Re-Scan'}</span>
              </button>
              <button
                type="button"
                disabled={isBusy || saving || loading}
                className="outline-button"
                onClick={handleGenerateFallbacks}
                title="Generate stylized local fallback artwork for unlisted titles"
                style={{ padding: '0 10px' }}
              >
                {activeSync === 'fallbacks' ? <RefreshCw size={13} className="spin-icon" /> : <WandSparkles size={13} />}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar (Visible during sync) */}
        {isBusy && displayProgress?.total > 0 && (
          <div style={{ marginTop: '12px', width: '100%', background: 'rgba(255, 255, 255, 0.035)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600 }}>
                {displayProgress.gameTitle || displayProgress.title
                  ? `Syncing Artwork: ${displayProgress.gameTitle || displayProgress.title} (${displayProgress.current} / ${displayProgress.total})`
                  : (displayProgress.message || 'Processing…')}
              </span>
              <span style={{ color: 'var(--accent, #d6ff4b)', fontWeight: 700, fontSize: '11px', background: 'rgba(214, 255, 75, 0.1)', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(214, 255, 75, 0.25)' }}>
                {Math.round((displayProgress.current / displayProgress.total) * 100)}%
              </span>
            </div>
            {(displayProgress.subMessage || displayProgress.formattedTransfer) && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="pulse-dot" style={{ width: '4px', height: '4px', background: '#38bdf8' }} />
                <span>
                  {displayProgress.subMessage || (
                    displayProgress.formattedCurrentFile && displayProgress.currentAsset
                      ? `Current: ${displayProgress.formattedCurrentFile} (${displayProgress.currentAsset}) • Total Transferred: ${displayProgress.formattedTransfer || '0 KB'}`
                      : `Total Transferred: ${displayProgress.formattedTransfer || '0 KB'}`
                  )}
                </span>
              </div>
            )}
            <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((displayProgress.current / displayProgress.total) * 100)}%`, background: 'var(--accent, #d6ff4b)', boxShadow: '0 0 10px var(--accent-glow)', transition: 'width 0.25s ease' }} />
            </div>
          </div>
        )}

        {syncNotice && !isBusy && (
          <div style={{ marginTop: '10px' }}>
            <span className="provider-saved-badge" style={{ color: 'var(--accent, #d6ff4b)' }}>
              <Sparkles size={13} /> {syncNotice}
            </span>
          </div>
        )}
      </div>
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
  return { totalGames: safeInteger(source.totalGames), installedGames: safeInteger(source.installedGames), utilityTools: safeInteger(source.utilityTools), installedUtilities: safeInteger(source.installedUtilities), visibleGames: safeInteger(source.visibleGames), visibleInstalledGames: safeInteger(source.visibleInstalledGames), dlcGames: safeInteger(source.dlcGames), installedDlc: safeInteger(source.installedDlc), hiddenGames: safeInteger(source.hiddenGames), hiddenInstalledGames: safeInteger(source.hiddenInstalledGames), hiddenDlc: safeInteger(source.hiddenDlc), hiddenInstalledDlc: safeInteger(source.hiddenInstalledDlc), readyToInstallCount: safeInteger(source.readyToInstallCount), artworkCovered: safeInteger(source.artworkCovered), missingArtwork: safeInteger(source.missingArtwork), gamesWithGuides: safeInteger(source.gamesWithGuides), missingGuidesCount: safeInteger(source.missingGuidesCount), installedWithGuides: safeInteger(source.installedWithGuides), missingInstalledGuidesCount: safeInteger(source.missingInstalledGuidesCount), totalKnowledgeChunks: safeInteger(source.totalKnowledgeChunks), totalStorageGb: typeof source.totalStorageGb === 'number' && Number.isFinite(source.totalStorageGb) ? source.totalStorageGb : 0, platformBreakdown: Array.isArray(source.platformBreakdown) ? source.platformBreakdown : [], systemSpecs: source.systemSpecs || null }
}
function normalizeSyncProgress(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    message: typeof source.message === 'string' ? source.message : '',
    subMessage: typeof source.subMessage === 'string' ? source.subMessage : '',
    title: typeof source.title === 'string' ? source.title : '',
    gameTitle: typeof source.gameTitle === 'string' ? source.gameTitle : (typeof source.title === 'string' ? source.title : ''),
    source: typeof source.source === 'string' ? source.source : 'sync',
    phase: typeof source.phase === 'string' ? source.phase : '',
    current: safeInteger(source.current),
    total: safeInteger(source.total),
    currentAsset: typeof source.currentAsset === 'string' ? source.currentAsset : '',
    fileSizeBytes: typeof source.fileSizeBytes === 'number' ? source.fileSizeBytes : 0,
    formattedCurrentFile: typeof source.formattedCurrentFile === 'string' ? source.formattedCurrentFile : '',
    totalBytes: typeof source.totalBytes === 'number' ? source.totalBytes : 0,
    formattedTransfer: typeof source.formattedTransfer === 'string' ? source.formattedTransfer : '',
    assetsUpdated: safeInteger(source.assetsUpdated),
  }
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
  const [candidateIndex, setCandidateIndex] = useState(0)

  const coverUrl = String(game?.cover_url || '').trim()
  const heroUrl = String(game?.hero_url || '').trim()

  // Build clean static candidate URLs for robust, fail-safe rendering
  const candidates = useMemo(() => {
    const list = []
    if (coverUrl) {
      if (coverUrl.includes('.webm') || coverUrl.includes('.mp4')) {
        list.push(coverUrl.replace(/\.(webm|mp4)(\?.*)?$/i, '.jpg$2'))
      } else {
        list.push(coverUrl)
      }
    }
    if (heroUrl && !heroUrl.includes('.webm') && !heroUrl.includes('.mp4')) {
      list.push(heroUrl)
    }
    return list.filter(Boolean)
  }, [coverUrl, heroUrl])

  useEffect(() => {
    setFailed(false)
    setCandidateIndex(0)
  }, [coverUrl, heroUrl])

  const activeSrc = candidates[candidateIndex] || null

  if (failed || !activeSrc) {
    return (
      <div className={cn('poster-fallback', className)}>
        <span>{String(game?.canonical_title || '').slice(0, 1) || '?'}</span>
        <strong>{game?.canonical_title || 'Unknown Title'}</strong>
        <small>{game?.developer || 'Local collection'}</small>
      </div>
    )
  }

  return (
    <img
      className={className}
      src={normalizeArtworkUrl(activeSrc)}
      alt={`${game?.canonical_title || 'Game'} cover`}
      loading="eager"
      decoding="sync"
      onError={() => {
        if (candidateIndex + 1 < candidates.length) {
          setCandidateIndex((prev) => prev + 1)
        } else {
          setFailed(true)
          if (game?.id) onImageError?.(game.id)
        }
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
  const [form, setForm] = useState({ title: '', description: '', genres: '', developer: '', publisher: '', releaseDate: '', storeName: '', executablePath: '', launchArguments: '', steamGridDbId: '', playTimeHours: '', playTimeMinutes: '' })
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
    const totalSec = Number(game.play_time_seconds || 0)
    const totalMin = Math.floor(totalSec / 60)
    const initH = Math.floor(totalMin / 60)
    const initM = totalMin % 60
    setForm({
      title: game.canonical_title || '',
      description: game.description || '',
      genres: game.genres || game.genre || '',
      developer: game.developer || '',
      publisher: game.publisher || '',
      releaseDate: game.release_date || '',
      storeName: game.store_name || game.storeName || sourceLabelForGame(game),
      executablePath: (() => { const e = String(game.executable_path || game.executablePath || '').replace(/^[\x22\x27]|[\x22\x27]$/g, '').trim(); return /\.exe$/i.test(e) ? e : '' })(),
      launchArguments: game.launch_arguments || game.launchArguments || '',
      steamGridDbId: initialId,
      playTimeHours: initH > 0 ? String(initH) : '',
      playTimeMinutes: initM > 0 ? String(initM) : ''
    })
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

      const cleanExe = (form.executablePath || '').replace(/^[\x22\x27]|[\x22\x27]$/g, '').trim()
      const h = Math.max(0, parseInt(form.playTimeHours, 10) || 0)
      const m = Math.max(0, parseInt(form.playTimeMinutes, 10) || 0)
      const playTimeSeconds = (h * 3600) + (m * 60)
      const dataToSend = { ...form, playTimeSeconds, executablePath: /\.exe$/i.test(cleanExe) ? cleanExe : '', steamGridDbId: idToUse }
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
          steamGridDbId: meta.steamGridDbId || prev.steamGridDbId,
        }))
        if (meta.steamGridDbId) {
          setMatchId(meta.steamGridDbId)
        }
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
    setBusy(true); setError(''); setSuccessMsg('')
    try {
      const updated = await api.games.refetchArtwork(game.id, idToUse, apiKey.trim())
      if (updated) {
        setCurrentGame(updated)
        if (updated.steamgriddb_id) {
          setForm((current) => ({ ...current, steamGridDbId: updated.steamgriddb_id }))
          setMatchId(updated.steamgriddb_id)
        }
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
            <label><span>Playtime (Hours & Minutes)</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="editor-input" type="number" min="0" value={form.playTimeHours} onChange={change('playTimeHours')} placeholder="Hours (e.g. 3)" style={{ flex: 1 }} />
                <input className="editor-input" type="number" min="0" max="59" value={form.playTimeMinutes} onChange={change('playTimeMinutes')} placeholder="Minutes (e.g. 54)" style={{ flex: 1 }} />
              </div>
            </label>
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

function ContextMenu({ menu, menuRef, onClose, onMoveCategory, onEditGame, onHideGame, onArtworkChanged, onArtworkError, onToggleFavorite }) {
  if (!menu) return null
  const game = menu.game
  const run = (action) => { onClose?.(); action?.(); }
  return (
    <div ref={menuRef} className="art-context-menu" style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 9999 }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation() }}>
      <button onClick={() => run(() => onToggleFavorite?.(game))}>
        <Star size={14} fill={game.is_favorite ? '#f59e0b' : 'none'} color={game.is_favorite ? '#f59e0b' : 'currentColor'} />
        <span>{game.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
      </button>
      <div className="context-divider" />
      <button onClick={() => run(() => onMoveCategory?.(game, 'main'))}><LayoutGrid size={14} /> Move to Main Games</button>
      <button onClick={() => run(() => onMoveCategory?.(game, 'dlc'))}><PackageOpen size={14} /> Move to DLC & Add-ons</button>
      <button onClick={() => run(() => onMoveCategory?.(game, 'utility'))}><Wrench size={14} /> Move to Utility Tools</button>
      <div className="context-divider" />
      <button onClick={() => run(() => onEditGame?.(game))}><SlidersHorizontal size={14} /> Edit Metadata & Artwork</button>
      <button onClick={() => run(async () => { try { const result = await api.selectCustomArtwork(game.id); if (result) onArtworkChanged?.(result, game) } catch (error) { onArtworkError?.(error) } })}><ImagePlus size={14} /> Change cover artwork</button>
      <button onClick={() => run(() => onHideGame?.(game))}><EyeOff size={14} /> Hide from library</button>
    </div>
  )
}

function GameCard({ game, onLaunch, onSelect, onHideGame, onContextMenu, compact = false, selectMode = false, selected = false, onToggleSelect, onImageError, isRestored = false, isGamepadFocused = false, onToggleFavorite, isScrolling = false, familyLock = null }) {
  const platforms = sourcePlatforms(game.sources)
  const storeLabels = sourceLabelsForGame(game)
  const rawStatus = String(game.status || game.backlog_status || 'unplayed').toLowerCase()
  const currentStatus = rawStatus === 'dropped' ? 'paused' : (['playing', 'paused', 'completed', 'unplayed'].includes(rawStatus) ? rawStatus : 'unplayed')
  const statusLabel = currentStatus === 'playing' ? '● Playing' : currentStatus === 'paused' ? '⏸ On Pause' : currentStatus === 'completed' ? '✓ Completed' : '○ Unplayed'

  const [isHovered, setIsHovered] = useState(false)

  return (
    <article
      tabIndex={0}
      data-status={currentStatus}
      className={cn('poster-card', isGamepadFocused && 'gamepad-focused', `status-${currentStatus}`, compact && 'poster-card-compact', selectMode && 'poster-card-selectable', selected && 'poster-card-selected', isRestored && 'poster-card-restored', familyLock && 'poster-card-family-locked')}
      onClick={() => selectMode ? onToggleSelect?.(game) : onSelect?.(game)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

        {familyLock ? (
          <div
            className="poster-family-badge"
            style={selectMode ? { left: '36px' } : undefined}
            title={`In use by ${familyLock.playerName} (Steam Family: ${familyLock.familyGroup})`}
          >
            <Users size={11} />
            <span>In Use ({familyLock.playerName})</span>
          </div>
        ) : null}

        {game.is_favorite ? (
          <button
            type="button"
            className="poster-favorite-badge is-favorite"
            title="Favorited title (click to remove from Favorites)"
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite?.(game)
            }}
          >
            <Star size={11} fill="currentColor" />
          </button>
        ) : null}

        <PosterImage
          game={game}
          className="poster-image"
          onImageError={onImageError}
        />
        {game.hltb_main_hours ? (
          <div
            className="poster-hltb-badge"
            title={`Story Campaign: ~${game.hltb_main_hours}h (HowLongToBeat)${game.hltb_completionist_hours ? ` · 100%: ${game.hltb_completionist_hours}h` : ''}${game.hltb_score ? ` · Community Rating: ${game.hltb_score}%` : ''}`}
          >
            <span className="hltb-story-prefix">Story</span>
            <span className="hltb-story-hours">~{game.hltb_main_hours}h</span>
          </div>
        ) : null}
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
              <span className={cn('drawer-status-pip', familyLock ? 'pip-family-locked' : `pip-${currentStatus}`)} />
              <span className={cn('drawer-status-text', familyLock && 'drawer-family-locked-text')} title={familyLock ? `Playing: ${familyLock.playerName} (${familyLock.familyGroup})` : undefined}>
                {familyLock ? `In Use: ${familyLock.playerName}` : (game.is_installed ? 'Installed' : 'Ready')}
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
              className={cn('drawer-action', familyLock && 'drawer-action-family-warning')}
              onClick={(event) => {
                event.stopPropagation()
                onLaunch(game)
              }}
              title={familyLock ? `Family In Use (${familyLock.playerName}) — Click to launch options` : (game.is_installed ? `Play ${game.canonical_title}` : `Install via ${storeLabels[0] || 'store'}`)}
            >
              {game.is_installed ? (
                <>
                  <Play size={12} fill="currentColor" /> {familyLock ? 'Play (In Use)' : 'Play'}
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
            <span><strong>Scan local drives</strong><small>Steam · Epic · GOG · Xbox · EA · Ubisoft · Amazon · Battle.net · Riot · itch.io · Rockstar · +more</small></span>
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
              To import games without store accounts or to populate your uninstalled backlog, upload an Excel or CSV file.
            </p>
          </div>
          <div className="import-headers-guide">
            <span className="import-headers-label">Accepted column headers:</span>
            <div className="import-headers-tags">
              <span className="import-header-tag"><code>Title</code></span>
              <span className="import-header-tag"><code>Platform</code></span>
              <span className="import-header-tag"><code>Status</code></span>
              <span className="import-header-tag"><code>Genre</code></span>
              <span className="import-header-tag"><code>Developer</code></span>
              <span className="import-header-tag"><code>Publisher</code></span>
              <span className="import-header-tag"><code>Playtime_Hours</code></span>
              <span className="import-header-tag"><code>Is_Installed</code></span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="outline-button"
              style={{ fontSize: '11px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  const res = await api.scanner.downloadTemplate('xlsx')
                  if (res?.success) {
                    setResult({ type: 'template', message: `Saved template: ${res.filePath}` })
                  }
                } catch (err) {
                  setError(err.message || 'Failed to download Excel template.')
                }
              }}
            >
              <FileDown size={13} />
              <span>Download Blank Excel Template (.xlsx)</span>
            </button>
            <button
              type="button"
              className="outline-button"
              style={{ fontSize: '11px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  const res = await api.scanner.downloadTemplate('csv')
                  if (res?.success) {
                    setResult({ type: 'template', message: `Saved template: ${res.filePath}` })
                  }
                } catch (err) {
                  setError(err.message || 'Failed to download CSV template.')
                }
              }}
            >
              <FileDown size={13} />
              <span>Download CSV Template (.csv)</span>
            </button>
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

function RoulettePanel({
  onWinner,
  isGamepadMode = false,
  isFocused = false,
  connectedGamepad = '',
  gamepadGlyphStyle = 'auto',
  onLaunch = null,
  onSelect = null,
  spinTriggerRef = null,
}) {
  const [rolling, setRolling] = useState(false)
  const [candidate, setCandidate] = useState(null)
  const [winner, setWinner] = useState(null)
  const [error, setError] = useState('')

  const start = useCallback(async () => {
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
          onWinner?.(target)
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
  }, [rolling, onWinner])

  useEffect(() => {
    if (spinTriggerRef) {
      spinTriggerRef.current = {
        spin: start,
        winner,
        rolling,
      }
    }
  }, [spinTriggerRef, start, winner, rolling])

  const shown = candidate || winner
  return (
    <section className="pick-panel">
      <div className="pick-orbit">
        <div className="pick-orbit-ring" />
        <div className="pick-card-window">
          {shown ? (
            <PosterImage game={shown} className={cn('pick-poster', rolling && 'pick-poster-rolling')} />
          ) : (
            <div className="pick-placeholder">
              <Dices size={36} />
              <span>Ready when you are</span>
            </div>
          )}
        </div>
      </div>
      <div className="pick-copy">
        <div className="eyebrow">
          <span>LOCAL RANDOMIZER</span>
          <span className="eyebrow-line" />
        </div>
        <h2>{winner ? 'Your next session' : 'Today’s Pick'}</h2>
        <p>
          {winner
            ? `${winner.canonical_title} is installed, owned, and ready for a focused session.`
            : 'A private roulette wheel for the games already installed on your connected drives.'}
        </p>
        <div className="pick-rule">
          <span><Trophy size={14} /> Installed only</span>
          <span><WandSparkles size={14} /> Utilities excluded</span>
        </div>

        <div className="pick-actions-row">
          {winner ? (
            <>
              <button
                type="button"
                className={cn('hero-action pick-button', isGamepadMode && isFocused && 'gamepad-focused')}
                onClick={() => onLaunch?.(winner)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {isGamepadMode && (
                  <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                )}
                <Play size={16} />
                <span>Play Now</span>
              </button>

              <button
                type="button"
                className="outline-button pick-secondary-btn"
                disabled={rolling}
                onClick={start}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {isGamepadMode && (
                  <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                )}
                <Dices size={15} />
                <span>Spin Again</span>
              </button>

              <button
                type="button"
                className="outline-button pick-secondary-btn"
                onClick={() => onSelect?.(winner, 'today')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {isGamepadMode && (
                  <GamepadGlyph button="Y" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                )}
                <span>Game Details</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className={cn('hero-action pick-button', isGamepadMode && isFocused && 'gamepad-focused')}
              disabled={rolling}
              onClick={start}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {isGamepadMode && (
                <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
              )}
              {rolling ? (
                <>
                  <RefreshCw size={16} className="spin-icon" />
                  <span>Shuffling…</span>
                </>
              ) : (
                <>
                  <Dices size={16} />
                  <span>Spin the wheel</span>
                </>
              )}
            </button>
          )}
        </div>

        {error ? <div className="scan-message scan-error"><X size={14} /> {error}</div> : null}
      </div>
    </section>
  )
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

function ConfirmActionModal({
  config,
  onClose,
  isGamepadMode = false,
  connectedGamepad = '',
  gamepadGlyphStyle = 'auto',
}) {
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

  const handleCancel = () => {
    config?.onCancel?.()
    onClose?.()
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
          <button className="outline-button" disabled={busy} onClick={handleCancel}>
            {connectedGamepad && (
              <GamepadGlyph button="B" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
            )}
            <span>{cancelText}</span>
          </button>
          <button
            className={isDanger ? 'danger-button' : 'primary-button'}
            disabled={busy}
            autoFocus
            onClick={handleConfirm}
          >
            {busy ? (
              <RefreshCw size={14} className="spin-icon" />
            ) : connectedGamepad ? (
              <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
            ) : (
              <Check size={14} />
            )}
            <span>{busy ? 'Working…' : confirmText}</span>
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
  { value: 'cinematic', label: 'Cinematic', icon: Film, colorDot: '#C6A56B' },
  { value: 'kinetic', label: 'Kinetic', icon: Activity, colorDot: '#F97316' },
  { value: 'playful', label: 'Playful', icon: Gamepad2, colorDot: '#D6FF4B' },
  { value: 'atmospheric', label: 'Atmospheric', icon: Moon, colorDot: '#82939A' },
  { value: 'competitive', label: 'Competitive', icon: Trophy, colorDot: '#EF4444' },
]

function SanctuaryControls({ layoutTheme, setLayoutTheme, isFocused = false, isMenuOpen, onOpenChange, themeFocusIndex = -1 }) {
  const [enabledAddons, setEnabledAddons] = useState(() => getEnabledAddonIds())
  const [customThemes, setCustomThemes] = useState(() => getCustomThemes())

  useEffect(() => {
    const handleAddonsChanged = () => {
      setEnabledAddons(getEnabledAddonIds())
      setCustomThemes(getCustomThemes())
    }
    window.addEventListener('logpile-theme-addons-changed', handleAddonsChanged)
    return () => window.removeEventListener('logpile-theme-addons-changed', handleAddonsChanged)
  }, [])

  const currentOptions = useMemo(() => {
    const customOptions = customThemes
      .filter((a) => enabledAddons.includes(a.id))
      .map((a) => ({
        value: a.id,
        label: a.name,
        icon: Film,
        colorDot: a.palette?.accent || '#C6A56B',
      }))
    return [...LAYOUT_THEMES, ...customOptions]
  }, [enabledAddons, customThemes])

  const activeThemeIcon = LAYOUT_THEMES.find((t) => t.value === layoutTheme)?.icon || Film

  return (
    <div className="sanctuary-controls-group">
      <div className="sanctuary-capsule">
        <CustomDropdown
          value={layoutTheme}
          onChange={setLayoutTheme}
          options={currentOptions}
          icon={activeThemeIcon}
          className={cn("capsule-trigger capsule-layout theme-picker-trigger", isFocused && !isMenuOpen && "gamepad-focused")}
          menuClassName="sanctuary-dropdown-menu"
          title="Select visual layout theme"
          isOpen={isMenuOpen}
          onOpenChange={onOpenChange}
          focusedIndex={isMenuOpen ? themeFocusIndex : -1}
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

  const rawHero = game?.hero_url && String(game.hero_url).trim() ? game.hero_url : null
  const staticHero = rawHero ? rawHero.replace(/\.(webm|mp4)(\?.*)?$/i, '.jpg$2') : null
  const heroUrl = !heroFailed && staticHero ? normalizeArtworkUrl(staticHero) : null

  const rawCover = game?.cover_url && String(game.cover_url).trim() ? game.cover_url : null
  const staticCover = rawCover ? rawCover.replace(/\.(webm|mp4)(\?.*)?$/i, '.jpg$2') : null
  const coverUrl = staticCover ? normalizeArtworkUrl(staticCover) : null

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
  familyLocks = {},
  isDrawerOpen = false,
  preferAnimatedArtwork = false,
  isGamepadMode = false,
  focusZone = 'grid',
  spotlightFocusIndex = 0,
  jumpInFocusIndex = 0,
  onSpotlightStateChange,
}) {
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.random())
  const handleShuffle = (e) => {
    e?.stopPropagation?.()
    setShuffleSeed(Math.random())
    setActiveIndex(0)
  }

  const spotlightCandidates = useMemo(() => {
    if (!games || !games.length) return []
    const valid = games.filter((g) => g.is_installed && !g.is_utility && !g.is_dlc && (g.hero_url || g.cover_url))
    if (!valid.length) return []

    // Rotate fresh, varied titles on launch and on shuffle
    const shuffled = [...valid].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 5)
  }, [games, shuffleSeed])

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
    // Exclude ALL titles present in the spotlight so zero duplicates appear in the shelf below
    const spotlightIds = new Set(spotlightCandidates.map((c) => c.id))
    const nonFeatured = games.filter((g) => g.is_installed && !g.is_utility && !g.is_dlc && !spotlightIds.has(g.id) && (g.cover_url || g.hero_url))
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
  }, [games, spotlightCandidates, featured?.id])

  // Notify parent of candidates & suggested games
  useEffect(() => {
    onSpotlightStateChange?.({
      featured,
      candidates: spotlightCandidates,
      suggested: suggestedGames,
      shuffle: handleShuffle,
      setActiveIndex,
    })
  }, [featured, spotlightCandidates, suggestedGames, onSpotlightStateChange])

  if (!spotlightCandidates.length || !featured) return null

  const heroArt = featured.hero_url ? normalizeArtworkUrl(featured.hero_url) : (featured.cover_url ? normalizeArtworkUrl(featured.cover_url) : null)
  const staticHeroArt = featured.hero_url && !featured.hero_url.includes('.webm') && !featured.hero_url.includes('.mp4')
    ? normalizeArtworkUrl(featured.hero_url)
    : (featured.cover_url && !featured.cover_url.includes('.webm') && !featured.cover_url.includes('.mp4')
      ? normalizeArtworkUrl(featured.cover_url)
      : (featured.hero_url ? normalizeArtworkUrl(featured.hero_url.replace(/\.(webm|mp4)(\?.*)?$/i, '.jpg$2')) : null))
  const isVideoHero = Boolean(preferAnimatedArtwork && !isDrawerOpen && heroArt && (heroArt.endsWith('.webm') || heroArt.endsWith('.mp4') || heroArt.includes('.webm?') || heroArt.includes('.mp4?')))
  const genres = String(featured.genres || featured.genre || '').split(',').map((g) => g.trim()).filter(Boolean)
  const primaryGenre = genres[0] || 'Action'
  const platforms = sourcePlatforms(featured.sources)
  const mainPlatform = platforms[0] || normalizePlatform(featured.source) || 'custom'
  const platformName = platformLabel(mainPlatform)
  const featuredFamilyLock = getFamilyLockForGame(featured, familyLocks)

  return (
    <div className={cn("home-hero-container", isCollapsed && "is-collapsed")}>
      {/* 1. Interactive Spotlight Hero Banner or Collapsed Ribbon */}
      {isCollapsed ? (
        <div className="home-spotlight-collapsed-ribbon">
          <div className="collapsed-ribbon-left">
            <span className="pulse-dot" />
            <span className="collapsed-ribbon-tag">SPOTLIGHT</span>
            {featuredFamilyLock && (
              <span className="collapsed-ribbon-tag family-locked-tag" title={`In use by ${featuredFamilyLock.playerName}`}>
                <Users size={10} style={{ marginRight: 3 }} /> IN USE ({featuredFamilyLock.playerName})
              </span>
            )}
            <strong className="collapsed-ribbon-title">{featured.canonical_title}</strong>
            <span className="collapsed-ribbon-platform">{platformName}</span>
          </div>
          <div className="collapsed-ribbon-actions">
            {featured.is_installed && (
              <button
                type="button"
                className={cn("collapsed-ribbon-play", isGamepadMode && focusZone === 'spotlight' && spotlightFocusIndex === 0 && "gamepad-focused")}
                onClick={() => onLaunch(featured)}
              >
                <Play size={12} fill="currentColor" />
                <span>Play</span>
              </button>
            )}
            <button
              type="button"
              className={cn("collapsed-ribbon-toggle", isGamepadMode && focusZone === 'spotlight' && spotlightFocusIndex === 1 && "gamepad-focused")}
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
          {isVideoHero ? (
            <video
              key={featured.id}
              src={heroArt}
              autoPlay
              loop
              muted
              playsInline
              className="home-spotlight-video"
              ref={(videoEl) => {
                if (!videoEl) return
                const handleVisibility = () => {
                  try {
                    if (document.hidden) videoEl.pause()
                    else videoEl.play().catch(() => {})
                  } catch {}
                }
                document.addEventListener('visibilitychange', handleVisibility)
                window.addEventListener('blur', () => { try { videoEl.pause() } catch {} })
                window.addEventListener('focus', () => { try { if (!document.hidden) videoEl.play().catch(() => {}) } catch {} })
              }}
            />
          ) : (
            <div
              className="home-spotlight-bg"
              key={featured.id}
              style={{ backgroundImage: staticHeroArt ? `url("${staticHeroArt}")` : undefined }}
            />
          )}
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

                {featuredFamilyLock && (
                  <span className="spotlight-chip spotlight-family-chip" title={`In use by ${featuredFamilyLock.playerName} (Steam Family: ${featuredFamilyLock.familyGroup})`}>
                    <Users size={11} />
                    <span>In Use: {featuredFamilyLock.playerName}</span>
                  </span>
                )}

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
                    className={cn("spotlight-btn-primary", featuredFamilyLock && "spotlight-btn-family-warning", isGamepadMode && focusZone === 'spotlight' && spotlightFocusIndex === 0 && "gamepad-focused")}
                    onClick={() => onLaunch(featured)}
                  >
                    <Play size={14} fill="currentColor" />
                    <span>
                      {featuredFamilyLock
                        ? 'Play (In Use)'
                        : layoutTheme === 'competitive'
                        ? 'DEPLOY MISSION'
                        : layoutTheme === 'playful'
                        ? "Let's Play!"
                        : 'Play Now'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className={cn("spotlight-btn-primary", isGamepadMode && focusZone === 'spotlight' && spotlightFocusIndex === 0 && "gamepad-focused")}
                    onClick={() => onSelect(featured, 'spotlight')}
                  >
                    <Sparkles size={14} />
                    <span>{layoutTheme === 'competitive' ? 'INSPECT INTEL' : 'Inspect Title'}</span>
                  </button>
                )}

                <button
                  type="button"
                  className={cn("spotlight-btn-secondary", isGamepadMode && focusZone === 'spotlight' && spotlightFocusIndex === 1 && "gamepad-focused")}
                  onClick={() => onSelect(featured, 'spotlight')}
                >
                  <Info size={13} />
                  <span>{layoutTheme === 'competitive' ? 'INTEL' : layoutTheme === 'playful' ? 'Details' : 'Game Details'}</span>
                </button>

                <button
                  type="button"
                  className={cn("spotlight-btn-secondary spotlight-shuffle-btn", isGamepadMode && focusZone === 'spotlight' && spotlightFocusIndex === 2 && "gamepad-focused")}
                  onClick={handleShuffle}
                  title="Randomize & shuffle spotlight titles"
                >
                  <Shuffle size={13} />
                  <span>{layoutTheme === 'competitive' ? 'ROTATE' : layoutTheme === 'playful' ? 'Random' : 'Shuffle'}</span>
                </button>
              </div>
            </div>

            {/* Interactive Switcher Rail */}
            {spotlightCandidates.length > 1 && (
              <div className="home-spotlight-switcher" aria-label="Spotlight carousel">
                {spotlightCandidates.map((game, idx) => {
                  const isActive = idx === (activeIndex % spotlightCandidates.length)
                  const rawThumb = game.cover_url || game.hero_url || ''
                  const cleanThumb = rawThumb.replace(/\.(webm|mp4)(\?.*)?$/i, '.jpg$2')
                  const thumbImg = cleanThumb ? normalizeArtworkUrl(cleanThumb) : null
                  return (
                    <button
                      key={game.id}
                      type="button"
                      className={cn("spotlight-switch-pill", isActive && "is-active", isGamepadMode && focusZone === 'spotlight' && spotlightFocusIndex === (3 + idx) && "gamepad-focused")}
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
            {suggestedGames.map((game, idx) => {
              const pForm = sourcePlatforms(game.sources)[0] || normalizePlatform(game.source)
              return (
                <div
                  key={game.id}
                  className={cn("shelf-card", isGamepadMode && focusZone === 'jump_in' && jumpInFocusIndex === idx && "gamepad-focused")}
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
  gamepadFocusIndex = -1,
  onToggleFavorite,
  familyLocks = {},
  isBigPictureMode = false,
}) {
  const gridRef = useRef(null)
  const [columns, setColumns] = useState(() => {
    if (typeof window === 'undefined') return 4
    const w = window.innerWidth
    if (isBigPictureMode) {
      return w >= 1600 ? 5 : w >= 1180 ? 4 : w >= 780 ? 3 : 2
    }
    return w >= 1180 ? 5 : w >= 880 ? 4 : w >= 600 ? 3 : 2
  })
  const [scrollMargin, setScrollMargin] = useState(0)

  useEffect(() => {
    const update = () => {
      const width = gridRef.current?.clientWidth || window.innerWidth
      if (isBigPictureMode) {
        setColumns(width >= 1600 ? 5 : width >= 1180 ? 4 : width >= 780 ? 3 : 2)
      } else {
        setColumns(width >= 1180 ? 5 : width >= 880 ? 4 : width >= 600 ? 3 : 2)
      }
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
  }, [scrollElementRef, isBigPictureMode])

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
    estimateSize: () => (isBigPictureMode ? 460 : 420),
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

  // Auto-scroll row into view when gamepadFocusIndex changes
  useEffect(() => {
    if (typeof gamepadFocusIndex === 'number' && gamepadFocusIndex >= 0 && games.length > 0) {
      const rowIndex = Math.floor(gamepadFocusIndex / columns)
      virtualizer.scrollToIndex(rowIndex, { align: 'auto' })
    }
  }, [gamepadFocusIndex, columns, games.length, virtualizer])

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
            {rows[row.index]?.map((game, colIdx) => {
              const itemGlobalIndex = row.index * columns + colIdx
              const familyLock = getFamilyLockForGame(game, familyLocks)
              return (
                <GameCard
                  key={game.id}
                  game={game}
                  familyLock={familyLock}
                  onLaunch={onLaunch}
                  onSelect={onSelect}
                  onHideGame={onHideGame}
                  onContextMenu={onContextMenu}
                  selectMode={selectMode}
                  selected={(game.variants || [game]).every((variant) => selectedIds.includes(variant.id))}
                  onToggleSelect={onToggleSelect}
                  onImageError={onImageError}
                  isRestored={game.id === restoredGameId}
                  isGamepadFocused={gamepadFocusIndex === itemGlobalIndex}
                  onToggleFavorite={onToggleFavorite}
                  isScrolling={isScrolling}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function MediaLightbox({ items = [], initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    if (typeof initialIndex === 'number') {
      setIndex(initialIndex)
    }
  }, [initialIndex])

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
  onSnapHero,
  onAskAi,
  familyLocks = {},
  isGamepadMode = false,
  dossierSection = 'actions',
  dossierActionIndex = 0,
  dossierTabIndex = 0,
  dossierActiveTab = 'overview',
  onDossierActiveTabChange = null,
  dossierContentRow = 'jump_in',
  dossierContentIndex = 0,
  dossierLightboxIndex = null,
  onDossierLightboxChange = null,
  onDossierInfo = null,
}) {
  const familyLock = useMemo(() => getFamilyLockForGame(activeGame, familyLocks), [activeGame, familyLocks])
  const duplicateInfo = useMemo(() => analyzeDuplicateInstalls(activeGame), [activeGame])
  const [dupNoticeMsg, setDupNoticeMsg] = useState('')
  const [internalActiveTab, setInternalActiveTab] = useState('overview')
  const activeTab = dossierActiveTab !== undefined ? dossierActiveTab : internalActiveTab
  const setActiveTab = useCallback((tab) => {
    setInternalActiveTab(tab)
    onDossierActiveTabChange?.(tab)
  }, [onDossierActiveTabChange])
  const [isScrolled, setIsScrolled] = useState(false)
  const [launchMenuOpen, setLaunchMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [launchMenuPlacement, setLaunchMenuPlacement] = useState('up')
  const [moreMenuPlacement, setMoreMenuPlacement] = useState('up')
  const launchMenuRef = useRef(null)
  const moreMenuRef = useRef(null)
  const [guideReady, setGuideReady] = useState(false)
  const [downloadingGuide, setDownloadingGuide] = useState(false)

  useEffect(() => {
    let isMounted = true
    if (activeGame?.id && window.api?.guides?.hasGuide) {
      window.api.guides.hasGuide(activeGame.id).then((ready) => {
        if (isMounted) setGuideReady(Boolean(ready))
      }).catch(() => {})
    }
    return () => { isMounted = false }
  }, [activeGame?.id])

  const handleDownloadSingleGuide = async (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (!activeGame || downloadingGuide) return
    setDownloadingGuide(true)
    try {
      const res = await window.api?.guides?.downloadForGame?.(activeGame.id, activeGame.canonical_title)
      if (res?.success) {
        setGuideReady(true)
      }
    } catch (err) {
      console.warn('[HeroView] Guide download error:', err)
    } finally {
      setDownloadingGuide(false)
    }
  }

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
  const [internalLightboxIndex, setInternalLightboxIndex] = useState(null)
  const lightboxIndex = dossierLightboxIndex !== undefined ? dossierLightboxIndex : internalLightboxIndex
  const setLightboxIndex = useCallback((idx) => {
    setInternalLightboxIndex(idx)
    onDossierLightboxChange?.(idx)
  }, [onDossierLightboxChange])
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

  useEffect(() => {
    if (!onDossierInfo) return
    onDossierInfo({
      hasJumpBackIn: Boolean((activeGame?.last_played && Date.now() - new Date(activeGame.last_played).getTime() > 14 * 24 * 60 * 60 * 1000) || activeGame?.last_checkpoint_note),
      franchiseGames: franchise?.games || [],
      screenshotItems: screenshotItems || [],
      relatedGames: relatedGamesData?.games || [],
      handleDownloadGuide: handleDownloadSingleGuide,
      guideReady,
    })
  }, [activeGame, franchise, screenshotItems, relatedGamesData, guideReady, onDossierInfo])

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
              {familyLock && (
                <span className="hero-sub-chip-group">
                  <span className="hero-sub-sep">·</span>
                  <span className="hero-sub-chip hero-sub-chip-family-locked" title={`Played by ${familyLock.playerName} (Steam Family: ${familyLock.familyGroup})`}>
                    <Users size={12} /> IN USE BY {familyLock.playerName?.toUpperCase()} ({familyLock.familyGroup?.toUpperCase()})
                  </span>
                </span>
              )}
            </div>

            {familyLock && (
              <div className="hero-family-lock-banner">
                <AlertTriangle size={16} className="hero-family-lock-icon" />
                <div className="hero-family-lock-copy">
                  <strong>Currently in use by {familyLock.playerName}</strong>
                  <span>This game is shared via Steam Family ({familyLock.familyGroup}). Launching now may interrupt their active session or fail if no other copy is available.</span>
                </div>
              </div>
            )}

            {duplicateInfo && (
              <div className="hero-family-lock-banner" style={{ borderColor: 'rgba(245, 158, 11, 0.35)', background: 'rgba(245, 158, 11, 0.08)' }}>
                <Layers size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
                <div className="hero-family-lock-copy" style={{ flex: 1 }}>
                  <strong>Installed on {duplicateInfo.allCopies.length} platforms · Save {duplicateInfo.reclaimableGb} GB</strong>
                  <span>
                    Keep <strong>{duplicateInfo.keep.storeLabel}</strong> ({duplicateInfo.keep.reason}) · Suggest uninstalling{' '}
                    {duplicateInfo.remove.map((c) => `${c.storeLabel}${c.installSizeBytes > 0 ? ` (${(c.installSizeBytes / (1024 ** 3)).toFixed(1)} GB)` : ''}`).join(', ')}.
                    {dupNoticeMsg ? ` — ${dupNoticeMsg}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                  {duplicateInfo.remove[0]?.installPath && (
                    <button
                      type="button"
                      className="outline-button small-button"
                      onClick={() => api.games?.openInstallFolder?.(duplicateInfo.remove[0].installPath).catch((err) => setDupNoticeMsg(err?.message || 'Folder unavailable'))}
                    >
                      <FolderOpen size={12} /> Folder
                    </button>
                  )}
                  <button
                    type="button"
                    className="outline-button small-button"
                    style={{ borderColor: 'rgba(245, 158, 11, 0.45)', color: '#fbbf24' }}
                    onClick={async () => {
                      const target = duplicateInfo.remove[0]
                      if (!target) return
                      const res = await api.games?.triggerUninstallCopy?.(target).catch(() => null)
                      if (res?.message) setDupNoticeMsg(res.message)
                    }}
                  >
                    <Trash2 size={12} /> Uninstall {duplicateInfo.remove[0]?.storeLabel}
                  </button>
                  <button
                    type="button"
                    className="outline-button small-button"
                    onClick={async () => {
                      const target = duplicateInfo.remove[0]
                      if (!target) return
                      await api.games?.markSourceUninstalled?.({
                        gameId: target.gameId,
                        platform: target.platform,
                        storeName: target.storeLabel,
                        platformGameId: target.platformGameId,
                      }).catch(() => {})
                    }}
                  >
                    Mark Removed
                  </button>
                </div>
              </div>
            )}

            {/* Launch Trigger */}
            <div className="hero-cta-row">
              <div className="hero-action-anchor" ref={launchMenuRef} style={launchMenuOpen ? { zIndex: 100 } : undefined}>
                <div className="hero-play-split">
                  <button
                    type="button"
                    className={cn(
                      "hero-play-button hero-action-primary",
                      familyLock && "hero-play-button-family-warning",
                      isGamepadMode && dossierSection === 'actions' && dossierActionIndex === 0 && 'gamepad-focused'
                    )}
                    onClick={() => onLaunch(activeGame)}
                  >
                    {layoutTheme === 'atmospheric' ? (
                      activeGame.is_installed ? (
                        <>
                          <Play size={16} fill="currentColor" />
                          <span>{familyLock ? 'Play (In Use)' : 'Play'}</span>
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          <span>{familyLock ? `In Use (${familyLock.playerName})` : 'Install'}</span>
                        </>
                      )
                    ) : layoutTheme === 'kinetic' ? (
                      activeGame.is_installed ? (
                        <>
                          <Play size={14} fill="currentColor" />
                          <span>{familyLock ? 'PLAY (IN USE)' : 'PLAY NOW'}</span>
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          <span>{familyLock ? `IN USE (${familyLock.playerName?.toUpperCase()})` : 'INSTALL'}</span>
                        </>
                      )
                    ) : layoutTheme === 'playful' ? (
                      activeGame.is_installed ? (
                        <>
                          <Play size={16} fill="currentColor" />
                          <span>{familyLock ? 'IN USE · START' : 'PRESS START'}</span>
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          <span>{familyLock ? `IN USE (${familyLock.playerName})` : 'INSERT GAME'}</span>
                        </>
                      )
                    ) : layoutTheme === 'competitive' ? (
                      activeGame.is_installed ? (
                        <>
                          <Play size={15} fill="currentColor" />
                          <span>{familyLock ? 'MATCH IN USE' : 'QUEUE MATCH'}</span>
                        </>
                      ) : (
                        <>
                          <Download size={15} />
                          <span>{familyLock ? `IN USE (${familyLock.playerName})` : 'PRE-LOAD'}</span>
                        </>
                      )
                    ) : (
                      activeGame.is_installed ? (
                        <>
                          <Play size={16} fill="currentColor" />
                          <span>{familyLock ? `Play (In Use: ${familyLock.playerName})` : 'Play Now'}</span>
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          <span>{familyLock ? `In Use (${familyLock.playerName}) · Install` : `Install via ${storeLabels[0] || platformLabel(primaryPlatform)}`}</span>
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
                        } catch {}
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
                className={cn('hero-ghost-btn', Boolean(activeGame.is_favorite) && 'active', isGamepadMode && dossierSection === 'actions' && dossierActionIndex === 1 && 'gamepad-focused')}
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
                className={cn('hero-ghost-btn', activeTab === 'screenshots' && 'active', isGamepadMode && dossierSection === 'actions' && dossierActionIndex === 2 && 'gamepad-focused')}
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

              <button
                type="button"
                className={cn('hero-ghost-btn', isGamepadMode && dossierSection === 'actions' && dossierActionIndex === 3 && 'gamepad-focused')}
                title={`Snap this ${layoutTheme.toUpperCase()} theme view (PNG)`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSnapHero?.(activeGame)
                }}
              >
                <Camera size={14} />
                <span>Snap Theme</span>
              </button>

              {onAskAi ? (
                <button
                  type="button"
                  className={cn('hero-ghost-btn', isGamepadMode && dossierSection === 'actions' && dossierActionIndex === 4 && 'gamepad-focused')}
                  title={`Ask Gaming AI about ${activeGame.canonical_title}`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onAskAi(activeGame)
                  }}
                >
                  <Sparkles size={14} style={{ color: 'var(--accent, #d6ff4b)' }} />
                  <span>Ask AI</span>
                </button>
              ) : null}

              {guideReady ? (
                <button
                  type="button"
                  className={cn('hero-ghost-btn', isGamepadMode && dossierSection === 'actions' && dossierActionIndex === 5 && 'gamepad-focused')}
                  style={{ borderColor: 'rgba(74, 222, 128, 0.35)', color: '#4ade80' }}
                  title="Offline walkthrough indexed in SQLite knowledge base. Click to open AI guide."
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (onAskAi) onAskAi(activeGame)
                  }}
                >
                  <BookOpen size={14} style={{ color: '#4ade80' }} />
                  <span>Guide Ready</span>
                  <Check size={13} style={{ color: '#4ade80', marginLeft: '-2px' }} />
                </button>
              ) : (
                <button
                  type="button"
                  className={cn('hero-ghost-btn', isGamepadMode && dossierSection === 'actions' && dossierActionIndex === 5 && 'gamepad-focused')}
                  title={`Download offline walkthrough guide for ${activeGame.canonical_title}`}
                  onClick={handleDownloadSingleGuide}
                  disabled={downloadingGuide}
                >
                  <BookOpen size={14} />
                  <span>{downloadingGuide ? 'Downloading...' : 'Get Guide'}</span>
                </button>
              )}

              <PcgwTechSyncButton game={activeGame} onGameUpdated={onGameUpdated} />

              {onEdit ? (
                <button
                  type="button"
                  className={cn('hero-ghost-btn', isGamepadMode && dossierSection === 'actions' && dossierActionIndex === 6 && 'gamepad-focused')}
                  onClick={() => onEdit(activeGame)}
                  title="Edit metadata & artwork"
                >
                  <Settings2 size={14} />
                  <span>Edit Details</span>
                </button>
              ) : null}

              <button
                type="button"
                className={cn('hero-ghost-btn hero-details-scroll-btn', isGamepadMode && dossierSection === 'actions' && dossierActionIndex === 7 && 'gamepad-focused')}
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
                        } catch {}
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
                        } catch {}
                      }}
                    >
                      <UploadCloud size={14} />
                      <span>Upload Custom Hero Banner</span>
                    </button>

                    <button
                      type="button"
                      className="hero-menu-item"
                      onClick={() => {
                        setMoreMenuOpen(false)
                        onSnapHero?.(activeGame)
                      }}
                    >
                      <Camera size={14} />
                      <span>Snap Theme View (PNG)</span>
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
          {TABS.map((tab, idx) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                'cinematic-tab-nav-btn',
                activeTab === tab.id && 'active',
                isGamepadMode && dossierSection === 'tabs' && dossierTabIndex === idx && 'gamepad-focused'
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {activeTab === tab.id && <span className="cinematic-tab-glow-line" />}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="cinematic-tab-pane">
            <JumpBackInCard
              game={activeGame}
              onPlay={onLaunch}
              isFocused={isGamepadMode && dossierSection === 'content' && activeTab === 'overview' && dossierContentRow === 'jump_in'}
            />
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

                {/* HowLongToBeat Card */}
                <div className="cinematic-hltb-sheet dossier-sheet-card" style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 className="cinematic-dossier-heading" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⏱ HowLongToBeat</span>
                      {activeGame.hltb_score ? (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }}>
                          ★ {activeGame.hltb_score}% Rating
                        </span>
                      ) : null}
                    </h4>
                    <button
                      type="button"
                      className="dossier-panel-btn hero-ghost-btn"
                      title="Fetch latest completion estimates from HowLongToBeat"
                      onClick={async (e) => {
                        e.stopPropagation()
                        try {
                          const res = await window.api?.games?.fetchHltb?.(activeGame.id, activeGame.canonical_title)
                          if (res) onGameUpdated?.(res)
                        } catch {}
                      }}
                    >
                      <RotateCw size={11} className="spin-icon-on-click" />
                      <span>Sync HLTB</span>
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                    <div className="hltb-stat-box">
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.05em' }}>Main Story</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent, #f59e0b)', marginTop: '4px' }}>
                        {activeGame.hltb_main_hours ? `${activeGame.hltb_main_hours}h` : '—'}
                      </div>
                    </div>
                    <div className="hltb-stat-box">
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.05em' }}>Main + Extra</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent, #f59e0b)', marginTop: '4px' }}>
                        {activeGame.hltb_extra_hours ? `${activeGame.hltb_extra_hours}h` : '—'}
                      </div>
                    </div>
                    <div className="hltb-stat-box">
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.05em' }}>100% Complete</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent, #f59e0b)', marginTop: '4px' }}>
                        {activeGame.hltb_completionist_hours ? `${activeGame.hltb_completionist_hours}h` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Backups Panel */}
                <SaveBackupsPanel game={activeGame} onGameUpdated={onGameUpdated} />

                {/* Mod Profiles & Launch Arguments Panel */}
                <ModProfilePanel game={activeGame} onGameUpdated={onGameUpdated} />
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
                      {franchise.games.map((game, idx) => (
                        <button
                          key={game.id}
                          type="button"
                          className={cn(
                            'franchise-card',
                            game.id === activeGame.id && 'active',
                            isGamepadMode && dossierSection === 'content' && activeTab === 'overview' && dossierContentRow === 'franchise' && dossierContentIndex === idx && 'gamepad-focused'
                          )}
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
                          className={cn(
                            'cinematic-media-card',
                            isGamepadMode && dossierSection === 'content' && activeTab === 'overview' && dossierContentRow === 'media' && dossierContentIndex === idx && 'gamepad-focused'
                          )}
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
                      {relatedGamesData.games.slice(0, 6).map((game, idx) => (
                        <button
                          key={game.id}
                          type="button"
                          className={cn(
                            'franchise-card',
                            isGamepadMode && dossierSection === 'content' && activeTab === 'overview' && dossierContentRow === 'related_preview' && dossierContentIndex === idx && 'gamepad-focused'
                          )}
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
                  {relatedGamesData.games.map((game, idx) => (
                    <button
                      key={game.id}
                      type="button"
                      className={cn(
                        'franchise-card',
                        game.id === activeGame.id && 'active',
                        isGamepadMode && dossierSection === 'content' && activeTab === 'related' && dossierContentIndex === idx && 'gamepad-focused'
                      )}
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
                    className={cn(
                      'cinematic-media-card',
                      isGamepadMode && dossierSection === 'content' && activeTab === 'screenshots' && dossierContentIndex === idx && 'gamepad-focused'
                    )}
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



function LiveHudOverlayView() {
  const [hudSettings, setHudSettings] = useState({
    fpsEnabled: true,
    fpsStyle: 'blood-moon',
    fpsPosition: 'top-left',
    fpsOpacity: 80,
    fpsOrientation: 'horizontal',
    fpsMetrics: {
      fps: true,
      onePercentLow: true,
      frametime: true,
      gpu: true,
      cpu: true,
      ram: true,
      battery: true,
      clock: true,
    },
  })

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const s = await window.api?.database?.getLibrarySettings?.()
        if (active && s) {
          setHudSettings({
            fpsEnabled: Boolean(s.fpsEnabled),
            fpsStyle: s.fpsStyle || 'blood-moon',
            fpsPosition: s.fpsPosition || 'top-left',
            fpsOpacity: Number(s.fpsOpacity) || 80,
            fpsOrientation: s.fpsOrientation || 'horizontal',
            fpsMetrics: s.fpsMetrics || {
              fps: true,
              onePercentLow: true,
              frametime: true,
              gpu: true,
              cpu: true,
              ram: true,
              battery: true,
              clock: true,
            },
          })
        }
      } catch {}
    }
    load()

    const onUpdate = (data) => {
      if (data) {
        setHudSettings((prev) => ({
          ...prev,
          ...(data.fpsEnabled !== undefined ? { fpsEnabled: Boolean(data.fpsEnabled) } : {}),
          ...(data.fpsStyle !== undefined ? { fpsStyle: data.fpsStyle } : {}),
          ...(data.fpsPosition !== undefined ? { fpsPosition: data.fpsPosition } : {}),
          ...(data.fpsOpacity !== undefined ? { fpsOpacity: Number(data.fpsOpacity) } : {}),
          ...(data.fpsOrientation !== undefined ? { fpsOrientation: data.fpsOrientation } : {}),
          ...(data.fpsMetrics !== undefined ? { fpsMetrics: data.fpsMetrics } : {}),
        }))
      }
    }

    const unsubSettings = window.api?.fps?.onSettingsUpdated?.(onUpdate)
    const unsubStatus = window.api?.fps?.onStatusChanged?.(onUpdate)

    // Enforce transparent background on HTML, Body, and #root for HUD window
    document.documentElement.classList.add('is-hud')
    document.body.classList.add('is-hud')
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    const rootEl = document.getElementById('root')
    if (rootEl) {
      rootEl.classList.add('is-hud')
      rootEl.style.background = 'transparent'
    }

    return () => {
      active = false
      document.documentElement.classList.remove('is-hud')
      document.body.classList.remove('is-hud')
      if (rootEl) rootEl.classList.remove('is-hud')
      unsubSettings?.()
      unsubStatus?.()
    }
  }, [])

  if (!hudSettings.fpsEnabled) return null

  const getAlignment = (pos) => {
    switch (pos) {
      case 'top-left':
        return { alignItems: 'flex-start', justifyContent: 'flex-start' }
      case 'top-center':
        return { alignItems: 'flex-start', justifyContent: 'center' }
      case 'top-right':
        return { alignItems: 'flex-start', justifyContent: 'flex-end' }
      case 'left-center':
        return { alignItems: 'center', justifyContent: 'flex-start' }
      case 'right-center':
        return { alignItems: 'center', justifyContent: 'flex-end' }
      case 'bottom-left':
        return { alignItems: 'flex-end', justifyContent: 'flex-start' }
      case 'bottom-center':
        return { alignItems: 'flex-end', justifyContent: 'center' }
      case 'bottom-right':
      default:
        return { alignItems: 'flex-end', justifyContent: 'flex-end' }
    }
  }

  const alignment = getAlignment(hudSettings.fpsPosition)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        display: 'flex',
        ...alignment,
        background: 'transparent',
        overflow: 'visible',
        pointerEvents: 'none',
        userSelect: 'none',
        opacity: (hudSettings.fpsOpacity || 80) / 100,
      }}
    >
      {renderHudPreview(hudSettings.fpsStyle, hudSettings.fpsMetrics, hudSettings.fpsOrientation)}
    </div>
  )
}

function App() {
  const isInstallerMode = typeof window !== 'undefined' && (
    window.location.hash.includes('installer') ||
    window.location.search.includes('installer') ||
    Boolean(window.api?.installer?.isInstallerMode)
  )
  if (isInstallerMode) {
    return (
      <ErrorBoundary
        fallback={({ error }) => (
          <div style={{ padding: 24, color: '#f87171', background: '#0a0a0a', border: '1px solid #ef4444', borderRadius: 8 }}>
            <strong>Installer Error:</strong> {error?.message}
          </div>
        )}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', background: 'transparent', overflow: 'hidden' }}>
          <InstallerApp />
        </div>
      </ErrorBoundary>
    )
  }
  const isOverlayMode = typeof window !== 'undefined' && window.location.hash === '#overlay'
  const isHudMode = typeof window !== 'undefined' && window.location.hash === '#hud'
  if (isHudMode) {
    return (
      <ErrorBoundary fallback={() => null}>
        <LiveHudOverlayView />
      </ErrorBoundary>
    )
  }
  if (isOverlayMode) {
    return (
      <ErrorBoundary fallback={({ error, reset }) => (
        <div style={{ padding: 24, color: '#f87171', background: '#0a0a0a', border: '1px solid #ef4444', borderRadius: 8 }}>
          <strong>In-Game Overlay Error:</strong> {error?.message}
          <div style={{ marginTop: 8 }}><button onClick={reset}>Retry</button></div>
        </div>
      )}>
        <InGameOverlayView />
      </ErrorBoundary>
    )
  }
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

  const [isBigPictureMode, setIsBigPictureMode] = useState(() => {
    try {
      return localStorage.getItem('logpile-big-picture-mode') === 'true'
    } catch {
      return false
    }
  })

  const handleToggleBigPicture = useCallback((forcedVal) => {
    setIsBigPictureMode((prev) => {
      const next = typeof forcedVal === 'boolean' ? forcedVal : !prev
      try {
        localStorage.setItem('logpile-big-picture-mode', String(next))
      } catch {}

      if (window.api?.window?.toggleFullScreen) {
        window.api.window.isFullScreen?.().then((isFull) => {
          if (next && !isFull) {
            window.api.window.toggleFullScreen()
          } else if (!next && isFull) {
            window.api.window.toggleFullScreen()
          }
        }).catch(() => {
          window.api.window.toggleFullScreen()
        })
      } else if (typeof document !== 'undefined') {
        if (next && !document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {})
        } else if (!next && document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {})
        }
      }
      return next
    })
  }, [])

  const [inAppSearchShortcut, setInAppSearchShortcut] = useState('CommandOrControl+F')
  const [consoleModeShortcut, setConsoleModeShortcut] = useState('F11')
  const [allowEscExitConsole, setAllowEscExitConsole] = useState(false)

  useEffect(() => {
    let active = true
    api.database?.getLibrarySettings?.().then((settings) => {
      if (!active || !settings) return
      if (settings.searchShortcut) setInAppSearchShortcut(settings.searchShortcut)
      if (settings.consoleModeShortcut) setConsoleModeShortcut(settings.consoleModeShortcut)
      if (settings.allowEscExitConsole !== undefined) setAllowEscExitConsole(Boolean(settings.allowEscExitConsole))
    }).catch(() => {})
    const off = api.database?.onUpdated?.(() => {
      api.database?.getLibrarySettings?.().then((settings) => {
        if (!active || !settings) return
        if (settings.searchShortcut) setInAppSearchShortcut(settings.searchShortcut)
        if (settings.consoleModeShortcut) setConsoleModeShortcut(settings.consoleModeShortcut)
        if (settings.allowEscExitConsole !== undefined) setAllowEscExitConsole(Boolean(settings.allowEscExitConsole))
      }).catch(() => {})
    })
    return () => {
      active = false
      off?.()
    }
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !e.target.matches('input, textarea')) {
        e.preventDefault()
        toggleSidebar()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h' && !e.target.matches('input, textarea')) {
        e.preventDefault()
        handleToggleSpotlight()
      } else if (matchesShortcut(e, inAppSearchShortcut) || (!inAppSearchShortcut && (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'f'))) {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        setAiDrawerOpen((prev) => !prev)
      } else if (matchesShortcut(e, consoleModeShortcut) || e.key === 'F11' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'f' || e.key === 'F'))) {
        e.preventDefault()
        handleToggleBigPicture()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggleSidebar, handleToggleSpotlight, inAppSearchShortcut, consoleModeShortcut, handleToggleBigPicture])

  const mainScrollRef = useRef(null); const spinTodayRef = useRef(null); const searchInputRef = useRef(null); const libraryScrollRef = useRef(0); const lastClickedGameIdRef = useRef(null); const navOriginRef = useRef({ view: 'installed', source: 'grid', scrollTop: 0 }); const hasSeededRef = useRef(false); const [restoredGameId, setRestoredGameId] = useState(null); const [games, setGames] = useState([]); const [hiddenGames, setHiddenGames] = useState([]); const [stats, setStats] = useState(() => ({ ...EMPTY_LIBRARY_STATS })); const [query, setQuery] = useState(''); const [debouncedQuery, setDebouncedQuery] = useState(''); const [view, setView] = useState('installed'); const [sourceFilters, setSourceFilters] = useState([]); const [genreFilter, setGenreFilter] = useState('all'); const [backlogFilter, setBacklogFilter] = useState('all'); const [sortKey, setSortKey] = useState('title-asc'); const [viewMode, setViewMode] = useState('grid'); const [activeGame, setActiveGame] = useState(null); const isDetailView = viewMode === 'hero' && Boolean(activeGame);   const [layoutTheme, setLayoutTheme] = useState(() => localStorage.getItem('logpile-layout-theme') || 'cinematic');
  const [colorPalette, setColorPalette] = useState(() => {
    try {
      return localStorage.getItem('logpile-color-palette') || 'auto';
    } catch {
      return 'auto';
    }
  });
  const handleColorPaletteChange = (newPalette) => {
    if (!newPalette) return;
    setColorPalette(newPalette);
    try {
      localStorage.setItem('logpile-color-palette', newPalette);
    } catch {}
  };
  const handleLayoutThemeChange = (newTheme) => {
    if (!newTheme) return;
    const isDifferent = newTheme !== layoutTheme;
    setLayoutTheme(newTheme);
    localStorage.setItem('logpile-layout-theme', newTheme);
    if (isDifferent) {
      let playOnSwitch = true;
      try {
        playOnSwitch = localStorage.getItem('logpile-intro-on-theme-change') !== 'false';
      } catch {
        playOnSwitch = true;
      }
      if (playOnSwitch) {
        setSettingsModalOpen(false);
        setShowIntro(true);
      }
    }
  };
  const [sourcesPlacement, setSourcesPlacement] = useState(() => {
    try {
      const saved = localStorage.getItem('logpile-sources-placement');
      return ['sidebar', 'filterbar'].includes(saved) ? saved : 'sidebar';
    } catch {
      return 'sidebar';
    }
  });
  const [publisherLaunchersOpen, setPublisherLaunchersOpen] = useState(false);
  const handleSourcesPlacementChange = (nextPlacement) => {
    if (!['sidebar', 'filterbar'].includes(nextPlacement)) return;
    setSourcesPlacement(nextPlacement);
    try {
      localStorage.setItem('logpile-sources-placement', nextPlacement);
    } catch {}
  };
  const mode = 'dark';
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(() => {
    try {
      const playIntroEnabled = localStorage.getItem('logpile-play-intro') !== 'false';
      const alreadyPlayedInSession = sessionStorage.getItem('logpile-intro-session-played') === 'true';
      return playIntroEnabled && !alreadyPlayedInSession;
    } catch {
      return false;
    }
  }); const [dataLoaded, setDataLoaded] = useState(false); const [notice, setNotice] = useState(''); const [noticeTone, setNoticeTone] = useState('success'); const [scanOpen, setScanOpen] = useState(false); const [editorGame, setEditorGame] = useState(null); const [purgeOpen, setPurgeOpen] = useState(false); const [purgeBusy, setPurgeBusy] = useState(false); const [confirmModal, setConfirmModal] = useState(null); const [contextMenu, setContextMenu] = useState(null); const contextMenuRef = useRef(null); const [selectMode, setSelectMode] = useState(false); const [selectedIds, setSelectedIds] = useState([]); const [bulkEditOpen, setBulkEditOpen] = useState(false); const [bulkBusy, setBulkBusy] = useState(false); const [qualityFilters, setQualityFilters] = useState([]); const [failedImageIds, setFailedImageIds] = useState(new Set()); const [scannerStatus, setScannerStatus] = useState(null); const [isDetailHudIdle, setIsDetailHudIdle] = useState(false); const [isDetailScrolled, setIsDetailScrolled] = useState(false)
  const [screenshotBusy, setScreenshotBusy] = useState(false)
  const [activeCaptureAction, setActiveCaptureAction] = useState(null)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [aiInstalled, setAiInstalled] = useState(false)
  const [aiUserEnabled, setAiUserEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('logpile-ai-enabled')
      return stored !== null ? stored === 'true' : true
    } catch {
      return true
    }
  })

  useEffect(() => {
    let isMounted = true
    if (window.api?.ai?.getStatus) {
      window.api.ai.getStatus().then((st) => {
        if (isMounted && st) {
          setAiInstalled(Boolean(st.installed))
        }
      }).catch(() => {})
    }
    return () => { isMounted = false }
  }, [])

  const handleToggleAiUserEnabled = useCallback((enabled) => {
    setAiUserEnabled(enabled)
    try {
      localStorage.setItem('logpile-ai-enabled', String(enabled))
    } catch {}
  }, [])

  const isAiAvailable = aiInstalled && aiUserEnabled
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [settingsModalTab, setSettingsModalTab] = useState('general')
  const [familyLocks, setFamilyLocks] = useState({})
  const [timeFilter, setTimeFilter] = useState('all')
  const [aiFilter, setAiFilter] = useState(null)
  const [aiFilterQuery, setAiFilterQuery] = useState('')
  const [aiFilterLoading, setAiFilterLoading] = useState(false)
  const [aiFilterOpen, setAiFilterOpen] = useState(false)
  const [isVoiceListening, setIsVoiceListening] = useState(false)
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [checkpointPrompt, setCheckpointPrompt] = useState(null)
  const [checkpointText, setCheckpointText] = useState('')
  const [checkpointSaving, setCheckpointSaving] = useState(false)
  const checkpointTimeoutRef = useRef(null)

  useEffect(() => {
    const unbindStart = window.api?.games?.onSessionStarted?.(() => setIsGameRunning(true))
    const unbindEnd = window.api?.games?.onSessionEnded?.(() => setIsGameRunning(false))
    const unbindPrompt = window.api?.games?.onPromptCheckpointNote?.(({ gameId, title }) => {
      setCheckpointPrompt({ gameId, title })
      setCheckpointText('')
      if (checkpointTimeoutRef.current) clearTimeout(checkpointTimeoutRef.current)
      checkpointTimeoutRef.current = setTimeout(() => {
        setCheckpointPrompt(null)
      }, 15000)
    })
    return () => {
      unbindStart?.()
      unbindEnd?.()
      unbindPrompt?.()
      if (checkpointTimeoutRef.current) clearTimeout(checkpointTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const unbindVoice = window.api?.voice?.onRecognized?.((data) => {
      if (data?.text && checkpointPrompt) {
        setCheckpointText((prev) => (prev ? `${prev} ${data.text}` : data.text))
        if (checkpointTimeoutRef.current) {
          clearTimeout(checkpointTimeoutRef.current)
          checkpointTimeoutRef.current = setTimeout(() => setCheckpointPrompt(null), 30000)
        }
      }
    })
    return () => unbindVoice?.()
  }, [checkpointPrompt])

  const handleCheckpointTextChange = (e) => {
    setCheckpointText(e.target.value)
    if (checkpointTimeoutRef.current) {
      clearTimeout(checkpointTimeoutRef.current)
      checkpointTimeoutRef.current = setTimeout(() => setCheckpointPrompt(null), 30000)
    }
  }

  const handleSaveCheckpointNote = async () => {
    if (!checkpointPrompt?.gameId || !checkpointText.trim()) {
      setCheckpointPrompt(null)
      return
    }
    setCheckpointSaving(true)
    try {
      await window.api?.games?.updateCheckpointNote?.(checkpointPrompt.gameId, checkpointText.trim())
      setGames((prev) =>
        prev.map((g) =>
          g.id === checkpointPrompt.gameId
            ? { ...g, last_checkpoint_note: checkpointText.trim(), last_checkpoint_at: new Date().toISOString() }
            : g
        )
      )
      if (activeGame?.id === checkpointPrompt.gameId) {
        setActiveGame((prev) => ({
          ...prev,
          last_checkpoint_note: checkpointText.trim(),
          last_checkpoint_at: new Date().toISOString(),
        }))
      }
      setNotice('Checkpoint note saved!')
      setNoticeTone('success')
      setTimeout(() => setNotice(''), 3000)
    } catch {} finally {
      setCheckpointSaving(false)
      setCheckpointPrompt(null)
    }
  }

  const handleApplyAiFilter = async (queryText = aiFilterQuery) => {
    const textToParse = (queryText || '').trim()
    if (!textToParse) {
      setAiFilter(null)
      return
    }
    setAiFilterLoading(true)
    try {
      const res = await window.api?.ai?.parseFilter?.(textToParse)
      if (res && typeof res === 'object' && Object.keys(res).length > 0) {
        const sanitized = {}
        if (typeof res.genre === 'string' && res.genre.trim()) sanitized.genre = res.genre.trim()
        else if (Array.isArray(res.genre) && typeof res.genre[0] === 'string') sanitized.genre = res.genre[0].trim()

        if (typeof res.max_hltb === 'number' && !isNaN(res.max_hltb) && res.max_hltb > 0) sanitized.max_hltb = Math.round(res.max_hltb)
        if (typeof res.min_hltb === 'number' && !isNaN(res.min_hltb) && res.min_hltb > 0) sanitized.min_hltb = Math.round(res.min_hltb)

        if (res.unplayed === true || res.status === 'unplayed') sanitized.unplayed = true
        if (typeof res.status === 'string' && res.status.trim()) sanitized.status = res.status.trim()
        if (res.installed === true) sanitized.installed = true
        if (res.favorites === true) sanitized.favorites = true

        if (typeof res.search === 'string' && res.search.trim()) sanitized.search = res.search.trim()
        else if (Object.keys(sanitized).length === 0) sanitized.search = textToParse

        setAiFilter({ ...sanitized, originalQuery: textToParse })
      } else {
        setAiFilter({ search: textToParse, originalQuery: textToParse })
      }
    } catch {
      setAiFilter({ search: textToParse, originalQuery: textToParse })
    } finally {
      setAiFilterLoading(false)
    }
  }

  const handleClearAiFilter = () => {
    setAiFilter(null)
    setAiFilterQuery('')
  }
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const dragCounterRef = useRef(0)

  useEffect(() => {
    if (isDetailView && activeGame?.id && window.api?.overlay?.setSelectedGame) {
      window.api.overlay.setSelectedGame({
        id: activeGame.id,
        title: activeGame.canonical_title,
      }).catch(() => {})
    } else if (!isDetailView && window.api?.overlay?.setSelectedGame) {
      window.api.overlay.setSelectedGame(null).catch(() => {})
    }
  }, [isDetailView, activeGame?.id, activeGame?.canonical_title])

  useEffect(() => {
    let isMounted = true
    api.steam?.getFamilyLocks?.().then((locks) => {
      if (isMounted && locks) setFamilyLocks(locks)
    }).catch(() => {})
    const off = api.steam?.onFamilyLocksUpdated?.((locks) => {
      if (isMounted && locks) setFamilyLocks(locks)
    })
    return () => {
      isMounted = false
      off?.()
    }
  }, [])
  const [screenshotMenuOpen, setScreenshotMenuOpen] = useState(false)
  const [bragMenuPos, setBragMenuPos] = useState({ top: 0, right: 0, openUpwards: false })
  const bragMenuRef = useRef(null)
  const bragDropdownRef = useRef(null)
  const [globalSyncRunning, setGlobalSyncRunning] = useState(false)
  const [globalSyncProgress, setGlobalSyncProgress] = useState(null)
  const [guideSyncStatus, setGuideSyncStatus] = useState({ running: false, progress: null })
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
    if (view === 'system' || settingsModalOpen) {
      fetchSystemHealthAndActivity()
    }
  }, [view, settingsModalOpen, fetchSystemHealthAndActivity])

  useEffect(() => {
    if (view === 'system') {
      setSettingsModalTab('general')
      setSettingsModalOpen(true)
      setView('all')
    } else if (view === 'about') {
      setSettingsModalTab('about')
      setSettingsModalOpen(true)
      setView('all')
    }
  }, [view])

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

  const updateBragMenuPosition = useCallback(() => {
    if (!bragMenuRef.current) return
    const rect = bragMenuRef.current.getBoundingClientRect()
    if (rect.bottom < 20 || rect.top > window.innerHeight) {
      setScreenshotMenuOpen(false)
      return
    }
    const menuEstimatedHeight = 220
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUpwards = spaceBelow < menuEstimatedHeight && spaceAbove > 140

    let right = window.innerWidth - rect.right
    if (right < 16) right = 16

    setBragMenuPos({
      top: openUpwards ? rect.top - 6 : rect.bottom + 6,
      right,
      openUpwards,
    })
  }, [])

  const toggleBragMenu = useCallback((e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (!screenshotMenuOpen) {
      updateBragMenuPosition()
      setScreenshotMenuOpen(true)
    } else {
      setScreenshotMenuOpen(false)
    }
  }, [screenshotMenuOpen, updateBragMenuPosition])

  const handleCaptureScreen = async () => {
    setScreenshotMenuOpen(false)
    setScreenshotBusy(true)
    setActiveCaptureAction('screen')
    setNoticeTone('info')
    setNotice('Capturing screen...')
    await new Promise((resolve) => setTimeout(resolve, 160))
    try {
      let prefix = 'Logpile-Screen-Library'
      if (isDetailView && activeGame) {
        const cleanTitle = (activeGame.canonical_title || 'Game').replace(/[^a-zA-Z0-9_-]/g, '_')
        prefix = `Logpile-Screen-Dossier-${cleanTitle}-${layoutTheme}`
      } else if (view === 'dashboard') {
        prefix = `Logpile-Screen-Dashboard-${layoutTheme}`
      } else if (view === 'today') {
        prefix = `Logpile-Screen-TodaysPick-${layoutTheme}`
      } else if (view === 'system') {
        prefix = 'Logpile-Screen-Settings'
      } else if (view === 'about') {
        prefix = 'Logpile-Screen-About'
      }
      const res = await api.window?.captureScreen?.(prefix)
      if (res?.success) {
        const fileName = res.filePath ? res.filePath.split(/[/\\]/).pop() : `${prefix}.png`
        setNoticeTone('success')
        setNotice(`Saved to captures: ${fileName} (copied to clipboard!)`)
      } else {
        throw new Error(res?.error || 'Capture failed')
      }
    } catch (err) {
      setNoticeTone('error')
      setNotice(err.message || 'Failed to capture screen.')
    } finally {
      setScreenshotBusy(false)
      setActiveCaptureAction(null)
      window.setTimeout(() => setNotice(''), 4500)
    }
  }

  const handleCaptureFullPage = async () => {
    setScreenshotMenuOpen(false)
    setScreenshotBusy(true)
    setActiveCaptureAction('fullpage')
    setNoticeTone('info')
    setNotice('Capturing full view (whole page from top to bottom)...')

    // Blur active element so cursor or input highlight does not cause redraw or scroll displacement
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur()
    }

    const scrollEl = document.querySelector('.main-scroll') || document.documentElement
    const shellEl = document.querySelector('.app-shell')
    const originalScrollTop = scrollEl.scrollTop
    const originalScrollBehavior = scrollEl.style.scrollBehavior
    scrollEl.style.scrollBehavior = 'auto'

    document.body.classList.add('is-fullpage-capturing')
    if (shellEl) shellEl.classList.add('is-fullpage-capturing')

    // Inject temporary override style to completely eliminate titlebar overhang, shadows, borders, and force instant scrolling
    const overrideStyle = document.createElement('style')
    overrideStyle.id = 'fullpage-capture-overrides'
    overrideStyle.textContent = `
      *, *::before, *::after,
      html, body, .app-shell, .app-shell *,
      .main-scroll, .main-scroll-fullbleed,
      .app-shell .main-scroll, .app-shell .main-scroll-fullbleed,
      .app-shell.is-detail-view .main-scroll,
      .app-shell.is-detail-view .main-scroll-fullbleed,
      .app-shell[class*="layout-"] .main-scroll-fullbleed,
      .app-shell[class*="layout-"].is-detail-view .main-scroll-fullbleed,
      .app-shell.layout-cinematic.is-detail-view .main-scroll-fullbleed,
      .app-shell.layout-kinetic.is-detail-view .main-scroll-fullbleed,
      .app-shell.layout-atmospheric.is-detail-view .main-scroll-fullbleed,
      .app-shell.layout-playful.is-detail-view .main-scroll-fullbleed,
      .app-shell.layout-competitive.is-detail-view .main-scroll-fullbleed {
        scroll-behavior: auto !important;
        transition: none !important;
        animation: none !important;
      }
      .titlebar {
        overflow: hidden !important;
      }
      .titlebar::after,
      .titlebar::before,
      .app-shell .titlebar::after,
      .app-shell:not(.is-detail-view) .titlebar::after {
        display: none !important;
        content: none !important;
        height: 0px !important;
        max-height: 0px !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
      .main-content::after {
        display: none !important;
        content: none !important;
      }
      .statusbar {
        box-shadow: none !important;
        border-top-color: transparent !important;
      }
      .cinematic-scroll-pill {
        display: none !important;
      }
      .main-scroll::-webkit-scrollbar,
      .main-scroll-fullbleed::-webkit-scrollbar,
      ::-webkit-scrollbar {
        display: none !important;
        width: 0px !important;
        height: 0px !important;
      }
    `
    document.head.appendChild(overrideStyle)

    const cleanupCaptureState = () => {
      try {
        overrideStyle.remove()
      } catch {}
      document.body.classList.remove('is-fullpage-capturing')
      if (shellEl) shellEl.classList.remove('is-fullpage-capturing')
      scrollEl.scrollTop = originalScrollTop
      scrollEl.style.scrollBehavior = originalScrollBehavior
    }

    await new Promise((resolve) => setTimeout(resolve, 80))

    let prefix = 'Logpile-FullView-Library'
    if (isDetailView && activeGame) {
      const cleanTitle = (activeGame.canonical_title || 'Game').replace(/[^a-zA-Z0-9_-]/g, '_')
      prefix = `Logpile-FullDossier-${cleanTitle}-${layoutTheme}`
    } else if (view === 'dashboard') {
      prefix = `Logpile-FullDashboard-${layoutTheme}`
    } else if (view === 'today') {
      prefix = `Logpile-FullTodaysPick-${layoutTheme}`
    } else if (view === 'system') {
      prefix = 'Logpile-FullSettings'
    } else if (view === 'about') {
      prefix = 'Logpile-FullAbout'
    } else if (view === 'ready') {
      prefix = `Logpile-FullReadyToInstall-${layoutTheme}`
    } else if (view === 'installed') {
      prefix = `Logpile-FullInstalled-${layoutTheme}`
    } else if (view === 'all') {
      prefix = `Logpile-FullAllGames-${layoutTheme}`
    } else if (view === 'utilities') {
      prefix = `Logpile-FullUtilities-${layoutTheme}`
    } else if (view === 'dlc') {
      prefix = `Logpile-FullDLC-${layoutTheme}`
    }

    try {
      const rect = scrollEl.getBoundingClientRect()
      const viewportHeight = scrollEl.clientHeight
      const captureWidth = Math.round(rect.width)
      const captureHeight = viewportHeight || Math.round(rect.height)
      const captureY = Math.round(rect.y)
      const stepDips = captureHeight

      // If already fits within single viewport or invalid width, capture directly with full view prefix
      if (scrollEl.scrollHeight <= viewportHeight + 10 || captureWidth <= 10) {
        cleanupCaptureState()
        const directRes = await api.window?.captureScreen?.(prefix)
        if (directRes?.success) {
          const fileName = directRes.filePath ? directRes.filePath.split(/[/\\]/).pop() : `${prefix}.png`
          setNoticeTone('success')
          setNotice(`Saved whole view capture: ${fileName} (copied to clipboard!)`)
          return
        }
        throw new Error(directRes?.error || 'Failed capturing view')
      }

      const applyScrollPosition = async (targetTop) => {
        scrollEl.scrollTop = targetTop
        if (typeof scrollEl.scrollTo === 'function') {
          scrollEl.scrollTo({ top: targetTop, behavior: 'instant' })
        }
        void scrollEl.offsetHeight
        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 180)))
        })
      }

      // Slices accumulator
      const slices = []

      // Capture top slice at scrollTop = 0
      await applyScrollPosition(0)

      const firstRes = await api.window?.captureRect?.({
        x: Math.round(rect.x),
        y: captureY,
        width: captureWidth,
        height: captureHeight,
      })

      if (!firstRes?.success || !firstRes?.dataUrl) {
        throw new Error(firstRes?.error || 'Failed capturing view segment')
      }

      const firstImg = new Image()
      firstImg.src = firstRes.dataUrl
      await new Promise((resolve, reject) => {
        firstImg.onload = resolve
        firstImg.onerror = reject
      })

      const dpr = firstImg.naturalWidth / captureWidth
      const actualFirstHeightDips = firstRes.capturedHeight || captureHeight

      slices.push({
        img: firstImg,
        topDips: 0,
        heightDips: actualFirstHeightDips,
        isTail: false,
      })

      let coveredTopDips = actualFirstHeightDips

      // Dynamically traverse the full scrollHeight across any virtualized grid (Installed, Ready to Install, etc.)
      let maxLoops = 250 // Safety cap covering massive libraries
      while (maxLoops-- > 0) {
        const liveScrollHeight = scrollEl.scrollHeight
        const maxScrollTop = Math.max(0, liveScrollHeight - viewportHeight)

        // When covered dips reach or exceed maxScrollTop, only the remaining tail needs capturing
        if (coveredTopDips >= maxScrollTop) {
          const remainingTailDips = liveScrollHeight - coveredTopDips
          if (remainingTailDips > 1) {
            // Scroll to absolute bottom to expose the final remaining tail
            await applyScrollPosition(maxScrollTop)

            const tailRes = await api.window?.captureRect?.({
              x: Math.round(rect.x),
              y: captureY,
              width: captureWidth,
              height: captureHeight,
            })

            if (tailRes?.success && tailRes?.dataUrl) {
              const tailImg = new Image()
              tailImg.src = tailRes.dataUrl
              await new Promise((resolve, reject) => {
                tailImg.onload = resolve
                tailImg.onerror = reject
              })

              const naturalH = tailImg.naturalHeight
              const sourceCropY = Math.max(0, Math.round((viewportHeight - remainingTailDips) * dpr))
              const sourceCropH = Math.min(naturalH - sourceCropY, Math.round(remainingTailDips * dpr))

              slices.push({
                img: tailImg,
                topDips: coveredTopDips,
                heightDips: remainingTailDips,
                isTail: true,
                cropY: sourceCropY,
                cropH: sourceCropH,
              })
              coveredTopDips += remainingTailDips
            }
          }
          break
        }

        // Advance to next uncaptured slice
        const targetScrollTop = Math.min(coveredTopDips, maxScrollTop)
        await applyScrollPosition(targetScrollTop)

        const sliceRes = await api.window?.captureRect?.({
          x: Math.round(rect.x),
          y: captureY,
          width: captureWidth,
          height: stepDips,
        })

        if (!sliceRes?.success || !sliceRes?.dataUrl) {
          throw new Error(sliceRes?.error || 'Failed capturing view segment')
        }

        const sliceImg = new Image()
        sliceImg.src = sliceRes.dataUrl
        await new Promise((resolve, reject) => {
          sliceImg.onload = resolve
          sliceImg.onerror = reject
        })

        const sliceHeightDips = sliceRes.capturedHeight || stepDips
        slices.push({
          img: sliceImg,
          topDips: coveredTopDips,
          heightDips: sliceHeightDips,
          isTail: false,
        })

        coveredTopDips += sliceHeightDips

        const progressPercent = Math.min(98, Math.round((coveredTopDips / scrollEl.scrollHeight) * 100))
        setNotice(`Capturing full view (${progressPercent}% · slice ${slices.length})...`)
      }

      setNotice('Stitching full view into PNG...')

      const totalDips = coveredTopDips
      const maxCanvasDim = 16384
      let outputScale = dpr
      const rawPixelHeight = Math.round(totalDips * outputScale)
      if (rawPixelHeight > maxCanvasDim) {
        outputScale = maxCanvasDim / totalDips
      }

      const canvas = document.createElement('canvas')
      canvas.width = Math.round(captureWidth * outputScale)
      canvas.height = Math.round(totalDips * outputScale)
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      for (const slice of slices) {
        const destY = Math.round(slice.topDips * outputScale)
        const destH = Math.round(slice.heightDips * outputScale)
        if (slice.isTail) {
          ctx.drawImage(
            slice.img,
            0, slice.cropY, slice.img.naturalWidth, slice.cropH,
            0, destY, canvas.width, destH
          )
        } else {
          ctx.drawImage(
            slice.img,
            0, 0, slice.img.naturalWidth, slice.img.naturalHeight,
            0, destY, canvas.width, destH
          )
        }
      }

      // Restore scrolling state
      cleanupCaptureState()

      const finalDataUrl = canvas.toDataURL('image/png')
      const saveRes = await api.window?.saveBragCollage?.(finalDataUrl, prefix)
      if (saveRes?.success) {
        const fileName = saveRes.filePath ? saveRes.filePath.split(/[/\\]/).pop() : `${prefix}.png`
        setNoticeTone('success')
        setNotice(`Saved whole view capture: ${fileName} (copied to clipboard!)`)
      } else {
        throw new Error(saveRes?.error || 'Failed to save whole view')
      }
    } catch (err) {
      console.error('[FullPageCapture] Error:', err)
      setNoticeTone('error')
      setNotice(err.message || 'Failed to capture full view.')
    } finally {
      cleanupCaptureState()
      setScreenshotBusy(false)
      setActiveCaptureAction(null)
      window.setTimeout(() => setNotice(''), 4500)
    }
  }

  const handleSnapHero = useCallback(async (gameToSnap = activeGame) => {
    if (!gameToSnap) return
    setScreenshotBusy(true)
    setActiveCaptureAction('hero')
    setNoticeTone('info')
    setNotice(`Snapping ${layoutTheme} hero view for "${gameToSnap.canonical_title}"...`)
    await new Promise((resolve) => setTimeout(resolve, 160))
    try {
      const cleanTitle = (gameToSnap.canonical_title || 'Game').replace(/[^a-zA-Z0-9_-]/g, '_')
      const prefix = `Logpile-Hero-${cleanTitle}-${layoutTheme}`
      const res = await api.window?.captureScreen?.(prefix)
      if (res?.success) {
        const fileName = res.filePath ? res.filePath.split(/[/\\]/).pop() : `${prefix}.png`
        setNoticeTone('success')
        setNotice(`Saved to captures: ${fileName} (copied to clipboard!)`)
      } else {
        throw new Error(res?.error || 'Capture failed')
      }
    } catch (err) {
      console.error('Failed to snap hero view:', err)
      setNoticeTone('error')
      setNotice(err.message || 'Failed to capture hero view.')
    } finally {
      setScreenshotBusy(false)
      setActiveCaptureAction(null)
      window.setTimeout(() => setNotice(''), 4500)
    }
  }, [activeGame, layoutTheme])

  const handleCaptureFilteredShowcase = async (aspectRatio = 'auto') => {
    setScreenshotMenuOpen(false)
    setScreenshotBusy(true)
    setActiveCaptureAction('showcase')
    const count = filteredGames.length
    if (count === 0) {
      setNoticeTone('warning')
      setNotice('No titles match your current filters to showcase.')
      setScreenshotBusy(false)
      return
    }
    const themeName = LAYOUT_THEMES.find((t) => t.value === layoutTheme)?.label || layoutTheme
    const title = collectionHeading || 'Game Sanctuary'
    const ratioLabel = aspectRatio === 'auto' ? 'Full Grid' : aspectRatio
    setNoticeTone('info')
    setNotice(`Rendering ${title} showcase (${count} titles in ${themeName} theme, ${ratioLabel})...`)
    await new Promise((resolve) => setTimeout(resolve, 160))
    try {
      const collageDataUrl = await generateBragCollage(filteredGames, stats, {
        layoutTheme,
        colorPalette,
        viewTitle: title,
        aspectRatio,
      })
      const cleanHeading = title.replace(/[^a-zA-Z0-9_-]/g, '_')
      const ratioSuffix = aspectRatio === 'auto' ? 'full' : aspectRatio.replace(':', 'x')
      const prefix = `Logpile-Showcase-${cleanHeading}-${layoutTheme}-${ratioSuffix}`
      const res = await api.window?.saveBragCollage?.(collageDataUrl, prefix)
      if (res?.success) {
        const fileName = res.filePath ? res.filePath.split(/[/\\]/).pop() : `${prefix}.png`
        setNoticeTone('success')
        setNotice(`Saved 4K showcase (${ratioLabel}) to captures: ${fileName} (copied to clipboard!)`)
      } else {
        throw new Error(res?.error || 'Save failed')
      }
    } catch (err) {
      console.error('Failed to generate showcase collage:', err)
      setNoticeTone('error')
      setNotice(err.message || 'Failed to generate showcase collage.')
    } finally {
      setScreenshotBusy(false)
      setActiveCaptureAction(null)
      window.setTimeout(() => setNotice(''), 6000)
    }
  }

  const handleOpenCapturesFolder = async () => {
    setScreenshotMenuOpen(false)
    try {
      await (api.window?.openCapturesFolder || api.window?.openPicturesFolder)?.()
    } catch (err) {
      console.warn('Failed to open captures folder:', err)
    }
  }
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
    setFocusZone('dossier')
    setDossierSection('actions')
    setDossierActionIndex(0)
    setDossierTabIndex(0)
    setDossierActiveTab('overview')
    setDossierContentRow('jump_in')
    setDossierContentIndex(0)
    setDossierLightboxIndex(null)
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
  const handleCancelGlobalSync = async () => {
    try {
      const result = await api.scraper?.cancelSync?.()
      if (result?.cancelled) {
        setNoticeTone('warning')
        setNotice('Sync cancellation requested.')
        window.setTimeout(() => setNotice(''), 3000)
      }
    } catch (err) {
      console.warn('Failed to cancel sync:', err)
    }
  }
  const handleCancelSync = handleCancelGlobalSync
  const handlePurge = async () => { setPurgeBusy(true); try { const result = await api.database.purgeLibrary(); setPurgeOpen(false); setGames([]); setHiddenGames([]); setActiveGame(null); setSourceFilters([]); setStats({ ...EMPTY_LIBRARY_STATS }); setNoticeTone('success'); setNotice(`Library purged: ${result.deletedGames} records removed. Artwork cache preserved.`); await loadData(); window.setTimeout(() => setNotice(''), 5000) } catch (error) { setNoticeTone('error'); setNotice(error.message || 'Library purge failed.') } finally { setPurgeBusy(false) } }
  const loadData = async ({ preserveScroll = false } = {}) => {
    const scrollTop = preserveScroll ? mainScrollRef.current?.scrollTop || 0 : null
    if (!preserveScroll && !games.length) setLoading(true)
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
      setActiveGame((current) => {
        if (!current) return current;
        const updated = consolidated.find((g) => g.id === current.id);
        return updated ? { ...current, ...updated } : current;
      });

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
    } catch (error) {
      setNotice(error.message || 'Unable to read the local library database.')
    } finally {
      setLoading(false)
      setDataLoaded(true)
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

  const handleToggleFavorite = useCallback(async (game) => {
    if (!game) return
    const nextFav = !game.is_favorite
    const updatedGame = { ...game, is_favorite: nextFav }
    setActiveGame((prev) => (prev?.id === game.id ? { ...prev, ...updatedGame } : prev))
    setGames((prev) => {
      const nextGames = prev.map((g) => (g.id === game.id ? { ...g, ...updatedGame } : g))
      const remainingFavs = nextGames.filter((g) => g.is_favorite && !g.is_utility && !g.is_dlc).length
      if (remainingFavs === 0 && view === 'favorites') {
        setView('installed')
      }
      return nextGames
    })
    setNoticeTone('success')
    setNotice(nextFav ? `Added "${game.canonical_title}" to favorites.` : `Removed "${game.canonical_title}" from favorites.`)
    window.setTimeout(() => setNotice(''), 3000)
    try {
      await api.database.updateGameMetadata(game.id, { is_favorite: nextFav ? 1 : 0 })
      await loadData({ preserveScroll: true })
    } catch (err) {
      console.error('Failed to update favorite status:', err)
      setNoticeTone('error')
      setNotice(err.message || 'Failed to update favorite.')
    }
  }, [loadData, view])
  useEffect(() => { loadData() }, [view, sortKey, qualityFilters]); useEffect(() => { const close = (e) => { setContextMenu(null); if (bragMenuRef.current && bragMenuRef.current.contains(e.target)) return; if (bragDropdownRef.current && bragDropdownRef.current.contains(e.target)) return; setScreenshotMenuOpen(false); }; window.addEventListener('pointerdown', close); window.addEventListener('click', close); window.addEventListener('contextmenu', close); window.addEventListener('scroll', close, true); return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('click', close); window.removeEventListener('contextmenu', close); window.removeEventListener('scroll', close, true) } }, []);
  useEffect(() => {
    if (!screenshotMenuOpen) return
    const handleReposition = () => updateBragMenuPosition()
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [screenshotMenuOpen, updateBragMenuPosition]); useLayoutEffect(() => { if (!contextMenu || !contextMenuRef.current) return; const bounds = contextMenuRef.current.getBoundingClientRect(); const menuWidth = bounds.width || MENU_WIDTH; const menuHeight = bounds.height || MENU_HEIGHT; const anchorX = contextMenu.anchorX; const anchorY = contextMenu.anchorY; const left = anchorX + menuWidth > window.innerWidth ? Math.max(MENU_PADDING, window.innerWidth - menuWidth - MENU_PADDING) : anchorX; const top = anchorY + menuHeight > window.innerHeight ? Math.max(MENU_PADDING, anchorY - menuHeight) : anchorY; const clampedLeft = Math.max(MENU_PADDING, Math.min(left, Math.max(MENU_PADDING, window.innerWidth - menuWidth - MENU_PADDING))); const clampedTop = Math.max(MENU_PADDING, Math.min(top, Math.max(MENU_PADDING, window.innerHeight - menuHeight - MENU_PADDING))); if (clampedLeft !== contextMenu.x || clampedTop !== contextMenu.y) setContextMenu((current) => current ? { ...current, x: clampedLeft, y: clampedTop } : current) }, [contextMenu]); useEffect(() => { const offArtwork = api.scraper.onUpdated?.(() => loadData({ preserveScroll: true })); const offLibrary = api.database.onUpdated?.(() => loadData({ preserveScroll: true })); return () => { offArtwork?.(); offLibrary?.() } }, [view, sortKey, qualityFilters]); useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query), 150); return () => clearTimeout(timer) }, [query]); useEffect(() => { localStorage.setItem('logpile-layout-theme', layoutTheme) }, [layoutTheme]);
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

  useEffect(() => {
    let isMounted = true
    api.scraper?.isSyncing?.().then((res) => {
      if (isMounted && res?.syncing) {
        setGlobalSyncRunning(true)
      }
    }).catch(() => {})

    const offProgress = api.scraper?.onProgress?.((p) => {
      if (!isMounted) return
      const norm = normalizeSyncProgress(p)
      if (norm?.phase === 'complete') {
        setGlobalSyncRunning(false)
        setGlobalSyncProgress(null)
        if (norm.message) {
          setNoticeTone('success')
          setNotice(norm.message)
        }
      } else {
        setGlobalSyncRunning(true)
        setGlobalSyncProgress(norm)
      }
    })
    return () => {
      isMounted = false
      offProgress?.()
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    if (window.api?.guides?.getStatus) {
      window.api.guides.getStatus().then((st) => {
        if (isMounted && st?.running) {
          setGuideSyncStatus(st)
        }
      }).catch(() => {})
    }
    const unsub = window.api?.guides?.onBatchProgress?.((data) => {
      if (!isMounted) return
      if (data && typeof data.running === 'boolean') {
        setGuideSyncStatus(data)
      } else if (data) {
        setGuideSyncStatus({ running: true, progress: data })
      } else {
        setGuideSyncStatus({ running: false, progress: null })
      }
    })
    return () => {
      isMounted = false
      if (typeof unsub === 'function') unsub()
    }
  }, [])
  const handleBackToLibrary = useCallback(() => {
    const origin = navOriginRef.current || { view: 'all', source: 'grid', scrollTop: 0 }
    const targetGameId = activeGame?.id || lastClickedGameIdRef.current

    setActiveGame(null)
    setViewMode('grid')
    setFocusZone('grid')
    setDossierSection('actions')
    setDossierActionIndex(0)
    setDossierLightboxIndex(null)
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
      } else if (matchesShortcut(e, consoleModeShortcut) || e.key === 'F11' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'f' || e.key === 'F'))) {
        e.preventDefault()
        handleToggleBigPicture()
      } else if (e.key === 'Escape') {
        if (document.querySelector('.lightbox-backdrop, .modal-backdrop, .hero-dropdown-menu, .status-dropdown-menu, .custom-dropdown-portal, .art-context-menu, .settings-modal-backdrop')) {
          return
        }
        if (isDetailView) {
          playBackClick()
          handleBackToLibrary()
        } else if (isBigPictureMode && allowEscExitConsole) {
          playBackClick()
          handleToggleBigPicture(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDetailView, handleBackToLibrary, isBigPictureMode, handleToggleBigPicture, consoleModeShortcut, allowEscExitConsole])
  const genres = useMemo(() => [...new Set(games.flatMap((game) => String(game.genres || game.genre || '').split(',').map((genre) => genre.trim()).filter(Boolean)))].sort(), [games]); const sourceOptions = useMemo(() => {
    const isInstalledView = view === 'installed' || view === 'today'
    return sourceOptionsForGames(isInstalledView ? games.filter((g) => g.is_installed && !g.is_utility && !g.is_dlc) : games, isInstalledView)
  }, [games, view])
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
  const timeOptions = useMemo(() => [
    { value: 'all', label: 'All playtimes' },
    { value: 'under5', label: '< 5 Hours (Bite-sized)' },
    { value: '5to20', label: '5 – 20 Hours (Standard)' },
    { value: '20to50', label: '20 – 50 Hours (Long)' },
    { value: '50plus', label: '50+ Hours (Epic)' },
  ], [])
  const issueCounts = useMemo(() => {
    let missingArt = 0
    let missingId = 0
    let missingGuide = 0
    for (const g of games) {
      if (g.is_utility || g.is_dlc) continue
      const art = String(g.cover_url ?? '').trim().toLowerCase()
      if (!art || art === 'null' || art === 'undefined' || failedImageIds.has(g.id)) {
        missingArt++
      }
      const id = String(g.steamgriddb_id ?? '').trim().toLowerCase()
      if (!id || id === 'null' || id === 'undefined') {
        missingId++
      }
      if (!g.has_guide) {
        missingGuide++
      }
    }
    const anyIssue = games.filter((g) => {
      if (g.is_utility || g.is_dlc) return false
      const art = String(g.cover_url ?? '').trim().toLowerCase()
      const hasNoArt = !art || art === 'null' || art === 'undefined' || failedImageIds.has(g.id)
      const id = String(g.steamgriddb_id ?? '').trim().toLowerCase()
      const hasNoId = !id || id === 'null' || id === 'undefined'
      return hasNoArt || hasNoId || !g.has_guide
    }).length
    return { missingArt, missingId, missingGuide, anyIssue }
  }, [games, failedImageIds])

  const qualityOptions = useMemo(() => [
    { value: 'all', label: 'All titles (No filter)', triggerLabel: 'Missing Details' },
    { value: 'missingArtwork', label: 'Missing Artwork', triggerLabel: 'Missing Artwork', badge: issueCounts.missingArt > 0 ? String(issueCounts.missingArt) : undefined },
    { value: 'missingIds', label: 'Missing Database IDs', triggerLabel: 'Missing IDs', badge: issueCounts.missingId > 0 ? String(issueCounts.missingId) : undefined },
    { value: 'missingGuide', label: 'Missing Strategy Guides', triggerLabel: 'Missing Guide', badge: issueCounts.missingGuide > 0 ? String(issueCounts.missingGuide) : undefined },
    { value: 'anyIssue', label: 'Any Missing Details', triggerLabel: 'Any Missing', badge: issueCounts.anyIssue > 0 ? String(issueCounts.anyIssue) : undefined },
  ], [issueCounts])

  const currentQualityValue = useMemo(() => {
    if (!qualityFilters || qualityFilters.length === 0) return 'all'
    if (qualityFilters.includes('anyIssue')) return 'anyIssue'
    if (qualityFilters.includes('missingArtwork')) return 'missingArtwork'
    if (qualityFilters.includes('missingIds')) return 'missingIds'
    if (qualityFilters.includes('missingGuide')) return 'missingGuide'
    return 'all'
  }, [qualityFilters])

  const handleQualityChange = useCallback((val) => {
    if (!val || val === 'all') {
      setQualityFilters([])
    } else {
      setQualityFilters([val])
    }
  }, [])
  const filteredGames = useMemo(() => {
    let result = view === 'hidden' ? strictTitleSearch(hiddenGames, debouncedQuery) : strictTitleSearch(games, debouncedQuery)
    if (view === 'installed' || view === 'today') result = result.filter((game) => game.is_installed && !game.is_utility && !game.is_dlc)
    if (view === 'favorites') result = result.filter((game) => Boolean(game.is_favorite) && !game.is_utility && !game.is_dlc)
    if (view === 'ready') result = result.filter((game) => !game.is_installed && !game.is_utility && !game.is_dlc)
    if (view === 'utilities') result = result.filter((game) => game.is_utility)
    if (view === 'dlc') result = result.filter((game) => game.is_dlc && !game.is_utility)
    if (view !== 'utilities' && view !== 'dlc' && view !== 'system' && view !== 'hidden') result = result.filter((game) => !game.is_utility && !game.is_dlc)
    if (qualityFilters.includes('anyIssue')) {
      result = result.filter((game) => {
        const artwork = String(game.cover_url ?? '').trim().toLowerCase()
        const hasNoArt = !artwork || artwork === 'null' || artwork === 'undefined' || failedImageIds.has(game.id)
        const id = String(game.steamgriddb_id ?? '').trim().toLowerCase()
        const hasNoId = !id || id === 'null' || id === 'undefined'
        return hasNoArt || hasNoId || !game.has_guide
      })
    } else {
      if (qualityFilters.includes('missingArtwork')) {
        result = result.filter((game) => {
          const artwork = String(game.cover_url ?? '').trim().toLowerCase()
          const hasNoArt = !artwork || artwork === 'null' || artwork === 'undefined'
          return hasNoArt || failedImageIds.has(game.id)
        })
      }
      if (qualityFilters.includes('missingIds')) result = result.filter((game) => {
        const id = String(game.steamgriddb_id ?? '').trim().toLowerCase()
        return !id || id === 'null' || id === 'undefined'
      })
      if (qualityFilters.includes('missingGuide')) {
        result = result.filter((game) => !game.has_guide)
      }
    }
    if (sourceFilters.length) {
      const isInstalledView = view === 'installed' || view === 'today'
      result = result.filter((game) => sourceFilters.some((source) => sourceLabelsForGame(game, isInstalledView).some((label) => sourceKey(label) === source)))
    }
    if (genreFilter !== 'all') result = result.filter((game) => String(game.genres || game.genre || '').split(',').map((genre) => genre.trim()).includes(genreFilter))
    if (backlogFilter !== 'all') result = result.filter((game) => game.backlog_status === backlogFilter)
    if (timeFilter === 'under5') result = result.filter((game) => game.hltb_main_hours && game.hltb_main_hours < 5)
    if (timeFilter === '5to20') result = result.filter((game) => game.hltb_main_hours && game.hltb_main_hours >= 5 && game.hltb_main_hours <= 20)
    if (timeFilter === '20to50') result = result.filter((game) => game.hltb_main_hours && game.hltb_main_hours > 20 && game.hltb_main_hours <= 50)
    if (timeFilter === '50plus') result = result.filter((game) => game.hltb_main_hours && game.hltb_main_hours > 50)

    if (aiFilter) {
      try {
        if (aiFilter.genre) {
          const targetGenre = String(aiFilter.genre).toLowerCase()
          result = result.filter((game) => {
            const gStr = String(game?.genres || game?.genre || '').toLowerCase()
            if (targetGenre === 'rpg' || targetGenre.includes('rpg')) {
              return gStr.includes('rpg') || gStr.includes('role-playing')
            }
            return gStr.includes(targetGenre)
          })
        }
        if (typeof aiFilter.max_hltb === 'number' && aiFilter.max_hltb > 0) {
          result = result.filter((game) => {
            return game?.hltb_main_hours && game.hltb_main_hours <= aiFilter.max_hltb
          })
        }
        if (typeof aiFilter.min_hltb === 'number' && aiFilter.min_hltb > 0) {
          result = result.filter((game) => {
            return game?.hltb_main_hours && game.hltb_main_hours >= aiFilter.min_hltb
          })
        }
        if (aiFilter.unplayed === true || aiFilter.status === 'unplayed') {
          result = result.filter((game) => {
            return game?.backlog_status === 'unplayed' || !game?.playtime_seconds || game.playtime_seconds === 0
          })
        } else if (aiFilter.status && aiFilter.status !== 'all') {
          result = result.filter((game) => game?.backlog_status === String(aiFilter.status))
        }
        if (aiFilter.installed === true) {
          result = result.filter((game) => Boolean(game?.is_installed))
        }
        if (aiFilter.favorites === true) {
          result = result.filter((game) => Boolean(game?.is_favorite))
        }
        if (aiFilter.search) {
          const s = String(aiFilter.search).toLowerCase()
          result = result.filter((game) => String(game?.canonical_title || '').toLowerCase().includes(s))
        }
      } catch {}
    }

    return result.sort((a, b) => {
      const titleA = String(a?.canonical_title || '')
      const titleB = String(b?.canonical_title || '')
      if (debouncedQuery.trim()) {
        const rank = titleSearchRank(titleA, debouncedQuery) - titleSearchRank(titleB, debouncedQuery)
        if (rank) return rank
      }
      if (sortKey === 'title-desc') return titleB.localeCompare(titleA)
      if (sortKey === 'size-desc') return (b?.install_size_bytes || 0) - (a?.install_size_bytes || 0)
      if (sortKey === 'drive-asc') return String(a?.drive_letter || 'Z:').localeCompare(String(b?.drive_letter || 'Z:'))
      if (sortKey === 'last-played') return String(b?.last_played || '').localeCompare(String(a?.last_played || ''))
      if (sortKey === 'platform') return platformLabel(sourcePlatforms(a?.sources)[0] || '').localeCompare(platformLabel(sourcePlatforms(b?.sources)[0] || ''))
      return titleA.localeCompare(titleB)
    })
  }, [games, debouncedQuery, view, sourceFilters, genreFilter, backlogFilter, timeFilter, sortKey, qualityFilters, failedImageIds, aiFilter])
  const filteredRecordIds = useMemo(() => [...new Set(filteredGames.flatMap((game) => (game?.variants || [game]).map((variant) => variant?.id).filter(Boolean)))], [filteredGames])
  const isHomeView = !query && !debouncedQuery && !selectMode && !aiFilter && genreFilter === 'all' && backlogFilter === 'all' && timeFilter === 'all' && qualityFilters.length === 0 && sourceFilters.length === 0 && (view === 'all' || view === 'installed')
  const collectionHeading = useMemo(() => {
    if (aiFilter) {
      const parts = []
      if (aiFilter.genre) parts.push(String(aiFilter.genre))
      if (aiFilter.max_hltb) parts.push(`≤ ${aiFilter.max_hltb}h`)
      if (aiFilter.min_hltb) parts.push(`≥ ${aiFilter.min_hltb}h`)
      if (aiFilter.unplayed) parts.push('Unplayed')
      else if (aiFilter.status) parts.push(String(aiFilter.status))
      if (aiFilter.search) parts.push(`"${String(aiFilter.search)}"`)
      return `Smart Filter: ${parts.join(' · ') || 'Active'}`
    }
    if (sourceFilters.length === 1) {
      const found = sourceOptions.find((s) => s.key === sourceFilters[0])
      return found ? found.label : 'Filtered Collection'
    }
    if (sourceFilters.length > 1) {
      return 'Filtered Collection'
    }
    if (view === 'favorites') return 'Favorite Games'
    if (view === 'installed') return 'Installed Games'
    if (view === 'dashboard') return 'Sanctuary Analytics'
    if (view === 'ready') return 'Ready to Install'
    if (view === 'utilities') return 'Utility Tools'
    if (view === 'dlc') return 'DLC & Add-ons'
    if (view === 'hidden') return 'Hidden Apps & Exclusions'
    return 'Full Collection'
  }, [sourceFilters, sourceOptions, view, aiFilter])
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
  const displayFavoriteGames = useMemo(() => games.filter((g) => g.is_favorite && !g.is_utility && !g.is_dlc).length, [games]);
  const displayTotalGames = Math.max(0, stats.visibleGames ?? (stats.totalGames - stats.utilityTools - (stats.dlcGames || 0) - (stats.hiddenGames || 0) - (stats.hiddenDlc || 0))); const displayInstalledGames = Math.max(0, stats.visibleInstalledGames ?? (stats.installedGames - (stats.installedUtilities || 0) - (stats.installedDlc || 0) - (stats.hiddenInstalledGames || 0) - (stats.hiddenInstalledDlc || 0))); const displayDlcGames = Math.max(0, stats.dlcGames || 0); const readyToInstallCount = Math.max(0, Number(stats.readyToInstallCount || 0)); const installedPercent = displayTotalGames ? Math.round((displayInstalledGames / displayTotalGames) * 100) : 0; const vars = themeVars(layoutTheme, colorPalette);

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
    document.documentElement.setAttribute('data-palette', colorPalette)
    document.documentElement.className = `layout-${layoutTheme}${isBigPictureMode ? ' mode-big-picture' : ''}`
    const liveVars = themeVars(layoutTheme, colorPalette)
    Object.entries(liveVars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v)
    })
    try {
      window.api?.theme?.save?.({ layoutTheme, colorPalette })
    } catch {}
  }, [layoutTheme, colorPalette, isBigPictureMode])

  useEffect(() => {
    if (isBigPictureMode) {
      document.documentElement.classList.add('mode-big-picture')
    } else {
      document.documentElement.classList.remove('mode-big-picture')
    }
  }, [isBigPictureMode])

  useEffect(() => {
    const savedCss = getCustomCss()
    if (savedCss) {
      applyCustomCss(savedCss)
    }
    const handleCssChange = (e) => {
      applyCustomCss(e.detail)
    }
    window.addEventListener('logpile-custom-css-changed', handleCssChange)
    return () => window.removeEventListener('logpile-custom-css-changed', handleCssChange)
  }, [])
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
  const handleLaunch = async (game, forceBypassLock = false, bypassRamGuard = false) => {
    if (!bypassRamGuard && window.api?.system?.checkPreLaunch) {
      try {
        const preCheck = await window.api.system.checkPreLaunch()
        if (preCheck?.shouldWarn) {
          const hasHeavy = Array.isArray(preCheck.heavyProcesses) && preCheck.heavyProcesses.length > 0
          const heavyNames = hasHeavy ? preCheck.heavyProcesses.map((p) => p.label).join(', ') : ''
          const msg = [
            preCheck.isLowMemory ? `Available system memory is low (${preCheck.freeMemGb} GB free).` : '',
            hasHeavy ? `Heavy background apps detected: ${heavyNames}.` : '',
            hasHeavy
              ? 'Closing background apps will free up system RAM and prevent in-game stuttering.'
              : 'Launching games with low memory may cause stuttering or frame drops.'
          ].filter(Boolean).join('\n\n')

          setConfirmModal({
            title: 'System Memory & Process Alert',
            eyebrow: 'PRE-LAUNCH HARDWARE GUARD',
            message: msg,
            confirmText: hasHeavy ? 'Close Apps & Launch' : 'Launch Anyway',
            cancelText: hasHeavy ? 'Launch Anyway' : 'Cancel',
            isDanger: false,
            icon: Cpu,
            onConfirm: async () => {
              setConfirmModal(null)
              if (hasHeavy && window.api?.system?.closeHeavyProcesses) {
                await window.api.system.closeHeavyProcesses(preCheck.heavyProcesses.map((p) => p.name))
              }
              handleLaunch(game, forceBypassLock, true)
            },
            onCancel: () => {
              setConfirmModal(null)
              if (hasHeavy) {
                handleLaunch(game, forceBypassLock, true)
              }
            }
          })
          return
        }
      } catch {}
    }
    const lock = getFamilyLockForGame(game, familyLocks)
    if (lock && !forceBypassLock) {
      setConfirmModal({
        title: `${game.canonical_title} is being played`,
        eyebrow: 'STEAM FAMILY IN USE',
        message: `${lock.playerName} is currently playing this shared Steam copy (Steam Family: ${lock.familyGroup}). Launching now may interrupt their active game session or fail if no other copy is available.\n\nDo you want to launch anyway?`,
        confirmText: 'Launch Anyway',
        cancelText: 'Wait & Cancel',
        isDanger: false,
        icon: Users,
        onConfirm: () => {
          setConfirmModal(null)
          handleLaunch(game, true, bypassRamGuard)
        }
      })
      return
    }
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
    if (variant.id && window.api?.saves?.checkConflict) {
      try {
        const conflict = await window.api.saves.checkConflict(variant.id)
        if (conflict?.hasConflict) {
          const msg = conflict.reason === 'missing_local'
            ? `Newer portable save detected for "${game.canonical_title}", but no local save folder exists on this PC yet.\n\nRestore portable save before launching?`
            : `Newer portable save detected for "${game.canonical_title}" (modified more recently than this PC's local files).\n\nRestore portable save to this PC before launching?`
          if (window.confirm(msg)) {
            const rest = await window.api.saves.restore(variant.id, conflict.backupId)
            if (rest?.success) {
              notify(`Portable save restored for ${game.canonical_title}!`)
            } else {
              notify(rest?.error || 'Could not restore save backup.', 'warning')
            }
          }
        }
      } catch {}
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

  const handleAiAction = useCallback(async (actionObj) => {
    if (!actionObj || !actionObj.action) return
    const { action, payload = {} } = actionObj
    const alertUser = (msg, tone = 'success') => {
      setNoticeTone(tone)
      setNotice(msg)
      window.setTimeout(() => setNotice(''), 3500)
    }

    const findGame = (titleQuery) => {
      if (!titleQuery || !games || games.length === 0) return null
      let q = String(titleQuery).trim().toLowerCase()
      // Strip conversational prefixes
      q = q
        .replace(/^(?:i\s+(?:wanna|want\s+to|would\s+like\s+to)|can\s+you|could\s+you|please|pls|let'?s|just|khelna\s+hai)\s+/gi, '')
        .replace(/^(?:check(?:\s+out)?|look\s+at|show(?:\s+me)?|open|view|tell\s+me\s+about|details\s+(?:for|on)?|info\s+(?:on|about)?|dossier\s+(?:for|on)?)\s+/gi, '')
        .replace(/^(?:launch|play|start|run|boot)\s+/gi, '')
        .trim()

      // 1. Exact match
      let match = games.find((g) => (g.canonical_title || '').toLowerCase() === q)
      if (match) return match

      // 2. Cleaned query (remove noise words 'game', 'the', 'edition', 'details', 'dossier', 'launch', etc.)
      const noise = /\b(?:the|a|an|game|games|video game|khel|khelo|play|launch|open|view|show|check|details|dossier|page|edition|goty|remastered|deluxe|please|pls|info)\b/gi
      const cleanQ = q.replace(noise, ' ').replace(/[:–—\-_"']/g, ' ').replace(/\s+/g, ' ').trim()
      if (cleanQ && cleanQ !== q) {
        match = games.find((g) => (g.canonical_title || '').toLowerCase() === cleanQ)
        if (match) return match
      }

      // 3. Normalized title match
      const normQ = (cleanQ || q).replace(/[^a-z0-9]/g, '')
      if (normQ) {
        match = games.find((g) => (g.canonical_title || '').toLowerCase().replace(/[^a-z0-9]/g, '') === normQ)
        if (match) return match
      }

      // 4. Substring inclusion
      const searchTarget = cleanQ && cleanQ.length >= 3 ? cleanQ : q
      match = games.find((g) => (g.canonical_title || '').toLowerCase().includes(searchTarget))
      if (match) return match
      match = games.find((g) => searchTarget.includes((g.canonical_title || '').toLowerCase()))
      if (match) return match

      // 5. Token overlap
      const tokens = (cleanQ || q).split(/\s+/).filter((t) => t.length > 2)
      if (tokens.length > 0) {
        match = games.find((g) => {
          const t = (g.canonical_title || '').toLowerCase()
          return tokens.every((tok) => t.includes(tok))
        })
      }
      return match || null
    }

    switch (action) {
      case 'LAUNCH_GAME': {
        const gameTargetId = payload.id || payload.gameId
        let target = (gameTargetId ? games.find((g) => g.id === gameTargetId) : null) || findGame(payload.title)
        if (!target && payload.title && window.api?.database?.resolveGameByQuery) {
          try {
            const resolved = await window.api.database.resolveGameByQuery(payload.title)
            if (resolved?.id) {
              target = games.find((g) => g.id === resolved.id) || resolved
            }
          } catch {}
        }
        if (!target) target = activeGame
        if (target) {
          alertUser(`AI Companion: Launching ${target.canonical_title}...`)
          handleLaunch(target)
        } else {
          alertUser(`Could not find "${payload.title || 'game'}" in your library.`, 'warning')
        }
        break
      }
      case 'VIEW_DOSSIER':
      case 'VIEW_DETAILS': {
        const gameTargetId = payload.id || payload.gameId
        let target = (gameTargetId ? games.find((g) => g.id === gameTargetId) : null) || findGame(payload.title)
        if (!target && payload.title && window.api?.database?.resolveGameByQuery) {
          try {
            const resolved = await window.api.database.resolveGameByQuery(payload.title)
            if (resolved?.id) {
              target = games.find((g) => g.id === resolved.id) || resolved
            }
          } catch {}
        }
        if (!target) target = activeGame
        if (target) {
          alertUser(`AI Companion: Opening ${target.canonical_title}`)
          handleSelectGame(target, 'ai')
        } else {
          alertUser(`Could not find "${payload.title || 'game'}" in your library.`, 'warning')
        }
        break
      }
      case 'FILTER_SEARCH': {
        const q = payload.query || ''
        setQuery(q)
        if (isDetailView) {
          handleBackToLibrary()
        }
        alertUser(`AI Companion: Searching for "${q}"`)
        break
      }
      case 'FILTER_GENRE': {
        const g = payload.genre || 'all'
        setGenreFilter(g)
        if (isDetailView) {
          handleBackToLibrary()
        }
        alertUser(`AI Companion: Filtered genre to ${g}`)
        break
      }
      case 'FILTER_STATUS': {
        const s = payload.status || 'all'
        setBacklogFilter(s)
        if (isDetailView) {
          handleBackToLibrary()
        }
        alertUser(`AI Companion: Filtered backlog to ${s}`)
        break
      }
      case 'SWITCH_VIEW': {
        let v = String(payload.view || 'all').toLowerCase().trim()
        if (v === 'settings' || v === 'settigns' || v === 'config' || v === 'prefs' || v === 'preferences' || v === 'options' || v === 'system') {
          setSettingsModalTab('general')
          setSettingsModalOpen(true)
          alertUser(`AI Companion: Opened Settings`)
          break
        }
        if (v === 'about') {
          setSettingsModalTab('about')
          setSettingsModalOpen(true)
          alertUser(`AI Companion: Opened About Logpile`)
          break
        }
        if (v === 'library') v = 'all'
        setSidebarView(v)
        alertUser(`AI Companion: Switched view to ${v}`)
        break
      }
      case 'SCAN_LIBRARY': {
        alertUser('AI Companion: Triggering library scan...')
        if (window.api?.scanner?.scanAll) {
          window.api.scanner.scanAll().catch((err) => {
            console.warn('Scan error:', err)
          })
        }
        break
      }
      case 'SYNC_HLTB': {
        const forceAll = Boolean(payload.forceAll)
        alertUser(forceAll ? 'AI Companion: Updating story hours for all games...' : 'AI Companion: Fetching missing story hours...')
        if (window.api?.games?.syncHltb) {
          window.api.games.syncHltb({ forceAll }).then((res) => {
            if (res?.synced > 0) {
              alertUser(`Synced story hours for ${res.synced} games!`)
              loadData({ preserveScroll: true })
            }
          }).catch((err) => {
            console.warn('HLTB sync error:', err)
          })
        }
        break
      }
      default:
        console.warn('Unknown AI action:', action)
    }
  }, [games, activeGame, isDetailView, handleLaunch, handleSelectGame, handleBackToLibrary, setQuery, setGenreFilter, setBacklogFilter, setSidebarView])

  // Voice Command & Hands-Free Audio listener
  useEffect(() => {
    if (!window.api?.voice?.onRecognized) return
    const unbindRecognized = window.api.voice.onRecognized(async (data) => {
      if (!data?.text) return
      if (data.isWakeWord) {
        setNoticeTone('info')
        setNotice('🎙️ "Hey Logpile" detected — listening...')
        speakConfirmation('Yes?')
        return
      }

      setNoticeTone('info')
      setNotice(`🎙️ "${data.text}"`)

      if (aiDrawerOpen) {
        return
      }

      try {
        const aiStatus = await window.api?.ai?.getStatus?.()
        if (aiStatus && !aiStatus.installed && !aiStatus.ready) {
          setNoticeTone('warning')
          setNotice('AI model not installed. Open AI Companion to download.')
          speakConfirmation('AI model is not installed.')
          return
        }

        const answer = await window.api?.ai?.askQuestion?.(data.text, activeGame?.canonical_title || '', {
          theme: layoutTheme,
        })
        const isUserQuestion = /\?/.test(data.text) || /\b(?:how|where|what|why|who|when|which|whose|stuck|guide|help|walkthrough|solve|beat|defeat|kill|find|locate|get out|pass|progress|puzzle|boss|mission|quest|tip|tips|advice)\b/i.test(data.text)
        const { action, text: cleanText } = parseAiResponse(answer, isUserQuestion)
        if (action) {
          handleAiAction(action)
          if (action.action === 'LAUNCH_GAME' && (action.payload?.title || activeGame?.canonical_title)) {
            speakConfirmation(`Launching ${action.payload?.title || activeGame?.canonical_title}`)
          } else if (action.action === 'SWITCH_VIEW') {
            speakConfirmation(`Opening ${action.payload?.view}`)
          } else if (action.action === 'FILTER_GENRE' || action.action === 'FILTER_STATUS') {
            speakConfirmation(`Filtering ${action.payload?.genre || action.payload?.status} titles`)
          } else if (action.action === 'SCAN_LIBRARY') {
            speakConfirmation('Scanning library')
          }
        } else {
          setAiDrawerOpen(true)
          if (cleanText) speakConfirmation(cleanText)
        }
      } catch {}
    })

    const unbindState = window.api?.voice?.onStateChange?.((state) => {
      if (state && typeof state.isListening === 'boolean') {
        setIsVoiceListening(state.isListening)
      }
    })

    return () => {
      unbindRecognized?.()
      unbindState?.()
    }
  }, [activeGame, handleAiAction, layoutTheme])

  const toggleVoiceListening = useCallback(async () => {
    if (isVoiceListening) {
      await window.api?.voice?.stop?.()
      setIsVoiceListening(false)
      setNoticeTone('info')
      setNotice('🎙️ Voice listening stopped.')
      setTimeout(() => setNotice(''), 2000)
    } else {
      const res = await window.api?.voice?.start?.()
      if (res?.success) {
        setIsVoiceListening(true)
        setNoticeTone('info')
        setNotice('🎙️ Listening... (say "Launch [game]" or "Open settings")')
      } else {
        setNoticeTone('warning')
        setNotice('Microphone not available.')
        setTimeout(() => setNotice(''), 3000)
      }
    }
  }, [isVoiceListening])

  // --- 2D Spatial Focus Engine State ---
  const [focusZone, setFocusZone] = useState('grid') // 'grid' | 'sidebar' | 'topbar' | 'spotlight' | 'jump_in' | 'dossier' | 'settings'
  const [sidebarFocusIndex, setSidebarFocusIndex] = useState(0)
  const [topbarFocusIndex, setTopbarFocusIndex] = useState(0) // 0: search, 1: brag, 2: console, 3: theme
  const [bragFocusIndex, setBragFocusIndex] = useState(0)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [themeFocusIndex, setThemeFocusIndex] = useState(0)
  const [spotlightFocusIndex, setSpotlightFocusIndex] = useState(0)
  const [jumpInFocusIndex, setJumpInFocusIndex] = useState(0)
  const [gamepadIndex, setGamepadIndex] = useState(0)

  const handleGamepadNavigateRef = useRef(null)
  const handleGamepadActionRef = useRef(null)

  const { connectedGamepad, isGamepadMode, activateGamepadMode } = useGamepad({
    enabled: !isGameRunning,
    onNavigate: (dir) => handleGamepadNavigateRef.current?.(dir),
    onAction: (code) => handleGamepadActionRef.current?.(code),
    onStatusChange: (statusMsg) => {
      setNoticeTone('info')
      setNotice(statusMsg)
      setTimeout(() => setNotice(''), 3000)
    },
  })
  const [dossierSection, setDossierSection] = useState('actions') // 'actions' | 'tabs' | 'content'
  const [dossierActionIndex, setDossierActionIndex] = useState(0)
  const [dossierTabIndex, setDossierTabIndex] = useState(0)
  const [dossierActiveTab, setDossierActiveTab] = useState('overview')
  const [dossierContentRow, setDossierContentRow] = useState('jump_in') // 'jump_in' | 'franchise' | 'media' | 'related_preview'
  const [dossierContentIndex, setDossierContentIndex] = useState(0)
  const [dossierLightboxIndex, setDossierLightboxIndex] = useState(null)
  const dossierInfoRef = useRef({})
  const SETTINGS_TAB_IDS = useMemo(() => [
    'general', 'themes', 'shortcuts', 'hud', 'theme-studio',
    'ai', 'metadata', 'system', 'gamepad', 'backups', 'hidden', 'about'
  ], [])
  const [settingsSection, setSettingsSection] = useState('categories') // 'categories' | 'content'
  const [settingsCategoryIndex, setSettingsCategoryIndex] = useState(0)
  const [settingsContentIndex, setSettingsContentIndex] = useState(0)

  const handleOpenSettings = useCallback((tab = 'general') => {
    setSettingsModalTab(tab)
    const idx = SETTINGS_TAB_IDS.indexOf(tab)
    setSettingsCategoryIndex(idx >= 0 ? idx : 0)
    setSettingsSection('categories')
    setSettingsContentIndex(0)
    setFocusZone('settings')
    setSettingsModalOpen(true)
  }, [SETTINGS_TAB_IDS])

  const [gamepadGlyphStyle, setGamepadGlyphStyle] = useState(() => {
    try {
      return localStorage.getItem('logpile_gamepad_glyph_style') || 'auto'
    } catch {
      return 'auto'
    }
  })

  const handleGamepadGlyphStyleChange = useCallback((newStyle) => {
    setGamepadGlyphStyle(newStyle)
    try {
      localStorage.setItem('logpile_gamepad_glyph_style', newStyle)
    } catch {}
  }, [])

  const [consoleAudioEnabled, setConsoleAudioEnabledState] = useState(() => isConsoleAudioEnabled())

  const handleToggleConsoleAudio = useCallback((enabled) => {
    setConsoleAudioEnabledState(enabled)
    setConsoleAudioEnabled(enabled)
    if (enabled) {
      playSelectChime()
    }
  }, [])

  const [oskOpen, setOskOpen] = useState(false)
  const [oskRow, setOskRow] = useState(1) // Row 1: QWERTY
  const [oskCol, setOskCol] = useState(0) // 'Q'

  const [spotlightState, setSpotlightState] = useState({
    featured: null,
    candidates: [],
    suggested: [],
    shuffle: null,
    setActiveIndex: null,
  })

  const allThemesList = useMemo(() => {
    try {
      const enabled = getEnabledAddonIds()
      const custom = getCustomThemes().filter((a) => enabled.includes(a.id)).map((a) => ({
        value: a.id,
        label: a.name,
      }))
      return [...LAYOUT_THEMES, ...custom]
    } catch {
      return LAYOUT_THEMES
    }
  }, [])

  // Sync focusZone when detail view or settings modal opens/closes
  useEffect(() => {
    if (settingsModalOpen) {
      setFocusZone('settings')
    } else if (isDetailView) {
      setFocusZone('dossier')
    } else {
      setFocusZone((prev) => (prev === 'dossier' || prev === 'settings' ? 'grid' : prev))
    }
  }, [settingsModalOpen, isDetailView])

  // Automatically uncollapse sidebar if navigated into with controller
  useEffect(() => {
    if (focusZone === 'sidebar' && sidebarCollapsed) {
      setSidebarCollapsed(false)
    }
  }, [focusZone, sidebarCollapsed])

  const allSidebarNavItems = useMemo(() => {
    const list = [
      { id: 'installed', key: 'installed', action: () => { setSidebarView('installed'); setFocusZone('grid'); setGamepadIndex(0); } },
    ]
    if (displayFavoriteGames > 0) {
      list.push({ id: 'favorites', key: 'favorites', action: () => { setSidebarView('favorites'); setFocusZone('grid'); setGamepadIndex(0); } })
    }
    list.push({ id: 'all', key: 'all', action: () => { setSidebarView('all'); setFocusZone('grid'); setGamepadIndex(0); } })
    if (workspaceItems && workspaceItems.length) {
      workspaceItems.forEach((w) => {
        list.push({ id: w.key, key: w.key, action: () => { setSidebarView(w.key); setFocusZone('grid'); setGamepadIndex(0); } })
      })
    }
    list.push({ id: 'today', key: 'today', action: () => { setSidebarView('today'); setFocusZone('grid'); setGamepadIndex(0); } })
    list.push({ id: 'dashboard', key: 'dashboard', action: () => { setSidebarView('dashboard'); setFocusZone('grid'); setGamepadIndex(0); } })
    if (isAiAvailable) {
      list.push({ id: 'ai_companion', key: 'ai_companion', action: () => setAiDrawerOpen((prev) => !prev) })
    }

    list.push({ id: 'source_all', key: 'source_all', action: () => { setSourceFilters([]); setViewMode('grid'); if (view === 'system' || view === 'today') setSidebarView('all'); setFocusZone('grid'); setGamepadIndex(0); } })
    if (sourceOptions && sourceOptions.length) {
      sourceOptions.forEach((s) => {
        list.push({ id: `source_${s.key}`, key: s.key, action: () => { toggleSource(s.key); setViewMode('grid'); if (view === 'system' || view === 'today') setSidebarView('all'); setFocusZone('grid'); setGamepadIndex(0); } })
      })
    }
    list.push({ id: 'settings', key: 'settings', action: () => handleOpenSettings('general') })
    return list
  }, [workspaceItems, sourceOptions, view, toggleSource, setSidebarView, setAiDrawerOpen, handleOpenSettings, displayFavoriteGames, isAiAvailable])

  const isSidebarItemFocused = useCallback((id) => {
    return isGamepadMode && focusZone === 'sidebar' && allSidebarNavItems[sidebarFocusIndex]?.id === id
  }, [isGamepadMode, focusZone, allSidebarNavItems, sidebarFocusIndex])

  useEffect(() => {
    if (gamepadIndex >= filteredGames.length && filteredGames.length > 0) {
      setGamepadIndex(filteredGames.length - 1)
    }
  }, [filteredGames.length, gamepadIndex])

  const cycleGameStatus = useCallback(async (targetGame) => {
    if (!targetGame) return
    const cur = String(targetGame.status || targetGame.backlog_status || 'unplayed').toLowerCase()
    const STATUS_ORDER = ['unplayed', 'playing', 'paused', 'completed']
    const currentStatus = cur === 'dropped' ? 'paused' : (STATUS_ORDER.includes(cur) ? cur : 'unplayed')
    const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(currentStatus) + 1) % STATUS_ORDER.length]
    const labelMap = { unplayed: 'Unplayed', playing: 'Playing', paused: 'On Pause', completed: 'Completed' }
    const completedAt = nextStatus === 'completed' ? new Date().toISOString() : null
    const backlogVal = nextStatus === 'paused' ? 'playing' : nextStatus

    setNoticeTone('success')
    setNotice(`Marked "${targetGame.canonical_title}" as ${labelMap[nextStatus]}.`)
    window.setTimeout(() => setNotice(''), 3000)

    try {
      const updateFn = api.database?.updateGameStatus || api.updateGameStatus
      let updated = null
      if (updateFn) {
        updated = await updateFn(targetGame.id, nextStatus)
      } else {
        updated = await api.database.updateGameMetadata(targetGame.id, {
          status: nextStatus,
          backlog_status: backlogVal,
          completed_at: completedAt,
        })
      }
      if (updated && typeof updated === 'object') {
        setActiveGame((prev) => (prev?.id === targetGame.id ? { ...prev, ...updated } : prev))
        setGames((prev) => prev.map((g) => (g.id === targetGame.id ? { ...g, ...updated } : g)))
      }
      await loadData({ preserveScroll: true })
    } catch (err) {
      console.error('Failed to cycle status:', err)
    }
  }, [loadData])

  const getGridColumns = useCallback(() => {
    if (typeof window === 'undefined') return 4
    const w = window.innerWidth
    if (isBigPictureMode) {
      return w >= 1600 ? 5 : w >= 1180 ? 4 : w >= 780 ? 3 : 2
    }
    return w >= 1180 ? 5 : w >= 880 ? 4 : w >= 600 ? 3 : 2
  }, [isBigPictureMode])

  const bragMenuItems = useMemo(() => [
    { id: 'fullpage', action: handleCaptureFullPage },
    { id: 'screen', action: handleCaptureScreen },
    { id: 'showcase_auto', action: () => handleCaptureFilteredShowcase('auto') },
    { id: 'showcase_16_9', action: () => handleCaptureFilteredShowcase('16:9') },
    { id: 'showcase_9_16', action: () => handleCaptureFilteredShowcase('9:16') },
    { id: 'showcase_1_1', action: () => handleCaptureFilteredShowcase('1:1') },
    { id: 'open_folder', action: handleOpenCapturesFolder },
  ], [handleCaptureFullPage, handleCaptureScreen, handleCaptureFilteredShowcase, handleOpenCapturesFolder])

  const handleGamepadNavigate = useCallback((direction) => {
    playNavTick()
    if (aiDrawerOpen) {
      if (direction === 'up' || direction === 'down' || direction === 'left' || direction === 'right') {
        window.dispatchEvent(new CustomEvent('logpile-ai-gamepad-navigate', { detail: { direction } }))
      }
      return
    }
    // Zone: On-Screen Virtual Couch Keyboard Navigation
    if (oskOpen) {
      const totalRows = KEYBOARD_LAYOUT.length
      const currentRowLength = KEYBOARD_LAYOUT[oskRow]?.length || 1

      if (direction === 'up') {
        if (oskRow === -1) {
          return
        }
        if (oskRow === 0) {
          setOskRow(-1)
          return
        }
        if (oskRow > 0) {
          const prevRow = oskRow - 1
          const prevRowLength = KEYBOARD_LAYOUT[prevRow].length
          let nextCol = oskCol
          if (oskRow === 4) {
            const mapping = [2, 5, 7, 9]
            nextCol = mapping[oskCol] || 0
          } else {
            nextCol = Math.min(prevRowLength - 1, oskCol)
          }
          setOskRow(prevRow)
          setOskCol(nextCol)
        }
        return
      }

      if (direction === 'down') {
        if (oskRow === -1) {
          setOskRow(0)
          setOskCol((prev) => Math.min(KEYBOARD_LAYOUT[0].length - 1, Math.max(0, prev ?? 9)))
          return
        }
        if (oskRow < totalRows - 1) {
          const nextRow = oskRow + 1
          let nextCol = oskCol
          if (nextRow === 4) {
            if (oskCol <= 3) nextCol = 0
            else if (oskCol <= 6) nextCol = 1
            else if (oskCol <= 8) nextCol = 2
            else nextCol = 3
          } else {
            const nextRowLength = KEYBOARD_LAYOUT[nextRow].length
            nextCol = Math.min(nextRowLength - 1, oskCol)
          }
          setOskRow(nextRow)
          setOskCol(nextCol)
        }
        return
      }

      if (direction === 'left') {
        if (oskRow === -1) return
        setOskCol((prev) => (prev > 0 ? prev - 1 : currentRowLength - 1))
        return
      }

      if (direction === 'right') {
        if (oskRow === -1) return
        setOskCol((prev) => (prev < currentRowLength - 1 ? prev + 1 : 0))
        return
      }
      return
    }

    // Zone: Settings Modal Navigation
    if (settingsModalOpen) {
      if (settingsSection === 'categories') {
        const totalCats = SETTINGS_TAB_IDS.length
        if (direction === 'up') {
          setSettingsCategoryIndex((prev) => {
            const next = Math.max(0, prev - 1)
            setSettingsModalTab(SETTINGS_TAB_IDS[next])
            return next
          })
        } else if (direction === 'down') {
          setSettingsCategoryIndex((prev) => {
            const next = Math.min(totalCats - 1, prev + 1)
            setSettingsModalTab(SETTINGS_TAB_IDS[next])
            return next
          })
        } else if (direction === 'right') {
          setSettingsSection('content')
          setSettingsContentIndex(0)
        }
        return
      }

      if (settingsSection === 'content') {
        const pane = document.querySelector('.settings-body .settings-tab-pane')
        const items = pane ? Array.from(pane.querySelectorAll(`
          .settings-toggle-row,
          button:not([disabled]):not(.settings-tab-btn):not(.settings-toggle-row button),
          input:not([disabled]),
          select:not([disabled]),
          textarea:not([disabled])
        `)) : []
        const totalContent = items.length

        if (direction === 'left') {
          setSettingsSection('categories')
          return
        }

        if (direction === 'up') {
          if (settingsContentIndex <= 0) {
            setSettingsSection('categories')
          } else {
            setSettingsContentIndex((prev) => Math.max(0, prev - 1))
          }
          return
        }

        if (direction === 'down') {
          if (totalContent > 0) {
            setSettingsContentIndex((prev) => Math.min(totalContent - 1, prev + 1))
          }
          return
        }
      }
      return
    }

    // Zone: Game Dossier Detail Navigation (isDetailView)
    if (isDetailView) {
      const info = dossierInfoRef.current || {}
      const hasJumpIn = Boolean(info.hasJumpBackIn)
      const franchiseCount = info.franchiseGames?.length || 0
      const mediaCount = Math.min(4, info.screenshotItems?.length || 0)
      const relatedPreviewCount = Math.min(6, info.relatedGames?.length || 0)
      const allScreenshotsCount = info.screenshotItems?.length || 0
      const allRelatedCount = info.relatedGames?.length || 0

      // If Lightbox is active, Left/Right browses screenshots
      if (dossierLightboxIndex !== null) {
        if (allScreenshotsCount > 0) {
          if (direction === 'left') {
            setDossierLightboxIndex((prev) => (prev > 0 ? prev - 1 : allScreenshotsCount - 1))
          } else if (direction === 'right') {
            setDossierLightboxIndex((prev) => (prev < allScreenshotsCount - 1 ? prev + 1 : 0))
          }
        }
        return
      }

      // Section: Actions Row
      if (dossierSection === 'actions') {
        const totalActions = 8
        if (direction === 'left') {
          setDossierActionIndex((prev) => Math.max(0, prev - 1))
        } else if (direction === 'right') {
          setDossierActionIndex((prev) => Math.min(totalActions - 1, prev + 1))
        } else if (direction === 'down') {
          setDossierSection('tabs')
        }
        return
      }

      // Section: Tabs Header
      if (dossierSection === 'tabs') {
        const tabIds = ['overview', 'screenshots', 'achievements', 'related']
        if (direction === 'left') {
          setDossierTabIndex((prev) => {
            const next = Math.max(0, prev - 1)
            setDossierActiveTab(tabIds[next])
            return next
          })
        } else if (direction === 'right') {
          setDossierTabIndex((prev) => {
            const next = Math.min(tabIds.length - 1, prev + 1)
            setDossierActiveTab(tabIds[next])
            return next
          })
        } else if (direction === 'up') {
          setDossierSection('actions')
        } else if (direction === 'down') {
          setDossierSection('content')
          if (dossierActiveTab === 'overview') {
            if (hasJumpIn) {
              setDossierContentRow('jump_in')
              setDossierContentIndex(0)
            } else if (franchiseCount > 0) {
              setDossierContentRow('franchise')
              setDossierContentIndex(0)
            } else if (mediaCount > 0) {
              setDossierContentRow('media')
              setDossierContentIndex(0)
            } else if (relatedPreviewCount > 0) {
              setDossierContentRow('related_preview')
              setDossierContentIndex(0)
            }
          } else {
            setDossierContentIndex(0)
          }
        }
        return
      }

      // Section: Tab Content
      if (dossierSection === 'content') {
        if (dossierActiveTab === 'overview') {
          const availableRows = []
          if (hasJumpIn) availableRows.push('jump_in')
          if (franchiseCount > 0) availableRows.push('franchise')
          if (mediaCount > 0) availableRows.push('media')
          if (franchiseCount === 0 && mediaCount === 0 && relatedPreviewCount > 0) {
            availableRows.push('related_preview')
          }

          const currentRowIdx = availableRows.indexOf(dossierContentRow)

          if (direction === 'up') {
            if (currentRowIdx <= 0) {
              setDossierSection('tabs')
            } else {
              setDossierContentRow(availableRows[currentRowIdx - 1])
              setDossierContentIndex(0)
            }
          } else if (direction === 'down') {
            if (currentRowIdx >= 0 && currentRowIdx < availableRows.length - 1) {
              setDossierContentRow(availableRows[currentRowIdx + 1])
              setDossierContentIndex(0)
            }
          } else if (direction === 'left') {
            setDossierContentIndex((prev) => Math.max(0, prev - 1))
          } else if (direction === 'right') {
            let maxIndex = 0
            if (dossierContentRow === 'franchise') maxIndex = franchiseCount - 1
            else if (dossierContentRow === 'media') maxIndex = mediaCount - 1
            else if (dossierContentRow === 'related_preview') maxIndex = relatedPreviewCount - 1
            setDossierContentIndex((prev) => Math.min(Math.max(0, maxIndex), prev + 1))
          }
          return
        }

        if (dossierActiveTab === 'screenshots') {
          if (direction === 'up') {
            if (dossierContentIndex < 2) {
              setDossierSection('tabs')
            } else {
              setDossierContentIndex((prev) => Math.max(0, prev - 2))
            }
          } else if (direction === 'down') {
            setDossierContentIndex((prev) => Math.min(Math.max(0, allScreenshotsCount - 1), prev + 2))
          } else if (direction === 'left') {
            setDossierContentIndex((prev) => Math.max(0, prev - 1))
          } else if (direction === 'right') {
            setDossierContentIndex((prev) => Math.min(Math.max(0, allScreenshotsCount - 1), prev + 1))
          }
          return
        }

        if (dossierActiveTab === 'related') {
          if (direction === 'up') {
            setDossierSection('tabs')
          } else if (direction === 'left') {
            setDossierContentIndex((prev) => Math.max(0, prev - 1))
          } else if (direction === 'right') {
            setDossierContentIndex((prev) => Math.min(Math.max(0, allRelatedCount - 1), prev + 1))
          }
          return
        }

        if (dossierActiveTab === 'achievements') {
          if (direction === 'up') {
            setDossierSection('tabs')
          }
          return
        }
      }
      return
    }

    const cols = getGridColumns()
    const total = filteredGames.length
    const isSpotlightVisible = !isBigPictureMode && isHomeView && !isSpotlightCollapsed && Boolean(spotlightState.featured)
    const hasJumpIn = !isBigPictureMode && !isSpotlightCollapsed && Boolean(spotlightState.suggested && spotlightState.suggested.length >= 2)
    const numCandidates = spotlightState.candidates?.length || 5
    const numSuggested = spotlightState.suggested?.length || 0

    // Zone: Sidebar Navigation
    if (focusZone === 'sidebar') {
      const totalItems = allSidebarNavItems.length
      if (direction === 'up') {
        setSidebarFocusIndex((prev) => Math.max(0, prev - 1))
      } else if (direction === 'down') {
        setSidebarFocusIndex((prev) => Math.min(totalItems - 1, prev + 1))
      } else if (direction === 'right') {
        setFocusZone('grid')
      }
      return
    }

    // Zone: Top Header Bar Navigation
    if (focusZone === 'topbar') {
      if (screenshotMenuOpen) {
        if (direction === 'up') {
          setBragFocusIndex((prev) => Math.max(0, prev - 1))
        } else if (direction === 'down') {
          setBragFocusIndex((prev) => Math.min(bragMenuItems.length - 1, prev + 1))
        }
        return
      }
      if (themeMenuOpen) {
        if (direction === 'up') {
          setThemeFocusIndex((prev) => Math.max(0, prev - 1))
        } else if (direction === 'down') {
          setThemeFocusIndex((prev) => Math.min(allThemesList.length - 1, prev + 1))
        }
        return
      }

      if (direction === 'left') {
        if (topbarFocusIndex === 0) {
          setFocusZone('sidebar')
        } else {
          setTopbarFocusIndex((prev) => Math.max(0, prev - 1))
        }
      } else if (direction === 'right') {
        setTopbarFocusIndex((prev) => Math.min(3, prev + 1))
      } else if (direction === 'down') {
        if (isSpotlightVisible) {
          setFocusZone('spotlight')
          setSpotlightFocusIndex(0)
        } else if (hasJumpIn) {
          setFocusZone('jump_in')
          setJumpInFocusIndex(0)
        } else {
          setFocusZone('grid')
        }
      }
      return
    }

    // Zone: Sanctuary Spotlight Navigation
    if (focusZone === 'spotlight') {
      if (direction === 'left') {
        if (spotlightFocusIndex === 0) {
          setFocusZone('sidebar')
        } else if (spotlightFocusIndex === 1) {
          setSpotlightFocusIndex(0)
        } else if (spotlightFocusIndex === 2) {
          setSpotlightFocusIndex(1)
        } else if (spotlightFocusIndex >= 3) {
          setSpotlightFocusIndex(2)
        }
      } else if (direction === 'right') {
        if (spotlightFocusIndex === 0) {
          setSpotlightFocusIndex(1)
        } else if (spotlightFocusIndex === 1) {
          setSpotlightFocusIndex(2)
        } else if (spotlightFocusIndex === 2) {
          setSpotlightFocusIndex(3)
        }
      } else if (direction === 'up') {
        if (spotlightFocusIndex < 3) {
          setFocusZone('topbar')
          setTopbarFocusIndex(0)
        } else if (spotlightFocusIndex === 3) {
          setFocusZone('topbar')
          setTopbarFocusIndex(3)
        } else {
          setSpotlightFocusIndex((prev) => prev - 1)
        }
      } else if (direction === 'down') {
        if (spotlightFocusIndex >= 3 && spotlightFocusIndex < 3 + numCandidates - 1) {
          setSpotlightFocusIndex((prev) => prev + 1)
        } else {
          if (hasJumpIn) {
            setFocusZone('jump_in')
            setJumpInFocusIndex(0)
          } else {
            setFocusZone('grid')
            setGamepadIndex(0)
          }
        }
      }
      return
    }

    // Zone: Jump Back In Shelf Navigation
    if (focusZone === 'jump_in') {
      if (direction === 'left') {
        if (jumpInFocusIndex === 0) {
          setFocusZone('sidebar')
        } else {
          setJumpInFocusIndex((prev) => Math.max(0, prev - 1))
        }
      } else if (direction === 'right') {
        setJumpInFocusIndex((prev) => Math.min(Math.max(0, numSuggested - 1), prev + 1))
      } else if (direction === 'up') {
        if (isSpotlightVisible) {
          setFocusZone('spotlight')
          setSpotlightFocusIndex(0)
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
          }
        } else {
          setFocusZone('topbar')
          setTopbarFocusIndex(0)
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
          }
        }
      } else if (direction === 'down') {
        setFocusZone('grid')
        setGamepadIndex(0)
      }
      return
    }

    // Zone: Grid Navigation
    if (total === 0 || view === 'today') {
      if (direction === 'left') setFocusZone('sidebar')
      else if (direction === 'up') {
        if (hasJumpIn) {
          setFocusZone('jump_in')
          setJumpInFocusIndex(0)
        } else if (isSpotlightVisible) {
          setFocusZone('spotlight')
          setSpotlightFocusIndex(0)
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
          }
        } else {
          setFocusZone('topbar')
          setTopbarFocusIndex(0)
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
          }
        }
      }
      return
    }

    if (isBigPictureMode) {
      if (total === 0) return
      const isVerticalStage = layoutTheme === 'atmospheric' || layoutTheme === 'competitive'
      if (direction === 'left' || (isVerticalStage && direction === 'up')) {
        if (isVerticalStage && direction === 'up' && gamepadIndex <= 0) {
          setFocusZone('topbar')
          setTopbarFocusIndex(0)
        } else {
          setGamepadIndex((prev) => (prev <= 0 ? total - 1 : prev - 1))
        }
      } else if (direction === 'right' || (isVerticalStage && direction === 'down')) {
        setGamepadIndex((prev) => (prev >= total - 1 ? 0 : prev + 1))
      } else if (direction === 'up') {
        setFocusZone('topbar')
        setTopbarFocusIndex(0)
      }
      return
    }

    if (direction === 'left') {
      if (gamepadIndex % cols === 0) {
        setFocusZone('sidebar')
      } else {
        setGamepadIndex((prev) => Math.max(0, prev - 1))
      }
    } else if (direction === 'right') {
      setGamepadIndex((prev) => Math.min(total - 1, prev + 1))
    } else if (direction === 'up') {
      if (gamepadIndex < cols) {
        if (hasJumpIn) {
          setFocusZone('jump_in')
          setJumpInFocusIndex(0)
        } else if (isSpotlightVisible) {
          setFocusZone('spotlight')
          setSpotlightFocusIndex(0)
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
          }
        } else {
          setFocusZone('topbar')
          setTopbarFocusIndex(0)
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
          }
        }
      } else {
        setGamepadIndex((prev) => Math.max(0, prev - cols))
      }
    } else if (direction === 'down') {
      setGamepadIndex((prev) => Math.min(total - 1, prev + cols))
    }
  }, [
    settingsModalOpen, isDetailView, focusZone, allSidebarNavItems.length, getGridColumns,
    filteredGames.length, gamepadIndex, screenshotMenuOpen, themeMenuOpen, bragMenuItems.length,
    allThemesList.length, topbarFocusIndex, isHomeView, isSpotlightCollapsed, spotlightState,
    spotlightFocusIndex, jumpInFocusIndex, dossierSection, dossierActionIndex, dossierTabIndex,
    dossierActiveTab, dossierContentRow, dossierContentIndex, dossierLightboxIndex,
    settingsSection, settingsCategoryIndex, settingsContentIndex, SETTINGS_TAB_IDS,
    oskOpen, oskRow, oskCol, isBigPictureMode, aiDrawerOpen, layoutTheme, isBigPictureMode, aiDrawerOpen, layoutTheme
  ])

  const handleGamepadAction = useCallback((code) => {
    const MAIN_VIEWS = ['installed', 'favorites', 'ready', 'all', 'today', 'system']

    if (aiDrawerOpen) {
      if (code === 'B' || code === 'START' || code === 'GUIDE') {
        setAiDrawerOpen(false)
        if (isBigPictureMode) setFocusZone('grid')
        return
      }
      if (code === 'R3') {
        toggleVoiceListening()
        return
      }
      if (code === 'X') {
        window.dispatchEvent(new CustomEvent('logpile-ai-toggle-tts'))
        return
      }
      if (code === 'Y') {
        window.dispatchEvent(new CustomEvent('logpile-ai-new-chat'))
        return
      }
      if (code === 'A') {
        window.dispatchEvent(new CustomEvent('logpile-ai-gamepad-action', { detail: { action: 'SELECT' } }))
        return
      }
      return
    }

    if (code === 'B') {
      playBackClick()
    } else if (code === 'A' || code === 'X' || code === 'Y') {
      playSelectChime()
    } else if (code === 'LB' || code === 'RB' || code === 'LT' || code === 'RT') {
      playNavTick()
    }

    if (confirmModal) {
      if (code === 'A') {
        confirmModal.onConfirm?.()
        setConfirmModal(null)
        return
      }
      if (code === 'B') {
        confirmModal.onCancel?.()
        setConfirmModal(null)
        return
      }
      return
    }

    if (code === 'GUIDE') {
      if (oskOpen) {
        setOskOpen(false)
        return
      }
      if (settingsModalOpen) {
        setSettingsModalOpen(false)
        return
      }
      if (aiDrawerOpen) {
        setAiDrawerOpen(false)
        return
      }
      if (!isBigPictureMode) {
        handleToggleBigPicture(true)
      } else {
        setConfirmModal({
          eyebrow: 'CONSOLE MODE',
          title: 'Return to Desktop?',
          message: 'Exit Big Picture Console Mode and return to the desktop window?',
          confirmText: 'Return to Desktop',
          cancelText: 'Stay in Console',
          onConfirm: () => handleToggleBigPicture(false),
        })
      }
      return
    }

    if (code === 'START') {
      if (oskOpen) {
        setOskOpen(false)
        setFocusZone('grid')
        setGamepadIndex(0)
        return
      }
      if (settingsModalOpen) {
        setSettingsModalOpen(false)
        setFocusZone('grid')
        setSettingsSection('categories')
        setSettingsCategoryIndex(0)
        return
      }
      if (aiDrawerOpen) {
        setAiDrawerOpen(false)
        setFocusZone('grid')
        return
      }
      // Open settings directly on the themes tab for instant theme changing and console settings
      handleOpenSettings(isBigPictureMode ? 'themes' : 'general')
      return
    }

    // Universal Back Rule: B / Circle strictly returns
    if (code === 'B') {
      if (oskOpen) {
        setOskOpen(false)
        if (isBigPictureMode) {
          setFocusZone('grid')
          setGamepadIndex(0)
        } else {
          setFocusZone('topbar')
          setTopbarFocusIndex(0)
        }
        return
      }
      if (settingsModalOpen) {
        if (settingsSection === 'content') {
          setSettingsSection('categories')
          return
        }
        setSettingsModalOpen(false)
        setFocusZone('grid')
        setSettingsSection('categories')
        setSettingsCategoryIndex(0)
        return
      }
      if (isDetailView) {
        if (dossierLightboxIndex !== null) {
          setDossierLightboxIndex(null)
          return
        }
        handleBackToLibrary()
        setFocusZone('grid')
        setDossierSection('actions')
        setDossierActionIndex(0)
        return
      }
      if (screenshotMenuOpen) {
        setScreenshotMenuOpen(false)
        return
      }
      if (themeMenuOpen) {
        setThemeMenuOpen(false)
        return
      }
      if (document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur()
        return
      }
      if (focusZone !== 'grid') {
        setFocusZone('grid')
        return
      }
      if (selectMode) {
        setSelectMode(false)
        setSelectedIds([])
        return
      }
      if (query) {
        setQuery('')
        setDebouncedQuery('')
        return
      }
      if (view !== 'installed') {
        setView('installed')
        return
      }
      return
    }

    // Primary Action: A / Cross
    if (code === 'A') {
      if (oskOpen) {
        if (oskRow === -1) {
          setOskOpen(false)
          setFocusZone('grid')
          setGamepadIndex(0)
          return
        }
        const currentKey = KEYBOARD_LAYOUT[oskRow]?.[oskCol]
        if (typeof currentKey === 'string') {
          const nextQ = query + currentKey
          setQuery(nextQ)
          setDebouncedQuery(nextQ)
          if (view === 'system' || view === 'today' || view === 'about') setSidebarView('all')
        } else if (currentKey?.id === 'SPACE') {
          const nextQ = query + ' '
          setQuery(nextQ)
          setDebouncedQuery(nextQ)
        } else if (currentKey?.id === 'BACKSPACE') {
          const nextQ = query.slice(0, -1)
          setQuery(nextQ)
          setDebouncedQuery(nextQ)
        } else if (currentKey?.id === 'CLEAR') {
          setQuery('')
          setDebouncedQuery('')
        } else if (currentKey?.id === 'DONE') {
          setOskOpen(false)
          setFocusZone('grid')
          setGamepadIndex(0)
        }
        return
      }

      if (settingsModalOpen) {
        if (settingsSection === 'categories') {
          setSettingsSection('content')
          setSettingsContentIndex(0)
          return
        }
        if (settingsSection === 'content') {
          const pane = document.querySelector('.settings-body .settings-tab-pane')
          const items = pane ? Array.from(pane.querySelectorAll(`
            .settings-toggle-row,
            button:not([disabled]):not(.settings-tab-btn):not(.settings-toggle-row button),
            input:not([disabled]),
            select:not([disabled]),
            textarea:not([disabled])
          `)) : []

          const safeIdx = Math.min(items.length - 1, Math.max(0, settingsContentIndex))
          const target = items[safeIdx]
          if (target) {
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
              target.focus()
            } else if (target.tagName === 'SELECT') {
              if (target.options && target.options.length > 0) {
                const nextIndex = (target.selectedIndex + 1) % target.options.length
                target.selectedIndex = nextIndex
                target.dispatchEvent(new Event('change', { bubbles: true }))
              }
            } else {
              target.click()
            }
          }
          return
        }
        return
      }

      if (isDetailView) {
        const info = dossierInfoRef.current || {}
        if (dossierLightboxIndex !== null) {
          setDossierLightboxIndex(null)
          return
        }
        if (dossierSection === 'actions') {
          if (dossierActionIndex === 0) {
            handleLaunch(activeGame)
          } else if (dossierActionIndex === 1) {
            handleToggleFavorite(activeGame)
          } else if (dossierActionIndex === 2) {
            setDossierActiveTab('screenshots')
            setDossierTabIndex(1)
            setDossierSection('content')
            setDossierContentIndex(0)
          } else if (dossierActionIndex === 3) {
            handleSnapHero(activeGame)
          } else if (dossierActionIndex === 4) {
            if (activeGame) {
              setActiveGame(activeGame)
              setAiDrawerOpen(true)
            }
          } else if (dossierActionIndex === 5) {
            if (info.guideReady) {
              if (activeGame) {
                setActiveGame(activeGame)
                setAiDrawerOpen(true)
              }
            } else {
              info.handleDownloadGuide?.()
            }
          } else if (dossierActionIndex === 6) {
            setEditorGame(activeGame)
          } else if (dossierActionIndex === 7) {
            setDossierSection('tabs')
          }
          return
        }
        if (dossierSection === 'tabs') {
          setDossierSection('content')
          setDossierContentIndex(0)
          return
        }
        if (dossierSection === 'content') {
          if (dossierActiveTab === 'overview') {
            if (dossierContentRow === 'jump_in') {
              handleLaunch(activeGame)
            } else if (dossierContentRow === 'franchise') {
              const g = info.franchiseGames?.[dossierContentIndex]
              if (g) {
                setActiveGame(g)
                setDossierContentIndex(0)
              }
            } else if (dossierContentRow === 'media') {
              setDossierLightboxIndex(dossierContentIndex)
            } else if (dossierContentRow === 'related_preview') {
              const g = info.relatedGames?.[dossierContentIndex]
              if (g) {
                setActiveGame(g)
                setDossierContentIndex(0)
              }
            }
            return
          }
          if (dossierActiveTab === 'screenshots') {
            setDossierLightboxIndex(dossierContentIndex)
            return
          }
          if (dossierActiveTab === 'related') {
            const g = info.relatedGames?.[dossierContentIndex]
            if (g) {
              setActiveGame(g)
              setDossierContentIndex(0)
            }
            return
          }
        }
        return
      }

      if (focusZone === 'sidebar') {
        const item = allSidebarNavItems[sidebarFocusIndex]
        if (item) item.action()
        return
      }
      if (focusZone === 'topbar') {
        if (screenshotMenuOpen) {
          const item = bragMenuItems[bragFocusIndex]
          if (item) item.action()
          return
        }
        if (themeMenuOpen) {
          const selected = allThemesList[themeFocusIndex]
          if (selected) handleLayoutThemeChange(selected.value)
          setThemeMenuOpen(false)
          return
        }

        if (topbarFocusIndex === 0) {
          if (isGamepadMode) {
            setOskOpen(true)
            setOskRow(1)
            setOskCol(0)
            setFocusZone('osk')
          } else {
            searchInputRef.current?.focus()
          }
        } else if (topbarFocusIndex === 1) {
          setBragFocusIndex(0)
          toggleBragMenu()
        } else if (topbarFocusIndex === 2) {
          handleToggleBigPicture(true)
        } else if (topbarFocusIndex === 3) {
          const currentIdx = allThemesList.findIndex((t) => t.value === layoutTheme)
          setThemeFocusIndex(currentIdx >= 0 ? currentIdx : 0)
          setThemeMenuOpen((prev) => !prev)
        }
        return
      }
      if (focusZone === 'spotlight') {
        if (isSpotlightCollapsed) {
          if (spotlightFocusIndex === 0 && spotlightState.featured?.is_installed) {
            handleLaunch(spotlightState.featured)
          } else {
            handleToggleSpotlight()
          }
          return
        }

        if (spotlightFocusIndex === 0) {
          if (spotlightState.featured?.is_installed) {
            handleLaunch(spotlightState.featured)
          } else if (spotlightState.featured) {
            handleSelectGame(spotlightState.featured, 'spotlight')
          }
        } else if (spotlightFocusIndex === 1) {
          if (spotlightState.featured) {
            handleSelectGame(spotlightState.featured, 'spotlight')
          }
        } else if (spotlightFocusIndex === 2) {
          spotlightState.shuffle?.()
        } else if (spotlightFocusIndex >= 3) {
          const candIdx = spotlightFocusIndex - 3
          spotlightState.setActiveIndex?.(candIdx)
        }
        return
      }
      if (focusZone === 'jump_in') {
        const game = spotlightState.suggested[jumpInFocusIndex]
        if (game) {
          if (game.is_installed) {
            handleLaunch(game)
          } else {
            handleSelectGame(game, 'shelf')
          }
        }
        return
      }
      if (focusZone === 'grid') {
        if (view === 'today') {
          const spinObj = spinTodayRef.current
          if (spinObj?.winner) {
            handleLaunch(spinObj.winner)
          } else {
            spinObj?.spin?.()
          }
          return
        }
        const currentGame = filteredGames[gamepadIndex] || activeGame
        if (currentGame) {
          if (currentGame.is_installed || isBigPictureMode) {
            handleLaunch(currentGame)
          } else {
            handleSelectGame(currentGame)
          }
        }
        return
      }
    }

    if (oskOpen) {
      if (code === 'X') {
        const nextQ = query.slice(0, -1)
        setQuery(nextQ)
        setDebouncedQuery(nextQ)
        return
      }
      if (code === 'Y') {
        const nextQ = query + ' '
        setQuery(nextQ)
        setDebouncedQuery(nextQ)
        return
      }
      return
    }

    if (settingsModalOpen) {
      if (code === 'LB' || code === 'RB') {
        const totalCats = SETTINGS_TAB_IDS.length
        const nextIdx = code === 'RB'
          ? (settingsCategoryIndex + 1) % totalCats
          : (settingsCategoryIndex - 1 + totalCats) % totalCats
        setSettingsCategoryIndex(nextIdx)
        setSettingsModalTab(SETTINGS_TAB_IDS[nextIdx])
        if (settingsSection === 'content') {
          setSettingsContentIndex(0)
        }
        return
      }
      return
    }

    if (isDetailView) {
      if (code === 'X' && activeGame) {
        cycleGameStatus(activeGame)
        return
      }
      if (code === 'Y' && activeGame) {
        handleToggleFavorite(activeGame)
        return
      }
      if (code === 'LB' || code === 'RB') {
        const tabIds = ['overview', 'screenshots', 'achievements', 'related']
        const nextIdx = code === 'RB'
          ? (dossierTabIndex + 1) % tabIds.length
          : (dossierTabIndex - 1 + tabIds.length) % tabIds.length
        setDossierTabIndex(nextIdx)
        setDossierActiveTab(tabIds[nextIdx])
        return
      }
      if (code === 'LT' || code === 'RT') {
        const curIdx = filteredGames.findIndex((g) => g.id === activeGame.id)
        if (curIdx >= 0 && filteredGames.length > 1) {
          const nextIdx = code === 'RT'
            ? (curIdx + 1) % filteredGames.length
            : (curIdx - 1 + filteredGames.length) % filteredGames.length
          setActiveGame(filteredGames[nextIdx])
          setGamepadIndex(nextIdx)
          setDossierContentIndex(0)
        }
        return
      }
    } else {
      if (code === 'X') {
        if (view === 'today') {
          spinTodayRef.current?.spin?.()
          return
        }
        if (focusZone === 'topbar' && topbarFocusIndex === 0) {
          if (query) {
            setQuery('')
            setDebouncedQuery('')
          }
          return
        }
        if (focusZone === 'spotlight' && spotlightState.featured) {
          handleSelectGame(spotlightState.featured, 'spotlight')
          return
        }
        if (focusZone === 'jump_in') {
          const game = spotlightState.suggested[jumpInFocusIndex]
          if (game) {
            handleSelectGame(game, 'shelf')
            return
          }
        }
        const currentGame = filteredGames[gamepadIndex] || activeGame
        if (currentGame) {
          handleSelectGame(currentGame)
        }
        return
      }
      if (code === 'Y') {
        if (view === 'today') {
          const spinObj = spinTodayRef.current
          if (spinObj?.winner) {
            handleSelectGame(spinObj.winner, 'today')
          }
          return
        }
        if (focusZone === 'topbar' && topbarFocusIndex === 3) {
          const curIdx = allThemesList.findIndex((t) => t.value === layoutTheme)
          const nextIdx = (curIdx + 1) % allThemesList.length
          handleLayoutThemeChange(allThemesList[nextIdx].value)
          return
        }
        if (focusZone === 'spotlight' && spotlightState.featured) {
          handleToggleFavorite(spotlightState.featured)
          return
        }
        if (focusZone === 'jump_in') {
          const game = spotlightState.suggested[jumpInFocusIndex]
          if (game) {
            handleToggleFavorite(game)
            return
          }
        }
        const currentGame = filteredGames[gamepadIndex] || activeGame
        if (currentGame) {
          handleToggleFavorite(currentGame)
        }
        return
      }
      if (code === 'LB' || code === 'RB') {
        const consoleCategories = ['installed']
        if (displayFavoriteGames > 0) consoleCategories.push('favorites')
        consoleCategories.push('all', 'today', 'search')
        if (isAiAvailable) consoleCategories.push('ai_companion')

        const desktopCategories = ['installed']
        if (displayFavoriteGames > 0) desktopCategories.push('favorites')
        desktopCategories.push('all', 'today')

        const CATEGORY_LIST = isBigPictureMode ? consoleCategories : desktopCategories

        const curIdx = CATEGORY_LIST.indexOf(view)
        const safeIdx = curIdx >= 0 ? curIdx : 0
        const nextIdx = code === 'RB'
          ? (safeIdx + 1) % CATEGORY_LIST.length
          : (safeIdx - 1 + CATEGORY_LIST.length) % CATEGORY_LIST.length
        const nextCategory = CATEGORY_LIST[nextIdx]

        if (nextCategory === 'search') {
          if (view !== 'all' && view !== 'installed') setView('all')
          setOskOpen(true)
          setOskRow(1)
          setOskCol(0)
          setFocusZone('osk')
          return
        }

        if (nextCategory === 'ai_companion') {
          setAiDrawerOpen(true)
          return
        }

        setSidebarView(nextCategory)
        setFocusZone('grid')
        setGamepadIndex(0)
        return
      }
      if (code === 'R3') {
        toggleVoiceListening()
        return
      }
    }
  }, [
    settingsModalOpen, isDetailView, screenshotMenuOpen, themeMenuOpen, focusZone,
    allSidebarNavItems, sidebarFocusIndex, topbarFocusIndex, bragFocusIndex, themeFocusIndex,
    bragMenuItems, allThemesList, layoutTheme, handleLayoutThemeChange, filteredGames,
    gamepadIndex, activeGame, handleSelectGame, cycleGameStatus, handleToggleFavorite,
    toggleBragMenu, handleBackToLibrary, selectMode, query, view, toggleVoiceListening,
    spotlightState, isSpotlightCollapsed, handleToggleSpotlight, handleLaunch,
    spotlightFocusIndex, jumpInFocusIndex, dossierSection, dossierActionIndex, dossierTabIndex,
    dossierActiveTab, dossierContentRow, dossierContentIndex, dossierLightboxIndex,
    handleSnapHero, setAiDrawerOpen, setEditorGame,
    settingsSection, settingsCategoryIndex, settingsContentIndex, SETTINGS_TAB_IDS,
    oskOpen, oskRow, oskCol, isBigPictureMode, aiDrawerOpen, handleOpenSettings,
    displayFavoriteGames, isAiAvailable, confirmModal, handleToggleBigPicture
  ])

  handleGamepadNavigateRef.current = handleGamepadNavigate
  handleGamepadActionRef.current = handleGamepadAction

  // Multimodal Physical Keyboard Navigation Coordinator (Living Room & Couch Ergonomics)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. If currently inside an editable element
      if (e.target && e.target.matches('input, textarea, select, [contenteditable="true"]')) {
        if (e.key === 'Escape') {
          e.target.blur()
        }
        return
      }

      // 2. Ignore if modal dialogs that capture keys are active
      if (document.querySelector('.lightbox-backdrop, .modal-backdrop, .art-context-menu')) {
        return
      }

      // 3. Arrow Keys -> Spatial Navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        activateGamepadMode?.()
        handleGamepadNavigateRef.current?.('up')
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        activateGamepadMode?.()
        handleGamepadNavigateRef.current?.('down')
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        activateGamepadMode?.()
        handleGamepadNavigateRef.current?.('left')
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        activateGamepadMode?.()
        handleGamepadNavigateRef.current?.('right')
        return
      }

      // 4. Enter / Space -> Select / Launch (Action A)
      if (e.key === 'Enter') {
        if (!e.target.closest('button, a, select')) {
          e.preventDefault()
          activateGamepadMode?.()
          handleGamepadActionRef.current?.('A')
          return
        }
      }
      if (e.key === ' ') {
        if (!e.target.closest('button, a, input, select, textarea')) {
          e.preventDefault()
          activateGamepadMode?.()
          handleGamepadActionRef.current?.('A')
          return
        }
      }

      // 5. Bumper Cycling: [ and ] -> LB / RB
      if (e.key === '[') {
        e.preventDefault()
        activateGamepadMode?.()
        handleGamepadActionRef.current?.('LB')
        return
      }
      if (e.key === ']') {
        e.preventDefault()
        activateGamepadMode?.()
        handleGamepadActionRef.current?.('RB')
        return
      }

      // 6. Trigger Game Cycling: PageUp / PageDown -> LT / RT
      if (e.key === 'PageUp') {
        e.preventDefault()
        activateGamepadMode?.()
        handleGamepadActionRef.current?.('LT')
        return
      }
      if (e.key === 'PageDown') {
        e.preventDefault()
        activateGamepadMode?.()
        handleGamepadActionRef.current?.('RT')
        return
      }

      // 7. Quick Actions: X and Y shortcuts when in directional focus mode
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'x' || e.key === 'X') {
          if (isGamepadMode || isBigPictureMode) {
            e.preventDefault()
            activateGamepadMode?.()
            handleGamepadActionRef.current?.('X')
            return
          }
        }
        if (e.key === 'y' || e.key === 'Y') {
          if (isGamepadMode || isBigPictureMode) {
            e.preventDefault()
            activateGamepadMode?.()
            handleGamepadActionRef.current?.('Y')
            return
          }
        }
      }

      // 8. Direct alphanumeric typing to search (in main library views)
      if (!isDetailView && !settingsModalOpen && !oskOpen) {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
          if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
            searchInputRef.current.focus()
            // Do not preventDefault: let the character naturally enter the search box
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activateGamepadMode, isDetailView, settingsModalOpen, oskOpen, isGamepadMode, isBigPictureMode])

  // 2D Spatial Focus Auto-Scroll Coordinator
  useEffect(() => {
    if (!isGamepadMode) return
    const timer = setTimeout(() => {
      if (focusZone === 'spotlight' || (focusZone === 'topbar' && !isDetailView)) {
        if (mainScrollRef.current) {
          mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
        }
        const spotlightEl = document.querySelector('.home-hero-container') || document.querySelector('.home-spotlight')
        if (spotlightEl) {
          spotlightEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        return
      }

      const activeEl = document.querySelector('.gamepad-focused')
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
      }
    }, 45)
    return () => clearTimeout(timer)
  }, [
    focusZone, gamepadIndex, sidebarFocusIndex, topbarFocusIndex, bragFocusIndex,
    themeFocusIndex, spotlightFocusIndex, jumpInFocusIndex, isGamepadMode, screenshotMenuOpen,
    themeMenuOpen, isDetailView, dossierSection, dossierActionIndex, dossierTabIndex,
    dossierActiveTab, dossierContentRow, dossierContentIndex, dossierLightboxIndex,
    settingsModalOpen, settingsSection, settingsCategoryIndex, settingsContentIndex
  ])
  const detailHero = activeGame?.hero_url ? normalizeArtworkUrl(activeGame.hero_url) : null
  const detailCover = activeGame?.cover_url ? normalizeArtworkUrl(activeGame.cover_url) : null
  const isAmbientCoverFallback = !detailHero && Boolean(detailCover)
  const detailBackdropUrl = detailHero || detailCover
  const isDetailVideoBackdrop = false
  const staticDetailBackdrop = useMemo(() => {
    let art = detailBackdropUrl || ''
    if (art.includes('.webm') || art.includes('.mp4')) {
      if (detailCover && !detailCover.includes('.webm') && !detailCover.includes('.mp4')) {
        art = detailCover
      } else {
        art = art.replace(/\.(webm|mp4)(\?.*)?$/i, '.jpg$2')
      }
    }
    return art
  }, [detailBackdropUrl, detailCover])

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDraggingFile(true)
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDraggingFile(false)
    }
  }, [])

  const handleFileDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDraggingFile(false)
    const files = e.dataTransfer?.files
    if (!files || !files.length) return
    const file = files[0]
    let filePath = ''
    try {
      if (api?.getPathForFile && typeof api.getPathForFile === 'function') {
        filePath = api.getPathForFile(file)
      }
    } catch {}
    if (!filePath) filePath = file.path || ''
    if (!filePath) {
      setNoticeTone('error')
      setNotice('Could not resolve file path from drop event.')
      window.setTimeout(() => setNotice(''), 4000)
      return
    }

    try {
      setNoticeTone('success')
      setNotice(`Adding ${file.name || 'game'} to Logpile...`)
      const result = await api?.games?.addCustomGame?.(filePath)
      if (result) {
        setNoticeTone('success')
        setNotice(`Added "${result.canonical_title}" to library!`)
        await loadData()
      }
    } catch (err) {
      setNoticeTone('error')
      setNotice(err.message || 'Failed to add custom game.')
    } finally {
      window.setTimeout(() => setNotice(''), 4000)
    }
  }, [loadData])

  return <div
    className={cn("app-shell", isDetailView && "is-detail-view", isDetailView && isDetailHudIdle && "detail-hud-idle", isDetailView && isDetailScrolled && "detail-is-scrolled", sidebarCollapsed && "sidebar-is-collapsed", `layout-${layoutTheme}`)}
    data-layout-theme={layoutTheme}
    data-layout={layoutTheme}
    data-mode="dark"
    style={vars}
    onDragEnter={handleDragEnter}
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onDrop={handleFileDrop}
  >
    {isDraggingFile && (
      <div className="global-dropzone-overlay">
        <div className="global-dropzone-box">
          <div className="global-dropzone-icon-wrap">
            <Download size={32} />
          </div>
          <h3 className="global-dropzone-title">Drop Executable or Game Folder</h3>
          <p className="global-dropzone-desc">Drop an .exe, shortcut (.lnk), or game folder to instantly add to Logpile.</p>
        </div>
      </div>
    )}
    {isDetailView && detailBackdropUrl && (
      <div className={cn("global-detail-backdrop-wrap", isAmbientCoverFallback && "is-ambient-cover-wrap")}>
        {isDetailVideoBackdrop ? (
          <video
            key={detailBackdropUrl}
            src={detailBackdropUrl}
            autoPlay
            loop
            muted
            playsInline
            className="global-detail-backdrop-video"
          />
        ) : (
          <div
            className={cn("global-detail-backdrop-img", isAmbientCoverFallback && "is-ambient-cover-blur")}
            style={{ backgroundImage: staticDetailBackdrop ? `url("${staticDetailBackdrop}")` : undefined }}
          />
        )}
        <div className="global-detail-backdrop-gradient" />
      </div>
    )}
    {isBigPictureMode ? (
      <ConsoleTelemetryBar
        layoutTheme={layoutTheme}
        connectedGamepad={connectedGamepad}
        gamepadGlyphStyle={gamepadGlyphStyle}
        onExitBigPicture={() => handleToggleBigPicture(false)}
        themeLogo={THEME_LOGOS[layoutTheme] || logoDark}
        isDetailView={isDetailView}
        activeGameTitle={activeGame?.canonical_title || ''}
        currentView={view}
        isAiDrawerOpen={aiDrawerOpen}
        hasFavorites={displayFavoriteGames > 0}
        isAiAvailable={isAiAvailable}
        consoleModeShortcut={consoleModeShortcut}
        allowEscExitConsole={allowEscExitConsole}
        isGamepadMode={isGamepadMode}
        searchQuery={query}
        onSearchQueryChange={(val) => {
          setQuery(val)
          setDebouncedQuery(val)
          if (view === 'system' || view === 'today' || view === 'about') setSidebarView('all')
        }}
        onViewChange={(newView) => {
          if (newView === 'search') {
            if (view !== 'all' && view !== 'installed') setView('all')
            setOskOpen(true)
            setOskRow(1)
            setOskCol(0)
            setFocusZone('osk')
          } else if (newView === 'ai_companion') {
            setAiDrawerOpen((prev) => !prev)
          } else if (newView === 'settings') {
            handleOpenSettings('themes')
          } else {
            setView(newView)
            setFocusZone('grid')
            setGamepadIndex(0)
          }
        }}
        onOpenSearch={() => {
          if (view !== 'all' && view !== 'installed') setView('all')
          setOskOpen(true)
          setOskRow(1)
          setOskCol(0)
          setFocusZone('osk')
        }}
        onOpenSettings={() => handleOpenSettings('themes')}
      />
    ) : (
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
                src={THEME_LOGOS[layoutTheme] || logoDark}
                alt="Logpile"
                className="w-5 h-5 object-contain flex-shrink-0 shrink-0 aspect-square select-none pointer-events-none app-logo titlebar-logo"
                style={{ width: '18px', height: '18px', minWidth: '18px', minHeight: '18px', maxWidth: '18px', maxHeight: '18px', objectFit: 'contain', flexShrink: 0 }}
              />
              <span className="titlebar-brand-label">
                {layoutTheme === 'kinetic' ? '// LOGPILE //' : layoutTheme === 'playful' ? 'Logpile' : 'LOGPILE'}
              </span>
            </div>
          </div>
        ) : (
          <div className="titlebar-brand-capsule">
            <img
              src={THEME_LOGOS[layoutTheme] || logoDark}
              alt="Logpile"
              className="w-5 h-5 object-contain flex-shrink-0 shrink-0 aspect-square select-none pointer-events-none app-logo titlebar-logo"
              style={{ width: '18px', height: '18px', minWidth: '18px', minHeight: '18px', maxWidth: '18px', maxHeight: '18px', objectFit: 'contain', flexShrink: 0 }}
            />
            <span className="titlebar-brand-label">
              {layoutTheme === 'kinetic' ? '// LOGPILE //' : layoutTheme === 'playful' ? 'Logpile' : 'LOGPILE'}
            </span>
          </div>
        )}
      </div>
      <div className="titlebar-center">
        {!isDetailView && (
          <div className={cn("titlebar-search", isGamepadMode && focusZone === 'topbar' && topbarFocusIndex === 0 && "gamepad-focused")}>
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
            {isAiAvailable && (
              <button
                type="button"
                className="titlebar-ai-spark-btn"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setAiDrawerOpen((prev) => !prev)
                }}
                title="Gaming AI Companion (Ctrl+J)"
              >
                <Sparkles size={13} />
              </button>
            )}
            <button
              type="button"
              className={cn('titlebar-voice-btn', isVoiceListening && 'active-listening')}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleVoiceListening()
              }}
              title={isVoiceListening ? 'Listening for voice command... (Click to stop)' : 'Push to talk (Voice Command / Gamepad R3)'}
            >
              {isVoiceListening ? <Mic size={13} /> : <MicOff size={13} />}
            </button>
            <button
              type="button"
              className="titlebar-osk-btn"
              aria-label="Open On-Screen Couch Keyboard"
              title="Open On-Screen Couch Keyboard (Gamepad Search)"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setOskOpen(true)
                setOskRow(1)
                setOskCol(0)
                setFocusZone('osk')
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: oskOpen ? 'color-mix(in srgb, var(--accent, #6366f1) 20%, transparent)' : 'transparent',
                color: oskOpen ? 'var(--accent, #6366f1)' : 'var(--text-muted, #94a3b8)',
                border: 'none',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <Keyboard size={12} />
            </button>
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
        {isDetailView && (
          <button
            type="button"
            className="outline-button brag-screenshot-btn titlebar-snap-btn"
            onClick={() => handleSnapHero(activeGame)}
            disabled={screenshotBusy}
            title="Snap this theme-based view to captures & clipboard"
            style={{ marginRight: '6px', height: '26px', fontSize: '11px', padding: '0 8px' }}
          >
            <Camera size={12} />
            <span>{activeCaptureAction === 'hero' ? 'Snapping…' : 'Snap Hero'}</span>
          </button>
        )}
        <div
          ref={bragMenuRef}
          className="relative inline-block"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <button
            type="button"
            className={cn("outline-button brag-screenshot-btn titlebar-brag-btn", isGamepadMode && focusZone === 'topbar' && topbarFocusIndex === 1 && !screenshotMenuOpen && "gamepad-focused")}
            onClick={toggleBragMenu}
            disabled={screenshotBusy}
            title="Capture current view screenshot or 4K Brag Showcase"
            style={{ height: '28px', fontSize: '11px', padding: '0 9px' }}
          >
            <Camera size={13} />
            <span>{['screen', 'fullpage', 'showcase'].includes(activeCaptureAction) ? 'Capturing…' : 'Brag'}</span>
            <ChevronDown size={11} className={cn(screenshotMenuOpen && 'rotate-180')} />
          </button>
          {screenshotMenuOpen && typeof document !== 'undefined' && createPortal(
            <div
              ref={bragDropdownRef}
              className={cn('brag-dropdown-menu', bragMenuPos.openUpwards ? 'open-upwards' : 'open-downwards')}
              style={{
                position: 'fixed',
                top: `${bragMenuPos.top}px`,
                right: `${bragMenuPos.right}px`,
                zIndex: 999999,
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={cn("brag-dropdown-item", isGamepadMode && screenshotMenuOpen && bragFocusIndex === 0 && "gamepad-focused")}
                onClick={handleCaptureFullPage}
                title="Capture entire scrollable page from top to bottom"
              >
                <Layers size={13} style={{ color: 'var(--accent, #f59e0b)' }} />
                <div>
                  <span className="brag-dropdown-title">Full View (Whole Page PNG)</span>
                  <span className="brag-dropdown-sub">Complete scrollable page (Installed, Ready to Install, Game Dossier, Dashboard)</span>
                </div>
              </button>
              <button
                type="button"
                className={cn("brag-dropdown-item", isGamepadMode && screenshotMenuOpen && bragFocusIndex === 1 && "gamepad-focused")}
                onClick={handleCaptureScreen}
                title="Capture current visible window snapshot"
              >
                <Camera size={13} />
                <div>
                  <span className="brag-dropdown-title">Visible Window (PNG)</span>
                  <span className="brag-dropdown-sub">Window snapshot as currently seen on screen</span>
                </div>
              </button>
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 2px' }} />
              <div className="brag-menu-section-header">
                <Sparkles size={11} style={{ color: '#818cf8' }} />
                <span>Showcase Collages (4K)</span>
              </div>
              <div className="brag-ratio-grid">
                <button
                  type="button"
                  className={cn("brag-ratio-btn", isGamepadMode && screenshotMenuOpen && bragFocusIndex === 2 && "gamepad-focused")}
                  onClick={() => handleCaptureFilteredShowcase('auto')}
                  title="Continuous full tapestry showing every game without cutoff"
                >
                  <div className="brag-ratio-btn-header">
                    <Maximize2 size={12} style={{ color: '#818cf8' }} />
                    <span>Full Grid</span>
                  </div>
                  <span className="brag-ratio-tag">All {filteredGames.length} titles</span>
                </button>
                <button
                  type="button"
                  className={cn("brag-ratio-btn", isGamepadMode && screenshotMenuOpen && bragFocusIndex === 3 && "gamepad-focused")}
                  onClick={() => handleCaptureFilteredShowcase('16:9')}
                  title="16:9 landscape 4K UHD - ideal for PC monitors, Reddit, and X"
                >
                  <div className="brag-ratio-btn-header">
                    <Monitor size={12} style={{ color: '#38bdf8' }} />
                    <span>16:9</span>
                  </div>
                  <span className="brag-ratio-tag">Landscape</span>
                </button>
                <button
                  type="button"
                  className={cn("brag-ratio-btn", isGamepadMode && screenshotMenuOpen && bragFocusIndex === 4 && "gamepad-focused")}
                  onClick={() => handleCaptureFilteredShowcase('9:16')}
                  title="9:16 vertical 4K - ideal for Instagram Stories, Reels, and Mobile"
                >
                  <div className="brag-ratio-btn-header">
                    <Smartphone size={12} style={{ color: 'var(--accent, #d6ff4b)' }} />
                    <span>9:16</span>
                  </div>
                  <span className="brag-ratio-tag">Story / Reel</span>
                </button>
                <button
                  type="button"
                  className={cn("brag-ratio-btn", isGamepadMode && screenshotMenuOpen && bragFocusIndex === 5 && "gamepad-focused")}
                  onClick={() => handleCaptureFilteredShowcase('1:1')}
                  title="1:1 square 4K - ideal for Instagram feed posts and Discord"
                >
                  <div className="brag-ratio-btn-header">
                    <Square size={12} style={{ color: 'var(--accent, #d6ff4b)' }} />
                    <span>1:1</span>
                  </div>
                  <span className="brag-ratio-tag">Square Post</span>
                </button>
              </div>
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 2px' }} />
              <button
                type="button"
                className={cn("brag-dropdown-item", isGamepadMode && screenshotMenuOpen && bragFocusIndex === 6 && "gamepad-focused")}
                onClick={handleOpenCapturesFolder}
              >
                <FolderOpen size={13} style={{ color: '#94a3b8' }} />
                <div>
                  <span className="brag-dropdown-title">Open Captures Folder</span>
                  <span className="brag-dropdown-sub">Open local captures folder in Explorer</span>
                </div>
              </button>
            </div>,
            document.body
          )}
        </div>
        <button
          type="button"
          className={cn(
            "outline-button titlebar-console-btn",
            isGamepadMode && focusZone === 'topbar' && topbarFocusIndex === 2 && "gamepad-focused"
          )}
          onClick={() => handleToggleBigPicture(true)}
          title="Switch to Big Picture Console Mode (F11 / Ctrl+Shift+F)"
          aria-label="Big Picture Console Mode"
        >
          <Tv size={13} className="titlebar-console-icon" />
          <span className="hidden sm:inline">Console Mode</span>
        </button>
        <SanctuaryControls
          layoutTheme={layoutTheme}
          setLayoutTheme={handleLayoutThemeChange}
          isFocused={isGamepadMode && focusZone === 'topbar' && topbarFocusIndex === 3}
          isMenuOpen={themeMenuOpen}
          onOpenChange={setThemeMenuOpen}
          themeFocusIndex={themeFocusIndex}
        />
        <WindowControls />
      </div>
    </header>
    )}
    <div className="app-body">
      {!isDetailView && !isBigPictureMode && (
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
          {(query || sourceFilters.length || genreFilter !== 'all' || backlogFilter !== 'all' || timeFilter !== 'all' || qualityFilters.length || aiFilter) ? (
            <div className="sidebar-filter-summary">
              <span>{filteredGames.length} of {games.length} titles</span>
              <button type="button" className="sidebar-reset-btn" onClick={() => { setQuery(''); setSourceFilters([]); setGenreFilter('all'); setBacklogFilter('all'); setTimeFilter('all'); setQualityFilters([]); handleClearAiFilter(); }}>Reset all</button>
            </div>
          ) : null}

          <div className="nav-group nav-group-workspace">
            <p className="nav-label">Workspace</p>
            <button
              className={cn('nav-item', view === 'installed' && 'active', isSidebarItemFocused('installed') && 'gamepad-focused')}
              onClick={() => setSidebarView('installed')}
              title="Installed"
            >
              <PackageCheck size={15} />
              <span>Installed</span>
              <em>{displayInstalledGames}</em>
            </button>
            {displayFavoriteGames > 0 && (
              <button
                className={cn('nav-item', view === 'favorites' && 'active', isSidebarItemFocused('favorites') && 'gamepad-focused')}
                onClick={() => setSidebarView('favorites')}
                title="Favorites"
              >
                <Star size={15} className={view === 'favorites' ? 'text-amber-400 fill-amber-400' : 'text-amber-400'} />
                <span>Favorites</span>
                <em>{displayFavoriteGames}</em>
              </button>
            )}
            <button
              className={cn('nav-item', view === 'all' && 'active', isSidebarItemFocused('all') && 'gamepad-focused')}
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
                  className={cn('nav-item', view === item.key && 'active', isSidebarItemFocused(item.key) && 'gamepad-focused')}
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
              className={cn('nav-item', view === 'today' && 'active', isSidebarItemFocused('today') && 'gamepad-focused')}
              onClick={() => setSidebarView('today')}
              title="Today’s Pick"
            >
              <Dices size={15} />
              <span>Today’s Pick</span>
            </button>
            <button
              className={cn('nav-item', view === 'dashboard' && 'active', isSidebarItemFocused('dashboard') && 'gamepad-focused')}
              onClick={() => setSidebarView('dashboard')}
              title="Library Intelligence & Backlog Dashboard"
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </button>
            {isAiAvailable && (
              <button
                className={cn('nav-item nav-item-ai', aiDrawerOpen && 'active', isSidebarItemFocused('ai_companion') && 'gamepad-focused')}
                onClick={() => setAiDrawerOpen((prev) => !prev)}
                title="Gaming AI Companion (Ctrl+J)"
              >
                <Sparkles size={15} style={{ color: 'var(--accent, #d6ff4b)' }} />
                <span>AI Companion</span>
              </button>
            )}
          </div>

          <div className="nav-divider" />

          {sourcesPlacement === 'sidebar' && (
            <div className='nav-group nav-group-sources'>
              <p className='nav-label nav-label-spaced'>Sources</p>
              <button
                className={cn('nav-item nav-item-source nav-item-all-sources', !sourceFilters.length && 'active', isSidebarItemFocused('source_all') && 'gamepad-focused')}
                onClick={() => { setSourceFilters([]); setViewMode('grid'); if (view === 'system' || view === 'today') setSidebarView('all') }}
                title='All sources'
              >
                <SourceIcon source='all' size={14} className='sidebar-source-icon' />
                <span>All sources</span>
                <em>{games.length}</em>
              </button>
              {(() => {
                const mainKeys = new Set(['steam', 'epic games', 'gog', 'xbox', 'ea games', 'ubisoft', 'amazon games', 'itch.io', 'humble', 'standalone', 'custom']);
                const mainSources = sourceOptions.filter((s) => mainKeys.has(s.key));
                const publisherSources = sourceOptions.filter((s) => !mainKeys.has(s.key));
                const hasActivePublisher = publisherSources.some((s) => sourceFilters.includes(s.key));
                const showPublishers = publisherLaunchersOpen || hasActivePublisher;
                const renderSourceBtn = (source) => (
                  <button
                    key={source.key}
                    className={cn('nav-item nav-item-source', sourceFilters.includes(source.key) && 'active', isSidebarItemFocused(`source_${source.key}`) && 'gamepad-focused')}
                    onClick={() => { toggleSource(source.key); setViewMode('grid'); if (view === 'system' || view === 'today') setSidebarView('all') }}
                    title={source.label}
                  >
                    <SourceIcon source={source.key} size={14} className='sidebar-source-icon' />
                    <span>{source.label}</span>
                    <em>{source.count}</em>
                  </button>
                );
                return (
                  <>
                    {mainSources.map(renderSourceBtn)}
                    {publisherSources.length > 0 && (
                      <>
                        <button
                          type='button'
                          className='nav-item nav-item-source'
                          onClick={() => setPublisherLaunchersOpen((prev) => !prev)}
                          title='Toggle Publisher Launchers'
                          style={{ opacity: 0.85 }}
                        >
                          {showPublishers ? <ChevronDown size={14} className='sidebar-source-icon' /> : <ChevronRight size={14} className='sidebar-source-icon' />}
                          <span>Publisher Launchers</span>
                          <em>{publisherSources.length}</em>
                        </button>
                        {showPublishers && publisherSources.map(renderSourceBtn)}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </nav>

        <div className="sidebar-bottom-dock">
          <button
            type="button"
            className={cn('sidebar-dock-btn', settingsModalOpen && 'active', isSidebarItemFocused('settings') && 'gamepad-focused')}
            onClick={() => { setSettingsModalTab('general'); setSettingsModalOpen(true); }}
            title="Settings & Preferences"
          >
            <Settings2 size={14} />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
        </div>
      </aside>
      )}
      <main className="main-content"><div ref={mainScrollRef} className={cn('main-scroll', isDetailView && 'main-scroll-fullbleed', isBigPictureMode && !isDetailView && 'console-stage-scroll-host')}><ErrorBoundary key={`${view}-${viewMode}-${activeGame?.id || 'none'}`} fallback={({ error, reset }) => <TabErrorFallback error={error} reset={reset} onBack={handleBackToLibrary} />}>{isDetailView ? <HeroView games={filteredGames} activeGame={activeGame || filteredGames[0]} familyLocks={familyLocks} onSelect={setActiveGame} onLaunch={handleLaunch} onBack={handleBackToLibrary} onEdit={setEditorGame} onHideGame={(game) => updateHiddenState(game, true)} onMoveCategory={moveCategory} onContextMenu={handleCardContextMenu} isCinematicTheme={layoutTheme === 'cinematic'} layoutTheme={layoutTheme} scrollContainerRef={mainScrollRef} onIdleChange={setIsDetailHudIdle} onScrollStateChange={setIsDetailScrolled} onSnapHero={handleSnapHero} onAskAi={isAiAvailable ? ((g) => { if (g) setActiveGame(g); setAiDrawerOpen(true); }) : null} onToggleFavorite={handleToggleFavorite} onUpdateStatus={async (game, newStatus) => {
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
}}
isGamepadMode={isGamepadMode}
dossierSection={dossierSection}
dossierActionIndex={dossierActionIndex}
dossierTabIndex={dossierTabIndex}
dossierActiveTab={dossierActiveTab}
onDossierActiveTabChange={(t) => {
  setDossierActiveTab(t)
  const tabIds = ['overview', 'screenshots', 'achievements', 'related']
  const idx = tabIds.indexOf(t)
  if (idx >= 0) setDossierTabIndex(idx)
}}
dossierContentRow={dossierContentRow}
dossierContentIndex={dossierContentIndex}
dossierLightboxIndex={dossierLightboxIndex}
onDossierLightboxChange={setDossierLightboxIndex}
onDossierInfo={(info) => {
  dossierInfoRef.current = info
}}
/> : view === 'dashboard' ? (
  <DashboardView
    games={games}
    stats={stats}
    onSelectGame={handleSelectGame}
    onLaunchGame={handleLaunch}
    onNavigateView={setSidebarView}
    onRefreshLibrary={() => loadData({ preserveScroll: true })}
    layoutTheme={layoutTheme}
    guideSyncStatus={guideSyncStatus}
    onCancelGuideSync={() => window.api?.guides?.cancelBatch?.()}
    onFilterMissingGuides={(installedOnly = false) => {
      setQualityFilters(['missingGuide'])
      setSidebarView(installedOnly ? 'installed' : 'library')
    }}
  />
) : view === 'about' ? <AboutView /> : view === 'system' ? (
        <>
          {/* 1. Library Overview (Stats & Hardware Specs) */}
          <section className="stats-section">
            <div className="section-header compact">
              <div>
                <h2>Library overview</h2>
                <p>At-a-glance footprint across all connected sources.</p>
              </div>
              <span className="sync-label"><span className="pulse-dot" /> Synced locally</span>
            </div>
            <div className="stats-grid">
              <StatCard icon={Gamepad2} label="Visible games" value={displayTotalGames} meta={`${stats.hiddenGames || 0} hidden support/add-on entries`} />
              <StatCard icon={PackageOpen} label="DLC & add-ons" value={displayDlcGames} meta={`${stats.installedDlc || 0} installed add-ons`} accent="amber" />
              <StatCard icon={PackageCheck} label="Installed" value={displayInstalledGames} meta={`${installedPercent}% of visible library`} accent="violet" />
              <StatCard icon={Wrench} label="Utility tools" value={stats.utilityTools} meta="Performance & creator tools" accent="amber" />
              <StatCard icon={HardDrive} label="Disk footprint" value={formatGb(stats.totalStorageGb)} meta="Used by game library" accent="neutral" />
              <StatCard icon={Database} label="Available storage" value={stats.systemSpecs?.freeStorageGb ? `${stats.systemSpecs.freeStorageGb} GB` : '—'} meta={stats.systemSpecs?.driveCount ? `Free on ${stats.systemSpecs.driveCount} drives (${stats.systemSpecs.driveLetters || '—'})` : '—'} accent="green" />
              <StatCard icon={HardDrive} label="Total capacity" value={stats.systemSpecs?.totalStorageGb ? `${stats.systemSpecs.totalStorageGb} GB` : '—'} meta="Across all connected drives" accent="violet" />
              <StatCard icon={Cpu} label="System specs" value={stats.systemSpecs?.gpu ? stats.systemSpecs.gpu.replace(/NVIDIA\s+|GeForce\s+/gi, '') : 'Unknown GPU'} meta={`${stats.systemSpecs?.cpu ? stats.systemSpecs.cpu.replace(/Intel\s+|Core\s+/gi, '') : 'Unknown CPU'} · ${stats.systemSpecs?.ram || '—'}`} accent="neutral" />
            </div>
          </section>

          {/* 2. Library Health & Backups */}
          <LibraryHealthSection
            health={libraryHealth}
            stats={stats}
            backupsList={backupsList}
            backupBusy={backupBusy}
            restoreBusy={restoreBusy}
            onBackupNow={handleBackupNow}
            onOpenBackupsFolder={handleOpenBackupsFolder}
            onOpenBackupsManager={handleOpenBackupsManager}
          />

          {/* 3. Settings & Library Enrichment */}
          <MetadataProvidersSection
            onRefresh={loadData}
            globalSyncRunning={globalSyncRunning}
            globalSyncProgress={globalSyncProgress}
            onCancelSync={handleCancelGlobalSync}
          />

          {/* 4. Hidden Library Entries */}
          <HiddenItemsPanel games={hiddenGames} onRestore={(game) => updateHiddenState(game, false)} />

          {/* 5. Developer & Engine Diagnostics */}
          <AdvancedDiagnosticsSection
            themeName={LAYOUT_THEMES.find((t) => t.value === layoutTheme)?.label || layoutTheme}
            health={libraryHealth}
          />

          {/* 6. Database Management */}
          <DatabaseManagement
            onExport={handleExport}
            onBackup={handleBackupCache}
            onRestore={handleRestoreCache}
            onOpenBackups={handleOpenBackupsManager}
            onPurge={() => setPurgeOpen(true)}
          />

          {/* 7. Recent Activity Feed (Audit Trail) */}
          <RecentActivitySection
            activityLog={activityLog}
            loading={activityLoading}
            onRefresh={fetchSystemHealthAndActivity}
          />
        </>
      ) : isBigPictureMode ? (
        <ConsoleStageView
          games={filteredGames}
          focusedIndex={gamepadIndex}
          onIndexChange={setGamepadIndex}
          onLaunch={handleLaunch}
          onSelect={handleSelectGame}
          onToggleFavorite={handleToggleFavorite}
          layoutTheme={layoutTheme}
          connectedGamepad={connectedGamepad}
          gamepadGlyphStyle={gamepadGlyphStyle}
          isGamepadMode={isGamepadMode}
          isFocused={focusZone === 'grid'}
          isTodayPickMode={view === 'today'}
          onWinnerPick={handlePickWinner}
          spinTriggerRef={spinTodayRef}
        />
      ) : view === 'today' ? (
        <section className="library-section today-section">
          <div className="section-header compact">
            <div>
              <div className="eyebrow">
                <span>DAILY ROTATION</span>
                <span className="eyebrow-line" />
              </div>
              <h2>Today’s Pick</h2>
              <p>One installed, non-utility title selected from your local library.</p>
            </div>
          </div>
          <RoulettePanel
            onWinner={handlePickWinner}
            isGamepadMode={isGamepadMode}
            isFocused={focusZone === 'grid'}
            connectedGamepad={connectedGamepad}
            gamepadGlyphStyle={gamepadGlyphStyle}
            onLaunch={handleLaunch}
            onSelect={handleSelectGame}
            spinTriggerRef={spinTodayRef}
          />
        </section>
      ) : <section className="library-section library-pure-games">{isHomeView && (
  <ErrorBoundary fallback={null}>
    <HomeSpotlightAndShelf
      games={games}
      familyLocks={familyLocks}
      onLaunch={handleLaunch}
      onSelect={handleSelectGame}
      layoutTheme={layoutTheme}
      isCollapsed={isSpotlightCollapsed}
      onToggleCollapse={handleToggleSpotlight}
      isDrawerOpen={aiDrawerOpen}
      preferAnimatedArtwork={true}
      isGamepadMode={isGamepadMode}
      focusZone={focusZone}
      spotlightFocusIndex={spotlightFocusIndex}
      jumpInFocusIndex={jumpInFocusIndex}
      onSpotlightStateChange={setSpotlightState}
    />
  </ErrorBoundary>
)}{isBigPictureMode && !isDetailView ? (
  <div className="console-section-header">
    <div className="console-section-title-wrap">
      <span className="console-section-eyebrow">
        {layoutTheme === 'kinetic' ? '// SECTOR: ' : layoutTheme === 'competitive' ? 'ROSTER DIVISION // ' : layoutTheme === 'playful' ? '🎮 ' : ''}
        {view === 'installed' ? 'READY TO LAUNCH' : view === 'favorites' ? 'STARRED PICKS' : view === 'today' ? "TODAY'S SELECTION" : 'ALL GAMES'}
      </span>
      <h2 className="console-section-title">
        {view === 'installed' ? 'Installed Games' : view === 'favorites' ? 'Favorite Games' : view === 'today' ? "Today's Pick" : 'Complete Library'}
      </h2>
    </div>
    <span className="console-section-count">
      {filteredGames.length} {filteredGames.length === 1 ? 'title' : 'titles'}
    </span>
  </div>
) : (
<div className="library-top-bar">
  <div
    className="library-top-bar-left"
    onWheel={(e) => {
      if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
        e.currentTarget.scrollLeft += e.deltaY
      }
    }}
  >
    <div className="collection-header-brand">
      <h2 className="collection-title">{collectionHeading}</h2>
      <span className="collection-count">{filteredGames.length} titles</span>
    </div>
    <div className="top-bar-divider" />
    <CustomDropdown value={sortKey} onChange={setSortKey} options={sortOptions} icon={ArrowDownAZ} className="top-bar-dropdown" title="Sort games" />
    {sourcesPlacement === 'filterbar' && (
      <CustomDropdown
        value={sourceFilters[0] || 'all'}
        onChange={(val) => setSourceFilters(val === 'all' ? [] : [val])}
        options={[
          { value: 'all', label: `All stores (${games.length})` },
          ...sourceOptions.map((s) => ({ value: s.key, label: `${s.label} (${s.count})` })),
        ]}
        icon={Layers}
        className="top-bar-dropdown"
        title="Filter by store"
      />
    )}
    <CustomDropdown value={genreFilter} onChange={setGenreFilter} options={genreOptions} icon={Filter} className="top-bar-dropdown" title="Filter by genre" />
    <CustomDropdown value={backlogFilter} onChange={setBacklogFilter} options={backlogOptions} icon={SlidersHorizontal} className="top-bar-dropdown" title="Filter by backlog status" />
    <CustomDropdown value={timeFilter} onChange={setTimeFilter} options={timeOptions} icon={Clock} className="top-bar-dropdown" title="Filter by playtime (HowLongToBeat)" />
    <button
      type="button"
      className={cn('outline-button smart-ai-filter-trigger', (aiFilter || aiFilterOpen) && 'active')}
      onClick={() => setAiFilterOpen((prev) => !prev)}
      title="Smart AI Filter: Enter natural language criteria (e.g. 'Find me a short RPG I haven't played')"
    >
      <Sparkles size={12} style={{ color: 'var(--accent, #d6ff4b)', flexShrink: 0 }} />
      <span className="smart-ai-full">Smart AI Filter</span>
      <span className="smart-ai-compact">AI Filter</span>
      {aiFilter && (
        <span
          className="smart-ai-badge"
          style={{
            fontSize: '9.5px',
            background: 'var(--accent, #d6ff4b)',
            color: '#000',
            borderRadius: '4px',
            padding: '1px 5px',
            fontWeight: 700,
            marginLeft: '2px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Active
        </span>
      )}
    </button>
    <CustomDropdown
      value={currentQualityValue}
      onChange={handleQualityChange}
      options={qualityOptions}
      icon={Info}
      className={cn('top-bar-dropdown top-bar-missing-details-dropdown', currentQualityValue !== 'all' && 'filter-active')}
      title="Filter library by missing details or metadata"
      placeholder="Missing Details"
    />
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
        <span>Compact</span>
      </button>
    )}
    <button
      type="button"
      className={cn('outline-button select-mode-btn', selectMode && 'active')}
      onClick={() => {
        setSelectMode((current) => !current)
        if (selectMode) setSelectedIds([])
      }}
      title="Toggle batch selection mode"
    >
      <Check size={14} />
      <span>{selectMode ? 'Exit' : 'Select'}</span>
    </button>
    <button
      type="button"
      className="outline-button scan-import-btn"
      onClick={() => setScanOpen(true)}
      title="Scan local directories or import game files"
    >
      <ScanLine size={13} />
      <span>Scan</span>
    </button>
  </div>
</div>
)}
{(aiFilterOpen || aiFilter) && (
  <div
    className="smart-ai-filter-bar"
    style={{
      padding: '10px 14px',
      background: 'rgba(0, 0, 0, 0.45)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      backdropFilter: 'blur(10px)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
        <Sparkles
          size={13}
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--accent, #d6ff4b)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={aiFilterQuery}
          onChange={(e) => setAiFilterQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleApplyAiFilter(aiFilterQuery)
            }
          }}
          placeholder="Ask AI to filter: 'Find me a short RPG I haven't played', 'cozy games under 10 hours'..."
          style={{
            width: '100%',
            padding: '6px 10px 6px 30px',
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-primary, #ffffff)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <button
        type="button"
        className="primary-button"
        disabled={aiFilterLoading || !aiFilterQuery.trim()}
        onClick={() => handleApplyAiFilter(aiFilterQuery)}
        style={{
          height: '30px',
          padding: '0 12px',
          fontSize: '11px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {aiFilterLoading ? (
          <>
            <RotateCw size={11} className="spin-icon" />
            <span>Filtering...</span>
          </>
        ) : (
          <>
            <Sparkles size={11} />
            <span>Apply AI Filter</span>
          </>
        )}
      </button>

      {aiFilter && (
        <button
          type="button"
          className="outline-button"
          onClick={handleClearAiFilter}
          style={{
            height: '30px',
            padding: '0 10px',
            fontSize: '11px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            color: '#f87171',
          }}
        >
          <X size={12} />
          <span>Clear Filter</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => setAiFilterOpen(false)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted, #71717a)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
        }}
        title="Close AI Filter bar"
      >
        <X size={14} />
      </button>
    </div>

    {/* Active Filter Badges or Presets */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '11px' }}>
      {aiFilter ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--accent, #d6ff4b)', fontWeight: 600 }}>Active Criteria:</span>
          {aiFilter.genre && (
            <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '4px', color: '#fff' }}>
              Genre: {String(aiFilter.genre)}
            </span>
          )}
          {aiFilter.max_hltb && (
            <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '4px', color: '#fff' }}>
              Playtime: ≤ {aiFilter.max_hltb}h
            </span>
          )}
          {aiFilter.min_hltb && (
            <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '4px', color: '#fff' }}>
              Playtime: ≥ {aiFilter.min_hltb}h
            </span>
          )}
          {(aiFilter.unplayed || aiFilter.status === 'unplayed') && (
            <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '4px', color: '#fff' }}>
              Status: Unplayed
            </span>
          )}
          {aiFilter.installed && (
            <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '4px', color: '#fff' }}>
              Installed Only
            </span>
          )}
          {aiFilter.search && (
            <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '4px', color: '#fff' }}>
              Search: "{String(aiFilter.search)}"
            </span>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted, #71717a)' }}>Try asking:</span>
          {[
            "Short RPG I haven't played",
            "Action games under 10 hours",
            "Unplayed favorites",
            "Epic long games",
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAiFilterQuery(preset)
                handleApplyAiFilter(preset)
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '10.5px',
                color: 'var(--text-muted, #a1a1aa)',
                cursor: 'pointer',
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
)}
{selectMode ? <div className="bulk-action-bar"><span><Check size={14} /> {selectedIds.length} selected · {filteredRecordIds.length} filtered</span><div className="bulk-action-group"><button className="outline-button" disabled={bulkBusy || !filteredRecordIds.length} onClick={selectAllFiltered}><Check size={14} /> Select All Filtered</button><button className="outline-button" disabled={bulkBusy || !selectedIds.length} onClick={deselectAll}><X size={14} /> Deselect All</button><button className="outline-button" disabled={bulkBusy || !selectedIds.length} onClick={() => handleBulkMove('dlc')}><PackageOpen size={14} /> Move to DLC</button><button className="outline-button" disabled={bulkBusy || !selectedIds.length} onClick={handleBulkHide}><EyeOff size={14} /> Hide from Library</button><button className="outline-button" disabled={bulkBusy || !selectedIds.length} onClick={handleRefetchSelected}><RefreshCw size={14} /> Re-fetch Artwork</button><button className="outline-button" disabled={bulkBusy || !selectedIds.length} onClick={handleExportSelected}><FileDown size={14} /> Export Selected to CSV</button><button className="outline-button" disabled={bulkBusy || !selectedIds.length} onClick={() => setBulkEditOpen(true)}><SlidersHorizontal size={14} /> Edit Selected</button><button className="danger-button" disabled={bulkBusy || !selectedIds.length} onClick={handleDeleteSelected}><Trash2 size={14} /> Delete Selected</button></div></div> : null}{notice ? <div className={cn('notice', noticeTone === 'error' && 'notice-error', noticeTone === 'warning' && 'notice-warning')}>{noticeTone === 'error' ? <X size={14} /> : noticeTone === 'warning' ? <AlertTriangle size={14} /> : <Check size={14} />} {notice}</div> : null}{loading && !filteredGames.length && !showIntro ? <div className="empty-state"><div className="loader" /> Loading and indexing your library…</div> : filteredGames.length ? <ErrorBoundary><VirtualGrid games={filteredGames} familyLocks={familyLocks} onLaunch={handleLaunch} onSelect={handleSelectGame} onHideGame={(game) => updateHiddenState(game, true)} onMoveCategory={moveCategory} onEditGame={setEditorGame} onContextMenu={handleCardContextMenu} onArtworkChanged={handleArtworkChanged} onArtworkError={handleArtworkError} selectMode={selectMode} selectedIds={selectedIds} onToggleSelect={toggleGameSelection} scrollElementRef={mainScrollRef} onImageError={handleImageError} initialScrollTop={activeGame?.id === lastClickedGameIdRef.current ? libraryScrollRef.current : 0} restoreGameId={activeGame?.id || lastClickedGameIdRef.current} restoredGameId={restoredGameId} gamepadFocusIndex={isGamepadMode && focusZone === 'grid' ? gamepadIndex : -1} onToggleFavorite={handleToggleFavorite} isBigPictureMode={isBigPictureMode} /></ErrorBoundary> : (!games.length && !query && !sourceFilters.length && genreFilter === 'all' && backlogFilter === 'all' && !qualityFilters.length) ? <div className="empty-state"><strong>Your library is empty.</strong><span>Click Scan & import (top right) to add your games.</span></div> : <div className="empty-state"><Search size={21} /><span>No titles match {query ? `"${query}"` : aiFilter ? `AI filter "${aiFilter.originalQuery || 'custom'}"` : 'these filters'}.</span>{aiFilter ? (<button type="button" className="outline-button" style={{ marginTop: '10px', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={handleClearAiFilter}><X size={14} /><span>Clear Smart AI Filter</span></button>) : null}{query ? (<button type="button" className="outline-button" style={{ marginTop: '10px', borderColor: 'var(--accent, #d6ff4b)', color: 'var(--accent, #d6ff4b)', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setAiDrawerOpen(true)}><Sparkles size={14} /><span>Ask AI Companion about "{query}"</span></button>) : null}</div>}</section>}</ErrorBoundary></div>{isBigPictureMode ? (
  <footer className="console-hud-footer">
    <div className="console-hud-shortcuts">
      <span className="console-hud-item">
        <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
        <span>{isDetailView ? 'Launch' : 'Play Now'}</span>
      </span>
      <span className="console-hud-item">
        <GamepadGlyph button="B" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
        <span>{isDetailView ? 'Library' : 'Back / Desktop'}</span>
      </span>
      <span className="console-hud-item">
        <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
        <span>{isDetailView ? 'Status' : 'Details'}</span>
      </span>
      <span className="console-hud-item">
        <GamepadGlyph button="Y" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
        <span>Favorite</span>
      </span>
      <span className="console-hud-item">
        <GamepadGlyph button="LB/RB" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
        <span>{isDetailView ? 'Tabs' : 'Category'}</span>
      </span>
      <span className="console-hud-item">
        <GamepadGlyph button="START" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
        <span>Settings</span>
      </span>
      {isDetailView && (
        <span className="console-hud-item">
          <GamepadGlyph button="LT/RT" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
          <span>Games</span>
        </span>
      )}
    </div>
  </footer>
) : (
  <footer className="statusbar"><span className="statusbar-item statusbar-terminal"><TerminalSquare size={13} style={{ color: 'var(--accent, #d6ff4b)', opacity: 0.9 }} /> {scannerStatus ? <span className="inline-flex items-center gap-1.5"><span className="pulse-dot" /> {scannerStatus}</span> : 'Ready'}</span>{globalSyncRunning && (<span className="statusbar-item statusbar-sync-active" title="Artwork & metadata sync in progress"><span className="pulse-dot" /><span>{globalSyncProgress?.gameTitle ? `Syncing: ${globalSyncProgress.gameTitle} (${globalSyncProgress.current}/${globalSyncProgress.total})${globalSyncProgress.formattedTransfer ? ` • ${globalSyncProgress.formattedTransfer}` : ''}` : (globalSyncProgress?.message || `Syncing artwork (${globalSyncProgress?.current || 0}/${globalSyncProgress?.total || 0})...`)}</span><button type="button" onClick={handleCancelGlobalSync} className="statusbar-cancel-btn" title="Cancel sync immediately"><X size={11} /> Cancel</button></span>)}{guideSyncStatus?.running && (<span className="statusbar-item statusbar-sync-active" title="Strategy guides downloading from StrategyWiki in progress"><span className="pulse-dot" /><span>{guideSyncStatus.progress?.title ? `Downloading Guides: ${guideSyncStatus.progress.title} (${guideSyncStatus.progress.current}/${guideSyncStatus.progress.total})` : 'Downloading Guides from StrategyWiki...'}</span><button type="button" onClick={() => window.api?.guides?.cancelBatch?.()} className="statusbar-cancel-btn" title="Cancel guide download"><X size={11} /> Cancel</button></span>)}<span className="statusbar-item statusbar-storage"><HardDrive size={11} style={{ color: 'var(--accent, #d6ff4b)', opacity: 0.85 }} /> Offline · Local storage</span>{isVoiceListening && (<span className="statusbar-item statusbar-voice-listening" style={{ color: 'var(--accent, #d6ff4b)' }}><span className="pulse-dot" style={{ background: 'var(--accent, #d6ff4b)', boxShadow: '0 0 8px var(--accent-glow, rgba(214, 255, 75, 0.6))' }} /> Listening (PTT)...</span>)}{connectedGamepad && (<><span className="statusbar-item statusbar-gamepad" title={`Connected Controller: ${connectedGamepad}`}><Gamepad2 size={12} style={{ color: 'var(--accent, #d6ff4b)' }} /><span>{connectedGamepad}</span></span><span className="statusbar-item statusbar-shortcuts" title="Controller Navigation Shortcuts"><span className="statusbar-shortcut-item"><GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} /> Select</span><span className="statusbar-shortcut-item"><GamepadGlyph button="B" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} /> {isDetailView ? 'Library' : 'Back'}</span><span className="statusbar-shortcut-item"><GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} /> {isDetailView ? 'Launch' : 'Status'}</span><span className="statusbar-shortcut-item"><GamepadGlyph button="Y" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} /> Fav</span><span className="statusbar-shortcut-item"><GamepadGlyph button="LB/RB" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} /> {isDetailView ? 'Tabs' : 'Views'}</span>{isDetailView && <span className="statusbar-shortcut-item"><GamepadGlyph button="LT/RT" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} /> Games</span>}</span></>)}<span className="statusbar-item statusbar-version">Version 1.3.96</span></footer>
)}</main>
    </div><VirtualKeyboard isOpen={oskOpen} value={query} onChange={(val) => { setQuery(val); setDebouncedQuery(val); setGamepadIndex(0); if (view === 'system' || view === 'today' || view === 'about') setSidebarView('all'); }} onDone={() => { setOskOpen(false); setFocusZone('grid'); setGamepadIndex(0); }} onClose={() => { setOskOpen(false); setFocusZone('grid'); setGamepadIndex(0); }} activeRow={oskRow} activeCol={oskCol} matchCount={filteredGames.length} isGamepadMode={isGamepadMode} gamepadGlyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} /><SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} initialTab={settingsModalTab} isGamepadMode={isGamepadMode} settingsSection={settingsSection} settingsCategoryIndex={settingsCategoryIndex} settingsContentIndex={settingsContentIndex} onSettingsTabChange={(tabId) => { setSettingsModalTab(tabId); const idx = SETTINGS_TAB_IDS.indexOf(tabId); if (idx >= 0) setSettingsCategoryIndex(idx); }} gamepadGlyphStyle={gamepadGlyphStyle} onGamepadGlyphStyleChange={handleGamepadGlyphStyleChange} consoleAudioEnabled={consoleAudioEnabled} onToggleConsoleAudio={handleToggleConsoleAudio} stats={stats} health={libraryHealth} backupsList={backupsList} backupBusy={backupBusy} restoreBusy={restoreBusy} onBackupNow={handleBackupNow} onOpenBackupsFolder={handleOpenBackupsFolder} onOpenBackupsManager={handleOpenBackupsManager} onExport={handleExport} onBackupCache={handleBackupCache} onRestoreCache={handleRestoreCache} onPurge={() => setPurgeOpen(true)} onRefresh={() => loadData({ preserveScroll: true })} connectedGamepad={connectedGamepad} hiddenGames={hiddenGames} onRestoreHidden={(game) => updateHiddenState(game, false)} activityLog={activityLog} activityLoading={activityLoading} onRefreshActivity={fetchSystemHealthAndActivity} layoutTheme={layoutTheme} onLayoutThemeChange={handleLayoutThemeChange} sourcesPlacement={sourcesPlacement} onSourcesPlacementChange={handleSourcesPlacementChange} colorPalette={colorPalette} onColorPaletteChange={handleColorPaletteChange} onTriggerIntroPreview={() => { setSettingsModalOpen(false); setShowIntro(true); }} aiUserEnabled={aiUserEnabled} onToggleAiUserEnabled={handleToggleAiUserEnabled} aiInstalled={aiInstalled} isBigPictureMode={isBigPictureMode} onExitBigPicture={() => handleToggleBigPicture(false)} /><AiAssistantDrawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        activeGame={activeGame}
        layoutTheme={layoutTheme}
        games={games}
        onAction={handleAiAction}
        isVoiceListening={isVoiceListening}
        onToggleVoice={toggleVoiceListening}
        isBigPictureMode={isBigPictureMode}
        connectedGamepad={connectedGamepad}
        gamepadGlyphStyle={gamepadGlyphStyle}
        onOpenOsk={() => {
          setOskOpen(true)
        }}
      /><ScanImportPanel open={scanOpen} onClose={() => setScanOpen(false)} onRefresh={loadData} /><GameEditorModal game={editorGame} onClose={() => setEditorGame(null)} onSaved={handleEditorSaved} /><PurgeConfirmModal open={purgeOpen} busy={purgeBusy} onClose={() => setPurgeOpen(false)} onConfirm={handlePurge} /><BulkEditModal open={bulkEditOpen} count={selectedIds.length} busy={bulkBusy} onClose={() => setBulkEditOpen(false)} onApply={handleBulkApply} /><ContextMenu menu={contextMenu} menuRef={contextMenuRef} onClose={() => setContextMenu(null)} onMoveCategory={moveCategory} onEditGame={setEditorGame} onHideGame={(game) => updateHiddenState(game, true)} onArtworkChanged={handleArtworkChanged} onArtworkError={handleArtworkError} onToggleFavorite={handleToggleFavorite} /><ConfirmActionModal config={confirmModal} onClose={() => setConfirmModal(null)} isGamepadMode={isGamepadMode} connectedGamepad={connectedGamepad} gamepadGlyphStyle={gamepadGlyphStyle} />{checkpointPrompt && (
  <div
    className="checkpoint-note-toast"
    style={{
      position: 'fixed',
      bottom: '48px',
      right: '24px',
      zIndex: 9999,
      width: '380px',
      padding: '16px',
      background: 'rgba(18, 18, 22, 0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(214, 255, 75, 0.3)',
      borderRadius: '12px',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Bookmark size={13} style={{ color: 'var(--accent, #d6ff4b)' }} />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>
          Leave a quick note for next time?
        </span>
      </div>
      <button
        type="button"
        onClick={() => setCheckpointPrompt(null)}
        style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', padding: '2px' }}
      >
        <X size={13} />
      </button>
    </div>
    <div style={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '10px' }}>
      {checkpointPrompt.title} session ended. What were you working on?
    </div>
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSaveCheckpointNote()
      }}
      style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
    >
      <input
        type="text"
        autoFocus
        value={checkpointText}
        onChange={handleCheckpointTextChange}
        placeholder="e.g. Cleared sewer boss, go north..."
        style={{
          flex: 1,
          padding: '7px 10px',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          color: '#ffffff',
          fontSize: '11px',
          outline: 'none',
        }}
      />
      <button
        type="button"
        onClick={toggleVoiceListening}
        title={isVoiceListening ? 'Recording note... click to stop' : 'Speak note (offline STT)'}
        style={{
          padding: '7px',
          background: isVoiceListening ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          border: isVoiceListening ? '1px solid var(--accent, #d6ff4b)' : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          color: isVoiceListening ? 'var(--accent, #d6ff4b)' : 'var(--text-secondary, #94a3b8)',
          cursor: 'pointer',
        }}
      >
        {isVoiceListening ? <Mic size={13} /> : <MicOff size={13} />}
      </button>
      <button
        type="submit"
        disabled={checkpointSaving || !checkpointText.trim()}
        className="primary-button"
        style={{
          padding: '6px 12px',
          fontSize: '11px',
          height: '29px',
          background: 'var(--accent, #d6ff4b)',
          color: '#000000',
          fontWeight: 600,
          borderRadius: '6px',
        }}
      >
        {checkpointSaving ? 'Saving...' : 'Save'}
      </button>
    </form>
  </div>
)}<BackupsManagerModal open={backupsModalOpen} busy={backupBusy || restoreBusy} backups={backupsList} loading={backupsLoading} backupsDirectory={backupsDirectory || libraryHealth?.backupsDirectory} onClose={() => setBackupsModalOpen(false)} onBackupNow={handleBackupNow} onOpenFolder={handleOpenBackupsFolder} onRestoreBackup={handleRestoreBackup} onChooseAndRestoreFile={handleChooseAndRestoreFile} />{showIntro && <IntroSplash layoutTheme={layoutTheme} isDataLoaded={dataLoaded} onFinish={() => setShowIntro(false)} />}</div>
}
export default App