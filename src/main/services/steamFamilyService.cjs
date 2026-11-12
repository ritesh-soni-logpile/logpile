const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

function getRegistryValue(key, value) {
  try {
    const cmd = `reg query "${key}" /v "${value}"`
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    const match = output.match(/REG_SZ\s+(.+)$/m)
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}

function getCandidateSteamRoots() {
  const candidates = [
    getRegistryValue('HKCU\\Software\\Valve\\Steam', 'SteamPath'),
    getRegistryValue('HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'),
    process.env['ProgramFiles(x86)'] ? path.join(process.env['ProgramFiles(x86)'], 'Steam') : null,
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Steam') : null,
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
  ]
  return [...new Set(candidates.filter(Boolean).map((p) => path.normalize(p)))]
}

let cachedSteamRoot = null
function findSteamRoot() {
  if (cachedSteamRoot && fs.existsSync(cachedSteamRoot)) {
    return cachedSteamRoot
  }
  const roots = getCandidateSteamRoots()
  for (const root of roots) {
    if (fs.existsSync(root)) {
      cachedSteamRoot = root
      return root
    }
  }
  return null
}

function normalizeTitleKey(str) {
  if (!str) return ''
  return String(str)
    .replace(/[®™©]/g, '')
    .replace(/[:\-_.,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

let cachedAppMap = null
let cachedAppMtime = 0

function getSteamAppCache(steamRoot) {
  const root = steamRoot || findSteamRoot()
  const titlesByAppId = {}
  const appIdsByTitle = {}
  const appIdsByNormTitle = {}

  if (!root) return { titlesByAppId, appIdsByTitle, appIdsByNormTitle }
  const appInfoPath = path.join(root, 'appcache', 'appinfo.vdf')
  if (!fs.existsSync(appInfoPath)) return { titlesByAppId, appIdsByTitle, appIdsByNormTitle }

  try {
    const stat = fs.statSync(appInfoPath)
    if (cachedAppMap && cachedAppMtime === stat.mtimeMs) {
      return cachedAppMap
    }

    const data = fs.readFileSync(appInfoPath)
    const marker = Buffer.from([0x02, 0x01, 0x00, 0x00, 0x00])
    const subMarker = Buffer.from([0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x04, 0x00, 0x00, 0x00])

    let pos = 0
    while (true) {
      pos = data.indexOf(marker, pos)
      if (pos === -1 || pos + 20 >= data.length) break

      const appId = data.readUInt32LE(pos + 5)
      if (appId > 0 && data.subarray(pos + 9, pos + 19).equals(subMarker)) {
        const strStart = pos + 19
        let strEnd = strStart
        while (strEnd < data.length && data[strEnd] !== 0) strEnd++
        if (strEnd > strStart && strEnd - strStart < 200) {
          const title = data.toString('utf8', strStart, strEnd).trim()
          const strAppId = String(appId)
          titlesByAppId[strAppId] = title
          appIdsByTitle[title.toLowerCase()] = strAppId
          const norm = normalizeTitleKey(title)
          if (norm) appIdsByNormTitle[norm] = strAppId
        }
      }
      pos += 5
    }

    cachedAppMap = { titlesByAppId, appIdsByTitle, appIdsByNormTitle }
    cachedAppMtime = stat.mtimeMs
    return cachedAppMap
  } catch (err) {
    console.warn('[SteamFamilyService] Failed parsing appinfo.vdf:', err)
  }

  return { titlesByAppId, appIdsByTitle, appIdsByNormTitle }
}

function resolveSteamAppId(title, steamRoot) {
  if (!title) return null
  const cache = getSteamAppCache(steamRoot)
  const norm = normalizeTitleKey(title)
  if (norm && cache.appIdsByNormTitle[norm]) {
    return cache.appIdsByNormTitle[norm]
  }
  const rawLower = String(title).trim().toLowerCase()
  if (cache.appIdsByTitle[rawLower]) {
    return cache.appIdsByTitle[rawLower]
  }
  return null
}

function getFamilyInfo(steamRoot) {
  let currentUserId = null
  const memberNames = {}
  let familyGroup = 'Steam Family'

  if (!steamRoot) return { currentUserId, memberNames, familyGroup }

  try {
    // 1. Get logged-in user from config/loginusers.vdf
    const loginUsersPath = path.join(steamRoot, 'config', 'loginusers.vdf')
    if (fs.existsSync(loginUsersPath)) {
      const content = fs.readFileSync(loginUsersPath, 'utf8')
      const recentMatch = content.match(/"(\d{16,20})"\s*\{[^}]*"MostRecent"\s*"1"/i) || content.match(/"(\d{16,20})"/i)
      if (recentMatch) {
        try {
          const steamId64 = BigInt(recentMatch[1])
          currentUserId = String(steamId64 - 76561197960265728n)
        } catch {}
      }
    }

    const userdataDir = path.join(steamRoot, 'userdata')
    if (fs.existsSync(userdataDir)) {
      const userFolders = fs.readdirSync(userdataDir).filter((d) => /^\d+$/.test(d) && d !== '0')
      if (!currentUserId && userFolders.length > 0) {
        currentUserId = userFolders[0]
      }

      // 2. Scan all user config files for modern and legacy persona names
      for (const uid of userFolders) {
        const localConfigPath = path.join(userdataDir, uid, 'config', 'localconfig.vdf')
        if (fs.existsSync(localConfigPath)) {
          const vdfText = fs.readFileSync(localConfigPath, 'utf8')

          // Modern Steam Families: friendstore_playercache contains member personas and SteamID64s
          const lineMatch = vdfText.match(/"friendstore_playercache"\s*"(.+)"$/m)
          if (lineMatch) {
            try {
              const unescaped = lineMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
              const players = JSON.parse(unescaped)
              for (const p of players) {
                if (p.steamid && p.persona_name) {
                  memberNames[p.steamid] = p.persona_name
                  try {
                    const accId = String(BigInt(p.steamid) - 76561197960265728n)
                    memberNames[accId] = p.persona_name
                  } catch {}
                }
              }
            } catch {}
          }

          // Legacy VDF friend block matching fallback
          const nameMatches = vdfText.matchAll(/"(\d{5,12})"\s*\{\s*"name"\s*"([^"]+)"/g)
          for (const m of nameMatches) {
            if (!memberNames[m[1]]) memberNames[m[1]] = m[2]
          }
        }
      }
    }

    // 3. Parse family group name from librarysharing_log.txt
    const logPath = path.join(steamRoot, 'logs', 'librarysharing_log.txt')
    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf8')
      const groupMatch = logContent.match(/name="([^"']+)/)
      if (groupMatch) {
        familyGroup = groupMatch[1]
      }
    }
  } catch (err) {
    console.warn('[SteamFamilyService] Failed to parse family info:', err)
  }

  return { currentUserId, memberNames, familyGroup }
}

function parseLocks(steamRoot, familyInfo, appCache) {
  if (!steamRoot) return {}
  const logPath = path.join(steamRoot, 'logs', 'librarysharing_log.txt')
  if (!fs.existsSync(logPath)) return {}

  let lines = []
  try {
    lines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/)
  } catch {
    return {}
  }

  // Find last client start/restart to only check active locks from current session
  let startIndex = 0
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('Client version:')) {
      startIndex = i
      break
    }
  }

  const locks = {}
  const byTitle = {}
  const byNormTitle = {}

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Changed lock event
    const mChanged = line.match(/Shared lock for app (\d+) changed : available owner (\d+), preferred owner (\d+), current player (\d+)/)
    if (mChanged) {
      const [, appId, avail, pref, player] = mChanged
      const isLocked = avail === '0' && String(player) !== String(familyInfo?.currentUserId)
      const gameTitle = appCache?.titlesByAppId?.[appId] || null
      const lockObj = {
        appId,
        isLocked,
        availableOwner: avail,
        preferredOwner: pref,
        currentPlayer: player,
        playerName: familyInfo?.memberNames?.[player] || `Family Member (${player})`,
        familyGroup: familyInfo?.familyGroup || 'Steam Family',
        gameTitle,
      }
      locks[appId] = lockObj
      if (gameTitle) {
        byTitle[gameTitle.toLowerCase()] = lockObj
        const norm = normalizeTitleKey(gameTitle)
        if (norm) byNormTitle[norm] = lockObj
      }
      continue
    }

    // Removed lock event
    const mRemoved = line.match(/Shared lock for app (\d+) removed : preferred owner (\d+)/)
    if (mRemoved) {
      const [, appId, pref] = mRemoved
      const gameTitle = appCache?.titlesByAppId?.[appId] || null
      const lockObj = {
        appId,
        isLocked: false,
        availableOwner: pref,
        currentPlayer: null,
        gameTitle,
      }
      locks[appId] = lockObj
      if (gameTitle) {
        byTitle[gameTitle.toLowerCase()] = lockObj
        const norm = normalizeTitleKey(gameTitle)
        if (norm) byNormTitle[norm] = lockObj
      }
    }
  }

  locks.byTitle = byTitle
  locks.byNormTitle = byNormTitle
  return locks
}

let activeWatcher = null
let pollInterval = null
let lastMtime = 0
let lastLocksCache = {}

function getFamilyLocks() {
  const root = findSteamRoot()
  if (!root) return {}
  const info = getFamilyInfo(root)
  const appCache = getSteamAppCache(root)
  const locks = parseLocks(root, info, appCache)
  lastLocksCache = locks
  return locks
}

function startSteamFamilyWatcher(onUpdate) {
  stopSteamFamilyWatcher()

  const root = findSteamRoot()
  if (!root) return

  const logPath = path.join(root, 'logs', 'librarysharing_log.txt')

  const triggerUpdate = () => {
    try {
      const info = getFamilyInfo(root)
      const appCache = getSteamAppCache(root)
      const locks = parseLocks(root, info, appCache)
      lastLocksCache = locks
      if (typeof onUpdate === 'function') {
        onUpdate(locks)
      }
    } catch (err) {
      console.warn('[SteamFamilyService] Failed updating family locks:', err)
    }
  }

  // 1. Initial check
  triggerUpdate()

  // 2. File watcher
  try {
    if (fs.existsSync(logPath)) {
      lastMtime = fs.statSync(logPath).mtimeMs
      let debounceTimer = null
      activeWatcher = fs.watch(logPath, () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          try {
            if (fs.existsSync(logPath)) {
              const currentMtime = fs.statSync(logPath).mtimeMs
              if (currentMtime !== lastMtime) {
                lastMtime = currentMtime
                triggerUpdate()
              }
            }
          } catch {}
        }, 200)
      })
    }
  } catch (err) {
    console.warn('[SteamFamilyService] fs.watch not available on log file:', err)
  }

  // 3. Lightweight fallback polling every 4 seconds
  pollInterval = setInterval(() => {
    try {
      if (fs.existsSync(logPath)) {
        const currentMtime = fs.statSync(logPath).mtimeMs
        if (currentMtime !== lastMtime) {
          lastMtime = currentMtime
          triggerUpdate()
        }
      }
    } catch {}
  }, 4000)
}

function stopSteamFamilyWatcher() {
  if (activeWatcher) {
    try { activeWatcher.close() } catch {}
    activeWatcher = null
  }
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

module.exports = {
  findSteamRoot,
  normalizeTitleKey,
  getSteamAppCache,
  resolveSteamAppId,
  getFamilyInfo,
  parseLocks,
  getFamilyLocks,
  startSteamFamilyWatcher,
  stopSteamFamilyWatcher,
}
