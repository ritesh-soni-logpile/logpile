const fs = require('node:fs')
const fsPromises = require('node:fs/promises')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

let _uninstallCache = null
let _uninstallCacheAt = 0
const UNINSTALL_CACHE_TTL_MS = 10000

function clearRegistryCache() {
  _uninstallCache = null
  _uninstallCacheAt = 0
}

function safeRead(filePath, encoding = 'utf8') {
  try { return fs.readFileSync(filePath, encoding) } catch { return null }
}

async function safeReadAsync(filePath, encoding = 'utf8') {
  try { return await fsPromises.readFile(filePath, encoding) } catch { return null }
}

function fileExists(filePath) {
  if (!filePath) return false
  try { return fs.existsSync(filePath) } catch { return false }
}

async function fileExistsAsync(filePath) {
  if (!filePath) return false
  try {
    await fsPromises.access(filePath)
    return true
  } catch {
    return false
  }
}

function getDriveLetter(filePath) {
  if (typeof filePath !== 'string') return null
  const trimmed = filePath.trim()
  const match = trimmed.match(/^([A-Za-z]):(?:[\\/]|$)/) || trimmed.match(/^([A-Za-z])$/)
  return match ? `${match[1].toUpperCase()}:` : null
}

function isDriveMounted(filePathOrDrive) {
  const drive = getDriveLetter(filePathOrDrive)
  if (!drive) return true
  return fileExists(`${drive}\\`)
}

async function isDriveMountedAsync(filePathOrDrive) {
  const drive = getDriveLetter(filePathOrDrive)
  if (!drive) return true
  return await fileExistsAsync(`${drive}\\`)
}

function toNumber(value, fallback = 0) {
  const number = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(number) ? number : fallback
}

function queryRegistry(key, valueName) {
  try {
    const args = ['query', key]
    if (valueName) args.push('/v', valueName)
    return execFileSync('reg.exe', args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch { return '' }
}

function readRegistryValue(key, valueName) {
  const output = queryRegistry(key, valueName)
  const line = output.split(/\r?\n/).find((entry) => entry.toLowerCase().includes(valueName.toLowerCase()))
  if (!line) return null
  const match = line.match(new RegExp(`${valueName}\\s+REG_[A-Z0-9_]+\\s+(.+)$`, 'i'))
  return match ? match[1].trim() : null
}

function parseRegistryTreeOutput(output) {
  if (!output) return []
  const entries = []
  const blocks = String(output).split(/\r?\n\r?\n/)
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (!lines.length || !lines[0].toUpperCase().startsWith('HKEY_')) continue
    const item = { key: lines[0] }
    for (let i = 1; i < lines.length; i++) {
      const match = lines[i].match(/^([^\s]+(?:\s+[^\s]+)*?)\s+REG_[A-Z0-9_]+\s*(.*)$/i)
      if (match) {
        item[match[1].trim()] = match[2] ? match[2].trim() : ''
      }
    }
    entries.push(item)
  }
  return entries
}

function queryRegistryTree(root) {
  try {
    const output = execFileSync('reg.exe', ['query', root, '/s'], {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return parseRegistryTreeOutput(output)
  } catch {
    return []
  }
}

function artworkUrls(appId) {
  const id = String(appId || '').trim()

  // STRICT FIX: Only generate Steam CDN URLs if the ID is purely numbers.
  // This prevents Epic/GOG/Ubisoft from injecting garbage strings into Steam URLs.
  const isNumeric = /^\d+$/.test(id)

  return {
    coverUrl: (id && isNumeric) ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/library_600x900.jpg` : null,
    heroUrl: (id && isNumeric) ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/library_hero.jpg` : null,
  }
}

function unique(values) { return [...new Set(values.filter(Boolean))] }
function emitProgress(onProgress, payload) { if (typeof onProgress === 'function') onProgress(payload) }

/**
 * Reads all Windows Uninstall entries in 1 single batch pass (cached briefly per scan).
 * Prevents UI freezes caused by spawning dozens of individual reg.exe processes.
 */
function getUninstallRegistryEntries(options = {}) {
  if (Array.isArray(options.entries)) return options.entries
  const now = Date.now()
  if (!options.forceRefresh && _uninstallCache && (now - _uninstallCacheAt < UNINSTALL_CACHE_TTL_MS)) {
    return _uninstallCache
  }
  const roots = [
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ]
  const entries = []
  for (const root of roots) {
    const parsed = queryRegistryTree(root)
    for (const item of parsed) {
      if (item.DisplayName) entries.push(item)
    }
  }
  _uninstallCache = entries
  _uninstallCacheAt = now
  return entries
}

function cleanExePath(rawValue) {
  if (!rawValue) return null
  let cleaned = String(rawValue).trim()
  const quotedMatch = cleaned.match(/^"([^"]+\.exe)"/i)
  if (quotedMatch) {
    cleaned = quotedMatch[1]
  } else {
    cleaned = cleaned.replace(/,\s*-?\d+$/, '').replace(/^["']|["']$/g, '').trim()
    const exeIndex = cleaned.toLowerCase().indexOf('.exe')
    if (exeIndex !== -1) {
      cleaned = cleaned.slice(0, exeIndex + 4)
    }
  }
  if (!/\.exe$/i.test(cleaned)) return null
  try {
    return path.normalize(cleaned)
  } catch {
    return null
  }
}

function cleanGameTitle(rawTitle) {
  return String(rawTitle || '')
    .replace(/[™®©]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isOtherStoreInstallPath(installPath) {
  const lower = String(installPath || '').toLowerCase()
  if (!lower) return false
  return (
    lower.includes('steamapps') ||
    lower.includes('\\epic games\\') ||
    lower.includes('\\gog games\\') ||
    lower.includes('\\xboxgames\\') ||
    lower.includes('\\modifiablewindowsapps\\')
  )
}

function directorySizeSafe(directory, maxFiles = 25000) {
  if (!directory || !fileExists(directory)) return 0
  let total = 0
  let seen = 0
  const stack = [directory]
  while (stack.length && seen < maxFiles) {
    const current = stack.pop()
    let entries = []
    try { entries = fs.readdirSync(current, { withFileTypes: true }) } catch { continue }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const entryPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(entryPath)
      } else {
        seen += 1
        try { total += fs.statSync(entryPath).size } catch {}
        if (seen >= maxFiles) break
      }
    }
  }
  return total
}

const DEFAULT_IGNORE_EXE_KEYWORDS = [
  'crash', 'unins', 'setup', 'redist', 'dxsetup', 'vcredist', 'dotnet',
  'updater', 'update', 'patcher', 'cef', 'webhelper', 'overlay',
  'easyanticheat', 'battleye', 'vanguard', 'vgk', 'gameguard', 'nprotect',
  'bootstrap', 'helper', 'report', 'benchmark', 'config', 'settings',
  'unitycrashhandler', 'ueprereq', 'prereq', '7z', '7za',
]

function resolveGameExecutable(installDir, title, options = {}) {
  if (!installDir || !fileExists(installDir)) return null
  const maxDepth = typeof options.maxDepth === 'number' ? options.maxDepth : 2
  const preferred = (options.preferredExeNames || []).map((n) => n.toLowerCase())
  const ignoreKeywords = [...DEFAULT_IGNORE_EXE_KEYWORDS, ...(options.ignoreKeywords || [])]

  const candidates = []
  const stack = [{ dir: installDir, depth: 0 }]
  while (stack.length) {
    const { dir, depth } = stack.pop()
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isFile()) {
        const lower = entry.name.toLowerCase()
        if (!lower.endsWith('.exe')) continue
        if (ignoreKeywords.some((kw) => lower.includes(kw))) continue
        let size = 0
        try { size = fs.statSync(fullPath).size } catch {}
        candidates.push({ fullPath, nameLower: lower, depth, size })
      } else if (entry.isDirectory() && depth < maxDepth) {
        const dirLower = entry.name.toLowerCase()
        if (['redist', '_redist', 'directx', 'support', 'logs', 'cache', 'crash', '__installer'].some((skip) => dirLower.includes(skip))) {
          continue
        }
        stack.push({ dir: fullPath, depth: depth + 1 })
      }
    }
  }

  if (!candidates.length) return null

  for (const pref of preferred) {
    const exact = candidates.find((c) => c.nameLower === pref)
    if (exact) return exact.fullPath
  }

  const normalizedTitle = String(title || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  candidates.sort((a, b) => {
    const aBase = a.nameLower.replace(/\.exe$/i, '').replace(/[^a-z0-9]/g, '')
    const bBase = b.nameLower.replace(/\.exe$/i, '').replace(/[^a-z0-9]/g, '')
    const aMatch = normalizedTitle && (aBase === normalizedTitle ? 3 : (normalizedTitle.includes(aBase) || aBase.includes(normalizedTitle) ? 2 : 0))
    const bMatch = normalizedTitle && (bBase === normalizedTitle ? 3 : (normalizedTitle.includes(bBase) || bBase.includes(normalizedTitle) ? 2 : 0))
    if (bMatch !== aMatch) return bMatch - aMatch
    if (a.depth !== b.depth) return a.depth - b.depth
    return b.size - a.size
  })

  return candidates[0].fullPath
}

function matchUninstallEntriesByRule(rule, options = {}) {
  const entries = getUninstallRegistryEntries(options)
  const records = []
  const seenKeys = new Set()

  for (const item of entries) {
    const displayName = String(item.DisplayName || '').trim()
    if (!displayName) continue
    if (!rule.match(item)) continue
    if (rule.exclude && rule.exclude(item)) continue

    const rawInstall = item.InstallLocation ? cleanDirectoryPath(item.InstallLocation) : null
    const iconExe = cleanExePath(item.DisplayIcon)
    const fallbackDir = !rawInstall && iconExe ? path.dirname(iconExe) : null
    const installPath = rawInstall || fallbackDir
    if (isOtherStoreInstallPath(installPath) && !rule.allowOtherStorePaths) continue

    const dedupKey = `${rule.platform}:${(installPath || displayName).toLowerCase()}`
    if (seenKeys.has(dedupKey)) continue
    seenKeys.add(dedupKey)

    const cleanTitle = rule.cleanTitle ? rule.cleanTitle(displayName, item) : cleanGameTitle(displayName)
    if (!cleanTitle) continue

    const isOnline = Boolean(installPath && fileExists(installPath))
    const keyTail = String(item.key || '').split('\\').pop()
    const rawId = (rule.extractId ? rule.extractId(item, keyTail) : keyTail) || cleanTitle
    const platformGameId = String(rawId).trim()
    const platformLaunchId = rule.extractLaunchId ? String(rule.extractLaunchId(item, platformGameId) || platformGameId).trim() : platformGameId

    let executable = null
    if (rule.resolveExecutable) {
      executable = rule.resolveExecutable(installPath, cleanTitle, item, iconExe)
    } else if (iconExe && fileExists(iconExe) && !DEFAULT_IGNORE_EXE_KEYWORDS.some((kw) => path.basename(iconExe).toLowerCase().includes(kw))) {
      executable = iconExe
    } else if (isOnline) {
      executable = resolveGameExecutable(installPath, cleanTitle, { preferredExeNames: rule.preferredExeNames ? rule.preferredExeNames(item) : [] })
    }

    const launchUri = rule.buildLaunchUri ? rule.buildLaunchUri(platformLaunchId, item, cleanTitle) : null
    const installUri = rule.buildInstallUri ? rule.buildInstallUri(platformLaunchId, item, cleanTitle) : null
    if (!isOnline && !executable && !launchUri) continue

    records.push({
      canonicalTitle: cleanTitle,
      normalizedTitle: cleanTitle,
      description: null,
      developer: rule.developer || null,
      publisher: String(item.Publisher || rule.defaultPublisher || rule.storeName).trim() || rule.storeName,
      releaseDate: null,
      coverUrl: null,
      heroUrl: null,
      isInstalled: isOnline || Boolean(executable && fileExists(executable)),
      driveLetter: getDriveLetter(installPath || executable),
      installPath: installPath || (executable ? path.dirname(executable) : null),
      installSizeBytes: isOnline ? directorySizeSafe(installPath) : (toNumber(item.EstimatedSize, 0) * 1024),
      playTimeSeconds: 0,
      lastPlayed: null,
      platform: rule.platform,
      platformGameId,
      platformLaunchId,
      idSource: rule.idSource || `${rule.platform}-registry:uninstall-key`,
      launchUri,
      installUri,
      executable,
      launchArguments: rule.launchArguments ? rule.launchArguments(platformLaunchId, item) : null,
      source: 'local-scan',
      storeName: rule.storeName,
      driveStatus: isOnline ? 'online' : 'offline',
    })
  }

  return records
}

function cleanDirectoryPath(rawPath) {
  if (!rawPath) return null
  const trimmed = String(rawPath).replace(/^["']|["']$/g, '').trim()
  if (!trimmed) return null
  try {
    return path.normalize(trimmed)
  } catch {
    return null
  }
}

module.exports = {
  fs,
  fsPromises,
  safeRead,
  safeReadAsync,
  fileExists,
  fileExistsAsync,
  getDriveLetter,
  isDriveMounted,
  isDriveMountedAsync,
  toNumber,
  queryRegistry,
  readRegistryValue,
  parseRegistryTreeOutput,
  queryRegistryTree,
  clearRegistryCache,
  artworkUrls,
  unique,
  emitProgress,
  getUninstallRegistryEntries,
  cleanExePath,
  cleanDirectoryPath,
  cleanGameTitle,
  isOtherStoreInstallPath,
  directorySizeSafe,
  resolveGameExecutable,
  matchUninstallEntriesByRule,
}