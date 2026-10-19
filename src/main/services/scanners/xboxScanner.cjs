const path = require('node:path')
const fs = require('node:fs')
const { execFileSync } = require('node:child_process')
const { fileExists, safeRead, getDriveLetter, emitProgress } = require('./scannerUtils.cjs')
const { directorySize } = require('./gogScanner.cjs')
const { isDlcTitle } = require('../utilityRules.cjs')
const { normalizeCanonicalTitle } = require('../deduplicationService.cjs')

function getGamingRootFolder(driveRoot) {
  const markerPath = path.join(driveRoot, '.GamingRoot')
  if (!fileExists(markerPath)) return null
  try {
    const buf = fs.readFileSync(markerPath)
    if (buf.length >= 8 && buf.toString('ascii', 0, 4) === 'RGBX') {
      const strBuf = buf.subarray(8)
      let end = 0
      while (end + 1 < strBuf.length && !(strBuf[end] === 0 && strBuf[end + 1] === 0)) {
        end += 2
      }
      const folderName = strBuf.subarray(0, end).toString('utf16le').trim()
      if (folderName) return folderName
    }
    const txt = buf.toString('utf8').replace(/\0/g, '').trim()
    if (txt) return txt
  } catch {}
  return null
}

function parseXmlField(content, regex) {
  if (!content) return null
  const match = content.match(regex)
  return match ? match[1].trim() : null
}

const PUBLISHER_PREFIXES = [
  'Deep Silver',
  'Bethesda Softworks',
  'Bethesda',
  'Warner Bros. Games',
  'Warner Bros. Interactive Entertainment',
  'Warner Bros',
  'WB Games',
  'Koch Media',
  'PLAION',
  'Xbox Game Studios',
  'Microsoft Studios',
  '2K Games',
  '2K',
  'Square Enix',
  'Bandai Namco Entertainment',
  'Bandai Namco',
  'Focus Home Interactive',
  'Focus Entertainment',
  'THQ Nordic',
  'THQ',
  'Ubisoft Entertainment',
  'Ubisoft',
  'Electronic Arts',
  'EA Games',
  'EA',
  'Capcom',
  'Konami',
  'Sega',
]

function cleanXboxTitle(rawTitle) {
  if (!rawTitle) return 'Unknown Xbox Title'
  let title = String(rawTitle).trim()

  // Specific codename mapping
  if (/^(?:deep\s*silver\s*)?project\s*windfall$/i.test(title)) {
    return 'Metro Exodus'
  }

  // Strip publisher prefix from beginning of title
  for (const pub of PUBLISHER_PREFIXES) {
    const regex = new RegExp(`^${pub.replace(/\./g, '\\.')}\\s*[-:–—]?\\s+`, 'i')
    if (regex.test(title)) {
      title = title.replace(regex, '').trim()
      break
    }
  }

  // Strip trailing "Xbox Game Studios"
  title = title.replace(/\s*Xbox\s*Game\s*Studios$/i, '').trim()

  // Replace hyphen in "Metro- Last Light"
  title = title.replace(/^Metro-\s*/i, 'Metro: ')

  return title
}

function scanXbox(onProgress) {
  const records = []
  emitProgress(onProgress, { source: 'xbox', phase: 'scanning', current: 0, total: 1, message: 'Scanning for Xbox games...' })

  try {
    // 1. Discover all Xbox library folders across all system drives
    const drives = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    const xboxFolders = new Set()

    for (const d of drives) {
      const driveRoot = `${d}:\\`
      if (!fileExists(driveRoot)) continue

      const gr = getGamingRootFolder(driveRoot)
      if (gr) {
        const p = path.join(driveRoot, gr)
        if (fileExists(p)) xboxFolders.add(p)
      }

      const defaultNames = ['Xbox Games', 'XboxGames']
      for (const name of defaultNames) {
        const p = path.join(driveRoot, name)
        if (fileExists(p)) xboxFolders.add(p)
      }
    }

    // 2. Scan subdirectories in verified Xbox library folders
    for (const rootFolder of xboxFolders) {
      try {
        const subdirs = fs.readdirSync(rootFolder, { withFileTypes: true })
        for (const dirent of subdirs) {
          if (!dirent.isDirectory()) continue
          if (dirent.name === 'GameSave' || dirent.name.startsWith('$')) continue

          const gamePath = path.join(rootFolder, dirent.name)
          const contentFolder = path.join(gamePath, 'Content')
          const targetDir = fileExists(contentFolder) ? contentFolder : gamePath

          const mgcPath = path.join(targetDir, 'MicrosoftGame.config')
          const appxPath = path.join(targetDir, 'AppxManifest.xml')

          let mgcContent = null
          let appxContent = null
          if (fileExists(mgcPath)) {
            mgcContent = safeRead(mgcPath)
          }
          if (fileExists(appxPath)) {
            appxContent = safeRead(appxPath)
          }

          if (!mgcContent && !appxContent) continue

          // Extract Title
          let rawTitle = 
            parseXmlField(mgcContent, /DefaultDisplayName="([^"]+)"/i) ||
            parseXmlField(mgcContent, /<DisplayName>([^<]+)<\/DisplayName>/i) ||
            parseXmlField(mgcContent, /DisplayName="([^"]+)"/i) ||
            parseXmlField(appxContent, /<DisplayName>([^<]+)<\/DisplayName>/i) ||
            parseXmlField(appxContent, /DisplayName="([^"]+)"/i) ||
            dirent.name

          const title = cleanXboxTitle(rawTitle)

          // DLC Detection
          const isDlcFromMgc = Boolean(
            (mgcContent && /<TargetDeviceFamilyForDLC>/i.test(mgcContent)) ||
            (mgcContent && /<MainPackageDependency/i.test(mgcContent)) ||
            (appxContent && /<Dependency\s+Name="[^"]*(?:DLC|Content)[^"]*"/i.test(appxContent))
          )
          const hasNoExecutable = Boolean(mgcContent && !/<ExecutableList>/i.test(mgcContent))
          const isDlc = isDlcFromMgc || hasNoExecutable || isDlcTitle(title)

          // Resolve Executable
          let exePath = null
          const exeName = parseXmlField(mgcContent, /<Executable\s+Name="([^"]+)"/i)
          if (exeName) {
            const resolvedExe = path.join(targetDir, exeName)
            if (fileExists(resolvedExe)) exePath = resolvedExe
          }

          // Fallback executable search if not a DLC
          if (!exePath && !isDlc) {
            try {
              const files = fs.readdirSync(targetDir)
              const exes = files.filter(f => f.toLowerCase().endsWith('.exe') && f.toLowerCase() !== 'gamelaunchhelper.exe')
              if (exes.length > 0) {
                exePath = path.join(targetDir, exes[0])
              } else if (fileExists(path.join(targetDir, 'gamelaunchhelper.exe'))) {
                exePath = path.join(targetDir, 'gamelaunchhelper.exe')
              }
            } catch {}
          }

          // StoreId & Identity
          const storeId = parseXmlField(mgcContent, /<StoreId>([^<]+)<\/StoreId>/i)
          const packageIdentity = parseXmlField(mgcContent, /<Identity\s+Name="([^"]+)"/i) || parseXmlField(appxContent, /<Identity\s+Name="([^"]+)"/i)

          // Publisher
          const publisher = 
            parseXmlField(mgcContent, /PublisherDisplayName="([^"]+)"/i) ||
            parseXmlField(appxContent, /<PublisherDisplayName>([^<]+)<\/PublisherDisplayName>/i) ||
            'Xbox Game Studios'

          const driveLetter = getDriveLetter(gamePath) || `${gamePath.charAt(0).toUpperCase()}:`
          const folderSize = directorySize(gamePath)

          records.push({
            canonicalTitle: title,
            normalizedTitle: title,
            description: parseXmlField(mgcContent, /Description="([^"]+)"/i) || null,
            developer: null,
            publisher,
            releaseDate: null,
            coverUrl: null,
            heroUrl: null,
            isInstalled: true,
            isDlc,
            driveLetter,
            installPath: gamePath,
            installSizeBytes: folderSize,
            playTimeSeconds: 0,
            lastPlayed: null,
            platform: 'xbox',
            platformGameId: storeId ? `xbox:${storeId}` : (packageIdentity ? `xbox:${packageIdentity}` : `xbox:${dirent.name}`),
            platformLaunchId: storeId || packageIdentity || `xbox:${dirent.name}`,
            idSource: 'xbox:gaming-root',
            launchUri: storeId ? `ms-windows-store://pdp/?productid=${storeId}` : (packageIdentity ? `shell:AppsFolder\\${packageIdentity}!App` : null),
            installUri: null,
            executable: exePath,
            source: 'local-scan',
            storeName: 'Xbox',
            driveStatus: 'online',
          })
        }
      } catch { /* Folder unreadable or locked */ }
    }

    // 3. Query AppxPackages for any installed Xbox games not discovered by physical folders
    try {
      const psScript = `
        Get-AppxPackage | Where-Object { 
          $_.InstallLocation -and 
          ($_.InstallLocation -match 'XboxGames' -or (Test-Path (Join-Path $_.InstallLocation 'MicrosoftGame.config')))
        } | Select-Object Name, PackageFamilyName, InstallLocation | ConvertTo-Json -Compress
      `
      const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', psScript], {
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 10000,
      })

      if (output && output.trim()) {
        const parsed = JSON.parse(output)
        const apps = Array.isArray(parsed) ? parsed : [parsed]

        apps.forEach((app) => {
          const installLocation = app.InstallLocation ? path.normalize(app.InstallLocation) : null
          if (!installLocation) return

          let rawTitle = (app.Name || '').replace(/^.*?_/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._-]/g, ' ').trim()
          const title = cleanXboxTitle(rawTitle)
          const titleNorm = normalizeCanonicalTitle(title)
          const appNameNorm = (app.Name || '').toLowerCase().replace(/[^a-z0-9]/g, '')

          // If already captured in step 2 by physical drive path, skip to avoid C: duplication!
          const isAlreadyAdded = records.some(r => {
            const rNorm = normalizeCanonicalTitle(r.canonicalTitle)
            if (rNorm === titleNorm || rNorm.startsWith(titleNorm) || titleNorm.startsWith(rNorm)) return true
            if (!r.installPath) return false
            const folderNorm = path.basename(r.installPath).toLowerCase().replace(/[^a-z0-9]/g, '')
            return folderNorm === appNameNorm || appNameNorm.includes(folderNorm) || folderNorm.includes(appNameNorm)
          })
          if (isAlreadyAdded) return

          const isDlc = isDlcTitle(title)

          records.push({
            canonicalTitle: title,
            normalizedTitle: title,
            description: null,
            developer: null,
            publisher: 'Xbox Game Studios',
            releaseDate: null,
            coverUrl: null,
            heroUrl: null,
            isInstalled: fileExists(installLocation),
            isDlc,
            driveLetter: getDriveLetter(installLocation),
            installPath: installLocation,
            installSizeBytes: fileExists(installLocation) ? directorySize(installLocation) : 0,
            playTimeSeconds: 0,
            lastPlayed: null,
            platform: 'xbox',
            platformGameId: app.PackageFamilyName,
            platformLaunchId: app.PackageFamilyName,
            idSource: 'xbox:appx-package',
            launchUri: `shell:AppsFolder\\${app.PackageFamilyName}!App`,
            installUri: null,
            executable: null,
            source: 'local-scan',
            storeName: 'Xbox',
            driveStatus: fileExists(installLocation) ? 'online' : 'offline',
          })
        })
      }
    } catch {
      // PowerShell Appx query optional / graceful fallback
    }
  } catch (error) {
    console.warn('[XboxScanner] Error during Xbox scan:', error?.message)
  }

  emitProgress(onProgress, { source: 'xbox', phase: 'complete', current: 1, total: 1, message: `Found ${records.length} Xbox titles.` })
  return { source: 'xbox', records }
}

module.exports = { scanXbox }