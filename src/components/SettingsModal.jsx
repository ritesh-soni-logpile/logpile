const METRIC_OPTIONS = [
  { key: 'fps', label: 'Current Framerate (FPS)', desc: 'Real-time frame velocity' },
  { key: 'onePercentLow', label: '1% Low Framerate', desc: 'Detect sudden frame drops and micro-stutters' },
  { key: 'frametime', label: 'Frametime (ms)', desc: 'Frame delivery pacing consistency (e.g. 16.6ms at 60 FPS)' },
  { key: 'gpu', label: 'GPU & VRAM Load', desc: 'Graphics card utilization and video memory usage' },
  { key: 'cpu', label: 'CPU Load %', desc: 'Processor utilization across all cores' },
  { key: 'ram', label: 'System RAM Usage', desc: 'Active memory consumption during gameplay' },
  { key: 'clock', label: 'Clock & Session Timer', desc: 'Real-time clock and playtime to track late-night gaming' },
  { key: 'battery', label: 'Battery Level %', desc: 'Battery charge & power status for gaming laptops and handhelds' }
]

function getFpsPositionStyle(pos) {
  switch (pos) {
    case 'top-left':
      return { top: '14px', left: '14px', transform: 'none' }
    case 'top-center':
      return { top: '14px', left: '50%', transform: 'translateX(-50%)' }
    case 'top-right':
      return { top: '14px', right: '14px', transform: 'none' }
    case 'left-center':
      return { top: '50%', left: '14px', transform: 'translateY(-50%)' }
    case 'right-center':
      return { top: '50%', right: '14px', transform: 'translateY(-50%)' }
    case 'bottom-left':
      return { bottom: '14px', left: '14px', transform: 'none' }
    case 'bottom-center':
      return { bottom: '14px', left: '50%', transform: 'translateX(-50%)' }
    case 'bottom-right':
    default:
      return { bottom: '14px', right: '14px', transform: 'none' }
  }
}

import { renderHudPreview, PerformanceHud } from './PerformanceHud'
export { renderHudPreview, PerformanceHud }

const HUD_PREVIEW_TELEMETRY = {
  fps: 144,
  onePercentLow: 138,
  frametime: 6.9,
  hasGpu: true,
  gpuUsage: 0,
  gpuTemp: 42,
  cpuUsage: 8,
  ramUsedGb: 13.5,
  hasBattery: false,
  clock: '2:14 PM',
}

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Search,
  SlidersHorizontal,
  Keyboard,
  Bot,
  KeyRound,
  Gamepad2,
  Database,
  CircleHelp,
  X,
  Check,
  CheckSquare,
  Square,
  FolderOpen,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  PlugZap,
  AlertTriangle,
  Gauge,
  ImagePlus,
  Film,
  WandSparkles,
  Trash2,
  FileDown,
  Archive,
  UploadCloud,
  ExternalLink,
  Coffee,
  CupSoda,
  Github,
  Heart,
  Sparkles,
  Mic,
  Copy,
  Info,
  Laptop,
  CheckCheck,
  PackageCheck,
  PackageOpen,
  Palette,
  Cpu,
  HardDrive,
  TerminalSquare,
  Activity,
  Play,
  ScanLine,
  Clock,
  ChevronDown,
  ChevronRight,
  Volume2,
  VolumeX,
  Download,
  Upload,
  Moon,
  Trophy,
  Plus,
  Flame,
  Droplets,
  HeartPulse,
  Skull,
  RotateCcw,
  MicOff
} from 'lucide-react'
import {
  getCustomThemes,
  saveCustomThemes,
  importCustomTheme,
  removeCustomTheme,
  bulkRemoveCustomThemes,
  exportCustomThemes,
  importCustomThemesFromJson,
  resetAllCustomThemes,
  getEnabledAddonIds,
  toggleAddonTheme,
  SAMPLE_DAILY_THEME
} from '../utils/themeAddons'
import {
  searchThemeRag,
  buildCustomThemeFromPrompt,
  createThemeRestorePoint,
  restoreThemeFromPoint,
  getThemeRestorePoint,
  THEME_RAG_DATABASE
} from '../utils/themePresetsRag'

function formatGb(value) {
  return `${Number(value || 0).toFixed(value < 10 ? 2 : 1)} GB`
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatTimestamp(unixMs) {
  if (!unixMs) return '—'
  return new Date(unixMs).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatPlayTime(seconds) {
  if (!seconds || seconds <= 0) return '0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
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
      return `Imported ${count} games${file}`
    }
    const count = details.discoveredTotal || details.discoveredGames || details.scannedGames || 0
    return `Completed library scan: ${count} titles processed`
  }
  if (type === 'metadata_update') {
    const count = details.updatedCount || details.updated || 1
    return `Refreshed game metadata (${count} record${count === 1 ? '' : 's'})`
  }
  if (type === 'artwork_update') {
    const title = details.title || 'game'
    return `Updated visual artwork for ${title}`
  }
  if (type === 'backup') {
    return details.filename ? `Created backup snapshot: ${details.filename}` : 'Created point-in-time database backup'
  }
  return item.message || item.summary || 'Library activity recorded'
}

function formatActivityEventTime(timestamp) {
  if (!timestamp) return 'Just now'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Recently'
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function PillToggle({ checked, onChange, disabled = false, size = 'md' }) {
  const isSm = size === 'sm'
  const trackWidth = isSm ? 32 : 38
  const trackHeight = isSm ? 18 : 22
  const thumbSize = isSm ? 14 : 16
  const travel = trackWidth - thumbSize - 4

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onChange?.(!checked)
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        userSelect: 'none',
        flexShrink: 0
      }}
      title={checked ? 'Enabled (Click to turn off)' : 'Disabled (Click to turn on)'}
    >
      <span
        style={{
          width: `${trackWidth}px`,
          height: `${trackHeight}px`,
          borderRadius: '999px',
          background: checked ? 'var(--accent, #d6ff4b)' : 'rgba(255, 255, 255, 0.1)',
          border: checked ? '1px solid var(--accent, #d6ff4b)' : '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: checked ? '0 0 10px rgba(214, 255, 75, 0.3)' : 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          display: 'inline-block',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            width: `${thumbSize}px`,
            height: `${thumbSize}px`,
            borderRadius: '50%',
            background: checked ? '#0a0c10' : '#888888',
            transform: checked ? `translateX(${travel}px)` : 'translateX(0)',
            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)'
          }}
        />
      </span>
    </button>
  )
}

function SettingsShortcutRecorder({ value, defaultValue, onChange, label, description }) {
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
    <div className="settings-shortcut-row">
      <div className="settings-shortcut-info">
        <strong className="settings-shortcut-label">{label}</strong>
        {description && <p className="settings-shortcut-desc">{description}</p>}
      </div>
      <div className="settings-shortcut-actions">
        {recording ? (
          <div
            className="settings-shortcut-box recording"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onBlur={() => setRecording(false)}
            autoFocus
          >
            <span>Press 2 or 3 keys (e.g. Ctrl+Shift+K)...</span>
            <small>Esc to cancel</small>
          </div>
        ) : (
          <button
            type="button"
            className="settings-shortcut-box"
            onClick={() => setRecording(true)}
            title="Click to record new key combination"
          >
            <Keyboard size={13} style={{ color: 'var(--accent, #d6ff4b)', opacity: 0.8 }} />
            <kbd>{displayString}</kbd>
          </button>
        )}
        {value && defaultValue && value !== defaultValue && (
          <button
            type="button"
            className="settings-shortcut-reset"
            onClick={() => onChange(defaultValue)}
            title="Reset to default shortcut"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

export function SettingsModal({
  isOpen,
  onClose,
  initialTab = 'general',
  stats = {},
  health = {},
  backupsList = [],
  backupBusy = false,
  restoreBusy = false,
  onBackupNow,
  onOpenBackupsFolder,
  onOpenBackupsManager,
  onExport,
  onBackupCache,
  onRestoreCache,
  onPurge,
  onRefresh,
  connectedGamepad = null,
  hiddenGames = [],
  onRestoreHidden,
  activityLog = [],
  activityLoading = false,
  onRefreshActivity,
  layoutTheme = 'cinematic',
  onLayoutThemeChange,
  onTriggerIntroPreview,
}) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [copiedKey, setCopiedKey] = useState(null)

  // Settings state
  const [steamGridDbApiKey, setSteamGridDbApiKey] = useState('')
  const [igdbClientId, setIgdbClientId] = useState('')
  const [igdbClientSecret, setIgdbClientSecret] = useState('')
  const [heroResolution, setHeroResolution] = useState('2.5k')
  const [preferAnimatedArtwork, setPreferAnimatedArtwork] = useState(false)
  const [preferAnimatedCovers, setPreferAnimatedCovers] = useState(false)
  const [minimizeToTray, setMinimizeToTray] = useState(false)
  const [playIntro, setPlayIntro] = useState(() => {
    try {
      return localStorage.getItem('logpile-play-intro') !== 'false'
    } catch {
      return true
    }
  })
  const [introMuted, setIntroMuted] = useState(() => {
    try {
      return localStorage.getItem('logpile-intro-muted') !== 'false'
    } catch {
      return true
    }
  })
  const [enabledAddonIds, setEnabledAddonIds] = useState(() => getEnabledAddonIds())
  const [customThemes, setCustomThemes] = useState(() => getCustomThemes())
  const [addonNotice, setAddonNotice] = useState('')
  const [introOnThemeChange, setIntroOnThemeChange] = useState(() => {
    try {
      return localStorage.getItem('logpile-intro-on-theme-change') !== 'false'
    } catch {
      return true
    }
  })
  const [autoHideSupportEntries, setAutoHideSupportEntries] = useState(true)
  const [overlayShortcut, setOverlayShortcut] = useState('CommandOrControl+Shift+Space')
  const [fpsShortcut, setFpsShortcut] = useState('CommandOrControl+Shift+F')
  const [searchShortcut, setSearchShortcut] = useState('CommandOrControl+F')
  const [fpsEnabled, setFpsEnabled] = useState(false)
  const [fpsPosition, setFpsPosition] = useState('top-right')
  const [fpsOrientation, setFpsOrientation] = useState('horizontal')
  const [fpsOpacity, setFpsOpacity] = useState(80)
  const [fpsStyle, setFpsStyle] = useState('minimalist-pill')
  const [fpsTestMode, setFpsTestMode] = useState(false)

  const [shortcutSavedNotice, setShortcutSavedNotice] = useState(false)
  const [aiStatus, setAiStatus] = useState(null)
  const [aiPersonality, setAiPersonality] = useState(() => {
    try {
      return localStorage.getItem('logpile-ai-personality') || 'auto'
    } catch {
      return 'auto'
    }
  })

  const [voiceSettings, setVoiceSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('logpile-voice-settings')
      return stored ? JSON.parse(stored) : { ttsEnabled: true, wakeWordEnabled: false }
    } catch {
      return { ttsEnabled: true, wakeWordEnabled: false }
    }
  })

  const [showKeys, setShowKeys] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)
  const [igdbTestStatus, setIgdbTestStatus] = useState(null)

  // AI Theme Studio states & deterministic RAG engine
  const [themePrompt, setThemePrompt] = useState('')
  const [themeGameId, setThemeGameId] = useState('')
  const [themeStudioBusy, setThemeStudioBusy] = useState(false)
  const [themeStudioMessage, setThemeStudioMessage] = useState('')
  const [themePreviewObj, setThemePreviewObj] = useState(null)
  const [themeRestorePoint, setThemeRestorePoint] = useState(() => getThemeRestorePoint())
  const [isThemeVoiceListening, setIsThemeVoiceListening] = useState(false)
  const [installedGamesList, setInstalledGamesList] = useState([])
  const [customThemesList, setCustomThemesList] = useState(() => getCustomThemes())
  const [selectedCustomThemeIds, setSelectedCustomThemeIds] = useState([])
  const [themeGameSearchQuery, setThemeGameSearchQuery] = useState('')
  const [selectedGameForTheme, setSelectedGameForTheme] = useState(null)
  const [isGameSearchOpen, setIsGameSearchOpen] = useState(false)
  const [modelIntakeModal, setModelIntakeModal] = useState({ isOpen: false, fileInfo: null, isProcessing: false, error: null })
  const [aiExecutionMode, setAiExecutionMode] = useState('cpu-safe')
  const [autoUnloadOnGame, setAutoUnloadOnGame] = useState(true)
  const themeJsonInputRef = useRef(null)

  useEffect(() => {
    window.api?.database?.getGames?.()?.then((res) => {
      if (res && res.games) setInstalledGamesList(res.games)
      else if (Array.isArray(res)) setInstalledGamesList(res)
    })?.catch(() => {})
  }, [])

  useEffect(() => {
    window.api?.ai?.getStatus?.().then((st) => {
      if (st) setAiStatus(st)
    }).catch(() => {})

    window.api?.ai?.getExecutionMode?.().then((mode) => {
      if (mode) setAiExecutionMode(mode)
    }).catch(() => {})

    window.api?.ai?.getAutoUnload?.().then((val) => {
      if (typeof val === 'boolean') setAutoUnloadOnGame(val)
    }).catch(() => {})
  }, [isOpen])

  const matchingGamesForTheme = useMemo(() => {
    if (!themeGameSearchQuery.trim()) return []
    const q = themeGameSearchQuery.toLowerCase()
    return installedGamesList.filter((g) => {
      const title = (g.canonical_title || g.title || '').toLowerCase()
      const dev = (g.developer || '').toLowerCase()
      const genre = (g.genre || '').toLowerCase()
      return title.includes(q) || dev.includes(q) || genre.includes(q)
    })
  }, [installedGamesList, themeGameSearchQuery])

  const handleBrowseModelFile = async () => {
    try {
      const res = await window.api?.ai?.selectModelFile?.()
      if (res && !res.canceled && res.filePath) {
        setModelIntakeModal({ isOpen: true, fileInfo: res, isProcessing: false, error: null })
      }
    } catch (err) {
      setThemeStudioMessage(`Failed to select file: ${err?.message}`)
    }
  }

  const handleConfirmAttachModel = async (action) => {
    if (!modelIntakeModal.fileInfo?.filePath) return
    setModelIntakeModal((prev) => ({ ...prev, isProcessing: true, error: null }))
    try {
      const res = await window.api?.ai?.attachModelFile?.(modelIntakeModal.fileInfo.filePath, action)
      if (res?.success) {
        const nextStatus = await window.api?.ai?.getStatus?.()
        if (nextStatus) setAiStatus(nextStatus)
        setModelIntakeModal({ isOpen: false, fileInfo: null, isProcessing: false, error: null })
        setThemeStudioMessage(`Model "${modelIntakeModal.fileInfo.fileName}" attached successfully! Ready for theme generation.`)
      } else {
        setModelIntakeModal((prev) => ({ ...prev, isProcessing: false, error: res?.error || 'Failed to attach model.' }))
      }
    } catch (err) {
      setModelIntakeModal((prev) => ({ ...prev, isProcessing: false, error: err?.message || 'Error attaching model.' }))
    }
  }

  const handleSetAiExecutionMode = async (mode) => {
    setAiExecutionMode(mode)
    try {
      await window.api?.ai?.setExecutionMode?.(mode)
    } catch {}
  }

  const handleExportThemes = (idsToExport = null) => {
    try {
      const jsonStr = exportCustomThemes(idsToExport)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `logpile-themes-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setThemeStudioMessage(`Exported ${idsToExport ? idsToExport.length : customThemesList.length} themes to JSON file.`)
    } catch (err) {
      setThemeStudioMessage(`Export failed: ${err?.message}`)
    }
  }

  const handleImportThemesFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const fileContent = evt.target?.result
        const res = importCustomThemesFromJson(fileContent)
        if (res.success) {
          setCustomThemesList(getCustomThemes())
          setThemeStudioMessage(`Successfully imported ${res.count} custom theme(s)!`)
        } else {
          setThemeStudioMessage(`Import error: ${res.error}`)
        }
      } catch (err) {
        setThemeStudioMessage(`Failed to parse file: ${err?.message}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleToggleSelectTheme = (id) => {
    setSelectedCustomThemeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAllThemes = () => {
    if (selectedCustomThemeIds.length === customThemesList.length) {
      setSelectedCustomThemeIds([])
    } else {
      setSelectedCustomThemeIds(customThemesList.map((t) => t.id))
    }
  }

  const handleBulkDeleteThemes = () => {
    if (selectedCustomThemeIds.length === 0) return
    if (!window.confirm(`Delete ${selectedCustomThemeIds.length} selected custom theme(s)?`)) return
    const updated = bulkRemoveCustomThemes(selectedCustomThemeIds)
    setCustomThemesList(updated)
    setSelectedCustomThemeIds([])
    setThemeStudioMessage('Selected custom themes deleted.')
  }

  const handleSingleDeleteTheme = (id, name) => {
    if (!window.confirm(`Delete theme "${name}"?`)) return
    const updated = removeCustomTheme(id)
    setCustomThemesList(updated)
    setSelectedCustomThemeIds((prev) => prev.filter((x) => x !== id))
    setThemeStudioMessage(`Theme "${name}" deleted.`)
  }

  const handleFactoryResetThemes = () => {
    if (!window.confirm('Delete ALL custom themes and reset to factory presets? This cannot be undone.')) return
    resetAllCustomThemes()
    setCustomThemesList([])
    setSelectedCustomThemeIds([])
    setThemeStudioMessage('All custom themes deleted. Factory presets restored.')
  }

  const SURPRISE_HUD_STYLES = [
    'Cute anime girl with pastel cherry blossom pink and soft lilac glow',
    'Tarkov tactical PMC combat stasis with military olive and vital scan',
    'Helldivers 2 Super Earth democracy gold and black orbital command',
    'Witcher 3 Geralt wolf medallion with dark fantasy silver and crimson',
    'Winamp 1999 retro PC media player with bouncing green LED equalizer',
    'Minecraft survival mode with 8-bit red pixel hearts and green border',
    'Gen Alpha meme high performance cooking gauge with neon green',
    'Full rainbow chroma RGB gradient aura that cycles smoothly',
    'Dark stealth operative with amber HUD and minimal border lines',
    'Synthwave 1984 neon sunset with electric magenta and cyan horizon'
  ]

  const handleGenerateTheme = async () => {
    let promptToUse = themePrompt.trim()
    let isSurprise = false
    if (!promptToUse && !selectedGameForTheme) {
      isSurprise = true
      promptToUse = SURPRISE_HUD_STYLES[Math.floor(Math.random() * SURPRISE_HUD_STYLES.length)]
      setThemePrompt(promptToUse)
    }

    setThemeStudioBusy(true)
    const hasAiModel = Boolean(aiStatus?.installed)

    if (hasAiModel) {
      setThemeStudioMessage('⏳ Loading AI model into memory (first launch may take a few seconds on HDD/USB)...')
    } else {
      setThemeStudioMessage('⚡ Generating custom theme via Logpile Offline Engine...')
    }

    const loadingStageTimer = setTimeout(() => {
      if (hasAiModel) {
        setThemeStudioMessage('🧠 AI is designing custom HUD & palette...')
      }
    }, 2800)

    try {
      // 1. Create automatic restore point before generating
      const snapshot = createThemeRestorePoint()
      setThemeRestorePoint(snapshot)

      // 2. Query local AI model if attached
      let aiThemeResult = null
      if (hasAiModel) {
        try {
          const cleanGamePayload = selectedGameForTheme ? {
            id: selectedGameForTheme.id,
            canonical_title: selectedGameForTheme.canonical_title || selectedGameForTheme.title || '',
            title: selectedGameForTheme.title || selectedGameForTheme.canonical_title || '',
            genre: selectedGameForTheme.genre || '',
            developer: selectedGameForTheme.developer || ''
          } : null

          const aiRes = await window.api?.ai?.generateHudTheme?.(promptToUse, cleanGamePayload)
          if (aiRes && aiRes.success && aiRes.themeDesign) {
            aiThemeResult = aiRes.themeDesign
          } else if (aiRes && !aiRes.success) {
            console.warn('[AI Studio] Local model theme generation notice:', aiRes?.error)
          }
        } catch (aiErr) {
          console.warn('[AI Studio] Local model theme generation fallback:', aiErr?.message)
        }
      }

      // 3. Build validated, anti-brick custom theme
      const generated = buildCustomThemeFromPrompt(promptToUse, selectedGameForTheme, aiThemeResult)
      setThemePreviewObj(generated)

      if (aiThemeResult) {
        setThemeStudioMessage(`✨ AI Designed: "${generated.name}" (${generated.tagline}). Click "Apply Theme & Activate HUD" below!`)
      } else if (hasAiModel) {
        setThemeStudioMessage(`⚡ Grounded Preset: "${generated.name}" (${generated.category}). Click "Apply Theme & Activate HUD" below!`)
      } else {
        setThemeStudioMessage(`✨ Generated with Offline Engine: "${generated.name}". (Attach a GGUF model anytime for AI design).`)
      }
    } catch (err) {
      setThemeStudioMessage(`Failed to generate: ${err?.message}`)
    } finally {
      clearTimeout(loadingStageTimer)
      setThemeStudioBusy(false)
    }
  }

  const handleApplyGeneratedTheme = () => {
    if (!themePreviewObj) return
    try {
      importCustomTheme(themePreviewObj)
      setFpsStyle(themePreviewObj.id)
      handleUpdateShortcutSetting({ fpsStyle: themePreviewObj.id })
      setThemeStudioMessage(`FPS HUD Theme "${themePreviewObj.name}" successfully activated!`)
      setCustomThemesList(getCustomThemes())
    } catch (err) {
      setThemeStudioMessage(`Error applying theme: ${err?.message}`)
    }
  }

  const handleRevertRestorePoint = () => {
    const reverted = restoreThemeFromPoint()
    if (reverted) {
      setThemeStudioMessage(`Reverted to restore point from ${reverted.displayTime || 'earlier session'}.`)
      if (reverted.fpsStyle) setFpsStyle(reverted.fpsStyle)
      setThemeRestorePoint(getThemeRestorePoint())
    } else {
      setThemeStudioMessage('No restore point found to revert.')
    }
  }

  const handleToggleVoiceInput = () => {
    if (isThemeVoiceListening) {
      setIsThemeVoiceListening(false)
      window.api?.voice?.stop?.().catch(() => {})
      return
    }

    const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
    if (SpeechRec) {
      try {
        const rec = new SpeechRec()
        rec.continuous = false
        rec.interimResults = false
        rec.lang = 'en-US'
        rec.onstart = () => setIsThemeVoiceListening(true)
        rec.onend = () => setIsThemeVoiceListening(false)
        rec.onerror = () => setIsThemeVoiceListening(false)
        rec.onresult = (e) => {
          const text = e.results[0]?.[0]?.transcript
          if (text) {
            setThemePrompt((prev) => (prev ? `${prev} ${text}` : text))
          }
        }
        rec.start()
        return
      } catch {}
    }

    if (window.api?.voice?.start) {
      setIsThemeVoiceListening(true)
      window.api.voice.start().catch(() => setIsThemeVoiceListening(false))
      const unsub = window.api.voice.onRecognized?.((data) => {
        if (data?.text) {
          setThemePrompt((prev) => (prev ? `${prev} ${data.text}` : data.text))
        }
        setIsThemeVoiceListening(false)
        unsub?.()
      })
    }
  }

  // Gamepad state & instant native OS scan
  const [localGamepad, setLocalGamepad] = useState(connectedGamepad)
  const [isScanningGamepad, setIsScanningGamepad] = useState(false)
  const activeGamepad = localGamepad || connectedGamepad

  useEffect(() => {
    setLocalGamepad(connectedGamepad)
  }, [connectedGamepad])

  const handleScanGamepad = useCallback(async () => {
    setIsScanningGamepad(true)
    try {
      if (typeof window !== 'undefined' && window.api?.system?.getConnectedGamepads) {
        const res = await window.api.system.getConnectedGamepads()
        if (res && res.connected && res.name) {
          setLocalGamepad(res.name)
        } else {
          const webGps = navigator.getGamepads ? navigator.getGamepads() : []
          const gp = webGps[0] || webGps[1] || webGps[2] || webGps[3]
          if (gp && gp.connected) {
            const clean = gp.id.replace(/\([^)]*\)/g, '').replace(/vendor.*product.*/i, '').trim() || 'Gamepad'
            setLocalGamepad(clean)
          } else {
            setLocalGamepad(null)
          }
        }
      }
    } catch {}
    setTimeout(() => setIsScanningGamepad(false), 350)
  }, [])

  useEffect(() => {
    if (isOpen && activeTab === 'gamepad') {
      handleScanGamepad()
    }
  }, [isOpen, activeTab, handleScanGamepad])

  // Sync state
  const [activeSync, setActiveSync] = useState('none')
  const [syncNotice, setSyncNotice] = useState('')
  const [syncProgress, setSyncProgress] = useState(null)

  // Performance HUD metric options state
  const [fpsMetrics, setFpsMetrics] = useState(() => {
    try {
      const stored = localStorage.getItem('logpile-fps-metrics')
      if (stored) return JSON.parse(stored)
    } catch {}
    return {
      fps: true,
      onePercentLow: true,
      frametime: false,
      gpu: false,
      cpu: false,
      ram: false,
      clock: true,
      battery: false
    }
  })

  const toggleFpsMetric = (key) => {
    setFpsMetrics((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem('logpile-fps-metrics', JSON.stringify(next))
      } catch {}
      handleUpdateShortcutSetting({ fpsMetrics: next })
      return next
    })
  }

  // Hidden Apps tab state & bulk handlers
  const [hiddenSearchQuery, setHiddenSearchQuery] = useState('')
  const [selectedHiddenIds, setSelectedHiddenIds] = useState(new Set())
  const [hiddenSelectMode, setHiddenSelectMode] = useState(false)
  const [hiddenBusy, setHiddenBusy] = useState(false)
  const [hiddenActionNotice, setHiddenActionNotice] = useState(null)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(null)

  // Filtered hidden games based on search query
  const filteredHiddenGames = useMemo(() => {
    if (!hiddenSearchQuery.trim()) return hiddenGames
    const q = hiddenSearchQuery.toLowerCase().trim()
    return hiddenGames.filter((g) => {
      const title = (g.canonical_title || g.title || '').toLowerCase()
      const reason = (g.hidden_reason || '').toLowerCase()
      const source = (g.source || g.store || '').toLowerCase()
      return title.includes(q) || reason.includes(q) || source.includes(q)
    })
  }, [hiddenGames, hiddenSearchQuery])

  const allFilteredHiddenSelected =
    filteredHiddenGames.length > 0 &&
    filteredHiddenGames.every((g) => selectedHiddenIds.has(g.id))

  const toggleSelectHidden = (id) => {
    setSelectedHiddenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllFilteredHidden = () => {
    if (allFilteredHiddenSelected) {
      setSelectedHiddenIds((prev) => {
        const next = new Set(prev)
        filteredHiddenGames.forEach((g) => next.delete(g.id))
        return next
      })
    } else {
      setSelectedHiddenIds((prev) => {
        const next = new Set(prev)
        filteredHiddenGames.forEach((g) => next.add(g.id))
        return next
      })
    }
  }

  const handleSingleRestoreHidden = async (game) => {
    setHiddenBusy(true)
    try {
      if (onRestoreHidden) {
        await onRestoreHidden(game)
      } else {
        await api.database?.setGameHidden(game.id, false)
        await onRefresh?.()
      }
      setSelectedHiddenIds((prev) => {
        const next = new Set(prev)
        next.delete(game.id)
        return next
      })
      setHiddenActionNotice({ tone: 'success', text: `Restored "${game.canonical_title}" to library.` })
    } catch (err) {
      setHiddenActionNotice({ tone: 'error', text: err.message || 'Failed to restore game.' })
    } finally {
      setHiddenBusy(false)
      setTimeout(() => setHiddenActionNotice(null), 3500)
    }
  }

  const handleBulkRestoreHidden = async () => {
    if (!selectedHiddenIds.size) return
    setHiddenBusy(true)
    try {
      const ids = Array.from(selectedHiddenIds)
      await api.database?.bulkSetGameHidden(ids, false)
      setSelectedHiddenIds(new Set())
      setHiddenActionNotice({ tone: 'success', text: `Restored ${ids.length} game${ids.length === 1 ? '' : 's'} to library.` })
      await onRefresh?.()
    } catch (err) {
      setHiddenActionNotice({ tone: 'error', text: err.message || 'Failed to restore selected games.' })
    } finally {
      setHiddenBusy(false)
      setTimeout(() => setHiddenActionNotice(null), 3500)
    }
  }

  const handleSingleDeleteHidden = (game) => {
    setConfirmDeleteModal({ count: 1, ids: [game.id], title: game.canonical_title })
  }

  const handleBulkDeleteHidden = () => {
    if (!selectedHiddenIds.size) return
    setConfirmDeleteModal({ count: selectedHiddenIds.size, ids: Array.from(selectedHiddenIds) })
  }

  const executeDeleteHidden = async () => {
    if (!confirmDeleteModal?.ids?.length) return
    setHiddenBusy(true)
    try {
      const ids = confirmDeleteModal.ids
      await api.database?.deleteGames(ids)
      setSelectedHiddenIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
      const count = ids.length
      setConfirmDeleteModal(null)
      setHiddenActionNotice({ tone: 'success', text: `Deleted ${count} record${count === 1 ? '' : 's'} from database.` })
      await onRefresh?.()
    } catch (err) {
      setHiddenActionNotice({ tone: 'error', text: err.message || 'Failed to delete records.' })
    } finally {
      setHiddenBusy(false)
      setTimeout(() => setHiddenActionNotice(null), 3500)
    }
  }

  const api = window.api || {}

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab, isOpen])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Load settings on open
  useEffect(() => {
    if (!isOpen) return
    let active = true

    Promise.resolve(api.database?.getLibrarySettings?.()).then((settings) => {
      if (!active || !settings) return
      setSteamGridDbApiKey(typeof settings.steamGridDbApiKey === 'string' ? settings.steamGridDbApiKey : '')
      setIgdbClientId(typeof settings.igdbClientId === 'string' ? settings.igdbClientId : '')
      setIgdbClientSecret(typeof settings.igdbClientSecret === 'string' ? settings.igdbClientSecret : '')
      setHeroResolution(typeof settings.heroResolution === 'string' && settings.heroResolution ? settings.heroResolution : '2.5k')
      setPreferAnimatedArtwork(Boolean(settings.preferAnimatedArtwork))
      setPreferAnimatedCovers(Boolean(settings.preferAnimatedCovers))
      setMinimizeToTray(Boolean(settings.minimizeToTray))
      setAutoHideSupportEntries(settings.autoHideSupportEntries !== false)
      setOverlayShortcut(settings.overlayShortcut || 'CommandOrControl+Shift+Space')
      setFpsShortcut(settings.fpsShortcut || 'CommandOrControl+Shift+F')
      setSearchShortcut(settings.searchShortcut || 'CommandOrControl+F')
      setFpsEnabled(Boolean(settings.fpsEnabled))
      setFpsPosition(settings.fpsPosition || 'top-right')
      setFpsOrientation(settings.fpsOrientation || 'horizontal')
      setFpsOpacity(Number(settings.fpsOpacity) || 80)
      setFpsStyle(settings.fpsStyle || 'minimalist-pill')
      setFpsTestMode(settings.fpsTestMode !== undefined ? Boolean(settings.fpsTestMode) : true)
      if (settings.fpsMetrics && typeof settings.fpsMetrics === 'object') {
        setFpsMetrics(settings.fpsMetrics)
      }
    }).catch(() => {})

    api.ai?.getStatus?.().then((st) => {
      if (active && st) setAiStatus(st)
    }).catch(() => {})

    return () => {
      active = false
    }
  }, [isOpen, api])

  // Sync Progress Listeners
  useEffect(() => {
    if (!isOpen || !api.scraper?.onProgress) return
    const off = api.scraper.onProgress((next) => {
      setSyncProgress(next)
      if (next?.phase === 'complete' || (next?.total > 0 && next?.current >= next?.total)) {
        setActiveSync('none')
        setTimeout(() => setSyncProgress(null), 3500)
      }
    })
    return () => off?.()
  }, [isOpen, api])

  const handleUpdateShortcutSetting = async (fields) => {
    try {
      await api.database?.setLibrarySettings?.(fields)
      setShortcutSavedNotice(true)
      setTimeout(() => setShortcutSavedNotice(false), 3000)
    } catch (err) {
      console.warn('Failed to update shortcut setting:', err)
    }
  }

  const handleSaveKeys = async (e) => {
    e?.preventDefault?.()
    setSaving(true)
    try {
      await api.database?.setLibrarySettings?.({
        steamGridDbApiKey: steamGridDbApiKey.trim(),
        igdbClientId: igdbClientId.trim(),
        igdbClientSecret: igdbClientSecret.trim(),
        heroResolution,
        preferAnimatedArtwork,
        preferAnimatedCovers,
        minimizeToTray,
        autoHideSupportEntries,
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

  const handleTestIgdb = async () => {
    if (!igdbClientId.trim() || !igdbClientSecret.trim()) {
      setIgdbTestStatus({ ok: false, message: 'Enter both Client ID and Client Secret first.' })
      return
    }
    setIgdbTestStatus({ testing: true, ok: null, message: 'Authenticating with Twitch OAuth...' })
    try {
      let res = null
      if (api.scraper?.testIgdb) {
        res = await api.scraper.testIgdb(igdbClientId.trim(), igdbClientSecret.trim())
      }
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
      setIgdbTestStatus({ ok: false, message: err?.message || 'Twitch OAuth network request failed.' })
    }
  }

  const handleTestKey = async () => {
    if (!steamGridDbApiKey.trim()) return
    setSaving(true)
    try {
      const res = await api.scraper?.testKey?.(steamGridDbApiKey.trim())
      if (res?.success) {
        alert('Connected! SteamGridDB API key is valid.')
      } else {
        alert(res?.error ? `Validation failed: ${res.error}` : 'Could not validate key. Ensure it is correct.')
      }
    } catch (err) {
      alert(`Validation error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreStaticArtwork = async () => {
    if (!confirm('Revert motion artwork back to crisp static covers for instant 120+ FPS grid scrolling?')) return
    setActiveSync('restore-static')
    setSyncNotice('')
    try {
      setPreferAnimatedArtwork(false)
      setPreferAnimatedCovers(false)
      await api.database?.setLibrarySettings?.({
        preferAnimatedArtwork: false,
        preferAnimatedCovers: false,
      })
      const res = await api.scraper?.restoreStaticCoversLocal?.()
      setSyncNotice(`Smooth static artwork restored: ${res?.updated ?? 0} titles updated for instant 120+ FPS grid scrolling.`)
      await onRefresh?.()
    } catch (err) {
      setSyncNotice(err?.message || 'Failed to restore static artwork.')
    } finally {
      setActiveSync('none')
    }
  }

  const handleSyncAll = async () => {
    setActiveSync('all')
    setSyncNotice('')
    try {
      const res = await api.scraper?.syncMetadataAndArt?.(steamGridDbApiKey.trim())
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

  const handleGenerateFallbacks = async () => {
    setActiveSync('fallbacks')
    setSyncNotice('')
    try {
      const res = await api.scraper?.generateAutomaticFallbacks?.()
      setSyncNotice(`Fallback art generated: ${res?.fallbackCovers || 0} covers, ${res?.fallbackHeroes || 0} heroes.`)
      await onRefresh?.()
    } catch (err) {
      setSyncNotice(err?.message || 'Fallback generation failed.')
    } finally {
      setActiveSync('none')
    }
  }

  const handleCancelSync = async () => {
    try {
      await api.scraper?.cancelSync?.()
      setSyncNotice('Sync cancellation requested.')
    } catch (err) {
      setSyncNotice(err?.message || 'Failed to cancel sync.')
    }
  }

  const handleCopyWallet = (key, text) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  if (!isOpen) return null

  const isBusy = activeSync !== 'none' || Boolean(syncProgress?.total > 0 && syncProgress?.current > 0 && syncProgress?.current < syncProgress?.total)

  // 11 Systematic Tabs:
  const TABS = [
    { id: 'general', label: 'General', icon: SlidersHorizontal, desc: 'Window behavior, library automation, and visual presentation' },
    { id: 'themes', label: 'Themes & Addons', icon: Palette, desc: 'Sanctuary visual styles, daily theme releases, and JSON addon importer' },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard, desc: 'Global hotkeys, Excel conflict safety, and navigation bindings' },
    { id: 'hud', label: 'Performance HUD', icon: Gauge, desc: 'In-game framerate overlay, custom metric toggles, styles, and live preview' },
    { id: 'theme-studio', label: 'FPS HUD Themes', icon: WandSparkles, desc: 'Generate custom in-game overlay HUD styles tailored to games or aesthetic prompts' },
    { id: 'ai', label: 'AI & Voice', icon: Bot, desc: 'Offline gaming intelligence, local RAM auto-unload, and hands-free voice controls' },
    { id: 'metadata', label: 'Metadata & Keys', icon: KeyRound, desc: 'SteamGridDB & IGDB credentials, plus library bulk enrichment' },
    { id: 'system', label: 'System & Specs', icon: Cpu, desc: 'Hardware specifications, disk storage capacity, and engine diagnostics' },
    { id: 'gamepad', label: 'Controller', icon: Gamepad2, desc: 'Seamless controller navigation across your library, dossiers, and overlay' },
    { id: 'backups', label: 'Backups & Activity', icon: Database, desc: 'Point-in-time SQLite snapshots, CSV catalog export, and audit trail' },
    { id: 'hidden', label: 'Hidden Apps', icon: EyeOff, desc: 'Support packages, DLC, and manually hidden titles excluded from main view' },
    { id: 'about', label: 'About Logpile', icon: CircleHelp, desc: 'Version info, offline manifesto, independent creator support, and MIT license' },
  ]

  const activeTabObj = TABS.find((t) => t.id === activeTab) || TABS[0]

  const cryptoWallets = [
    { key: 'btc', name: 'Bitcoin', symbol: 'BTC', address: 'bc1qcf9f3fd5q5n9gxkjz5fh74qgdv2dgryqkkdmlk' },
    { key: 'eth', name: 'Ethereum', symbol: 'ETH', address: '0xE3e9e4Dfb4c87B6101700c70F73790a903f92Ef0' },
    { key: 'usdt', name: 'Tether USD', symbol: 'USDT (ERC-20)', address: '0xE3e9e4Dfb4c87B6101700c70F73790a903f92Ef0' },
    { key: 'sol', name: 'Solana', symbol: 'SOL', address: 'F8aPJG3tUtbLHbhdfxeNFmcv8b2GK7anY3EmTr6CcHkS' },
  ]

  return (
    <div
      className="settings-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="settings-modal">
        {/* Left Sidebar Navigation */}
        <aside className="settings-sidebar">
          <div>
            <div className="settings-sidebar-header">
              {/* Image 5 Fix: Removed green pulse-dot to prevent looking like an unread notification */}
              <div className="settings-sidebar-eyebrow">
                <span>LOGPILE PREFERENCES</span>
              </div>
              <h3 className="settings-sidebar-title">Settings</h3>
            </div>

            <nav className="settings-nav">
              {TABS.map((tab) => {
                const IconComponent = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`settings-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <IconComponent size={16} className="settings-tab-icon" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="settings-sidebar-footer">
            <span>Logpile Desktop</span>
            <span className="settings-card-badge">v1.3.5</span>
          </div>
        </aside>

        {/* Right Content View */}
        <main className="settings-main">
          {/* Header */}
          <div className="settings-header">
            <div>
              <h2 className="settings-title">{activeTabObj.label}</h2>
              <p className="settings-desc">{activeTabObj.desc}</p>
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              title="Close Settings (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="settings-body custom-scrollbar">

            {/* TAB 1: GENERAL & PRESENTATION */}
            {activeTab === 'general' && (
              <div className="settings-tab-pane">
                {/* Section: Window Behavior */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Window &amp; Launch Behavior</strong>
                      <small className="settings-card-subtitle">Desktop integration and background minimizing</small>
                    </div>
                  </div>

                  <div
                    className="settings-toggle-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', cursor: 'pointer' }}
                    onClick={() => {
                      const val = !minimizeToTray
                      setMinimizeToTray(val)
                      api.database?.setLibrarySettings?.({ minimizeToTray: val }).catch(() => {})
                    }}
                  >
                    <div className="settings-toggle-text" style={{ flex: 1, minWidth: 0 }}>
                      <strong>Minimize to System Tray</strong>
                      <small>Hides Logpile to the notification tray near your Windows clock instead of closing to preserve instant game launching.</small>
                    </div>
                    <PillToggle
                      checked={minimizeToTray}
                      onChange={(val) => {
                        setMinimizeToTray(val)
                        api.database?.setLibrarySettings?.({ minimizeToTray: val }).catch(() => {})
                      }}
                    />
                  </div>

                  {/* Startup Intro & Theme Transformation Behaviors */}
                  <div
                    className="settings-toggle-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
                  >
                    <div className="settings-toggle-text" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={14} style={{ color: 'var(--accent, #d6ff4b)' }} />
                        <strong>Startup Welcome Screen (Mandatory on Launch)</strong>
                        <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: 'rgba(214, 255, 75, 0.15)', color: 'var(--accent, #d6ff4b)', textTransform: 'uppercase' }}>
                          Cold Start Only
                        </span>
                      </div>
                      <small>Plays automatically on fresh app launch to mask library indexing with zero loading spinners. Will not repeat on page refresh.</small>
                    </div>
                  </div>

                  <div
                    className="settings-toggle-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', cursor: 'pointer', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
                    onClick={() => {
                      const next = !introOnThemeChange
                      setIntroOnThemeChange(next)
                      try {
                        localStorage.setItem('logpile-intro-on-theme-change', String(next))
                      } catch {}
                    }}
                  >
                    <div className="settings-toggle-text" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Palette size={14} style={{ color: 'var(--accent, #d6ff4b)' }} />
                        <strong>Show Transformation Intro on Theme Switch</strong>
                      </div>
                      <small>When changing themes, replays the welcome screen to showcase the new theme's visual identity, typography, and brand mark. Toggle off for instant switching.</small>
                    </div>
                    <PillToggle
                      checked={introOnThemeChange}
                      onChange={(next) => {
                        setIntroOnThemeChange(next)
                        try {
                          localStorage.setItem('logpile-intro-on-theme-change', String(next))
                        } catch {}
                      }}
                    />
                  </div>

                  <div
                    className="settings-toggle-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', cursor: 'pointer', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
                    onClick={() => {
                      const next = !introMuted
                      setIntroMuted(next)
                      try {
                        localStorage.setItem('logpile-intro-muted', String(next))
                      } catch {}
                    }}
                  >
                    <div className="settings-toggle-text" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!introMuted ? <Volume2 size={15} style={{ color: 'var(--accent, #d6ff4b)' }} /> : <VolumeX size={15} style={{ color: 'rgba(255,255,255,0.45)' }} />}
                        <strong>Startup Intro Audio (Sound Off by Default)</strong>
                      </div>
                      <small>Plays theme-tailored spatial Web Audio (bass drops, saw sweeps, retro chimes) with zero external media files. Muted by default per user preference.</small>
                    </div>
                    <PillToggle
                      checked={!introMuted}
                      onChange={(active) => {
                        const nextMuted = !active
                        setIntroMuted(nextMuted)
                        try {
                          localStorage.setItem('logpile-intro-muted', String(nextMuted))
                        } catch {}
                      }}
                    />
                  </div>

                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>Test current theme's visual intro &amp; audio:</span>
                    </div>
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => onTriggerIntroPreview?.()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--accent, #d6ff4b)',
                        borderColor: 'rgba(214, 255, 75, 0.35)',
                        background: 'rgba(214, 255, 75, 0.06)',
                        cursor: 'pointer'
                      }}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Preview {layoutTheme.toUpperCase()} Intro Splash</span>
                    </button>
                  </div>
                </div>

                {/* Section: Library Automation (Auto-Hide) */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Library Automation &amp; Cleanliness</strong>
                      <small className="settings-card-subtitle">Automatic classification for redistributables and engine tools</small>
                    </div>
                  </div>

                  <div
                    className="settings-toggle-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', cursor: 'pointer' }}
                    onClick={() => {
                      const val = !autoHideSupportEntries
                      setAutoHideSupportEntries(val)
                      api.database?.setLibrarySettings?.({ autoHideSupportEntries: val }).catch(() => {})
                    }}
                  >
                    <div className="settings-toggle-text" style={{ flex: 1, minWidth: 0 }}>
                      <strong>Auto-Hide Support Packages &amp; Tools</strong>
                      <small>Automatically detects and hides Steam common redistributables, DirectX installers, and background helper binaries so your collection remains focused on actual games.</small>
                    </div>
                    <PillToggle
                      checked={autoHideSupportEntries}
                      onChange={(val) => {
                        setAutoHideSupportEntries(val)
                        api.database?.setLibrarySettings?.({ autoHideSupportEntries: val }).catch(() => {})
                      }}
                    />
                  </div>
                </div>

                {/* Section: Visual Quality & Presentation */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Visual Quality &amp; Presentation</strong>
                      <small className="settings-card-subtitle">Backdrop resolution and hardware-accelerated motion artwork</small>
                    </div>
                  </div>

                  <div className="settings-field-group">
                    <label className="settings-field-label">
                      <span>Hero Backdrop Quality</span>
                      <small>Preferred resolution when downloading widescreen landscape banners</small>
                    </label>
                    <select
                      value={heroResolution}
                      onChange={(e) => {
                        const val = e.target.value
                        setHeroResolution(val)
                        api.database?.setLibrarySettings?.({ heroResolution: val }).catch(() => {})
                      }}
                      className="settings-select"
                    >
                      <option value="2.5k">2.5K / 1440p (High Quality — Recommended)</option>
                      <option value="1080p">1080p / Full HD (Fast &amp; Crisp ~800 KB)</option>
                      <option value="4k">4K / 2160p (Ultra HD — Maximum Detail)</option>
                      <option value="720p">720p / Compact (Low Storage footprint)</option>
                      <option value="animated">Animated / Motion Hero (WebM / MP4)</option>
                    </select>
                  </div>

                  <div className="settings-grid-2">
                    <div
                      className="settings-toggle-row"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', cursor: 'pointer' }}
                      onClick={() => {
                        const val = !preferAnimatedArtwork
                        setPreferAnimatedArtwork(val)
                        api.database?.setLibrarySettings?.({ preferAnimatedArtwork: val }).catch(() => {})
                      }}
                    >
                      <div className="settings-toggle-text" style={{ flex: 1, minWidth: 0 }}>
                        <strong>Motion Hero Banners</strong>
                        <small>Smooth WebM video backdrops in Home Spotlight &amp; Game Dossier details.</small>
                      </div>
                      <PillToggle
                        checked={preferAnimatedArtwork}
                        onChange={(val) => {
                          setPreferAnimatedArtwork(val)
                          api.database?.setLibrarySettings?.({ preferAnimatedArtwork: val }).catch(() => {})
                        }}
                      />
                    </div>

                    <div
                      className="settings-toggle-row"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', cursor: 'pointer' }}
                      onClick={() => {
                        const val = !preferAnimatedCovers
                        setPreferAnimatedCovers(val)
                        api.database?.setLibrarySettings?.({ preferAnimatedCovers: val }).catch(() => {})
                      }}
                    >
                      <div className="settings-toggle-text" style={{ flex: 1, minWidth: 0 }}>
                        <strong>Animated Motion Posters</strong>
                        <small>Living cover art on game grid cards.</small>
                      </div>
                      <PillToggle
                        checked={preferAnimatedCovers}
                        onChange={(val) => {
                          setPreferAnimatedCovers(val)
                          api.database?.setLibrarySettings?.({ preferAnimatedCovers: val }).catch(() => {})
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DEDICATED TAB: THEMES & ADDONS */}
            {activeTab === 'themes' && (
              <div className="settings-tab-pane">
                {/* 1. Core Themes */}
                <div className="settings-card">
                  <div className="settings-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Palette size={16} style={{ color: 'var(--accent, #d6ff4b)' }} />
                        <strong className="settings-card-title">Core Sanctuary Themes</strong>
                      </div>
                      <small className="settings-card-subtitle">5 Built-in, hardware-accelerated aesthetic presets</small>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>Active:</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'var(--accent, #d6ff4b)', color: '#000' }}>
                        {layoutTheme.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                    {[
                      { id: 'cinematic', label: '🎬 Cinematic', desc: 'Frosted Glass & Ice-Blue Glow', tag: 'Default' },
                      { id: 'kinetic', label: '⚡ Kinetic', desc: 'Carbon Fiber & Neon Orange', tag: 'High-Octane' },
                      { id: 'playful', label: '🪵 Playful', desc: 'Pastel Vinyl & Lime Pops', tag: 'Vibrant' },
                      { id: 'atmospheric', label: '🕵️ Atmospheric', desc: 'Slate Stone & Emerald Monolith', tag: 'Mystical' },
                      { id: 'competitive', label: '🏆 Competitive', desc: 'Titanium & Esports Gold', tag: 'Esports' },
                    ].map((t) => {
                      const isCurrent = layoutTheme === t.id
                      return (
                        <div
                          key={t.id}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: isCurrent ? 'rgba(214, 255, 75, 0.09)' : 'rgba(255, 255, 255, 0.03)',
                            border: isCurrent ? '1px solid var(--accent, #d6ff4b)' : '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '10px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '13px', color: '#fff' }}>{t.label}</strong>
                              <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                                {t.tag}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.35 }}>
                              {t.desc}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onLayoutThemeChange?.(t.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: isCurrent ? 'var(--accent, #d6ff4b)' : 'rgba(255, 255, 255, 0.08)',
                              border: isCurrent ? 'none' : '1px solid rgba(255,255,255,0.12)',
                              color: isCurrent ? '#000000' : '#ffffff',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isCurrent ? 'Active Theme' : 'Apply Theme'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Daily Community Theme Drops (GitHub) */}
                <div className="settings-card" style={{ background: 'linear-gradient(180deg, rgba(214, 255, 75, 0.04) 0%, rgba(0,0,0,0.3) 100%)', borderColor: 'rgba(214, 255, 75, 0.25)' }}>
                  <div className="settings-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Github size={16} style={{ color: 'var(--accent, #d6ff4b)' }} />
                        <strong className="settings-card-title">Daily Community Theme Releases</strong>
                      </div>
                      <small className="settings-card-subtitle">
                        We release a complete, production-ready theme addon daily on our open-source GitHub repository.
                      </small>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                      Logpile stays fresh every single day. Browse the official GitHub theme repository to download new community theme files, or drop them directly into your library with one click.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const url = 'https://github.com/ritesh-soni-logpile/logpile/tree/main/themes'
                          try {
                            if (window.api?.shell?.openExternal) {
                              window.api.shell.openExternal(url)
                            } else {
                              window.open(url, '_blank')
                            }
                          } catch {
                            window.open(url, '_blank')
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          borderRadius: '6px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.18)',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>Get Daily Themes on GitHub</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          try {
                            importCustomTheme(SAMPLE_DAILY_THEME)
                            setCustomThemes(getCustomThemes())
                            setEnabledAddonIds(getEnabledAddonIds())
                            onLayoutThemeChange?.(SAMPLE_DAILY_THEME.id)
                            setAddonNotice("Installed today's drop: Cyberpunk 2077!")
                          } catch {
                            setAddonNotice('Failed to install sample theme')
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          borderRadius: '6px',
                          background: 'rgba(214, 255, 75, 0.12)',
                          border: '1px solid rgba(214, 255, 75, 0.4)',
                          color: 'var(--accent, #d6ff4b)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <Sparkles size={13} />
                        <span>Try Today's Drop: Cyberpunk 2077 (1-Click Sample)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Installed Theme Addons & Importer */}
                <div className="settings-card">
                  <div className="settings-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong className="settings-card-title">Installed Theme Addons ({customThemes.length})</strong>
                      <small className="settings-card-subtitle">Themes imported from daily GitHub drops or custom files</small>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.14)',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Upload size={12} />
                        <span>Import Theme (.json)</span>
                        <input
                          type="file"
                          accept=".json"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = (evt) => {
                              try {
                                const parsed = JSON.parse(evt.target?.result || '{}')
                                if (parsed.id && parsed.name && parsed.palette) {
                                  importCustomTheme(parsed)
                                  setCustomThemes(getCustomThemes())
                                  setEnabledAddonIds(getEnabledAddonIds())
                                  onLayoutThemeChange?.(parsed.id)
                                  setAddonNotice(`Successfully installed theme: ${parsed.name}`)
                                } else {
                                  setAddonNotice('Invalid theme format. File must contain id, name, and palette.')
                                }
                              } catch {
                                setAddonNotice('Failed to read theme JSON file.')
                              }
                            }
                            reader.readAsText(file)
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          const currentPalette = customThemes.find((t) => t.id === layoutTheme) || {
                            id: layoutTheme,
                            name: `Logpile ${layoutTheme}`,
                            author: 'Community User',
                            version: '1.0.0',
                            tagline: 'Custom exported theme',
                            category: 'Custom',
                            palette: {}
                          }
                          const blob = new Blob([JSON.stringify(currentPalette, null, 2)], { type: 'application/json' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `logpile-theme-${layoutTheme}.json`
                          a.click()
                          URL.revokeObjectURL(url)
                          setAddonNotice(`Exported theme: logpile-theme-${layoutTheme}.json`)
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.14)',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Download size={12} />
                        <span>Export Current Theme</span>
                      </button>
                    </div>
                  </div>

                  {addonNotice && (
                    <div style={{ fontSize: '11px', color: 'var(--accent, #d6ff4b)', marginBottom: '12px', padding: '6px 10px', borderRadius: '4px', background: 'rgba(214, 255, 75, 0.08)', border: '1px solid rgba(214, 255, 75, 0.2)' }}>
                      {addonNotice}
                    </div>
                  )}

                  {customThemes.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <Palette size={24} style={{ color: 'rgba(255,255,255,0.3)', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                        No Custom Addon Themes Installed
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', maxWidth: '380px', margin: '0 auto' }}>
                        Import any downloaded daily theme JSON file from the GitHub repository, or click "Try Today's Drop" above.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                      {customThemes.map((addon) => {
                        const isEnabled = enabledAddonIds.includes(addon.id)
                        const isCurrent = layoutTheme === addon.id
                        const p = addon.palette || {}

                        return (
                          <div
                            key={addon.id}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              background: isCurrent ? 'rgba(214, 255, 75, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                              border: isCurrent ? '1px solid var(--accent, #d6ff4b)' : '1px solid rgba(255, 255, 255, 0.08)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '8px'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong style={{ fontSize: '13px', color: '#fff' }}>{addon.name}</strong>
                                <span style={{ fontSize: '9px', fontWeight: 600, padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                                  {addon.category || 'Addon'}
                                </span>
                              </div>
                              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.3, marginBottom: '8px' }}>
                                {addon.tagline || (addon.author ? `By ${addon.author}` : 'Custom theme')}
                              </div>

                              {/* Swatches */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                {[p.base, p.surface, p.accent, p.borderColor, p.textPrimary].filter(Boolean).map((color, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      width: '14px',
                                      height: '14px',
                                      borderRadius: '3px',
                                      background: color,
                                      border: '1px solid rgba(255,255,255,0.15)'
                                    }}
                                  />
                                ))}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = toggleAddonTheme(addon.id)
                                  setEnabledAddonIds([...next])
                                }}
                                style={{
                                  flex: 1,
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  background: isEnabled ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                                  border: isEnabled ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
                                  color: isEnabled ? '#34d399' : 'rgba(255,255,255,0.7)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title="Toggle whether this theme appears in the top-bar Sanctuary dropdown"
                              >
                                {isEnabled ? <Check size={11} /> : <Plus size={11} />}
                                <span>{isEnabled ? 'In Sanctuary' : '+ Sanctuary'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (!isEnabled) {
                                    const next = toggleAddonTheme(addon.id)
                                    setEnabledAddonIds([...next])
                                  }
                                  onLayoutThemeChange?.(addon.id)
                                }}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: isCurrent ? 'var(--accent, #d6ff4b)' : 'rgba(255, 255, 255, 0.1)',
                                  border: 'none',
                                  color: isCurrent ? '#000000' : '#ffffff'
                                }}
                              >
                                {isCurrent ? 'Active' : 'Apply'}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  removeCustomTheme(addon.id)
                                  setCustomThemes(getCustomThemes())
                                  setEnabledAddonIds(getEnabledAddonIds())
                                  if (layoutTheme === addon.id) {
                                    onLayoutThemeChange?.('cinematic')
                                  }
                                }}
                                title="Uninstall this theme addon"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  color: '#f87171',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Transformation Behavior & Sound */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Theme Transition &amp; Sound Preferences</strong>
                      <small className="settings-card-subtitle">Visual and acoustic responses when changing styles</small>
                    </div>
                  </div>

                  <div
                    className="settings-toggle-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', cursor: 'pointer' }}
                    onClick={() => {
                      const next = !introOnThemeChange
                      setIntroOnThemeChange(next)
                      try {
                        localStorage.setItem('logpile-intro-on-theme-change', String(next))
                      } catch {}
                    }}
                  >
                    <div className="settings-toggle-text" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Palette size={14} style={{ color: 'var(--accent, #d6ff4b)' }} />
                        <strong>Show Transformation Welcome Window on Switch</strong>
                      </div>
                      <small>Replays the custom intro splash when switching themes to visually transform Logpile into the new aesthetic. Toggle off for instant theme switching.</small>
                    </div>
                    <PillToggle
                      checked={introOnThemeChange}
                      onChange={(next) => {
                        setIntroOnThemeChange(next)
                        try {
                          localStorage.setItem('logpile-intro-on-theme-change', String(next))
                        } catch {}
                      }}
                    />
                  </div>

                  <div
                    className="settings-toggle-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', cursor: 'pointer', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
                    onClick={() => {
                      const next = !introMuted
                      setIntroMuted(next)
                      try {
                        localStorage.setItem('logpile-intro-muted', String(next))
                      } catch {}
                    }}
                  >
                    <div className="settings-toggle-text" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!introMuted ? <Volume2 size={15} style={{ color: 'var(--accent, #d6ff4b)' }} /> : <VolumeX size={15} style={{ color: 'rgba(255,255,255,0.45)' }} />}
                        <strong>Theme Intro Audio (Muted by Default)</strong>
                      </div>
                      <small>Theme-specific spatial Web Audio chimes, saw sweeps, or bass drops. Muted by default.</small>
                    </div>
                    <PillToggle
                      checked={!introMuted}
                      onChange={(active) => {
                        const nextMuted = !active
                        setIntroMuted(nextMuted)
                        try {
                          localStorage.setItem('logpile-intro-muted', String(nextMuted))
                        } catch {}
                      }}
                    />
                  </div>

                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>Test active theme's visual intro &amp; audio:</span>
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => onTriggerIntroPreview?.()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--accent, #d6ff4b)',
                        borderColor: 'rgba(214, 255, 75, 0.35)',
                        background: 'rgba(214, 255, 75, 0.06)',
                        cursor: 'pointer'
                      }}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Preview {layoutTheme.toUpperCase()} Intro Splash</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: KEYBOARD SHORTCUTS */}
            {activeTab === 'shortcuts' && (
              <div className="settings-tab-pane">
                {shortcutSavedNotice && (
                  <div className="settings-alert success">
                    <Check size={14} />
                    <span>Keyboard shortcuts updated and registered!</span>
                  </div>
                )}

                {/* Section: Shortcuts */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Customizable Key Combinations</strong>
                      <small className="settings-card-subtitle">Click any shortcut box and press 2 or 3 keys to assign your own hotkey</small>
                    </div>
                  </div>

                  <SettingsShortcutRecorder
                    label="Quick Library Search (In-App Only)"
                    description="Safe in-app search focus. Never intercepts shortcuts in your browser, Excel, or other applications."
                    value={searchShortcut}
                    defaultValue="CommandOrControl+F"
                    onChange={(newVal) => {
                      setSearchShortcut(newVal)
                      handleUpdateShortcutSetting({ searchShortcut: newVal })
                    }}
                  />

                  <SettingsShortcutRecorder
                    label="Global In-Game Overlay &amp; AI Companion"
                    description="System-wide global hotkey. Summons the Logpile dashboard, active game guides, and AI companion from inside any game."
                    value={overlayShortcut}
                    defaultValue="CommandOrControl+Shift+Space"
                    onChange={(newVal) => {
                      setOverlayShortcut(newVal)
                      handleUpdateShortcutSetting({ overlayShortcut: newVal })
                    }}
                  />

                  <SettingsShortcutRecorder
                    label="In-Game Performance HUD Toggle"
                    description="System-wide global hotkey to instantly display or dismiss the live framerate and hardware telemetry HUD while playing."
                    value={fpsShortcut}
                    defaultValue="CommandOrControl+Shift+F"
                    onChange={(newVal) => {
                      setFpsShortcut(newVal)
                      handleUpdateShortcutSetting({ fpsShortcut: newVal })
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB: IN-GAME PERFORMANCE HUD */}
            {activeTab === 'hud' && (
              <div className="settings-tab-pane">
                {/* 1. Live In-Game HUD Preview & Integrated Controls (No Scrolling Needed!) */}
                <div className="settings-card" style={{ overflow: 'hidden' }}>
                  <div className="settings-card-header" style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={15} style={{ color: 'var(--accent, #d6ff4b)' }} />
                      <div>
                        <strong className="settings-card-title">Live In-Game HUD Preview</strong>
                        <small className="settings-card-subtitle">Real-time simulation rendered at your selected opacity, position, and orientation</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={fpsEnabled}
                      onClick={() => {
                        const val = !fpsEnabled
                        setFpsEnabled(val)
                        handleUpdateShortcutSetting({ fpsEnabled: val })
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '9px',
                        padding: '4px 6px 4px 12px',
                        borderRadius: '999px',
                        border: fpsEnabled ? '1px solid rgba(214, 255, 75, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
                        background: fpsEnabled ? 'rgba(214, 255, 75, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                        boxShadow: fpsEnabled ? '0 0 14px rgba(214, 255, 75, 0.22)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        userSelect: 'none'
                      }}
                      title={fpsEnabled ? 'Click to disable HUD' : 'Click to activate HUD'}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          color: fpsEnabled ? 'var(--accent, #d6ff4b)' : 'var(--text-muted, #888)'
                        }}
                      >
                        {fpsEnabled ? 'HUD ACTIVE' : 'HUD DISABLED'}
                      </span>
                      <span
                        style={{
                          width: '36px',
                          height: '20px',
                          borderRadius: '999px',
                          background: fpsEnabled ? 'var(--accent, #d6ff4b)' : 'rgba(255, 255, 255, 0.1)',
                          border: fpsEnabled ? '1px solid var(--accent, #d6ff4b)' : '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: fpsEnabled ? '0 0 10px rgba(214, 255, 75, 0.3)' : 'none',
                          position: 'relative',
                          display: 'inline-block',
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                          flexShrink: 0
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: '2px',
                            left: '2px',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: fpsEnabled ? '#0a0c10' : '#888888',
                            transform: fpsEnabled ? 'translateX(16px)' : 'translateX(0)',
                            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)'
                          }}
                        />
                      </span>
                    </button>
                  </div>

                  {/* Simulated Viewport (Taller for vertical stacks: 240px) */}
                  <div
                    style={{
                      position: 'relative',
                      height: '240px',
                      borderRadius: '10px',
                      background: 'radial-gradient(circle at 50% 40%, rgba(26, 32, 44, 0.9) 0%, rgba(10, 12, 16, 0.98) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.6)'
                    }}
                  >
                    <div style={{ position: 'absolute', opacity: 0.15, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '40px', height: '1px', background: '#fff' }} />
                      <div style={{ width: '1px', height: '40px', background: '#fff', position: 'absolute', top: '-20px' }} />
                      <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', marginTop: '24px' }}>Simulated Game Viewport</span>
                    </div>

                    {fpsEnabled ? (
                      <div
                        style={{
                          position: 'absolute',
                          ...getFpsPositionStyle(fpsPosition),
                          opacity: fpsOpacity / 100,
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                          pointerEvents: 'none',
                          maxWidth: '92%'
                        }}
                      >
                        {renderHudPreview(fpsStyle, fpsMetrics, fpsOrientation, HUD_PREVIEW_TELEMETRY)}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted, #777)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <EyeOff size={14} />
                        <span>HUD is currently disabled. Toggle the switch above to preview.</span>
                      </div>
                    )}
                  </div>

                  {/* Integrated Placement & Style Controls (Directly below preview - zero scrolling!) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '12px',
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    {/* Overlay Display Mode */}
                    <div className="settings-field-group">
                      <label className="settings-field-label">Overlay Visibility Mode</label>
                      <select
                        value={fpsTestMode ? 'test' : 'game'}
                        onChange={(e) => {
                          const isTest = e.target.value === 'test'
                          setFpsTestMode(isTest)
                          handleUpdateShortcutSetting({ fpsTestMode: isTest })
                        }}
                        className="settings-select"
                        disabled={!fpsEnabled}
                      >
                        <option value="game">In-Game Only (Default — auto-shows when game starts, 0% desktop load)</option>
                        <option value="test">Always On (Testing / Desktop Ticker)</option>
                      </select>
                    </div>

                    {/* Screen Position (8 Zones) */}
                    <div className="settings-field-group">
                      <label className="settings-field-label">Screen Position (8 Zones)</label>
                      <select
                        value={fpsPosition}
                        onChange={(e) => {
                          const val = e.target.value
                          setFpsPosition(val)
                          handleUpdateShortcutSetting({ fpsPosition: val })
                        }}
                        className="settings-select"
                        disabled={!fpsEnabled}
                      >
                        <option value="top-left">Top-Left Corner</option>
                        <option value="top-center">Top-Center</option>
                        <option value="top-right">Top-Right Corner</option>
                        <option value="left-center">Left-Center (Middle-Left)</option>
                        <option value="right-center">Right-Center (Middle-Right)</option>
                        <option value="bottom-left">Bottom-Left Corner</option>
                        <option value="bottom-center">Bottom-Center</option>
                        <option value="bottom-right">Bottom-Right Corner</option>
                      </select>
                    </div>

                    {/* Layout Orientation */}
                    <div className="settings-field-group">
                      <label className="settings-field-label">Layout Orientation</label>
                      <select
                        value={fpsOrientation}
                        onChange={(e) => {
                          const val = e.target.value
                          setFpsOrientation(val)
                          handleUpdateShortcutSetting({ fpsOrientation: val })
                        }}
                        className="settings-select"
                        disabled={!fpsEnabled}
                      >
                        <option value="horizontal">Horizontal (Inline Bar)</option>
                        <option value="vertical">Vertical (Stacked Column)</option>
                      </select>
                    </div>

                    {/* Visual Style */}
                    <div className="settings-field-group">
                      <label className="settings-field-label">Visual Style</label>
                      <select
                        value={fpsStyle}
                        onChange={(e) => {
                          const val = e.target.value
                          setFpsStyle(val)
                          handleUpdateShortcutSetting({ fpsStyle: val })
                        }}
                        className="settings-select"
                        disabled={!fpsEnabled}
                      >
                        {/* 1. Atmospheric, Horror & Elemental (Fire, Soul, Rain, Psychological Horror) */}
                        <optgroup label="Atmospheric, Horror & Elemental">
                          <option value="bonfire-ember">Kindled Bonfire (Molten Flame & Embers Telemetry)</option>
                          <option value="elden-grace">Lost Grace & Embers (Crimson Flask & Golden Soul Counter)</option>
                          <option value="silent-fog">Silent Fog EKG (Psychological Horror Heartbeat & Static Panic)</option>
                          <option value="neon-downpour">Neon Downpour (Rain-Slicked Glass & Hydro-Pressure Drops)</option>
                          <option value="blood-moon">Blood Moon Frenzy (Eldritch Eye & Sanguine Vials)</option>
                        </optgroup>

                        {/* 2. Motorsport & Velocity */}
                        <optgroup label="Motorsport & Velocity">
                          <option value="tachometer-gauge">Apex Redline Tachometer (Arc Dial, Needle & 9000 RPM)</option>
                          <option value="f1-telemetry">Grand Prix Cockpit (12 LED Shift Lights & Delta Telemetry)</option>
                          <option value="fighter-jet-hud">Mach 3 Flight Ladder (Vector Jet HUD & Airspeed)</option>
                          <option value="gran-turismo">Apex Touring Ring (Dual Arc Throttle/Brake & G-Force)</option>
                          <option value="rally-dash">Mud & Gravel Digital Dash (Rally LED Ladder & Gear)</option>
                          <option value="nfs-underground">Midnight Drift Purge (Nitrous Flame Bar & Street Glow)</option>
                        </optgroup>

                        {/* 3. Hardware Labs & Overclocking */}
                        <optgroup label="Hardware Labs & Overclocking">
                          <option value="frametime-sparkline">Frametime Oscilloscope (Real-Time Micro-Stutter Sparkline)</option>
                          <option value="liquid-cooling-rig">Liquid Cooling Rig (Dual Coolant Reservoirs & Flow Rate)</option>
                          <option value="rtss-classic">Vintage Diagnostic OSD (Classic High-Viz Orange Telemetry)</option>
                          <option value="steam-deck-os">Deckmaster Handheld (Quick-Access Hardware Drawer)</option>
                          <option value="sensor-panel">Hardware Lab Sensor Rig (Dense Multi-Column Diagnostics)</option>
                          <option value="evga-precision">Sub-Zero Hexagon Core (Voltage & Clock Rig)</option>
                        </optgroup>

                        {/* 4. Tactical Shooters & Esports */}
                        <optgroup label="Tactical Shooters & Esports">
                          <option value="cs2-pro">Clutch Defusal Pro (128-Tick Esports & Low-Latency Ping)</option>
                          <option value="apex-jumpkit">Dropzone Jump-Kit (Shield Batteries & Thruster Boost)</option>
                          <option value="overwatch-ult">Hyper-Charge Protocol (100% Ult Pulse Ring)</option>
                          <option value="halo-spartan">Mjolnir Titanium Shield (Super-Soldier Tactical Radar & Shields)</option>
                          <option value="doom-slayer">Hellwalker Berserk (Demonic Blood Runes & Pure Rage)</option>
                          <option value="subtle-stealth">Ghost Whisper (Zero-Occlusion Minimalist Crosshair)</option>
                          <option value="tarkov-stasis">Tarkov Combat Stasis (Battle Vitals & Scan)</option>
                          <option value="nvg-phosphor">NVG Night Vision Phosphor (Military Green Reticle)</option>
                          <option value="mgs-soliton">MGS Soliton Radar (Circular Sweep & Alert)</option>
                        </optgroup>

                        {/* 5. RPG, Lore-Rich Fantasy & Souls-Like */}
                        <optgroup label="RPG, Lore-Rich Fantasy & Souls-Like">
                          <option value="skyrim-compass">Nordic Iron Compass (Carved Heading & Waypoint Crest)</option>
                          <option value="witcher-medallion">Silver Wolf Medallion (Monster Hunter Toxicity & Vigor)</option>
                          <option value="cyberpunk-neon">Chrome Neural Optics (Canary Yellow Cyberware OSD)</option>
                          <option value="pipboy-crt">Vault Wrist CRT (Radiation Rads & Pip Phosphor Scanlines)</option>
                          <option value="sekiro-posture">Sekiro Deflect Posture (Japanese Calligraphy 忍)</option>
                          <option value="zelda-stamina">Zelda Stamina Wheel (Pulse Ring)</option>
                          <option value="monster-hunter">Monster Hunter Sharpness (Purple Sharpness Bar)</option>
                        </optgroup>

                        {/* 6. Arcade, Retro & Sci-Fi */}
                        <optgroup label="Arcade, Retro & Sci-Fi">
                          <option value="matrix-cascade">Matrix Digital Stream (Phosphor Green Falling Hex)</option>
                          <option value="deadspace-rig">Spinal Bio-RIG (Vertebrae Health Segments & Stasis Ring)</option>
                          <option value="subnautica-depth">Abyssal Crush Depth (Pressure Hull Integrity & Oxygen Ring)</option>
                          <option value="starfield-chrono">Orbital Chronomark (Horizon & Gravity Bezel)</option>
                          <option value="holo-arc-reactor">Holo Arc Reactor (Orbital Plasma Ring & Core Power)</option>
                          <option value="helldivers-cmd">Helldivers 2 Orbital Command (Super Earth Gold)</option>
                          <option value="alien-tracker">Nostromo Motion Tracker (Abyssal Ping & Range)</option>
                          <option value="mass-effect-omni">Mass Effect Omni-Tool (Holo-Orange Wrist Display)</option>
                          <option value="retro-gameboy">8-Bit Dot-Matrix (1989 Monochrome Green Pocket Screen)</option>
                          <option value="arcade-1984">Quarter Eater 1984 (Flashing 1UP Scanlines & High Score)</option>
                          <option value="synthwave-neon">Outrun Wireframe Horizon (Hot Neon Pink & Laser Grid)</option>
                          <option value="vfd-tape-deck">Hi-Fi Vacuum Fluorescent (80s Stereo VFD & VU Peak)</option>
                          <option value="fighting-game-health">Versus Fighting Gauge (Health Bars, Combo Hits & Super Meter)</option>
                        </optgroup>

                        {/* 7. 1990s Nostalgia */}
                        <optgroup label="1990s Nostalgia">
                          <option value="winamp-classic">Winamp 1999 Classic (Bouncing Spectrum EQ)</option>
                          <option value="ps1-bios">PS1 Memory Card BIOS (32-Bit Memory Blocks)</option>
                          <option value="arcade-vector">Arcade Vector Wireframe (80s Phosphor Lines)</option>
                          <option value="half-life-hev">Black Mesa HEV Suit (Lambda Orange Geiger)</option>
                          <option value="doom-1993">Doom 1993 Marine Armor (Heavy Steel Plate)</option>
                          <option value="win95-osd">Windows 95 Classic OSD (Beveled Grey PERF.EXE)</option>
                        </optgroup>

                        {/* 8. Anime, Memes & Gen Alpha */}
                        <optgroup label="Anime, Memes & Gen Alpha">
                          <option value="anime-sakura">Sakura Anime Bloom (Pastel Pink & Lilac)</option>
                          <option value="anime-eva">NERV Unit-01 Protocol (Purple & Neon Green Mecha)</option>
                          <option value="genshin-astral">Astral Primogem Celestial (Midnight Blue & Star Gold)</option>
                          <option value="minecraft-hearts">Minecraft 8-Bit Survival (Red Pixel Hearts)</option>
                          <option value="cooking-gauge">Let Him Cook / Cooked (High-Perf Neon Green / Red)</option>
                          <option value="roblox-studs">Roblox Studs Badge (Chunky Gold Blocks)</option>
                          <option value="phonk-drift">Phonk Drift Wave (Purple Neon & Speed Lines)</option>
                          <option value="rgb-aura">Aura Chroma Rainbow RGB (Smooth Continuous Cycle)</option>
                        </optgroup>

                        {/* 9. Minimalist & Modern */}
                        <optgroup label="Minimalist & Modern">
                          <option value="pure-static">Pure Static Precision (Zero Animation, Raw Numbers Only)</option>
                          <option value="minimalist-pill">Minimalist Capsule (Floating Glass Accent)</option>
                          <option value="minimal-ticker">Micro Statusbar 1-Line Ticker (Ultra-Compact)</option>
                          <option value="luxury-chronograph">Swiss Luxury Chronograph (Titanium Bezel)</option>
                          <option value="stealth-bracket">Stealth Bracket HUD (Zero-Occlusion Corner Crosshairs)</option>
                          <option value="terminal-sysmon">Terminal Sysmon Ticker (Monospace Green Ticker)</option>
                          <option value="monolith-dark">Monolith Dark Glass (Matte Black Ceramic)</option>
                        </optgroup>

                        {/* 10. AI Studio & Custom Addons */}
                        {customThemesList.length > 0 && (
                          <optgroup label="AI Studio & Custom Addons">
                            {customThemesList.map((ct) => (
                              <option key={ct.id} value={ct.id}>{ct.name} ({ct.author || 'Custom'})</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    {/* Background Opacity */}
                    <div className="settings-field-group">
                      <label className="settings-field-label">
                        <span>Background Opacity</span>
                        <small>{fpsOpacity}%</small>
                      </label>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="5"
                        value={fpsOpacity}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          setFpsOpacity(val)
                          handleUpdateShortcutSetting({ fpsOpacity: val })
                        }}
                        className="settings-range"
                        disabled={!fpsEnabled}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Telemetry Metrics Selection Card */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Telemetry Metrics</strong>
                      <small className="settings-card-subtitle">Choose exactly which stats appear on your HUD during gameplay</small>
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-secondary, #aaa)'
                      }}
                    >
                      {Object.values(fpsMetrics).filter(Boolean).length} of {Object.keys(fpsMetrics).length} active
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px', marginTop: '12px' }}>
                    {METRIC_OPTIONS.map((item) => {
                      const active = Boolean(fpsMetrics[item.key])
                      return (
                        <label
                          key={item.key}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '12px 14px',
                            borderRadius: '9px',
                            background: active ? 'rgba(214, 255, 75, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                            border: active ? '1px solid rgba(214, 255, 75, 0.3)' : '1px solid rgba(255, 255, 255, 0.07)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleFpsMetric(item.key)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--accent, #d6ff4b)', marginTop: '2px', cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: active ? 'var(--text-primary, #fff)' : 'var(--text-secondary, #aaa)' }}>
                              {item.label}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted, #777)', marginTop: '2px', lineHeight: 1.4 }}>
                              {item.desc}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                </div>
            )}

            {/* TAB: AI THEME STUDIO */}
            {activeTab === 'theme-studio' && (
              <div className="settings-tab-pane">
                {/* 1. Header Card with Restore Point Quick Status */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">FPS HUD Theme Studio &amp; Grounded RAG</strong>
                      <small className="settings-card-subtitle">
                        Generates custom in-game overlay HUD styles tailored to your aesthetic prompt or library games.
                      </small>
                    </div>
                    {themeRestorePoint ? (
                      <span className="settings-card-badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
                        ✓ Restore Point Ready ({themeRestorePoint.displayTime || 'Saved'})
                      </span>
                    ) : (
                      <span className="settings-card-badge">Zero-Brick Safe</span>
                    )}
                  </div>

                  {/* Model Connection Status Bar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: aiStatus?.installed ? 'rgba(34, 197, 94, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                    border: aiStatus?.installed ? '1px solid rgba(34, 197, 94, 0.25)' : '1px dashed var(--border-color)',
                    marginTop: '14px',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <Bot size={18} style={{ color: aiStatus?.installed ? '#4ade80' : 'var(--text-muted)', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '12.5px', color: aiStatus?.installed ? '#ffffff' : 'var(--text-primary)' }}>
                            {aiStatus?.installed ? `Active Model: ${aiStatus.modelFileName || 'Custom GGUF'}` : 'No Local AI Model Attached (Optional)'}
                          </strong>
                          <span className="settings-card-badge" style={{
                            background: aiStatus?.installed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            color: aiStatus?.installed ? '#4ade80' : 'var(--text-muted)'
                          }}>
                            {aiStatus?.installed ? 'AI Tailored' : 'Offline Engine Active'}
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
                          {aiStatus?.installed
                            ? `Running locally via node-llama-cpp (${aiExecutionMode === 'cpu-safe' ? 'CPU Only' : aiExecutionMode === 'gamer-balanced' ? 'Partial GPU' : 'Full GPU'}).`
                            : 'Logpile can generate themes immediately using its offline preset engine. Attach any .gguf model (Hermes, Llama, Qwen) for AI design.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="settings-btn"
                      onClick={handleBrowseModelFile}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11.5px',
                        flexShrink: 0,
                        borderColor: aiStatus?.installed ? 'var(--border-color)' : 'var(--accent, #d6ff4b)',
                        color: aiStatus?.installed ? 'var(--text-secondary)' : '#ffffff'
                      }}
                    >
                      <Upload size={13} />
                      {aiStatus?.installed ? 'Change Model (.gguf)' : 'Attach Local GGUF'}
                    </button>
                  </div>

                  {/* Prompt Textarea + Voice Button */}
                  <div className="settings-field-group" style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label className="settings-field-label" style={{ margin: 0 }}>FPS HUD Theme Prompt</label>
                      <button
                        type="button"
                        onClick={handleToggleVoiceInput}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: isThemeVoiceListening ? '1px solid #ef4444' : '1px solid var(--border-color)',
                          background: isThemeVoiceListening ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: isThemeVoiceListening ? '#ef4444' : 'var(--text-secondary)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title={isThemeVoiceListening ? 'Click to stop listening' : 'Speak prompt using microphone'}
                      >
                        {isThemeVoiceListening ? <Mic size={13} style={{ animation: 'hudBloodMoonPulse 1s infinite' }} /> : <Mic size={13} />}
                        {isThemeVoiceListening ? 'Listening...' : 'Voice Command'}
                      </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <textarea
                        value={themePrompt}
                        onChange={(e) => setThemePrompt(e.target.value)}
                        placeholder="e.g. Cyberpunk anime girl with pastel pink sakura bloom, or Doom 1993 heavy marine armor with cyan and red... (or leave blank to roll a surprise HUD style)"
                        rows={3}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: 'rgba(0, 0, 0, 0.35)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          color: 'var(--text-primary, #ffffff)',
                          fontSize: '12.5px',
                          resize: 'vertical',
                          outline: 'none',
                          lineHeight: 1.5,
                        }}
                      />
                    </div>
                  </div>

                  {/* Optional Library Game Anchor (Searchable Autocomplete for 1,000+ games) */}
                  <div className="settings-field-group">
                    <label className="settings-field-label">
                      <span>Ground with Installed Game (Optional)</span>
                      <small>Auto-pulls lore, palette, and developer style from your library</small>
                    </label>

                    {selectedGameForTheme ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--accent, #d6ff4b)',
                        marginTop: '4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '28px', height: '36px', borderRadius: '4px', background: '#1e232d', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                            {selectedGameForTheme.cover_url ? (
                              <img src={selectedGameForTheme.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            ) : (
                              <Gamepad2 size={14} style={{ color: 'var(--text-muted)' }} />
                            )}
                          </div>
                          <div>
                            <strong style={{ fontSize: '13px', color: '#ffffff', display: 'block' }}>
                              {selectedGameForTheme.canonical_title || selectedGameForTheme.title}
                            </strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {[selectedGameForTheme.developer, selectedGameForTheme.genre].filter(Boolean).join(' • ') || 'Installed Game'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedGameForTheme(null); setThemeGameId(''); setThemeGameSearchQuery('') }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Remove game selection"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ position: 'relative', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                          <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            value={themeGameSearchQuery}
                            onChange={(e) => {
                              setThemeGameSearchQuery(e.target.value)
                              setIsGameSearchOpen(true)
                            }}
                            onFocus={() => setIsGameSearchOpen(true)}
                            placeholder="Type to search 1,000+ library games (e.g. Elden Ring, Cyberpunk, Witcher)..."
                            className="settings-input"
                            style={{ paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
                          />
                          {themeGameSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setThemeGameSearchQuery('')}
                              style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>

                        {isGameSearchOpen && themeGameSearchQuery.trim() && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 100,
                            background: '#0d1017',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                            maxHeight: '220px',
                            overflowY: 'auto',
                            marginTop: '4px'
                          }}>
                            {matchingGamesForTheme.length === 0 ? (
                              <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                No games found matching "{themeGameSearchQuery}"
                              </div>
                            ) : (
                              matchingGamesForTheme.slice(0, 8).map((g) => (
                                <div
                                  key={g.id}
                                  onClick={() => {
                                    setSelectedGameForTheme(g)
                                    setThemeGameId(String(g.id))
                                    setIsGameSearchOpen(false)
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '7px 10px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'background 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(214, 255, 75, 0.1)' }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                                >
                                  <div style={{ width: '22px', height: '28px', borderRadius: '3px', background: '#1c202a', overflow: 'hidden', flexShrink: 0 }}>
                                    {g.cover_url ? (
                                      <img src={g.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                    ) : null}
                                  </div>
                                  <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {g.canonical_title || g.title}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                      {[g.developer, g.genre].filter(Boolean).join(' • ') || 'Installed Game'}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Inspiration Chips */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #888)', marginBottom: '8px', fontWeight: 600 }}>
                      Quick Inspiration Chips:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[
                        { label: '🍸 007 Secret Agent', text: 'MI6 secret agent James Bond 007 style stealth HUD with sleek gold and dark slate' },
                        { label: '⚡ Cyberpunk 2077', text: 'Cyberpunk netrunner high-tech HUD with neon cyan and yellow telemetry' },
                        { label: '🌸 Anime Sakura Bloom', text: 'Cute anime girl with pastel cherry blossom pink and soft lilac glow' },
                        { label: '🎖️ Tarkov Combat Stasis', text: 'Tarkov tactical PMC combat stasis with military olive and vital scan' },
                        { label: '🚀 Helldivers Orbital', text: 'Helldivers 2 Super Earth democracy gold and black orbital command' },
                        { label: '🐺 Witcher Silver Wolf', text: 'Witcher 3 Geralt wolf medallion with dark fantasy silver and crimson' },
                        { label: '📻 Winamp 1999 Classic', text: 'Winamp 1999 retro PC media player with bouncing green LED equalizer' },
                        { label: '⛏️ Minecraft Hearts', text: 'Minecraft survival mode with 8-bit red pixel hearts and green border' },
                        { label: '🍳 Let Him Cook', text: 'Gen Alpha meme high performance cooking gauge with neon green' },
                        { label: '🌈 Aura Chroma RGB', text: 'Full rainbow chroma RGB gradient aura that cycles smoothly' },
                      ].map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => setThemePrompt(chip.text)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '14px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            color: 'var(--text-secondary, #cbd5e1)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent, #d6ff4b)'; e.currentTarget.style.color = '#fff' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary, #cbd5e1)' }}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tip Helper Note */}
                  <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💡 Tip: Select a game, type a style, or leave blank to roll a surprise HUD theme.</span>
                  </div>

                  {/* Action Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="button"
                      className="settings-btn settings-btn-primary"
                      onClick={handleGenerateTheme}
                      disabled={themeStudioBusy}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <WandSparkles size={14} />
                      {themeStudioBusy ? 'Grounding & Generating...' : (!themePrompt.trim() && !selectedGameForTheme ? '🎲 Roll Surprise HUD Theme' : '✨ Generate FPS HUD Theme')}
                    </button>

                    {themeRestorePoint && (
                      <button
                        type="button"
                        className="settings-btn"
                        onClick={handleRevertRestorePoint}
                        title="Revert to snapshot before last theme change"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <RotateCcw size={13} />
                        Revert to Restore Point
                      </button>
                    )}
                  </div>

                  {/* Status / Feedback message */}
                  {themeStudioMessage && (
                    <div style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      color: 'var(--text-primary, #ffffff)',
                    }}>
                      {themeStudioMessage}
                    </div>
                  )}
                </div>

                {/* 2. Interactive Live Preview & Activation Card */}
                {themePreviewObj && (
                  <div className="settings-card" style={{ borderColor: 'var(--accent, #d6ff4b)' }}>
                    <div className="settings-card-header">
                      <div>
                        <strong className="settings-card-title">Live Preview: {themePreviewObj.name}</strong>
                        <small className="settings-card-subtitle">{themePreviewObj.tagline} • Badge: [{themePreviewObj.fpsHud?.badge || 'AI'}]</small>
                      </div>
                      <button
                        type="button"
                        className="settings-btn settings-btn-primary"
                        onClick={handleApplyGeneratedTheme}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Check size={13} />
                        Apply Theme &amp; Activate HUD
                      </button>
                    </div>

                    <div style={{
                      marginTop: '14px',
                      padding: '24px',
                      borderRadius: '8px',
                      background: 'radial-gradient(ellipse at center, rgba(30, 35, 45, 0.4) 0%, rgba(10, 12, 16, 0.8) 100%)',
                      border: '1px dashed var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #777)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Simulated In-Game Overlay Display
                      </div>
                      <div>
                        {renderHudPreview(themePreviewObj.id, fpsMetrics, fpsOrientation, HUD_PREVIEW_TELEMETRY, themePreviewObj)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: 'var(--text-secondary, #aaa)' }}>
                        <span>Primary: <strong style={{ color: themePreviewObj.palette.accent }}>{themePreviewObj.palette.accent}</strong></span>
                        <span>Badge: <strong style={{ color: 'var(--accent, #d6ff4b)' }}>[{themePreviewObj.fpsHud?.badge || 'AI'}]</strong></span>
                        <span>Overhead: <strong style={{ color: '#22c55e' }}>0.0% GPU (Static)</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Custom Themes Library Manager (Individual + Bulk Operations) */}
                <div className="settings-card" style={{ marginTop: '16px' }}>
                  <div className="settings-card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <strong className="settings-card-title">Custom FPS HUD Themes ({customThemesList.length})</strong>
                      <small className="settings-card-subtitle">Manage, bulk export, import, or delete your custom FPS overlay HUD styles</small>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        accept=".json"
                        ref={themeJsonInputRef}
                        style={{ display: 'none' }}
                        onChange={handleImportThemesFile}
                      />
                      <button
                        type="button"
                        className="settings-btn"
                        onClick={() => themeJsonInputRef.current?.click()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}
                      >
                        <Upload size={13} />
                        Import JSON
                      </button>

                      {customThemesList.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="settings-btn"
                            onClick={() => handleExportThemes(selectedCustomThemeIds.length > 0 ? selectedCustomThemeIds : null)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}
                            title={selectedCustomThemeIds.length > 0 ? `Export ${selectedCustomThemeIds.length} selected themes` : 'Export all themes'}
                          >
                            <Download size={13} />
                            {selectedCustomThemeIds.length > 0 ? `Export Selected (${selectedCustomThemeIds.length})` : 'Export All'}
                          </button>

                          {selectedCustomThemeIds.length > 0 && (
                            <button
                              type="button"
                              className="settings-btn settings-btn-danger"
                              onClick={handleBulkDeleteThemes}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}
                            >
                              <Trash2 size={13} />
                              Delete Selected ({selectedCustomThemeIds.length})
                            </button>
                          )}

                          <button
                            type="button"
                            className="settings-btn"
                            onClick={handleFactoryResetThemes}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#f87171' }}
                            title="Purge all custom themes and revert to factory presets"
                          >
                            <RotateCcw size={12} />
                            Reset All
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {customThemesList.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #777)', fontSize: '12px' }}>
                      No custom themes created yet. Use the prompt studio above to generate your first theme!
                    </div>
                  ) : (
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', marginBottom: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedCustomThemeIds.length === customThemesList.length && customThemesList.length > 0}
                            onChange={handleToggleSelectAllThemes}
                            style={{ accentColor: 'var(--accent, #d6ff4b)', cursor: 'pointer' }}
                          />
                          Select All ({customThemesList.length})
                        </label>
                        <span>{selectedCustomThemeIds.length} selected</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {customThemesList.map((theme) => {
                          const isSelected = selectedCustomThemeIds.includes(theme.id)
                          const isCurrentActive = fpsStyle === theme.id
                          const accent = theme.palette?.accent || '#38bdf8'
                          const badge = theme.fpsHud?.badge || 'AI'

                          return (
                            <div
                              key={theme.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                background: isCurrentActive ? 'rgba(214, 255, 75, 0.07)' : 'rgba(255, 255, 255, 0.02)',
                                border: isCurrentActive ? '1px solid var(--accent, #d6ff4b)' : '1px solid var(--border-color)',
                                gap: '12px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectTheme(theme.id)}
                                  style={{ accentColor: 'var(--accent, #d6ff4b)', cursor: 'pointer' }}
                                />
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontSize: '9.5px',
                                  fontWeight: 800,
                                  border: `1px solid ${accent}`,
                                  color: accent,
                                  background: 'rgba(0, 0, 0, 0.5)',
                                  letterSpacing: '0.04em'
                                }}>
                                  {badge}
                                </span>
                                <div style={{ overflow: 'hidden' }}>
                                  <strong style={{ fontSize: '12.5px', color: '#ffffff', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {theme.name}
                                  </strong>
                                  <small style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                    {theme.tagline || theme.category || 'Custom Theme'}
                                  </small>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  className={`settings-btn ${isCurrentActive ? 'settings-btn-primary' : ''}`}
                                  onClick={() => {
                                    setFpsStyle(theme.id)
                                    handleUpdateShortcutSetting({ fpsStyle: theme.id })
                                    setThemeStudioMessage(`Theme "${theme.name}" activated!`)
                                  }}
                                  style={{ fontSize: '11px', padding: '4px 10px' }}
                                >
                                  {isCurrentActive ? 'Active' : 'Apply'}
                                </button>
                                <button
                                  type="button"
                                  className="settings-btn"
                                  onClick={() => handleExportThemes([theme.id])}
                                  title="Export this single theme to JSON"
                                  style={{ padding: '5px 8px' }}
                                >
                                  <Download size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="settings-btn settings-btn-danger"
                                  onClick={() => handleSingleDeleteTheme(theme.id, theme.name)}
                                  title="Delete theme"
                                  style={{ padding: '5px 8px' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: AI COMPANION & VOICE */}
            {activeTab === 'ai' && (
              <div className="settings-tab-pane">
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Offline Gaming Assistant Personality</strong>
                      <small className="settings-card-subtitle">Local CPU/GPU inference with zero cloud dependencies</small>
                    </div>
                    <span className="settings-card-badge">100% Offline</span>
                  </div>

                  <div className="settings-field-group">
                    <label className="settings-field-label">Companion Tone &amp; Role</label>
                    <select
                      value={aiPersonality}
                      onChange={(e) => {
                        const val = e.target.value
                        setAiPersonality(val)
                        try {
                          localStorage.setItem('logpile-ai-personality', val)
                        } catch {}
                      }}
                      className="settings-select"
                    >
                      <option value="auto">Auto-Detect (Adaptive based on active game)</option>
                      <option value="companion">The Co-op Buddy (Enthusiastic, encouraging, spoiler-free)</option>
                      <option value="librarian">The Lore Keeper (Deep game history, plot analysis, worldbuilding)</option>
                      <option value="coach">The Speedrun Coach (Min-max builds, boss attack windows, optimal paths)</option>
                      <option value="minimal">The Silent Partner (Concise, 1-line answers, no small talk)</option>
                    </select>
                  </div>

                  {/* GPU Hardware Acceleration & Execution Profile */}
                  <div className="settings-field-group" style={{ marginTop: '16px' }}>
                    <div
                      className="settings-toggle-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        const isGpuOn = aiExecutionMode !== 'cpu-safe'
                        const nextMode = isGpuOn ? 'cpu-safe' : 'gamer-balanced'
                        handleSetAiExecutionMode(nextMode)
                      }}
                    >
                      <div className="settings-toggle-text" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>GPU Hardware Acceleration</strong>
                          <span className="settings-card-badge" style={{
                            background: aiExecutionMode !== 'cpu-safe' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            color: aiExecutionMode !== 'cpu-safe' ? '#4ade80' : 'var(--text-secondary)'
                          }}>
                            {aiExecutionMode === 'cpu-safe' ? 'CPU Only' : (aiExecutionMode === 'gamer-balanced' ? 'Partial GPU' : 'Full GPU')}
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                          {aiExecutionMode === 'cpu-safe'
                            ? 'Disabled (CPU Only): AI runs 100% on CPU with 0 MB VRAM and 0% GPU load. Leaves your graphics card completely dedicated to your game, preventing stutter and allowing instant in-game responses from system RAM.'
                            : 'Enabled: Offloads AI neural layers to your graphics card for faster response times.'}
                        </p>
                      </div>
                      <PillToggle
                        checked={aiExecutionMode !== 'cpu-safe'}
                        onChange={(val) => {
                          const nextMode = val ? 'gamer-balanced' : 'cpu-safe'
                          handleSetAiExecutionMode(nextMode)
                        }}
                      />
                    </div>

                    {/* When GPU is enabled: choose Partial GPU vs Full GPU */}
                    {aiExecutionMode !== 'cpu-safe' && (
                      <div style={{
                        marginTop: '10px',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid var(--border-color)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <label className="settings-field-label" style={{ margin: 0 }}>
                            <span>GPU Load Level</span>
                            <small>Select how much graphics memory Logpile can allocate</small>
                          </label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleSetAiExecutionMode('gamer-balanced')}
                            style={{
                              textAlign: 'left',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              border: aiExecutionMode === 'gamer-balanced' ? '1px solid var(--accent, #d6ff4b)' : '1px solid var(--border-color)',
                              background: aiExecutionMode === 'gamer-balanced' ? 'rgba(214, 255, 75, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '12px', color: aiExecutionMode === 'gamer-balanced' ? 'var(--accent, #d6ff4b)' : '#ffffff' }}>
                                Partial GPU Load
                              </strong>
                              <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 600 }}>Recommended</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              Gamer Balanced (~1.2 GB VRAM cap). Dynamically checks free VRAM to keep your game running at max FPS.
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetAiExecutionMode('full-beast')}
                            style={{
                              textAlign: 'left',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              border: aiExecutionMode === 'full-beast' ? '1px solid var(--accent, #d6ff4b)' : '1px solid var(--border-color)',
                              background: aiExecutionMode === 'full-beast' ? 'rgba(214, 255, 75, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '12px', color: aiExecutionMode === 'full-beast' ? 'var(--accent, #d6ff4b)' : '#ffffff' }}>
                                Full GPU Load
                              </strong>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>High-End Rig</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              Maximum speed. Offloads all layers to VRAM for instant answers (recommended for 8 GB+ VRAM GPUs).
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Auto-unload from RAM on game launch */}
                    <div
                      className="settings-toggle-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        marginTop: '10px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        const next = !autoUnloadOnGame
                        setAutoUnloadOnGame(next)
                        window.api?.ai?.setAutoUnload?.(next).catch(() => {})
                      }}
                    >
                      <div className="settings-toggle-text" style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Purge AI from System RAM on Game Launch</strong>
                        <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                          {autoUnloadOnGame
                            ? 'Enabled: Unloads model from RAM when launching games to save memory. (In-game AI assistant will reload from disk when called).'
                            : 'Disabled (Recommended for HDD / USB drives): Keeps model warm in system RAM for instant in-game responses with zero reload delay.'}
                        </p>
                      </div>
                      <PillToggle
                        checked={autoUnloadOnGame}
                        size="sm"
                        onChange={(val) => {
                          setAutoUnloadOnGame(val)
                          window.api?.ai?.setAutoUnload?.(val).catch(() => {})
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Voice Controls */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mic size={16} style={{ color: 'var(--accent, #d6ff4b)' }} />
                      <div>
                        <strong className="settings-card-title">Voice Controls &amp; Dictation</strong>
                        <small className="settings-card-subtitle">Hands-free gaming queries via local microphone</small>
                      </div>
                    </div>
                  </div>

                  <div
                    className="settings-toggle-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', cursor: 'pointer' }}
                    onClick={() => {
                      const next = { ...voiceSettings, ttsEnabled: !voiceSettings?.ttsEnabled }
                      setVoiceSettings(next)
                      try {
                        localStorage.setItem('logpile-voice-settings', JSON.stringify(next))
                      } catch {}
                    }}
                  >
                    <div className="settings-toggle-text" style={{ flex: 1, minWidth: 0 }}>
                      <strong>Audio Spoken Responses (Text-to-Speech)</strong>
                      <small>Voice synthesizer reads AI companion tips aloud so you don't have to read text while playing.</small>
                    </div>
                    <PillToggle
                      checked={Boolean(voiceSettings?.ttsEnabled)}
                      onChange={(val) => {
                        const next = { ...voiceSettings, ttsEnabled: val }
                        setVoiceSettings(next)
                        try {
                          localStorage.setItem('logpile-voice-settings', JSON.stringify(next))
                        } catch {}
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: METADATA & PROVIDERS */}
            {activeTab === 'metadata' && (
              <div className="settings-tab-pane">
                {savedNotice && (
                  <div className="settings-alert success">
                    <Check size={14} />
                    <span>Credentials saved successfully!</span>
                  </div>
                )}

                <form onSubmit={handleSaveKeys} className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Artwork &amp; Game Data Credentials</strong>
                      <small className="settings-card-subtitle">Required to download high-resolution posters, backdrops, and IGDB game lore</small>
                    </div>
                    <button
                      type="button"
                      className="outline-button small-button"
                      onClick={() => setShowKeys((prev) => !prev)}
                    >
                      {showKeys ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{showKeys ? 'Hide Keys' : 'Show Keys'}</span>
                    </button>
                  </div>

                  {/* SteamGridDB Key - Image 1 Fix: Full width flex input */}
                  <div className="settings-field-group">
                    <label className="settings-field-label">
                      <span>SteamGridDB API Key</span>
                      <small>Used for game posters, widescreen hero banners, and transparent logos</small>
                    </label>
                    <div className="settings-input-btn-group">
                      <input
                        type={showKeys ? 'text' : 'password'}
                        value={steamGridDbApiKey}
                        onChange={(e) => setSteamGridDbApiKey(e.target.value)}
                        placeholder="Paste your 32-character SteamGridDB key..."
                        className="settings-input"
                      />
                      <button
                        type="button"
                        onClick={handleTestKey}
                        disabled={saving || !steamGridDbApiKey.trim()}
                        className="outline-button small-button"
                      >
                        <PlugZap size={13} />
                        <span>Test Key</span>
                      </button>
                    </div>
                  </div>

                  {/* IGDB Client ID */}
                  <div className="settings-field-group">
                    <label className="settings-field-label">
                      <span>IGDB / Twitch Client ID</span>
                      <small>Used for official release dates, descriptions, genres, and developer metadata</small>
                    </label>
                    <input
                      type={showKeys ? 'text' : 'password'}
                      value={igdbClientId}
                      onChange={(e) => setIgdbClientId(e.target.value)}
                      placeholder="Paste your Twitch Developer Client ID..."
                      className="settings-input"
                    />
                  </div>

                  {/* IGDB Client Secret */}
                  <div className="settings-field-group">
                    <label className="settings-field-label">
                      <span>IGDB / Twitch Client Secret</span>
                      <small>Secret token paired with your Client ID</small>
                    </label>
                    <input
                      type={showKeys ? 'text' : 'password'}
                      value={igdbClientSecret}
                      onChange={(e) => setIgdbClientSecret(e.target.value)}
                      placeholder="Paste your Twitch Client Secret..."
                      className="settings-input"
                    />
                  </div>

                  {igdbTestStatus && (
                    <div className={`settings-alert ${igdbTestStatus.ok ? 'success' : igdbTestStatus.testing ? 'info' : 'error'}`} style={{ marginTop: '10px' }}>
                      {igdbTestStatus.testing ? <RefreshCw size={13} className="spin-icon" /> : igdbTestStatus.ok ? <Check size={13} /> : <AlertTriangle size={13} />}
                      <span>{igdbTestStatus.message}</span>
                    </div>
                  )}

                  {/* Image 1 Fix: Save Credentials button styled with primary-button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <button
                      type="button"
                      onClick={handleTestIgdb}
                      disabled={saving || !igdbClientId.trim() || !igdbClientSecret.trim()}
                      className="outline-button small-button"
                    >
                      <PlugZap size={13} />
                      <span>Test IGDB OAuth</span>
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="primary-button small-button"
                    >
                      <Check size={13} />
                      <span>{saving ? 'Saving...' : 'Save Credentials'}</span>
                    </button>
                  </div>
                </form>

                {/* Bulk Actions */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Bulk Library Maintenance</strong>
                      <small className="settings-card-subtitle">Cache optimization and visual refresh</small>
                    </div>
                  </div>

                  {syncNotice && (
                    <div className="settings-alert info" style={{ marginBottom: '14px' }}>
                      <Info size={14} />
                      <span>{syncNotice}</span>
                    </div>
                  )}

                  <div className="settings-grid-3">
                    <button
                      type="button"
                      className="outline-button"
                      onClick={handleRestoreStaticArtwork}
                      disabled={isBusy}
                      title="Convert video artwork to fast static images for 120 FPS grid scrolling"
                    >
                      <ImagePlus size={14} />
                      <span>Restore Static Artwork</span>
                    </button>

                    <button
                      type="button"
                      className="outline-button"
                      onClick={handleSyncAll}
                      disabled={isBusy}
                      title="Sync metadata and artwork for your entire collection"
                    >
                      <RefreshCw size={14} className={activeSync === 'all' ? 'spin-icon' : ''} />
                      <span>Full Library Sync</span>
                    </button>

                    <button
                      type="button"
                      className="outline-button"
                      onClick={handleGenerateFallbacks}
                      disabled={isBusy}
                      title="Generate offline fallback artwork for games with missing covers"
                    >
                      <WandSparkles size={14} />
                      <span>Generate Fallbacks</span>
                    </button>
                  </div>

                  {isBusy && (
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--accent, #d6ff4b)' }}>Sync in progress...</span>
                      <button
                        type="button"
                        onClick={handleCancelSync}
                        className="outline-button small-button"
                        style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                      >
                        Cancel Sync
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: SYSTEM & SPECS */}
            {activeTab === 'system' && (
              <div className="settings-tab-pane">
                {/* Hardware Specs Card */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={16} style={{ color: 'var(--accent, #d6ff4b)' }} />
                      <div>
                        <strong className="settings-card-title">Hardware Specifications</strong>
                        <small className="settings-card-subtitle">Detected local computing hardware and memory capacity</small>
                      </div>
                    </div>
                    <span className="settings-card-badge">Local Rig</span>
                  </div>

                  <div className="settings-grid-3">
                    <div className="settings-stat-tile">
                      <span className="settings-stat-label">Graphics Card (GPU)</span>
                      <strong className="settings-stat-val">
                        {stats.systemSpecs?.gpu ? stats.systemSpecs.gpu.replace(/NVIDIA\s+|GeForce\s+/gi, '') : 'Dedicated GPU'}
                      </strong>
                      <small className="settings-stat-meta">{stats.systemSpecs?.gpu || 'DirectX 12 / Vulkan compatible'}</small>
                    </div>

                    <div className="settings-stat-tile">
                      <span className="settings-stat-label">Processor (CPU)</span>
                      <strong className="settings-stat-val">
                        {stats.systemSpecs?.cpu ? stats.systemSpecs.cpu.replace(/Intel\s+|Core\s+/gi, '') : 'Multi-core CPU'}
                      </strong>
                      <small className="settings-stat-meta">{stats.systemSpecs?.cpu || 'Native multi-threading'}</small>
                    </div>

                    <div className="settings-stat-tile">
                      <span className="settings-stat-label">System RAM</span>
                      <strong className="settings-stat-val">
                        {stats.systemSpecs?.ram || '16 GB'}
                      </strong>
                      <small className="settings-stat-meta">Installed physical memory</small>
                    </div>
                  </div>
                </div>

                {/* Storage & Drives Card */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <HardDrive size={16} style={{ color: 'var(--accent, #d6ff4b)' }} />
                      <div>
                        <strong className="settings-card-title">Storage Footprint &amp; Drives</strong>
                        <small className="settings-card-subtitle">Local storage utilization across your connected gaming drives</small>
                      </div>
                    </div>
                  </div>

                  <div className="settings-grid-3">
                    <div className="settings-stat-tile">
                      <span className="settings-stat-label">Game Library Footprint</span>
                      <strong className="settings-stat-val">
                        {formatGb(stats.totalStorageGb)}
                      </strong>
                      <small className="settings-stat-meta">Total disk space used by installed titles</small>
                    </div>

                    <div className="settings-stat-tile">
                      <span className="settings-stat-label">Available Free Storage</span>
                      <strong className="settings-stat-val">
                        {stats.systemSpecs?.freeStorageGb ? `${stats.systemSpecs.freeStorageGb} GB` : '—'}
                      </strong>
                      <small className="settings-stat-meta">
                        {stats.systemSpecs?.driveCount ? `Free on ${stats.systemSpecs.driveCount} drives (${stats.systemSpecs.driveLetters || '—'})` : 'Across all local drives'}
                      </small>
                    </div>

                    <div className="settings-stat-tile">
                      <span className="settings-stat-label">Total Drive Capacity</span>
                      <strong className="settings-stat-val">
                        {stats.systemSpecs?.totalStorageGb ? `${stats.systemSpecs.totalStorageGb} GB` : '—'}
                      </strong>
                      <small className="settings-stat-meta">Aggregated physical drive volume</small>
                    </div>
                  </div>
                </div>

                {/* Engine Diagnostics Card */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TerminalSquare size={16} style={{ color: 'var(--accent, #d6ff4b)' }} />
                      <div>
                        <strong className="settings-card-title">Engine &amp; Database Diagnostics</strong>
                        <small className="settings-card-subtitle">Offline runtime internals, SQLite integrity, and renderer telemetry</small>
                      </div>
                    </div>
                    <span className="settings-card-badge">Diagnostic Health</span>
                  </div>

                  <div className="settings-grid-2">
                    <div className="settings-card-sub">
                      <strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        Database Path &amp; Integrity
                      </strong>
                      <p style={{ margin: '4px 0 2px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                        {health?.databasePath || 'UserData/logpile.db'}
                      </p>
                      <small style={{ color: 'var(--accent, #d6ff4b)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <ShieldCheck size={12} /> {health?.integrityOk ? 'Integrity Verified · SQLite WAL Mode' : 'Connected · WAL Mode'}
                      </small>
                    </div>

                    <div className="settings-card-sub">
                      <strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        Runtime Architecture
                      </strong>
                      <p style={{ margin: '4px 0 2px', fontSize: '12px', color: 'var(--text-primary)' }}>
                        Electron {health?.electronVersion || '34'} · Chromium {health?.chromeVersion || '130'} · Node {health?.nodeVersion || '20'}
                      </p>
                      <small style={{ color: 'var(--text-secondary)' }}>
                        OS: {health?.osVersion || 'Windows'} · Memory: {health?.heapUsedMb ? `${health.heapUsedMb} MB Heap` : 'Optimal'}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: CONTROLLER & GAMEPAD (Image 2 Fix: Restored earlier 3-zone cards layout!) */}
            {activeTab === 'gamepad' && (
              <div className="settings-tab-pane">
                {/* Controller Status Header Banner */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Gamepad &amp; Remote Control Status</strong>
                      <small className="settings-card-subtitle">Local OS HID controller engine with zero external drivers needed</small>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleScanGamepad}
                      disabled={isScanningGamepad}
                      title="Scan for connected gamepads and controllers now"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <RefreshCw size={12} className={isScanningGamepad ? 'spin-icon' : ''} />
                      <span>{isScanningGamepad ? 'Scanning...' : 'Scan Devices'}</span>
                    </button>
                  </div>

                  <div className={`settings-gamepad-status-banner ${activeGamepad ? 'connected' : ''}`}>
                    <div className={`settings-gamepad-icon-wrap ${activeGamepad ? 'active' : ''}`}>
                      <Gamepad2 size={24} style={{ color: activeGamepad ? 'var(--accent, #d6ff4b)' : 'var(--text-muted)' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                          {activeGamepad ? `Connected: ${activeGamepad}` : 'No Gamepad Detected'}
                        </strong>
                        {activeGamepad && (
                          <span className="settings-card-badge" style={{ margin: 0, padding: '2px 8px', fontSize: '10px' }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p>
                        {activeGamepad
                          ? 'Full controller navigation active. Gamepad navigation is supported everywhere in the application.'
                          : 'Plug in or pair any standard Xbox Wireless, PlayStation DualSense/DualShock, or PC DirectInput controller.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Where Gamepad Works Everywhere Card */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Full Application Gamepad Controls Legend</strong>
                      <small className="settings-card-subtitle">How controller navigation works across every screen in Logpile</small>
                    </div>
                  </div>

                  <div className="settings-gamepad-zones">
                    {/* Zone 1: Main Library Grid */}
                    <div className="settings-zone-card">
                      <div className="settings-zone-header">
                        <span className="settings-zone-badge">1. Library Grid</span>
                        <strong>Main Game Collection &amp; Shelves</strong>
                      </div>
                      <div className="settings-legend-list">
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge">D-Pad / Left Stick</kbd>
                          <span>Move card focus smoothly across the game grid</span>
                        </div>
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge badge-a">A</kbd>
                          <span>Open selected Game Dossier / Launch game</span>
                        </div>
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge badge-x">X</kbd>
                          <span>Cycle Backlog Status (Unplayed → Playing → Completed)</span>
                        </div>
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge badge-y">Y</kbd>
                          <span>Toggle Favorite on selected game</span>
                        </div>
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge">LB / RB</kbd>
                          <span>Cycle sidebar views (Installed, Favorites, Ready, All)</span>
                        </div>
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge">Menu / Start</kbd>
                          <span>Open Game Quick Actions context menu</span>
                        </div>
                      </div>
                    </div>

                    {/* Zone 2: Game Dossier View */}
                    <div className="settings-zone-card">
                      <div className="settings-zone-header">
                        <span className="settings-zone-badge">2. Game Dossier</span>
                        <strong>Full-Page Game Details &amp; Lore</strong>
                      </div>
                      <div className="settings-legend-list">
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge badge-a">A</kbd>
                          <span>Launch Game instantly</span>
                        </div>
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge badge-b">B</kbd>
                          <span>Back to Library Grid</span>
                        </div>
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge">Left Stick</kbd>
                          <span>Smooth scroll through storyline, achievements, and strategy guides</span>
                        </div>
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge badge-r3">R3</kbd>
                          <span>Push-to-Talk voice prompt to AI Companion</span>
                        </div>
                      </div>
                    </div>

                    {/* Zone 3: In-Game Overlay */}
                    <div className="settings-zone-card">
                      <div className="settings-zone-header">
                        <span className="settings-zone-badge">3. In-Game Overlay</span>
                        <strong>HUD Guide &amp; Voice Assistant (Ctrl+Shift+Space)</strong>
                      </div>
                      <div className="settings-legend-list">
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge">D-Pad</kbd>
                          <span>Navigate guides, questions, and walkthrough tips</span>
                        </div>
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge badge-a">A</kbd>
                          <span>Select guide option or ask question</span>
                        </div>
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge badge-r3">R3</kbd>
                          <span>Push-to-Talk voice recognition (Talk to AI while in-game)</span>
                        </div>
                        <div className="settings-legend-row">
                          <kbd className="gamepad-key-badge badge-b">B</kbd>
                          <span>Dismiss Overlay and return to game</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: BACKUPS & DATABASE & ACTIVITY */}
            {activeTab === 'backups' && (
              <div className="settings-tab-pane">
                {/* Backups & Snapshots - Image 3 Fix: Primary button for Backup Now */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Point-in-Time SQLite Snapshots</strong>
                      <small className="settings-card-subtitle">Instant local database recovery with zero data loss</small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={onOpenBackupsFolder}
                        className="outline-button small-button"
                      >
                        <FolderOpen size={13} />
                        <span>Open Folder</span>
                      </button>
                      <button
                        type="button"
                        onClick={onBackupNow}
                        disabled={backupBusy}
                        className="primary-button small-button"
                      >
                        <Archive size={13} />
                        <span>{backupBusy ? 'Backing up...' : 'Backup Now'}</span>
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                    Logpile creates automatic SQLite snapshot backups before large scan operations and metadata updates.
                  </p>

                  <div className="settings-backups-list custom-scrollbar">
                    {backupsList?.length ? (
                      backupsList.map((backup) => (
                        <div key={backup.path || backup.filename} className="settings-backup-item">
                          <div>
                            <strong>{backup.filename || 'logpile-backup.db'}</strong>
                            <small>{formatTimestamp(backup.timestamp)} · {formatBytes(backup.sizeBytes)}</small>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenBackupsManager?.(backup)}
                            disabled={restoreBusy}
                            className="outline-button small-button"
                          >
                            Restore
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="settings-empty-notice">
                        <Archive size={20} style={{ opacity: 0.5, marginBottom: '2px' }} />
                        <span>No snapshots found in backup folder. Click &quot;Backup Now&quot; to create your first snapshot.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CSV Catalog & Artwork Cache */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Data Export &amp; Visual Cache</strong>
                      <small className="settings-card-subtitle">Portable CSV spreadsheets and compressed artwork archives</small>
                    </div>
                  </div>

                  <div className="settings-grid-3">
                    <button
                      type="button"
                      onClick={() => onExport?.('all')}
                      className="outline-button"
                      title="Export entire library as a CSV spreadsheet"
                    >
                      <FileDown size={14} />
                      <span>Export All (CSV)</span>
                    </button>

                    <button
                      type="button"
                      onClick={onBackupCache}
                      className="outline-button"
                      title="Compress your high-resolution artwork cache into a single ZIP"
                    >
                      <Archive size={14} />
                      <span>Backup Artwork (ZIP)</span>
                    </button>

                    <button
                      type="button"
                      onClick={onRestoreCache}
                      className="outline-button"
                      title="Restore artwork from an existing ZIP file"
                    >
                      <UploadCloud size={14} />
                      <span>Restore Artwork</span>
                    </button>
                  </div>
                </div>

                {/* Recent Activity Feed - Image 4 Fix: Clean row layout with space between badge and time */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={16} style={{ color: 'var(--accent, #d6ff4b)' }} />
                      <div>
                        <strong className="settings-card-title">Recent Activity &amp; Audit Trail</strong>
                        <small className="settings-card-subtitle">Audit trail of local scans, metadata updates, artwork downloads, and game launches</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="outline-button small-button"
                      disabled={activityLoading}
                      onClick={onRefreshActivity}
                      title="Refresh activity feed"
                    >
                      <RefreshCw size={13} className={activityLoading ? 'spin-icon' : ''} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="activity-feed-container custom-scrollbar" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    {activityLoading && !activityLog.length ? (
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
                          const displayType = rawType.replace(/_/g, ' ')

                          return (
                            <div key={event.id || idx} className="activity-feed-item">
                              <div className={`activity-type-badge badge-${tone}`}>
                                <Icon size={14} />
                              </div>
                              <div className="activity-item-content">
                                <div className="activity-item-row">
                                  <span className={`activity-item-type badge-${tone}`}>{displayType}</span>
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
                        <Activity size={24} />
                        <span>No recorded activity events yet.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Danger Zone: Purge */}
                <div className="settings-card" style={{ borderColor: 'rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.03)' }}>
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title" style={{ color: '#f87171' }}>Danger Zone: Reset Database</strong>
                      <small className="settings-card-subtitle">Delete all imported game records while preserving artwork cache</small>
                    </div>
                    <button
                      type="button"
                      onClick={onPurge}
                      className="outline-button small-button"
                      style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    >
                      <Trash2 size={13} />
                      <span>Purge Library</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

                        {/* TAB 8: HIDDEN APPS */}
            {activeTab === 'hidden' && (
              <div className="settings-tab-pane">
                <div className="settings-card">
                  {/* Header */}
                  <div className="settings-card-header" style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <EyeOff size={16} style={{ color: 'var(--accent, #d6ff4b)' }} />
                      <div>
                        <strong className="settings-card-title">Hidden Library Entries</strong>
                        <small className="settings-card-subtitle">
                          Support components, redistributables, and titles you hid manually stay out of the main grid
                        </small>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-secondary, #aaa)'
                      }}
                    >
                      {hiddenGames.length} hidden
                    </span>
                  </div>

                  {/* Action Notice Toast */}
                  {hiddenActionNotice && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        marginBottom: '14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: hiddenActionNotice.tone === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        border: hiddenActionNotice.tone === 'success' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        color: hiddenActionNotice.tone === 'success' ? '#4ade80' : '#f87171'
                      }}
                    >
                      {hiddenActionNotice.tone === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
                      <span>{hiddenActionNotice.text}</span>
                    </div>
                  )}

                  {/* Delete Confirmation Banner */}
                  {confirmDeleteModal && (
                    <div
                      style={{
                        padding: '14px 16px',
                        marginBottom: '16px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <Trash2 size={16} style={{ color: '#f87171', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fca5a5' }}>
                            Permanently delete {confirmDeleteModal.count} {confirmDeleteModal.count === 1 ? 'record' : 'records'} from library database?
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                            {confirmDeleteModal.title ? `"${confirmDeleteModal.title}" will be removed.` : 'Selected titles will be removed.'} Installed game files on your PC will not be touched.
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          className="outline-button small-button"
                          disabled={hiddenBusy}
                          onClick={() => setConfirmDeleteModal(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="danger-button small-button"
                          disabled={hiddenBusy}
                          onClick={executeDeleteHidden}
                          style={{ background: '#ef4444', color: '#ffffff', borderColor: '#dc2626' }}
                        >
                          <Trash2 size={12} />
                          <span>{hiddenBusy ? 'Deleting...' : `Confirm Delete (${confirmDeleteModal.count})`}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Search Bar */}
                  {hiddenGames.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '12px'
                      }}
                    >
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Search
                          size={13}
                          style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted, #888)',
                            pointerEvents: 'none'
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Search hidden titles, DLC, or tools..."
                          value={hiddenSearchQuery}
                          onChange={(e) => setHiddenSearchQuery(e.target.value)}
                          className="settings-input"
                          style={{
                            paddingLeft: '34px',
                            paddingRight: hiddenSearchQuery ? '32px' : '12px',
                            height: '34px',
                            fontSize: '12px'
                          }}
                        />
                        {hiddenSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setHiddenSearchQuery('')}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted, #888)',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title="Clear search"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {!hiddenSelectMode && selectedHiddenIds.size === 0 ? (
                        <button
                          type="button"
                          className="outline-button small-button"
                          onClick={() => setHiddenSelectMode(true)}
                          disabled={hiddenBusy || !filteredHiddenGames.length}
                          title="Enable multi-select mode"
                        >
                          <CheckSquare size={12} />
                          <span>Select</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="outline-button small-button"
                          onClick={() => {
                            setHiddenSelectMode(false)
                            setSelectedHiddenIds(new Set())
                          }}
                          title="Cancel selection mode"
                        >
                          <X size={12} />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Bulk Action Bar (Home Page Style) */}
                  {selectedHiddenIds.size > 0 && (
                    <div className="bulk-action-bar" style={{ margin: '0 0 14px' }}>
                      <span>
                        <Check size={14} style={{ color: 'var(--accent, #d6ff4b)' }} />
                        {selectedHiddenIds.size} selected · {filteredHiddenGames.length} filtered
                      </span>
                      <div className="bulk-action-group">
                        <button
                          type="button"
                          className="outline-button small-button"
                          disabled={hiddenBusy || !filteredHiddenGames.length}
                          onClick={toggleSelectAllFilteredHidden}
                          title="Select all filtered entries"
                        >
                          <Check size={13} />
                          <span>Select All Filtered</span>
                        </button>
                        <button
                          type="button"
                          className="outline-button small-button"
                          disabled={hiddenBusy}
                          onClick={() => { setSelectedHiddenIds(new Set()); setHiddenSelectMode(false); }}
                          title="Clear all selected entries"
                        >
                          <X size={13} />
                          <span>Deselect All</span>
                        </button>
                        <button
                          type="button"
                          className="outline-button small-button"
                          style={{
                            color: 'var(--accent, #d6ff4b)',
                            borderColor: 'rgba(214, 255, 75, 0.4)'
                          }}
                          disabled={hiddenBusy}
                          onClick={handleBulkRestoreHidden}
                          title="Unhide selected entries and restore them to main library"
                        >
                          <Eye size={13} />
                          <span>Unhide Selected</span>
                        </button>
                        <button
                          type="button"
                          className="danger-button small-button"
                          disabled={hiddenBusy}
                          onClick={handleBulkDeleteHidden}
                          title="Delete selected records permanently from database"
                        >
                          <Trash2 size={13} />
                          <span>Delete Selected</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hidden List */}
                  {hiddenGames.length ? (
                    filteredHiddenGames.length ? (
                      <div className="hidden-items-list custom-scrollbar" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                        {filteredHiddenGames.map((game) => {
                          const isSelected = selectedHiddenIds.has(game.id)
                          return (
                            <div
                              className="hidden-item"
                              key={game.id}
                              style={{
                                background: isSelected ? 'rgba(214, 255, 75, 0.05)' : undefined,
                                borderColor: isSelected ? 'rgba(214, 255, 75, 0.3)' : undefined
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: (hiddenSelectMode || selectedHiddenIds.size > 0 || isSelected) ? '12px' : '0px', minWidth: 0, flex: 1, transition: 'gap 0.15s ease' }}>
                                {(hiddenSelectMode || selectedHiddenIds.size > 0 || isSelected) && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectHidden(game.id)}
                                    className="hidden-item-checkbox"
                                    title="Select entry"
                                  />
                                )}
                                <div className="hidden-item-copy">
                                  <strong style={{ fontSize: '13px' }}>{game.canonical_title}</strong>
                                  <small style={{ fontSize: '11px' }}>
                                    {game.hidden_reason === 'support-component-or-addon'
                                      ? 'Automatically hidden support or add-on package'
                                      : 'Hidden manually by user'}{' '}
                                    · {game.backlog_status || 'unplayed'} · {formatPlayTime(game.play_time_seconds)}
                                    {game.source ? ` · ${game.source.toUpperCase()}` : ''}
                                  </small>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  className="outline-button small-button"
                                  onClick={() => handleSingleRestoreHidden(game)}
                                  disabled={hiddenBusy}
                                  title="Unhide and restore to main library"
                                >
                                  <Eye size={12} />
                                  <span>Restore</span>
                                </button>
                                <button
                                  type="button"
                                  className="outline-button small-button"
                                  style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                  onClick={() => handleSingleDeleteHidden(game)}
                                  disabled={hiddenBusy}
                                  title="Delete record from database"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="hidden-empty" style={{ padding: '36px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <Search size={24} style={{ opacity: 0.5 }} />
                        <span style={{ fontSize: '13px' }}>No hidden entries match "{hiddenSearchQuery}"</span>
                        <button
                          type="button"
                          className="outline-button small-button"
                          style={{ marginTop: '4px' }}
                          onClick={() => setHiddenSearchQuery('')}
                        >
                          Clear filter
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="hidden-empty" style={{ padding: '36px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                      <EyeOff size={28} style={{ opacity: 0.6 }} />
                      <span style={{ fontSize: '13px' }}>No hidden library entries. All detected games and tools are currently visible.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 9: ABOUT LOGPILE */}
            {activeTab === 'about' && (
              <div className="settings-tab-pane">
                {/* Header Profile Card */}
                <div className="settings-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Logpile Desktop</h3>
                        <span className="settings-version-tag">v1.3.5</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                        An offline-first, private personal game sanctuary &amp; library manager.
                      </p>
                    </div>
                    <a
                      href="https://github.com/ritesh-soni-logpile/logpile/releases"
                      target="_blank"
                      rel="noreferrer"
                      className="outline-button small-button"
                      style={{ height: '32px', padding: '0 12px', gap: '6px' }}
                    >
                      <span>Check for updates</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>

                {/* Support Independent Development */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Heart size={16} style={{ color: 'var(--accent, #d6ff4b)' }} />
                      <div>
                        <strong className="settings-card-title">Support Independent Development</strong>
                        <small className="settings-card-subtitle">Zero ads, zero telemetry, 100% offline-first software</small>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Logpile is free, open source, and built for players who want to own their gaming data without launcher bloat. If it helps organize your collection, consider supporting independent development.
                  </p>

                  <div className="settings-support-grid">
                    <a
                      href="https://ko-fi.com/corporateintrovertgamer"
                      target="_blank"
                      rel="noreferrer"
                      className="settings-support-tile"
                    >
                      <div className="settings-support-icon">
                        <Coffee size={18} />
                      </div>
                      <div>
                        <strong>Ko-fi</strong>
                        <small>Tip or buy a coffee</small>
                      </div>
                      <ExternalLink size={13} className="settings-support-arrow" />
                    </a>

                    <a
                      href="https://buymeacoffee.com/Corporateintrovertgamer"
                      target="_blank"
                      rel="noreferrer"
                      className="settings-support-tile"
                    >
                      <div className="settings-support-icon">
                        <CupSoda size={18} />
                      </div>
                      <div>
                        <strong>Buy Me a Coffee</strong>
                        <small>One-time contribution</small>
                      </div>
                      <ExternalLink size={13} className="settings-support-arrow" />
                    </a>

                    <a
                      href="https://github.com/corporateintrovertgamer"
                      target="_blank"
                      rel="noreferrer"
                      className="settings-support-tile"
                    >
                      <div className="settings-support-icon">
                        <Github size={18} />
                      </div>
                      <div>
                        <strong>GitHub Sponsors</strong>
                        <small>Sponsor on GitHub</small>
                      </div>
                      <ExternalLink size={13} className="settings-support-arrow" />
                    </a>
                  </div>

                  {/* Crypto Donations */}
                  <div style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                      Crypto Donations
                    </span>
                    <div className="settings-grid-2">
                      {cryptoWallets.map((wallet) => {
                        const isCopied = copiedKey === wallet.key
                        return (
                          <div key={wallet.key} className="settings-crypto-tile">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{wallet.name}</span>
                              <span className="settings-crypto-badge">{wallet.symbol}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <code className="settings-crypto-code">{wallet.address}</code>
                              <button
                                type="button"
                                onClick={() => handleCopyWallet(wallet.key, wallet.address)}
                                className="outline-button small-button"
                                style={{ height: '24px', padding: '0 8px', fontSize: '10px' }}
                                title="Copy address"
                              >
                                {isCopied ? <CheckCheck size={11} style={{ color: 'var(--accent, #d6ff4b)' }} /> : <Copy size={11} />}
                                <span>{isCopied ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Legal & Privacy Disclaimer */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={16} style={{ color: 'var(--accent, #d6ff4b)' }} />
                      <div>
                        <strong className="settings-card-title">Legal Disclaimer &amp; Privacy Commitment</strong>
                        <small className="settings-card-subtitle">Zero data harvesting, zero tracking, local ownership</small>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 8px' }}>
                    Logpile is an offline-first library manager designed to organize legally acquired local applications. <strong>Logpile does not provide, distribute, or host game files, and does not condone piracy.</strong>
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Internet connectivity is strictly opt-in and restricted to fetching visual artwork and metadata from public APIs (IGDB and SteamGridDB) using personal API keys. Logpile transmits zero telemetry or behavioral data to external servers.
                  </p>
                </div>

                {/* Open Source Credits & License */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <strong className="settings-card-title">Creator &amp; Open Source License</strong>
                      <small className="settings-card-subtitle">Free &amp; Open Source Software under the MIT License</small>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)' }}>
                        Created by <strong>Corporate Introvert Gamer</strong> (Ritesh Soni).
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Built with React, Vite, Electron, SQLite, and Tailwind CSS. Released under the MIT License.
                      </p>
                    </div>

                    <a
                      href="https://github.com/ritesh-soni-logpile/logpile"
                      target="_blank"
                      rel="noreferrer"
                      className="outline-button small-button"
                      style={{ gap: '6px' }}
                    >
                      <Github size={13} />
                      <span>GitHub Repository</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* 3-Way Model Intake Modal */}
      {modelIntakeModal.isOpen && modelIntakeModal.fileInfo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#0e121a',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bot size={20} style={{ color: 'var(--accent, #d6ff4b)' }} />
                <div>
                  <strong style={{ fontSize: '15px', color: '#fff', display: 'block' }}>Attach Local AI Model</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Choose how Logpile handles this GGUF file</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModelIntakeModal({ isOpen: false, fileInfo: null, isProcessing: false, error: null })}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff' }}>
                {modelIntakeModal.fileInfo.fileName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Size: {formatBytes(modelIntakeModal.fileInfo.fileSizeBytes)} • Path: {modelIntakeModal.fileInfo.filePath}
              </div>
            </div>

            {modelIntakeModal.error && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '12px' }}>
                {modelIntakeModal.error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                disabled={modelIntakeModal.isProcessing}
                onClick={() => handleConfirmAttachModel('link')}
                className="settings-btn settings-btn-primary"
                style={{ textAlign: 'left', padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <strong style={{ fontSize: '12.5px' }}>1. Run from Selected Path (In-Place)</strong>
                  <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>Recommended</span>
                </div>
                <small style={{ fontSize: '11px', opacity: 0.85 }}>Leaves the file where it is. Fastest and requires zero duplicate disk space.</small>
              </button>

              <button
                type="button"
                disabled={modelIntakeModal.isProcessing}
                onClick={() => handleConfirmAttachModel('copy')}
                className="settings-btn"
                style={{ textAlign: 'left', padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                <strong style={{ fontSize: '12.5px', color: '#fff' }}>2. Copy to Logpile Resources</strong>
                <small style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Duplicates model into Logpile app directory while preserving your original file.</small>
              </button>

              <button
                type="button"
                disabled={modelIntakeModal.isProcessing}
                onClick={() => handleConfirmAttachModel('move')}
                className="settings-btn"
                style={{ textAlign: 'left', padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                <strong style={{ fontSize: '12.5px', color: '#fff' }}>3. Move to Logpile Resources</strong>
                <small style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Moves file into Logpile app directory, freeing up your Downloads folder.</small>
              </button>
            </div>

            {modelIntakeModal.isProcessing && (
              <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--accent, #d6ff4b)' }}>
                Attaching and preparing model weights...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

