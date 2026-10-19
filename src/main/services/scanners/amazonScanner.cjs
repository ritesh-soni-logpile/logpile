const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const Database = require('better-sqlite3')
const { fileExists, getDriveLetter, emitProgress } = require('./scannerUtils.cjs')
const { directorySize } = require('./gogScanner.cjs')

function getAmazonSqlDirectory() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const candidates = [
    path.join(localAppData, 'Amazon Games', 'Data', 'Games', 'Sql'),
    path.join(localAppData, 'Amazon Games', 'App', 'Data', 'Games', 'Sql'),
    path.join(process.env.ProgramData || 'C:\\ProgramData', 'Amazon Games', 'Data', 'Games', 'Sql'),
  ]

  for (const dir of candidates) {
    if (fileExists(path.join(dir, 'GameInstallInfo.sqlite'))) {
      return dir
    }
  }
  return null
}

function resolveGameExecutable(installDir, title) {
  if (!installDir || !fileExists(installDir)) return { executablePath: null, launchArgs: null }

  // 1. Primary: fuel.json (official Amazon Games manifest)
  const fuelPath = path.join(installDir, 'fuel.json')
  if (fileExists(fuelPath)) {
    try {
      const fuelRaw = fs.readFileSync(fuelPath, 'utf8')
      const fuel = JSON.parse(fuelRaw)
      let exePath = null
      let launchArgs = null

      if (fuel?.Main?.Command) {
        const resolved = path.resolve(installDir, fuel.Main.Command)
        if (fileExists(resolved)) {
          exePath = resolved
        }
      }

      if (Array.isArray(fuel?.Main?.Args) && fuel.Main.Args.length > 0) {
        launchArgs = fuel.Main.Args.join(' ')
      }

      if (exePath) {
        return { executablePath: exePath, launchArgs }
      }
    } catch {}
  }

  // 2. Fallback: Search directory for primary .exe
  try {
    const files = fs.readdirSync(installDir)
    const ignoreKeywords = ['crash', 'unity', 'unins', 'setup', 'redist', 'dxsetup', 'vcredist', 'dotnet']
    const exeFiles = files.filter((f) => {
      const lower = f.toLowerCase()
      return lower.endsWith('.exe') && !ignoreKeywords.some((kw) => lower.includes(kw))
    })

    if (exeFiles.length > 0) {
      const normalizedTitle = String(title || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const bestMatch = exeFiles.find((f) => {
        const nameOnly = f.toLowerCase().replace(/\.exe$/i, '').replace(/[^a-z0-9]/g, '')
        return normalizedTitle.includes(nameOnly) || nameOnly.includes(normalizedTitle)
      })

      const targetExe = bestMatch || exeFiles[0]
      return { executablePath: path.join(installDir, targetExe), launchArgs: null }
    }
  } catch {}

  return { executablePath: null, launchArgs: null }
}

function scanAmazon(onProgress) {
  emitProgress(onProgress, {
    source: 'amazon',
    phase: 'scanning',
    current: 0,
    total: 1,
    message: 'Scanning for Amazon Games installations...',
  })

  const sqlDir = getAmazonSqlDirectory()
  if (!sqlDir) {
    emitProgress(onProgress, {
      source: 'amazon',
      phase: 'complete',
      current: 1,
      total: 1,
      message: 'Amazon Games client not found.',
    })
    return { source: 'amazon', records: [] }
  }

  const installDbPath = path.join(sqlDir, 'GameInstallInfo.sqlite')
  const productDbPath = path.join(sqlDir, 'ProductDetails.sqlite')

  let installDb = null
  let productDb = null
  const records = []

  try {
    installDb = new Database(installDbPath, { readonly: true })
    const installedGames = installDb.prepare('SELECT * FROM DbSet WHERE Installed = 1').all()

    const productDetailsMap = new Map()
    if (fileExists(productDbPath)) {
      try {
        productDb = new Database(productDbPath, { readonly: true })
        const detailsRows = productDb.prepare('SELECT key, value FROM game_product_info').all()
        for (const row of detailsRows) {
          if (!productDetailsMap.has(row.key)) {
            try {
              const parsed = JSON.parse(row.value.toString('utf8'))
              productDetailsMap.set(row.key, parsed)
            } catch {}
          }
        }
      } catch (err) {
        console.warn('[AmazonScanner] Could not read ProductDetails.sqlite:', err?.message)
      }
    }

    for (const game of installedGames) {
      const productId = String(game.Id || '').trim()
      if (!productId) continue

      const installDir = game.InstallDirectory ? path.normalize(String(game.InstallDirectory)) : null
      const isOnline = installDir ? fileExists(installDir) : false
      const details = productDetailsMap.get(productId) || {}

      const rawTitle = game.ProductTitle || details.ProductTitle || 'Unknown Amazon Game'
      const cleanTitle = rawTitle.replace(/[™®]/g, '').trim()

      const { executablePath, launchArgs } = resolveGameExecutable(installDir, cleanTitle)

      const coverUrl = details.ProductIconUrl || null
      const heroUrl = details.Background || details.Background2 || null
      const logoUrl = details.ProductLogoUrl || null
      const developer = Array.isArray(details.Developers) ? details.Developers.join(', ') : (details.Developer || null)
      const publisher = Array.isArray(details.Publishers) ? details.Publishers.join(', ') : (details.Publisher || 'Amazon Games')
      const genre = Array.isArray(details.Genres) ? details.Genres.join(', ') : (details.Genre || null)
      const releaseDate = details.ReleaseDate || game.InstallDate || null
      const description = details.ProductDescription || null

      records.push({
        canonicalTitle: cleanTitle,
        normalizedTitle: cleanTitle,
        description,
        genre,
        genres: genre,
        developer,
        publisher,
        releaseDate,
        coverUrl,
        heroUrl,
        logoUrl,
        isInstalled: Boolean(isOnline),
        driveLetter: getDriveLetter(installDir),
        installPath: installDir,
        installSizeBytes: isOnline ? directorySize(installDir) : 0,
        playTimeSeconds: 0,
        lastPlayed: game.LastUpdated || null,
        platform: 'amazon',
        platformGameId: productId,
        platformLaunchId: productId,
        idSource: 'amazon-sqlite:product-id',
        launchUri: `amazon-games://play/${encodeURIComponent(productId)}`,
        installUri: `amazon-games://install/${encodeURIComponent(productId)}`,
        executable: executablePath,
        launchArguments: launchArgs,
        source: 'local-scan',
        storeName: 'Amazon Games',
        driveStatus: isOnline ? 'online' : 'offline',
      })
    }
  } catch (error) {
    console.error('[AmazonScanner] Error scanning Amazon Games:', error)
  } finally {
    try { if (installDb) installDb.close() } catch {}
    try { if (productDb) productDb.close() } catch {}
  }

  emitProgress(onProgress, {
    source: 'amazon',
    phase: 'complete',
    current: 1,
    total: 1,
    message: `Found ${records.length} Amazon games.`,
  })

  return { source: 'amazon', records }
}

module.exports = { scanAmazon }
