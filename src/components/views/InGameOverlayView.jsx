import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search, X, Check } from 'lucide-react'
import { LAYOUT_PALETTES, themeVars } from '../../utils/themePalettes'

const api = typeof window !== 'undefined' ? window.api : null

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function renderOverlayAnswerText(text) {
  if (!text) return null
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g
  const elements = []
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index))
    }
    if (match[1] && match[2]) {
      const linkLabel = match[1]
      const linkUrl = match[2]
      elements.push(
        <a
          key={match.index}
          href={linkUrl}
          onClick={(e) => {
            e.preventDefault()
            if (api?.openExternal) {
              api.openExternal(linkUrl)
            } else if (api?.overlay?.openUrl) {
              api.overlay.openUrl(linkUrl)
            } else {
              window.open(linkUrl, '_blank')
            }
          }}
          style={{
            color: 'var(--accent, #818cf8)',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontWeight: 600,
            margin: '0 2px',
          }}
          title={linkUrl}
        >
          {linkLabel} ↗
        </a>
      )
    } else if (match[3]) {
      const linkUrl = match[3]
      elements.push(
        <a
          key={match.index}
          href={linkUrl}
          onClick={(e) => {
            e.preventDefault()
            if (api?.openExternal) {
              api.openExternal(linkUrl)
            } else if (api?.overlay?.openUrl) {
              api.overlay.openUrl(linkUrl)
            } else {
              window.open(linkUrl, '_blank')
            }
          }}
          style={{
            color: 'var(--accent, #818cf8)',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontWeight: 600,
            margin: '0 2px',
          }}
          title={linkUrl}
        >
          {linkUrl} ↗
        </a>
      )
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex))
  }
  return elements
}

function InGameOverlayView() {
  const [mode, setMode] = useState('guide') // 'guide' | 'ai'
  const [query, setQuery] = useState('')
  const [activeGameInfo, setActiveGameInfo] = useState({ title: '', gameId: null, isPlaying: false })
  const [specs, setSpecs] = useState(null)
  const [aiStatus, setAiStatus] = useState({ installed: false, modelPath: '', modelsDir: '', modelName: '', sizeMb: 0 })
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const inputRef = useRef(null)

  const [aiPersonality, setAiPersonality] = useState(() => {
    try {
      return localStorage.getItem('logpile-ai-personality') || 'auto'
    } catch {
      return 'auto'
    }
  })

  const [advisoryDismissed, setAdvisoryDismissed] = useState(() => {
    try {
      return localStorage.getItem('logpile-overlay-advisory-dismissed') === 'true'
    } catch {
      return false
    }
  })

  const handleDismissAdvisory = () => {
    setAdvisoryDismissed(true)
    try {
      localStorage.setItem('logpile-overlay-advisory-dismissed', 'true')
    } catch {}
  }

  const [layoutTheme, setLayoutTheme] = useState(() => {
    try {
      return localStorage.getItem('logpile-layout-theme') || 'cinematic'
    } catch {
      return 'cinematic'
    }
  })

  const activePersona = useMemo(() => {
    const key = aiPersonality === 'auto'
      ? (layoutTheme === 'kinetic' ? 'speedrunner' : layoutTheme === 'atmospheric' ? 'lorekeeper' : layoutTheme === 'playful' ? 'coop' : layoutTheme === 'competitive' ? 'coach' : 'storyteller')
      : aiPersonality

    const map = {
      storyteller: { id: 'storyteller', name: 'The Storyteller', icon: '🎬', tag: 'Cinematic' },
      speedrunner: { id: 'speedrunner', name: 'Action Speedrunner', icon: '⚡', tag: 'Kinetic' },
      lorekeeper: { id: 'lorekeeper', name: 'The Lore-Keeper', icon: '🌿', tag: 'Atmospheric' },
      coop: { id: 'coop', name: 'The Co-op Buddy', icon: '🎮', tag: 'Playful' },
      coach: { id: 'coach', name: 'The Tactical Coach', icon: '🏆', tag: 'Competitive' },
    }
    return map[key] || map.storyteller
  }, [aiPersonality, layoutTheme])

  const refreshTheme = useCallback(() => {
    try {
      const th = localStorage.getItem('logpile-layout-theme') || 'cinematic'
      setLayoutTheme(th)
      const persona = localStorage.getItem('logpile-ai-personality') || 'auto'
      setAiPersonality(persona)
    } catch {}
  }, [])

  const palette = LAYOUT_PALETTES[layoutTheme] || LAYOUT_PALETTES.cinematic
  const currentThemeVars = useMemo(() => themeVars(layoutTheme), [layoutTheme])

  const themeCardConfig = useMemo(() => {
    switch (layoutTheme) {
      case 'kinetic':
        return {
          radius: '8px',
          innerRadius: '6px',
          background: 'linear-gradient(145deg, rgba(22, 18, 14, 0.98) 0%, rgba(12, 12, 15, 0.99) 45%, rgba(8, 8, 10, 1) 100%)',
          border: '1px solid rgba(249, 115, 22, 0.35)',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.95), 0 0 35px rgba(249, 115, 22, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          inputBg: 'rgba(0, 0, 0, 0.7)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace, Outfit, sans-serif',
        }
      case 'atmospheric':
        return {
          radius: '14px',
          innerRadius: '8px',
          background: 'linear-gradient(145deg, rgba(12, 22, 16, 0.98) 0%, rgba(8, 13, 10, 0.99) 45%, rgba(5, 8, 6, 1) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.95), 0 0 35px rgba(16, 185, 129, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          inputBg: 'rgba(0, 0, 0, 0.65)',
          fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
        }
      case 'playful':
        return {
          radius: '18px',
          innerRadius: '10px',
          background: 'linear-gradient(145deg, rgba(22, 26, 12, 0.98) 0%, rgba(12, 14, 8, 0.99) 45%, rgba(8, 8, 6, 1) 100%)',
          border: '1px solid rgba(214, 255, 75, 0.32)',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.95), 0 0 35px rgba(214, 255, 75, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
          inputBg: 'rgba(0, 0, 0, 0.65)',
          fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
        }
      case 'competitive':
        return {
          radius: '8px',
          innerRadius: '6px',
          background: 'linear-gradient(145deg, rgba(26, 20, 10, 0.98) 0%, rgba(14, 11, 7, 0.99) 45%, rgba(9, 8, 6, 1) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.95), 0 0 35px rgba(245, 158, 11, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          inputBg: 'rgba(0, 0, 0, 0.7)',
          fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
        }
      case 'cinematic':
      default:
        return {
          radius: '16px',
          innerRadius: '10px',
          background: 'linear-gradient(145deg, rgba(14, 22, 32, 0.98) 0%, rgba(10, 12, 16, 0.99) 45%, rgba(6, 8, 10, 1) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.95), 0 0 35px rgba(56, 189, 248, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          inputBg: 'rgba(0, 0, 0, 0.65)',
          fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
        }
    }
  }, [layoutTheme])

  const refreshAiStatus = useCallback(async () => {
    try {
      const st = await api.ai?.getStatus?.()
      if (st) setAiStatus(st)
    } catch {}
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('is-overlay')
    document.body.classList.add('is-overlay')
    const rootEl = document.getElementById('root')
    if (rootEl) rootEl.classList.add('is-overlay')
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    if (rootEl) rootEl.style.background = 'transparent'

    const refreshActiveGame = () => {
      api.overlay?.getActiveGame?.().then((info) => {
        if (info) setActiveGameInfo(info)
      }).catch(() => {})
    }

    refreshActiveGame()

    api.system?.getSpecs?.().then((s) => {
      if (s) setSpecs(s)
    }).catch(() => {})

    refreshTheme()
    refreshAiStatus()

    const unsubShown = api.overlay?.onShown?.(() => {
      refreshTheme()
      refreshAiStatus()
      refreshActiveGame()
      setTimeout(() => inputRef.current?.focus(), 50)
    })

    const handleFocus = () => {
      refreshTheme()
      refreshAiStatus()
      refreshActiveGame()
    }
    window.addEventListener('focus', handleFocus)

    setTimeout(() => inputRef.current?.focus(), 80)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        api.overlay?.hide?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('focus', handleFocus)
      if (typeof unsubShown === 'function') unsubShown()
      document.documentElement.classList.remove('is-overlay')
      document.body.classList.remove('is-overlay')
      if (rootEl) rootEl.classList.remove('is-overlay')
      document.documentElement.style.background = ''
      document.body.style.background = ''
      if (rootEl) rootEl.style.background = ''
    }
  }, [refreshAiStatus])

  const title = activeGameInfo?.title || ''
  const trimmed = query.trim()
  const lastTopicRef = useRef('')

  const getCleanSearchTarget = (kind = 'walkthrough') => {
    const isAppOrGeneric = !title || title.trim().toLowerCase() === 'game' || /wallpaper engine|steam|launcher|epic games/i.test(title)
    let target = ''
    if (trimmed) {
      let cleaned = trimmed.replace(/^(i'm stuck on|im stuck on|stuck on|help me with|how do i beat|how to beat|how do i solve|how to solve|guide for|help me|walkthrough for)\s+/i, '').trim()
      cleaned = cleaned.replace(/\s+(help me|please|guide|walkthrough|pls)$/i, '').trim()
      if (!cleaned) cleaned = trimmed
      if (!isAppOrGeneric && title && !new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(cleaned)) {
        target = `${title} ${cleaned}`
      } else {
        target = cleaned
      }
      lastTopicRef.current = target
    } else if (lastTopicRef.current) {
      target = lastTopicRef.current
    } else if (!isAppOrGeneric && title) {
      target = title
    }

    if (!target || target.trim().toLowerCase() === 'game' || /^(game\s*walkthrough|game\s*wiki\s*guide)$/i.test(target.trim())) {
      return ''
    }

    if (kind === 'walkthrough') {
      return /walkthrough|video|gameplay|guide/i.test(target) ? target : `${target} walkthrough`
    }
    if (kind === 'wiki') {
      return /wiki|fandom|guide/i.test(target) ? target : `${target} wiki guide`
    }
    return target
  }

  const handleOpenYoutube = (customTarget) => {
    const target = typeof customTarget === 'string' && customTarget ? customTarget : getCleanSearchTarget('walkthrough')
    if (!target) {
      inputRef.current?.focus()
      return
    }
    const q = /walkthrough|video|gameplay|guide/i.test(target) ? target : `${target} walkthrough`
    api.overlay?.openUrl?.(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`)
  }

  const handleOpenWiki = (customTarget) => {
    const target = typeof customTarget === 'string' && customTarget ? customTarget : getCleanSearchTarget('wiki')
    if (!target) {
      inputRef.current?.focus()
      return
    }
    const q = /wiki|fandom|guide/i.test(target) ? target : `${target} wiki guide`
    api.overlay?.openUrl?.(`https://www.google.com/search?q=${encodeURIComponent(q)}`)
  }

  const handleAskAi = async () => {
    if (!trimmed) return
    const topic = getCleanSearchTarget('raw') || trimmed
    if (topic) lastTopicRef.current = topic
    setAiLoading(true)
    setAiError('')
    setAiAnswer('')
    refreshAiStatus()
    try {
      const answer = await api.ai?.askQuestion?.(trimmed, title || '', { personality: aiPersonality, theme: layoutTheme })
      setAiAnswer(answer || 'No response generated.')
      refreshAiStatus()
    } catch (err) {
      setAiError(err?.message || 'Failed to generate answer.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleRecommendAi = async () => {
    if (!trimmed) return
    lastTopicRef.current = trimmed
    setAiLoading(true)
    setAiError('')
    setAiAnswer('')
    refreshAiStatus()
    try {
      const answer = await api.ai?.getRecommendation?.(trimmed, { personality: aiPersonality, theme: layoutTheme })
      setAiAnswer(answer || 'No recommendation generated.')
      refreshAiStatus()
    } catch (err) {
      setAiError(err?.message || 'Failed to generate recommendation.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleKeyDownInput = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (mode === 'guide') {
        handleOpenYoutube()
      } else {
        handleAskAi()
      }
    }
  }

  const isLowRam = specs && specs.totalRamGb && specs.totalRamGb <= 8
  const formattedModelSize = aiStatus.sizeMb ? (aiStatus.sizeMb >= 1024 ? (aiStatus.sizeMb / 1024).toFixed(1) + ' GB' : aiStatus.sizeMb + ' MB') : ''

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      padding: '24px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
      userSelect: 'none',
    }}>
      <div
        className={`layout-${layoutTheme}`}
        style={{
          ...currentThemeVars,
          width: '100%',
          maxWidth: '760px',
          maxHeight: '560px',
          background: themeCardConfig.background,
          backgroundColor: palette.card || '#0a0a0a',
          backdropFilter: 'blur(64px) saturate(200%)',
          WebkitBackdropFilter: 'blur(64px) saturate(200%)',
          border: themeCardConfig.border,
          borderRadius: themeCardConfig.radius,
          boxShadow: themeCardConfig.boxShadow,
          padding: '20px 24px',
          color: palette.textPrimary || '#f3f4f6',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          fontFamily: themeCardConfig.fontFamily,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            {activeGameInfo.isPlaying ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                flexShrink: 0,
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                Playing Now
              </span>
            ) : title ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: 'var(--badge-bg)',
                color: 'var(--accent)',
                border: '1px solid var(--border-color)',
                flexShrink: 0,
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                In Library
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: 'var(--badge-bg)',
                color: 'var(--badge-text)',
                border: '1px solid var(--border-color)',
                flexShrink: 0,
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                Logpile
              </span>
            )}
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #f3f4f6)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title || 'Gaming Assistant'}
            </span>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: themeCardConfig.innerRadius, padding: '3px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => { setMode('guide'); setAiAnswer(''); }}
              style={{
                padding: '5px 12px',
                borderRadius: `calc(${themeCardConfig.innerRadius} - 2px)`,
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: mode === 'guide' ? 'var(--accent)' : 'transparent',
                color: mode === 'guide' ? 'var(--accent-contrast)' : 'var(--text-muted)',
                boxShadow: mode === 'guide' ? '0 1px 8px var(--accent-glow)' : 'none',
              }}
            >
              ⚡ Fast Guide
            </button>
            <button
              type="button"
              onClick={() => { setMode('ai'); refreshAiStatus(); }}
              style={{
                padding: '5px 12px',
                borderRadius: `calc(${themeCardConfig.innerRadius} - 2px)`,
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: mode === 'ai' ? 'var(--accent)' : 'transparent',
                color: mode === 'ai' ? 'var(--accent-contrast)' : 'var(--text-muted)',
                boxShadow: mode === 'ai' ? '0 1px 8px var(--accent-glow)' : 'none',
              }}
            >
              🤖 Gaming AI
            </button>
          </div>
        </div>

        {/* Advisory Warning Banner for Gaming AI mode */}
        {mode === 'ai' && !advisoryDismissed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: themeCardConfig.innerRadius,
            background: isLowRam ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            border: isLowRam ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--border-color)',
            color: isLowRam ? '#fbbf24' : 'var(--text-secondary, #d1d5db)',
            fontSize: '12px',
            lineHeight: '1.4',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '14px', flexShrink: 0 }}>{isLowRam ? '⚠️' : '💡'}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isLowRam ? (
                  <><strong>8 GB RAM detected:</strong> AI may cause brief frame drops. Fast Guide mode is recommended for max FPS.</>
                ) : (
                  <><strong>Advisory:</strong> Running AI during heavy games may cause frame drops. Fast Guide mode is recommended for max FPS.</>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={handleDismissAdvisory}
              title="Dismiss advisory"
              aria-label="Dismiss advisory banner"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'currentColor',
                opacity: 0.7,
                cursor: 'pointer',
                padding: '2px 4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                flexShrink: 0,
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Search / Prompt Input with Action Button */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInput}
            placeholder={mode === 'guide' 
              ? (activeGameInfo.isPlaying && title ? `Search ${title} walkthrough, boss, or puzzle...` : 'Search any game walkthrough, boss, or puzzle...')
              : (activeGameInfo.isPlaying && title ? `Ask about ${title}, boss tactics, or tips...` : 'Ask about any game, your installed library, or what to play next...')
            }
            style={{
              width: '100%',
              height: '44px',
              boxSizing: 'border-box',
              padding: query ? '0 145px 0 14px' : '0 90px 0 14px',
              fontSize: '13px',
              fontWeight: 500,
              background: themeCardConfig.inputBg,
              border: '1px solid var(--border-color)',
              borderRadius: themeCardConfig.innerRadius,
              color: 'var(--text-primary, #ffffff)',
              outline: 'none',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)'
              e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.5), 0 0 12px var(--accent-glow)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-color)'
              e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.5)'
            }}
          />

          <div style={{
            position: 'absolute',
            right: '7px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setAiError('')
                  inputRef.current?.focus()
                }}
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.14)',
                  border: 'none',
                  color: 'var(--text-primary, #e5e7eb)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  lineHeight: 1,
                  padding: 0,
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                title="Clear input"
              >
                ✕
              </button>
            )}

            {mode === 'ai' ? (
              <button
                type="button"
                onClick={handleAskAi}
                disabled={aiLoading || !trimmed}
                style={{
                  height: '30px',
                  padding: '0 12px',
                  borderRadius: `calc(${themeCardConfig.innerRadius} - 2px)`,
                  background: trimmed ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)',
                  color: trimmed ? 'var(--accent-contrast)' : 'rgba(255, 255, 255, 0.35)',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: trimmed && !aiLoading ? 'pointer' : 'default',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: trimmed ? '0 1px 8px var(--accent-glow)' : 'none',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {aiLoading ? 'Thinking...' : 'Ask ↵'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenYoutube}
                style={{
                  height: '30px',
                  padding: '0 12px',
                  borderRadius: `calc(${themeCardConfig.innerRadius} - 2px)`,
                  background: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 1px 8px var(--accent-glow)',
                  flexShrink: 0,
                }}
              >
                Search ↵
              </button>
            )}
          </div>
        </div>

        {/* Mode A: Fast Guide Actions */}
        {mode === 'guide' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={handleOpenYoutube}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '42px',
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: themeCardConfig.innerRadius,
                color: '#fca5a5',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              <span style={{ fontSize: '15px' }}>▶</span> Watch Video Walkthrough
            </button>

            <button
              type="button"
              onClick={handleOpenWiki}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '42px',
                background: 'var(--badge-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: themeCardConfig.innerRadius,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              <span style={{ fontSize: '15px' }}>📖</span> Open Wiki Guide
            </button>
          </div>
        )}

        {/* Mode B: Gamer Partner Mode */}
        {mode === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {!aiStatus.installed ? (
              <div style={{
                padding: '12px 16px',
                borderRadius: themeCardConfig.innerRadius,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed var(--border-color)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                    🤖 Gaming AI Offline Setup
                  </strong>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={refreshAiStatus}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        borderRadius: `calc(${themeCardConfig.innerRadius} - 2px)`,
                        border: '1px solid var(--border-color)',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Check if a newly placed model is detected"
                    >
                      🔄 Check Model
                    </button>
                    <button
                      type="button"
                      onClick={() => api.ai?.openFolder?.()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: `calc(${themeCardConfig.innerRadius} - 2px)`,
                        border: '1px solid var(--accent)',
                        background: 'var(--accent)',
                        color: 'var(--accent-contrast)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      📂 Open Models Folder
                    </button>
                  </div>
                </div>
                <div style={{ lineHeight: '1.4' }}>
                  Drop any <code style={{ color: 'var(--accent)', background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: '4px' }}>.gguf</code> model file into your models folder to activate Gaming AI.
                </div>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '6px 10px',
                  borderRadius: themeCardConfig.innerRadius,
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  border: '1px solid var(--border-color)',
                }}>
                  {aiStatus.modelsDir || 'resources\\models'}
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: themeCardConfig.innerRadius,
                background: 'var(--badge-bg, rgba(255, 255, 255, 0.04))',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                gap: '10px',
                flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', flexShrink: 0, boxShadow: '0 0 8px #22c55e' }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px', whiteSpace: 'nowrap' }}>Gaming AI</span>
                  <select
                    value={aiPersonality}
                    onChange={(e) => {
                      const val = e.target.value
                      setAiPersonality(val)
                      try { localStorage.setItem('logpile-ai-personality', val) } catch {}
                    }}
                    style={{
                      height: '24px',
                      padding: '0 8px',
                      borderRadius: `calc(${themeCardConfig.innerRadius} - 4px)`,
                      border: '1px solid var(--border-color)',
                      background: 'rgba(0, 0, 0, 0.45)',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                    title="Change AI companion personality (or match active theme)"
                  >
                    <option value="auto">Auto ({activePersona.icon} {activePersona.name})</option>
                    <option value="storyteller">🎬 The Storyteller</option>
                    <option value="speedrunner">⚡ Action Speedrunner</option>
                    <option value="lorekeeper">🌿 The Lore-Keeper</option>
                    <option value="coop">🎮 The Co-op Buddy</option>
                    <option value="coach">🏆 The Tactical Coach</option>
                  </select>
                  <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.04em', border: '1px solid var(--border-color)' }}>100% OFFLINE</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    disabled={aiLoading || !trimmed}
                    onClick={handleAskAi}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: `calc(${themeCardConfig.innerRadius} - 2px)`,
                      border: '1px solid var(--accent)',
                      background: 'var(--accent)',
                      color: 'var(--accent-contrast)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: aiLoading || !trimmed ? 'not-allowed' : 'pointer',
                      opacity: aiLoading || !trimmed ? 0.6 : 1,
                      boxShadow: trimmed ? '0 1px 8px var(--accent-glow)' : 'none',
                    }}
                  >
                    💬 Ask AI
                  </button>
                  <button
                    type="button"
                    disabled={aiLoading || !trimmed}
                    onClick={handleRecommendAi}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: `calc(${themeCardConfig.innerRadius} - 2px)`,
                      border: '1px solid var(--border-color)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: aiLoading || !trimmed ? 'not-allowed' : 'pointer',
                      opacity: aiLoading || !trimmed ? 0.6 : 1,
                    }}
                    title="Ask Gaming AI to recommend from your installed library"
                  >
                    🎯 Pick From Library
                  </button>
                </div>
              </div>
            )}

            {aiError && (
              <div style={{
                padding: '8px 12px',
                borderRadius: themeCardConfig.innerRadius,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: '12px',
              }}>
                {aiError}
              </div>
            )}

            {aiAnswer && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: themeCardConfig.innerRadius,
                background: 'rgba(0, 0, 0, 0.85)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                boxSizing: 'border-box',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {activePersona.icon} Gaming AI · {activePersona.name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Auto-unloads in 30s</span>
                </div>
                <div style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}>
                  {renderOverlayAnswerText(aiAnswer)}
                </div>
                {/* Walkthrough & Wiki Action Buttons directly under the AI answer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-color)',
                  flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    Need visual video steps or full game wiki?
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleOpenYoutube(lastTopicRef.current || title)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: `calc(${themeCardConfig.innerRadius} - 2px)`,
                        background: 'rgba(239, 68, 68, 0.18)',
                        border: '1px solid rgba(239, 68, 68, 0.45)',
                        color: '#fca5a5',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>▶</span> Watch Walkthrough
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenWiki(lastTopicRef.current || title)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: `calc(${themeCardConfig.innerRadius} - 2px)`,
                        background: 'var(--badge-bg)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>📖</span> Open Wiki Guide
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '2px' }}>
          <span>
            {mode === 'guide'
              ? '⚡ Fast Guide Mode · 0 MB RAM · Zero game lag'
              : `${activePersona.icon} Gaming AI (${activePersona.name}) · ${aiStatus.installed ? 'Up and running · Offline CPU · 0 VRAM' : 'Offline · No Model Loaded'}`}
          </span>
          <span>Press <kbd style={{ padding: '1px 5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', color: 'var(--text-primary)', fontSize: '10px' }}>Esc</kbd> to {activeGameInfo.isPlaying ? 'return to game' : 'close'}</span>
        </div>
      </div>
    </div>
  )
}

export default InGameOverlayView
export { InGameOverlayView }
