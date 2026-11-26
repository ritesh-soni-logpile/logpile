const path = require('node:path')
const os = require('node:os')
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

function epicV2Directory() {
  const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : path.join(os.homedir(), 'AppData', 'Local'))
  return path.join(localAppData, 'com.epicgames.eglv2')
}

function isStandaloneManifest(manifest) {
  if (!manifest || !manifest.DisplayName || !manifest.AppName) return false
  const type = String(manifest.AppType || manifest.AppCategory || '').toLowerCase()
  const name = String(manifest.DisplayName).toLowerCase()
  const isDependency = manifest.bIsApplication === false || ['engine', 'redistributable', 'mod'].some((token) => type.includes(token))
  const looksLikeDependency = ['unreal engine', 'directx', 'visual c++', 'easy anti-cheat', 'epic online services'].some((token) => name.includes(token))
  return !isDependency && !looksLikeDependency
}

function isStandaloneV2(entry, title) {
  if (!entry || !entry.dir) return false
  const t = String(title || '').toLowerCase()
  const d = String(entry.dir || '').toLowerCase()
  const isEngineOrRedist = ['unreal engine', 'directx', 'visual c++', 'easy anti-cheat', 'epic online services'].some((token) => t.includes(token) || d.includes(token))
  return !isEngineOrRedist
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
    const executablePath = (existsOnDisk && manifest.LaunchExecutable)
      ? path.join(installLocation, String(manifest.LaunchExecutable).trim())
      : null

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
      executablePath,
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

async function parseEpicV2Installations(eglv2Dir = epicV2Directory(), options = {}) {
  const instPath = options.installationsJsonPath || path.join(eglv2Dir, 'installations.jsonl')
  const rawInst = await safeReadAsync(instPath)
  if (!rawInst) return []

  // Load catalog cache if present
  const catPath = options.catalogCachePath || path.join(eglv2Dir, 'cache', 'prod', 'catalog-cache.json')
  let catalogItems = {}
  const rawCat = await safeReadAsync(catPath)
  if (rawCat) {
    try {
      const parsedCat = JSON.parse(rawCat)
      catalogItems = parsedCat.items || {}
    } catch {}
  }

  // Load library cache across user account folders
  const accountBase = options.accountBaseDir || path.join(eglv2Dir, 'cache', 'prod', 'account')
  const libTitles = new Map()
  try {
    const accounts = await fsPromises.readdir(accountBase)
    for (const acc of accounts) {
      const p = path.join(accountBase, acc, 'library-cache.json')
      const rawLib = await safeReadAsync(p)
      if (rawLib) {
        try {
          const parsedLib = JSON.parse(rawLib)
          for (const item of (parsedLib.items || [])) {
            if (item && item.title) {
              if (item.appId?.itemId) libTitles.set(String(item.appId.itemId).toLowerCase(), String(item.title).trim())
              if (item.appId?.appName) libTitles.set(String(item.appId.appName).toLowerCase(), String(item.title).trim())
            }
          }
        } catch {}
      }
    }
  } catch {}

  // Load disk size cache
  const sizePath = options.diskSizeCachePath || path.join(eglv2Dir, 'cache', 'disk-size-cache.json')
  const sizeMap = new Map()
  const rawSize = await safeReadAsync(sizePath)
  if (rawSize) {
    try {
      const parsedSize = JSON.parse(rawSize)
      for (const entry of (parsedSize.entries || [])) {
        if (entry && entry.bytes && entry.app_id) {
          if (entry.app_id.itemId) sizeMap.set(String(entry.app_id.itemId).toLowerCase(), toNumber(entry.bytes, 0))
          if (entry.app_id.appName) sizeMap.set(String(entry.app_id.appName).toLowerCase(), toNumber(entry.bytes, 0))
        }
      }
    } catch {}
  }

  const lines = rawInst.split('\n').filter((l) => l.trim().length > 0)
  const records = []

  for (let i = 0; i < lines.length; i++) {
    let entry = null
    try {
      entry = JSON.parse(lines[i])
    } catch {
      continue
    }

    // Skip header or invalid entries
    if (!entry || !entry.dir || typeof entry.dir !== 'string') continue
    const installLocation = path.normalize(String(entry.dir))
    const existsOnDisk = await fileExistsAsync(installLocation)
    if (!existsOnDisk) continue

    const itemId = String(entry.itemId || '').trim()
    const artifactId = String(entry.artifactId || '').trim()
    if (!itemId && !artifactId) continue

    // Lookup catalog metadata
    const catalogItem = catalogItems[itemId]?.item || catalogItems[artifactId]?.item || null

    let title = (catalogItem && catalogItem.title ? String(catalogItem.title).trim() : null) ||
      libTitles.get(itemId.toLowerCase()) ||
      libTitles.get(artifactId.toLowerCase()) ||
      path.basename(installLocation)

    if (!isStandaloneV2(entry, title)) continue

    const isDlc = Boolean(entry.parentInstallationId)

    // Artwork resolution: prefer official Epic catalog boxart, fallback to artifactId CDN
    let coverUrl = null
    let heroUrl = null
    if (catalogItem && Array.isArray(catalogItem.keyImages)) {
      for (const img of catalogItem.keyImages) {
        if (!coverUrl && (img.type === 'DieselGameBoxTall' || img.type === 'Thumbnail')) coverUrl = img.url
        if (!heroUrl && (img.type === 'DieselGameBox' || img.type === 'Hero')) heroUrl = img.url
      }
      if (!coverUrl && catalogItem.keyImages[0]?.url) coverUrl = catalogItem.keyImages[0].url
      if (!heroUrl && coverUrl) heroUrl = coverUrl
    }
    if (!coverUrl || !heroUrl) {
      const fallbackArt = artworkUrls(artifactId || itemId)
      if (!coverUrl) coverUrl = fallbackArt.coverUrl
      if (!heroUrl) heroUrl = fallbackArt.heroUrl
    }

    const appName = artifactId || itemId
    const catalogItemId = itemId
    const appId = catalogItemId || artifactId
    const platformLaunchId = artifactId || appName
    const idSource = catalogItemId ? 'epic-manifest:CatalogItemId' : 'epic-manifest:AppName'
    const sizeBytes = sizeMap.get(itemId.toLowerCase()) || sizeMap.get(artifactId.toLowerCase()) || 0
    const executablePath = entry.launchExecutable
      ? path.join(installLocation, String(entry.launchExecutable).trim())
      : null

    records.push({
      canonicalTitle: title,
      normalizedTitle: title,
      description: catalogItem?.description || null,
      developer: catalogItem?.developer || null,
      publisher: null,
      releaseDate: null,
      coverUrl,
      heroUrl,
      isInstalled: true,
      driveLetter: getDriveLetter(installLocation),
      installPath: installLocation,
      executablePath,
      installSizeBytes: sizeBytes,
      playTimeSeconds: 0,
      lastPlayed: null,
      platform: 'epic',
      platformGameId: appId,
      platformLaunchId,
      idSource,
      isDlc,
      launchUri: `com.epicgames.launcher://apps/${encodeURIComponent(platformLaunchId)}?action=launch&silent=true`,
      installUri: `com.epicgames.launcher://apps/${encodeURIComponent(platformLaunchId)}?action=install`,
      source: 'local-scan',
      driveStatus: 'online',
      rawManifest: {
        appName,
        catalogItemId,
        artifactId,
        installLocation,
        existsOnDisk: true,
      },
    })
  }

  return records
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

      // Check if this game is still present and installed in Epic manifests (v1 or v2)
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

async function scanEpic(onProgress, db, options = {}) {
  const v1Directory = options.v1Directory || epicManifestDirectory()
  const v2Directory = options.v2Directory || epicV2Directory()

  let v1Files = []
  try {
    const entries = await fsPromises.readdir(v1Directory)
    v1Files = entries.filter((name) => name.toLowerCase().endsWith('.item'))
  } catch { v1Files = [] }

  const v2InstPath = options.v2InstallationsPath || path.join(v2Directory, 'installations.jsonl')
  const hasV2 = await fileExistsAsync(v2InstPath)
  const totalSteps = v1Files.length + (hasV2 ? 1 : 0)

  emitProgress(onProgress, {
    source: 'epic',
    phase: 'scanning',
    current: 0,
    total: totalSteps,
    message: totalSteps > 0
      ? `Scanning Epic Games (${v1Files.length} v1 manifest${v1Files.length === 1 ? '' : 's'}, v2 ${hasV2 ? 'detected' : 'not present'}).`
      : 'Epic manifest folder not found.',
  })

  const records = []
  const sweptInstalledAppNames = new Set()
  const sweptInstalledCatalogIds = new Set()
  const sweptInstalledPaths = new Set()

  // 1. Scan Epic v1 (legacy) manifests
  if (v1Files.length > 0) {
    const parsedV1 = await Promise.all(
      v1Files.map((file) => parseEpicManifest(path.join(v1Directory, file)))
    )

    parsedV1.forEach((record, index) => {
      if (record) {
        records.push(record)
        if (record.isInstalled && record.rawManifest) {
          if (record.rawManifest.appName) sweptInstalledAppNames.add(record.rawManifest.appName.toLowerCase())
          if (record.rawManifest.catalogItemId) sweptInstalledCatalogIds.add(record.rawManifest.catalogItemId.toLowerCase())
          if (record.rawManifest.artifactId) sweptInstalledAppNames.add(record.rawManifest.artifactId.toLowerCase())
          if (record.installPath) sweptInstalledPaths.add(path.normalize(record.installPath).toLowerCase())
        }
      }
      emitProgress(onProgress, { source: 'epic', phase: 'scanning', current: index + 1, total: totalSteps, message: `Checked ${v1Files[index]}.` })
    })
  }

  // 2. Scan Epic v2 (new architecture) installations
  if (hasV2) {
    try {
      const v2Records = await parseEpicV2Installations(v2Directory, options)
      for (const rec of v2Records) {
        // If already present from v1, merge/update
        const existingIdx = records.findIndex((r) =>
          (r.installPath && rec.installPath && path.normalize(r.installPath).toLowerCase() === path.normalize(rec.installPath).toLowerCase()) ||
          (r.platformLaunchId && rec.platformLaunchId && r.platformLaunchId.toLowerCase() === rec.platformLaunchId.toLowerCase())
        )
        if (existingIdx >= 0) {
          records[existingIdx] = { ...records[existingIdx], ...rec }
        } else {
          records.push(rec)
        }

        if (rec.isInstalled && rec.rawManifest) {
          if (rec.rawManifest.appName) sweptInstalledAppNames.add(rec.rawManifest.appName.toLowerCase())
          if (rec.rawManifest.catalogItemId) sweptInstalledCatalogIds.add(rec.rawManifest.catalogItemId.toLowerCase())
          if (rec.rawManifest.artifactId) sweptInstalledAppNames.add(rec.rawManifest.artifactId.toLowerCase())
          if (rec.installPath) sweptInstalledPaths.add(path.normalize(rec.installPath).toLowerCase())
        }
      }
      emitProgress(onProgress, { source: 'epic', phase: 'scanning', current: totalSteps, total: totalSteps, message: `Processed Epic v2 installations (${v2Records.length} titles).` })
    } catch (v2Err) {
      console.error('[EpicScanner] Error reading v2 installations:', v2Err)
    }
  }

  // Reconciliation Phase: update uninstalled Epic games in DB without deleting
  if (db) {
    await reconcileEpic(db, {
      installedAppNames: sweptInstalledAppNames,
      installedCatalogIds: sweptInstalledCatalogIds,
      installedPaths: sweptInstalledPaths,
    })
  }

  return { source: 'epic', records, directory: hasV2 ? v2Directory : v1Directory }
}

module.exports = {
  scanEpic,
  parseEpicManifest,
  parseEpicV2Installations,
  epicManifestDirectory,
  epicV2Directory,
  isStandaloneManifest,
  isStandaloneV2,
  reconcileEpic,
}
