const path = require('node:path')
const fs = require('node:fs')

function getAppDriveRoot() {
  try {
    return path.parse(process.execPath).root || 'C:\\'
  } catch {
    return 'C:\\'
  }
}

function toPortablePath(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return targetPath
  const appRoot = getAppDriveRoot()
  const parsed = path.parse(targetPath)
  if (parsed.root && parsed.root.toLowerCase() === appRoot.toLowerCase()) {
    return `{{PORTABLE_ROOT}}${targetPath.slice(parsed.root.length)}`
  }
  return targetPath
}

function resolvePortablePath(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') return storedPath
  const appRoot = getAppDriveRoot()

  if (storedPath.startsWith('{{PORTABLE_ROOT}}')) {
    const rel = storedPath.slice('{{PORTABLE_ROOT}}'.length).replace(/^[/\\]+/, '')
    return path.join(appRoot, rel)
  }

  if (path.isAbsolute(storedPath) && !fs.existsSync(storedPath)) {
    const parsed = path.parse(storedPath)
    if (parsed.root && parsed.root.toLowerCase() !== appRoot.toLowerCase()) {
      const candidate = path.join(appRoot, storedPath.slice(parsed.root.length))
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }
  }

  return storedPath
}

module.exports = {
  getAppDriveRoot,
  toPortablePath,
  resolvePortablePath,
}
