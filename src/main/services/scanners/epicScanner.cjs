const path = require('node:path')
const {
  safeReadAsync,
  fileExistsAsync,
  getDriveLetter,
  isDriveMountedAsync,
  artworkUrls,
  emitProgress,
  fsPromises,
  toNumber,
} = require('./scannerUtils.cjs')

function epicManifestDirectory() {
  const programData = process.env.ProgramData || 'C:\\ProgramData'
  return path.join(programData, 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests')
}

function isStandaloneManifest(manifest) {
  if (!manifest || !manifest.DisplayName || !manifest.AppName) return false
  const type = String(manifest.AppType || manifest.AppCategory || '').toLowerCase()
  const name = String(manifest.DisplayName).toLowerCase()
  const isDependency = manifest.bIsApplication === false || ['engine', 'redistributable', 'mod'].some((token) => type.includes(token))
  const looksLikeDependency = ['unreal engine', 'directx', 'visual c++', 'easy anti-cheat'].some((token) => name.includes(token))
  return !isDependency && !looksLikeDependency
}

async function parseEpicManifest(manifestPath) {
  const raw = await safeReadAsync(manifestPath)
  if (!raw) return null
  try {
    const manifest = JSON.parse(raw)
    if (!isStandaloneManifest(manifest)) return null
    const installLocation = manifest.InstallLocation ? path.normalize(String(manifest.InstallLocation)) : null
    const existsOnDisk = installLocation ? await fileExistsAsync(installLocation) : false
    const installPath = existsOnDisk ? installLocation : null
    const appName = String(manifest.AppName || '').trim()
    const catalogItemId = String(manifest.CatalogItemId || '').trim()
    const artifactId = String(manifest.ArtifactId || appName).trim()
    const appId = catalogItemId || artifactId
    const platformLaunchId = artifactId || appName
    const idSource = catalogItemId ? 'epic-manifest:CatalogItemId' : 'epic-manifest:AppName'
    const artwork = artworkUrls(artifactId || appId)
    return {
      canonicalTitle: String(manifest.DisplayName).trim(),
      normalizedTitle: String(manifest.DisplayName).trim(),
      description: null,
      developer: null,
      publisher: null,
      releaseDate: null,
      coverUrl: artwork.coverUrl,
      heroUrl: artwork.heroUrl,
      isInstalled: existsOnDisk,
      driveLetter: getDriveLetter(installPath),
      installPath,
      installSizeBytes: existsOnDisk ? toNumber(manifest.InstallSize, 0) : 0,
      playTimeSeconds: 0,
      lastPlayed: null,
      platform: 'epic',
      platformGameId: appId,
      platformLaunchId,
      idSource,
      launchUri: `com.epicgames.launcher://apps/${encodeURIComponent(platformLaunchId)}?action=launch&silent=true`,
      installUri: `com.epicgames.launcher://apps/${encodeURIComponent(platformLaunchId)}?action=install`,
      source: 'local-scan',
      driveStatus: existsOnDisk ? 'online' : 'offline',
      rawManifest: {
        appName,
        catalogItemId,
        artifactId,
        installLocation,
        existsOnDisk,
      },
    }
  } catch { return null }
}

async function reconcileEpic(db, { installedAppNames, installedCatalogIds, installedPaths }) {
  if (!db || typeof db.prepare !== 'function') return
  try {
    const query = db.prepare(`
      SELECT g.id, g.canonical_title, COALESCE(s.install_path, g.install_path) AS install_path, g.drive_letter, s.platform_game_id, s.platform_launch_id, s.id_source
      FROM games g
      JOIN game_sources s ON s.game_id = g.id
      WHERE s.platform = 'epic' AND (g.is_installed = 1 OR s.is_installed = 1)
    `)
    const installedEpicGames = query.all()
    const uninstalledIds = []

    for (const game of installedEpicGames) {
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

      const pGameId = String(game.platform_game_id || '').trim().toLowerCase()
      const pLaunchId = String(game.platform_launch_id || '').trim().toLowerCase()
      const normInstallPath = game.install_path ? path.normalize(game.install_path).toLowerCase() : null

      // Check if this game is still present and installed in Epic manifests
      const matchesInstalledManifest =
        (pGameId && (installedCatalogIds.has(pGameId) || installedAppNames.has(pGameId))) ||
        (pLaunchId && (installedAppNames.has(pLaunchId) || installedCatalogIds.has(pLaunchId))) ||
        (normInstallPath && installedPaths.has(normInstallPath))

      const pathStillExists = game.install_path ? await fileExistsAsync(game.install_path) : false

      // If the game is installed in another launcher (Steam/GOG) and that path exists, do not unmark
      if (normInstallPath && (normInstallPath.includes('steamapps') || normInstallPath.includes('gog games')) && pathStillExists) {
        continue
      }

      if (!matchesInstalledManifest || !pathStillExists) {
        uninstalledIds.push(game.id)
      }
    }

    if (uninstalledIds.length > 0) {
      const clearSourceStmt = db.prepare(`
        UPDATE game_sources
        SET is_installed = 0,
            install_path = NULL,
            install_size_bytes = 0,
            executable_path = NULL
        WHERE game_id = ? AND platform = 'epic'
      `)
      const otherInstalledStmt = db.prepare(`
        SELECT install_path, install_size_bytes, executable_path, launch_arguments, source_name
        FROM game_sources
        WHERE game_id = ? AND is_installed = 1
        LIMIT 1
      `)
      const promoteStmt = db.prepare(`
        UPDATE games
        SET is_installed = 1,
            install_path = COALESCE(?, install_path),
            install_size_bytes = CASE WHEN ? > 0 THEN ? ELSE install_size_bytes END,
            executable_path = COALESCE(?, executable_path),
            launch_arguments = COALESCE(?, launch_arguments),
            store_name = COALESCE(NULLIF(?, ''), store_name),
            drive_status = 'online',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
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
          clearSourceStmt.run(gameId)
          const remaining = otherInstalledStmt.get(gameId)
          if (remaining) {
            promoteStmt.run(remaining.install_path, remaining.install_size_bytes || 0, remaining.install_size_bytes || 0, remaining.executable_path, remaining.launch_arguments, remaining.source_name, gameId)
          } else {
            updateStmt.run(gameId)
          }
        }
      })
      reconcileTx()
    }
  } catch (error) {
    console.error('[EpicScanner] Reconciliation error:', error)
  }
}

async function scanEpic(onProgress, db) {
  const directory = epicManifestDirectory()
  let files = []
  try {
    const entries = await fsPromises.readdir(directory)
    files = entries.filter((name) => name.toLowerCase().endsWith('.item'))
  } catch { files = [] }
  emitProgress(onProgress, { source: 'epic', phase: 'scanning', current: 0, total: files.length, message: files.length ? `Found ${files.length} Epic manifest${files.length === 1 ? '' : 's'}.` : 'Epic manifest folder not found.' })

  const records = []
  const sweptInstalledAppNames = new Set()
  const sweptInstalledCatalogIds = new Set()
  const sweptInstalledPaths = new Set()

  const parsedRecords = await Promise.all(
    files.map((file) => parseEpicManifest(path.join(directory, file)))
  )

  parsedRecords.forEach((record, index) => {
    if (record) {
      records.push(record)
      if (record.isInstalled && record.rawManifest) {
        if (record.rawManifest.appName) sweptInstalledAppNames.add(record.rawManifest.appName.toLowerCase())
        if (record.rawManifest.catalogItemId) sweptInstalledCatalogIds.add(record.rawManifest.catalogItemId.toLowerCase())
        if (record.rawManifest.artifactId) sweptInstalledAppNames.add(record.rawManifest.artifactId.toLowerCase())
        if (record.installPath) sweptInstalledPaths.add(path.normalize(record.installPath).toLowerCase())
      }
    }
    emitProgress(onProgress, { source: 'epic', phase: 'scanning', current: index + 1, total: files.length, message: `Checked ${files[index]}.` })
  })

  // Reconciliation Phase: update uninstalled Epic games in DB without deleting
  if (db) {
    await reconcileEpic(db, {
      installedAppNames: sweptInstalledAppNames,
      installedCatalogIds: sweptInstalledCatalogIds,
      installedPaths: sweptInstalledPaths,
    })
  }

  return { source: 'epic', records, directory }
}

module.exports = { scanEpic, parseEpicManifest, epicManifestDirectory, isStandaloneManifest, reconcileEpic }
