const path = require('node:path')
const { parse } = require('vdf-parser')
const {
  safeReadAsync,
  fileExistsAsync,
  getDriveLetter,
  isDriveMountedAsync,
  readRegistryValue,
  artworkUrls,
  unique,
  emitProgress,
  fsPromises,
  toNumber,
} = require('./scannerUtils.cjs')

function candidateSteamRoots() {
  const candidates = [
    readRegistryValue('HKCU\\Software\\Valve\\Steam', 'SteamPath'),
    process.env['ProgramFiles(x86)'] ? path.join(process.env['ProgramFiles(x86)'], 'Steam') : null,
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Steam') : null,
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
  ]
  return unique(candidates.map((candidate) => candidate && path.normalize(candidate)))
}

async function discoverSteamLibraries() {
  const roots = candidateSteamRoots()
  const libraries = []
  for (const root of roots) {
    if (!(await fileExistsAsync(root))) continue
    const libraryFile = path.join(root, 'steamapps', 'libraryfolders.vdf')
    const parsed = await safeReadAsync(libraryFile)
    if (parsed) {
      try {
        const parsedVdf = parse(parsed)
        const folders = parsedVdf.libraryfolders || parsedVdf || {}
        for (const [key, folder] of Object.entries(folders)) {
          if (folder && typeof folder === 'object' && folder.path) {
            libraries.push(path.normalize(folder.path))
          }
        }
      } catch { /* A partial VDF should not block the other libraries. */ }
    }
    libraries.push(root)
  }

  // Deep multi-drive fallback: scan all Windows drive letters (A-Z) concurrently
  const driveLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const driveCandidates = []
  for (const letter of driveLetters) {
    driveCandidates.push(
      `${letter}:\\SteamLibrary`,
      `${letter}:\\Games\\SteamLibrary`,
      `${letter}:\\Steam`,
    )
  }

  const candidateResults = await Promise.all(
    driveCandidates.map(async (cand) => {
      const exists = await fileExistsAsync(path.join(cand, 'steamapps'))
      return exists ? path.normalize(cand) : null
    })
  )
  for (const found of candidateResults) {
    if (found) libraries.push(found)
  }

  // Deduplicate case-insensitively while verifying steamapps existence
  const uniqueLibs = []
  const seen = new Set()
  const libChecks = await Promise.all(
    libraries.map(async (lib) => {
      if (!lib) return null
      const norm = path.normalize(lib)
      const exists = await fileExistsAsync(path.join(norm, 'steamapps'))
      return exists ? norm : null
    })
  )
  for (const norm of libChecks) {
    if (!norm) continue
    const lower = norm.toLowerCase()
    if (!seen.has(lower)) {
      seen.add(lower)
      uniqueLibs.push(norm)
    }
  }
  return uniqueLibs
}

function getCaseInsensitivePath(root, segments) {
  let current = root
  for (const segment of segments) {
    if (!current || typeof current !== 'object') return null
    const key = Object.keys(current).find((candidate) => candidate.toLowerCase() === segment.toLowerCase())
    if (!key) return null
    current = current[key]
  }
  return current
}

async function collectSteamPlaytime(steamRoots) {
  const playtimeByApp = new Map()
  for (const root of steamRoots) {
    const userdataRoot = path.join(root, 'userdata')
    let accounts = []
    try {
      const entries = await fsPromises.readdir(userdataRoot)
      accounts = entries.filter((entry) => /^\d+$/.test(entry))
    } catch { accounts = [] }
    for (const accountId of accounts) {
      const configPath = path.join(userdataRoot, accountId, 'config', 'localconfig.vdf')
      const raw = await safeReadAsync(configPath)
      if (!raw) continue
      try {
        const parsed = parse(raw, { types: true, arrayify: true })
        const apps = getCaseInsensitivePath(parsed, ['UserLocalConfigStore', 'Software', 'Valve', 'Steam', 'apps'])
          || getCaseInsensitivePath(parsed, ['UserLocalConfigStore', 'apps'])
          || getCaseInsensitivePath(parsed, ['userlocalconfigstore', 'apps'])
          || {}
        const visit = (node) => {
          if (!node || typeof node !== 'object') return
          for (const [key, value] of Object.entries(node)) {
            if (value && typeof value === 'object') {
              if (/^\d+$/.test(key)) {
                const getPlaytimeMinutes = (item) => {
                  if (!item || typeof item !== 'object') return 0
                  const onlineMinutes = toNumber(item.Playtime, 0)
                  const offlineMinutes = toNumber(item.PlaytimeDisconnected, 0)
                  return onlineMinutes + offlineMinutes
                }
                const minutes = Array.isArray(value) ? Math.max(...value.map(getPlaytimeMinutes)) : getPlaytimeMinutes(value)
                if (minutes > 0) playtimeByApp.set(key, Math.max(playtimeByApp.get(key) || 0, minutes * 60))
              }
              visit(value)
            }
          }
        }
        visit(apps)
      } catch { /* A malformed localconfig should not stop manifest scanning. */ }
    }
  }
  return playtimeByApp
}

async function parseManifest(manifestPath, libraryFolder, playtimeByApp = new Map()) {
  const raw = await safeReadAsync(manifestPath)
  if (!raw) return null
  try {
    const state = parse(raw).AppState
    if (!state || !state.appid || !state.name) return null
    const appId = String(state.appid)
    const installDir = state.installdir ? String(state.installdir) : null
    const installPath = installDir ? path.join(libraryFolder, 'steamapps', 'common', installDir) : null
    const artwork = artworkUrls(appId)
    const lastPlayed = toNumber(state.LastPlayed, 0)
    const exists = installPath ? await fileExistsAsync(installPath) : false
    return {
      canonicalTitle: String(state.name).trim(),
      normalizedTitle: String(state.name).trim(),
      description: null,
      developer: null,
      publisher: null,
      releaseDate: null,
      coverUrl: artwork.coverUrl,
      heroUrl: artwork.heroUrl,
      isInstalled: true,
      driveLetter: getDriveLetter(installPath || libraryFolder),
      installPath,
      installSizeBytes: toNumber(state.SizeOnDisk, 0),
      playTimeSeconds: playtimeByApp.get(appId) || 0,
      lastPlayed: lastPlayed ? new Date(lastPlayed * 1000).toISOString() : null,
      platform: 'steam',
      platformGameId: appId,
      platformLaunchId: appId,
      idSource: 'steam-manifest:appid',
      launchUri: `steam://rungameid/${appId}`,
      installUri: `steam://install/${appId}`,
      source: 'local-scan',
      driveStatus: exists ? 'online' : 'offline',
    }
  } catch { return null }
}

async function reconcileSteam(db, sweptAppIds, libraries = []) {
  if (!db || typeof db.prepare !== 'function') return
  try {
    const query = db.prepare(`
      SELECT g.id, g.canonical_title, g.install_path, g.drive_letter, s.platform_game_id, s.id_source
      FROM games g
      JOIN game_sources s ON s.game_id = g.id
      WHERE s.platform = 'steam' AND g.is_installed = 1
    `)
    const installedSteamGames = query.all()
    const uninstalledIds = []

    for (const game of installedSteamGames) {
      // DRIVE HEALTH CHECK:
      // If the game's install path resides on a drive that is currently unmounted or unreachable,
      // skip reconciliation to preserve game installation status and avoid false-positive demotions.
      const targetPath = game.install_path || game.drive_letter
      if (targetPath) {
        const drive = getDriveLetter(targetPath)
        if (drive && !(await isDriveMountedAsync(drive))) {
          continue
        }
      }

      const appId = String(game.platform_game_id || '').trim()
      const isNumericAppId = /^\d+$/.test(appId)
      const normInstallPath = game.install_path ? path.normalize(game.install_path).toLowerCase() : null
      const isSteamPath = normInstallPath && (
        normInstallPath.includes('steamapps') ||
        libraries.some((lib) => normInstallPath.startsWith(path.normalize(lib).toLowerCase()))
      )

      // Only reconcile Steam-owned or Steam-located installs (avoid touching games installed via Epic/GOG)
      if (isNumericAppId || isSteamPath || !game.install_path) {
        const notFoundInSweep = isNumericAppId ? !sweptAppIds.has(appId) : true
        const folderMissingOnDisk = game.install_path ? !(await fileExistsAsync(game.install_path)) : true

        if (notFoundInSweep || folderMissingOnDisk) {
          // If the game has another active install path on disk from another store, preserve it
          if (game.install_path && !isSteamPath && (await fileExistsAsync(game.install_path))) {
            continue
          }
          uninstalledIds.push(game.id)
        }
      }
    }

    if (uninstalledIds.length > 0) {
      const updateStmt = db.prepare(`
        UPDATE games
        SET is_installed = 0,
            install_path = NULL,
            install_size_bytes = 0,
            drive_status = 'offline',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      const reconcileTx = db.transaction(() => {
        for (const gameId of uninstalledIds) {
          updateStmt.run(gameId)
        }
      })
      reconcileTx()
    }
  } catch (error) {
    console.error('[SteamScanner] Reconciliation error:', error)
  }
}

async function scanSteam(onProgress, db) {
  const libraries = await discoverSteamLibraries()
  const steamRoots = candidateSteamRoots()
  const playtimeByApp = await collectSteamPlaytime(steamRoots)
  const records = []
  const sweptAppIds = new Set()

  emitProgress(onProgress, { source: 'steam', phase: 'discovering', current: 0, total: libraries.length, message: `Found ${libraries.length} Steam library folder${libraries.length === 1 ? '' : 's'}.` })
  for (let index = 0; index < libraries.length; index++) {
    const libraryFolder = libraries[index]
    const steamApps = path.join(libraryFolder, 'steamapps')
    let manifests = []
    try {
      const names = await fsPromises.readdir(steamApps)
      manifests = names.filter((name) => /^appmanifest_\d+\.acf$/i.test(name))
    } catch { manifests = [] }

    const parsedRecords = await Promise.all(
      manifests.map((manifest) => parseManifest(path.join(steamApps, manifest), libraryFolder, playtimeByApp))
    )

    for (const record of parsedRecords) {
      if (record) {
        records.push(record)
        if (record.platformGameId) {
          sweptAppIds.add(String(record.platformGameId))
        }
      }
    }
    emitProgress(onProgress, { source: 'steam', phase: 'scanning', current: index + 1, total: libraries.length, message: `Scanned ${path.basename(libraryFolder) || libraryFolder}.` })
  }

  // Reconciliation Phase: update uninstalled Steam games in DB without deleting
  if (db) {
    await reconcileSteam(db, sweptAppIds, libraries)
  }

  return { source: 'steam', records, libraries, sweptAppIds: [...sweptAppIds] }
}

module.exports = { scanSteam, discoverSteamLibraries, parseManifest, collectSteamPlaytime, getCaseInsensitivePath, reconcileSteam }
