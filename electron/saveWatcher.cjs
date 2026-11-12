const path = require('node:path')
const fs = require('node:fs')
const AdmZip = require('adm-zip')
const { recordSaveBackup, getSaveBackups, deleteSaveBackup } = require('./db.cjs')
const { isSafeSavePath } = require('../src/main/services/pcgwService.cjs')

const MAX_BACKUPS_PER_GAME = 3
const MAX_AUTO_BACKUP_BYTES = 100 * 1024 * 1024

function getTimestampString() {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')
}

function getDirectoryStats(targetPath) {
  let totalBytes = 0
  let newestMtime = 0

  function scan(currentPath) {
    try {
      const stat = fs.statSync(currentPath)
      if (stat.mtimeMs > newestMtime) newestMtime = stat.mtimeMs
      if (stat.isDirectory()) {
        const entries = fs.readdirSync(currentPath)
        for (const entry of entries) {
          scan(path.join(currentPath, entry))
        }
      } else if (stat.isFile()) {
        totalBytes += stat.size
      }
    } catch {}
  }

  scan(targetPath)
  return { totalBytes, newestMtime }
}

function enforceBackupCap(db, gameId, maxCount = MAX_BACKUPS_PER_GAME) {
  if (!db || !gameId) return
  try {
    const existing = getSaveBackups(db, gameId)
    if (existing.length > maxCount) {
      const excess = existing.slice(maxCount)
      for (const old of excess) {
        try {
          if (old.archive_path && fs.existsSync(old.archive_path)) {
            fs.unlinkSync(old.archive_path)
          }
        } catch {}
        deleteSaveBackup(db, old.id)
      }
    }
  } catch {}
}

function createSaveBackup(db, gameId, userDataPath, options = {}) {
  if (!db || !gameId) {
    return { success: false, error: 'Database and gameId are required.' }
  }

  const isAuto = Boolean(options.isAuto)

  let row
  try {
    row = db.prepare('SELECT id, canonical_title, save_dir_path FROM games WHERE id = ?').get(String(gameId))
  } catch (dbErr) {
    return { success: false, error: dbErr.message }
  }

  if (!row || !row.save_dir_path) {
    return { success: false, skipped: true, reason: 'No save_dir_path configured for this game.' }
  }

  const saveDirPath = path.normalize(row.save_dir_path.trim())

  if (typeof isSafeSavePath === 'function' && !isSafeSavePath(saveDirPath)) {
    return { success: false, skipped: true, reason: `Unsafe save directory path: ${saveDirPath}` }
  }

  if (!fs.existsSync(saveDirPath)) {
    return { success: false, skipped: true, reason: `Save directory does not exist on disk: ${saveDirPath}` }
  }

  let archivePath = null

  try {
    const stats = fs.statSync(saveDirPath)
    const { totalBytes, newestMtime } = getDirectoryStats(saveDirPath)

    if (isAuto) {
      const existingBackups = getSaveBackups(db, gameId)
      if (existingBackups.length > 0) {
        const lastBackup = existingBackups[0]
        let lastBackupTime = 0
        if (lastBackup.archive_path && fs.existsSync(lastBackup.archive_path)) {
          try {
            lastBackupTime = fs.statSync(lastBackup.archive_path).mtimeMs
          } catch {}
        }
        if (!lastBackupTime && lastBackup.timestamp) {
          lastBackupTime = new Date(lastBackup.timestamp).getTime() || 0
        }

        if (newestMtime > 0 && lastBackupTime > 0 && newestMtime <= lastBackupTime) {
          return { success: false, skipped: true, reason: 'unmodified' }
        }
      }
    }

    const maxBytesLimit = typeof options.maxBytes === 'number' ? options.maxBytes : MAX_AUTO_BACKUP_BYTES
    if (isAuto && totalBytes > maxBytesLimit) {
      const sizeMb = (totalBytes / (1024 * 1024)).toFixed(1)
      return {
        success: false,
        aborted: true,
        reason: 'Too large for auto-backup',
        sizeBytes: totalBytes,
        sizeMb,
      }
    }

    const rootData = userDataPath || path.join(process.cwd(), 'logpile_data')
    const savesDir = path.join(rootData, 'saves', String(gameId))
    if (!fs.existsSync(savesDir)) {
      fs.mkdirSync(savesDir, { recursive: true })
    }

    const timestamp = getTimestampString()
    archivePath = path.join(savesDir, `${timestamp}.zip`)

    const maxRetries = isAuto ? 2 : 1

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const zip = new AdmZip()
        if (stats.isDirectory()) {
          zip.addLocalFolder(saveDirPath)
        } else if (stats.isFile()) {
          zip.addLocalFile(saveDirPath)
        } else {
          return { success: false, error: 'Save path is neither a file nor a directory.' }
        }

        zip.writeZip(archivePath)
        break
      } catch (zipErr) {
        const isLocked = zipErr?.code === 'EBUSY' || zipErr?.code === 'EACCES' || /busy|locked|access/i.test(zipErr?.message || '')
        if (isLocked && attempt < maxRetries) {
          if (archivePath && fs.existsSync(archivePath)) {
            try { fs.unlinkSync(archivePath) } catch {}
          }
          const start = Date.now()
          while (Date.now() - start < 400) {}
          continue
        }
        throw zipErr
      }
    }

    if (!fs.existsSync(archivePath) || fs.statSync(archivePath).size === 0) {
      if (fs.existsSync(archivePath)) {
        try { fs.unlinkSync(archivePath) } catch {}
      }
      return { success: false, error: 'Failed to write valid zip archive (0 bytes or missing).' }
    }

    recordSaveBackup(db, gameId, archivePath)
    enforceBackupCap(db, gameId, MAX_BACKUPS_PER_GAME)

    return {
      success: true,
      gameId,
      archivePath,
      timestamp,
      sizeBytes: fs.statSync(archivePath).size,
    }
  } catch (err) {
    if (archivePath && fs.existsSync(archivePath)) {
      try {
        if (fs.statSync(archivePath).size === 0) {
          fs.unlinkSync(archivePath)
        }
      } catch {}
    }
    return { success: false, error: err.message }
  }
}

function listSaveBackupsForGame(db, gameId) {
  if (!db || !gameId) return []
  const rows = getSaveBackups(db, gameId)
  return rows.map((r) => {
    const exists = Boolean(r.archive_path && fs.existsSync(r.archive_path))
    let sizeBytes = 0
    if (exists) {
      try {
        sizeBytes = fs.statSync(r.archive_path).size
      } catch {}
    }
    return {
      ...r,
      exists,
      sizeBytes,
    }
  })
}

function restoreSaveBackup(archivePath, targetDir) {
  if (!archivePath || !fs.existsSync(archivePath)) {
    return { success: false, error: 'Backup archive does not exist.' }
  }
  const stat = fs.statSync(archivePath)
  if (!stat.isFile() || stat.size === 0) {
    return { success: false, error: 'Backup archive is empty or invalid.' }
  }
  if (!targetDir || (typeof isSafeSavePath === 'function' && !isSafeSavePath(targetDir))) {
    return { success: false, error: `Unsafe target directory: ${targetDir}` }
  }

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    const zip = new AdmZip(archivePath)
    zip.extractAllTo(targetDir, true)
    return { success: true, targetDir, archivePath }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

function checkSaveConflict(db, gameId) {
  if (!db || !gameId) return { hasConflict: false }
  try {
    const row = db.prepare('SELECT id, canonical_title, save_dir_path FROM games WHERE id = ?').get(String(gameId))
    if (!row || !row.save_dir_path) return { hasConflict: false }

    const saveDirPath = path.normalize(row.save_dir_path.trim())
    const backups = getSaveBackups(db, gameId)
    if (!backups || backups.length === 0) return { hasConflict: false }

    const latest = backups[0]
    if (!latest.archive_path || !fs.existsSync(latest.archive_path)) return { hasConflict: false }

    let backupMtime = 0
    try {
      backupMtime = fs.statSync(latest.archive_path).mtimeMs
    } catch {
      backupMtime = new Date(latest.timestamp).getTime() || 0
    }

    if (!fs.existsSync(saveDirPath)) {
      return {
        hasConflict: true,
        reason: 'missing_local',
        gameId,
        title: row.canonical_title,
        backupId: latest.id,
        backupPath: latest.archive_path,
        backupTime: backupMtime,
        targetDir: saveDirPath,
      }
    }

    const { newestMtime } = getDirectoryStats(saveDirPath)
    if (backupMtime > newestMtime + 2000) {
      return {
        hasConflict: true,
        reason: 'newer_backup',
        gameId,
        title: row.canonical_title,
        backupId: latest.id,
        backupPath: latest.archive_path,
        backupTime: backupMtime,
        localTime: newestMtime,
        targetDir: saveDirPath,
      }
    }

    return { hasConflict: false }
  } catch (err) {
    return { hasConflict: false, error: err.message }
  }
}

module.exports = {
  createSaveBackup,
  restoreSaveBackup,
  checkSaveConflict,
  listSaveBackupsForGame,
  enforceBackupCap,
  getDirectoryStats,
  MAX_BACKUPS_PER_GAME,
  MAX_AUTO_BACKUP_BYTES,
}
