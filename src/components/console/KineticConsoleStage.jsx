import React, { useMemo } from 'react'
import {
  Play,
  Download,
  Star,
  Info,
  Zap,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Flag,
} from 'lucide-react'
import { GamepadGlyph } from '../GamepadGlyph'

/**
 * KineticConsoleStage
 * Phase 4 — Motorsport Pit-Lane & Garage HUD (*Forza*, *NFS*, *Assetto*, *WRC* vibe).
 * - -8deg diagonal full-bleed artwork split with Electric Orange (#F97316) leading razor.
 * - Sharp 0px carbon telemetry rail on left + bounded 5-slot slanted Track Strip at bottom.
 * - Daily Pick: 5-Light Starting-Grid Countdown Gantry + 16:9 Track Monitor -> P1 Pole Position.
 */
export function KineticConsoleStage({
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
  todayStep = 0,
  todayTotalSteps = 18,
  candidateArtworkUrl = null,
  onSpinToday,
  onIndexChange,
  onLaunch,
  onSelect,
  onToggleFavorite,
  connectedGamepad = '',
  gamepadGlyphStyle = 'auto',
}) {
  // Bounded 5-slot wrap-around track strip centered on safeIndex (zero edge clipping)
  const trackSlots = useMemo(() => {
    if (isTodayPickMode || total === 0) return []
    const count = Math.min(5, total)
    const half = Math.floor(count / 2)
    return Array.from({ length: count }, (_, i) => {
      const offset = i - half
      const idx = (safeIndex + offset + total) % total
      return { offset, idx, game: games[idx] }
    })
  }, [isTodayPickMode, total, safeIndex, games])

  // Compute how many starting lights are lit (0-5) during spin
  const litLamps = useMemo(() => {
    if (!todayRolling) return todayWinner ? 5 : 0
    return Math.min(5, Math.max(1, Math.ceil((todayStep / Math.max(1, todayTotalSteps - 2)) * 5)))
  }, [todayRolling, todayWinner, todayStep, todayTotalSteps])

  return (
    <div className={`console-stage-root console-stage-kinetic ${isTodayPickMode ? 'is-today-stage' : ''}`}>
      {/* 1. Clean Dark Asphalt + Ambient Wash + Welded -8deg Diagonal Artwork */}
      <div className="console-kinetic-backdrop">
        <div className="console-kinetic-asphalt-bg" />

        {showFullScreenBackdrop && (
          <>
            <div
              key={`ambient-${backdropUrl}`}
              className="console-kinetic-art-ambient"
              style={{ backgroundImage: `url("${backdropUrl}")` }}
            />
            <div className="console-kinetic-art-wrap">
              <div
                key={backdropUrl}
                className="console-kinetic-art-img"
                style={{ backgroundImage: `url("${backdropUrl}")` }}
              />
              <div className="console-kinetic-art-vignette" />
            </div>
          </>
        )}

        {/* Quick 180ms Speed-Streak Flash on title shift */}
        <div
          key={`streak-${activeGame?.id || safeIndex}-${Boolean(todayWinner)}`}
          className="console-kinetic-speed-streak"
          aria-hidden="true"
        />
      </div>

      {/* 2. Pit-Lane Main Stage */}
      <div className={`console-kinetic-main ${isTodayPickMode && !todayWinner ? 'is-grid-mode' : ''}`}>
        {isTodayPickMode && !todayWinner ? (
          /* Daily Pick: 5-Light Starting-Grid Gantry + 16:9 Track Monitor */
          <div className={`console-kinetic-gantry ${todayRolling ? 'is-counting' : ''}`}>
            <div className="console-kinetic-lamps-bar" aria-label="Starting Grid Lights">
              {[0, 1, 2, 3, 4].map((lampIdx) => {
                const isLit = lampIdx < litLamps
                const isGreen = !todayRolling && Boolean(todayWinner)
                return (
                  <span
                    key={lampIdx}
                    className={`console-kinetic-lamp ${isGreen ? 'is-green' : isLit ? 'is-red' : ''}`}
                  />
                )
              })}
            </div>

            <div className="console-kinetic-grid-eyebrow">
              <Flag size={13} />
              <span>{todayRolling ? 'STARTING LIGHTS ACTIVE // SCANNING GRID' : 'GRID DRAW // POLE POSITION LOTTERY'}</span>
            </div>

            <div className="console-kinetic-monitor">
              {todayRolling && todayCandidate ? (
                candidateArtworkUrl ? (
                  <img
                    key={todayCandidate.id || todayCandidate.canonical_title}
                    src={candidateArtworkUrl}
                    alt={todayCandidate.canonical_title}
                    className="console-kinetic-monitor-img"
                  />
                ) : (
                  <div className="console-kinetic-monitor-idle">
                    <Zap size={38} />
                  </div>
                )
              ) : (
                <div className="console-kinetic-monitor-idle">
                  <Zap size={32} />
                  <span>READY ON STARTING GRID &bull; {games.length} CONTENDERS</span>
                </div>
              )}
            </div>

            <div className="console-kinetic-grid-info">
              <h1 className="console-kinetic-grid-title" title={todayRolling && todayCandidate ? todayCandidate.canonical_title : 'AWAITING LAUNCH LIGHTS'}>
                {todayRolling && todayCandidate ? todayCandidate.canonical_title : 'AWAITING LAUNCH LIGHTS'}
              </h1>
              <div className="console-kinetic-grid-sub">
                {todayRolling && todayCandidate
                  ? (todayCandidate.developer || todayCandidate.publisher || 'Grid Contender')
                  : 'Trigger Start Grid Draw to run 5-light pole position selection.'}
              </div>
            </div>

            <button
              type="button"
              className="console-kinetic-btn console-kinetic-btn-primary console-kinetic-grid-cta"
              onClick={onSpinToday}
              disabled={todayRolling}
            >
              <span className="console-kinetic-unskew">
                {!todayRolling && <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />}
                {todayRolling ? (
                  <>
                    <RefreshCw size={15} className="spin-icon" />
                    <span>COUNTING DOWN...</span>
                  </>
                ) : (
                  <>
                    <Flag size={15} />
                    <span>START GRID DRAW</span>
                  </>
                )}
              </span>
            </button>
          </div>
        ) : activeGame ? (
          /* Pit-Lane Telemetry Cockpit + Track Strip */
          <div className="console-kinetic-cockpit-wrap">
            <div className="console-kinetic-cockpit">
              <div className="console-kinetic-eyebrow">
                {isTodayPickMode ? (
                  <span className="console-kinetic-pole-badge">
                    <Flag size={12} />
                    <span>P1 POLE POSITION // GREEN LIGHTS</span>
                  </span>
                ) : (
                  <span className="console-kinetic-stage-badge">
                    <Zap size={12} />
                    <span>STAGE // {String(safeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
                  </span>
                )}
                <span className="console-kinetic-studio truncate">
                  {activeGame.developer || activeGame.publisher || 'GARAGE BUILD'}
                </span>
              </div>

              <h1 className="console-kinetic-title" title={activeGame.canonical_title}>
                {activeGame.canonical_title}
              </h1>

              {/* 0px Sharp 3-Cell Telemetry Strip */}
              <div className="console-kinetic-telemetry-grid">
                <div className="console-kinetic-cell">
                  <span className="cell-label">HRS_LOGGED</span>
                  <span className="cell-value">{playTimeStr}</span>
                </div>
                <div className="console-kinetic-cell">
                  <span className="cell-label">EST_RUN</span>
                  <span className="cell-value">{hltbStr || (genresList[0]?.toUpperCase() || 'ARCADE')}</span>
                </div>
                <div className="console-kinetic-cell">
                  <span className="cell-label">DRIVE_STATE</span>
                  <span className={`cell-value ${activeGame.is_installed ? 'is-ready' : 'is-install'}`}>
                    {activeGame.is_installed ? 'GARAGE READY' : 'PIT INSTALL'}
                  </span>
                </div>
              </div>

              {/* Skewed -8deg Action Triggers */}
              <div className="console-kinetic-actions">
                <button
                  type="button"
                  className={`console-kinetic-btn ${activeGame.is_installed ? 'console-kinetic-btn-primary' : 'console-kinetic-btn-install'}`}
                  onClick={() => onLaunch?.(activeGame)}
                  title={activeGame.is_installed ? 'Ignition (A)' : 'Pit Install via Store (A)'}
                >
                  <span className="console-kinetic-unskew">
                    <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                    {activeGame.is_installed ? (
                      <>
                        <Play size={15} fill="currentColor" />
                        <span>IGNITION</span>
                      </>
                    ) : (
                      <>
                        <Download size={15} />
                        <span>PIT INSTALL</span>
                      </>
                    )}
                  </span>
                </button>

                {isTodayPickMode ? (
                  <button
                    type="button"
                    className="console-kinetic-btn console-kinetic-btn-wire"
                    onClick={onSpinToday}
                    disabled={todayRolling}
                    title="Re-Grid (X)"
                  >
                    <span className="console-kinetic-unskew">
                      <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                      <Flag size={14} />
                      <span>RE-GRID</span>
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="console-kinetic-btn console-kinetic-btn-wire"
                    onClick={() => onSelect?.(activeGame)}
                    title="Telemetry Specs (X)"
                  >
                    <span className="console-kinetic-unskew">
                      <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                      <Info size={14} />
                      <span>TELEMETRY</span>
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  className={`console-kinetic-btn console-kinetic-btn-wire ${activeGame.is_favorite ? 'is-pinned' : ''}`}
                  onClick={() => {
                    if (isTodayPickMode) {
                      onSelect?.(activeGame, 'today')
                    } else {
                      onToggleFavorite?.(activeGame)
                    }
                  }}
                  title={isTodayPickMode ? 'Spec Sheet (Y)' : 'Pin Car (Y)'}
                >
                  <span className="console-kinetic-unskew">
                    <GamepadGlyph button="Y" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                    {isTodayPickMode ? <Info size={14} /> : <Star size={14} fill={activeGame.is_favorite ? 'currentColor' : 'none'} />}
                    <span>{isTodayPickMode ? 'SPEC SHEET' : (activeGame.is_favorite ? 'PINNED' : 'PIN CAR')}</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Bottom Bounded 5-Slot Track Timeline (Zero Edge Clipping) */}
            {!isTodayPickMode && total > 1 && (
              <div className="console-kinetic-track-bar" role="listbox" aria-label="Track Timeline">
                <button
                  type="button"
                  className="console-kinetic-track-arrow"
                  onClick={() => onIndexChange?.((safeIndex - 1 + total) % total)}
                  aria-label="Previous Stage"
                >
                  <span className="console-kinetic-unskew"><ChevronLeft size={14} /></span>
                </button>

                <div className="console-kinetic-track-slots">
                  {trackSlots.map(({ idx, game }) => {
                    const isActive = idx === safeIndex
                    return (
                      <button
                        key={`${idx}-${game.id}`}
                        type="button"
                        className={`console-kinetic-track-chip ${isActive ? 'is-active' : ''}`}
                        onClick={() => (isActive ? onLaunch?.(game) : onIndexChange?.(idx))}
                        title={game.canonical_title}
                      >
                        <span className="console-kinetic-unskew console-kinetic-chip-label">
                          {String(idx + 1).padStart(2, '0')} // {game.canonical_title}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  className="console-kinetic-track-arrow"
                  onClick={() => onIndexChange?.((safeIndex + 1) % total)}
                  aria-label="Next Stage"
                >
                  <span className="console-kinetic-unskew"><ChevronRight size={14} /></span>
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
