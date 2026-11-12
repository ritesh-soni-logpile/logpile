const path = require('node:path')
const { getUninstallRegistryEntries, fileExists, getDriveLetter, emitProgress } = require('./scannerUtils.cjs')
const { directorySize } = require('./gogScanner.cjs')

function scanRepacks(onProgress) {
  emitProgress(onProgress, { source: 'repack', phase: 'scanning', current: 0, total: 1, message: 'Scanning for standalone game installations...' })
  
  const entries = getUninstallRegistryEntries()
  const records = []

  entries.forEach((item) => {
    const displayName = item.DisplayName || ''
    const publisher = item.Publisher || ''
    const installLocation = item.InstallLocation || ''
    const displayIcon = item.DisplayIcon || ''

    if (!displayName) return

    const nameLower = displayName.toLowerCase()
    const pathLower = installLocation.toLowerCase()
    const pubLower = publisher.toLowerCase()

    const isRepack = 
      pubLower.includes('fitgirl') || 
      pubLower.includes('dodi') || 
      pubLower.includes('elamigos') ||
      pathLower.includes('fitgirl') || 
      pathLower.includes('dodi') || 
      pathLower.includes('elamigos') ||
      nameLower.includes('repack') ||
      (!publisher && (pathLower.includes('\\games\\') || pathLower.includes('fitgirl')))

    const isSystemOrStore = 
      pubLower.includes('microsoft') || 
      pubLower.includes('nvidia') || 
      pubLower.includes('gog.com') || 
      pathLower.includes('steamapps') ||
      nameLower.includes('driver') ||
      nameLower.includes('visual studio')

    if (isRepack && !isSystemOrStore) {
      const cleanTitle = displayName
        .replace(/\[.*?repack.*?\]/gi, '')
        .replace(/\(.*?\)/gi, '')
        .replace(/v\d+(\.\d+)+/gi, '')
        .trim()

      const folderPath = installLocation || (displayIcon ? path.dirname(displayIcon.replace(/,\d+$/, '')) : null)
      const normalizedPath = folderPath ? path.normalize(folderPath) : null
      const isOnline = normalizedPath && fileExists(normalizedPath)

      records.push({
        canonicalTitle: cleanTitle || displayName.trim(),
        normalizedTitle: cleanTitle || displayName.trim(),
        description: null,
        developer: null,
        publisher: publisher.trim() || 'Standalone',
        releaseDate: null,
        coverUrl: null,
        heroUrl: null,
        isInstalled: Boolean(isOnline),
        driveLetter: getDriveLetter(normalizedPath),
        installPath: normalizedPath,
        installSizeBytes: isOnline ? directorySize(normalizedPath) : 0,
        playTimeSeconds: 0,
        lastPlayed: null,
        platform: 'repack',
        platformGameId: item.key.split('\\').pop(),
        platformLaunchId: item.key.split('\\').pop(),
        idSource: 'repack-registry:uninstall-key',
        launchUri: null,
        installUri: null,
        executable: (displayIcon && /\.exe$/i.test(displayIcon.replace(/,\d+$/, '').replace(/^["']|["']$/g, '').trim())) ? displayIcon.replace(/,\d+$/, '').replace(/^["']|["']$/g, '').trim() : null,
        source: 'local-scan',
        driveStatus: isOnline ? 'online' : 'offline',
      })
    }
  })

  emitProgress(onProgress, { source: 'repack', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} standalone installations.` })
  return { source: 'repack', records }
}

module.exports = { scanRepacks }