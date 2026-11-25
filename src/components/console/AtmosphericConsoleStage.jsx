import React, { useMemo } from 'react'
import {
  Play,
  Download,
  Star,
  Info,
  Clock,
  Trophy,
  Radio,
  Eye,
  ChevronUp,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'
import { GamepadGlyph } from '../GamepadGlyph'

/**
 * AtmosphericConsoleStage
 * Phase 3 — Survival Horror Save Room (*Silent Hill*, *Resident Evil* vibe).
 * - Moody desaturated 16:9 landscape artwork visible cleanly on the right/center stage
 *   behind drifting mist and a left shadow gradient.
 * - Sparse 5-row vertical Case-File Index on the left (Up/Down or Left/Right + Click).
 * - Whisper-quiet metadata & hairline ghost buttons on the right.
 * - Daily Pick: Analog Signal Receiver with 16:9 Signal Monitor while tuning,
 *   opening into the full Save Room Winner stage upon frequency lock.
 */
export function AtmosphericConsoleStage({
  games = [],
  safeIndex = 0,
  total = 0,
  activeGame = null,
  backdropUrl = null,
  showFullScreenBackdrop = false,
  playTimeStr = '',
  hltbStr = null,
  genresList = [],
  isTodayPickMode = false,
  todayWinner = null,
  todayRolling = false,
  todayCandidate = null,
  candidateArtworkUrl = null,
  onSpinToday,
  onIndexChange,
  onLaunch,
  onSelect,
  onToggleFavorite,
  connectedGamepad = '',
  gamepadGlyphStyle = 'auto',
}) {
  // Sliding 5-row vertical window so index 0 shows 5 populated rows cleanly
  const ledgerRows = useMemo(() => {
    if (isTodayPickMode || total === 0) return []
    const visibleCount = Math.min(5, total)
    const start = Math.max(0, Math.min(safeIndex - 2, total - visibleCount))
    return games.slice(start, start + visibleCount).map((game, i) => ({
      game,
      idx: start + i,
      dist: Math.abs(start + i - safeIndex),
    }))
  }, [isTodayPickMode, total, safeIndex, games])

  // Deterministic pseudo-frequency derived from current candidate title while tuning
  const liveFrequency = useMemo(() => {
    if (!todayRolling || !todayCandidate?.canonical_title) return '94.7 MHz'
    const seed = todayCandidate.canonical_title.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    return `${(88.1 + (seed % 197) / 10).toFixed(1)} MHz`
  }, [todayRolling, todayCandidate])

  return (
    <div className={`console-stage-root console-stage-atmospheric ${isTodayPickMode ? 'is-today-stage' : ''}`}>
      {/* 1. Moody 16:9 Landscape Artwork + Drifting Fog + Left Shadow Gradient */}
      <div className="console-atmo-backdrop">
        {showFullScreenBackdrop && (
          <div
            key={backdropUrl}
            className="console-atmo-backdrop-img"
            style={{ backgroundImage: `url("${backdropUrl}")` }}
          />
        )}
        <div className="console-atmo-fog" />
        <div className="console-atmo-vignette" />
      </div>

      {/* 2. Save Room Main Stage */}
      <div className={`console-atmo-main ${isTodayPickMode && !todayWinner ? 'is-signal-mode' : ''}`}>
        {isTodayPickMode && !todayWinner ? (
          /* Daily Pick: Analog Signal Receiver + 16:9 Signal Monitor */
          <div className={`console-atmo-radio-card ${todayRolling ? 'is-tuning' : ''}`}>
            <div className="console-atmo-radio-header">
              <Radio size={13} />
              <span>ANALOG SIGNAL RECEIVER</span>
              <span>&bull;</span>
              <span className="console-atmo-freq">{liveFrequency}</span>
            </div>

            {/* 16:9 Signal Monitor Window (never a blank grey box) */}
            <div className="console-atmo-monitor">
              {todayRolling && todayCandidate ? (
                candidateArtworkUrl ? (
                  <img
                    key={todayCandidate.id || todayCandidate.canonical_title}
                    src={candidateArtworkUrl}
                    alt={todayCandidate.canonical_title}
                    className="console-atmo-monitor-img"
                  />
                ) : (
                  <div className="console-atmo-monitor-empty">
                    <Radio size={36} />
                  </div>
                )
              ) : (
                <div className="console-atmo-monitor-idle">
                  <div className="console-atmo-bars" aria-hidden="true">
                    <span /><span /><span /><span /><span /><span /><span />
                  </div>
                  <span>AWAITING FREQUENCY LOCK</span>
                </div>
              )}
              <div className="console-atmo-scanlines" aria-hidden="true" />
            </div>

            <div className="console-atmo-radio-info">
              <h1 className="console-atmo-radio-title" title={todayRolling && todayCandidate ? todayCandidate.canonical_title : 'Signal Unresolved'}>
                {todayRolling && todayCandidate ? todayCandidate.canonical_title : 'Signal Unresolved'}
              </h1>
              <div className="console-atmo-radio-sub">
                {todayRolling && todayCandidate
                  ? (todayCandidate.developer || todayCandidate.publisher || 'Scanning archive signal...')
                  : `${games.length} local files awaiting frequency lock`}
              </div>
            </div>

            <button
              type="button"
              className="console-atmo-btn console-atmo-btn-primary"
              onClick={onSpinToday}
              disabled={todayRolling}
            >
              {!todayRolling && <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />}
              {todayRolling ? (
                <>
                  <RefreshCw size={15} className="spin-icon" />
                  <span>SCANNING...</span>
                </>
              ) : (
                <>
                  <Radio size={15} />
                  <span>TUNE SIGNAL</span>
                </>
              )}
            </button>
          </div>
        ) : activeGame ? (
          /* Save Room Library View & Locked Winner Reveal */
          <div className="console-atmo-split">
            {/* Left Column: Sparse 5-Row Vertical Case-File Index (Library Only) */}
            {!isTodayPickMode ? (
              <aside className="console-atmo-ledger" aria-label="Save Room Case Index">
                <div className="console-atmo-ledger-nav">
                  <button
                    type="button"
                    className="console-atmo-step-btn"
                    onClick={() => onIndexChange?.(Math.max(0, safeIndex - 1))}
                    disabled={safeIndex <= 0}
                    aria-label="Previous File"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <span>ARCHIVE LEDGER &bull; {String(safeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
                  <button
                    type="button"
                    className="console-atmo-step-btn"
                    onClick={() => onIndexChange?.(Math.min(total - 1, safeIndex + 1))}
                    disabled={safeIndex >= total - 1}
                    aria-label="Next File"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div className="console-atmo-ledger-rows">
                  {ledgerRows.map(({ game, idx, dist }) => {
                    const isActive = idx === safeIndex
                    return (
                      <button
                        key={game.id || idx}
                        type="button"
                        className={`console-atmo-row dist-${dist} ${isActive ? 'is-active' : ''}`}
                        onClick={() => (isActive ? onLaunch?.(game) : onIndexChange?.(idx))}
                        title={game.canonical_title}
                      >
                        <span className="console-atmo-row-title truncate">
                          {isActive ? '▸ ' : ''}FILE {String(idx + 1).padStart(2, '0')} // {game.canonical_title}
                        </span>
                        {!game.is_installed && (
                          <span className="console-atmo-row-missing">[MISSING]</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </aside>
            ) : (
              <div className="console-atmo-ledger-spacer" />
            )}

            {/* Right Sanctuary Dossier & Quiet Ghost Buttons */}
            <section className="console-atmo-dossier">
              <div className="console-atmo-record-meta">
                {isTodayPickMode ? (
                  <span className="console-atmo-lock-badge">LOCKED &bull; 104.3 MHz</span>
                ) : (
                  <span>RECORD // {String(safeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
                )}
                <span>&bull;</span>
                <span className="truncate">{activeGame.developer || activeGame.publisher || 'UNKNOWN SOURCE'}</span>
              </div>

              <h1 className="console-atmo-title" title={activeGame.canonical_title}>
                {activeGame.canonical_title}
              </h1>

              <div className="console-atmo-tags">
                <span className={`console-atmo-tag ${!activeGame.is_installed ? 'is-missing' : 'is-disk'}`}>
                  <Clock size={12} />
                  <span>{playTimeStr}</span>
                </span>
                {hltbStr && (
                  <span className="console-atmo-tag">
                    <Trophy size={12} />
                    <span>{hltbStr}</span>
                  </span>
                )}
                {genresList.slice(0, 2).map((genre, idx) => (
                  <span key={idx} className="console-atmo-tag">
                    {genre}
                  </span>
                ))}
              </div>

              <div className="console-atmo-actions">
                <button
                  type="button"
                  className={`console-atmo-btn ${activeGame.is_installed ? 'console-atmo-btn-primary' : 'console-atmo-btn-retrieve'}`}
                  onClick={() => onLaunch?.(activeGame)}
                  title={activeGame.is_installed ? 'Enter (A)' : 'Retrieve via Store (A)'}
                >
                  <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                  {activeGame.is_installed ? (
                    <>
                      <Play size={14} fill="currentColor" />
                      <span>ENTER</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>RETRIEVE</span>
                    </>
                  )}
                </button>

                {isTodayPickMode ? (
                  <button
                    type="button"
                    className="console-atmo-btn console-atmo-btn-ghost"
                    onClick={onSpinToday}
                    disabled={todayRolling}
                    title="Tune Again (X)"
                  >
                    <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                    <Radio size={14} />
                    <span>TUNE AGAIN</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="console-atmo-btn console-atmo-btn-ghost"
                    onClick={() => onSelect?.(activeGame)}
                    title="Inspect Case File (X)"
                  >
                    <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                    <Info size={14} />
                    <span>CASE FILE</span>
                  </button>
                )}

                <button
                  type="button"
                  className={`console-atmo-btn console-atmo-btn-ghost ${activeGame.is_favorite ? 'is-marked' : ''}`}
                  onClick={() => {
                    if (isTodayPickMode) {
                      onSelect?.(activeGame, 'today')
                    } else {
                      onToggleFavorite?.(activeGame)
                    }
                  }}
                  title={isTodayPickMode ? 'Inspect Case File (Y)' : 'Mark File (Y)'}
                >
                  <GamepadGlyph button="Y" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                  {isTodayPickMode ? <Eye size={14} /> : <Star size={14} fill={activeGame.is_favorite ? 'currentColor' : 'none'} />}
                  <span>{isTodayPickMode ? 'CASE FILE' : (activeGame.is_favorite ? 'MARKED' : 'MARK')}</span>
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
