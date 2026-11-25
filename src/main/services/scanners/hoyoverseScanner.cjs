const path = require('node:path')
const {
  fileExists,
  getDriveLetter,
  emitProgress,
  queryRegistryTree,
  cleanDirectoryPath,
  cleanGameTitle,
  directorySizeSafe,
  resolveGameExecutable,
  matchUninstallEntriesByRule,
} = require('./scannerUtils.cjs')

const HOYO_PRODUCT_MAP = {
  hk4e_global: { title: 'Genshin Impact', exe: ['GenshinImpact.exe', 'YuanShen.exe'] },
  hk4e_cn: { title: 'Genshin Impact', exe: ['YuanShen.exe', 'GenshinImpact.exe'] },
  hkrpg_global: { title: 'Honkai: Star Rail', exe: ['StarRail.exe'] },
  hkrpg_cn: { title: 'Honkai: Star Rail', exe: ['StarRail.exe'] },
  nap_global: { title: 'Zenless Zone Zero', exe: ['ZenlessZoneZero.exe'] },
  nap_cn: { title: 'Zenless Zone Zero', exe: ['ZenlessZoneZero.exe'] },
  bh3_global: { title: 'Honkai Impact 3rd', exe: ['BH3.exe'] },
  bh3_cn: { title: 'Honkai Impact 3rd', exe: ['BH3.exe'] },
}

function scanHoyoverse(onProgress, _db, options = {}) {
  emitProgress(onProgress, { source: 'hoyo', phase: 'scanning', current: 0, total: 1, message: 'Scanning for HoYoPlay / HoYoverse games...' })

  const records = []
  const seenPaths = new Set()

  const regRoots = [
    'HKEY_CURRENT_USER\\Software\\Cognosphere\\HYP',
    'HKEY_CURRENT_USER\\Software\\miHoYo\\HYP',
    'HKEY_CURRENT_USER\\Software\\Cognosphere\\Star Rail',
    'HKEY_CURRENT_USER\\Software\\Cognosphere\\Zenless Zone Zero',
    'HKEY_CURRENT_USER\\Software\\miHoYo\\Genshin Impact',
    'HKEY_CURRENT_USER\\Software\\miHoYo\\Honkai Impact 3rd',
  ]

  const treeEntries = Array.isArray(options.registryEntries)
    ? options.registryEntries
    : regRoots.flatMap((root) => queryRegistryTree(root))

  for (const item of treeEntries) {
    const rawPath = item.GameInstallPath || item.InstallPath || item.InstallDir
    const installPath = cleanDirectoryPath(rawPath)
    if (!installPath || !fileExists(installPath)) continue

    const keyTail = String(item.key || '').split('\\').pop()
    const mapped = HOYO_PRODUCT_MAP[keyTail.toLowerCase()]
    const folderTitle = path.basename(installPath)
    const cleanTitle = cleanGameTitle(mapped?.title || item.DisplayName || folderTitle)
    if (!cleanTitle || /hoyoplay|launcher/i.test(cleanTitle)) continue

    const normKey = installPath.toLowerCase()
    if (seenPaths.has(normKey)) continue
    seenPaths.add(normKey)

    const executable = resolveGameExecutable(installPath, cleanTitle, {
      preferredExeNames: mapped?.exe || ['GenshinImpact.exe', 'StarRail.exe', 'ZenlessZoneZero.exe', 'BH3.exe'],
    })

    records.push({
      canonicalTitle: cleanTitle,
      normalizedTitle: cleanTitle,
      description: null,
      developer: 'HoYoverse',
      publisher: 'Cognosphere / HoYoverse',
      releaseDate: null,
      coverUrl: null,
      heroUrl: null,
      isInstalled: true,
      driveLetter: getDriveLetter(installPath),
      installPath,
      installSizeBytes: directorySizeSafe(installPath),
      playTimeSeconds: 0,
      lastPlayed: null,
      platform: 'hoyo',
      platformGameId: keyTail || cleanTitle,
      platformLaunchId: keyTail || cleanTitle,
      idSource: 'hoyo-registry:hyp',
      launchUri: null,
      installUri: null,
      executable,
      launchArguments: null,
      source: 'local-scan',
      storeName: 'HoYoPlay',
      driveStatus: 'online',
    })
  }

  const regRecords = matchUninstallEntriesByRule({
    platform: 'hoyo',
    storeName: 'HoYoPlay',
    defaultPublisher: 'HoYoverse',
    developer: 'HoYoverse',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      return pub.includes('cognosphere') || pub.includes('hoyoverse') || pub.includes('mihoyo')
    },
    exclude: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      return name.includes('hoyoplay') || name === 'launcher'
    },
    preferredExeNames: () => ['GenshinImpact.exe', 'StarRail.exe', 'ZenlessZoneZero.exe', 'BH3.exe'],
  }, options)

  for (const rec of regRecords) {
    const pKey = (rec.installPath || rec.canonicalTitle).toLowerCase()
    if (!seenPaths.has(pKey)) {
      seenPaths.add(pKey)
      records.push(rec)
    }
  }

  emitProgress(onProgress, { source: 'hoyo', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} HoYoPlay games.` })
  return { source: 'hoyo', records }
}

module.exports = { scanHoyoverse }
