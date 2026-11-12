const path = require('node:path')
const { getUninstallRegistryEntries, fileExists, getDriveLetter, emitProgress } = require('./scannerUtils.cjs')
const { directorySize } = require('./gogScanner.cjs')

function scanEA(onProgress) {
  emitProgress(onProgress, { source: 'ea', phase: 'scanning', current: 0, total: 1, message: 'Scanning for EA installations...' })
  
  const entries = getUninstallRegistryEntries()
  const records = []

  entries.forEach((item) => {
    const displayName = item.DisplayName || ''
    const publisher = item.Publisher || ''
    const installLocation = item.InstallLocation || ''
    const displayIcon = item.DisplayIcon || ''

    if (!displayName) return

    const isEA = publisher.toLowerCase().includes('electronic arts')
    const isApp = displayName.toLowerCase().includes('ea app') || displayName.toLowerCase().includes('origin')
    const isSteam = installLocation.toLowerCase().includes('steamapps')

    if (isEA && !isApp && !isSteam) {
      const folderPath = installLocation || (displayIcon ? path.dirname(displayIcon.replace(/,\d+$/, '').replace(/^"/, '')) : null)
      const normalizedPath = folderPath ? path.normalize(folderPath) : null
      const isOnline = normalizedPath && fileExists(normalizedPath)
      const gameId = item.key.split('\\').pop()
      const cleanTitle = displayName.replace(/[™®]/g, '').replace(/T$/g, '').trim()

      records.push({
        canonicalTitle: cleanTitle,
        normalizedTitle: cleanTitle,
        description: null,
        developer: null,
        publisher: 'Electronic Arts',
        releaseDate: null,
        coverUrl: null,
        heroUrl: null,
        isInstalled: Boolean(isOnline),
        driveLetter: getDriveLetter(normalizedPath),
        installPath: normalizedPath,
        installSizeBytes: isOnline ? directorySize(normalizedPath) : 0,
        playTimeSeconds: 0,
        lastPlayed: null,
        platform: 'ea',
        platformGameId: gameId,
        platformLaunchId: gameId,
        idSource: 'ea-registry:uninstall-key',
        launchUri: null,
        installUri: null,
        executable: (displayIcon && /\.exe$/i.test(displayIcon.replace(/,\d+$/, '').replace(/^["']|["']$/g, '').trim())) ? displayIcon.replace(/,\d+$/, '').replace(/^["']|["']$/g, '').trim() : null,
        source: 'local-scan',
        driveStatus: isOnline ? 'online' : 'offline',
      })
    }
  })

  emitProgress(onProgress, { source: 'ea', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} EA games.` })
  return { source: 'ea', records }
}

module.exports = { scanEA }