const path = require('node:path')
const {
  fileExists,
  getDriveLetter,
  emitProgress,
  queryRegistryTree,
  cleanDirectoryPath,
  cleanGameTitle,
  directorySizeSafe,
  isOtherStoreInstallPath,
  resolveGameExecutable,
  matchUninstallEntriesByRule,
} = require('./scannerUtils.cjs')

function extractBattleNetCode(item, keyTail) {
  const uninst = String(item.UninstallString || '')
  const uidMatch = uninst.match(/--uid=([a-z0-9_]+)/i)
  if (uidMatch) return uidMatch[1].toUpperCase()
  const keyMatch = String(keyTail || '').match(/^([a-z0-9_]+)$/i)
  if (keyMatch && keyMatch[1].length <= 8) return keyMatch[1].toUpperCase()
  const name = String(item.DisplayName || '').toLowerCase()
  if (name.includes('overwatch')) return 'PRO'
  if (name.includes('world of warcraft')) return 'WOW'
  if (name.includes('diablo iv')) return 'FENRIS'
  if (name.includes('diablo iii')) return 'D3'
  if (name.includes('diablo ii')) return 'OSI'
  if (name.includes('hearthstone')) return 'WTCG'
  if (name.includes('heroes of the storm')) return 'HERO'
  if (name.includes('starcraft ii')) return 'S2'
  if (name.includes('starcraft')) return 'S1'
  if (name.includes('warcraft iii')) return 'W3'
  return keyTail || null
}

function scanBattleNet(onProgress, _db, options = {}) {
  emitProgress(onProgress, { source: 'battlenet', phase: 'scanning', current: 0, total: 1, message: 'Scanning for Battle.net installations...' })
  const records = matchUninstallEntriesByRule({
    platform: 'battlenet',
    storeName: 'Battle.net',
    defaultPublisher: 'Blizzard Entertainment',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      const uninst = String(item.UninstallString || '').toLowerCase()
      return pub.includes('blizzard') || (uninst.includes('battle.net') && uninst.includes('--uid='))
    },
    exclude: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      return name === 'battle.net' || name.includes('battle.net setup')
    },
    extractId: (item, keyTail) => extractBattleNetCode(item, keyTail) || keyTail,
    buildLaunchUri: (code) => (code && /^[A-Z0-9_]{2,10}$/i.test(code) ? `battlenet://game/${encodeURIComponent(code)}` : 'battlenet://'),
  }, options)
  emitProgress(onProgress, { source: 'battlenet', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} Battle.net games.` })
  return { source: 'battlenet', records }
}

function scanRockstar(onProgress, _db, options = {}) {
  emitProgress(onProgress, { source: 'rockstar', phase: 'scanning', current: 0, total: 1, message: 'Scanning for Rockstar Games installations...' })
  const records = matchUninstallEntriesByRule({
    platform: 'rockstar',
    storeName: 'Rockstar Games',
    defaultPublisher: 'Rockstar Games',
    match: (item) => String(item.Publisher || '').toLowerCase().includes('rockstar games'),
    exclude: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      return name.includes('rockstar games launcher') || name.includes('social club') || name.includes('rockstar sdk')
    },
  }, options)

  const seenPaths = new Set(records.map((r) => (r.installPath || r.canonicalTitle).toLowerCase()))
  const regRoots = [
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Rockstar Games',
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\Rockstar Games',
  ]
  const regEntries = Array.isArray(options.rockstarRegistryEntries)
    ? options.rockstarRegistryEntries
    : regRoots.flatMap((root) => queryRegistryTree(root))

  for (const entry of regEntries) {
    const installPath = cleanDirectoryPath(entry.InstallFolder || entry.InstallLocation)
    if (!installPath || !fileExists(installPath) || isOtherStoreInstallPath(installPath)) continue
    if (seenPaths.has(installPath.toLowerCase())) continue

    const keyName = String(entry.key || '').split('\\').pop()
    if (!keyName || /launcher|social club|rockstar games$/i.test(keyName)) continue
    const title = cleanGameTitle(keyName)
    seenPaths.add(installPath.toLowerCase())

    records.push({
      canonicalTitle: title,
      normalizedTitle: title,
      description: null,
      developer: 'Rockstar Games',
      publisher: 'Rockstar Games',
      releaseDate: null,
      coverUrl: null,
      heroUrl: null,
      isInstalled: true,
      driveLetter: getDriveLetter(installPath),
      installPath,
      installSizeBytes: directorySizeSafe(installPath),
      playTimeSeconds: 0,
      lastPlayed: null,
      platform: 'rockstar',
      platformGameId: title,
      platformLaunchId: title,
      idSource: 'rockstar-registry:install-folder',
      launchUri: null,
      installUri: null,
      executable: resolveGameExecutable(installPath, title),
      launchArguments: null,
      source: 'local-scan',
      storeName: 'Rockstar Games',
      driveStatus: 'online',
    })
  }

  emitProgress(onProgress, { source: 'rockstar', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} Rockstar Games titles.` })
  return { source: 'rockstar', records }
}

const PUBLISHER_SCAN_CONFIGS = [
  {
    source: 'cdprojekt',
    platform: 'cdprojekt',
    storeName: 'CD Projekt',
    defaultPublisher: 'CD PROJEKT RED',
    label: 'CD Projekt REDlauncher',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      return pub.includes('cd projekt') && !pub.includes('gog')
    },
    exclude: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      return name.includes('redlauncher') || name.includes('redprelauncher') || name.includes('redmod')
    },
  },
  {
    source: 'netmarble',
    platform: 'netmarble',
    storeName: 'Netmarble',
    defaultPublisher: 'Netmarble',
    label: 'Netmarble',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      const loc = String(item.InstallLocation || '').toLowerCase()
      return pub.includes('netmarble') || loc.includes('\\netmarble\\')
    },
    exclude: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      return name.includes('netmarble launcher') || name === 'netmarble'
    },
  },
  {
    source: 'netease',
    platform: 'netease',
    storeName: 'NetEase',
    defaultPublisher: 'NetEase Games',
    label: 'NetEase',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      const loc = String(item.InstallLocation || '').toLowerCase()
      return pub.includes('netease') || loc.includes('\\netease\\') || loc.includes('\\loading bay\\')
    },
    exclude: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      return name.includes('loading bay') || name.includes('fever') || name.includes('netease launcher')
    },
  },
  {
    source: 'gaijin',
    platform: 'gaijin',
    storeName: 'Gaijin',
    defaultPublisher: 'Gaijin Entertainment',
    label: 'Gaijin',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      const loc = String(item.InstallLocation || '').toLowerCase()
      return pub.includes('gaijin') || loc.includes('\\gaijin\\')
    },
    exclude: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      return name.includes('gaijin.net agent') || name.includes('gaijin launcher')
    },
  },
  {
    source: 'nexon',
    platform: 'nexon',
    storeName: 'Nexon',
    defaultPublisher: 'NEXON',
    label: 'Nexon',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      const loc = String(item.InstallLocation || '').toLowerCase()
      return pub.includes('nexon') || loc.includes('\\nexon\\')
    },
    exclude: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      return name.includes('nexon launcher') || name.includes('nexon runtime') || name.includes('game security')
    },
  },
  {
    source: 'kuro',
    platform: 'kuro',
    storeName: 'Kuro Games',
    defaultPublisher: 'KURO GAMES',
    label: 'Kuro Games',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      const name = String(item.DisplayName || '').toLowerCase()
      const loc = String(item.InstallLocation || '').toLowerCase()
      return pub.includes('kuro') || loc.includes('\\wuthering waves\\') || name.includes('wuthering waves')
    },
    exclude: (item) => String(item.DisplayName || '').toLowerCase() === 'kuro launcher',
  },
  {
    source: 'roblox',
    platform: 'roblox',
    storeName: 'Roblox',
    defaultPublisher: 'Roblox Corporation',
    label: 'Roblox',
    match: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      const pub = String(item.Publisher || '').toLowerCase()
      return pub.includes('roblox') || name === 'roblox player' || name.startsWith('roblox player for')
    },
    exclude: (item) => String(item.DisplayName || '').toLowerCase().includes('roblox studio'),
    cleanTitle: () => 'Roblox',
    buildLaunchUri: () => 'roblox-player://',
  },
  {
    source: 'standalone-clients',
    platform: 'standalone-clients',
    storeName: 'Standalone',
    defaultPublisher: 'Standalone',
    label: 'Standalone MMO & Publisher Clients',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      const name = String(item.DisplayName || '').toLowerCase()
      return (
        pub.includes('smilegate') ||
        pub.includes('pearl abyss') ||
        pub.includes('grinding gear games') ||
        pub.includes('digital extremes') ||
        (pub.includes('square enix') && name.includes('final fantasy xiv'))
      )
    },
    exclude: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      return name === 'stove' || name.includes('stove launcher')
    },
  },
]

function createPublisherScanner(config) {
  return function scanPublisher(onProgress, _db, options = {}) {
    emitProgress(onProgress, { source: config.source, phase: 'scanning', current: 0, total: 1, message: `Scanning for ${config.label} titles...` })
    const records = matchUninstallEntriesByRule(config, options)
    emitProgress(onProgress, { source: config.source, phase: 'complete', current: 1, total: 1, message: `Found ${records.length} ${config.label} titles.` })
    return { source: config.source, records }
  }
}

const publisherScanners = Object.fromEntries(
  PUBLISHER_SCAN_CONFIGS.map((cfg) => [cfg.source, createPublisherScanner(cfg)])
)

module.exports = {
  scanBattleNet,
  scanRockstar,
  scanCdProjekt: publisherScanners.cdprojekt,
  scanNetmarble: publisherScanners.netmarble,
  scanNetEase: publisherScanners.netease,
  scanGaijin: publisherScanners.gaijin,
  scanNexon: publisherScanners.nexon,
  scanKuro: publisherScanners.kuro,
  scanRoblox: publisherScanners.roblox,
  scanStandaloneClients: publisherScanners['standalone-clients'],
}
