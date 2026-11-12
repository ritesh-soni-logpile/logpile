let cachedToken = null
let cachedClientId = null
let tokenExpiresAt = 0

let logNetworkActivity = null
try {
  const dbModule = require('../../../electron/db.cjs')
  logNetworkActivity = dbModule.logNetworkActivity
} catch {}

async function getIgdbToken(clientId, clientSecret, options = {}) {
  const cleanId = String(clientId || '').trim()
  const cleanSecret = String(clientSecret || '').trim()
  if (!cleanId || !cleanSecret) return null

  const now = Date.now()
  if (cachedToken && cachedClientId === cleanId && tokenExpiresAt > now + 60000) {
    return cachedToken
  }

  try {
    const startTime = Date.now()
    const bodyParams = new URLSearchParams({
      client_id: cleanId,
      client_secret: cleanSecret,
      grant_type: 'client_credentials',
    })
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
    })
    const text = await res.text()
    const byteLength = Buffer.byteLength(text, 'utf8')
    const durationMs = Date.now() - startTime

    if (options?.onBytesTransferred) {
      options.onBytesTransferred({ service: 'Twitch OAuth', endpoint: 'https://id.twitch.tv/oauth2/token', bytes: byteLength, assetType: 'OAuth Token' })
    }
    if (options?.db && logNetworkActivity) {
      try {
        logNetworkActivity(options.db, {
          service: 'Twitch OAuth',
          endpoint: 'https://id.twitch.tv/oauth2/token',
          method: 'POST',
          statusCode: res.status,
          bytesTransferred: byteLength,
          durationMs,
          assetType: 'OAuth Token',
          status: res.ok ? 'success' : 'failed',
        })
      } catch {}
    }

    if (!res.ok) {
      let errData = null
      try { errData = JSON.parse(text) } catch {}
      console.warn('[IGDB] OAuth token request failed with status:', res.status, errData?.message || '')
      return null
    }
    const data = JSON.parse(text)
    if (data?.access_token) {
      cachedToken = data.access_token
      cachedClientId = cleanId
      tokenExpiresAt = now + ((data.expires_in || 3600) * 1000)
      return cachedToken
    }
  } catch (err) {
    console.warn('[IGDB] OAuth token error:', err.message)
  }
  return null
}

async function testIgdbConnection(clientId, clientSecret) {
  const cleanId = String(clientId || '').trim()
  const cleanSecret = String(clientSecret || '').trim()
  if (!cleanId) return { success: false, error: 'IGDB Client ID is required.' }
  if (!cleanSecret) return { success: false, error: 'IGDB Client Secret is required.' }

  try {
    const bodyParams = new URLSearchParams({
      client_id: cleanId,
      client_secret: cleanSecret,
      grant_type: 'client_credentials',
    })
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return {
        success: false,
        error: data?.message ? `Twitch OAuth: ${data.message}` : `HTTP Error ${res.status}`,
      }
    }
    if (data?.access_token) {
      return { success: true, message: 'Authentication successful! Connected to IGDB.' }
    }
    return { success: false, error: 'No access token received from Twitch.' }
  } catch (err) {
    return { success: false, error: err.message || 'Connection failed.' }
  }
}

function cleanTitleForSearch(rawTitle) {
  if (!rawTitle) return ''
  return String(rawTitle)
    .replace(/\s*[\(\[](?:steam|epic|gog|ea|ubisoft|repack|edition|definitive|remastered|goty)[\)\]]/gi, '')
    .replace(/[^\w\s:.'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTitleNoise(title) {
  if (!title) return ''
  const str = String(title || '').trim()

  // Special known DLC / expansion mappings
  const low = str.toLowerCase()
  if (low.includes('dark justiciar shadowheart party pack')) return "Baldur's Gate 3"
  if (low.includes('daggerfall unity')) return "The Elder Scrolls II: Daggerfall"

  let cleaned = str
    .replace(/\s*\((?:tm|r|c)\)/gi, '')
    .replace(/[™®©]/g, '')
    .replace(/\b(?:Single\s*Player|Multiplayer|Singleplayer)\b/gi, ' ')
    .replace(/\b(?:PTS|Public\s+Test\s+Server)\b/gi, ' ')
    .replace(/\b(?:Starter\s+Access)\b/gi, ' ')
    .replace(/\b(?:Xbox\s+Game\s+Studios)\b/gi, ' ')
    .replace(/\b(?:GOG\s+Cut)\b/gi, ' ')
    .replace(/\b(?:Deluxe\s+Edition\s+Upgrade(?:\s+Bundle)?|Upgrade\s+Bundle|Upgrade)\b/gi, ' ')
    .replace(/\b(?:Franchise\s+Bundle|\d+th\s+Anniversary\s+Bundle|Starter\s+Bundle(?:\s*\d+)?|The\s+Daring\s+Lifestyle\s+Bundle|Seasoning'?s\s+Greetings\s+Bundle|Thanatoasty\s+Bundle)\b/gi, ' ')
    .replace(/\b(?:Free\s+Welcome\s+Gift|Decal\s+Pack|Triple\s+Decal\s+Pack|Starter\s+Pack|Founder'?s\s+Pack|Party\s+Pack|Mega\s+Pack|Extras\s+Pack)\b/gi, ' ')
    .replace(/\b(?:Creator\s+Kit|Giveaway|Mega\s+Giveaway|Mega\s+Sale\s+Bundle)\b/gi, ' ')
    .replace(/\b(?<!Hogwarts\s)Legacy\b/gi, ' ')
    .replace(/\b(?:Demo|Prologue|Playtest|Beta|Alpha|ModKit|Standalone|Dedicated Server|Benchmark)\b/gi, ' ')
    .replace(/\b(?:DLC|Bundle|Edition|Definitive|Remastered|Goty|Enhanced|Pack)\b/gi, ' ')
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\s*\[[^\]]*\]/g, ' ')
    .replace(/\s*[-–—:]+\s*$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned
}

function splitCamelCase(text) {
  if (!text) return ''
  return String(text)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d+)/g, '$1 $2')
    .replace(/(\d+)([a-zA-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

function getTitleVariations(rawTitle) {
  const variations = []
  const base = cleanTitleForSearch(rawTitle)
  if (base) variations.push(base)

  const camelSplit = splitCamelCase(rawTitle)
  if (camelSplit && camelSplit.toLowerCase() !== (base || '').toLowerCase() && !variations.includes(camelSplit)) {
    variations.push(camelSplit)
  }

  const stripped = stripTitleNoise(rawTitle)
  if (stripped && stripped.toLowerCase() !== base.toLowerCase() && !variations.includes(stripped)) {
    variations.push(stripped)
  }

  const strippedCamel = stripTitleNoise(camelSplit)
  if (strippedCamel && strippedCamel.toLowerCase() !== (base || '').toLowerCase() && !variations.includes(strippedCamel)) {
    variations.push(strippedCamel)
  }

  if (rawTitle.includes(' -- ') || rawTitle.includes(' - ') || rawTitle.includes(':') || rawTitle.includes('—')) {
    const prefix = cleanTitleForSearch(rawTitle.split(/[:–—]| - | -- /)[0])
    if (prefix && prefix.length >= 2 && !variations.some((v) => v.toLowerCase() === prefix.toLowerCase())) {
      variations.push(prefix)
    }
  }

  return variations
}

function parseIgdbGameRecord(best) {
  if (!best) return null
  let synopsis = (best.summary || best.storyline || '').trim()
  // If summary is just a short technical release note (e.g. "A port for several platforms..."), prefer the full narrative storyline if available
  if (best.storyline && (synopsis.length < 120 || /^(a|this)\s+(port|bundle|release|version)\b/i.test(synopsis))) {
    synopsis = best.storyline.trim()
  }
  const genres = Array.isArray(best.genres)
    ? best.genres.map((g) => g.name).filter(Boolean).join(', ')
    : ''

  const devs = []
  const pubs = []
  if (Array.isArray(best.involved_companies)) {
    for (const ic of best.involved_companies) {
      if (ic.company?.name) {
        if (ic.developer) devs.push(ic.company.name)
        if (ic.publisher) pubs.push(ic.company.name)
      }
    }
  }

  const rawDev = [...new Set(devs)].join(', ').trim()
  const rawPub = [...new Set(pubs)].join(', ').trim()

  // Self-published fallback: if developer is known but publisher is empty (or vice-versa), inherit
  const developer = rawDev || rawPub || null
  const publisher = rawPub || rawDev || null

  let release_date = ''
  if (best.first_release_date) {
    try {
      release_date = new Date(best.first_release_date * 1000).toISOString().split('T')[0]
    } catch {}
  }

  return {
    synopsis: synopsis || null,
    developer,
    publisher,
    release_date: release_date || null,
    genres: genres || null,
    igdbId: best.id,
    name: best.name,
  }
}

async function fetchIgdbBySteamAppId(steamAppId, cleanId, token, signal, options = {}) {
  if (!steamAppId || !/^\d+$/.test(String(steamAppId).trim())) return null
  const body = `fields game.id, game.name, game.summary, game.storyline, game.first_release_date, game.genres.name, game.involved_companies.developer, game.involved_companies.publisher, game.involved_companies.company.name; where uid = "${String(steamAppId).trim()}"; limit 1;`
  try {
    const startTime = Date.now()
    const res = await fetch('https://api.igdb.com/v4/external_games', {
      method: 'POST',
      headers: {
        'Client-ID': cleanId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
        'Accept': 'application/json',
      },
      body,
      signal,
    })
    const text = await res.text()
    const bytes = Buffer.byteLength(text, 'utf8')
    const durationMs = Date.now() - startTime

    if (options?.onBytesTransferred) {
      options.onBytesTransferred({ service: 'IGDB', endpoint: 'https://api.igdb.com/v4/external_games', bytes, assetType: 'IGDB Steam Lookup' })
    }
    if (options?.db && logNetworkActivity) {
      try {
        logNetworkActivity(options.db, {
          service: 'IGDB',
          endpoint: 'https://api.igdb.com/v4/external_games',
          method: 'POST',
          statusCode: res.status,
          bytesTransferred: bytes,
          durationMs,
          gameId: options.gameId || null,
          gameTitle: options.gameTitle || null,
          assetType: 'IGDB Steam Mapping',
          status: res.ok ? 'success' : 'failed',
        })
      } catch {}
    }

    if (!res.ok) return null
    const data = JSON.parse(text)
    if (Array.isArray(data) && data[0]?.game) {
      return parseIgdbGameRecord(data[0].game)
    }
  } catch {}
  return null
}

function normalizeTitle(text) {
  if (!text) return ''
  const split = splitCamelCase(text)
  return String(split)
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[:–—\-_,.'"\(\)\[\]]/g, ' ')
    .replace(/\bviii\b/g, '8')
    .replace(/\bvii\b/g, '7')
    .replace(/\bvi\b/g, '6')
    .replace(/\biv\b/g, '4')
    .replace(/\biii\b/g, '3')
    .replace(/\bii\b/g, '2')
    .replace(/\bv\b/g, '5')
    .replace(/\bi\b/g, '1')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreIgdbCandidate(candidate, targetTitle, options = {}) {
  if (!candidate || !candidate.name || !targetTitle) return 0
  const normTarget = normalizeTitle(targetTitle)
  const normCand = normalizeTitle(candidate.name)
  if (!normTarget || !normCand) return 0

  let score = 0

  // 1. Exact or prefix match (including space-collapsed match)
  const compactTarget = normTarget.replace(/\s+/g, '')
  const compactCand = normCand.replace(/\s+/g, '')

  if (normTarget === normCand || compactTarget === compactCand) {
    score += 100
  } else if (normCand.startsWith(normTarget) || normTarget.startsWith(normCand) || compactCand.startsWith(compactTarget)) {
    const diff = Math.abs(normTarget.length - normCand.length)
    score += Math.max(50, 90 - diff * 2)
  } else {
    // Word overlap ratio
    const targetWords = normTarget.split(' ').filter(Boolean)
    const candWords = normCand.split(' ').filter(Boolean)
    let matchedWords = 0
    for (const w of targetWords) {
      if (candWords.includes(w)) matchedWords++
    }
    const overlapRatio = matchedWords / Math.max(targetWords.length, candWords.length)
    if (overlapRatio < 0.35) return 0
    score += Math.round(overlapRatio * 70)
  }

  // 2. Numeric / Sequel check: if target specifies a number (e.g. 3), candidate MUST match it
  const targetNums = normTarget.match(/\b\d+\b/g) || []
  const candNums = normCand.match(/\b\d+\b/g) || []
  if (targetNums.length > 0) {
    const hasAllNums = targetNums.every((n) => candNums.includes(n))
    if (!hasAllNums) {
      score -= 50
    } else {
      score += 20
    }
  }

  // 3. Category preference (0: Main Game, 8: Remake, 9: Remaster, 10: Expanded, 11: Port)
  const cat = candidate.category
  if (cat === 0) {
    score += 35 // Canonical main game is highest priority
  } else if (cat === 8) {
    score += 25 // Remake
  } else if (cat === 9) {
    score += 20 // Remaster
  } else if (cat === 10 || cat === 11) {
    score += 10 // Port / Expanded
  } else if (cat === 1) { // DLC / Addon
    score -= 40
  } else if (cat === 3) { // Bundle
    score -= 30
  }

  // 4. Platform context preference
  const platforms = Array.isArray(candidate.platforms) ? candidate.platforms.map((p) => p.name || '') : []
  const hasPc = platforms.some((p) => {
    const pl = p.toLowerCase()
    return pl.includes('pc') || pl.includes('windows')
  })

  if (options.isStorePc) {
    // Game is from an official PC store (Steam, Epic, GOG, EA, Ubisoft, Xbox)
    if (hasPc) score += 40
    else score -= 40
  } else {
    // Standalone (recompilations, fan ports, console ports): PC is a slight bonus, but console is NOT penalized
    if (hasPc) score += 10
  }

  return Math.max(0, score)
}

async function fetchIgdbMetadata(title, clientId, clientSecret, signal, steamAppId = null, options = {}) {
  const cleanId = String(clientId || '').trim()
  const cleanSecret = String(clientSecret || '').trim()
  if ((!title && !steamAppId) || !cleanId || !cleanSecret) return null

  const token = await getIgdbToken(cleanId, cleanSecret)
  if (!token) return null

  // Strategy 1: If Steam App ID is available, query IGDB external_games directly ONLY if the title matches closely
  if (steamAppId) {
    try {
      const fromSteam = await fetchIgdbBySteamAppId(steamAppId, cleanId, token, signal, options)
      if (fromSteam) {
        // Validate that this external game title actually matches our target
        const simScore = scoreIgdbCandidate({ name: fromSteam.canonicalTitle || title, category: 0 }, title, options)
        if (simScore >= 35) return fromSteam
      }
    } catch {}
  }

  // Strategy 2: Title search with Smart Candidate Scoring (no blind results[0] fallback)
  const queries = getTitleVariations(title)
  for (const queryTitle of queries) {
    if (signal?.aborted) break
    const escapedTitle = queryTitle.replace(/["\\]/g, '\\$&')

    // 2a. Fast path: Direct exact name match on IGDB
    try {
      const exactQuery = `where name = "${escapedTitle}"; fields name, summary, storyline, first_release_date, category, platforms.name, genres.name, involved_companies.developer, involved_companies.publisher, involved_companies.company.name; limit 3;`
      const startTime = Date.now()
      const exactRes = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': cleanId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
          'Accept': 'application/json',
        },
        body: exactQuery,
        signal,
      })
      const exactText = await exactRes.text()
      const exactBytes = Buffer.byteLength(exactText, 'utf8')
      const durationMs = Date.now() - startTime

      if (options?.onBytesTransferred) {
        options.onBytesTransferred({ service: 'IGDB', endpoint: 'https://api.igdb.com/v4/games', bytes: exactBytes, assetType: 'IGDB Metadata' })
      }
      if (options?.db && logNetworkActivity) {
        try {
          logNetworkActivity(options.db, {
            service: 'IGDB',
            endpoint: 'https://api.igdb.com/v4/games',
            method: 'POST',
            statusCode: exactRes.status,
            bytesTransferred: exactBytes,
            durationMs,
            gameId: options.gameId || null,
            gameTitle: options.gameTitle || title,
            assetType: 'IGDB Metadata',
            status: exactRes.ok ? 'success' : 'failed',
          })
        } catch {}
      }

      if (exactRes.ok) {
        const exactMatches = JSON.parse(exactText)
        if (Array.isArray(exactMatches) && exactMatches.length > 0) {
          const record = parseIgdbGameRecord(exactMatches[0])
          if (record) {
            record.igdbId = exactMatches[0].id
            return record
          }
        }
      }
    } catch {}

    // 2b. Fuzzy search query
    const bodyQuery = `search "${escapedTitle}"; fields name, summary, storyline, first_release_date, category, platforms.name, genres.name, involved_companies.developer, involved_companies.publisher, involved_companies.company.name; limit 15;`

    try {
      const startTime = Date.now()
      const res = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': cleanId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
          'Accept': 'application/json',
        },
        body: bodyQuery,
        signal,
      })
      const resText = await res.text()
      const resBytes = Buffer.byteLength(resText, 'utf8')
      const durationMs = Date.now() - startTime

      if (options?.onBytesTransferred) {
        options.onBytesTransferred({ service: 'IGDB', endpoint: 'https://api.igdb.com/v4/games', bytes: resBytes, assetType: 'IGDB Metadata' })
      }
      if (options?.db && logNetworkActivity) {
        try {
          logNetworkActivity(options.db, {
            service: 'IGDB',
            endpoint: 'https://api.igdb.com/v4/games',
            method: 'POST',
            statusCode: res.status,
            bytesTransferred: resBytes,
            durationMs,
            gameId: options.gameId || null,
            gameTitle: options.gameTitle || title,
            assetType: 'IGDB Metadata',
            status: res.ok ? 'success' : 'failed',
          })
        } catch {}
      }

      if (res.ok) {
        const results = JSON.parse(resText)
        if (Array.isArray(results) && results.length) {
          // Score each candidate against the original target title
          const scored = results
            .map((item) => ({
              item,
              score: scoreIgdbCandidate(item, title, options),
            }))
            .filter((entry) => entry.score >= 35)
            .sort((a, b) => b.score - a.score)

          if (scored.length > 0) {
            const bestCandidate = scored[0].item
            const record = parseIgdbGameRecord(bestCandidate)
            if (record) {
              record.igdbId = bestCandidate.id
              return record
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return null
      console.warn('[IGDB] Search error for', queryTitle, ':', err.message)
    }
  }

  return null
}

module.exports = {
  getIgdbToken,
  testIgdbConnection,
  fetchIgdbMetadata,
  stripTitleNoise,
  getTitleVariations,
  fetchIgdbBySteamAppId,
  normalizeTitle,
  scoreIgdbCandidate,
  splitCamelCase,
}

