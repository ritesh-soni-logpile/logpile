const path = require('node:path')
const {
  fs,
  safeRead,
  fileExists,
  getDriveLetter,
  emitProgress,
  cleanDirectoryPath,
  cleanGameTitle,
  directorySizeSafe,
  resolveGameExecutable,
  matchUninstallEntriesByRule,
} = require('./scannerUtils.cjs')

function parseWgcGameInfo(gameDir, fallbackId) {
  const infoPath = path.join(gameDir, 'game_info.xml')
  const raw = safeRead(infoPath)
  if (!raw) return null
  const nameMatch = raw.match(/<name>([^<]+)<\/name>/i)
  const idMatch = raw.match(/<id>([^<]+)<\/id>/i)
  const title = cleanGameTitle(nameMatch ? nameMatch[1] : path.basename(gameDir))
  if (!title) return null
  return {
    title,
    gameId: (idMatch ? idMatch[1] : fallbackId || title).trim(),
  }
}

function scanWargaming(onProgress, _db, options = {}) {
  emitProgress(onProgress, { source: 'wargaming', phase: 'scanning', current: 0, total: 1, message: 'Scanning for Wargaming Game Center titles...' })

  const records = []
  const seenPaths = new Set()
  const appsDir = options.appsDir || path.join(process.env.ProgramData || 'C:\\ProgramData', 'Wargaming.net', 'GameCenter', 'apps')

  if (fileExists(appsDir)) {
    try {
      const entries = fs.readdirSync(appsDir, { withFileTypes: true })
      for (const entry of entries) {
        const entryPath = path.join(appsDir, entry.name)
        let candidatePaths = []
        if (entry.isDirectory()) {
          const files = fs.readdirSync(entryPath).map((f) => path.join(entryPath, f))
          for (const f of files) {
            const content = safeRead(f)
            if (!content) continue
            const xmlMatch = content.match(/<path>([^<]+)<\/path>/i)
            if (xmlMatch && xmlMatch[1]) candidatePaths.push(xmlMatch[1].trim())
            const linePath = content.split(/\r?\n/).find((l) => /^[A-Za-z]:\\/.test(l.trim()))
            if (linePath) candidatePaths.push(linePath.trim())
          }
        } else if (entry.isFile()) {
          const content = safeRead(entryPath)
          if (content) {
            const matches = content.match(/[A-Za-z]:\\[^\r\n"<>|]+/g) || []
            candidatePaths.push(...matches)
          }
        }

        for (const rawDir of candidatePaths) {
          const installPath = cleanDirectoryPath(rawDir)
          if (!installPath || !fileExists(installPath)) continue
          if (seenPaths.has(installPath.toLowerCase())) continue

          const gameInfo = parseWgcGameInfo(installPath, entry.name)
          const title = gameInfo?.title || cleanGameTitle(path.basename(installPath))
          if (!title) continue

          seenPaths.add(installPath.toLowerCase())
          records.push({
            canonicalTitle: title,
            normalizedTitle: title,
            description: null,
            developer: 'Wargaming',
            publisher: 'Wargaming',
            releaseDate: null,
            coverUrl: null,
            heroUrl: null,
            isInstalled: true,
            driveLetter: getDriveLetter(installPath),
            installPath,
            installSizeBytes: directorySizeSafe(installPath),
            playTimeSeconds: 0,
            lastPlayed: null,
            platform: 'wargaming',
            platformGameId: gameInfo?.gameId || entry.name,
            platformLaunchId: gameInfo?.gameId || entry.name,
            idSource: 'wgc-apps:game-info',
            launchUri: null,
            installUri: null,
            executable: resolveGameExecutable(installPath, title),
            launchArguments: null,
            source: 'local-scan',
            storeName: 'Wargaming',
            driveStatus: 'online',
          })
        }
      }
    } catch (err) {
      console.warn('[WargamingScanner] Apps scan warning:', err?.message)
    }
  }

  const regRecords = matchUninstallEntriesByRule({
    platform: 'wargaming',
    storeName: 'Wargaming',
    defaultPublisher: 'Wargaming',
    developer: 'Wargaming',
    match: (item) => String(item.Publisher || '').toLowerCase().includes('wargaming'),
    exclude: (item) => String(item.DisplayName || '').toLowerCase().includes('game center'),
  }, options)

  for (const rec of regRecords) {
    const pKey = (rec.installPath || rec.canonicalTitle).toLowerCase()
    if (!seenPaths.has(pKey)) {
      seenPaths.add(pKey)
      records.push(rec)
    }
  }

  emitProgress(onProgress, { source: 'wargaming', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} Wargaming titles.` })
  return { source: 'wargaming', records }
}

module.exports = { scanWargaming }
