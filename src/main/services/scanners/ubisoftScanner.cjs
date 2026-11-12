const path = require('node:path')
const { getUninstallRegistryEntries, fileExists, getDriveLetter, emitProgress } = require('./scannerUtils.cjs')
const { directorySize } = require('./gogScanner.cjs')

function scanUbisoft(onProgress) {
  emitProgress(onProgress, { source: 'ubisoft', phase: 'scanning', current: 0, total: 1, message: 'Scanning for Ubisoft installations...' })
  
  const entries = getUninstallRegistryEntries()
  const records = []

  entries.forEach((item) => {
    const displayName = item.DisplayName || ''
    const publisher = item.Publisher || ''
    const installLocation = item.InstallLocation || ''
    const displayIcon = item.DisplayIcon || ''

    if (!displayName) return

    const isUbi = publisher.toLowerCase().includes('ubisoft')
    const isLauncher = displayName.toLowerCase().includes('ubisoft connect') || displayName.toLowerCase().includes('uplay')
    const isSteam = item.key.includes('Steam App') || installLocation.toLowerCase().includes('steamapps')

    if (isUbi && !isLauncher && !isSteam) {
      const folderPath = installLocation || (displayIcon ? path.dirname(displayIcon.replace(/,\d+$/, '')) : null)
      const normalizedPath = folderPath ? path.normalize(folderPath) : null
      const isOnline = normalizedPath && fileExists(normalizedPath)
      const gameId = item.key.split('\\').pop().replace('Uplay Install ', '')

      records.push({
        canonicalTitle: displayName.trim(),
        normalizedTitle: displayName.trim(),
        description: null,
        developer: null,
        publisher: 'Ubisoft',
        releaseDate: null,
        coverUrl: null,
        heroUrl: null,
        isInstalled: Boolean(isOnline),
        driveLetter: getDriveLetter(normalizedPath),
        installPath: normalizedPath,
        installSizeBytes: isOnline ? directorySize(normalizedPath) : 0,
        playTimeSeconds: 0,
        lastPlayed: null,
        platform: 'ubisoft',
        platformGameId: gameId,
        platformLaunchId: gameId,
        idSource: 'ubisoft-registry:uninstall-key',
        launchUri: `uplay://launch/${encodeURIComponent(gameId)}/0`,
        installUri: null,
        executable: (displayIcon && /\.exe$/i.test(displayIcon.replace(/,\d+$/, '').replace(/^["']|["']$/g, '').trim())) ? displayIcon.replace(/,\d+$/, '').replace(/^["']|["']$/g, '').trim() : null,
        source: 'local-scan',
        driveStatus: isOnline ? 'online' : 'offline',
      })
    }
  })

  emitProgress(onProgress, { source: 'ubisoft', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} Ubisoft games.` })
  return { source: 'ubisoft', records }
}

module.exports = { scanUbisoft }