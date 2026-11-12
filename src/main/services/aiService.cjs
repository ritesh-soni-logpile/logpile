const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const { pathToFileURL } = require('node:url')

let llama = null
let model = null
let context = null
let unloadTimer = null
let isInferring = false

const UNLOAD_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes idle timeout (drawer open); unloads immediately when drawer closes or game launches

const PERSONALITY_PROFILES = {
  storyteller: {
    id: 'storyteller',
    name: 'The Storyteller',
    theme: 'cinematic',
    icon: '🎬',
    style: 'You speak as a cinematic, lore-conscious game guide. Keep responses strictly to 1 or 2 sentences max. Never write tutorials or tell the user how to click UI buttons.',
    directive: '[Personality: The Storyteller. Flavor your advice with cinematic atmosphere. Strictly 1 or 2 sentences max. No UI clicking tutorials.]',
    systemPrompt: `You are The Storyteller. You speak as a cinematic, lore-conscious game guide with narrative depth and dramatic flair.
Keep responses strictly to 1 or 2 sentences max. Never write tutorials or tell the user how to click UI buttons.
When recommending a game or executing an action, state your 1-2 sentence recommendation followed by the JSON action block.
Never output action blocks for general questions or game lore.`,
  },
  speedrunner: {
    id: 'speedrunner',
    name: 'Action Speedrunner',
    theme: 'kinetic',
    icon: '⚡',
    style: 'You are an adrenaline-fueled, high-tempo arcade speedrunner. Fast, direct, zero fluff. Strictly 1 or 2 sentences max. No UI clicking tutorials.',
    directive: '[Personality: Action Speedrunner. Be fast, direct, and energetic. Strictly 1 or 2 sentences max. No UI clicking tutorials.]',
    systemPrompt: `You are Action Speedrunner. An adrenaline-fueled, high-tempo arcade speedrunner. Fast, direct, zero fluff.
Keep responses strictly to 1 or 2 sentences max. No UI clicking tutorials.
When recommending a game or executing an action, state your 1-2 sentence recommendation followed by the JSON action block.
Never output action blocks for general questions or game lore.`,
  },
  lorekeeper: {
    id: 'lorekeeper',
    name: 'The Lore-Keeper',
    theme: 'atmospheric',
    icon: '🌿',
    style: 'You are a calm, observant RPG companion sitting by a campfire. Thoughtful and grounded tone. Strictly 1 or 2 sentences max. No UI clicking tutorials.',
    directive: '[Personality: The Lore-Keeper. Grounded and observant tone. Clean, thoughtful, and objective. Strictly 1 or 2 sentences max. No UI clicking tutorials.]',
    systemPrompt: `You are The Lore-Keeper. You are a calm, observant, objective RPG companion sitting by a campfire. Thoughtful, grounded, and clean tone.
Keep responses strictly to 1 or 2 sentences max. Provide objective lore and walkthrough secrets without fluff. No UI clicking tutorials.
When recommending a game or executing an action, state your 1-2 sentence recommendation followed by the JSON action block.
Never output action blocks for general questions or game lore.`,
  },
  coop: {
    id: 'coop',
    name: 'The Co-op Buddy',
    theme: 'playful',
    icon: '🎮',
    style: 'You are the player\'s unfiltered gamer friend sitting on the couch with a controller. You match their energy, talk like a real gamer in Discord voice chat, and use natural profanity (fuck, shit, damn, badass). You have strong gamer opinions: hype up games that slap, ruthlessly roast janky trash or slow walking sims, and ALWAYS agree with the player when they reject or hate a game. Crucial rule: Never insult or belittle the human player (no calling them lazy, stupid, casual, or names). Vent all your profanity and roasting at the GAMES and developers, never at the player. Keep it punchy, authentic, and natural — never start sentences with "Buddy," or "Heck,".',
    directive: '[Personality: The Co-op Buddy. Couch gamer teammate. Authentic, unfiltered gamer voice with natural profanity (fuck, shit, damn). Roasts janky games, bad graphics, and boring walking sims. Agrees with player rejections immediately without defending the game. Never insults the human player. Zero "Heck" or "Buddy" daycare tone. Strictly 1-2 punchy sentences.]',
    systemPrompt: `You are The Co-op Buddy — an unfiltered gamer friend sitting right next to the player on the couch with a controller.
Vibe & Conversational Rules:
- Talk like a real gamer in Discord voice chat: use natural gamer profanity (fuck, shit, damn, badass, slaps, jank). Be energetic, opinionated, and funny.
- When the player hates on a game, says it's trash, or says "no way the fuck i'm play this shit": IMMEDIATELY AGREE with them! Roast the rejected game ("Haha fuck that, you're 100% right — that slow-ass point-and-click walking simulator is definitely not the move right now. Let's scrap it and pick something that actually slaps"). NEVER defend a game the player just rejected!
- Absolutely BANNED: Corporate soft-core tone, polite daycare assistant language, saying "Heck", or giving dry walkthroughs when the player is venting.
- DO NOT start lines with repetitive filler like "Buddy,", "Heck,", "My friend,", or "Listen up, buddy,". Speak like a real human.
The Golden Side-by-Side Rule:
- You and the player are ALWAYS on the same team. NEVER roast, insult, or call the human player derogatory names (no "you lazy bastard", no "you idiot"). All your profanity and trash talk is directed at the GAMES, bad bosses, and clunky mechanics — NEVER at the person holding the controller.
Constraint: Max 1 to 2 punchy, unfiltered sentences. When pitching a replacement game, give your sharp take and output the JSON action block.`,
  },
  coach: {
    id: 'coach',
    name: 'The Tactical Coach',
    theme: 'competitive',
    icon: '🏆',
    style: 'You are a competitive esports coach and min-max strategist. Decisive and analytical tone. Strictly 1 or 2 sentences max. No UI clicking tutorials.',
    directive: '[Personality: The Tactical Coach. Analytical and decisive. Strictly 1 or 2 sentences max. No UI clicking tutorials.]',
    systemPrompt: `You are The Tactical Coach. A competitive esports coach and min-max strategist. Decisive, analytical, meta-focused, and clean.
Keep responses strictly to 1 or 2 sentences max. No UI clicking tutorials.
When recommending a game or executing an action, state your 1-2 sentence recommendation followed by the JSON action block.
Never output action blocks for general questions or game lore.`,
  },
}

PERSONALITY_PROFILES.coop_buddy = PERSONALITY_PROFILES.coop

function resolvePersonality(personalityKey, layoutTheme) {
  const normKey = String(personalityKey || '').toLowerCase().replace(/[-_]/g, '')
  if (normKey === 'coopbuddy' || normKey === 'coop') return PERSONALITY_PROFILES.coop
  if (normKey === 'lorekeeper' || normKey === 'lore') return PERSONALITY_PROFILES.lorekeeper
  if (normKey === 'speedrunner' || normKey === 'action') return PERSONALITY_PROFILES.speedrunner
  if (normKey === 'coach' || normKey === 'tactical') return PERSONALITY_PROFILES.coach
  if (normKey === 'storyteller' || normKey === 'story') return PERSONALITY_PROFILES.storyteller

  if (personalityKey && personalityKey !== 'auto' && PERSONALITY_PROFILES[personalityKey]) {
    return PERSONALITY_PROFILES[personalityKey]
  }
  switch (layoutTheme) {
    case 'kinetic': return PERSONALITY_PROFILES.speedrunner
    case 'atmospheric': return PERSONALITY_PROFILES.lorekeeper
    case 'playful': return PERSONALITY_PROFILES.coop
    case 'competitive': return PERSONALITY_PROFILES.coach
    case 'cinematic':
    default: return PERSONALITY_PROFILES.storyteller
  }
}

function levenshtein(a, b) {
  if (a === b) return 0
  const la = a.length, lb = b.length
  if (!la) return lb
  if (!lb) return la
  const row = Array.from({ length: lb + 1 }, (_, i) => i)
  for (let i = 1; i <= la; i++) {
    let prev = i
    for (let j = 1; j <= lb; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1
      row[j - 1] = prev
      prev = val
    }
    row[lb] = prev
  }
  return row[lb]
}

const VIEW_TARGETS = {
  settings: ['setting', 'settings', 'settigns', 'setttings', 'seting', 'setings', 'config', 'configuration', 'pref', 'prefs', 'preferences', 'option', 'options'],
  dashboard: ['dashboard', 'dashbaord', 'dashbord', 'dash', 'analytics', 'stats', 'statistics'],
  favorites: ['favorite', 'favorites', 'favourite', 'favourites', 'fav', 'favs', 'starred', 'wishlist'],
  installed: ['installed', 'installed games', 'my games', 'installed list', 'downloaded games'],
  ready: ['ready', 'ready to install', 'install queue', 'uninstalled', 'downloads'],
  library: ['library', 'all games', 'catalog', 'browse', 'all'],
}

function matchFuzzyView(text) {
  if (!text || typeof text !== 'string') return null
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/^(?:open|go to|show|switch to|take me to|navigate to|view|khol|dekho|check)\s+(?:the\s+)?(?:my\s+)?/i, '')
    .replace(/\s+(?:please|pls|page|view|tab|screen)$/i, '')
    .trim()

  if (!cleaned) return null

  // 1. Direct or keyword match
  for (const [viewKey, keywords] of Object.entries(VIEW_TARGETS)) {
    if (keywords.includes(cleaned)) return viewKey
  }

  // 2. Contains keyword (whole word)
  for (const [viewKey, keywords] of Object.entries(VIEW_TARGETS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i')
      if (regex.test(cleaned)) return viewKey
    }
  }

  // 3. Typo tolerance: Levenshtein distance <= 2 for words with length >= 4
  const words = cleaned.split(/\s+/).filter(Boolean)
  for (const w of words) {
    if (w.length >= 4) {
      for (const [viewKey, keywords] of Object.entries(VIEW_TARGETS)) {
        for (const kw of keywords) {
          if (kw.length >= 4 && Math.abs(w.length - kw.length) <= 2) {
            const dist = levenshtein(w, kw)
            if (dist <= 2) return viewKey
          }
        }
      }
    }
  }

  return null
}

const SYSTEM_PROMPT = `You are Logpile Companion. Keep replies under 10 words. Trigger actions using JSON blocks.
NEVER summarize the library unless the user explicitly types 'summarize my library'.
For all actions, output one short confirmation sentence (under 8 words) followed by the action block.

Dynamic Web Fallbacks: If the user explicitly asks for a video, or if the provided local Guide Chunks lack the specific details needed to solve a puzzle or beat a boss, generate a targeted search link using your internal knowledge of the game.
- For videos, output a Markdown link: [Watch [Specific Boss/Puzzle] Walkthrough on YouTube](https://www.youtube.com/results?search_query=[Game+Title]+[Specific+Puzzle]+walkthrough)
- For wikis, output: [Search [Specific Topic] on PCGamingWiki](https://www.pcgamingwiki.com/w/index.php?search=[Game+Title]+[Specific+Topic])
Make sure to replace spaces in the URL with '+'.

Supported actions:
- LAUNCH_GAME: {"action": "LAUNCH_GAME", "payload": {"title": "<game title>"}}
- VIEW_DOSSIER: {"action": "VIEW_DOSSIER", "payload": {"title": "<game title>"}}
- FILTER_SEARCH: {"action": "FILTER_SEARCH", "payload": {"query": "<keyword>"}}
- FILTER_GENRE: {"action": "FILTER_GENRE", "payload": {"genre": "<genre>"}}
- FILTER_STATUS: {"action": "FILTER_STATUS", "payload": {"status": "unplayed" | "playing" | "paused" | "completed"}}
- SWITCH_VIEW: {"action": "SWITCH_VIEW", "payload": {"view": "installed" | "favorites" | "dashboard" | "ready" | "settings"}}
- SCAN_LIBRARY: {"action": "SCAN_LIBRARY", "payload": {}}

Example action output:
Switching to dashboard.
\`\`\`json
{"action": "SWITCH_VIEW", "payload": {"view": "dashboard"}}
\`\`\`
Never output action blocks for general questions or game lore.`

function formatActionResponse(action, customSentence = null) {
  if (!action || typeof action !== 'object') return ''
  if (action.textOnly) {
    return sanitizePlayerRoasting(action.message || '')
  }
  let confirmation = sanitizePlayerRoasting(customSentence || 'Executing requested action.')
  const payload = action.payload || {}
  if (!customSentence) {
    switch (action.action) {
      case 'SWITCH_VIEW':
        confirmation = `Switching to ${payload.view || 'dashboard'}.`
        break
      case 'LAUNCH_GAME':
        confirmation = `Launching ${payload.title || 'game'}.`
        break
      case 'VIEW_DOSSIER':
      case 'VIEW_DETAILS':
        confirmation = `Opening dossier for ${payload.title || 'game'}.`
        break
      case 'FILTER_SEARCH':
        confirmation = `Searching library for "${payload.query || ''}".`
        break
      case 'FILTER_GENRE':
        confirmation = `Filtering library by ${payload.genre || ''}.`
        break
      case 'FILTER_STATUS':
        confirmation = `Filtering backlog by ${payload.status || ''}.`
        break
      case 'SCAN_LIBRARY':
        confirmation = `Starting library scan.`
        break
      case 'SYNC_HLTB':
        confirmation = `Updating story campaign hours.`
        break
      default:
        confirmation = `Executing requested action.`
        break
    }
  }
  const payloadStr = JSON.stringify(action.payload || {}).replace(/:/g, ': ')
  const actionJson = `{"action": "${action.action}", "payload": ${payloadStr}}`
  const actionBlock = `\`\`\`json\n${actionJson}\n\`\`\``
  return `${confirmation}\n${actionBlock}`
}

function detectIntentAction(userPrompt, activeGameTitle, db = null) {
  const p = (userPrompt || '').trim()
  if (!p) return null

  // 0. QUESTIONS / GAMEPLAY WALKTHROUGHS / CONVERSATIONAL QUERIES:
  // If the user's message contains question marks, question words ("how", "where", "what", "why", "who", "when", "which", "stuck", "guide", "help", "walkthrough", "tips", "advice", "get out"),
  // or conversational connective clauses ("and", "because", "planning to", "planing to", "thinking of", "wondering", "dont know", "don't know", "can you tell me", "if"),
  // OR the prompt is long (> 8 words):
  // It is a KNOWLEDGE / GAMEPLAY QUESTION for the AI assistant.
  // It must NEVER trigger LAUNCH_GAME or SWITCH_VIEW.
  const isQuestionOrKnowledge =
    /\?/.test(p) ||
    /\b(?:how|where|what|why|who|when|which|whose|stuck|guide|help|walkthrough|solve|beat|defeat|kill|find|locate|get out|gwet out|pass|progress|puzzle|boss|mission|quest|tip|tips|advice|fuck|do here|need to do)\b/i.test(p) ||
    /\b(?:and|because|planning to|planing to|thinking of|wondering|dont know|don't know|can you tell me|if)\b/i.test(p) ||
    p.split(/\s+/).length > 8

  if (isQuestionOrKnowledge) {
    return null
  }

  // 1. EXPLICIT SYSTEM COMMANDS (Scan, HLTB Sync, Filters)
  if (/\b(?:scan|rescan|import)\s+(?:my\s+)?(?:library|games|storefronts|folders)\b/i.test(p) || /^(?:scan|rescan)$/i.test(p)) {
    return { action: 'SCAN_LIBRARY', payload: {} }
  }

  if (/\b(?:sync|fetch|update)\s+(?:all\s+)?(?:hltb|howlongtobeat|story hours|campaign lengths?|completion times?)\b/i.test(p)) {
    const forceAll = /\ball\b/i.test(p)
    return { action: 'SYNC_HLTB', payload: { forceAll } }
  }

  const statusMatch = p.match(/\b(?:show|filter|find)\s+(unplayed|playing|paused|completed)\s*(?:backlog|games|titles)?\b/i)
  if (statusMatch) {
    return { action: 'FILTER_STATUS', payload: { status: statusMatch[1].toLowerCase() } }
  }

  const genreMatch = p.match(/\b(?:filter|show|find)\s+(?:only\s+)?([a-zA-Z\s]+)\s+(?:games|genre)\b/i)
  if (genreMatch && !/\b(?:my|all|installed|total|many)\b/i.test(genreMatch[1])) {
    const g = genreMatch[1].trim()
    const KNOWN_GENRES = ['action', 'rpg', 'adventure', 'strategy', 'shooter', 'fps', 'horror', 'indie', 'simulation', 'sports', 'racing', 'puzzle', 'open world', 'survival']
    if (KNOWN_GENRES.includes(g.toLowerCase())) {
      return { action: 'FILTER_GENRE', payload: { genre: g } }
    }
  }

  const searchMatch = p.match(/^(?:search|filter for|find games? matching|search for)\s+["']?([^"']+)["']?$/i)
  if (searchMatch) {
    return { action: 'FILTER_SEARCH', payload: { query: searchMatch[1].trim() } }
  }

  // Helper to resolve a game title against SQLite database
  const resolveTarget = (targetName) => {
    if (!targetName) return null
    if (db) {
      try {
        const { resolveGameByQuery } = require('../../../electron/db.cjs')
        const resolved = resolveGameByQuery(db, targetName)
        if (resolved) return resolved
      } catch {}
    }
    return null
  }

  // 2. STRICT IMPERATIVE LAUNCH COMMAND ONLY
  // Must strictly start with an imperative launch verb
  const launchMatch = p.match(/^(?:launch|start|play|run|boot up|chalao|khelna hai)\s*(.*)$/i)
  if (launchMatch) {
    const rawTarget = (launchMatch[1] || '').replace(/\s+(please|pls|now|game|karo)$/i, '').trim()
    if (rawTarget) {
      const resolved = resolveTarget(rawTarget)
      if (resolved?.canonical_title) {
        return {
          action: 'LAUNCH_GAME',
          payload: {
            gameId: resolved.id,
            id: resolved.id,
            title: resolved.canonical_title,
          },
        }
      } else {
        // User explicitly named a target that was not found in library -> DO NOT substitute activeGame!
        return {
          textOnly: true,
          message: `Could not find "${rawTarget}" in your library.`,
        }
      }
    } else if (activeGameTitle) {
      // Just "launch" or "play" without a target, but active game is selected
      const resolved = resolveTarget(activeGameTitle)
      return {
        action: 'LAUNCH_GAME',
        payload: {
          gameId: resolved?.id || null,
          id: resolved?.id || null,
          title: resolved?.canonical_title || activeGameTitle,
        },
      }
    }
  }

  // 3. STRICT VIEW / DOSSIER COMMAND
  const detailsMatch = p.match(/^(?:view details|show details|details for|open dossier|check|look at|show me|open|view)\s+(?:for\s+)?(.*)$/i)
  if (detailsMatch) {
    const rawTarget = (detailsMatch[1] || '').replace(/\s+(details|page|dossier|info|game)$/i, '').trim()
    if (rawTarget) {
      const fuzzyView = matchFuzzyView(rawTarget)
      if (fuzzyView) {
        return { action: 'SWITCH_VIEW', payload: { view: fuzzyView } }
      }
      const resolved = resolveTarget(rawTarget)
      if (resolved?.canonical_title) {
        return {
          action: 'VIEW_DOSSIER',
          payload: {
            gameId: resolved.id,
            id: resolved.id,
            title: resolved.canonical_title,
          },
        }
      } else {
        return {
          textOnly: true,
          message: `Could not find "${rawTarget}" in your library.`,
        }
      }
    } else if (activeGameTitle) {
      return {
        action: 'VIEW_DOSSIER',
        payload: {
          gameId: null,
          id: null,
          title: activeGameTitle,
        },
      }
    }
  }

  // 4. VIEW NAVIGATION (e.g. "open settings", "dashboard", "installed")
  const fuzzyView = matchFuzzyView(p)
  if (fuzzyView) {
    return { action: 'SWITCH_VIEW', payload: { view: fuzzyView } }
  }

  // 5. DIRECT SHORT GAME TITLE MENTION (e.g. typing "phantom blade zero" alone)
  if (db && p.split(/\s+/).length <= 4) {
    const matched = resolveTarget(p)
    if (matched?.canonical_title) {
      return {
        action: 'VIEW_DOSSIER',
        payload: {
          gameId: matched.id,
          id: matched.id,
          title: matched.canonical_title,
        },
      }
    }
  }

  return null
}

function extractSearchTarget(userPrompt, activeGameTitle) {
  let cleaned = (userPrompt || '').trim()
  cleaned = cleaned.replace(/^(i'm stuck on|im stuck on|stuck on|help me with|how do i beat|how to beat|how do i solve|how to solve|guide for|help me|walkthrough for)\s+/i, '')
  cleaned = cleaned.replace(/\s+(help me|please|guide|walkthrough|pls)$/i, '')

  const isAppOrGeneric = !activeGameTitle || activeGameTitle === 'Game' || /wallpaper engine|steam|launcher|epic games/i.test(activeGameTitle)

  if (!cleaned) {
    return isAppOrGeneric ? '' : activeGameTitle
  }

  if (isAppOrGeneric || (activeGameTitle && new RegExp(activeGameTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(cleaned))) {
    return cleaned
  }

  return `${activeGameTitle} ${cleaned}`
}

function scrubDisclaimers(text) {
  if (!text || typeof text !== 'string') return ''

  // Preserve URLs and markdown links so periods inside URLs are not split into spaces
  const urlStore = []
  const safeText = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s)]+/gi, (m) => {
    urlStore.push(m)
    return `__SAFE_URL_TOKEN_${urlStore.length - 1}__`
  })

  // Split into sentences / punctuation units
  const rawSentences = safeText.match(/[^.!?\n]+(?:[.!?\n]+|$)/g) || [safeText]

  const forbiddenTerms = /\b(illegal|unethical|legitimate|law|piracy|pirated|cracked|warez|copyright|terms of service|community guidelines|disclaimer|policy|safety guidelines|unauthorized|responsibly|ethical|cannot provide|responsible gaming|against guidelines|caution|security risks|adhere to|harmful|as an ai|language model|ai assistant|not to promote|not promoting|promote illegal|unethical activities|ethical activities)\b/i
  const followUpPhrases = /\b(let's focus on that|let's get back to playing|let's keep things|focus on legitimate|stay safe|ethical gaming|handle such content|use caution|trusted authority|contacting a professional)\b/i

  const cleanSentences = rawSentences.filter(s => {
    const trimmed = s.trim()
    if (!trimmed) return false
    if (forbiddenTerms.test(trimmed)) return false
    if (followUpPhrases.test(trimmed)) return false
    return true
  })

  let cleaned = cleanSentences.join(' ').replace(/\s+/g, ' ').trim()

  // Secondary regex scrub to catch any multi-word clauses that slipped through sentence splitting
  cleaned = cleaned.replace(/[^.!?\n]*\b(illegal|unethical|legitimate|policy|disclaimer|copyright|piracy|guidelines|unauthorized)\b[^.!?\n]*([.!?\n]|$)/gi, '').trim()
  cleaned = cleaned.replace(/\b(Please\s+)?(use\s+these\s+resources\s+)?(responsibly|ethically)\.?\s*/gi, '').trim()
  cleaned = cleaned.replace(/However,\s+I\s+strongly\s+advise\s+you[^.!?\n]*([.!?\n]|$)/gi, '').trim()

  // Restore preserved URLs
  cleaned = cleaned.replace(/__SAFE_URL_TOKEN_(\d+)__/g, (m, id) => urlStore[Number(id)] || '')

  return sanitizePlayerRoasting(cleaned)
}

function sanitizePlayerRoasting(text) {
  if (!text || typeof text !== 'string') return ''
  let clean = text

  // 0. Strip prompt artifacts like "A:", "Answer:", "Q:", "Question:", speaker labels
  clean = clean.replace(/^(?:A|Answer|Q|Question|Response|AI|Assistant|The Co-op Buddy|The Storyteller|Action Speedrunner|The Lore-Keeper|The Tactical Coach|Logpile Companion|Logpile):\s*/i, '').trim()

  // 1. Strip direct personal insults directed at the player (e.g. "you lazy bastard", "you sick bastard", "you idiot")
  clean = clean.replace(/\b(?:look|listen(?:\s+here)?|hey)?[,\s]*(?:you\s+)(?:[a-z0-9_-]+\s+)?(?:bastard|bitch|idiot|loser|asshole|moron|dumbass|dipshit|jackass|clown|fuckhead|shithead|motherfucker|scumbag|punk|casual|prick|dick|twat|waste of space|piece of shit)\b[!,.:\s]*/gi, '')

  clean = clean.replace(
    /[,;\s]*\byou\s+(?:[a-z0-9_-]+\s+)?(?:bastard|bitch|idiot|loser|asshole|moron|dumbass|dipshit|jackass|clown|fuckhead|shithead|motherfucker|scumbag|punk|casual|prick|dick|twat|waste of space|piece of shit)\b[!?,.]*/gi,
    ''
  )

  clean = clean.replace(
    /[,;\s]+(?:you\s+)?(?:sick|lazy|dumb|stupid|crazy|clueless|pathetic|filthy)?\s*(?:bastard|bitch|idiot|loser|asshole|moron|dumbass|dipshit|jackass|fuckhead|shithead)\b[!?,.]*/gi,
    ''
  )

  clean = clean.replace(/[,;\s]*\byou\s+(?:lazy|sick|stupid|dumb|clueless|pathetic|worthless|useless)\b[!?,.\s]*/gi, '')

  // 2. Clean up leading "look," / "listen," / "hey," only when followed by a comma (never break "Listen up")
  clean = clean.replace(/^\s*(?:look|listen(?:\s+here)?|hey)\s*,\s*/i, '')

  // 3. Strip repetitive opening greeting crutches (e.g. "Heck, ", "Buddy, ", "My friend, ")
  clean = clean.replace(/^\s*(?:heck|jeez|darn)[,:\s]+/i, '')
  clean = clean.replace(/^\s*(?:hey\s+)?(?:buddy|my friend)[,:\s]+/i, '')

  // 4. Clean up dangling commas and spacing
  clean = clean
    .replace(/\s+,/g, ',')
    .replace(/,\s*([.!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // If ended with a comma or trailing separator, turn into clean period or exclamation
  if (/[,:;\-]$/.test(clean)) {
    clean = clean.slice(0, -1).trim() + '!'
  }

  // Ensure trailing punctuation exists if was present
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

async function getLlamaModule() {
  try {
    return await import('node-llama-cpp')
  } catch {
    const fallbackPath = path.join(__dirname, '..', '..', '..', 'node_modules', 'node-llama-cpp', 'dist', 'index.js')
    return await import(pathToFileURL(fallbackPath).href)
  }
}

function getModelsDirectory(app) {
  if (app?.getPath) {
    return path.join(app.getPath('userData'), 'models')
  }
  return path.join(process.cwd(), 'logpile_data', 'models')
}

function resolveModelPath(app) {
  const searchDirs = [
    app?.getPath ? path.join(app.getPath('userData'), 'models') : null,
    path.join(process.cwd(), 'logpile_data', 'models'),
    app?.isPackaged ? path.join(process.resourcesPath, 'models') : null,
    path.join(__dirname, '..', '..', '..', 'resources', 'models'),
    path.join(process.cwd(), 'resources', 'models'),
    path.join(process.cwd(), 'models'),
    path.join(__dirname, '..', '..', '..', 'resources'),
  ].filter(Boolean)

  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir)
        const match = files.find(f => f.toLowerCase().endsWith('.gguf') && !f.toLowerCase().includes('mmproj') && !f.toLowerCase().includes('vocab'))
        if (match) {
          const candidate = path.join(dir, match)
          if (fs.statSync(candidate).size > 50000000) {
            return candidate
          }
        }
      } catch {}
    }
  }

  return null
}

function getModelStatus(app) {
  const modelsDir = getModelsDirectory(app)
  const modelPath = resolveModelPath(app)
  const exists = Boolean(modelPath && fs.existsSync(modelPath))
  let sizeMb = 0
  let modelName = ''
  if (exists) {
    try {
      sizeMb = Math.round(fs.statSync(modelPath).size / (1024 * 1024))
      modelName = path.basename(modelPath)
    } catch {}
  }
  return {
    installed: exists && sizeMb > 50,
    modelPath: modelPath || path.join(modelsDir, '<your-model>.gguf'),
    modelsDir,
    modelName,
    sizeMb,
    isLoaded: Boolean(context),
  }
}

let unloadPending = false

function resetUnloadTimer() {
  if (unloadTimer) {
    clearTimeout(unloadTimer)
    unloadTimer = null
  }
  if (isInferring) return
  unloadTimer = setTimeout(() => {
    unloadEngine().catch(() => {})
  }, UNLOAD_TIMEOUT_MS)
}

async function unloadEngine() {
  if (isInferring) {
    unloadPending = true
    return false
  }
  unloadPending = false
  try {
    const ctx = context
    const mdl = model
    context = null
    model = null
    if (unloadTimer) {
      clearTimeout(unloadTimer)
      unloadTimer = null
    }
    if (ctx) {
      try { await ctx.dispose() } catch {}
    }
    if (mdl) {
      try { await mdl.dispose() } catch {}
    }
    if (global.gc) {
      try { global.gc() } catch {}
    }
    return true
  } catch {
    return false
  }
}

const CPU_THREADS = Math.min(4, Math.max(1, os.cpus()?.length ? Math.min(4, os.cpus().length) : 4))
const CONTEXT_SIZE = 2048

async function ensureEngineLoaded(app) {
  if (unloadTimer) {
    clearTimeout(unloadTimer)
    unloadTimer = null
  }

  // Clear references if objects were disposed
  if (context && context.disposed) context = null
  if (model && model.disposed) {
    model = null
    context = null
  }
  if (llama && llama.disposed) {
    llama = null
    model = null
    context = null
  }

  if (context && model) return { model, context }

  const status = getModelStatus(app)
  if (!status.installed) {
    throw new Error(`No GGUF model found. Please drop your .gguf model file into: ${status.modelsDir}`)
  }

  const llamaMod = await getLlamaModule()
  if (!llama || llama.disposed) {
    llama = await llamaMod.getLlama({ gpu: false })
  }

  try {
    os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL)
  } catch {}

  if (!model || model.disposed) {
    console.log(`[AI Engine] Loading model on CPU (threads: ${CPU_THREADS}, contextSize: ${CONTEXT_SIZE})...`)
    model = await llama.loadModel({
      modelPath: status.modelPath,
      gpuLayers: 0,
    })
  }

  if (!context || context.disposed) {
    context = await model.createContext({
      contextSize: CONTEXT_SIZE,
      threads: CPU_THREADS,
      batchSize: 128,
    })
  }

  return { model, context }
}

async function acquireSequence(mdl, ctx) {
  try {
    if (ctx && !ctx.disposed) {
      return ctx.getSequence()
    }
  } catch (err) {
    console.warn('[AI Engine] Sequence acquisition issue, recreating context:', err?.message)
  }

  // Context is disposed or failed: recreate a clean fresh context on model
  try {
    if (ctx && !ctx.disposed) await ctx.dispose()
  } catch {}

  context = await mdl.createContext({
    contextSize: CONTEXT_SIZE,
    threads: CPU_THREADS,
    batchSize: 128,
  })
  return context.getSequence()
}

async function askGamingAssistant(app, userPrompt, activeGameTitle = '', libraryContext = null, options = {}) {
  if (!userPrompt || typeof userPrompt !== 'string') {
    throw new Error('Please enter a question.')
  }

  const activePersona = resolvePersonality(options?.personality, options?.theme)

  let targetDb = options?.db || null
  if (!targetDb) {
    try {
      const { getActiveDatabase } = require('../../../electron/db.cjs')
      targetDb = getActiveDatabase()
    } catch {}
  }

  // Fast-path: Check for direct intent actions (navigation, scanning, launching, filtering, direct game titles)
  const directAction = detectIntentAction(userPrompt, activeGameTitle, targetDb)
  if (directAction) {
    return formatActionResponse(directAction)
  }

  const isExplicitSummary = /^(?:summarize\s+(?:my\s+)?library)$/i.test(userPrompt.trim())
  const isRejectionOrReaction = /\b(trash|garbage|jank|janky|shit|crap|sucks?|hate (it|this)|looks? like (trash|garbage|shit|crap|jank|ass)|not this|anything else|something else|skip|pass|next|nah|no way|fuck this|bad|terrible|awful)\b/i.test(userPrompt)
  const isRecommendationQuery = !isExplicitSummary && (
    isRejectionOrReaction ||
    /\b(what (should|can|to) (i|we) play|recommend|suggest|what game|which game|pick a game|something to play|have \d+ (mins|minutes|hrs|hours)|time to play|short games?|quick game|rpgs?|under \d+|backlog|unplayed|cozy|chill|fast|quick|short|relaxing|scary|horror|action|fps|rpg)\b/i.test(userPrompt)
  )

  let promptContext = ''
  let candidates = []

  if (isExplicitSummary) {
    if (libraryContext) {
      promptContext = `[Library: ${libraryContext.installedGamesCount || 0} installed (${libraryContext.visibleGames || 0} total)]\n`
    }
  } else if (isRecommendationQuery) {
    try {
      const { findRecommendationCandidates } = require('../../../electron/db.cjs')
      if (targetDb) {
        let queryForCandidates = userPrompt
        if (isRejectionOrReaction && Array.isArray(options?.history)) {
          const priorUserTurn = [...options.history].reverse().find(m => m.role === 'user' && m.content !== userPrompt)
          if (priorUserTurn?.content) {
            queryForCandidates = priorUserTurn.content
          }
        }
        const rawCandidates = findRecommendationCandidates(targetDb, queryForCandidates, 6)
        const excludedTitle = (typeof activeGameTitle === 'string' ? activeGameTitle : activeGameTitle?.title) || ''
        candidates = rawCandidates.filter(c => !excludedTitle || c.title.toLowerCase() !== excludedTitle.toLowerCase()).slice(0, 3)
        if (candidates.length === 0) {
          candidates = rawCandidates.slice(0, 3)
        }
      }
    } catch (recErr) {
      console.warn('[AI] Error querying recommendation candidates:', recErr.message)
    }

    if (candidates && candidates.length > 0) {
      const formattedCandidates = candidates.slice(0, 3).map((c) => {
        const timeStr = c.storyHours ? `~${c.storyHours}h story` : 'focused story'
        return `${c.title} (${timeStr}, ${c.genre}) [id: ${c.id}]`
      }).join('; ')
      if (isRejectionOrReaction) {
        const rejectedTitle = (typeof activeGameTitle === 'string' ? activeGameTitle : activeGameTitle?.title) || 'that game'
        if (activePersona.id === 'coop') {
          promptContext = `Candidate Games: [${formattedCandidates}]\nThe player strongly dislikes "${rejectedTitle}" (said it looks like trash/jank). AGREE with their reaction with authentic gamer humor and banter. Pitch one candidate game as a way better pick that actually slaps. Output 1 to 2 punchy sentences followed by the VIEW_DOSSIER action block. Never insult the human player.\n`
        } else {
          promptContext = `Candidate Games: [${formattedCandidates}]\nThe player rejected "${rejectedTitle}". Recommend an alternative from the candidates in 1 short sentence, followed by the VIEW_DOSSIER action block.\n`
        }
      } else if (activePersona.id === 'coop') {
        promptContext = `Candidate Games: [${formattedCandidates}]\nPick the single best match. Output 1 to 2 punchy sentences as a real gamer friend hyping the game or roasting its crazy challenges. Match natural gamer energy. Do NOT start with "Buddy," or "My friend,". Then output the VIEW_DOSSIER action block.\n`
      } else {
        promptContext = `Candidate Games: [${formattedCandidates}]\nPick the single best match and output exactly 1 short sentence stating the title, playtime, and why to play it. Then output the VIEW_DOSSIER action block.\n`
      }
    }
  } else {
    // Simple navigation, launcher commands, chat, or questions: ZERO library text!
    promptContext = ''
  }

  const isQuestionOrKnowledge = !isRejectionOrReaction && (
    /\?/.test(userPrompt) ||
    /\b(?:how|where|what|why|who|when|which|whose|stuck|guide|help|walkthrough|solve|beat|defeat|kill|find|locate|get out|gwet out|pass|progress|puzzle|boss|mission|quest|tip|tips|advice|do here|need to do)\b/i.test(userPrompt) ||
    /\b(?:planning to|planing to|thinking of|wondering|dont know|don't know|can you tell me)\b/i.test(userPrompt)
  )

  isInferring = true
  if (unloadTimer) {
    clearTimeout(unloadTimer)
    unloadTimer = null
  }

  let sequence = null
  let session = null
  try {
    let loaded = null
    try {
      loaded = await ensureEngineLoaded(app)
      sequence = await acquireSequence(loaded.model, loaded.context)
      const { LlamaChatSession } = await getLlamaModule()
      const baseSystemPrompt = activePersona.systemPrompt || SYSTEM_PROMPT
      const cleanedBasePrompt = isQuestionOrKnowledge
        ? baseSystemPrompt
            .replace(/followed by the JSON action block\.?/gi, '')
            .replace(/When recommending a game or executing an action[^\n]*\n?/gi, '')
        : baseSystemPrompt

      const dynamicWebFallbackInstruction = `Dynamic Web Fallbacks: If the user explicitly asks for a video, or if the provided local Guide Chunks lack the specific details needed to solve a puzzle or beat a boss, generate a targeted search link using your internal knowledge of the game.
- For videos, output a Markdown link: [Watch [Specific Boss/Puzzle] Walkthrough on YouTube](https://www.youtube.com/results?search_query=[Game+Title]+[Specific+Puzzle]+walkthrough)
- For wikis, output: [Search [Specific Topic] on PCGamingWiki](https://www.pcgamingwiki.com/w/index.php?search=[Game+Title]+[Specific+Topic])
Make sure to replace spaces in the URL with '+'.`

      const fullSystemPrompt = isQuestionOrKnowledge
        ? `${cleanedBasePrompt}
Answer the player's gameplay, gaming, or walkthrough question directly in your persona voice. If no specific game is active or mentioned, ask which game they are playing or stuck on. Never output JSON action blocks, code blocks, or talk about scanning the library.

${dynamicWebFallbackInstruction}`
        : `${cleanedBasePrompt}

${dynamicWebFallbackInstruction}

Supported actions:
- LAUNCH_GAME: {"action": "LAUNCH_GAME", "payload": {"title": "<game title>"}}
- VIEW_DOSSIER: {"action": "VIEW_DOSSIER", "payload": {"title": "<game title>"}}
- FILTER_SEARCH: {"action": "FILTER_SEARCH", "payload": {"query": "<keyword>"}}
- FILTER_GENRE: {"action": "FILTER_GENRE", "payload": {"genre": "<genre>"}}
- FILTER_STATUS: {"action": "FILTER_STATUS", "payload": {"status": "unplayed" | "playing" | "paused" | "completed"}}
- SWITCH_VIEW: {"action": "SWITCH_VIEW", "payload": {"view": "installed" | "favorites" | "dashboard" | "ready" | "settings"}}
- SCAN_LIBRARY: {"action": "SCAN_LIBRARY", "payload": {}}

Example action output:
Switching to dashboard.
\`\`\`json
{"action": "SWITCH_VIEW", "payload": {"view": "dashboard"}}
\`\`\`
Never output action blocks for general questions or game lore.`

      session = new LlamaChatSession({
        contextSequence: sequence,
        systemPrompt: fullSystemPrompt,
      })
    } catch (engineErr) {
      if (isRecommendationQuery && candidates && candidates.length > 0) {
        const best = candidates[0]
        const timeStr = best.storyHours ? `a focused ${best.storyHours}-hour ` : ''
        const sentence = activePersona.id === 'coop'
          ? `Let's jump into ${best.title} — it's ${timeStr}${best.genre.toLowerCase()} and badass, why the fuck wouldn't we play that?`
          : `Try ${best.title}, ${timeStr}${best.genre.toLowerCase()} standalone story from your backlog.`
        return formatActionResponse({
          action: 'VIEW_DOSSIER',
          payload: { gameId: best.id, id: best.id, title: best.title },
        }, sentence)
      }
      throw engineErr
    }

    // Scoped guide notes if player is asking for walkthrough/guide help on a game
    let guideNotes = ''
    let resolvedGameTitle = (typeof activeGameTitle === 'string' ? activeGameTitle : activeGameTitle?.title) || libraryContext?.activeGame?.title || ''
    const isWalkthroughQuery = !isExplicitSummary && !isRecommendationQuery && isQuestionOrKnowledge
    if (isWalkthroughQuery) {
      if (libraryContext?.guideNotes) {
        guideNotes = `${libraryContext.guideNotes}\n`
      } else {
        try {
          const { searchGameKnowledge, findGameEntityInText, resolveGameByQuery } = require('../../../electron/db.cjs')
          const mentionedGame = targetDb ? findGameEntityInText(targetDb, userPrompt) : null
          if (mentionedGame?.canonical_title) {
            resolvedGameTitle = mentionedGame.canonical_title
          }
          let targetGame = mentionedGame
          if (!targetGame && targetDb && resolvedGameTitle) {
            targetGame = resolveGameByQuery(targetDb, resolvedGameTitle)
          }
          const targetId = targetGame?.id || libraryContext?.activeGame?.id || (typeof activeGameTitle === 'object' ? activeGameTitle?.id : null)
          if (targetDb && targetId) {
            const chunks = searchGameKnowledge(targetDb, targetId, userPrompt, 3, resolvedGameTitle)
            if (chunks && chunks.length > 0) {
              const formattedChunks = chunks.map((c) => `[${c.section_title}]:\n${c.content}`).join('\n\n')
              guideNotes = `Game Guide Context for ${resolvedGameTitle || 'Game'}:\n${formattedChunks}\n\nUser Question: ${userPrompt.trim()}\n\nInstructions: Answer using the specific mechanics, items, and tactics described in the guide context above. Avoid generic filler advice. If the user explicitly asks for a video, or if this guide lacks specific puzzle/boss tactics, output a targeted Markdown link: [Watch [Specific Boss/Puzzle] Walkthrough on YouTube](https://www.youtube.com/results?search_query=${encodeURIComponent(resolvedGameTitle || 'Game').replace(/%20/g, '+')}+[Topic]+walkthrough) or [Search [Specific Topic] on PCGamingWiki](https://www.pcgamingwiki.com/w/index.php?search=${encodeURIComponent(resolvedGameTitle || 'Game').replace(/%20/g, '+')}+[Topic]) with spaces replaced by '+'. Ensure your response is concise (under 120 words) but always completes its final sentence cleanly. Do not leave thoughts unfinished.\n`
            }
          }
        } catch (ragErr) {
          console.warn('[AI] RAG guide search error:', ragErr.message)
        }
      }

      // Check if prompt mentions a game title that wasn't in SQLite
      if (!resolvedGameTitle) {
        const promptGameMatch = userPrompt.match(/\b(?:play|playing|planing to play|planning to play|in|for|on|about)\s+([a-zA-Z0-9\s:''-]+?)(?:\s+(?:and|how|where|what|why|who|stuck|i|can|to|dont|don't|do|guide|walkthrough)|\?|$)/i)
        if (promptGameMatch && promptGameMatch[1]?.trim()) {
          resolvedGameTitle = promptGameMatch[1].trim()
        }
      }

      if (!guideNotes) {
        if (resolvedGameTitle) {
          promptContext = `[Game Context: The player is asking about "${resolvedGameTitle}" ("${userPrompt.trim()}").
In your persona (${activePersona.name}):
- Answer honestly about "${resolvedGameTitle}".
- CRITICAL: Stick STRICTLY to "${resolvedGameTitle}". NEVER hallucinate mechanics from other games (no anime characters, no dating sims, no poems). If you do not know the exact room, puzzle, or scene they mean by "${userPrompt.trim()}", just ask them what specific puzzle, trap, or chapter they are stuck on so you can help them.
- If the player is calling out a previous hallucination or confusion ("what the fuck is that?"), laugh at your glitch ("Haha my bad, total brain-fart! Forget that nonsense") and ask what part of "${resolvedGameTitle}" they need help with.
- Use natural gamer profanity (fuck, shit, damn). Never insult the player personally.]\n`
        } else {
          promptContext = `[Context: The player is asking a gameplay or walkthrough question ("${userPrompt.trim()}"), but no game is currently running or selected in Logpile. Do NOT talk about scanning the library or launcher buttons. In your persona (${activePersona.name}), ask them which game they are playing or stuck on so you can help them.]\n`
        }
      }
    }

    let historyContext = ''
    if (Array.isArray(options?.history) && options.history.length > 0) {
      const recent = options.history.slice(-4)
      const turns = recent.map((m) => {
        const role = m.role === 'user' ? 'Player' : 'Logpile'
        return `${role}: ${m.content}`
      }).join('\n')
      historyContext = `Recent:\n${turns}\n`
    }

    const personaDirective = activePersona.directive ? `${activePersona.directive}\n` : ''
    let prompt
    if (guideNotes) {
      prompt = `${personaDirective}${guideNotes}\n${activePersona.name}:`
    } else {
      prompt = `${personaDirective}${promptContext}${historyContext}Player: ${userPrompt.trim()}\n${activePersona.name}:`
    }

    const isKnowledgeOrGuide = Boolean(guideNotes || isWalkthroughQuery)
    const maxTokens = options?.maxTokens || (isKnowledgeOrGuide ? 512 : 120)
    let rawResponse = ''
    try {
      rawResponse = await session.prompt(prompt, {
        maxTokens,
        temperature: 0.2,
      })
    } catch (promptErr) {
      const msg = promptErr?.message || String(promptErr)
      if (/disposed|abort|context/i.test(msg)) {
        return 'Session interrupted. Please ask your question again.'
      }
      throw promptErr
    }

    // Extract any structured action code block emitted by the model ONLY if it is not a question/knowledge query
    let parsedAction = null

    if (!isQuestionOrKnowledge) {
      // 1. Check code blocks with json, action, or bare code fence
      const blockMatch = (rawResponse || '').match(/```(?:json|action)?\s*(\{[\s\S]*?"action"\s*:[\s\S]*?\})\s*```/i)
      if (blockMatch) {
        try {
          const candidate = JSON.parse(blockMatch[1].trim())
          if (candidate && typeof candidate.action === 'string') {
            parsedAction = candidate
          }
        } catch {}
      }

      // 2. Fallback: balanced JSON block containing "action"
      if (!parsedAction) {
        const balanced = extractBalancedJson(rawResponse || '')
        if (balanced) {
          try {
            const candidate = JSON.parse(balanced.jsonSub)
            if (candidate && typeof candidate.action === 'string') {
              parsedAction = candidate
            }
          } catch {}
        }
      }

      // 3. Fallback: heuristic intent detector
      if (!parsedAction) {
        const detected = detectIntentAction(userPrompt, activeGameTitle, targetDb)
        if (detected) {
          parsedAction = detected
        }
      }
    }

    // Special polish for recommendations:
    if (isRecommendationQuery) {
      let candidate = null
      if (candidates && candidates.length > 0) {
        candidate = candidates.find((c) => {
          const normTitle = c.title.toLowerCase().replace(/[^a-z0-9]/g, '')
          const normResp = (rawResponse || '').toLowerCase().replace(/[^a-z0-9]/g, '')
          return normResp.includes(normTitle)
        }) || candidates[0]
      }

      // Extract the 1-2 sentence recommendation text (strip code blocks)
      let recSentence = (rawResponse || '')
        .replace(/```(?:json|action)?[\s\S]*?```/gi, '')
        .replace(/^(?:Logpile Companion|Logpile|The Storyteller|Action Speedrunner|The Lore-Keeper|The Co-op Buddy|The Tactical Coach|Assistant|AI):\s*/i, '')
        .trim()

      const sentenceMatch = recSentence.match(/^(?:[^.!?\n]+[.!?]?){1,2}/)
      recSentence = sentenceMatch ? sentenceMatch[0].trim() : recSentence
      recSentence = sanitizePlayerRoasting(recSentence)

      if (!recSentence || recSentence.length < 10) {
        if (candidate) {
          const timeStr = candidate.storyHours ? `a focused ${candidate.storyHours}-hour ` : ''
          recSentence = activePersona.id === 'coop'
            ? `Let's jump into ${candidate.title} — it's ${timeStr}${candidate.genre.toLowerCase()} and badass.`
            : `Try ${candidate.title}, ${timeStr}${candidate.genre.toLowerCase()} standalone story from your backlog.`
        } else {
          recSentence = activePersona.id === 'coop'
            ? `Let's pick a game from the backlog and get rolling.`
            : `Here is a great match from your library.`
        }
      }

      const recAction = {
        action: 'VIEW_DOSSIER',
        payload: {
          gameId: candidate?.id || parsedAction?.payload?.gameId || null,
          id: candidate?.id || parsedAction?.payload?.id || null,
          title: candidate?.title || parsedAction?.payload?.title || '',
        },
      }

      return formatActionResponse(recAction, recSentence)
    }

    // If an action was identified for non-recommendations, resolve game title if gameId is missing
    if (parsedAction) {
      if ((parsedAction.action === 'VIEW_DOSSIER' || parsedAction.action === 'VIEW_DETAILS' || parsedAction.action === 'LAUNCH_GAME') && targetDb) {
        try {
          const { resolveGameByQuery } = require('../../../electron/db.cjs')
          const resolved = resolveGameByQuery(targetDb, parsedAction.payload?.title || parsedAction.payload?.gameId)
          if (resolved) {
            parsedAction.payload.gameId = resolved.id
            parsedAction.payload.id = resolved.id
            parsedAction.payload.title = resolved.canonical_title
          }
        } catch {}
      }
      return formatActionResponse(parsedAction)
    }

    let response = scrubDisclaimers(rawResponse).trim()

    // Strip any hallucinated JSON or action code blocks from conversational text
    response = response.replace(/```(?:json|action)?\s*\{[\s\S]*?"action"[\s\S]*?\}\s*```/gi, '').trim()
    response = response.replace(/```(?:json|action)?\s*|```\s*$/gi, '').trim()

    // Strip leading speaker label if echoed by the model
    response = response.replace(/^(?:Logpile Companion|Logpile|The Storyteller|Action Speedrunner|The Lore-Keeper|The Co-op Buddy|The Tactical Coach|Assistant|AI):\s*/i, '').trim()
    response = sanitizePlayerRoasting(response)

    if (!response) {
      if (isExplicitSummary && libraryContext) {
        response = `You have ${libraryContext.installedGamesCount || 0} installed games and ${libraryContext.visibleGames || 0} total.`
      } else {
        response = `Ready to play! Let's get gaming.`
      }
    }

    // Dynamic Web Fallbacks: If player explicitly asks for a video and the response lacks a link, ensure a targeted YouTube link is appended
    const wantsVideo = /\b(?:video|youtube|watch\s+(?:a\s+)?video|clip|walkthrough\s+video)\b/i.test(userPrompt)
    if (wantsVideo && !/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\//i.test(response)) {
      const gTitle = resolvedGameTitle || 'Game'
      const cleanTopic = userPrompt
        .replace(/\b(?:i'm stuck on|im stuck on|i'm stuck|im stuck|stuck on|stuck|show me|give me|find|watch|video|on how to|how to|beat|defeat|final|boss|a video|youtube|can you|please|for|the|about)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'walkthrough'
      const queryParam = `${gTitle} ${cleanTopic} walkthrough`.trim().replace(/\s+/g, '+')
      response += `\n\n[Watch ${cleanTopic ? cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1) : gTitle} Walkthrough on YouTube](https://www.youtube.com/results?search_query=${queryParam})`
    }

    return response
  } finally {
    isInferring = false
    try {
      if (session) await session.dispose?.()
    } catch {}
    try {
      if (sequence && !sequence.disposed) await sequence.dispose()
    } catch {}
    if (unloadPending) {
      unloadPending = false
      unloadEngine().catch(() => {})
    } else {
      resetUnloadTimer()
    }
  }
}

async function recommendFromLibrary(app, userPreferencePrompt, installedGames = [], options = {}) {
  if (!userPreferencePrompt || typeof userPreferencePrompt !== 'string') {
    throw new Error('Please describe what kind of game you want to play.')
  }

  isInferring = true
  if (unloadTimer) {
    clearTimeout(unloadTimer)
    unloadTimer = null
  }

  let sequence = null
  let session = null
  try {
    const loaded = await ensureEngineLoaded(app)
    sequence = await acquireSequence(loaded.model, loaded.context)
    const { LlamaChatSession } = await getLlamaModule()
    session = new LlamaChatSession({
      contextSequence: sequence,
      systemPrompt: `You are Logpile Companion. Keep replies under 10 words. Recommend only from the candidate options provided.`,
    })

    const shuffled = [...installedGames].sort(() => 0.5 - Math.random()).slice(0, 3)
    const candidateTitles = shuffled.map((g) => g.canonical_title || g.title).filter(Boolean)
    const listStr = candidateTitles.length > 0 ? candidateTitles.join(', ') : 'No installed games found'

    const prompt = `Candidate Options: [${listStr}]\nWhat I am looking for: ${userPreferencePrompt.trim()}\nRecommend one game from the candidate options in under 10 words.`

    let response = ''
    try {
      response = await session.prompt(prompt, {
        maxTokens: 64,
        temperature: 0.3,
      })
    } catch (promptErr) {
      const msg = promptErr?.message || String(promptErr)
      if (/disposed|abort|context/i.test(msg)) {
        return ''
      }
      throw promptErr
    }

    return scrubDisclaimers(response) || (response ? response.trim() : '')
  } finally {
    isInferring = false
    try {
      if (session) await session.dispose?.()
    } catch {}
    try {
      if (sequence && !sequence.disposed) await sequence.dispose()
    } catch {}
    if (unloadPending) {
      unloadPending = false
      unloadEngine().catch(() => {})
    } else {
      resetUnloadTimer()
    }
  }
}

async function askQuestion(userPrompt, activeGameTitle = '', options = {}) {
  // Support polymorphic signature: askQuestion(app, userPrompt, activeGameTitle, libraryContext, options)
  if (userPrompt && typeof userPrompt === 'object' && typeof userPrompt.getPath === 'function') {
    return askGamingAssistant(userPrompt, activeGameTitle, options, arguments[3], arguments[4])
  }
  const app = options?.app || null
  const libraryContext = options?.libraryContext || null
  return askGamingAssistant(app, userPrompt, activeGameTitle, libraryContext, options)
}

const FILTER_SYSTEM_PROMPT = `You are a precise JSON extractor for a game library filter.
Extract filtering criteria from the user's natural language request into a valid JSON object.
Output ONLY raw JSON with no explanation, no markdown fences, and no surrounding text.

Keys to extract:
- "genre": string (e.g. "RPG", "Action", "Adventure", "Shooter", "Strategy", "Indie", "Horror", "Puzzle", "Platformer", "Simulation", "Racing", "Sports")
- "max_hltb": number (maximum campaign hours, e.g. 15 for "short", 10 for "under 10 hours", 5 for "bite-sized")
- "min_hltb": number (minimum campaign hours, e.g. 40 for "long" or "epic")
- "unplayed": boolean (true if user specifies unplayed, haven't played, backlog, new)
- "status": string ("unplayed" | "playing" | "completed" | "paused")
- "installed": boolean (true if user specifies installed, downloaded, on my pc)
- "favorites": boolean (true if user specifies favorite or starred)
- "search": string (search keyword if a specific title or franchise was requested)

Example: "Find me a short RPG I haven't played"
{"genre": "RPG", "max_hltb": 15, "unplayed": true}`

function extractLibraryFilterHeuristic(userText) {
  if (!userText || typeof userText !== 'string') return {}
  const t = userText.trim()
  if (!t) return {}

  const filter = {}

  // 1. Genre extraction
  const genrePatterns = [
    { regex: /\b(?:rpgs?|role[- ]playing)\b/i, genre: 'Role-Playing (RPG)' },
    { regex: /\b(?:action)\b/i, genre: 'Action' },
    { regex: /\b(?:adventures?)\b/i, genre: 'Adventure' },
    { regex: /\b(?:shooters?|fps)\b/i, genre: 'Shooter' },
    { regex: /\b(?:strateg(?:y|ies))\b/i, genre: 'Strategy' },
    { regex: /\b(?:indies?)\b/i, genre: 'Indie' },
    { regex: /\b(?:horrors?|scary|spooky)\b/i, genre: 'Horror' },
    { regex: /\b(?:puzzles?)\b/i, genre: 'Puzzle' },
    { regex: /\b(?:platformers?)\b/i, genre: 'Platformer' },
    { regex: /\b(?:rac(?:ing|ers?))\b/i, genre: 'Racing' },
    { regex: /\b(?:sports?)\b/i, genre: 'Sports' },
    { regex: /\b(?:simulat(?:ion|ors?)|sims?)\b/i, genre: 'Simulator' },
    { regex: /\b(?:cozy|chill|relaxing)\b/i, genre: 'Adventure' },
    { regex: /\b(?:stealth)\b/i, genre: 'Stealth' },
    { regex: /\b(?:survival)\b/i, genre: 'Survival' },
    { regex: /\b(?:open[- ]world)\b/i, genre: 'Open World' },
  ]

  for (const gp of genrePatterns) {
    if (gp.regex.test(t)) {
      filter.genre = gp.genre
      break
    }
  }

  // 2. Playtime (HLTB) extraction
  const underHoursMatch = t.match(/\b(?:under|less than|within|below|max(?:imum)? of|at most)\s*(\d+)\s*(?:hours?|hrs?|h)\b/i)
  if (underHoursMatch) {
    filter.max_hltb = parseInt(underHoursMatch[1], 10)
  }

  const overHoursMatch = t.match(/\b(?:over|more than|longer than|above|at least|min(?:imum)? of)\s*(\d+)\s*(?:hours?|hrs?|h)\b/i)
  if (overHoursMatch) {
    filter.min_hltb = parseInt(overHoursMatch[1], 10)
  }

  if (!filter.max_hltb && !filter.min_hltb) {
    if (/\b(?:short|quick|bite[- ]sized|brief|small|fast)\b/i.test(t)) {
      filter.max_hltb = 15
    } else if (/\b(?:long|epic|huge|massive)\b/i.test(t)) {
      filter.min_hltb = 30
    }
  }

  if (/\b(?:haven'?t played|havent played|never played|unplayed|backlog|not played|new)\b/i.test(t)) {
    filter.unplayed = true
    filter.status = 'unplayed'
  } else if (/\b(?:completed|finished|beaten|done)\b/i.test(t)) {
    filter.status = 'completed'
  } else if (/\b(?:playing|in[- ]progress|currently playing)\b/i.test(t)) {
    filter.status = 'playing'
  } else if (/\b(?:paused|on[- ]hold)\b/i.test(t)) {
    filter.status = 'paused'
  }

  if (/\b(?:installed|downloaded|ready to play|on my pc|on disk)\b/i.test(t)) {
    filter.installed = true
  }

  if (/\b(?:favorited?|favourites?|starred)\b/i.test(t)) {
    filter.favorites = true
  }

  return filter
}

async function parseLibraryFilterIntent(userText, options = {}) {
  if (!userText || typeof userText !== 'string' || !userText.trim()) {
    return {}
  }

  const heuristic = extractLibraryFilterHeuristic(userText)

  const app = options?.app || null
  if (app && options.useModel !== false) {
    let sequence = null
    let session = null
    try {
      const status = getModelStatus(app)
      if (status?.ready && status.modelPath) {
        isInferring = true
        if (unloadTimer) {
          clearTimeout(unloadTimer)
          unloadTimer = null
        }
        const loaded = await ensureEngineLoaded(app)
        sequence = await acquireSequence(loaded.model, loaded.context)
        const { LlamaChatSession } = await getLlamaModule()

        session = new LlamaChatSession({
          contextSequence: sequence,
          systemPrompt: FILTER_SYSTEM_PROMPT,
        })

        let rawResponse = ''
        try {
          rawResponse = await session.prompt(`Extract filter criteria as JSON for query: "${userText.trim()}"`, {
            maxTokens: 100,
            temperature: 0.1,
          })
        } catch {}

        const match = (rawResponse || '').match(/\{[\s\S]*?\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          if (parsed && typeof parsed === 'object') {
            return { ...heuristic, ...parsed }
          }
        }
      }
    } catch {} finally {
      isInferring = false
      try { if (session) await session.dispose?.() } catch {}
      try { if (sequence && !sequence.disposed) await sequence.dispose() } catch {}
      if (unloadPending) {
        unloadPending = false
        unloadEngine().catch(() => {})
      } else {
        resetUnloadTimer()
      }
    }
  }

  return heuristic
}

module.exports = {
  getModelStatus,
  getModelsDirectory,
  askQuestion,
  askGamingAssistant,
  recommendFromLibrary,
  unloadEngine,
  detectIntentAction,
  formatActionResponse,
  matchFuzzyView,
  resolvePersonality,
  PERSONALITY_PROFILES,
  parseLibraryFilterIntent,
  extractLibraryFilterHeuristic,
  sanitizePlayerRoasting,
  scrubDisclaimers,
}
