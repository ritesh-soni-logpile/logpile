/**
 * Logpile Knowledge & FTS5 Indexer Service
 * Encapsulates game guide chunking, full-text search (FTS5), recommendation candidate querying,
 * and conversational game entity extraction.
 */

let _activeDb = null

function setActiveDb(db) {
  _activeDb = db
}

function getActiveDb() {
  return _activeDb
}

function insertKnowledgeChunk(arg1, arg2, arg3, arg4, arg5) {
  let db, gameId, canonicalTitle, sectionTitle, content
  if (arg1 && typeof arg1.prepare === 'function') {
    db = arg1
    gameId = arg2
    canonicalTitle = arg3
    sectionTitle = arg4
    content = arg5
  } else {
    db = _activeDb
    gameId = arg1
    canonicalTitle = arg2
    sectionTitle = arg3
    content = arg4
  }

  if (!db || !gameId || !sectionTitle || !content) return null
  try {
    const stmt = db.prepare(`
      INSERT INTO game_knowledge (game_id, canonical_title, section_title, content)
      VALUES (?, ?, ?, ?)
    `)
    const result = stmt.run(String(gameId), String(canonicalTitle || ''), String(sectionTitle).trim(), String(content).trim())
    return result.lastInsertRowid
  } catch (err) {
    console.warn('[Indexer] insertKnowledgeChunk error:', err.message)
    return null
  }
}

const KNOWLEDGE_STOP_WORDS = new Set([
  'how', 'what', 'where', 'when', 'why', 'who', 'the', 'and', 'for', 'with', 'from',
  'about', 'into', 'over', 'after', 'can', 'could', 'should', 'would', 'will', 'are',
  'is', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'does', 'did', 'doing',
  'tell', 'give', 'help', 'tips', 'guide', 'game', 'play', 'playing', 'please',
  'some', 'any', 'that', 'this', 'then', 'than', 'them', 'they', 'your', 'you',
  'much', 'more', 'most', 'very', 'just', 'also'
])

const KNOWLEDGE_NOISE_PHRASES = [
  /\bgive\s+me\b/gi,
  /\btop\s+\d+\b/gi,
  /\bessential\b/gi,
  /\bbeginners?\b/gi,
  /\btips?\b/gi,
  /\badvice\b/gi,
  /\bhow\s+to\b/gi,
  /\bwhat\s+is\b/gi,
  /\bcan\s+you\b/gi,
  /\bmechanics?\b/gi,
  /\bwalkthrough\b/gi,
  /\bguides?\b/gi,
  /\boverview\b/gi,
  /\bbasics?\b/gi,
  /\bbest\b/gi,
]

function searchGameKnowledge(arg1, arg2, arg3, arg4, arg5) {
  let db, gameId, query, limit, canonicalTitle
  if (arg1 && typeof arg1.prepare === 'function') {
    db = arg1
    gameId = arg2
    query = arg3
    limit = arg4
    canonicalTitle = arg5
  } else {
    db = _activeDb
    gameId = arg1
    query = arg2
    limit = arg3
    canonicalTitle = arg4
  }

  if (!db || !gameId) return []

  const safeLimit = Math.max(1, Math.min(10, Number(limit) || 3))

  let resolvedId = String(gameId)
  let resolvedTitle = canonicalTitle || ''
  try {
    const row = db.prepare('SELECT id, canonical_title FROM games WHERE id = ? OR canonical_title = ? LIMIT 1').get(String(gameId), String(gameId))
    if (row) {
      resolvedId = String(row.id)
      if (!resolvedTitle) resolvedTitle = row.canonical_title
    }
  } catch {}

  const rawQuery = typeof query === 'string' ? query : ''
  let cleanQuery = rawQuery.toLowerCase()

  // 1. Strip meta-phrases and conversational noise
  for (const rx of KNOWLEDGE_NOISE_PHRASES) {
    cleanQuery = cleanQuery.replace(rx, ' ')
  }

  // 2. Strip game title itself (game_id already filters by game)
  if (resolvedTitle) {
    const titleWords = resolvedTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
    for (const tw of titleWords) {
      cleanQuery = cleanQuery.replace(new RegExp(`\\b${tw}\\b`, 'gi'), ' ')
    }
  }

  // 3. Extract core nouns/verbs (min length >= 3, excluding stop words)
  const tokens = cleanQuery
    .replace(/[^a-z0-9\s]/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !KNOWLEDGE_STOP_WORDS.has(w))

  let results = []

  // Run FTS MATCH only if clean keywords remain (never run blank MATCH)
  if (tokens.length > 0) {
    const matchExpr = tokens.map((token) => `"${token}"*`).join(' OR ')
    try {
      results = db.prepare(`
        SELECT section_title, content
        FROM game_knowledge_fts
        WHERE game_knowledge_fts MATCH ? AND game_id = ?
        ORDER BY rank
        LIMIT ?
      `).all(matchExpr, resolvedId, safeLimit) || []
    } catch (err) {
      console.warn('[Indexer] searchGameKnowledge FTS error:', err.message)
    }
  }

  // Fallback to foundational guide chunks if 0 matches or query was general overview/tips
  if (!results || results.length === 0) {
    try {
      results = db.prepare(`
        SELECT section_title, content
        FROM game_knowledge_fts
        WHERE game_knowledge_fts MATCH ? AND game_id = ?
        ORDER BY rowid ASC
        LIMIT ?
      `).all(resolvedId, safeLimit) || []
    } catch (fallbackErr) {
      try {
        results = db.prepare(`
          SELECT section_title, content
          FROM game_knowledge_fts
          WHERE game_id = ?
          ORDER BY rowid ASC
          LIMIT ?
        `).all(resolvedId, safeLimit) || []
      } catch (err2) {
        console.warn('[Indexer] searchGameKnowledge fallback error:', err2.message)
      }
    }
  }

  // Filter out non-content chunks (e.g. wiki category links with no walkthrough text)
  const isMeaningful = (text) => {
    if (!text || typeof text !== 'string') return false
    const stripped = text.replace(/^Category:[^\r\n]+/gim, '').trim()
    return stripped.length >= 25
  }

  return (results || []).filter((r) => isMeaningful(r.content))
}

function hasGuide(arg1, arg2) {
  let db, gameId
  if (arg1 && typeof arg1.prepare === 'function') {
    db = arg1
    gameId = arg2
  } else {
    db = _activeDb
    gameId = arg1
  }

  if (!db || !gameId) return false
  try {
    const row = db.prepare('SELECT 1 FROM game_knowledge WHERE game_id = ? OR canonical_title = ? LIMIT 1').get(String(gameId), String(gameId))
    if (row) return true
    const gRow = db.prepare('SELECT has_guide FROM games WHERE id = ? LIMIT 1').get(String(gameId))
    return Boolean(gRow?.has_guide)
  } catch (err) {
    console.warn('[Indexer] hasGuide error:', err.message)
    return false
  }
}

function deleteGameKnowledge(arg1, arg2) {
  let db, gameId
  if (arg1 && typeof arg1.prepare === 'function') {
    db = arg1
    gameId = arg2
  } else {
    db = _activeDb
    gameId = arg1
  }

  if (!db || !gameId) return 0
  try {
    const info = db.prepare('DELETE FROM game_knowledge WHERE game_id = ? OR canonical_title = ?').run(String(gameId), String(gameId))
    try {
      db.prepare('UPDATE games SET has_guide = 0 WHERE id = ?').run(String(gameId))
    } catch {}
    return info.changes || 0
  } catch (err) {
    console.warn('[Indexer] deleteGameKnowledge error:', err.message)
    return 0
  }
}

function findRecommendationCandidates(arg1, arg2, arg3) {
  let db, userPrompt, limit
  if (arg1 && typeof arg1.prepare === 'function') {
    db = arg1
    userPrompt = arg2
    limit = arg3
  } else {
    db = _activeDb
    userPrompt = arg1
    limit = arg2
  }

  if (!db) return []

  const p = String(userPrompt || '').toLowerCase()
  const safeLimit = Math.max(1, Math.min(10, Number(limit) || 5))

  let maxHours = null
  let minHours = null
  const underMatch = p.match(/\b(?:under|less than|within|around)\s+(\d+)\s*(?:h|hrs|hours)?\b/i)
    || p.match(/\b(\d+)\s*(?:h|hrs|hours)\s*(?:or less|max)\b/i)
  if (underMatch) {
    maxHours = Number(underMatch[1])
  } else if (/\b(short|quick|bite-sized|snack|fast|short game|short games)\b/i.test(p)) {
    maxHours = 10
  } else if (/\b(long|epic|massive|deep|huge)\b/i.test(p)) {
    minHours = 25
  }

  const GENRES = [
    'rpg', 'shooter', 'fps', 'action', 'horror', 'scary', 'adventure',
    'strategy', 'indie', 'simulation', 'sports', 'racing', 'puzzle',
    'open world', 'survival', 'stealth', 'platformer'
  ]
  const matchedGenre = GENRES.find((g) => p.includes(g))

  let statusCondition = ''
  if (/\b(unplayed|backlog|not started|never played|haven't played)\b/i.test(p)) {
    statusCondition = "AND (status = 'unplayed' OR backlog_status = 'unplayed')"
  } else if (/\b(playing|in progress|current)\b/i.test(p)) {
    statusCondition = "AND (status = 'playing' OR backlog_status = 'playing')"
  }

  const preferInstalled = !/\b(ready to install|not installed|download|backlog catalog)\b/i.test(p)

  let whereClauses = ['is_utility = 0', 'is_dlc = 0', 'is_hidden = 0']
  const params = []

  if (preferInstalled) {
    whereClauses.push('is_installed = 1')
  }

  if (statusCondition) {
    whereClauses.push(statusCondition.replace(/^AND\s+/i, ''))
  }

  if (matchedGenre) {
    const cleanG = matchedGenre === 'fps' ? 'shooter' : matchedGenre === 'scary' ? 'horror' : matchedGenre
    whereClauses.push('(LOWER(genre) LIKE ? OR LOWER(genres) LIKE ?)')
    params.push(`%${cleanG}%`, `%${cleanG}%`)
  }

  if (maxHours !== null) {
    whereClauses.push('(hltb_main_hours IS NOT NULL AND hltb_main_hours > 0 AND hltb_main_hours <= ?)')
    params.push(maxHours)
  } else if (minHours !== null) {
    whereClauses.push('(hltb_main_hours IS NOT NULL AND hltb_main_hours >= ?)')
    params.push(minHours)
  }

  const sql = `
    SELECT id, canonical_title, genre, hltb_main_hours, play_time_seconds, status, is_installed
    FROM games
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY RANDOM()
    LIMIT ?
  `

  try {
    let rows = db.prepare(sql).all(...params, safeLimit)

    if (rows.length < 2 && preferInstalled) {
      const relaxedWhere = ['is_utility = 0', 'is_dlc = 0', 'is_hidden = 0']
      const relaxedParams = []
      if (matchedGenre) {
        const cleanG = matchedGenre === 'fps' ? 'shooter' : matchedGenre === 'scary' ? 'horror' : matchedGenre
        relaxedWhere.push('(LOWER(genre) LIKE ? OR LOWER(genres) LIKE ?)')
        relaxedParams.push(`%${cleanG}%`, `%${cleanG}%`)
      }
      const fallbackSql = `
        SELECT id, canonical_title, genre, hltb_main_hours, play_time_seconds, status, is_installed
        FROM games
        WHERE ${relaxedWhere.join(' AND ')}
        ORDER BY is_installed DESC, RANDOM()
        LIMIT ?
      `
      rows = db.prepare(fallbackSql).all(...relaxedParams, safeLimit)
    }

    if (rows.length === 0) {
      rows = db.prepare(`
        SELECT id, canonical_title, genre, hltb_main_hours, play_time_seconds, status, is_installed
        FROM games
        WHERE is_utility = 0 AND is_dlc = 0 AND is_hidden = 0 AND is_installed = 1
        ORDER BY RANDOM()
        LIMIT ?
      `).all(safeLimit)
    }

    return rows.map((r) => ({
      id: r.id,
      title: r.canonical_title,
      genre: r.genre || 'Action',
      storyHours: r.hltb_main_hours || null,
      hoursPlayed: Math.round(((r.play_time_seconds || 0) / 3600) * 10) / 10,
      isInstalled: Boolean(r.is_installed),
      status: r.status || 'unplayed',
    }))
  } catch (err) {
    console.warn('[Indexer] findRecommendationCandidates error:', err.message)
    return []
  }
}

function resolveGameByQuery(arg1, arg2) {
  let db, queryStr
  if (arg1 && typeof arg1.prepare === 'function') {
    db = arg1
    queryStr = arg2
  } else {
    db = _activeDb
    queryStr = arg1
  }

  if (!db || !queryStr || typeof queryStr !== 'string') return null
  const raw = queryStr.trim()
  if (!raw) return null

  try {
    // 0. Strip conversational intent prefixes
    let stripped = raw
      .replace(/^(?:i\s+(?:wanna|want\s+to|would\s+like\s+to)|can\s+you|could\s+you|please|pls|let'?s|just|khelna\s+hai)\s+/gi, '')
      .replace(/^(?:check(?:\s+out)?|look\s+at|show(?:\s+me)?|open|view|tell\s+me\s+about|details\s+(?:for|on)?|info\s+(?:on|about)?|dossier\s+(?:for|on)?)\s+/gi, '')
      .replace(/^(?:launch|play|start|run|boot)\s+/gi, '')
      .trim()

    // 1. Exact match (case-insensitive) on raw or stripped
    let row = db.prepare('SELECT id, canonical_title, is_installed FROM games WHERE canonical_title = ? COLLATE NOCASE AND is_utility = 0 LIMIT 1').get(raw)
    if (!row && stripped && stripped.toLowerCase() !== raw.toLowerCase()) {
      row = db.prepare('SELECT id, canonical_title, is_installed FROM games WHERE canonical_title = ? COLLATE NOCASE AND is_utility = 0 LIMIT 1').get(stripped)
    }
    if (row) return { id: row.id, canonical_title: row.canonical_title, title: row.canonical_title, is_installed: Boolean(row.is_installed) }

    // 2. Strip noise words ('game', 'the', 'details', 'edition', 'open', 'launch', etc.)
    const noiseRegex = /\b(?:the|a|an|game|games|video game|khel|khelo|play|launch|open|view|show|check|details|dossier|page|edition|goty|remastered|deluxe|please|pls|info)\b/gi
    const targetSource = stripped || raw
    const cleaned = targetSource.replace(noiseRegex, ' ').replace(/[:–—\-_"']/g, ' ').replace(/\s+/g, ' ').trim()

    if (cleaned && cleaned.toLowerCase() !== raw.toLowerCase()) {
      row = db.prepare('SELECT id, canonical_title, is_installed FROM games WHERE canonical_title = ? COLLATE NOCASE AND is_utility = 0 LIMIT 1').get(cleaned)
      if (row) return { id: row.id, canonical_title: row.canonical_title, title: row.canonical_title, is_installed: Boolean(row.is_installed) }
    }

    // 3. Normalized title match
    const normRaw = raw.toLowerCase().replace(/[^a-z0-9]/g, '')
    const normStripped = stripped ? stripped.toLowerCase().replace(/[^a-z0-9]/g, '') : ''
    const normClean = cleaned ? cleaned.toLowerCase().replace(/[^a-z0-9]/g, '') : ''
    for (const n of [normStripped, normClean, normRaw].filter(Boolean)) {
      row = db.prepare('SELECT id, canonical_title, is_installed FROM games WHERE normalized_title = ? AND is_utility = 0 LIMIT 1').get(n)
      if (row) return { id: row.id, canonical_title: row.canonical_title, title: row.canonical_title, is_installed: Boolean(row.is_installed) }
    }

    // 4. Substring / Prefix match
    const searchPhrase = (cleaned && cleaned.length >= 3) ? cleaned : ((stripped && stripped.length >= 3) ? stripped : (raw.length >= 3 ? raw : ''))
    if (searchPhrase) {
      row = db.prepare(`
        SELECT id, canonical_title, is_installed FROM games
        WHERE canonical_title LIKE ? AND is_utility = 0
        ORDER BY
          CASE WHEN canonical_title LIKE ? THEN 0 ELSE 1 END,
          is_installed DESC,
          length(canonical_title) ASC
        LIMIT 1
      `).get(`%${searchPhrase}%`, `${searchPhrase}%`)
      if (row) return { id: row.id, canonical_title: row.canonical_title, title: row.canonical_title, is_installed: Boolean(row.is_installed) }
    }

    // 5. Token-based multi-word match (e.g. 'phantom' + 'blade')
    const tokens = (cleaned || stripped || raw).split(/\s+/).filter((t) => t.length > 2)
    if (tokens.length >= 2) {
      const whereClauses = tokens.map(() => 'canonical_title LIKE ?').join(' AND ')
      const params = tokens.map((t) => `%${t}%`)
      row = db.prepare(`
        SELECT id, canonical_title, is_installed FROM games
        WHERE is_utility = 0 AND ${whereClauses}
        ORDER BY is_installed DESC, length(canonical_title) ASC
        LIMIT 1
      `).get(...params)
      if (row) return { id: row.id, canonical_title: row.canonical_title, title: row.canonical_title, is_installed: Boolean(row.is_installed) }
    }
  } catch (err) {
    console.warn('[Indexer] resolveGameByQuery error:', err.message)
  }

  return null
}

const QUESTION_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'about', 'from', 'into', 'in', 'on', 'at', 'to', 'by', 'of',
  'how', 'what', 'where', 'why', 'who', 'when', 'which', 'can', 'could', 'would', 'should',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'their', 'me', 'us',
  'planing', 'planning', 'play', 'playing', 'played', 'start', 'starting', 'launch', 'launching',
  'know', 'knows', 'knew', 'dont', 'dont know', 'tell', 'help', 'stuck', 'get', 'getting', 'out',
  'village', 'game', 'games', 'video', 'please', 'just', 'like', 'want', 'wanna',
  'defeat', 'beat', 'kill', 'pass', 'solve', 'escape', 'find', 'locate', 'build', 'best', 'guide',
  'walkthrough', 'tips', 'tip', 'advice', 'boss', 'mission', 'quest', 'level', 'chapter', 'area'
])

function findGameEntityInText(arg1, arg2) {
  let db, text
  if (arg1 && typeof arg1.prepare === 'function') {
    db = arg1
    text = arg2
  } else {
    db = _activeDb
    text = arg1
  }

  if (!db || !text || typeof text !== 'string') return null
  const p = text.trim()
  if (!p) return null

  try {
    // 1. Normalized title substring match
    const norm = p.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (norm.length >= 4) {
      const row = db.prepare(`
        SELECT id, canonical_title, is_installed
        FROM games
        WHERE is_utility = 0 AND length(normalized_title) >= 4 AND ? LIKE ('%' || normalized_title || '%')
        ORDER BY is_installed DESC, length(normalized_title) DESC
        LIMIT 1
      `).get(norm)
      if (row) return { id: row.id, canonical_title: row.canonical_title, title: row.canonical_title, is_installed: Boolean(row.is_installed) }
    }

    // 2. Token n-grams (3-grams, 2-grams)
    const tokens = p.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 0)
    for (let len = Math.min(tokens.length, 4); len >= 2; len--) {
      for (let i = 0; i <= tokens.length - len; i++) {
        const slice = tokens.slice(i, i + len)
        if (slice.every(t => QUESTION_STOP_WORDS.has(t))) continue
        const phrase = slice.join(' ')
        if (phrase.length < 4) continue

        const candidate = db.prepare(`
          SELECT id, canonical_title, is_installed
          FROM games
          WHERE is_utility = 0 AND canonical_title LIKE ?
          ORDER BY is_installed DESC, length(canonical_title) ASC
          LIMIT 1
        `).get(`%${phrase}%`)
        if (candidate) {
          return { id: candidate.id, canonical_title: candidate.canonical_title, title: candidate.canonical_title, is_installed: Boolean(candidate.is_installed) }
        }
      }
    }

    // 3. Single distinct significant token (length >= 5, not a stop word)
    for (const token of tokens) {
      if (token.length >= 5 && !QUESTION_STOP_WORDS.has(token)) {
        const candidate = db.prepare(`
          SELECT id, canonical_title, is_installed
          FROM games
          WHERE is_utility = 0 AND canonical_title LIKE ?
          ORDER BY is_installed DESC, length(canonical_title) ASC
          LIMIT 1
        `).get(`%${token}%`)
        if (candidate) {
          return { id: candidate.id, canonical_title: candidate.canonical_title, title: candidate.canonical_title, is_installed: Boolean(candidate.is_installed) }
        }
      }
    }
  } catch (err) {
    console.warn('[Indexer] findGameEntityInText error:', err.message)
  }

  return null
}

module.exports = {
  setActiveDb,
  getActiveDb,
  insertKnowledgeChunk,
  searchGameKnowledge,
  hasGuide,
  deleteGameKnowledge,
  findRecommendationCandidates,
  resolveGameByQuery,
  findGameEntityInText,
}
