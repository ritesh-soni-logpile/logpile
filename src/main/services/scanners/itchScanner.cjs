const path = require('node:path')
const os = require('node:os')
const Database = require('better-sqlite3')
const {
  fileExists,
  getDriveLetter,
  emitProgress,
  cleanGameTitle,
  directorySizeSafe,
  resolveGameExecutable,
  toNumber,
} = require('./scannerUtils.cjs')

function findButlerDbPath(options = {}) {
  if (options.dbPath && fileExists(options.dbPath)) return options.dbPath
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const candidates = [
    path.join(appData, 'itch', 'db', 'butler.db'),
    path.join(localAppData, 'itch', 'db', 'butler.db'),
  ]
  return candidates.find((candidate) => fileExists(candidate)) || null
}

function getTableColumns(sqlite, tableName) {
  try {
    return new Set(sqlite.prepare(`PRAGMA table_info(${tableName})`).all().map((c) => c.name))
  } catch {
    return new Set()
  }
}

function resolveVerdictInstall(verdictRaw, fallbackPath, title) {
  let verdict = null
  if (verdictRaw && typeof verdictRaw === 'string') {
    try { verdict = JSON.parse(verdictRaw) } catch {}
  } else if (verdictRaw && typeof verdictRaw === 'object') {
    verdict = verdictRaw
  }

  const basePath = verdict?.basePath || fallbackPath || null
  const normalizedPath = basePath ? path.normalize(String(basePath)) : null
  let exePath = null

  if (normalizedPath && Array.isArray(verdict?.candidates) && verdict.candidates.length > 0) {
    const preferred = verdict.candidates.find((c) => c?.flavor === 'windows' || String(c?.path || '').toLowerCase().endsWith('.exe')) || verdict.candidates[0]
    if (preferred?.path) {
      const candidateExe = path.isAbsolute(preferred.path)
        ? path.normalize(preferred.path)
        : path.join(normalizedPath, preferred.path)
      if (fileExists(candidateExe) && /\.exe$/i.test(candidateExe)) {
        exePath = candidateExe
      }
    }
  }

  if (!exePath && normalizedPath && fileExists(normalizedPath)) {
    exePath = resolveGameExecutable(normalizedPath, title)
  }

  return {
    installPath: normalizedPath,
    executable: exePath,
    totalSize: toNumber(verdict?.totalSize, 0),
  }
}

function scanItch(onProgress, _db, options = {}) {
  emitProgress(onProgress, { source: 'itch', phase: 'scanning', current: 0, total: 1, message: 'Scanning for itch.io installations...' })

  const dbPath = findButlerDbPath(options)
  if (!dbPath) {
    emitProgress(onProgress, { source: 'itch', phase: 'complete', current: 1, total: 1, message: 'itch.io client not found.' })
    return { source: 'itch', records: [] }
  }

  let butlerDb = null
  const records = []

  try {
    butlerDb = new Database(dbPath, { readonly: true, fileMustExist: true })
    const caveCols = getTableColumns(butlerDb, 'caves')
    const gameCols = getTableColumns(butlerDb, 'games')
    if (!caveCols.size) return { source: 'itch', records: [] }

    const caves = butlerDb.prepare('SELECT * FROM caves').all()
    const gamesById = new Map()
    if (gameCols.size) {
      try {
        for (const g of butlerDb.prepare('SELECT * FROM games').all()) {
          if (g?.id !== undefined) gamesById.set(String(g.id), g)
        }
      } catch {}
    }

    for (const cave of caves) {
      const gameId = cave.game_id !== undefined && cave.game_id !== null ? String(cave.game_id).trim() : String(cave.id || '').trim()
      if (!gameId) continue

      const meta = gamesById.get(gameId) || {}
      const rawTitle = meta.title || cave.title || `itch.io Game ${gameId}`
      const cleanTitle = cleanGameTitle(rawTitle)
      if (!cleanTitle) continue

      const fallbackPath = cave.path || cave.install_folder || null
      const resolved = resolveVerdictInstall(cave.verdict, fallbackPath, cleanTitle)
      const isOnline = Boolean(resolved.installPath && fileExists(resolved.installPath))
      if (!isOnline && !resolved.executable) continue

      const sizeBytes = toNumber(cave.installed_size, 0) || resolved.totalSize || (isOnline ? directorySizeSafe(resolved.installPath) : 0)
      const playTimeSeconds = toNumber(cave.seconds_run, 0)
      const lastPlayed = cave.last_touched_at || null

      records.push({
        canonicalTitle: cleanTitle,
        normalizedTitle: cleanTitle,
        description: meta.short_text || null,
        developer: null,
        publisher: 'itch.io',
        releaseDate: meta.published_at || null,
        coverUrl: meta.still_cover_url || meta.cover_url || null,
        heroUrl: null,
        isInstalled: isOnline,
        driveLetter: getDriveLetter(resolved.installPath || resolved.executable),
        installPath: resolved.installPath,
        installSizeBytes: isOnline ? sizeBytes : 0,
        playTimeSeconds,
        lastPlayed,
        platform: 'itch',
        platformGameId: gameId,
        platformLaunchId: String(cave.id || gameId),
        idSource: 'itch-butler:game-id',
        launchUri: `itch://games/${encodeURIComponent(gameId)}`,
        installUri: `itch://games/${encodeURIComponent(gameId)}`,
        executable: resolved.executable,
        launchArguments: null,
        source: 'local-scan',
        storeName: 'Itch.io',
        driveStatus: isOnline ? 'online' : 'offline',
      })
    }
  } catch (err) {
    console.warn('[ItchScanner] Could not read butler.db:', err?.message)
  } finally {
    try { if (butlerDb) butlerDb.close() } catch {}
  }

  emitProgress(onProgress, { source: 'itch', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} itch.io games.` })
  return { source: 'itch', records }
}

module.exports = { scanItch, findButlerDbPath }
