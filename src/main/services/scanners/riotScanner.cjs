const path = require('node:path')
const {
  fs,
  safeRead,
  fileExists,
  getDriveLetter,
  emitProgress,
  cleanExePath,
  cleanDirectoryPath,
  cleanGameTitle,
  directorySizeSafe,
  resolveGameExecutable,
  matchUninstallEntriesByRule,
} = require('./scannerUtils.cjs')

const RIOT_PRODUCT_TITLES = {
  valorant: 'VALORANT',
  league_of_legends: 'League of Legends',
  bacon: 'Legends of Runeterra',
  lion: '2XKO',
  riot_client: null,
  vanguard: null,
}

function formatRiotTitle(slug, yamlContent = '') {
  const key = String(slug || '').trim().toLowerCase()
  if (Object.prototype.hasOwnProperty.call(RIOT_PRODUCT_TITLES, key)) {
    return RIOT_PRODUCT_TITLES[key]
  }
  const titleMatch = String(yamlContent).match(/shortcut_name:\s*["']?([^"'\r\n]+)["']?/i)
  if (titleMatch && titleMatch[1]) return cleanGameTitle(titleMatch[1])
  return key
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function parseSimpleYamlField(content, fieldName) {
  const regex = new RegExp(`^\\s*${fieldName}\\s*:\\s*["']?([^"'\\r\\n#]+)["']?`, 'mi')
  const match = String(content || '').match(regex)
  return match ? match[1].trim() : null
}

function findRiotClientExe(options = {}) {
  const installsPath = options.installsJsonPath || path.join(process.env.ProgramData || 'C:\\ProgramData', 'Riot Games', 'RiotClientInstalls.json')
  const raw = safeRead(installsPath)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      const candidates = [
        parsed.rc_live,
        parsed.rc_default,
        parsed.rc_esports,
        parsed.rc_beta,
        ...(parsed.associated_client ? Object.values(parsed.associated_client) : []),
      ]
      for (const cand of candidates) {
        const exe = cleanExePath(cand)
        if (exe && fileExists(exe)) return exe
      }
    } catch {}
  }
  const fallback = 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe'
  return fileExists(fallback) ? fallback : null
}

function scanRiot(onProgress, _db, options = {}) {
  emitProgress(onProgress, { source: 'riot', phase: 'scanning', current: 0, total: 1, message: 'Scanning for Riot Games installations...' })

  const records = []
  const seenPaths = new Set()
  const riotClientExe = findRiotClientExe(options)
  const metadataRoot = options.metadataDir || path.join(process.env.ProgramData || 'C:\\ProgramData', 'Riot Games', 'Metadata')

  if (fileExists(metadataRoot)) {
    try {
      const productDirs = fs.readdirSync(metadataRoot, { withFileTypes: true }).filter((d) => d.isDirectory())
      for (const dir of productDirs) {
        const folderPath = path.join(metadataRoot, dir.name)
        let files = []
        try { files = fs.readdirSync(folderPath) } catch { continue }
        const settingsFile = files.find((f) => f.endsWith('.live.product_settings.yaml')) || files.find((f) => f.endsWith('.product_settings.yaml'))
        if (!settingsFile) continue

        const content = safeRead(path.join(folderPath, settingsFile))
        if (!content) continue

        const slug = settingsFile.split('.')[0] || dir.name
        const title = formatRiotTitle(slug, content)
        if (!title) continue

        const rawInstall = parseSimpleYamlField(content, 'product_install_full_path') || parseSimpleYamlField(content, 'product_install_root')
        const installPath = cleanDirectoryPath(rawInstall)
        if (!installPath || !fileExists(installPath)) continue

        const patchlineMatch = settingsFile.match(/^[^.]+\.([^.]+)\.product_settings\.yaml$/i)
        const patchline = patchlineMatch ? patchlineMatch[1] : 'live'
        const executable = riotClientExe || resolveGameExecutable(installPath, title)
        const launchArguments = riotClientExe ? `--launch-product=${slug} --launch-patchline=${patchline}` : null

        seenPaths.add(installPath.toLowerCase())
        records.push({
          canonicalTitle: title,
          normalizedTitle: title,
          description: null,
          developer: 'Riot Games',
          publisher: 'Riot Games',
          releaseDate: null,
          coverUrl: null,
          heroUrl: null,
          isInstalled: true,
          driveLetter: getDriveLetter(installPath),
          installPath,
          installSizeBytes: directorySizeSafe(installPath),
          playTimeSeconds: 0,
          lastPlayed: null,
          platform: 'riot',
          platformGameId: slug,
          platformLaunchId: slug,
          idSource: 'riot-metadata:product-settings',
          launchUri: 'riotclient://',
          installUri: null,
          executable,
          launchArguments,
          source: 'local-scan',
          storeName: 'Riot Games',
          driveStatus: 'online',
        })
      }
    } catch (err) {
      console.warn('[RiotScanner] Metadata scan warning:', err?.message)
    }
  }

  // Uninstall registry fallback (for games installed without Metadata yaml)
  const regRecords = matchUninstallEntriesByRule({
    platform: 'riot',
    storeName: 'Riot Games',
    defaultPublisher: 'Riot Games',
    developer: 'Riot Games',
    match: (item) => {
      const pub = String(item.Publisher || '').toLowerCase()
      const key = String(item.key || '').toLowerCase()
      return pub.includes('riot games') || key.includes('riot game')
    },
    exclude: (item) => {
      const name = String(item.DisplayName || '').toLowerCase()
      return name.includes('riot client') || name.includes('riot vanguard') || name === 'vanguard'
    },
    buildLaunchUri: () => 'riotclient://',
  }, options)

  for (const rec of regRecords) {
    const pKey = (rec.installPath || rec.canonicalTitle).toLowerCase()
    if (!seenPaths.has(pKey)) {
      seenPaths.add(pKey)
      records.push(rec)
    }
  }

  emitProgress(onProgress, { source: 'riot', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} Riot Games titles.` })
  return { source: 'riot', records }
}

module.exports = { scanRiot }
