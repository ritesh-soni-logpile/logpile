const { updateGameHltb } = require('../../../electron/db.cjs')

let cachedToken = null
let tokenExpiresAt = 0

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function getHltbToken() {
  const now = Date.now()
  if (cachedToken && tokenExpiresAt > now) {
    return cachedToken
  }
  try {
    const res = await fetch(`https://howlongtobeat.com/api/search/site/init?t=${now}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://howlongtobeat.com/',
      },
    })
    if (!res.ok) {
      console.warn('[HLTB] Init token returned status:', res.status)
      return null
    }
    const data = await res.json()
    if (data?.token) {
      cachedToken = data.token
      // Cache token for 20 minutes
      tokenExpiresAt = now + (20 * 60 * 1000)
      return cachedToken
    }
  } catch (err) {
    console.warn('[HLTB] Failed to get init token:', err.message)
  }
  return null
}

function cleanTitleForHltb(title) {
  if (!title) return ''
  return String(title)
    .replace(/(?:[\uFFFD\u00BF]\?Ts|\?Ts)/gi, "'s")
    .replace(/[\uFFFD\u00BF][^a-zA-Z0-9\s]*[\uFFFD\u00BF]/g, ' ')
    .replace(/[\uFFFD\u00BF]/g, ' ')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[™®©]/g, '')
    .replace(/\s*\(\d{4}\)/g, '')
    .replace(/\s*\((?:or\s+)?[^)]+\)/gi, '')
    .replace(/\s*[\(\[][^()\[\]]*(?:steam|epic|gog|ea|ubisoft|repack|edition|definitive|remastered|goty|cut|version|build|patch|update|unplayed|bundle|pack|demo|prologue|beta)[^()\[\]]*[\)\]]/gi, '')
    .replace(/\s*[-–—:]?\s*\b(?:standard|deluxe|digital deluxe|premium|collector'?s?|special|definitive|remastered|enhanced|anniversary|complete|goty|game of the year|director'?s? cut|spacer'?s? choice|omega|starter|platinum|ultimate|celebration|legacy|gold|silver|royale|first contact|day one|launch|master assassin|elite nightfall)\s+edition\b.*$/gi, '')
    .replace(/\s*[-–—:]\s*(?:[A-Za-z0-9'\s]+)?\s*edition\b.*$/gi, '')
    .replace(/\s*\b(?:game of the year edition|goty edition|definitive edition|remastered|enhanced edition)\b.*$/gi, '')
    .replace(/\s*[-–—:]\s*(?:prologue|beta|demo|starter pack|starter edition|ultimate edition|redmod)\b.*$/gi, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\?+/g, '')
    .replace(/[:–—\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

async function queryHltbApi(searchTerms) {
  const token = await getHltbToken()
  if (!token) return []

  const payload = {
    searchType: 'games',
    searchTerms,
    searchPage: 1,
    size: 10,
    searchOptions: {
      games: {
        userId: 0,
        platform: '',
        sortCategory: 'popular',
        rangeCategory: 'main',
        rangeTime: { min: null, max: null },
        gameplay: { perspective: '', flow: '', genre: '', difficulty: '' },
        rangeYear: { min: '', max: '' },
        modifier: '',
      },
      users: { sortCategory: 'postcount' },
      lists: { sortCategory: 'follows' },
      filter: '',
      sort: 0,
      randomizer: 0,
    },
    useCache: true,
  }

  try {
    const res = await fetch('https://howlongtobeat.com/api/search/site', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
        'Referer': 'https://howlongtobeat.com/',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      if (res.status === 403) {
        cachedToken = null
        tokenExpiresAt = 0
      }
      return []
    }

    const json = await res.json()
    return Array.isArray(json?.data) ? json.data : []
  } catch {
    return []
  }
}

async function fetchHltbStats(rawTitle) {
  const cleanedTitle = cleanTitleForHltb(rawTitle)
  if (!cleanedTitle || cleanedTitle.length < 2) return null

  // 1. Primary search with cleaned title
  let terms = cleanedTitle.split(/\s+/).filter(Boolean).slice(0, 5)
  let candidates = await queryHltbApi(terms)

  // 2. Fallback: If 0 results and title had a colon/dash, try main title prefix
  if (!candidates.length && /[:–—\-]/.test(rawTitle)) {
    const prefix = cleanTitleForHltb(rawTitle.split(/[:–—\-]/)[0])
    if (prefix && prefix.length >= 3 && prefix !== cleanedTitle) {
      terms = prefix.split(/\s+/).filter(Boolean).slice(0, 5)
      candidates = await queryHltbApi(terms)
    }
  }

  // 3. Fallback: If still 0 results and more than 2 words, try first 2 words
  if (!candidates.length && terms.length > 2) {
    const shortTerms = terms.slice(0, 2)
    candidates = await queryHltbApi(shortTerms)
  }

  if (!candidates.length) return null

  // Pick best match using normalized equality and token overlap
  const targetNorm = normalize(cleanedTitle)
  const targetTokens = cleanedTitle.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
  let best = null
  let bestScore = -1

  for (const cand of candidates) {
    const candNorm = normalize(cand.game_name)
    if (candNorm === targetNorm) {
      best = cand
      break
    }

    let score = 0
    if (candNorm.includes(targetNorm) || targetNorm.includes(candNorm)) score += 50
    const candLower = cand.game_name.toLowerCase()
    const matchingTokens = targetTokens.filter((t) => candLower.includes(t))
    score += (matchingTokens.length / Math.max(1, targetTokens.length)) * 40
    if (cand.comp_main > 0) score += 5

    if (score > bestScore) {
      bestScore = score
      best = cand
    }
  }

  // Only fallback to candidates[0] if it meets minimal confidence threshold
  if (!best && candidates.length > 0) {
    const firstCand = candidates[0]
    const firstLower = firstCand.game_name.toLowerCase()
    const sharesToken = targetTokens.some((t) => firstLower.includes(t))
    if (sharesToken) {
      best = firstCand
    }
  }

  if (!best) return null

  const mainH = best.comp_main > 0
    ? Math.max(1, Math.round(best.comp_main / 3600))
    : (best.comp_plus > 0 ? Math.max(1, Math.round(best.comp_plus / 3600)) : null)

  return {
    hltbId: best.game_id,
    name: best.game_name,
    mainHours: mainH,
    extraHours: best.comp_plus > 0 ? Math.round(best.comp_plus / 3600) : null,
    completionistHours: best.comp_100 > 0 ? Math.round(best.comp_100 / 3600) : null,
    score: best.review_score > 0 ? best.review_score : null,
  }
}

async function fetchAndSaveHltb(db, gameId, gameTitle) {
  if (!db || !gameId || !gameTitle) return null
  const stats = await fetchHltbStats(gameTitle)
  if (!stats) {
    try {
      updateGameHltb(db, gameId, { hltbId: -1, mainHours: null, extraHours: null, completionistHours: null, score: null })
    } catch {}
    return null
  }
  return updateGameHltb(db, gameId, stats)
}

module.exports = {
  getHltbToken,
  cleanTitleForHltb,
  fetchHltbStats,
  fetchAndSaveHltb,
}
