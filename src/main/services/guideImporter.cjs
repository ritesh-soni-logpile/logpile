const fs = require('fs')
const path = require('path')
const {
  insertKnowledgeChunk,
  deleteGameKnowledge,
  getActiveDatabase,
} = require('../../../electron/db.cjs')

let activeWatchers = []

/**
 * Parses markdown text into discrete sections split by headings (## and ###).
 * @param {string} markdownText 
 * @returns {Array<{ sectionTitle: string, content: string }>}
 */
function parseMarkdownSections(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') return []
  const lines = markdownText.split(/\r?\n/)
  const sections = []
  let currentTitle = 'Overview'
  let currentContent = []

  for (const line of lines) {
    const headerMatch = line.match(/^#{2,3}\s+(.+)$/)
    if (headerMatch) {
      const rawBody = currentContent.join('\n').trim()
      const cleanBody = currentTitle === 'Overview'
        ? rawBody.replace(/^#\s+[^\r\n]+\r?\n?/, '').trim()
        : rawBody
      if (cleanBody) {
        sections.push({ sectionTitle: currentTitle, content: cleanBody })
      }
      currentTitle = headerMatch[1].trim()
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  const rawLastBody = currentContent.join('\n').trim()
  const lastBody = currentTitle === 'Overview'
    ? rawLastBody.replace(/^#\s+[^\r\n]+\r?\n?/, '').trim()
    : rawLastBody
  if (lastBody) {
    sections.push({ sectionTitle: currentTitle, content: lastBody })
  }

  return sections
}

/**
 * Returns available directories where guide markdown files can be placed.
 * @param {object} app Electron app instance
 * @returns {string[]}
 */
function getGuidesDirectories(app) {
  const dirs = []
  try {
    const appRoot = app?.getAppPath ? app.getAppPath() : path.join(__dirname, '..', '..', '..')
    dirs.push(path.join(appRoot, 'resources', 'guides'))
  } catch {}
  try {
    if (app?.getPath) {
      dirs.push(path.join(app.getPath('userData'), 'guides'))
    }
  } catch {}

  const logpileDataFallback = path.join(process.cwd(), 'logpile_data', 'guides')
  if (!dirs.includes(logpileDataFallback)) dirs.push(logpileDataFallback)

  const fallback = path.join(__dirname, '..', '..', '..', 'resources', 'guides')
  if (!dirs.includes(fallback)) dirs.push(fallback)

  const cwdFallback = path.join(process.cwd(), 'resources', 'guides')
  if (!dirs.includes(cwdFallback)) dirs.push(cwdFallback)

  return Array.from(new Set(dirs))
}

/**
 * Matches a guide filename to a game record in the database.
 * @param {object} db 
 * @param {string} fileBasename 
 * @returns {{ id: string, canonical_title: string } | null}
 */
function findGameForGuide(db, fileBasename) {
  const targetDb = db && typeof db.prepare === 'function' ? db : getActiveDatabase()
  if (!targetDb || !fileBasename) return null
  const rawTitle = fileBasename.trim()
  const normTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '')

  try {
    // 1. Direct match on title or normalized title
    let row = targetDb.prepare(`
      SELECT id, canonical_title FROM games
      WHERE LOWER(canonical_title) = LOWER(?) OR normalized_title = ?
      LIMIT 1
    `).get(rawTitle, normTitle)
    if (row) return row

    // 2. Substring match
    row = targetDb.prepare(`
      SELECT id, canonical_title FROM games
      WHERE canonical_title LIKE ? OR ? LIKE ('%' || canonical_title || '%')
      LIMIT 1
    `).get(`%${rawTitle}%`, rawTitle)
    return row || null
  } catch (err) {
    console.warn('[Guides] Game lookup error:', err.message)
    return null
  }
}

/**
 * Imports a single markdown guide into game_knowledge and game_knowledge_fts.
 * @param {object} db 
 * @param {string} filePath 
 * @param {string} [explicitGameId]
 * @param {string} [explicitTitle]
 * @returns {{ success: boolean, gameId?: string, canonicalTitle?: string, sectionsCount?: number, error?: string }}
 */
function importGuideFile(db, filePath, explicitGameId, explicitTitle) {
  const targetDb = db && typeof db.prepare === 'function' ? db : getActiveDatabase()
  if (!targetDb || !filePath || !fs.existsSync(filePath)) {
    return { success: false, error: 'File does not exist or database is unavailable.' }
  }

  try {
    const ext = path.extname(filePath)
    const baseName = path.basename(filePath, ext)
    const game = (explicitGameId && explicitTitle)
      ? { id: explicitGameId, canonical_title: explicitTitle }
      : (explicitGameId
        ? targetDb.prepare('SELECT id, canonical_title FROM games WHERE id = ?').get(explicitGameId)
        : findGameForGuide(targetDb, baseName))

    if (!game) {
      return { success: false, error: `No matching game in library for "${baseName}"` }
    }

    const content = fs.readFileSync(filePath, 'utf8')
    const sections = parseMarkdownSections(content)
    if (sections.length === 0) {
      return { success: false, error: `No readable sections in "${filePath}"` }
    }

    const insertTx = targetDb.transaction(() => {
      deleteGameKnowledge(targetDb, game.id)
      let inserted = 0
      for (const sec of sections) {
        const rowId = insertKnowledgeChunk(targetDb, game.id, game.canonical_title, sec.sectionTitle, sec.content)
        if (rowId) inserted++
      }
      try {
        targetDb.prepare('UPDATE games SET has_guide = 1 WHERE id = ?').run(game.id)
      } catch {}
      return inserted
    })

    const count = insertTx()
    return {
      success: true,
      gameId: game.id,
      canonicalTitle: game.canonical_title,
      sectionsCount: count,
    }
  } catch (err) {
    console.warn('[Guides] Failed importing guide:', filePath, err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Convenience wrapper for indexing a single guide file into FTS5 immediately.
 */
function indexSingleFile(filePath, gameId, db) {
  return importGuideFile(db, filePath, gameId)
}

/**
 * Scans guide directories and imports all detected markdown files.
 * @param {object} db 
 * @param {object} app 
 * @returns {{ scanned: number, imported: number, failed: number, games: string[] }}
 */
function scanAndImportGuides(db, app) {
  const targetDb = db && typeof db.prepare === 'function' ? db : getActiveDatabase()
  if (!targetDb) return { scanned: 0, imported: 0, failed: 0, games: [] }

  const dirs = getGuidesDirectories(app)
  const results = []

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }) } catch {}
      continue
    }

    try {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        if (/\.(md|markdown)$/i.test(file)) {
          const fullPath = path.join(dir, file)
          const res = importGuideFile(targetDb, fullPath)
          results.push({ file, ...res })
        }
      }
    } catch (err) {
      console.warn('[Guides] Directory scan error in', dir, err.message)
    }
  }

  const imported = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  return {
    scanned: results.length,
    imported: imported.length,
    failed: failed.length,
    games: imported.map((r) => r.canonicalTitle),
  }
}

/**
 * Stops any active guide file watchers.
 */
function stopGuideWatcher() {
  for (const w of activeWatchers) {
    try { w.close() } catch {}
  }
  activeWatchers = []
}

/**
 * Watches guide directories for added, updated, or removed markdown guides.
 * @param {object} db 
 * @param {object} app 
 * @returns {number} Active watchers count
 */
function startGuideWatcher(db, app) {
  stopGuideWatcher()
  const targetDb = db && typeof db.prepare === 'function' ? db : getActiveDatabase()
  const dirs = getGuidesDirectories(app)
  let debounceTimer = null

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }) } catch {}
    }
    if (!fs.existsSync(dir)) continue

    try {
      const watcher = fs.watch(dir, (eventType, filename) => {
        if (!filename || !/\.(md|markdown)$/i.test(filename)) return
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          try {
            const fullPath = path.join(dir, filename)
            if (fs.existsSync(fullPath)) {
              importGuideFile(targetDb, fullPath)
            } else if (targetDb) {
              const baseName = path.basename(filename, path.extname(filename))
              const game = findGameForGuide(targetDb, baseName)
              if (game) {
                deleteGameKnowledge(targetDb, game.id)
              }
            }
          } catch (watchErr) {
            console.warn('[Guides Watcher] Error handling change:', watchErr.message)
          }
        }, 300)
      })
      activeWatchers.push(watcher)
    } catch (watchErr) {
      console.warn('[Guides Watcher] Could not watch directory:', dir, watchErr.message)
    }
  }

  return activeWatchers.length
}

module.exports = {
  parseMarkdownSections,
  getGuidesDirectories,
  findGameForGuide,
  importGuideFile,
  indexSingleFile,
  scanAndImportGuides,
  startGuideWatcher,
  stopGuideWatcher,
}
