const path = require('node:path')
const os = require('node:os')
const {
  safeRead,
  fileExists,
  getDriveLetter,
  emitProgress,
  cleanExePath,
  cleanDirectoryPath,
  cleanGameTitle,
  directorySizeSafe,
  resolveGameExecutable,
  matchUninstallEntriesByRule,
} = require('./scannerUtils.cjs')

function findHumbleConfigPath(options = {}) {
  if (options.configPath && fileExists(options.configPath)) return options.configPath
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
  const candidates = [
    path.join(appData, 'Humble App', 'config.json'),
    path.join(appData, 'Humble Games Collection', 'config.json'),
  ]
  return candidates.find((c) => fileExists(c)) || null
}

function scanHumble(onProgress, _db, options = {}) {
  emitProgress(onProgress, { source: 'humble', phase: 'scanning', current: 0, total: 1, message: 'Scanning for Humble App installations...' })

  const records = []
  const seenPaths = new Set()
  const configPath = findHumbleConfigPath(options)

  if (configPath) {
    try {
      const raw = safeRead(configPath)
      const parsed = raw ? JSON.parse(raw) : {}
      const collection = parsed['game-collection-4'] || parsed.games || parsed.downloaded || []
      const entries = Array.isArray(collection)
        ? collection
        : (collection && typeof collection === 'object' ? Object.values(collection) : [])

      for (const entry of entries) {
        if (!entry || typeof entry !== 'object') continue
        const rawDir = entry.filePath || entry.downloadPath || entry.installPath || entry.installDirectory
        const rawExe = cleanExePath(entry.executablePath)
        const installPath = cleanDirectoryPath(rawDir) || (rawExe ? path.dirname(rawExe) : null)
        const title = cleanGameTitle(entry.gameName || entry.name || entry.title)
        if (!title || !installPath || !fileExists(installPath)) continue
        if (seenPaths.has(installPath.toLowerCase())) continue

        const executable = (rawExe && fileExists(rawExe)) ? rawExe : resolveGameExecutable(installPath, title)
        const gameId = String(entry.machineName || entry.slug || entry.gamekey || title).trim()

        seenPaths.add(installPath.toLowerCase())
        records.push({
          canonicalTitle: title,
          normalizedTitle: title,
          description: null,
          developer: entry.developer || null,
          publisher: entry.publisher || 'Humble Games',
          releaseDate: null,
          coverUrl: entry.image || entry.cover || null,
          heroUrl: null,
          isInstalled: true,
          driveLetter: getDriveLetter(installPath),
          installPath,
          installSizeBytes: directorySizeSafe(installPath),
          playTimeSeconds: 0,
          lastPlayed: null,
          platform: 'humble',
          platformGameId: gameId,
          platformLaunchId: gameId,
          idSource: 'humble-config:machine-name',
          launchUri: null,
          installUri: null,
          executable,
          launchArguments: null,
          source: 'local-scan',
          storeName: 'Humble',
          driveStatus: 'online',
        })
      }
    } catch (err) {
      console.warn('[HumbleScanner] Could not parse Humble config.json:', err?.message)
    }
  }

  const regRecords = matchUninstallEntriesByRule({
    platform: 'humble',
    storeName: 'Humble',
    defaultPublisher: 'Humble Games',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      return pub.includes('humble bundle') || pub.includes('humble games')
    },
    exclude: (item) => String(item.DisplayName || '').toLowerCase().includes('humble app'),
  }, options)

  for (const rec of regRecords) {
    const pKey = (rec.installPath || rec.canonicalTitle).toLowerCase()
    if (!seenPaths.has(pKey)) {
      seenPaths.add(pKey)
      records.push(rec)
    }
  }

  emitProgress(onProgress, { source: 'humble', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} Humble games.` })
  return { source: 'humble', records }
}

module.exports = { scanHumble }
