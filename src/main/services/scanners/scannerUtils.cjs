const fs = require('node:fs')
const fsPromises = require('node:fs/promises')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

function safeRead(filePath, encoding = 'utf8') {
  try { return fs.readFileSync(filePath, encoding) } catch { return null }
}

async function safeReadAsync(filePath, encoding = 'utf8') {
  try { return await fsPromises.readFile(filePath, encoding) } catch { return null }
}

function fileExists(filePath) {
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
 * Reads all Windows Uninstall entries in 1 single batch pass.
 * Prevents UI freezes caused by spawning hundreds of individual reg.exe processes.
 */
function getUninstallRegistryEntries() {
  const roots = [
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ]
  const entries = []
  for (const root of roots) {
    try {
      const output = execFileSync('reg.exe', ['query', root, '/s'], {
        encoding: 'utf8',
        windowsHide: true,
        maxBuffer: 20 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      const blocks = output.split(/\r?\n\r?\n/)
      for (const block of blocks) {
        const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        if (!lines.length || !lines[0].toUpperCase().startsWith('HKEY_')) continue
        const item = { key: lines[0] }
        for (let i = 1; i < lines.length; i++) {
          const match = lines[i].match(/^([^\s]+)\s+REG_[A-Z0-9_]+\s*(.*)$/i)
          if (match) {
            item[match[1]] = match[2] ? match[2].trim() : ''
          }
        }
        if (item.DisplayName) entries.push(item)
      }
    } catch { /* Hive inaccessible or empty */ }
  }
  return entries
}

module.exports = {
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
  artworkUrls,
  unique,
  emitProgress,
  getUninstallRegistryEntries,
}