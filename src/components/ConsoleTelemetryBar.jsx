import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Clock,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Zap,
  Gamepad2,
  Mouse,
  Monitor,
  Minimize2,
  Tv,
  Search,
  Star,
  PackageCheck,
  LayoutGrid,
  Dices,
  ArrowLeft,
  Sparkles,
  Settings,
  X,
} from 'lucide-react'
import { getDetectedHardwareLabel, GamepadGlyph } from './GamepadGlyph'

const CONSOLE_CATEGORIES = [
  {
    id: 'installed',
    icon: PackageCheck,
    labels: {
      kinetic: 'INSTALLED',
      competitive: 'INSTALLED',
      playful: 'Installed',
      atmospheric: 'Installed',
      cinematic: 'Installed',
      default: 'Installed',
    },
  },
  {
    id: 'favorites',
    icon: Star,
    labels: {
      kinetic: 'FAVORITES',
      competitive: 'FAVORITES',
      playful: 'Favorites',
      atmospheric: 'Favorites',
      cinematic: 'Favorites',
      default: 'Favorites',
    },
  },
  {
    id: 'all',
    icon: LayoutGrid,
    labels: {
      kinetic: 'ALL GAMES',
      competitive: 'ALL GAMES',
      playful: 'All Games',
      atmospheric: 'All Titles',
      cinematic: 'All Titles',
      default: 'All Games',
    },
  },
  {
    id: 'today',
    icon: Dices,
    labels: {
      kinetic: 'DAILY PICK',
      competitive: 'DAILY PICK',
      playful: 'Daily Pick',
      atmospheric: 'Daily Pick',
      cinematic: "Today's Pick",
      default: "Today's Pick",
    },
  },
  {
    id: 'search',
    icon: Search,
    labels: {
      kinetic: 'SEARCH',
      competitive: 'SEARCH',
      playful: 'Search',
      atmospheric: 'Search',
      cinematic: 'Search',
      default: 'Search',
    },
  },
  {
    id: 'ai_companion',
    icon: Sparkles,
    labels: {
      kinetic: 'AI ASSISTANT',
      competitive: 'AI ASSISTANT',
      playful: 'AI Assistant',
      atmospheric: 'AI Assistant',
      cinematic: 'AI Assistant',
      default: 'AI Assistant',
    },
  },
]

/**
 * ConsoleTelemetryBar
 * Permanent top telemetry ribbon for Logpile Big Picture Console Mode.
 * Features:
 * - Real-time 12-hour local clock (AM/PM)
 * - Smart Battery Detection: Auto-hidden on AC desktop PCs; visible on laptops & handhelds
 * - Active Hardware & Controller Badge
 * - Instant Return-to-Desktop action pill
 */
export function ConsoleTelemetryBar({
  layoutTheme = 'cinematic',
  connectedGamepad = '',
  gamepadGlyphStyle = 'auto',
  onExitBigPicture,
  themeLogo,
  isDetailView = false,
  activeGameTitle = '',
  currentView = 'installed',
  onViewChange,
  onOpenSearch,
  onOpenSettings,
  isAiDrawerOpen = false,
  hasFavorites = true,
  isAiAvailable = true,
  consoleModeShortcut = 'F11',
  allowEscExitConsole = false,
  isGamepadMode = false,
  searchQuery = '',
  onSearchQueryChange,
}) {
  const visibleCategories = useMemo(() => {
    return CONSOLE_CATEGORIES.filter((cat) => {
      if (cat.id === 'favorites' && !hasFavorites) return false
      if (cat.id === 'ai_companion' && !isAiAvailable) return false
      return true
    })
  }, [hasFavorites, isAiAvailable])
  // 1. Digital Clock (12h format AM/PM)
  const [timeStr, setTimeStr] = useState(() => formatTime(new Date(), layoutTheme))

  useEffect(() => {
    const updateTime = () => setTimeStr(formatTime(new Date(), layoutTheme))
    // Sync on the minute
    const interval = setInterval(updateTime, 10000)
    return () => clearInterval(interval)
  }, [layoutTheme])

  // 2. Smart Battery Detection
  const [batteryState, setBatteryState] = useState(null)

  useEffect(() => {
    let isMounted = true

    if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
      navigator.getBattery().then((battery) => {
        if (!isMounted) return

        const updateBattery = () => {
          // Detect AC desktop PC: Continuous AC power, 100% full, no discharge time
          const isAcDesktop =
            battery.charging === true &&
            (battery.chargingTime === 0 || battery.dischargingTime === Infinity) &&
            battery.level >= 0.99

          if (isAcDesktop) {
            // Keep completely hidden on desktop PCs per spec
            setBatteryState(null)
          } else {
            setBatteryState({
              level: Math.round(battery.level * 100),
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime,
            })
          }
        }

        updateBattery()
        battery.addEventListener('levelchange', updateBattery)
        battery.addEventListener('chargingchange', updateBattery)
      }).catch(() => {
        // Battery API unavailable or blocked; stay hidden
        setBatteryState(null)
      })
    }

    return () => {
      isMounted = false
    }
  }, [])

  // 3. Hardware label & controller recognition
  const hardwareLabel = useMemo(() => {
    if (connectedGamepad) {
      return getDetectedHardwareLabel(connectedGamepad)
    }
    return 'PC Controls (Mouse & Keys)'
  }, [connectedGamepad])

  // 4. Brand styling
  const brandTitle = useMemo(() => {
    if (layoutTheme === 'kinetic') return '// CONSOLE HUD //'
    if (layoutTheme === 'competitive') return 'TACTICAL CONSOLE'
    if (layoutTheme === 'playful') return 'Logpile Arcade'
    if (layoutTheme === 'atmospheric') return 'LOGPILE CONSOLE'
    return 'LOGPILE CINEMA'
  }, [layoutTheme])

  return (
    <header className="console-telemetry-bar" style={{ WebkitAppRegion: 'drag' }}>
      {/* Left: Console Brand & Context */}
      <div className="telemetry-brand-group" style={{ WebkitAppRegion: 'no-drag' }}>
        {themeLogo && (
          <img
            src={themeLogo}
            alt="Logpile"
            className="telemetry-logo"
            style={{ width: '20px', height: '20px', objectFit: 'contain' }}
          />
        )}
        <div className="telemetry-brand-text">
          <span className="telemetry-brand-title">{brandTitle}</span>
          {isDetailView && activeGameTitle ? (
            <span className="telemetry-brand-badge">// {activeGameTitle}</span>
          ) : null}
        </div>
      </div>

      {/* Center: Console Category Navigation Ribbon */}
      {!isDetailView ? (
        <nav className="console-category-nav" style={{ WebkitAppRegion: 'no-drag' }} aria-label="Console Categories">
          <div className="console-nav-bumper" title="Previous category (LB / [)">
            <GamepadGlyph button="LB" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
          </div>
          <div className="console-nav-tabs">
            {visibleCategories.map((cat) => {
              const hasActiveSearch = cat.id === 'search' && Boolean(searchQuery && searchQuery.trim())
              const isActive = cat.id === 'ai_companion' ? isAiDrawerOpen : (cat.id === 'search' ? hasActiveSearch : currentView === cat.id)
              const baseLabel = cat.labels[layoutTheme] || cat.labels.default
              const label = hasActiveSearch
                ? `${baseLabel}: ${searchQuery.trim().slice(0, 12)}${searchQuery.trim().length > 12 ? '…' : ''}`
                : baseLabel

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`console-category-tab ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    if (cat.id === 'search') {
                      onOpenSearch?.()
                    } else if (cat.id === 'ai_companion') {
                      onViewChange?.('ai_companion')
                    } else {
                      onViewChange?.(cat.id)
                    }
                  }}
                  title={hasActiveSearch ? `Searching "${searchQuery.trim()}" (Click to edit)` : label}
                >
                  <cat.icon size={13} className="console-tab-icon" />
                  <span className="console-tab-text">{label}</span>
                  {hasActiveSearch && (
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onSearchQueryChange?.('')
                      }}
                      title="Clear search"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        marginLeft: '4px',
                        opacity: 0.85,
                      }}
                    >
                      <X size={12} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="console-nav-bumper" title="Next category (RB / ])">
            <GamepadGlyph button="RB" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
          </div>
        </nav>
      ) : (
        <div className="console-detail-breadcrumb" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            type="button"
            className="console-breadcrumb-back"
            onClick={() => onViewChange?.('installed')}
            title="Return to Library (B / Esc)"
          >
            <GamepadGlyph button="B" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
            <span>Return to Library</span>
          </button>
          <span className="console-breadcrumb-sep">/</span>
          <span className="console-breadcrumb-title">{activeGameTitle}</span>
        </div>
      )}

      {/* Right: Permanent Telemetry Ribbon */}
      <div className="telemetry-ribbon" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Active Controller / Hardware Pill */}
        <div
          className={`telemetry-pill telemetry-hardware ${connectedGamepad ? 'has-controller' : 'is-pc'}`}
          title={connectedGamepad ? `Connected Gamepad: ${connectedGamepad}` : 'Mouse and Keyboard navigation active'}
        >
          {connectedGamepad ? (
            <Gamepad2 size={13} className="telemetry-pill-icon" />
          ) : (
            <Mouse size={13} className="telemetry-pill-icon" />
          )}
          <span className="telemetry-hardware-label">{hardwareLabel}</span>
        </div>

        {/* Smart Battery Pill (Laptops & Handhelds only) */}
        {batteryState !== null && (
          <div
            className={`telemetry-pill telemetry-battery ${
              batteryState.level <= 10
                ? 'is-critical'
                : batteryState.level <= 20
                ? 'is-low'
                : ''
            } ${batteryState.charging ? 'is-charging' : ''}`}
            title={`Battery: ${batteryState.level}% ${batteryState.charging ? '(Charging)' : '(On Battery)'}`}
          >
            {batteryState.charging ? (
              <Zap size={13} className="battery-icon charging-flash" />
            ) : batteryState.level <= 15 ? (
              <BatteryWarning size={13} className="battery-icon warning-pulse" />
            ) : (
              <Battery size={13} className="battery-icon" />
            )}
            <span className="battery-level-text">
              {layoutTheme === 'competitive'
                ? `SYS_BAT: ${batteryState.level}%`
                : `${batteryState.level}%`}
            </span>
          </div>
        )}

        {/* Digital Clock Pill */}
        <div className="telemetry-pill telemetry-clock" title="Current Local Time">
          <Clock size={13} className="telemetry-clock-icon" />
          <span className="telemetry-clock-text">{timeStr}</span>
        </div>

        {/* Console Settings & Theme Selector Pill */}
        <button
          type="button"
          className="telemetry-pill telemetry-settings-btn"
          onClick={onOpenSettings}
          title="Open Console Settings & Themes (Start / Menu)"
          aria-label="Settings"
        >
          <Settings size={13} className="telemetry-settings-icon" />
          <span className="telemetry-settings-text">Settings</span>
          <span className="telemetry-settings-glyph">
            <GamepadGlyph button="START" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
          </span>
        </button>

        {/* Return to Desktop Pill */}
        <button
          type="button"
          className="telemetry-pill telemetry-return-btn"
          onClick={onExitBigPicture}
          title={`Return to Desktop (${allowEscExitConsole ? 'Esc / ' : ''}${consoleModeShortcut || 'F11'}${connectedGamepad ? ' / Controller Xbox Button' : ''})`}
          aria-label="Return to Desktop"
        >
          <Minimize2 size={13} className="telemetry-return-icon" />
          <span className="telemetry-return-text">Return to Desktop</span>
          <kbd className="telemetry-return-kbd">{allowEscExitConsole ? 'Esc' : (consoleModeShortcut || 'F11')}</kbd>
        </button>
      </div>
    </header>
  )
}

function formatTime(date) {
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12 // 0 becomes 12
  const minuteStr = minutes < 10 ? `0${minutes}` : String(minutes)
  return `${hours}:${minuteStr} ${ampm}`
}
