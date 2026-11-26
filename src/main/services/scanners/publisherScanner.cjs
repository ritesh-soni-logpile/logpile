const path = require('node:path')
const {
  safeRead,
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
  getUninstallRegistryEntries,
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
      return (
        name.includes('rockstar games launcher') ||
        name.includes('social club') ||
        name.includes('rockstar sdk') ||
        name.includes('rockstar games sdk') ||
        name.endsWith(' sdk')
      )
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

function scanNetmarble(onProgress, _db, options = {}) {
  emitProgress(onProgress, { source: 'netmarble', phase: 'scanning', current: 0, total: 1, message: 'Scanning for Netmarble installations...' })
  const records = []
  const seenPaths = new Set()

  // 1. Read official Netmarble Launcher config.json
  const isMockTest = Array.isArray(options.entries)
  const appData = process.env.APPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : null)
  const configPath = options.netmarbleConfigPath || (!isMockTest && appData ? path.join(appData, 'Netmarble Launcher', 'config.json') : null)
  if (configPath && fileExists(configPath)) {
    try {
      const raw = safeRead(configPath)
      const parsed = raw ? JSON.parse(raw) : null
      const games = parsed?.game || {}
      for (const [gameCode, gameData] of Object.entries(games)) {
        const build = gameData?.build || {}
        const installPath = cleanDirectoryPath(gameData?.installPath || build?.installPath)
        if (!installPath || !fileExists(installPath)) continue
        if (seenPaths.has(installPath.toLowerCase())) continue

        const title = cleanGameTitle(build?.name || gameData?.installFolderName || gameCode)
        const exeName = build?.download?.executeFileName || build?.executeFileName
        const directExe = exeName ? path.join(installPath, exeName) : null
        const resolvedExe = (directExe && fileExists(directExe)) ? directExe : resolveGameExecutable(installPath, title)
        const coverUrl = build?.iconImageUrl || null

        seenPaths.add(installPath.toLowerCase())
        records.push({
          canonicalTitle: title,
          normalizedTitle: title,
          description: null,
          developer: 'Netmarble',
          publisher: 'Netmarble',
          releaseDate: null,
          coverUrl,
          heroUrl: null,
          isInstalled: Boolean(resolvedExe && fileExists(resolvedExe)),
          driveLetter: getDriveLetter(installPath),
          installPath,
          installSizeBytes: directorySizeSafe(installPath),
          playTimeSeconds: 0,
          lastPlayed: null,
          platform: 'netmarble',
          platformGameId: `netmarble:${gameCode}`,
          platformLaunchId: gameCode,
          idSource: 'netmarble:config',
          launchUri: null,
          installUri: null,
          executable: resolvedExe,
          launchArguments: null,
          source: 'local-scan',
          storeName: 'Netmarble',
          driveStatus: 'online',
        })
      }
    } catch {}
  }

  // 2. Fallback / supplementary Windows Uninstall entries
  const uninstallRecords = matchUninstallEntriesByRule({
    platform: 'netmarble',
    storeName: 'Netmarble',
    defaultPublisher: 'Netmarble',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      const loc = String(item.InstallLocation || '').toLowerCase()
      const name = String(item.DisplayName || '').toLowerCase()
      const key = String(item.key || '').toLowerCase()
      return (
        pub.includes('netmarble') ||
        loc.includes('\\netmarble\\') ||
        loc.includes('\\netmarble game\\') ||
        key.includes('tog') ||
        key.includes('gotasia')
      )
    },
    exclude: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      return name.includes('netmarble launcher') || name === 'netmarble'
    },
  }, options)

  for (const rec of uninstallRecords) {
    const key = (rec.installPath || rec.canonicalTitle).toLowerCase()
    if (seenPaths.has(key)) continue
    seenPaths.add(key)
    records.push(rec)
  }

  emitProgress(onProgress, { source: 'netmarble', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} Netmarble titles.` })
  return { source: 'netmarble', records }
}

function scanNetEase(onProgress, _db, options = {}) {
  emitProgress(onProgress, { source: 'netease', phase: 'scanning', current: 0, total: 1, message: 'Scanning for NetEase / LoadingBay titles...' })
  const records = []
  const seenPaths = new Set()

  // 1. Scan LoadingBay game registry
  const isMockTest = Array.isArray(options.entries)
  const regEntries = Array.isArray(options.loadingBayRegistryEntries)
    ? options.loadingBayRegistryEntries
    : (isMockTest ? [] : queryRegistryTree('HKEY_CURRENT_USER\\SOFTWARE\\LoadingBay\\LoadingBayInstaller\\game'))

  const uninstallEntries = Array.isArray(options.entries) ? options.entries : getUninstallRegistryEntries()
  const uninstallByGameId = new Map()
  for (const item of uninstallEntries) {
    const key = String(item.key || '')
    const match = key.match(/Loading\s*Bay\s*(\d+)/i)
    if (match) {
      uninstallByGameId.set(match[1], item)
    }
  }

  for (const entry of regEntries) {
    const gameId = String(entry.key || '').split('\\').pop()
    if (!gameId || !/^\d+$/.test(gameId)) continue

    const installPath = cleanDirectoryPath(entry.InstallPath || entry.LastInstallPath)
    if (!installPath || !fileExists(installPath)) continue
    if (seenPaths.has(installPath.toLowerCase())) continue

    const uninst = uninstallByGameId.get(gameId)
    const rawTitle = uninst?.DisplayName || path.basename(installPath)
    const title = cleanGameTitle(rawTitle)
    const startupExe = entry.StartupPath || entry.RunningProcessName
    const directExe = startupExe ? path.join(installPath, startupExe) : null
    const executable = (directExe && fileExists(directExe)) ? directExe : resolveGameExecutable(installPath, title)
    const isInstalled = Boolean(executable && fileExists(executable))

    seenPaths.add(installPath.toLowerCase())
    records.push({
      canonicalTitle: title,
      normalizedTitle: title,
      description: null,
      developer: uninst?.Publisher || 'NetEase Games',
      publisher: 'NetEase Games',
      releaseDate: null,
      coverUrl: null,
      heroUrl: null,
      isInstalled,
      driveLetter: getDriveLetter(installPath),
      installPath,
      installSizeBytes: directorySizeSafe(installPath),
      playTimeSeconds: 0,
      lastPlayed: null,
      platform: 'netease',
      platformGameId: `netease:${gameId}`,
      platformLaunchId: gameId,
      idSource: 'netease-loadingbay:registry',
      launchUri: `loadingbay://mygame/?gameId=${gameId}`,
      installUri: null,
      executable,
      launchArguments: null,
      source: 'local-scan',
      storeName: 'NetEase',
      driveStatus: 'online',
    })
  }

  // 2. Match standard Windows Uninstall entries
  const uninstallRecords = matchUninstallEntriesByRule({
    platform: 'netease',
    storeName: 'NetEase',
    defaultPublisher: 'NetEase Games',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      const loc = String(item.InstallLocation || '').toLowerCase()
      const key = String(item.key || '').toLowerCase()
      return (
        pub.includes('netease') ||
        loc.includes('\\netease\\') ||
        loc.includes('\\loading bay\\') ||
        key.includes('loading bay')
      )
    },
    exclude: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      return (
        name.replace(/\s+/g, '').includes('loadingbay') ||
        name.includes('fever') ||
        name.includes('netease launcher')
      )
    },
  }, options)

  for (const rec of uninstallRecords) {
    const key = (rec.installPath || rec.canonicalTitle).toLowerCase()
    if (seenPaths.has(key)) continue
    seenPaths.add(key)
    records.push(rec)
  }

  emitProgress(onProgress, { source: 'netease', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} NetEase titles.` })
  return { source: 'netease', records }
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
  scanNetmarble,
  scanNetEase,
  scanGaijin: publisherScanners.gaijin,
  scanNexon: publisherScanners.nexon,
  scanKuro: publisherScanners.kuro,
  scanRoblox: publisherScanners.roblox,
  scanStandaloneClients: publisherScanners['standalone-clients'],
}
