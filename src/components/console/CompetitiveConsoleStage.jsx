import React, { useMemo } from 'react'
import {
  Play,
  Download,
  Star,
  Info,
  Trophy,
  Crosshair,
  ChevronUp,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'
import { GamepadGlyph } from '../GamepadGlyph'

function getStoreTag(game) {
  const raw =
    game?.store_name ||
    game?.storeName ||
    game?.sources?.[0]?.sourceName ||
    game?.sources?.[0]?.source_name ||
    'LOCAL'
  return String(raw).replace(/games?/i, '').trim().toUpperCase().slice(0, 10) || 'LOCAL'
}

/**
 * CompetitiveConsoleStage
 * Phase 5 — Tactical Match Command Lobby (*PUBG*, *Valorant*, *Dota 2*, *Where Winds Meet* vibe).
 * - Zone 1: Left compact Roster Queue (6 visible slots, Up/Down + Left/Right wrap-around).
 * - Zone 2: Center open key-art spotlight framed with crimson tactical corner brackets.
 * - Zone 3: Bottom-right heavy crimson DEPLOY lock-in panel.
 * - Daily Pick: Matchmaking Queue Scanner with 16:9 radar sweep -> Match Found reveal.
 */
export function CompetitiveConsoleStage({
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
  // Sliding 6-row Roster Queue window
  const rosterRows = useMemo(() => {
    if (isTodayPickMode || total === 0) return []
    const visibleCount = Math.min(6, total)
    const start = Math.max(0, Math.min(safeIndex - 2, total - visibleCount))
    return games.slice(start, start + visibleCount).map((game, i) => ({
      game,
      idx: start + i,
    }))
  }, [isTodayPickMode, total, safeIndex, games])

  const activeStore = activeGame ? getStoreTag(activeGame) : 'LOCAL'

  return (
    <div className={`console-stage-root console-stage-competitive ${isTodayPickMode ? 'is-today-stage' : ''}`}>
      {/* 1. Matte Tactical Backdrop + Crimson Aura + Vignette */}
      <div className="console-comp-backdrop">
        {showFullScreenBackdrop && (
          <div
            key={backdropUrl}
            className="console-comp-backdrop-img"
            style={{ backgroundImage: `url("${backdropUrl}")` }}
          />
        )}
        <div className="console-comp-vignette" />
      </div>

      {/* 2. 3-Zone Command Lobby */}
      <div className={`console-comp-main ${isTodayPickMode && !todayWinner ? 'is-queue-mode' : ''}`}>
        {isTodayPickMode && !todayWinner ? (
          /* Daily Pick: Matchmaking Queue Scanner */
          <div className={`console-comp-scanner ${todayRolling ? 'is-searching' : ''}`}>
            <div className="console-comp-queue-eyebrow">
              <Crosshair size={13} />
              <span>{todayRolling ? 'MATCHMAKING QUEUE // SCANNING ROSTER' : 'MATCHMAKING QUEUE // RANDOM DEPLOY'}</span>
            </div>

            <div className="console-comp-monitor">
              {todayRolling && todayCandidate ? (
                candidateArtworkUrl ? (
                  <img
                    key={todayCandidate.id || todayCandidate.canonical_title}
                    src={candidateArtworkUrl}
                    alt={todayCandidate.canonical_title}
                    className="console-comp-monitor-img"
                  />
                ) : (
                  <div className="console-comp-monitor-idle">
                    <Trophy size={36} />
                  </div>
                )
              ) : (
                <div className="console-comp-monitor-idle">
                  <Crosshair size={30} />
                  <span>READY TO QUEUE &bull; {games.length} CONTENDERS</span>
                </div>
              )}
              {todayRolling && <div className="console-comp-sweep-bar" aria-hidden="true" />}
            </div>

            <div className="console-comp-queue-info">
              <h1 className="console-comp-queue-title" title={todayRolling && todayCandidate ? todayCandidate.canonical_title : 'LOBBY STANDBY'}>
                {todayRolling && todayCandidate ? todayCandidate.canonical_title : 'LOBBY STANDBY'}
              </h1>
              <div className="console-comp-queue-sub">
                {todayRolling && todayCandidate
                  ? `${todayCandidate.developer || todayCandidate.publisher || 'Contender'} • ${getStoreTag(todayCandidate)}`
                  : 'Initiate matchmaking scan to lock a random target.'}
              </div>
            </div>

            <button
              type="button"
              className="console-comp-deploy-btn console-comp-queue-cta"
              onClick={onSpinToday}
              disabled={todayRolling}
            >
              {!todayRolling && <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />}
              {todayRolling ? (
                <>
                  <RefreshCw size={15} className="spin-icon" />
                  <span>SEARCHING LOBBY...</span>
                </>
              ) : (
                <>
                  <Crosshair size={15} />
                  <span>FIND MATCH</span>
                </>
              )}
            </button>
          </div>
        ) : activeGame ? (
          /* Library Lobby & Match Found Winner View */
          <div className="console-comp-lobby">
            {/* ZONE 1: Left Compact Vertical Roster Queue (Library Only) */}
            {!isTodayPickMode ? (
              <aside className="console-comp-roster" aria-label="Roster Queue">
                <div className="console-comp-roster-head">
                  <button
                    type="button"
                    className="console-comp-step-btn"
                    onClick={() => onIndexChange?.((safeIndex - 1 + total) % total)}
                    aria-label="Previous Target"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <span className="console-comp-roster-label">
                    ROSTER QUEUE &bull; <strong>{String(safeIndex + 1).padStart(2, '0')}</strong>/{String(total).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    className="console-comp-step-btn"
                    onClick={() => onIndexChange?.((safeIndex + 1) % total)}
                    aria-label="Next Target"
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>

                <div className="console-comp-roster-list">
                  {rosterRows.map(({ game, idx }) => {
                    const isActive = idx === safeIndex
                    const store = getStoreTag(game)
                    return (
                      <button
                        key={game.id || idx}
                        type="button"
                        className={`console-comp-roster-row ${isActive ? 'is-active' : ''}`}
                        onClick={() => (isActive ? onLaunch?.(game) : onIndexChange?.(idx))}
                        title={game.canonical_title}
                      >
                        <div className="console-comp-row-left">
                          <span className={`console-comp-led ${game.is_installed ? 'is-ready' : 'is-pending'}`} />
                          <span className="console-comp-row-title truncate">{game.canonical_title}</span>
                        </div>
                        <span className="console-comp-row-store">{store}</span>
                      </button>
                    )
                  })}
                </div>
              </aside>
            ) : (
              <div className="console-comp-roster-spacer" />
            )}

            {/* ZONE 2 & 3: Center Reticle Spotlight + Bottom-Right Heavy DEPLOY Deck */}
            <div className="console-comp-deck-col">
              {/* Zone 2 Header & Tactical Reticle Corner Bracket */}
              <div className="console-comp-top-meta">
                <div className="console-comp-lobby-tag">
                  <span className={`console-comp-pill ${isTodayPickMode ? 'is-found' : ''}`}>
                    {isTodayPickMode ? 'MATCH FOUND // LOCKED IN' : 'MATCH LOBBY'}
                  </span>
                  <span className="console-comp-studio truncate">
                    {activeGame.developer || activeGame.publisher || 'TACTICAL SECTOR'}
                  </span>
                </div>
                <div className="console-comp-reticle-corner" aria-hidden="true" />
              </div>

              {/* Zone 3: Bottom-Right Crimson Deploy Command Panel */}
              <section className={`console-comp-deploy-panel ${isTodayPickMode ? 'is-found' : ''}`}>
                <div className="console-comp-panel-head">
                  <div className="console-comp-panel-title-wrap">
                    <span className={`console-comp-status-eyebrow ${activeGame.is_installed ? 'is-ready' : 'is-install'}`}>
                      {isTodayPickMode
                        ? 'TARGET ACQUIRED // READY TO DEPLOY'
                        : activeGame.is_installed
                        ? 'STATUS // COMBAT READY'
                        : 'STATUS // NOT ON DISK'}
                    </span>
                    <h1 className="console-comp-title" title={activeGame.canonical_title}>
                      {activeGame.canonical_title}
                    </h1>
                  </div>
                  <span className="console-comp-store-chip">{activeStore}</span>
                </div>

                <div className="console-comp-stats-line">
                  <span>{playTimeStr}</span>
                  <span>&bull;</span>
                  <span>{hltbStr || (genresList[0]?.toUpperCase() || 'COMPETITIVE')}</span>
                  {genresList[1] && (
                    <>
                      <span>&bull;</span>
                      <span>{genresList[1].toUpperCase()}</span>
                    </>
                  )}
                </div>

                <div className="console-comp-panel-actions">
                  <button
                    type="button"
                    className={`console-comp-deploy-btn ${!activeGame.is_installed ? 'is-install' : ''}`}
                    onClick={() => onLaunch?.(activeGame)}
                    title={activeGame.is_installed ? 'Deploy Now (A)' : 'Queue Install via Store (A)'}
                  >
                    <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                    {activeGame.is_installed ? (
                      <>
                        <Play size={15} fill="currentColor" />
                        <span>DEPLOY NOW</span>
                      </>
                    ) : (
                      <>
                        <Download size={15} />
                        <span>QUEUE INSTALL</span>
                      </>
                    )}
                  </button>

                  {isTodayPickMode ? (
                    <button
                      type="button"
                      className="console-comp-wire-btn"
                      onClick={onSpinToday}
                      disabled={todayRolling}
                      title="Re-Queue (X)"
                    >
                      <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                      <Crosshair size={14} />
                      <span>RE-QUEUE</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="console-comp-wire-btn"
                      onClick={() => onSelect?.(activeGame)}
                      title="Intel & Details (X)"
                    >
                      <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                      <Info size={14} />
                      <span>INTEL</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={`console-comp-wire-btn ${activeGame.is_favorite ? 'is-pinned' : ''}`}
                    onClick={() => {
                      if (isTodayPickMode) {
                        onSelect?.(activeGame, 'today')
                      } else {
                        onToggleFavorite?.(activeGame)
                      }
                    }}
                    title={isTodayPickMode ? 'Dossier (Y)' : 'Squad Pin (Y)'}
                  >
                    <GamepadGlyph button="Y" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                    {isTodayPickMode ? <Info size={14} /> : <Star size={14} fill={activeGame.is_favorite ? 'currentColor' : 'none'} />}
                    <span>{isTodayPickMode ? 'DOSSIER' : (activeGame.is_favorite ? 'PINNED' : 'PIN')}</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
