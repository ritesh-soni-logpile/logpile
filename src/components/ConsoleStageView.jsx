import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Play,
  Download,
  Star,
  Info,
  Clock,
  Trophy,
  Film,
  Sparkles,
  Gamepad2,
  Radio,
  Zap,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  Dices,
  RefreshCw,
} from 'lucide-react'
import { GamepadGlyph } from './GamepadGlyph'
import { normalizeArtworkUrl } from '../utils/artworkUrl'
import { PlayfulConsoleStage } from './console/PlayfulConsoleStage'
import { AtmosphericConsoleStage } from './console/AtmosphericConsoleStage'
import { KineticConsoleStage } from './console/KineticConsoleStage'
import { CompetitiveConsoleStage } from './console/CompetitiveConsoleStage'

/**
 * ConsoleStageView
 * 10-foot couch router & stage host for Logpile Big Picture Console Mode.
 * Dispatches completely distinct UI experiences per built-in theme:
 * - cinematic: Full-Bleed IMAX Hero + minimalist bottom glide ticker
 * - playful: Floating 5-Card Cozy Toybox Coverflow
 */
export function ConsoleStageView({
  games = [],
  focusedIndex = 0,
  onIndexChange,
  onLaunch,
  onSelect,
  onToggleFavorite,
  layoutTheme = 'cinematic',
  connectedGamepad = '',
  gamepadGlyphStyle = 'auto',
  isGamepadMode = false,
  isFocused = true,
  isTodayPickMode = false,
  onWinnerPick,
  spinTriggerRef = null,
}) {
  // Today's Pick State
  const [todayWinner, setTodayWinner] = useState(null)
  const [todayRolling, setTodayRolling] = useState(false)
  const [todayCandidate, setTodayCandidate] = useState(null)
  const [todayStep, setTodayStep] = useState(0)
  const todayTotalSteps = 18

  const handleSpinToday = useCallback(() => {
    if (todayRolling || games.length === 0) return
    setTodayRolling(true)
    setTodayWinner(null)
    setTodayStep(0)
    let step = 0
    const target = games[Math.floor(Math.random() * games.length)]

    const tick = () => {
      const randCand = games[Math.floor(Math.random() * games.length)]
      setTodayCandidate(step >= todayTotalSteps ? target : randCand)
      setTodayStep(step)

      if (step >= todayTotalSteps) {
        setTodayWinner(target)
        setTodayRolling(false)
        onWinnerPick?.(target)
        const targetIdx = games.findIndex((g) => g.id === target.id)
        if (targetIdx >= 0) onIndexChange?.(targetIdx)
        return
      }
      step += 1
      const delay = step < 10 ? 105 : 105 + (step - 10) * 40
      setTimeout(tick, delay)
    }
    tick()
  }, [todayRolling, games, onWinnerPick, onIndexChange])

  useEffect(() => {
    if (spinTriggerRef) {
      spinTriggerRef.current = {
        spin: handleSpinToday,
        winner: todayWinner,
        rolling: todayRolling,
      }
    }
  }, [spinTriggerRef, handleSpinToday, todayWinner, todayRolling])

  const total = games.length
  const safeIndex = total > 0 ? Math.min(Math.max(0, focusedIndex), total - 1) : 0

  const activeGame = useMemo(() => {
    if (isTodayPickMode) {
      if (todayWinner) return todayWinner
      if (todayCandidate) return todayCandidate
      return null
    }
    return games[safeIndex] || null
  }, [isTodayPickMode, todayWinner, todayCandidate, games, safeIndex])

  // Compute backdrop artwork with clean fallbacks
  const backdropUrl = useMemo(() => {
    if (!activeGame) return null
    const hero = activeGame.hero_url ? normalizeArtworkUrl(activeGame.hero_url) : null
    const cover = activeGame.cover_url ? normalizeArtworkUrl(activeGame.cover_url) : null
    return hero || cover || null
  }, [activeGame])

  // Show full-bleed background only for library browsing or after a Today's Pick winner lands
  const showFullScreenBackdrop = Boolean(backdropUrl) && !(isTodayPickMode && !todayWinner)

  const candidateArtworkUrl = useMemo(() => {
    if (!todayCandidate) return null
    const hero = todayCandidate.hero_url ? normalizeArtworkUrl(todayCandidate.hero_url) : null
    const cover = todayCandidate.cover_url ? normalizeArtworkUrl(todayCandidate.cover_url) : null
    return hero || cover || null
  }, [todayCandidate])

  // Format play time string
  const playTimeStr = useMemo(() => {
    if (!activeGame) return 'Unplayed'
    const minutes = Number(activeGame.play_time || activeGame.playtime_forever || 0)
    if (!minutes) {
      if (layoutTheme === 'playful') {
        return activeGame.is_installed ? 'Fresh Pick' : 'Ready to Install'
      }
      if (layoutTheme === 'atmospheric') {
        return activeGame.is_installed ? 'ON DISK • UNRECORDED' : 'AWAITING RETRIEVAL'
      }
      if (layoutTheme === 'kinetic') {
        return '0H 00M'
      }
      if (layoutTheme === 'competitive') {
        return '0H LOGGED'
      }
      return activeGame.is_installed ? 'Unplayed Premiere' : 'Ready to Download'
    }
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    const timePart = h > 0 ? `${h}h ${m}m played` : `${m}m played`
    if (layoutTheme === 'atmospheric') {
      return activeGame.is_installed ? `ON DISK • ${h > 0 ? `${h}H ${m}M` : `${m}M`}` : `AWAITING RETRIEVAL`
    }
    if (layoutTheme === 'kinetic') {
      return h > 0 ? `${h}H ${String(m).padStart(2, '0')}M` : `${m}M`
    }
    if (layoutTheme === 'competitive') {
      return h > 0 ? `${h}H LOGGED` : `${m}M LOGGED`
    }
    return timePart
  }, [activeGame, layoutTheme])

  const hltbStr = useMemo(() => {
    if (!activeGame) return null
    const hltb = activeGame.hltb_main || activeGame.hltb_story
    if (!hltb) return null
    if (layoutTheme === 'playful') return `${hltb}h Story`
    if (layoutTheme === 'atmospheric') return `${hltb}H MAIN`
    if (layoutTheme === 'kinetic') return `${hltb}H RUN`
    if (layoutTheme === 'competitive') return `${hltb}H MAIN`
    return `${hltb}h Main Story`
  }, [activeGame, layoutTheme])

  const genresList = useMemo(() => {
    if (!activeGame?.genres && !activeGame?.genre) return []
    return String(activeGame.genres || activeGame.genre)
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean)
      .slice(0, 3)
  }, [activeGame])

  if (total === 0) {
    return (
      <div className="console-empty-theater">
        <div className="console-empty-theater-icon">
          {layoutTheme === 'playful' ? (
            <Gamepad2 size={48} style={{ color: '#D6FF4B', opacity: 0.85 }} />
          ) : layoutTheme === 'atmospheric' ? (
            <Radio size={48} style={{ color: '#82939A', opacity: 0.85 }} />
          ) : layoutTheme === 'kinetic' ? (
            <Zap size={48} style={{ color: '#F97316', opacity: 0.85 }} />
          ) : layoutTheme === 'competitive' ? (
            <Crosshair size={48} style={{ color: '#EF4444', opacity: 0.85 }} />
          ) : (
            <Film size={48} style={{ color: 'var(--accent, #c6a56b)', opacity: 0.8 }} />
          )}
        </div>
        <h2>No Titles in This Category</h2>
        <p>Switch categories using LB / RB or return to desktop to scan titles.</p>
      </div>
    )
  }

  // THEME 5: COMPETITIVE (3-Zone Tactical Match Command Lobby)
  if (layoutTheme === 'competitive') {
    return (
      <CompetitiveConsoleStage
        games={games}
        safeIndex={safeIndex}
        total={total}
        activeGame={activeGame}
        backdropUrl={backdropUrl}
        showFullScreenBackdrop={showFullScreenBackdrop}
        playTimeStr={playTimeStr}
        hltbStr={hltbStr}
        genresList={genresList}
        isTodayPickMode={isTodayPickMode}
        todayWinner={todayWinner}
        todayRolling={todayRolling}
        todayCandidate={todayCandidate}
        candidateArtworkUrl={candidateArtworkUrl}
        onSpinToday={handleSpinToday}
        onIndexChange={onIndexChange}
        onLaunch={onLaunch}
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
        connectedGamepad={connectedGamepad}
        gamepadGlyphStyle={gamepadGlyphStyle}
      />
    )
  }

  // THEME 4: KINETIC (Motorsport Pit-Lane & Garage HUD)
  if (layoutTheme === 'kinetic') {
    return (
      <KineticConsoleStage
        games={games}
        safeIndex={safeIndex}
        total={total}
        activeGame={activeGame}
        backdropUrl={backdropUrl}
        showFullScreenBackdrop={showFullScreenBackdrop}
        playTimeStr={playTimeStr}
        hltbStr={hltbStr}
        genresList={genresList}
        isTodayPickMode={isTodayPickMode}
        todayWinner={todayWinner}
        todayRolling={todayRolling}
        todayCandidate={todayCandidate}
        todayStep={todayStep}
        todayTotalSteps={todayTotalSteps}
        candidateArtworkUrl={candidateArtworkUrl}
        onSpinToday={handleSpinToday}
        onIndexChange={onIndexChange}
        onLaunch={onLaunch}
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
        connectedGamepad={connectedGamepad}
        gamepadGlyphStyle={gamepadGlyphStyle}
      />
    )
  }

  // THEME 3: ATMOSPHERIC (Survival Horror Save Room)
  if (layoutTheme === 'atmospheric') {
    return (
      <AtmosphericConsoleStage
        games={games}
        safeIndex={safeIndex}
        total={total}
        activeGame={activeGame}
        backdropUrl={backdropUrl}
        showFullScreenBackdrop={showFullScreenBackdrop}
        playTimeStr={playTimeStr}
        hltbStr={hltbStr}
        genresList={genresList}
        isTodayPickMode={isTodayPickMode}
        todayWinner={todayWinner}
        todayRolling={todayRolling}
        todayCandidate={todayCandidate}
        candidateArtworkUrl={candidateArtworkUrl}
        onSpinToday={handleSpinToday}
        onIndexChange={onIndexChange}
        onLaunch={onLaunch}
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
        connectedGamepad={connectedGamepad}
        gamepadGlyphStyle={gamepadGlyphStyle}
      />
    )
  }

  // THEME 2: PLAYFUL (Crisp 16:9 Wide Arcade Tile Carousel)
  if (layoutTheme === 'playful') {
    return (
      <PlayfulConsoleStage
        games={games}
        safeIndex={safeIndex}
        total={total}
        activeGame={activeGame}
        backdropUrl={backdropUrl}
        showFullScreenBackdrop={showFullScreenBackdrop}
        playTimeStr={playTimeStr}
        hltbStr={hltbStr}
        genresList={genresList}
        isTodayPickMode={isTodayPickMode}
        todayWinner={todayWinner}
        todayRolling={todayRolling}
        todayCandidate={todayCandidate}
        candidateArtworkUrl={candidateArtworkUrl}
        onSpinToday={handleSpinToday}
        onIndexChange={onIndexChange}
        onLaunch={onLaunch}
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
        connectedGamepad={connectedGamepad}
        gamepadGlyphStyle={gamepadGlyphStyle}
      />
    )
  }

  // THEME 1: CINEMATIC (FULL-BLEED IMAX HERO - Default)
  return (
    <div className={`console-stage-root console-stage-imax console-stage-${layoutTheme} ${isTodayPickMode ? 'is-today-stage' : ''}`}>
      {/* 1. FULL-BLEED 100% SCREEN ARTWORK (IMAX Edge-to-Edge) */}
      <div className="console-imax-backdrop">
        {showFullScreenBackdrop && (
          <div
            key={backdropUrl}
            className="console-imax-backdrop-img"
            style={{ backgroundImage: `url("${backdropUrl}")` }}
          />
        )}

        {/* Cinematic Multi-Pass Atmospheric Lighting & Shading */}
        <div className="console-imax-gradient-top" />
        <div className="console-imax-gradient-left" />
        <div className="console-imax-gradient-bottom" />
        <div className="console-imax-projector-light" />
        <div className="console-imax-grain" />
      </div>

      {/* 2. THEATRICAL HERO CONTENT (Lower-Left for Games, Centered for Today's Pick Lottery) */}
      <div className={`console-imax-stage-content ${isTodayPickMode && !todayWinner ? 'is-today-lottery' : ''}`}>
        {isTodayPickMode && !todayWinner ? (
          /* Today's Pick Lottery Staging (Internal Reel Window during Spin) */
          <div className={`console-imax-lottery-card ${todayRolling ? 'is-spinning' : ''}`}>
            {todayRolling && todayCandidate ? (
              <div className="console-lottery-reel-window">
                <div className="console-lottery-reel-frame">
                  {candidateArtworkUrl ? (
                    <img
                      key={todayCandidate.id || todayCandidate.canonical_title}
                      src={candidateArtworkUrl}
                      alt={todayCandidate.canonical_title}
                      className="console-lottery-reel-img"
                    />
                  ) : (
                    <div className="console-lottery-reel-fallback">
                      <Film size={36} />
                    </div>
                  )}
                </div>
                <div className="console-imax-lottery-eyebrow">
                  <RefreshCw size={12} className="spin-icon" />
                  <span>SHUFFLING CONTENDERS</span>
                </div>
                <h1 className="console-lottery-reel-title" title={todayCandidate.canonical_title}>
                  {todayCandidate.canonical_title}
                </h1>
                <div className="console-lottery-reel-sub">
                  {todayCandidate.developer || todayCandidate.publisher || 'Installed Contender'}
                </div>
              </div>
            ) : (
              <>
                <div className="console-today-dice-icon">
                  <Dices size={52} className="text-gold" />
                </div>
                <div className="console-imax-lottery-eyebrow">
                  <Sparkles size={13} />
                  <span>TODAY'S SELECTION ROULETTE</span>
                </div>
                <h1 className="console-imax-lottery-title">Tonight's Premiere Feature</h1>
                <p className="console-imax-lottery-desc">
                  Spin the theatrical wheel to pick your next session from the {games.length} installed contenders on your drives.
                </p>
                <div className="console-imax-lottery-rule">
                  <span><Trophy size={13} /> {games.length} Installed Contenders</span>
                  <span className="dot">•</span>
                  <span><Sparkles size={13} /> 100% Local & Offline</span>
                </div>
              </>
            )}

            <button
              type="button"
              className="console-stage-btn console-stage-btn-launch console-imax-spin-btn"
              onClick={handleSpinToday}
              disabled={todayRolling}
            >
              {!todayRolling && <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />}
              {todayRolling ? (
                <>
                  <RefreshCw size={18} className="spin-icon" />
                  <span>PREMIERING...</span>
                </>
              ) : (
                <>
                  <Dices size={18} />
                  <span>SPIN THE WHEEL</span>
                </>
              )}
            </button>
          </div>
        ) : activeGame ? (
          /* Full-Bleed Game Feature Marquee */
          <div className="console-imax-marquee">
            {/* Eyebrow Plaque */}
            <div className="console-imax-eyebrow">
              <span className="console-imax-film-badge">
                {isTodayPickMode ? <Dices size={12} className="console-stage-film-icon" /> : <Film size={12} className="console-stage-film-icon" />}
                <span>{isTodayPickMode ? "TONIGHT'S GALA PREMIERE FEATURE" : "GRAND THEATER PREMIERE"}</span>
              </span>
              <span className="console-stage-divider" />
              <span className="console-imax-auditorium">
                {isTodayPickMode ? 'AUDITORIUM 01' : `REEL ${String(safeIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`}
              </span>
              <span className="console-stage-divider" />
              <span className="console-imax-developer truncate">
                {activeGame.developer || activeGame.publisher || 'INDEPENDENT CINEMA'}
              </span>
            </div>

            {/* Imposing Theatrical Title */}
            <h1 className="console-imax-title" title={activeGame.canonical_title}>
              {activeGame.canonical_title}
            </h1>

            {/* Metadata Badges: Status, HLTB, Genre Tags */}
            <div className="console-imax-meta-row">
              <span className={`console-imax-tag console-imax-tag-status ${!activeGame.is_installed ? 'is-uninstalled' : ''}`}>
                <Clock size={12} />
                <span>{playTimeStr}</span>
              </span>

              {hltbStr && (
                <span className="console-imax-tag console-imax-tag-hltb">
                  <Trophy size={12} />
                  <span>{hltbStr}</span>
                </span>
              )}

              {genresList.map((genre, idx) => (
                <span key={idx} className="console-imax-tag console-imax-tag-genre">
                  {genre}
                </span>
              ))}
            </div>

            {/* Primary Action Buttons */}
            <div className="console-imax-actions">
              {/* Primary [A] Launch or Download Button */}
              <button
                type="button"
                className={`console-stage-btn console-stage-btn-launch ${!activeGame.is_installed ? 'is-install-btn' : ''}`}
                onClick={() => onLaunch?.(activeGame)}
                title={activeGame.is_installed ? 'Start Show (A)' : 'Download via Store Launcher (A)'}
              >
                <GamepadGlyph button="A" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                {activeGame.is_installed ? (
                  <>
                    <Play size={16} fill="currentColor" />
                    <span>START SHOW</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>DOWNLOAD NOW</span>
                  </>
                )}
              </button>

              {/* [X] Archives / Spin Again */}
              {isTodayPickMode ? (
                <button
                  type="button"
                  className="console-stage-btn console-stage-btn-dossier"
                  onClick={handleSpinToday}
                  disabled={todayRolling}
                  title="Spin Again (X)"
                >
                  <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                  <Dices size={15} />
                  <span>SPIN AGAIN</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="console-stage-btn console-stage-btn-dossier"
                  onClick={() => onSelect?.(activeGame)}
                  title="Film Archives & Production Notes (X)"
                >
                  <GamepadGlyph button="X" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                  <Info size={15} />
                  <span>FILM ARCHIVES</span>
                </button>
              )}

              {/* [Y] Favorite / Film Dossier */}
              <button
                type="button"
                className={`console-stage-btn console-stage-btn-fav ${activeGame.is_favorite ? 'is-fav' : ''}`}
                onClick={() => {
                  if (isTodayPickMode) {
                    onSelect?.(activeGame, 'today')
                  } else {
                    onToggleFavorite?.(activeGame)
                  }
                }}
                title={isTodayPickMode ? "Film Dossier (Y)" : "Toggle Favorite (Y)"}
              >
                <GamepadGlyph button="Y" glyphStyle={gamepadGlyphStyle} connectedGamepad={connectedGamepad} />
                {isTodayPickMode ? <Info size={15} /> : <Star size={15} fill={activeGame.is_favorite ? 'currentColor' : 'none'} />}
                <span>{isTodayPickMode ? 'FILM DOSSIER' : (activeGame.is_favorite ? 'FAVORITED' : 'FAVORITE')}</span>
              </button>
            </div>

            {/* 70mm Film Credits Billing Block */}
            <div className="console-imax-billing-block">
              <span>DIRECTED BY <strong>{activeGame.developer || 'INDEPENDENT'}</strong></span>
              <span className="billing-dot">•</span>
              <span>GENRE <strong>{genresList.join(' / ') || 'FEATURE'}</strong></span>
              <span className="billing-dot">•</span>
              <span>SOUND <strong>SURROUND MASTER 7.1</strong></span>
              <span className="billing-dot">•</span>
              <span>PROJECTION <strong>IMAX 70MM</strong></span>
            </div>
          </div>
        ) : null}
      </div>

      {/* 3. OPTION B: MINIMALIST GLIDE TICKER (100% Unobstructed Artwork) */}
      {!isTodayPickMode && total > 1 && (
        <div className="console-imax-bottom-bar">
          <div className="console-stage-glide-ticker">
            <button
              type="button"
              className="console-stage-glide-btn"
              onClick={() => onIndexChange?.(Math.max(0, safeIndex - 1))}
              title="Previous Title (Left)"
              aria-label="Previous Title"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="console-stage-glide-text">
              <strong>{String(safeIndex + 1).padStart(2, '0')}</strong> OF <strong>{String(total).padStart(2, '0')}</strong> TITLES &bull; GLIDE WITH LEFT / RIGHT
            </span>
            <button
              type="button"
              className="console-stage-glide-btn"
              onClick={() => onIndexChange?.(Math.min(total - 1, safeIndex + 1))}
              title="Next Title (Right)"
              aria-label="Next Title"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
