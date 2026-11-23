import React, { useMemo } from 'react'
import { Search, X, CornerDownLeft, Space, Delete, Check } from 'lucide-react'
import { GamepadGlyph } from './GamepadGlyph'

export const KEYBOARD_LAYOUT = [
  // Row 0: Numbers
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  // Row 1: Top QWERTY
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  // Row 2: Home ASDF + hyphen
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '-'],
  // Row 3: Bottom ZXCV + symbols
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', ':', '/'],
  // Row 4: Action Bar
  [
    { id: 'SPACE', label: 'SPACE', icon: Space, widthClass: 'osk-key-space' },
    { id: 'BACKSPACE', label: 'BACKSPACE', icon: Delete, widthClass: 'osk-key-backspace' },
    { id: 'CLEAR', label: 'CLEAR', icon: X, widthClass: 'osk-key-clear' },
    { id: 'DONE', label: 'SEARCH / DONE', icon: Check, widthClass: 'osk-key-done' },
  ],
]

export function VirtualKeyboard({
  isOpen = false,
  value = '',
  onChange,
  onDone,
  onClose,
  activeRow = 1,
  activeCol = 0,
  matchCount = null,
  isGamepadMode = false,
  gamepadGlyphStyle = 'auto',
  connectedGamepad = '',
}) {
  if (!isOpen) return null

  const handleKeyPress = (keyItem) => {
    if (typeof keyItem === 'string') {
      onChange?.(value + keyItem)
      return
    }
    if (keyItem.id === 'SPACE') {
      onChange?.(value + ' ')
    } else if (keyItem.id === 'BACKSPACE') {
      onChange?.(value.slice(0, -1))
    } else if (keyItem.id === 'CLEAR') {
      onChange?.('')
    } else if (keyItem.id === 'DONE') {
      onDone?.()
    }
  }

  return (
    <div
      className="osk-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Virtual Couch Keyboard"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.()
        }
      }}
    >
      <div className="osk-container">
        {/* Live Search Input Header Display */}
        <div className="osk-input-display">
          <Search size={18} className="osk-input-icon" />
          <div className="osk-input-text-wrap">
            {value ? (
              <span className="osk-input-text">
                {value}
                <span className="osk-cursor">|</span>
              </span>
            ) : (
              <span className="osk-placeholder">
                Search games, franchises, or genres...
                <span className="osk-cursor">|</span>
              </span>
            )}
          </div>
          {matchCount !== null && (
            <span className="osk-match-badge">
              {matchCount} {matchCount === 1 ? 'title' : 'titles'} found
            </span>
          )}
          <button
            type="button"
            className="osk-close-btn"
            onClick={onClose}
            title="Close Keyboard (B / Circle)"
            aria-label="Close Keyboard"
          >
            <X size={16} />
          </button>
        </div>

        {/* Keyboard Matrix Grid */}
        <div className="osk-grid">
          {KEYBOARD_LAYOUT.map((row, rIdx) => (
            <div key={`row-${rIdx}`} className={`osk-row osk-row-${rIdx}`}>
              {row.map((keyItem, cIdx) => {
                const isFocused = isGamepadMode && activeRow === rIdx && activeCol === cIdx
                const isStringKey = typeof keyItem === 'string'
                const keyLabel = isStringKey ? keyItem : keyItem.label
                const KeyIcon = !isStringKey ? keyItem.icon : null
                const customClass = !isStringKey ? keyItem.widthClass : ''

                return (
                  <button
                    key={isStringKey ? keyItem : keyItem.id}
                    type="button"
                    className={`osk-key ${customClass} ${isFocused ? 'gamepad-focused osk-key-focused' : ''}`}
                    onClick={() => handleKeyPress(keyItem)}
                    tabIndex={-1}
                  >
                    {KeyIcon && <KeyIcon size={14} className="osk-key-icon" />}
                    <span>{keyLabel}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Console Shortcuts Footer */}
        <div className="osk-footer">
          <div className="osk-shortcuts">
            <span className="osk-shortcut-item">
              <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} /> Type Key
            </span>
            <span className="osk-shortcut-item">
              <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} /> Backspace
            </span>
            <span className="osk-shortcut-item">
              <GamepadGlyph button="Y" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} /> Space
            </span>
            <span className="osk-shortcut-item">
              <GamepadGlyph button="START" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} /> Done
            </span>
            <span className="osk-shortcut-item">
              <GamepadGlyph button="B" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} /> Close
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
