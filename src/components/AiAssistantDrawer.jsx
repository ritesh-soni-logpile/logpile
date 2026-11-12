import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  Copy,
  Check,
  Compass,
  Gamepad2,
  BookOpen,
  Trophy,
  Zap,
  ExternalLink,
  ShieldCheck,
  FolderOpen,
  Plus,
  Trash2,
  History,
  MessageSquare,
  Play,
  Search,
  Layers,
  SlidersHorizontal,
  ScanLine,
  Clock,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  speakConfirmation,
  stopSpeaking,
  getVoiceSettings,
  saveVoiceSettings,
} from '../utils/voiceService'

// Persona configurations mirroring aiService.cjs
const PERSONA_OPTIONS = [
  { id: 'auto', name: 'Auto (Match Theme)', icon: '✨', desc: 'Syncs automatically with active visual theme' },
  { id: 'storyteller', name: 'The Storyteller', icon: '🎬', desc: 'Cinematic, rich lore and narrative depth' },
  { id: 'speedrunner', name: 'Action Speedrunner', icon: '⚡', desc: 'Kinetic, fast and direct bullet-points' },
  { id: 'lorekeeper', name: 'The Lore-Keeper', icon: '🌿', desc: 'Atmospheric, world-building & RPG secrets' },
  { id: 'coop', name: 'The Co-op Buddy', icon: '🎮', desc: 'Loyal gamer ally who roasts tough games and bosses' },
  { id: 'coach', name: 'The Tactical Coach', icon: '🏆', desc: 'Competitive, builds, meta, and mechanics' },
]

const SESSIONS_STORAGE_KEY = 'logpile_ai_sessions_v1'
const ACTIVE_SESSION_STORAGE_KEY = 'logpile_ai_active_session_id'

function createBlankSession(persona = 'auto') {
  return {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: 'New Conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    persona,
    messages: [],
  }
}

function loadInitialSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {}
  return [createBlankSession()]
}

function formatSessionDate(timestamp) {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function renderFormattedAnswer(text) {
  if (!text) return null

  // Pre-process markdown links: clean any internal spaces in the URL target e.g. [label](https://www youtube.com/...) -> [label](https://www.youtube.com/...)
  const normalizedText = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, (m, label, url) => {
    let cleanUrl = url.trim().replace(/\s+/g, '')
    if (/^https?:\/\/www[a-z0-9]/i.test(cleanUrl) && !/^https?:\/\/www\./i.test(cleanUrl)) {
      cleanUrl = cleanUrl.replace(/^(https?:\/\/www)([a-z0-9])/i, '$1.$2')
    }
    return `[${label}](${cleanUrl})`
  })

  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>|(https?:\/\/[^\s<]+)/gi
  const elements = []
  let lastIndex = 0
  let match

  const handleOpenLink = (e, url) => {
    e.preventDefault()
    e.stopPropagation()
    const cleanUrl = url.trim()
    if (window.api && typeof window.api.openExternal === 'function') {
      window.api.openExternal(cleanUrl)
    } else if (window.api?.overlay?.openUrl) {
      window.api.overlay.openUrl(cleanUrl)
    } else {
      window.open(cleanUrl, '_blank')
    }
  }

  while ((match = linkRegex.exec(normalizedText)) !== null) {
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
          onClick={(e) => handleOpenLink(e, linkUrl)}
          className="ai-chat-link text-blue-400 hover:text-blue-300 underline cursor-pointer"
          title={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkLabel} <ExternalLink size={11} className="inline ml-0.5" />
        </a>
      )
    } else if (match[3]) {
      const linkUrl = match[3]
      const linkLabel = match[4] || match[3]
      elements.push(
        <a
          key={match.index}
          href={linkUrl}
          onClick={(e) => handleOpenLink(e, linkUrl)}
          className="ai-chat-link text-blue-400 hover:text-blue-300 underline cursor-pointer"
          title={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkLabel} <ExternalLink size={11} className="inline ml-0.5" />
        </a>
      )
    } else if (match[5]) {
      const linkUrl = match[5].replace(/[.,;!?]+$/, '')
      elements.push(
        <a
          key={match.index}
          href={linkUrl}
          onClick={(e) => handleOpenLink(e, linkUrl)}
          className="ai-chat-link text-blue-400 hover:text-blue-300 underline cursor-pointer"
          title={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkUrl} <ExternalLink size={11} className="inline ml-0.5" />
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

function extractBalancedJson(str) {
  if (!str || typeof str !== 'string') return null
  const start = str.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < str.length; i++) {
    const char = str[i]
    if (escape) {
      escape = false
      continue
    }
    if (char === '\\') {
      escape = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (!inString) {
      if (char === '{') depth++
      else if (char === '}') {
        depth--
        if (depth === 0) {
          const jsonSub = str.slice(start, i + 1)
          return { jsonSub, startIndex: start, endIndex: i + 1 }
        }
      }
    }
  }
  return null
}

export function sanitizePlayerRoasting(text) {
  if (!text || typeof text !== 'string') return ''
  let clean = text

  // 0. Strip prompt artifacts like "A:", "Answer:", "Q:", "Question:", speaker labels
  clean = clean.replace(/^(?:A|Answer|Q|Question|Response|AI|Assistant|The Co-op Buddy|The Storyteller|Action Speedrunner|The Lore-Keeper|The Tactical Coach|Logpile Companion|Logpile):\s*/i, '').trim()

  // 1. Strip "Look, you lazy bastard", "Look you bastard", "Listen here you idiot" anywhere
  clean = clean.replace(/\b(?:look|listen(?:\s+here)?|hey)?[,\s]*(?:you\s+)(?:[a-z0-9_-]+\s+)?(?:bastard|bitch|idiot|loser|asshole|moron|dumbass|dipshit|jackass|clown|fuckhead|shithead|motherfucker|scumbag|punk|casual|prick|dick|twat|waste of space|piece of shit)\b[!,.:\s]*/gi, '')

  // 2. Direct insult directed at player: e.g. ", you sick bastard", ", you lazy bastard", "you idiot"
  clean = clean.replace(
    /[,;\s]*\byou\s+(?:[a-z0-9_-]+\s+)?(?:bastard|bitch|idiot|loser|asshole|moron|dumbass|dipshit|jackass|clown|fuckhead|shithead|motherfucker|scumbag|punk|casual|prick|dick|twat|waste of space|piece of shit)\b[!?,.]*/gi,
    ''
  )

  // 3. Trailing insult noun e.g. ", bastard!", ", you sick fucker!"
  clean = clean.replace(
    /[,;\s]+(?:you\s+)?(?:sick|lazy|dumb|stupid|crazy|clueless|pathetic|filthy)?\s*(?:bastard|bitch|idiot|loser|asshole|moron|dumbass|dipshit|jackass|fuckhead|shithead|fucker)\b[!?,.]*/gi,
    ''
  )

  // 4. Standalone phrases like "you lazy", "you pathetic", "you sick" (when talking to player)
  clean = clean.replace(/[,;\s]*\byou\s+(?:lazy|sick|stupid|dumb|clueless|pathetic|worthless|useless)\b[!?,.\s]*/gi, '')

  // 5. Clean up leading "look," / "listen," / "hey," only when followed by a comma (never break "Listen up")
  clean = clean.replace(/^\s*(?:look|listen(?:\s+here)?|hey)\s*,\s*/i, '')

  // 6. Strip repetitive opening greeting crutches (e.g. "Heck, ", "Buddy, ", "My friend, ")
  clean = clean.replace(/^\s*(?:heck|jeez|darn)[,:\s]+/i, '')
  clean = clean.replace(/^\s*(?:hey\s+)?(?:buddy|my friend)[,:\s]+/i, '')

  // 7. Clean up dangling commas and spacing
  clean = clean
    .replace(/\s+,/g, ',')
    .replace(/,\s*([.!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (/[,:;\-]$/.test(clean)) {
    clean = clean.slice(0, -1).trim() + '!'
  }

  if (text.trim().endsWith('!') && !clean.endsWith('!') && !clean.endsWith('.')) {
    clean = clean + '!'
  } else if (text.trim().endsWith('.') && !clean.endsWith('.') && !clean.endsWith('!')) {
    clean = clean + '.'
  }

  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1)
  }
  return clean
}

export function parseAiResponse(raw, isUserQuestion = false) {
  if (!raw) return { text: '', action: null }
  let text = String(raw).trim()
  let action = null

  // If the user's prompt is a question or gameplay walkthrough query, never parse action blocks
  if (!isUserQuestion) {
    // 1. Try matching code block with ```json or ```action or bare ```
    const blockMatch = text.match(/```(?:json|action)?\s*([\s\S]*?)\s*```/i)
    if (blockMatch) {
      try {
        const parsed = JSON.parse(blockMatch[1].trim())
        if (parsed && typeof parsed.action === 'string') {
          action = parsed
          text = text.replace(blockMatch[0], '').trim()
        }
      } catch {}
    }

    // 2. Fallback: balanced JSON block containing "action"
    if (!action) {
      const balanced = extractBalancedJson(text)
      if (balanced) {
        try {
          const parsed = JSON.parse(balanced.jsonSub)
          if (parsed && typeof parsed.action === 'string') {
            action = parsed
            text = (text.slice(0, balanced.startIndex) + text.slice(balanced.endIndex)).trim()
          }
        } catch {}
      }
    }
  }

  // Clean any residual backticks or markdown fences
  text = text.replace(/```(?:json|action)?\s*\{[\s\S]*?"action"[\s\S]*?\}\s*```/gi, '').trim()
  text = text.replace(/^```(?:json|action)?\s*|```\s*$/gi, '').trim()

  // Strip leading speaker label if echoed by the model (e.g. "A:", "Answer:", "The Storyteller: ...")
  text = text.replace(/^(?:A|Answer|Q|Question|Response|The Storyteller|Action Speedrunner|The Lore-Keeper|The Co-op Buddy|The Tactical Coach|Assistant|AI|Logpile):\s*/i, '').trim()
  text = sanitizePlayerRoasting(text)

  return { text, action }
}

function getActionSummary(action) {
  if (!action || !action.action) return null
  const { action: type, payload = {} } = action
  switch (type) {
    case 'LAUNCH_GAME':
      return { icon: Play, label: `Launch: ${payload.title || 'Game'}` }
    case 'VIEW_DOSSIER':
    case 'VIEW_DETAILS':
      return { icon: BookOpen, label: `View Dossier: ${payload.title || 'Game'}` }
    case 'FILTER_SEARCH':
      return { icon: Search, label: `Search: "${payload.query || ''}"` }
    case 'FILTER_GENRE':
      return { icon: Layers, label: `Filter Genre: ${payload.genre || ''}` }
    case 'FILTER_STATUS':
      return { icon: SlidersHorizontal, label: `Filter Backlog: ${payload.status || ''}` }
    case 'SWITCH_VIEW':
      return { icon: Layers, label: `Switch View: ${payload.view || ''}` }
    case 'SCAN_LIBRARY':
      return { icon: ScanLine, label: 'Scan & Import Library' }
    case 'SYNC_HLTB':
      return { icon: Clock, label: payload.forceAll ? 'Update All Games (HLTB)' : 'Sync Missing Story Hours' }
    default:
      return { icon: Zap, label: `Action: ${type}` }
  }
}

export function AiAssistantDrawer({
  open = false,
  onClose,
  activeGame = null,
  layoutTheme = 'cinematic',
  games = [],
  onAction,
  isVoiceListening = false,
  onToggleVoice,
}) {
  const [sessions, setSessions] = useState(loadInitialSessions)
  const [ttsEnabled, setTtsEnabled] = useState(() => getVoiceSettings().ttsEnabled)
  const [activeSessionId, setActiveSessionId] = useState(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)
      return stored || 'default'
    } catch {
      return 'default'
    }
  })
  const [showHistory, setShowHistory] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [modelStatus, setModelStatus] = useState(null)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [selectedPersona, setSelectedPersona] = useState(() => {
    try {
      return localStorage.getItem('logpile-ai-personality') || 'auto'
    } catch {
      return 'auto'
    }
  })
  const [activeGuideAvailable, setActiveGuideAvailable] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Resolve active session reliably
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || createBlankSession(selectedPersona)
  }, [sessions, activeSessionId, selectedPersona])

  const messages = activeSession.messages || []

  // Ensure active session id points to a valid session
  useEffect(() => {
    if (!sessions.some((s) => s.id === activeSessionId) && sessions.length > 0) {
      setActiveSessionId(sessions[0].id)
    }
  }, [sessions, activeSessionId])

  // Check if offline guide is available for active game
  useEffect(() => {
    let cancelled = false
    if (activeGame?.id && window.api?.guides?.hasGuide) {
      window.api.guides.hasGuide(activeGame.id).then((res) => {
        if (!cancelled) setActiveGuideAvailable(Boolean(res))
      }).catch(() => {
        if (!cancelled) setActiveGuideAvailable(false)
      })
    } else {
      setActiveGuideAvailable(false)
    }
    return () => { cancelled = true }
  }, [activeGame?.id])

  const fetchStatus = useCallback(async () => {
    try {
      const st = await window.api?.ai?.getStatus?.()
      if (st) setModelStatus(st)
    } catch {}
  }, [])

  useEffect(() => {
    if (open) {
      fetchStatus()
      setTimeout(() => inputRef.current?.focus(), 120)
    } else {
      // Free RAM when drawer closes
      window.api?.ai?.unload?.().catch(() => {})
      setShowHistory(false)
      setConfirmClear(false)
    }
  }, [open, fetchStatus])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (open && messages.length > 0 && !showHistory) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open, showHistory])

  // Handle escape key
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showHistory) {
          setShowHistory(false)
        } else {
          handleCloseDrawer()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, showHistory])

  const handleCloseDrawer = useCallback(() => {
    setShowHistory(false)
    setConfirmClear(false)
    stopSpeaking()
    window.api?.ai?.unload?.().catch(() => {})
    onClose?.()
  }, [onClose])

  const handleToggleTts = useCallback(() => {
    setTtsEnabled((prev) => {
      const next = !prev
      saveVoiceSettings({ ttsEnabled: next })
      if (!next) stopSpeaking()
      return next
    })
  }, [])

  const handlePersonaChange = (val) => {
    setSelectedPersona(val)
    try {
      localStorage.setItem('logpile-ai-personality', val)
    } catch {}
  }

  // Session Management Actions
  const handleNewChat = useCallback(() => {
    const newSess = createBlankSession(selectedPersona)
    const updated = [newSess, ...sessions]
    setSessions(updated)
    setActiveSessionId(newSess.id)
    setShowHistory(false)
    setConfirmClear(false)
    setQuery('')
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated))
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, newSess.id)
    } catch {}
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [selectedPersona, sessions])

  const handleClearCurrentChat = useCallback(() => {
    const updated = sessions.map((s) => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          messages: [],
          title: 'New Conversation',
          updatedAt: Date.now(),
        }
      }
      return s
    })
    setSessions(updated)
    setConfirmClear(false)
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated))
    } catch {}
  }, [activeSession.id, sessions])

  const handleDeleteSession = useCallback((e, sessId) => {
    e.stopPropagation()
    const updated = sessions.filter((s) => s.id !== sessId)
    const nextSessions = updated.length > 0 ? updated : [createBlankSession(selectedPersona)]
    setSessions(nextSessions)
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(nextSessions))
    } catch {}
    if (activeSessionId === sessId) {
      const nextActiveId = nextSessions[0].id
      setActiveSessionId(nextActiveId)
      try {
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, nextActiveId)
      } catch {}
    }
  }, [activeSessionId, selectedPersona, sessions])

  const handleSelectSession = useCallback((sessId) => {
    setActiveSessionId(sessId)
    setShowHistory(false)
    setConfirmClear(false)
    try {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessId)
    } catch {}
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  const handleSend = async (userText) => {
    const textToSend = typeof userText === 'string' ? userText.trim() : query.trim()
    if (!textToSend || loading) return

    const gameTitle = activeGame?.canonical_title || ''
    const userMsg = { role: 'user', content: textToSend, timestamp: Date.now(), gameContext: gameTitle }

    // Auto-generate title for fresh conversation
    const currentTitle = (activeSession.title === 'New Conversation' || activeSession.title === 'New Chat')
      ? (textToSend.length > 34 ? textToSend.slice(0, 34) + '…' : textToSend)
      : activeSession.title

    const updatedMessagesWithUser = [...messages, userMsg]
    const updatedSessionsWithUser = sessions.map((s) => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          title: currentTitle,
          updatedAt: Date.now(),
          messages: updatedMessagesWithUser,
        }
      }
      return s
    })

    setSessions(updatedSessionsWithUser)
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessionsWithUser))
    } catch {}

    setQuery('')
    setLoading(true)

    if (modelStatus && !modelStatus.installed) {
      const botMsg = {
        role: 'assistant',
        content: 'The local AI model is not installed yet. Click "Download Model" in the header to enable offline guidance.',
        timestamp: Date.now(),
        persona: selectedPersona,
      }
      const finalSessions = updatedSessionsWithUser.map((s) => {
        if (s.id === activeSession.id) {
          return { ...s, messages: [...updatedMessagesWithUser, botMsg], updatedAt: Date.now() }
        }
        return s
      })
      setSessions(finalSessions)
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(finalSessions))
      } catch {}
      setLoading(false)
      return
    }

    try {
      // Pass previous turns for multi-turn conversational memory, ensuring history is free of old prompt artifacts or insults
      const historyContext = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.role === 'assistant' ? sanitizePlayerRoasting(m.content) : m.content,
      }))

      const answer = await window.api?.ai?.askQuestion?.(textToSend, gameTitle, {
        personality: selectedPersona,
        theme: layoutTheme,
        history: historyContext,
      })

      const isRejection = /\b(trash|garbage|jank|janky|shit|crap|sucks?|hate (it|this)|looks? like|not this|anything else|something else|skip|pass|next|nah|no way|fuck this|fuck that|fuck no|hell no|wont play|won't play|not playing|aint playing|ain't playing|bad|terrible|awful|boring)\b/i.test(textToSend)
      const isUserQuestion = !isRejection && (/\?/.test(textToSend) || /\b(?:how|where|what|why|who|when|which|whose|stuck|guide|help|walkthrough|solve|beat|defeat|kill|find|locate|get out|gwet out|pass|progress|puzzle|boss|mission|quest|tip|tips|advice|do here|need to do)\b/i.test(textToSend))
      const { text: cleanContent, action } = parseAiResponse(answer, isUserQuestion)

      const botMsg = {
        role: 'assistant',
        content: cleanContent || (action ? 'Executing requested action.' : 'No response generated.'),
        action,
        timestamp: Date.now(),
        persona: selectedPersona,
      }

      if (action && typeof onAction === 'function') {
        try {
          onAction(action)
        } catch {}
      }

      if (cleanContent && ttsEnabled) {
        speakConfirmation(cleanContent)
      } else if (action && ttsEnabled) {
        if (action.action === 'LAUNCH_GAME') {
          speakConfirmation(`Launching ${action.payload?.title || gameTitle || 'game'}`)
        } else if (action.action === 'SWITCH_VIEW') {
          speakConfirmation(`Opening ${action.payload?.view}`)
        }
      }

      const updatedMessagesWithBot = [...updatedMessagesWithUser, botMsg]
      const updatedSessionsWithBot = sessions.map((s) => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            updatedAt: Date.now(),
            messages: updatedMessagesWithBot,
          }
        }
        return s
      })

      setSessions(updatedSessionsWithBot)
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessionsWithBot))
      } catch {}
      fetchStatus()
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: `AI Engine Error: ${err.message || 'Could not communicate with offline model.'}`,
        isError: true,
        timestamp: Date.now(),
      }
      const updatedMessagesWithError = [...updatedMessagesWithUser, errMsg]
      const updatedSessionsWithError = sessions.map((s) => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            updatedAt: Date.now(),
            messages: updatedMessagesWithError,
          }
        }
        return s
      })
      setSessions(updatedSessionsWithError)
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessionsWithError))
      } catch {}
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleCopy = (idx, text) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const quickChips = useMemo(() => {
    const defaultChips = [
      { icon: Trophy, label: 'Pick a 2-hour game from my backlog', prompt: 'Pick a bite-sized game (under 4 hours) from my backlog that I should finish next.' },
      { icon: Zap, label: 'Fast-paced action for tonight', prompt: 'What high-tempo or action game from my installed library should I play tonight?' },
      { icon: Compass, label: 'Relaxing atmospheric games', prompt: 'Recommend a chill, immersive, or atmospheric game from my installed library.' },
    ]

    if (activeGame?.canonical_title) {
      return [
        { icon: BookOpen, label: `Lore: ${activeGame.canonical_title}`, prompt: `Give me a concise lore overview and backstory for ${activeGame.canonical_title}.` },
        { icon: Gamepad2, label: `Beginner tips for ${activeGame.canonical_title}`, prompt: `Give me the top 3 essential beginner tips and mechanics advice for ${activeGame.canonical_title}.` },
        ...defaultChips.slice(0, 2),
      ]
    }

    return defaultChips
  }, [activeGame])

  if (!open) return null

  const activePersonaObj = PERSONA_OPTIONS.find((p) => p.id === selectedPersona) || PERSONA_OPTIONS[0]

  return (
    <div className="ai-drawer-root">
      {/* Backdrop */}
      <div
        className="ai-drawer-backdrop"
        onClick={handleCloseDrawer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside className="ai-drawer-panel" role="dialog" aria-label="Logpile AI Companion">
        {/* Header */}
        <div className="ai-drawer-header">
          <div className="ai-drawer-brand">
            <div className="ai-drawer-icon-wrap">
              <Sparkles size={16} className="text-[var(--accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="ai-drawer-title">AI Companion</h3>
                <span className={`ai-drawer-badge ${!modelStatus?.installed ? 'ai-drawer-badge-byom' : ''}`}>
                  <span className={`ai-drawer-pulse ${!modelStatus?.installed ? 'ai-drawer-pulse-amber' : ''}`} />
                  {modelStatus?.installed ? 'Offline & Ready' : 'BYOM · No Model'}
                </span>
              </div>
              <p className="ai-drawer-sub">100% Offline · Private Companion · Auto-Unloads</p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* New Chat Button */}
            <button
              type="button"
              className="ai-drawer-btn-pill"
              onClick={handleNewChat}
              title="Start a new blank chat (+ New)"
            >
              <Plus size={13} />
              <span>New</span>
            </button>

            {/* History Toggle Button */}
            <button
              type="button"
              className={`ai-drawer-icon-btn ${showHistory ? 'ai-drawer-icon-btn-active' : ''}`}
              onClick={() => {
                setShowHistory((prev) => !prev)
                setConfirmClear(false)
              }}
              title="View past conversation history"
            >
              <History size={14} />
            </button>

            {/* Voice Feedback (TTS) Toggle Button */}
            <button
              type="button"
              className="ai-drawer-icon-btn"
              onClick={handleToggleTts}
              title={ttsEnabled ? 'Voice feedback: ON (Click to mute)' : 'Voice feedback: OFF (Click to unmute)'}
            >
              {ttsEnabled ? <Volume2 size={14} className="text-[var(--accent)]" /> : <VolumeX size={14} className="text-[var(--text-muted)]" />}
            </button>

            {/* Clear Chat Button */}
            {messages.length > 0 && !showHistory && (
              <button
                type="button"
                className="ai-drawer-icon-btn"
                onClick={() => setConfirmClear((prev) => !prev)}
                title="Clear current conversation"
              >
                <Trash2 size={13} className={confirmClear ? 'text-red-400' : ''} />
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              className="ai-drawer-close-btn"
              onClick={handleCloseDrawer}
              title="Close companion (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Clear Confirmation Bar */}
        {confirmClear && !showHistory && (
          <div className="ai-clear-confirm-bar">
            <span>Clear messages in this chat?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearCurrentChat}
                className="ai-clear-confirm-yes"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="ai-clear-confirm-no"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Persona Selector Bar */}
        <div className="ai-drawer-persona-bar">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold">Persona:</span>
            <select
              value={selectedPersona}
              onChange={(e) => handlePersonaChange(e.target.value)}
              className="ai-drawer-persona-select"
            >
              {PERSONA_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>
          {activeGame?.canonical_title && (
            <div
              className="ai-drawer-game-context flex items-center gap-1.5"
              title={`Active Game Context: ${activeGame.canonical_title}${activeGuideAvailable ? ' · Offline Knowledge Guide Loaded' : ''}`}
            >
              <Gamepad2 size={12} className="text-[var(--accent)] shrink-0" />
              <span className="truncate">{activeGame.canonical_title}</span>
              {activeGuideAvailable && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-semibold border border-[var(--border-subtle)] shrink-0">
                  Guide Ready
                </span>
              )}
            </div>
          )}
        </div>

        {/* Messages Body OR History Panel */}
        <div className="ai-drawer-body custom-scrollbar">
          {showHistory ? (
            /* History Sessions View */
            <div className="ai-history-panel custom-scrollbar">
              <div className="ai-history-header">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-[var(--accent)]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Past Conversations</span>
                </div>
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="ai-history-new-btn"
                >
                  <Plus size={12} />
                  <span>New Chat</span>
                </button>
              </div>

              <div className="ai-history-list">
                {sessions.map((sess) => {
                  const isActive = sess.id === activeSession.id
                  const count = sess.messages?.length || 0
                  return (
                    <div
                      key={sess.id}
                      onClick={() => handleSelectSession(sess.id)}
                      className={`ai-history-item ${isActive ? 'ai-history-item-active' : ''}`}
                    >
                      <div className="ai-history-item-main">
                        <strong className="ai-history-item-title truncate">
                          {sess.title || 'New Conversation'}
                        </strong>
                        <span className="ai-history-item-meta">
                          {formatSessionDate(sess.updatedAt || sess.createdAt)} · {count} {count === 1 ? 'message' : 'messages'}
                        </span>
                      </div>
                      {sessions.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(e, sess.id)}
                          className="ai-history-delete-btn"
                          title="Delete conversation"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : modelStatus && !modelStatus.installed ? (
            /* BYOM Empty State */
            <div className="ai-byom-container">
              <div className="ai-byom-card">
                <div className="ai-byom-icon-wrap">
                  <FolderOpen size={28} className="text-[var(--accent)]" />
                </div>
                <h4 className="ai-byom-title">Bring Your Own Model (BYOM)</h4>
                <p className="ai-byom-desc">
                  Logpile is 100% offline and stays lightweight with zero bloated downloads. Drop any standard <code className="ai-byom-code">.gguf</code> model file into your models folder to activate your companion.
                </p>

                <div className="ai-byom-actions">
                  <button
                    type="button"
                    onClick={() => window.api?.ai?.openFolder?.()}
                    className="ai-byom-btn-primary"
                  >
                    <FolderOpen size={14} />
                    <span>Open Models Folder</span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchStatus}
                    className="ai-byom-btn-secondary"
                    title="Scan models folder"
                  >
                    <RefreshCw size={13} />
                    <span>Check Again</span>
                  </button>
                </div>

                <div className="ai-byom-recommendations">
                  <span className="ai-byom-rec-header">Recommended Models (Zero Gaming Lag):</span>
                  <div className="ai-byom-rec-list">
                    <div className="ai-byom-rec-item">
                      <span className="ai-byom-rec-name">Qwen 2.5 1.5B / 3B Instruct (Q4_K_M)</span>
                      <span className="ai-byom-rec-meta">Fastest strategy advice · ~1.2 – 2.0 GB</span>
                    </div>
                    <div className="ai-byom-rec-item">
                      <span className="ai-byom-rec-name">Llama 3.2 1B / 3B Instruct (Q4_K_M)</span>
                      <span className="ai-byom-rec-meta">Low RAM footprint · Sharp reasoning · ~1 – 2 GB</span>
                    </div>
                    <div className="ai-byom-rec-item">
                      <span className="ai-byom-rec-name">SmolLM2 1.7B Instruct (Q4_K_M)</span>
                      <span className="ai-byom-rec-meta">Ultra-lightweight · Runs on any PC · ~1.0 GB</span>
                    </div>
                  </div>
                </div>

                <p className="ai-byom-note">
                  🔒 Runs purely on your CPU or GPU. Memory auto-unloads when closing or launching games to protect your in-game FPS.
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* Blank Conversation Empty State */
            <div className="ai-drawer-empty">
              <div className="ai-drawer-empty-icon">
                <Sparkles size={24} className="text-[var(--accent)]" />
              </div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">How can I help with your library?</h4>
              <p className="text-xs text-[var(--text-muted)] max-w-[300px]">
                Ask for backlog picks, genre recommendations, game lore, or in-game walkthrough tips.
              </p>

              {/* Quick Prompt Chips */}
              <div className="ai-drawer-chips-grid">
                <span className="text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase mb-1">
                  Quick Inquiries
                </span>
                {quickChips.map((chip, idx) => {
                  const Icon = chip.icon
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={loading}
                      className="ai-drawer-chip"
                      onClick={() => handleSend(chip.prompt)}
                    >
                      <Icon size={13} className="text-[var(--accent)] shrink-0" />
                      <span className="truncate text-left">{chip.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Chat Messages Thread */
            <div className="space-y-4 py-2">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`ai-msg ${msg.role === 'user' ? 'ai-msg-user' : 'ai-msg-bot'} ${msg.isError ? 'ai-msg-error' : ''}`}
                >
                  <div className="ai-msg-header">
                    <span className="ai-msg-author">
                      {msg.role === 'user' ? 'You' : activePersonaObj.name}
                    </span>
                    {msg.role === 'assistant' && !msg.isError && (
                      <button
                        type="button"
                        className="ai-msg-copy-btn"
                        onClick={() => handleCopy(idx, msg.content)}
                        title="Copy answer"
                      >
                        {copiedIdx === idx ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                  <div className="ai-msg-content">
                    {msg.role === 'assistant' ? renderFormattedAnswer(msg.content) : msg.content}
                  </div>
                  {msg.action && (
                    <div className="ai-msg-action-container">
                      {(() => {
                        const summary = getActionSummary(msg.action)
                        if (!summary) return null
                        const ActionIcon = summary.icon
                        return (
                          <button
                            type="button"
                            className="ai-msg-action-chip"
                            onClick={() => onAction?.(msg.action)}
                            title="Click to re-execute this action"
                          >
                            <ActionIcon size={12} className="ai-msg-action-icon" />
                            <span className="ai-msg-action-label">{summary.label}</span>
                            <span className="ai-msg-action-tag">ACTION</span>
                          </button>
                        )
                      })()}
                    </div>
                  )}
                  {msg.gameContext && (
                    <span className="ai-msg-context-tag">
                      🎯 Context: {msg.gameContext}
                    </span>
                  )}
                </div>
              ))}
              {loading && (
                <div className="ai-msg ai-msg-bot ai-msg-loading">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <RefreshCw size={13} className="spin-icon text-[var(--accent)]" />
                    <span>Consulting library...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Footer Prompt Input (hidden when viewing history list) */}
        {!showHistory && (
          <div className="ai-drawer-footer">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="ai-drawer-input-form"
            >
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  modelStatus && !modelStatus.installed
                    ? 'Add a .gguf model into the models folder to chat...'
                    : activeGame?.canonical_title
                    ? `Ask about ${activeGame.canonical_title} or library...`
                    : 'Ask what to play, game lore, tips...'
                }
                className="ai-drawer-input"
                disabled={loading || (modelStatus && !modelStatus.installed)}
                autoComplete="off"
                spellCheck="false"
              />
              {onToggleVoice && (
                <button
                  type="button"
                  onClick={onToggleVoice}
                  className={`ai-drawer-mic-btn ${isVoiceListening ? 'active-listening' : ''}`}
                  title={isVoiceListening ? 'Listening for voice command... click to stop' : 'Push-to-Talk (Voice Command / Gamepad R3)'}
                >
                  {isVoiceListening ? <Mic size={14} style={{ color: '#22c55e' }} /> : <MicOff size={14} />}
                </button>
              )}
              <button
                type="submit"
                disabled={!query.trim() || loading || (modelStatus && !modelStatus.installed)}
                className="ai-drawer-send-btn"
                title="Send question (Enter)"
              >
                {loading ? <RefreshCw size={14} className="spin-icon" /> : <Send size={14} />}
              </button>
            </form>
            <div className="ai-drawer-guarantee">
              <ShieldCheck size={11} className="text-[var(--accent)]" />
              <span>Runs locally on CPU/GPU · Unloads instantly on close or game launch</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
