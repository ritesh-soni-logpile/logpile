const path = require('node:path')
const os = require('node:os')
const {
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

function findLegacyStatePath(options = {}) {
  if (options.appStatePath && fileExists(options.appStatePath)) return options.appStatePath
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const candidates = [
    path.join(appData, 'legacy-games-launcher', 'app-state.json'),
    path.join(localAppData, 'legacy-games-launcher', 'app-state.json'),
  ]
  return candidates.find((c) => fileExists(c)) || null
}

function extractGamesFromState(state) {
  const collected = []
  const visit = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) {
        if (item && typeof item === 'object' && (item.game_installed_path || item.gameInstalledPath || item.installPath)) {
          collected.push(item)
        } else {
          visit(item)
        }
      }
      return
    }
    if (node.game_installed_path || node.gameInstalledPath || (node.installPath && (node.game_name || node.gameName || node.title))) {
      collected.push(node)
    }
    for (const val of Object.values(node)) {
      if (val && typeof val === 'object') visit(val)
    }
  }
  visit(state)
  return collected
}

function scanLegacy(onProgress, _db, options = {}) {
  emitProgress(onProgress, { source: 'legacy', phase: 'scanning', current: 0, total: 1, message: 'Scanning for Legacy Games installations...' })

  const records = []
  const seenPaths = new Set()
  const statePath = findLegacyStatePath(options)

  if (statePath) {
    try {
      const raw = safeRead(statePath)
      const parsed = raw ? JSON.parse(raw) : null
      const candidates = extractGamesFromState(parsed)
      for (const item of candidates) {
        const installPath = cleanDirectoryPath(item.game_installed_path || item.gameInstalledPath || item.installPath)
        const rawTitle = item.game_name || item.gameName || item.title || item.name
        const cleanTitle = cleanGameTitle(rawTitle)
        if (!installPath || !cleanTitle || !fileExists(installPath)) continue
        if (seenPaths.has(installPath.toLowerCase())) continue

        const exe = resolveGameExecutable(installPath, cleanTitle)
        const gameId = String(item.game_id || item.gameId || item.installer_uuid || item.id || cleanTitle).trim()

        seenPaths.add(installPath.toLowerCase())
        records.push({
          canonicalTitle: cleanTitle,
          normalizedTitle: cleanTitle,
          description: item.game_description || item.description || null,
          developer: null,
          publisher: 'Legacy Games',
          releaseDate: null,
          coverUrl: item.game_coverart || item.coverArt || null,
          heroUrl: null,
          isInstalled: true,
          driveLetter: getDriveLetter(installPath),
          installPath,
          installSizeBytes: directorySizeSafe(installPath),
          playTimeSeconds: 0,
          lastPlayed: null,
          platform: 'legacy',
          platformGameId: gameId,
          platformLaunchId: gameId,
          idSource: 'legacy-appstate:game-id',
          launchUri: null,
          installUri: null,
          executable: exe,
          launchArguments: null,
          source: 'local-scan',
          storeName: 'Legacy Games',
          driveStatus: 'online',
        })
      }
    } catch (err) {
      console.warn('[LegacyScanner] Could not parse app-state.json:', err?.message)
    }
  }

  const regRecords = matchUninstallEntriesByRule({
    platform: 'legacy',
    storeName: 'Legacy Games',
    defaultPublisher: 'Legacy Games',
    match: (item) => String(item.Publisher || '').toLowerCase().includes('legacy games'),
    exclude: (item) => String(item.DisplayName || '').toLowerCase().includes('legacy games launcher'),
  }, options)

  for (const rec of regRecords) {
    const pKey = (rec.installPath || rec.canonicalTitle).toLowerCase()
    if (!seenPaths.has(pKey)) {
      seenPaths.add(pKey)
      records.push(rec)
    }
  }

  emitProgress(onProgress, { source: 'legacy', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} Legacy Games titles.` })
  return { source: 'legacy', records }
}

module.exports = { scanLegacy }
