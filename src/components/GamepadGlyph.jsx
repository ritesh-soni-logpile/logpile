import React, { useMemo } from 'react'

/**
 * Resolves the active controller glyph style:
 * - If preference is explicitly 'xbox', 'playstation', or 'nintendo', that preference is honored.
 * - If 'auto', inspects connectedGamepad name to dynamically match hardware:
 *     - PlayStation DualSense, DualShock, PS4, PS5, Sony
 *     - Nintendo Switch, Joy-Con, Pro Controller
 *     - Xbox Wireless, Xbox One, Xbox 360, DirectInput, default
 */
export function getResolvedGlyphStyle(preference = 'auto', connectedGamepad = '') {
  if (preference && preference !== 'auto') {
    return preference
  }
  const name = String(connectedGamepad || '').toLowerCase()
  if (/dual.*sense|dual.*shock|playstation|ps[345]|sony/i.test(name)) {
    return 'playstation'
  }
  if (/nintendo|switch|joy-con|pro controller/i.test(name)) {
    return 'nintendo'
  }
  return 'xbox'
}

/**
 * Returns human-readable controller hardware name for UI displays
 */
export function getDetectedHardwareLabel(connectedGamepad = '') {
  const name = String(connectedGamepad || '').toLowerCase()
  if (/dual.*sense|ps5/i.test(name)) return 'PlayStation 5 DualSense'
  if (/dual.*shock|ps4/i.test(name)) return 'PlayStation 4 DualShock'
  if (/playstation|sony/i.test(name)) return 'PlayStation Controller'
  if (/switch|joy-con|pro controller/i.test(name)) return 'Nintendo Switch Pro Controller'
  if (/xbox.*series|xbox.*one/i.test(name)) return 'Xbox Wireless Controller'
  if (/xbox/i.test(name)) return 'Xbox Controller'
  if (connectedGamepad) return connectedGamepad
  return 'Standard Xbox / PC Controller'
}

/**
 * GamepadGlyph Component
 * Renders authentic, high-contrast, console-grade vector and badge glyphs
 * for Xbox, PlayStation (✕, ○, ▢, △), and Nintendo Switch.
 */
export function GamepadGlyph({
  button = 'A',
  glyphStyle = 'auto',
  connectedGamepad = '',
  className = '',
}) {
  const resolved = useMemo(
    () => getResolvedGlyphStyle(glyphStyle, connectedGamepad),
    [glyphStyle, connectedGamepad]
  )

  const normalized = String(button || '').toUpperCase().trim()

  // 1. PlayStation Layout & Symbols
  if (resolved === 'playstation') {
    if (normalized === 'A') {
      return (
        <span
          className={`gamepad-key-badge badge-ps-cross ${className}`}
          title="PlayStation Cross (Select / Launch)"
          aria-label="Cross button"
        >
          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
            <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
          </svg>
        </span>
      )
    }
    if (normalized === 'B') {
      return (
        <span
          className={`gamepad-key-badge badge-ps-circle ${className}`}
          title="PlayStation Circle (Back / Dismiss)"
          aria-label="Circle button"
        >
          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="8" cy="8" r="4.8" />
          </svg>
        </span>
      )
    }
    if (normalized === 'X') {
      return (
        <span
          className={`gamepad-key-badge badge-ps-square ${className}`}
          title="PlayStation Square (Action / Cycle Status)"
          aria-label="Square button"
        >
          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" />
          </svg>
        </span>
      )
    }
    if (normalized === 'Y') {
      return (
        <span
          className={`gamepad-key-badge badge-ps-triangle ${className}`}
          title="PlayStation Triangle (Favorite / Menu)"
          aria-label="Triangle button"
        >
          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
            <polygon points="8,3.2 13.5,12.8 2.5,12.8" />
          </svg>
        </span>
      )
    }
    if (normalized === 'LB') return <span className={`gamepad-key-badge badge-bumper ${className}`}>L1</span>
    if (normalized === 'RB') return <span className={`gamepad-key-badge badge-bumper ${className}`}>R1</span>
    if (normalized === 'LB/RB') return <span className={`gamepad-key-badge badge-bumper ${className}`}>L1/R1</span>
    if (normalized === 'LT') return <span className={`gamepad-key-badge badge-bumper ${className}`}>L2</span>
    if (normalized === 'RT') return <span className={`gamepad-key-badge badge-bumper ${className}`}>R2</span>
    if (normalized === 'LT/RT') return <span className={`gamepad-key-badge badge-bumper ${className}`}>L2/R2</span>
    if (normalized === 'L3') return <span className={`gamepad-key-badge badge-bumper ${className}`}>L3</span>
    if (normalized === 'R3') return <span className={`gamepad-key-badge badge-r3 ${className}`}>R3</span>
    if (normalized === 'START') return <span className={`gamepad-key-badge badge-bumper ${className}`}>Options</span>
    if (normalized === 'SELECT') return <span className={`gamepad-key-badge badge-bumper ${className}`}>Share</span>
  }

  // 2. Nintendo Switch Layout & Symbols
  if (resolved === 'nintendo') {
    if (normalized === 'A') {
      return (
        <span
          className={`gamepad-key-badge badge-switch-a ${className}`}
          title="Nintendo A (Confirm / Select)"
          aria-label="A button"
        >
          A
        </span>
      )
    }
    if (normalized === 'B') {
      return (
        <span
          className={`gamepad-key-badge badge-switch-b ${className}`}
          title="Nintendo B (Cancel / Back)"
          aria-label="B button"
        >
          B
        </span>
      )
    }
    if (normalized === 'X') {
      return (
        <span
          className={`gamepad-key-badge badge-switch-x ${className}`}
          title="Nintendo X (Action)"
          aria-label="X button"
        >
          X
        </span>
      )
    }
    if (normalized === 'Y') {
      return (
        <span
          className={`gamepad-key-badge badge-switch-y ${className}`}
          title="Nintendo Y (Favorite)"
          aria-label="Y button"
        >
          Y
        </span>
      )
    }
    if (normalized === 'LB') return <span className={`gamepad-key-badge badge-bumper ${className}`}>L</span>
    if (normalized === 'RB') return <span className={`gamepad-key-badge badge-bumper ${className}`}>R</span>
    if (normalized === 'LB/RB') return <span className={`gamepad-key-badge badge-bumper ${className}`}>L/R</span>
    if (normalized === 'LT') return <span className={`gamepad-key-badge badge-bumper ${className}`}>ZL</span>
    if (normalized === 'RT') return <span className={`gamepad-key-badge badge-bumper ${className}`}>ZR</span>
    if (normalized === 'LT/RT') return <span className={`gamepad-key-badge badge-bumper ${className}`}>ZL/ZR</span>
    if (normalized === 'L3') return <span className={`gamepad-key-badge badge-bumper ${className}`}>L-Stick</span>
    if (normalized === 'R3') return <span className={`gamepad-key-badge badge-r3 ${className}`}>R-Stick</span>
    if (normalized === 'START') return <span className={`gamepad-key-badge badge-bumper ${className}`}>+</span>
    if (normalized === 'SELECT') return <span className={`gamepad-key-badge badge-bumper ${className}`}>-</span>
  }

  // 3. Default: Xbox Style & DirectInput
  if (normalized === 'A') return <span className={`gamepad-key-badge badge-a ${className}`}>A</span>
  if (normalized === 'B') return <span className={`gamepad-key-badge badge-b ${className}`}>B</span>
  if (normalized === 'X') return <span className={`gamepad-key-badge badge-x ${className}`}>X</span>
  if (normalized === 'Y') return <span className={`gamepad-key-badge badge-y ${className}`}>Y</span>
  if (normalized === 'LB') return <span className={`gamepad-key-badge badge-bumper ${className}`}>LB</span>
  if (normalized === 'RB') return <span className={`gamepad-key-badge badge-bumper ${className}`}>RB</span>
  if (normalized === 'LB/RB') return <span className={`gamepad-key-badge badge-bumper ${className}`}>LB/RB</span>
  if (normalized === 'LT') return <span className={`gamepad-key-badge badge-bumper ${className}`}>LT</span>
  if (normalized === 'RT') return <span className={`gamepad-key-badge badge-bumper ${className}`}>RT</span>
  if (normalized === 'LT/RT') return <span className={`gamepad-key-badge badge-bumper ${className}`}>LT/RT</span>
  if (normalized === 'L3') return <span className={`gamepad-key-badge badge-bumper ${className}`}>LS</span>
  if (normalized === 'R3') return <span className={`gamepad-key-badge badge-r3 ${className}`}>RS</span>
  if (normalized === 'START') return <span className={`gamepad-key-badge badge-bumper ${className}`}>Menu</span>
  if (normalized === 'SELECT') return <span className={`gamepad-key-badge badge-bumper ${className}`}>View</span>

  // Fallback for custom labels (e.g. "D-Pad", "Left Stick")
  return <span className={`gamepad-key-badge badge-bumper ${className}`}>{button}</span>
}
