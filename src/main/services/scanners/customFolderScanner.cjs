const path = require('node:path')
const {
  fs,
  fileExists,
  getDriveLetter,
  emitProgress,
  cleanDirectoryPath,
  cleanGameTitle,
  directorySizeSafe,
  isOtherStoreInstallPath,
  resolveGameExecutable,
} = require('./scannerUtils.cjs')

const SKIP_SUBDIR_NAMES = new Set([
  'steamlibrary', 'steamapps', 'epic games', 'gog games', 'xboxgames',
  'modifiablewindowsapps', 'windowsapps', 'logpile', 'logpile_data',
  '_redist', 'redist', 'directx', 'logs', 'cache', 'temp', 'backup', 'backups',
  '$recycle.bin', 'system volume information', 'bin', 'binaries', 'data',
  'engine', 'assets', 'content', 'common', 'downloads',
])

function cleanFolderGameTitle(folderName) {
  return cleanGameTitle(
    String(folderName || '')
      .replace(/\[[^\]]*(?:repack|fitgirl|dodi|elamigos|portable|gog|itch)[^\]]*\]/gi, '')
      .replace(/\((?:19\d\d|20\d\d|pc|windows|win64|x64|portable|gog)\)/gi, '')
      .replace(/\s+v\d+(?:\.\d+)+.*$/i, '')
      .replace(/[._]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function getConfiguredCustomFolders(db, options = {}) {
  if (Array.isArray(options.folders)) return options.folders
  if (!db || typeof db.prepare !== 'function') return []
  try {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'custom_scan_folders'").get()
    if (!row?.value) return []
    const parsed = JSON.parse(row.value)
    return Array.isArray(parsed) ? parsed.filter((f) => typeof f === 'string' && f.trim()) : []
  } catch {
    return []
  }
}

function getAlreadyIndexedPaths(db) {
  const paths = new Set()
  if (!db || typeof db.prepare !== 'function') return paths
  try {
    const rows = db.prepare("SELECT install_path FROM games WHERE install_path IS NOT NULL AND TRIM(install_path) != ''").all()
    for (const row of rows) {
      try { paths.add(path.normalize(row.install_path).toLowerCase()) } catch {}
    }
  } catch {}
  return paths
}

function scanCustomFolders(onProgress, db, options = {}) {
  const folders = getConfiguredCustomFolders(db, options)
  if (!folders.length) {
    emitProgress(onProgress, { source: 'custom-folders', phase: 'complete', current: 1, total: 1, message: 'No custom scan folders configured.' })
    return { source: 'custom-folders', records: [] }
  }

  emitProgress(onProgress, { source: 'custom-folders', phase: 'scanning', current: 0, total: folders.length, message: `Scanning ${folders.length} custom game folder${folders.length === 1 ? '' : 's'}...` })

  const records = []
  const seenPaths = new Set()
  const existingDbPaths = options.existingInstallPaths || getAlreadyIndexedPaths(db)

  folders.forEach((rawFolder, index) => {
    const rootFolder = cleanDirectoryPath(rawFolder)
    if (!rootFolder || !fileExists(rootFolder)) return

    let entries = []
    try {
      entries = fs.readdirSync(rootFolder, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue
      const nameLower = entry.name.toLowerCase()
      if (nameLower.startsWith('.') || nameLower.startsWith('$') || SKIP_SUBDIR_NAMES.has(nameLower)) continue

      const gamePath = path.join(rootFolder, entry.name)
      const normPath = path.normalize(gamePath).toLowerCase()
      if (seenPaths.has(normPath) || existingDbPaths.has(normPath) || isOtherStoreInstallPath(gamePath)) continue

      const title = cleanFolderGameTitle(entry.name) || entry.name
      const executable = resolveGameExecutable(gamePath, title, { maxDepth: 2 })
      if (!executable) continue

      seenPaths.add(normPath)
      records.push({
        canonicalTitle: title,
        normalizedTitle: title,
        description: null,
        developer: null,
        publisher: 'Standalone',
        releaseDate: null,
        coverUrl: null,
        heroUrl: null,
        isInstalled: true,
        driveLetter: getDriveLetter(gamePath),
        installPath: gamePath,
        installSizeBytes: directorySizeSafe(gamePath),
        playTimeSeconds: 0,
        lastPlayed: null,
        platform: 'custom-folder',
        platformGameId: `folder:${normPath}`,
        platformLaunchId: `folder:${normPath}`,
        idSource: 'custom-folder:path',
        launchUri: null,
        installUri: null,
        executable,
        launchArguments: null,
        source: 'local-scan',
        storeName: 'Standalone',
        driveStatus: 'online',
      })
    }

    emitProgress(onProgress, { source: 'custom-folders', phase: 'scanning', current: index + 1, total: folders.length, message: `Scanned custom folder ${path.basename(rootFolder) || rootFolder}.` })
  })

  emitProgress(onProgress, { source: 'custom-folders', phase: 'complete', current: folders.length, total: folders.length, message: `Found ${records.length} games in custom folders.` })
  return { source: 'custom-folders', records }
}

module.exports = { scanCustomFolders, cleanFolderGameTitle, getConfiguredCustomFolders }
