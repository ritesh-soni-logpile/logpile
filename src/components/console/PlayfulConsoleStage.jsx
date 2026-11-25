import React, { useMemo } from 'react'
import {
  Play,
  Download,
  Star,
  Info,
  Clock,
  Trophy,
  Sparkles,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Gift,
} from 'lucide-react'
import { GamepadGlyph } from '../GamepadGlyph'
import { normalizeArtworkUrl } from '../../utils/artworkUrl'

/**
 * PlayfulConsoleStage
 * Phase 2 — Cozy Couch Arcade (3-Slot Wrap-Around 16:9 Wide Tile Carousel).
 * - Crisp 16:9 landscape artwork in rounded foreground tiles (no art badges blocking logos).
 * - Clean dotted charcoal toybox canvas (no blurry grey haze behind tiles).
 * - Floating Daily Pick Capsule matching the open stage with single-line meta.
 */
export function PlayfulConsoleStage({
  games = [],
  safeIndex = 0,
  total = 0,
  activeGame = null,
  backdropUrl = null,
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
  // 3-slot wrap-around 16:9 tiles (Prev, Center, Next) so left edge is never blank on game 01
  const carouselSlots = useMemo(() => {
    if (isTodayPickMode || total === 0) return []
    if (total === 1) return [{ offset: 0, idx: 0, game: games[0] }]
    if (total === 2) {
      return [
        { offset: -1, idx: -1, game: null },
        { offset: 0, idx: safeIndex, game: games[safeIndex] },
        { offset: 1, idx: (safeIndex + 1) % 2, game: games[(safeIndex + 1) % 2] },
      ]
    }
    return [-1, 0, 1].map((offset) => {
      const idx = (safeIndex + offset + total) % total
      return { offset, idx, game: games[idx] }
    })
  }, [isTodayPickMode, total, safeIndex, games])

  return (
    <div className={`console-stage-root console-stage-playful ${isTodayPickMode ? 'is-today-stage' : ''}`}>
      {/* 1. Clean Toybox Dotted Charcoal Backdrop (No muddy grey blur) */}
      <div className="console-playful-backdrop">
        <div className="console-playful-dots" />
        <div className="console-playful-ambient-wash" />
      </div>

      {/* 2. Main Open Stage */}
      <div className={`console-playful-main ${isTodayPickMode && !todayWinner ? 'is-capsule-mode' : ''}`}>
        {isTodayPickMode && !todayWinner ? (
          /* Daily Pick: Floating Surprise Capsule (No modal card, single-line meta, single spinner) */
          <div className={`console-playful-capsule-float ${todayRolling ? 'is-spinning' : ''}`}>
            {todayRolling && todayCandidate ? (
              <div className="console-playful-capsule-reel">
                <div className="console-playful-tile is-center is-capsule-spin">
                  {candidateArtworkUrl ? (
                    <img
                      key={todayCandidate.id || todayCandidate.canonical_title}
                      src={candidateArtworkUrl}
                      alt={todayCandidate.canonical_title}
                      className="console-playful-tile-img"
                    />
                  ) : (
                    <div className="console-playful-tile-fallback">
                      <Gamepad2 size={48} />
                    </div>
                  )}
                </div>
                <h1 className="console-playful-capsule-title">{todayCandidate.canonical_title}</h1>
                <div className="console-playful-capsule-sub">
                  {todayCandidate.developer || todayCandidate.publisher || 'Couch Arcade'}
                </div>
              </div>
            ) : (
              <>
                <div className="console-playful-capsule-emblem">
                  <Gift size={44} />
                </div>
                <div className="console-playful-pill-badge">
                  <Sparkles size={12} />
                  <span>SURPRISE COUCH PICK</span>
                </div>
                <h1 className="console-playful-capsule-title">Mystery Game Capsule</h1>
                <p className="console-playful-capsule-desc">
                  Pop open a surprise pick from the {games.length} installed games on your cozy arcade shelf.
                </p>
                <div className="console-playful-capsule-meta">
                  <span className="console-playful-meta-item">
                    <Trophy size={14} />
                    <span>{games.length} Installed Games</span>
                  </span>
                  <span className="console-playful-meta-dot">&bull;</span>
                  <span className="console-playful-meta-item">
                    <Gamepad2 size={14} />
                    <span>Local Couch Pick</span>
                  </span>
                </div>
              </>
            )}

            <button
              type="button"
              className="console-playful-btn console-playful-btn-primary console-playful-pop-btn"
              onClick={onSpinToday}
              disabled={todayRolling}
            >
              {!todayRolling && <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />}
              {todayRolling ? (
                <>
                  <RefreshCw size={17} className="spin-icon" />
                  <span>OPENING CAPSULE...</span>
                </>
              ) : (
                <>
                  <Gift size={17} />
                  <span>POP CAPSULE</span>
                </>
              )}
            </button>
          </div>
        ) : activeGame ? (
          /* Library & Capsule Winner View: Crisp 16:9 3-Tile Carousel + Centered Pill Controls */
          <div className="console-playful-toybox">
            {isTodayPickMode ? (
              /* Centered 16:9 Tile for Capsule Winner */
              <div className="console-playful-winner-wrap">
                <div className="console-playful-tile is-center is-winner">
                  {backdropUrl ? (
                    <img src={backdropUrl} alt={activeGame.canonical_title} className="console-playful-tile-img" />
                  ) : (
                    <div className="console-playful-tile-fallback">
                      <Gamepad2 size={52} />
                      <span>{activeGame.canonical_title}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Fixed 3-Slot Wrap-Around 16:9 Carousel (Zero Blank Left Side, Zero Clipping) */
              <div className="console-playful-tiles-row" role="listbox" aria-label="Playful Wide Tile Carousel">
                {carouselSlots.map(({ offset, idx, game }) => {
                  if (!game) {
                    return <div key={`empty-${offset}`} className="console-playful-tile-slot is-flank-slot is-placeholder" aria-hidden="true" />
                  }

                  const isCenter = offset === 0
                  const hero = game.hero_url ? normalizeArtworkUrl(game.hero_url) : null
                  const cover = game.cover_url ? normalizeArtworkUrl(game.cover_url) : null
                  const artUrl = hero || cover || null

                  return (
                    <div
                      key={`${offset}-${game.id || idx}`}
                      className={`console-playful-tile-slot ${isCenter ? 'is-center-slot' : 'is-flank-slot'}`}
                    >
                      <button
                        type="button"
                        className={`console-playful-tile ${isCenter ? 'is-center' : 'is-flank'}`}
                        onClick={() => (isCenter ? onLaunch?.(game) : onIndexChange?.(idx))}
                        title={game.canonical_title}
                      >
                        {artUrl ? (
                          <img src={artUrl} alt={game.canonical_title} className="console-playful-tile-img" />
                        ) : (
                          <div className="console-playful-tile-fallback">
                            <Gamepad2 size={isCenter ? 46 : 32} />
                            <span>{game.canonical_title}</span>
                          </div>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Centered Metadata & Bouncy Pill Controls */}
            <div className="console-playful-hud">
              <div className="console-playful-eyebrow">
                <span className="console-playful-pill-badge">
                  <Sparkles size={11} />
                  <span>{isTodayPickMode ? 'CAPSULE PICK' : `GAME ${String(safeIndex + 1).padStart(2, '0')} OF ${String(total).padStart(2, '0')}`}</span>
                </span>
                <span className="console-playful-studio truncate">
                  {activeGame.developer || activeGame.publisher || 'Indie Arcade'}
                </span>
              </div>

              <h1 className="console-playful-title" title={activeGame.canonical_title}>
                {activeGame.canonical_title}
              </h1>

              <div className="console-playful-tags">
                <span className={`console-playful-tag ${!activeGame.is_installed ? 'is-uninstalled' : 'is-status'}`}>
                  <Clock size={12} />
                  <span>{playTimeStr}</span>
                </span>
                {hltbStr && (
                  <span className="console-playful-tag is-hltb">
                    <Trophy size={12} />
                    <span>{hltbStr}</span>
                  </span>
                )}
                {genresList.map((genre, idx) => (
                  <span key={idx} className="console-playful-tag">
                    {genre}
                  </span>
                ))}
              </div>

              <div className="console-playful-actions">
                <button
                  type="button"
                  className={`console-playful-btn ${activeGame.is_installed ? 'console-playful-btn-primary' : 'console-playful-btn-install'}`}
                  onClick={() => onLaunch?.(activeGame)}
                  title={activeGame.is_installed ? 'Jump In (A)' : 'Download Game (A)'}
                >
                  <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                  {activeGame.is_installed ? (
                    <>
                      <Play size={16} fill="currentColor" />
                      <span>JUMP IN</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>DOWNLOAD</span>
                    </>
                  )}
                </button>

                {isTodayPickMode ? (
                  <button
                    type="button"
                    className="console-playful-btn console-playful-btn-secondary"
                    onClick={onSpinToday}
                    disabled={todayRolling}
                    title="Pop Another Capsule (X)"
                  >
                    <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                    <Gift size={15} />
                    <span>POP ANOTHER</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="console-playful-btn console-playful-btn-secondary"
                    onClick={() => onSelect?.(activeGame)}
                    title="Game Details (X)"
                  >
                    <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                    <Info size={15} />
                    <span>DETAILS</span>
                  </button>
                )}

                <button
                  type="button"
                  className={`console-playful-btn console-playful-btn-secondary ${activeGame.is_favorite ? 'is-fav' : ''}`}
                  onClick={() => {
                    if (isTodayPickMode) {
                      onSelect?.(activeGame, 'today')
                    } else {
                      onToggleFavorite?.(activeGame)
                    }
                  }}
                  title={isTodayPickMode ? 'Details (Y)' : 'Favorite (Y)'}
                >
                  <GamepadGlyph button="Y" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                  {isTodayPickMode ? <Info size={15} /> : <Star size={15} fill={activeGame.is_favorite ? 'currentColor' : 'none'} />}
                  <span>{isTodayPickMode ? 'DETAILS' : (activeGame.is_favorite ? 'FAVORITED' : 'FAVORITE')}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 3. Clean Bottom Stepper Pill */}
      {!isTodayPickMode && total > 1 && (
        <div className="console-playful-bottom-bar">
          <div className="console-playful-stepper">
            <button
              type="button"
              className="console-playful-stepper-btn"
              onClick={() => onIndexChange?.((safeIndex - 1 + total) % total)}
              aria-label="Previous Game"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="console-playful-stepper-text">
              <strong>{String(safeIndex + 1).padStart(2, '0')}</strong> OF <strong>{String(total).padStart(2, '0')}</strong> &bull; GLIDE LEFT / RIGHT OR CLICK A TILE
            </span>
            <button
              type="button"
              className="console-playful-stepper-btn"
              onClick={() => onIndexChange?.((safeIndex + 1) % total)}
              aria-label="Next Game"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
