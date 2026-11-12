const { app, BrowserWindow, ipcMain, shell, dialog, protocol, net, clipboard, nativeImage, Tray, Menu, globalShortcut } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const { spawn, execFile } = require('node:child_process')
const windowStateKeeper = require('electron-window-state')
const { pathToFileURL } = require('node:url')

// Force all app data, databases, and caches to save alongside the executable (Zero-C-Drive)
const isPackaged = app.isPackaged;
const APP_DATA_DIR = isPackaged
  ? path.join(path.dirname(app.getPath('exe')), 'logpile_data')
  : path.join(__dirname, '..', 'logpile_data');

try {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
} catch (err) {
  console.error('[Storage] Failed to create APP_DATA_DIR:', err);
}

app.setPath('userData', APP_DATA_DIR);
app.setPath('sessionData', path.join(APP_DATA_DIR, 'session'));
app.setPath('temp', path.join(APP_DATA_DIR, 'temp'));
process.env.HF_HOME = path.join(APP_DATA_DIR, 'cache');
process.env.XDG_CACHE_HOME = path.join(APP_DATA_DIR, 'cache');

// Enforce single instance lock
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

const {
  createDatabase,
  openDatabase,
  seedIfEmpty,
  getGames,
  setGameHidden,
  updateGameStatus,
  updateGameMetadata,
  recordPlaySession,
  deleteGames,
  bulkUpdateGames,
  moveGameCategory,
  bulkMoveGameCategory,
  bulkSetGameHidden,
  getRandomInstalledGame,
  getLibraryStats,
  exportLibraryCsv,
  exportSelectedCsv,
  purgeLibrary,
  getLibrarySettings,
  setLibrarySettings,
  getActivityLog,
  logActivity,
  setAppConfig,
  getLibraryHealth,
  getUserCaptures,
  addUserCapture,
  deleteUserCapture,
  getNetworkActivityLog,
  getNetworkActivityStats,
  clearNetworkActivityLog,
  searchGameKnowledge,
  hasGuide,
  resolveGameByQuery,
  findGameEntityInText,
  updateGameModProfile,
  updateCheckpointNote,
} = require('./db.cjs')
const { scanAndImportGuides, startGuideWatcher } = require('../src/main/services/guideImporter.cjs')
const { scanAll, importFile, importBuffer } = require('../src/main/services/scanService.cjs')
const {
  fetchMissingArtwork,
  runBulkArtworkSync,
  syncLibraryMetadata,
  syncLibraryMetadataAndArt,
  generateAutomaticFallbacks,
  copyManualArtwork,
  copyArtworkOverride,
  refetchArtworkByExactId,
  refetchSelectedArtwork,
  repairBrokenArtworkLinks,
  fetchGameMetadata,
  restoreStaticCoversLocal,
} = require('../src/main/services/artworkService.cjs')
const { testIgdbConnection } = require('../src/main/services/igdbService.cjs')
const { backupArtworkCache, restoreArtworkCache } = require('../src/main/services/archiveService.cjs')
const { getSystemSpecs } = require('../src/main/services/systemSpecsService.cjs')
const {
  getModelStatus,
  getModelsDirectory,
  askGamingAssistant,
  recommendFromLibrary,
  unloadEngine,
  parseLibraryFilterIntent,
} = require('../src/main/services/aiService.cjs')
const {
  getFamilyLocks,
  startSteamFamilyWatcher,
  stopSteamFamilyWatcher,
} = require('../src/main/services/steamFamilyService.cjs')
const { createSaveBackup, restoreSaveBackup, checkSaveConflict, listSaveBackupsForGame } = require('./saveWatcher.cjs')
const { fetchPcgwTechDataManual } = require('../src/main/services/pcgwService.cjs')
const voiceService = require('./voiceService.cjs')
const { toPortablePath, resolvePortablePath } = require('./pathUtils.cjs')

let mainWindow
let bulkArtworkSyncPromise = null
let bulkArtworkSyncController = null
let unifiedSyncPromise = null
let unifiedSyncController = null
let metadataSyncPromise = null
let metadataSyncController = null
let db

function isSafeFilters(filters) {
  return filters === undefined || (filters && typeof filters === 'object' && !Array.isArray(filters))
}

function isSafeSort(sort) {
  return sort === undefined || (sort && typeof sort === 'object' && !Array.isArray(sort))
}

function logLaunchAttempt({ uri, storefront, id, idSource, result, error }) {
  try {
    const directory = path.join(app.getPath('userData'), 'logs')
    fs.mkdirSync(directory, { recursive: true })
    const entry = {
      timestamp: new Date().toISOString(),
      storefront: String(storefront || 'unknown').slice(0, 120),
      id: String(id || '').slice(0, 120),
      idSource: String(idSource || 'unknown').slice(0, 120),
      uri: String(uri || '').slice(0, 2000),
      result,
      error: error ? String(error).slice(0, 500) : null,
    }
    fs.appendFileSync(path.join(directory, 'launch.log'), `${JSON.stringify(entry)}${String.fromCharCode(10)}`, 'utf8')
  } catch {
    /* Diagnostics must never block a launch attempt. */
  }
}

async function performDatabaseBackup(db, userDataPath) {
  try {
    const backupsDir = path.join(userDataPath, 'backups')
    await fs.promises.mkdir(backupsDir, { recursive: true })

    const now = Date.now()
    const timestamp = new Date(now).toISOString().replace(/[:.]/g, '-')
    const dbBackupPath = path.join(backupsDir, `logpile-${timestamp}.db`)
    const artBackupDir = path.join(backupsDir, `artwork_cache-${timestamp}`)

    // 1. Native better-sqlite3 non-blocking backup API
    await db.backup(dbBackupPath)

    const possibleArtDirs = [
      path.join(userDataPath, 'artwork_database'),
      path.join(userDataPath, 'artwork'),
      path.join(userDataPath, 'art_cache'),
      path.join(userDataPath, 'artwork_cache'),
    ]
    const sourceArtDir = possibleArtDirs.find((d) => fs.existsSync(d) && fs.statSync(d).isDirectory())
    if (sourceArtDir) {
      try {
        await fs.promises.cp(sourceArtDir, artBackupDir, { recursive: true })
      } catch (err) {
        console.warn('[Backup] Artwork cache backup copy warning:', err?.message)
      }
    }

    // 3. Store last-backup timestamp in app_config
    setAppConfig(db, 'last_backup_timestamp', String(now))
    setAppConfig(db, 'last_backup_path', dbBackupPath)

    // 4. Log backup event in activity_log
    logActivity(db, 'backup', null, {
      message: `Database snapshot and artwork backup created in /backups/`,
      dbPath: path.basename(dbBackupPath),
      artPath: sourceArtDir ? path.basename(artBackupDir) : null,
      timestamp: now,
    })

    return {
      success: true,
      timestamp: now,
      dbSnapshot: path.basename(dbBackupPath),
      dbPath: dbBackupPath,
      artPath: sourceArtDir ? artBackupDir : null,
    }
  } catch (err) {
    console.error('[Backup] performDatabaseBackup FAILED:', err)
    throw err
  }
}

async function listDatabaseBackups(userDataPath) {
  const backupsDir = path.join(userDataPath, 'backups')
  try {
    if (!fs.existsSync(backupsDir)) {
      await fs.promises.mkdir(backupsDir, { recursive: true })
      return { directory: backupsDir, backups: [] }
    }
    const entries = await fs.promises.readdir(backupsDir, { withFileTypes: true })
    const backups = []
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.db')) {
        const filePath = path.join(backupsDir, entry.name)
        const stat = await fs.promises.stat(filePath)
        const baseName = entry.name.replace(/\.db$/i, '')
        const timestampSuffix = baseName.replace(/^(logpile|safety-pre-restore)-/, '')
        const potentialArtDir = path.join(backupsDir, `artwork_cache-${timestampSuffix}`)
        const hasArtwork = fs.existsSync(potentialArtDir) && fs.statSync(potentialArtDir).isDirectory()
        backups.push({
          fileName: entry.name,
          filePath,
          sizeBytes: stat.size,
          mtimeMs: stat.mtimeMs,
          isSafetyBackup: entry.name.startsWith('safety-pre-restore-'),
          hasArtwork,
          artBackupDir: hasArtwork ? potentialArtDir : null,
        })
      }
    }
    backups.sort((a, b) => b.mtimeMs - a.mtimeMs)
    return { directory: backupsDir, backups }
  } catch (err) {
    console.warn('[Backup] listDatabaseBackups warning:', err?.message)
    return { directory: backupsDir, backups: [] }
  }
}

async function restoreDatabaseBackup(targetBackupPath, userDataPath) {
  if (!targetBackupPath || !fs.existsSync(targetBackupPath)) {
    throw new Error('Selected backup file does not exist.')
  }

  // Pre-validate SQLite file signature and integrity before touching the live database
  try {
    const fd = fs.openSync(targetBackupPath, 'r')
    const headerBuf = Buffer.alloc(16)
    fs.readSync(fd, headerBuf, 0, 16, 0)
    fs.closeSync(fd)
    if (headerBuf.toString('utf8', 0, 16) !== 'SQLite format 3\0') {
      throw new Error('Invalid backup file: not a recognized SQLite database.')
    }
  } catch (headerErr) {
    throw new Error(headerErr.message.startsWith('Invalid backup') ? headerErr.message : 'Unable to read backup file header.')
  }

  let verifyDb = null
  try {
    verifyDb = openDatabase(targetBackupPath, { readonly: true, fileMustExist: true })
    const checkResult = verifyDb.pragma('quick_check(1)', { simple: true })
    if (checkResult !== 'ok') {
      throw new Error('Backup integrity check failed: database file is corrupted.')
    }
  } catch (verifyErr) {
    throw new Error(verifyErr.message.startsWith('Backup integrity') ? verifyErr.message : 'Corrupted or unreadable backup database file.')
  } finally {
    if (verifyDb) {
      try { verifyDb.close() } catch {}
    }
  }

  const liveDbPath = path.join(userDataPath, 'logpile.db')
  const backupsDir = path.join(userDataPath, 'backups')
  await fs.promises.mkdir(backupsDir, { recursive: true })

  // 1. Safety snapshot of current database
  const now = Date.now()
  const safetyTimestamp = new Date(now).toISOString().replace(/[:.]/g, '-')
  const safetyPath = path.join(backupsDir, `safety-pre-restore-${safetyTimestamp}.db`)
  try {
    if (db && fs.existsSync(liveDbPath)) {
      await db.backup(safetyPath)
    }
  } catch (safetyErr) {
    console.warn('[Restore] Safety snapshot warning:', safetyErr?.message)
  }

  // 2. Safely close live DB connection
  try {
    if (db && typeof db.close === 'function') {
      db.close()
    }
  } catch (closeErr) {
    console.warn('[Restore] Error closing db:', closeErr?.message)
  }

  // 3. Remove WAL and SHM files
  const walPath = `${liveDbPath}-wal`
  const shmPath = `${liveDbPath}-shm`
  try { if (fs.existsSync(walPath)) fs.unlinkSync(walPath) } catch {}
  try { if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath) } catch {}

  // 4. Overwrite live DB with backup file
  await fs.promises.copyFile(targetBackupPath, liveDbPath)

  // 5. Restore artwork if accompanied by artwork_cache folder
  const backupFileName = path.basename(targetBackupPath)
  const baseName = backupFileName.replace(/\.db$/i, '')
  const timestampSuffix = baseName.replace(/^(logpile|safety-pre-restore)-/, '')
  const potentialArtDir = [
    path.join(path.dirname(targetBackupPath), `artwork_database-${timestampSuffix}`),
    path.join(path.dirname(targetBackupPath), `artwork_cache-${timestampSuffix}`),
  ].find((d) => fs.existsSync(d) && fs.statSync(d).isDirectory())
  let restoredArtwork = false
  if (potentialArtDir) {
    const liveArtDir = path.join(userDataPath, 'artwork_database')
    try {
      await fs.promises.mkdir(liveArtDir, { recursive: true })
      await fs.promises.cp(potentialArtDir, liveArtDir, { recursive: true })
      restoredArtwork = true
    } catch (artErr) {
      console.warn('[Restore] Artwork restore warning:', artErr?.message)
    }
  }

  // 6. Re-open live database
  db = createDatabase(liveDbPath)

  // 7. Store restore info & log activity
  setAppConfig(db, 'last_restored_from', targetBackupPath)
  setAppConfig(db, 'last_restored_timestamp', String(now))
  logActivity(db, 'backup', null, {
    message: `Database restored from snapshot ${backupFileName}`,
    restoredFrom: backupFileName,
    restoredArtwork,
    timestamp: now,
  })

  // 8. Repair artwork links and fetch updated stats
  try {
    repairBrokenArtworkLinks(db, userDataPath)
  } catch (repairErr) {
    console.warn('[Restore] Post-restore artwork repair warning:', repairErr?.message)
  }

  const stats = getLibraryStats(db)
  const health = getLibraryHealth(db)

  return {
    success: true,
    restoredFrom: backupFileName,
    restoredArtwork,
    stats,
    health,
  }
}


// --- Session Tracking & System Tray (Step 1 & 2) ---
let tray = null;
const activeGameSessions = new Map();

function getAppIconPath() {
  const packagedPath = path.join(process.resourcesPath, 'icon.ico');
  const devPath = path.join(__dirname, '..', 'build', 'icon.ico');
  if (app.isPackaged) {
    if (fs.existsSync(packagedPath)) return packagedPath;
    if (fs.existsSync(devPath)) return devPath;
    return packagedPath;
  }
  if (fs.existsSync(devPath)) return devPath;
  if (fs.existsSync(packagedPath)) return packagedPath;
  return devPath;
}

function setupTray(win, database) {
  if (tray) return;
  const iconPath = getAppIconPath();

  let trayImage;
  if (fs.existsSync(iconPath)) {
    try {
      const img = nativeImage.createFromPath(iconPath);
      trayImage = (!img.isEmpty()) ? img : iconPath;
    } catch {
      trayImage = iconPath;
    }
  } else {
    console.warn('[Tray] Icon not found at:', iconPath);
    trayImage = nativeImage.createEmpty();
  }

  tray = new Tray(trayImage);
  tray.setToolTip('Logpile');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Logpile',
      click: () => {
        if (win && !win.isDestroyed()) {
          win.show();
          win.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Logpile',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
    }
  });
  tray.on('click', () => {
    if (win && !win.isDestroyed()) {
      if (win.isVisible()) {
        win.focus();
      } else {
        win.show();
        win.focus();
      }
    }
  });
}

function findGameExecutables(installPath) {
  const exeNames = new Set();
  if (!installPath || typeof installPath !== 'string' || !fs.existsSync(installPath)) return exeNames;
  try {
    const entries = fs.readdirSync(installPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
        const lower = entry.name.toLowerCase();
        if (!lower.includes('crash') && !lower.includes('unins') && !lower.includes('setup') && !lower.includes('redist') && !lower.includes('unitycrash')) {
          exeNames.add(lower);
        }
      } else if (entry.isDirectory()) {
        const sub = path.join(installPath, entry.name);
        try {
          const subEntries = fs.readdirSync(sub, { withFileTypes: true });
          for (const s of subEntries) {
            if (s.isFile() && s.name.toLowerCase().endsWith('.exe')) {
              const lower = s.name.toLowerCase();
              if (!lower.includes('crash') && !lower.includes('unins') && !lower.includes('setup') && !lower.includes('redist') && !lower.includes('unitycrash')) {
                exeNames.add(lower);
              }
            } else if (s.isDirectory()) {
              const sub2 = path.join(sub, s.name);
              try {
                const sub2Entries = fs.readdirSync(sub2, { withFileTypes: true });
                for (const s2 of sub2Entries) {
                  if (s2.isFile() && s2.name.toLowerCase().endsWith('.exe')) {
                    const lower = s2.name.toLowerCase();
                    if (!lower.includes('crash') && !lower.includes('unins') && !lower.includes('setup') && !lower.includes('redist') && !lower.includes('unitycrash')) {
                      exeNames.add(lower);
                    }
                  }
                }
              } catch {}
            }
          }
        } catch {}
      }
    }
  } catch {}
  return exeNames;
}

function getRunningProcessNames() {
  return new Promise((resolve) => {
    execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true }, (err, stdout) => {
      if (err || !stdout) return resolve(new Set());
      const set = new Set();
      const lines = stdout.split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.match(/^"([^"]+)"/);
        if (match) set.add(match[1].toLowerCase());
      }
      resolve(set);
    });
  });
}

function startTrackingGameSession(gameId, title, executablePath = null, installPath = null) {
  if (!gameId) return;
  if (activeGameSessions.has(gameId)) return;

  let resolvedInstallPath = installPath;
  let resolvedExecutablePath = executablePath;
  let resolvedTitle = title;

  if (db && (!resolvedInstallPath || !resolvedExecutablePath)) {
    try {
      const row = db.prepare('SELECT install_path, executable_path, canonical_title FROM games WHERE id = ?').get(gameId);
      if (row) {
        if (!resolvedInstallPath && row.install_path) resolvedInstallPath = row.install_path;
        if (!resolvedExecutablePath && row.executable_path) resolvedExecutablePath = row.executable_path;
        if (!resolvedTitle && row.canonical_title) resolvedTitle = row.canonical_title;
      }
    } catch {}
  }

  const candidateExes = new Set();
  if (resolvedExecutablePath) {
    candidateExes.add(path.basename(resolvedExecutablePath).toLowerCase());
  }
  if (resolvedInstallPath) {
    const fromFolder = findGameExecutables(resolvedInstallPath);
    for (const name of fromFolder) candidateExes.add(name);
  }

  const session = {
    gameId,
    title: resolvedTitle || 'Game',
    startTime: Date.now(),
    candidateExes,
    hasBeenDetected: false,
    consecutiveMisses: 0,
    timer: null,
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.webContents.send('game:sessionStarted', { gameId, title: session.title }) } catch {}
  }

  session.timer = setInterval(async () => {
    const running = await getRunningProcessNames();
    let isRunning = false;

    for (const exe of session.candidateExes) {
      if (running.has(exe)) {
        isRunning = true;
        break;
      }
    }

    if (isRunning) {
      session.hasBeenDetected = true;
      session.consecutiveMisses = 0;
    } else {
      if (!session.hasBeenDetected) {
        session.consecutiveMisses++;
        if (session.consecutiveMisses > 15) {
          clearInterval(session.timer);
          activeGameSessions.delete(gameId);
          if (mainWindow && !mainWindow.isDestroyed()) {
            try { mainWindow.webContents.send('game:sessionEnded', { gameId, title: session.title }) } catch {}
          }
        }
      } else {
        session.consecutiveMisses++;
        if (session.consecutiveMisses >= 2) {
          clearInterval(session.timer);
          activeGameSessions.delete(gameId);
          endGameSession(session);
        }
      }
    }
  }, 4000);

  activeGameSessions.set(gameId, session);
}

function endGameSession(session) {
  if (!session || session.isEnded) return;
  session.isEnded = true;
  if (session.timer) {
    clearInterval(session.timer);
    session.timer = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.webContents.send('game:sessionEnded', { gameId: session.gameId, title: session.title }) } catch {}
    try { mainWindow.webContents.send('game:promptCheckpointNote', { gameId: session.gameId, title: session.title }) } catch {}
  }
  const elapsedSeconds = Math.round((Date.now() - session.startTime) / 1000);
  if (elapsedSeconds >= 10 && db) {
    try {
      recordPlaySession(db, session.gameId, elapsedSeconds);
      logActivity(db, 'game_session_ended', session.gameId, {
        title: session.title,
        durationMinutes: Math.round(elapsedSeconds / 60),
        durationSeconds: elapsedSeconds,
      });
      // Smart Save Watcher (100% offline, skips unchanged saves, 100MB circuit breaker, FIFO 3-cap)
      try {
        createSaveBackup(db, session.gameId, app.getPath('userData'), { isAuto: true });
      } catch {}
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('library:updated');
      }
    } catch (err) {
      console.error('[SessionTracker] Failed to record play session:', err);
    }
  }
}

function flushAllActiveSessions() {
  for (const [_gameId, session] of activeGameSessions.entries()) {
    if (session.timer) clearInterval(session.timer);
    if (session.hasBeenDetected) {
      endGameSession(session);
    }
  }
  activeGameSessions.clear();
}


let overlayWindow = null;
let lastFocusedGame = { id: null, title: '' };

const isAllowedAppUrl = (targetUrl) => {
  try {
    const isDev = !app.isPackaged && (process.argv.includes('--dev') || process.env.NODE_ENV === 'development')
    const rendererUrl = !app.isPackaged ? (process.env.ELECTRON_RENDERER_URL || (isDev ? 'http://127.0.0.1:5173' : null)) : null
    const indexPath = path.join(__dirname, '..', 'app-dist', 'index.html')
    const parsed = new URL(targetUrl)
    if (rendererUrl) {
      const expected = new URL(rendererUrl)
      return parsed.origin === expected.origin && (parsed.pathname === expected.pathname || parsed.pathname === '/' || parsed.pathname === '')
    }
    const expectedFileUrl = pathToFileURL(indexPath).href
    const parsedExpected = new URL(expectedFileUrl)
    return parsed.protocol === 'file:' && parsed.pathname.toLowerCase() === parsedExpected.pathname.toLowerCase()
  } catch {
    return false
  }
}

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) return;
  overlayWindow = new BrowserWindow({
    width: 820,
    height: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    resizable: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  overlayWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  overlayWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowedAppUrl(navigationUrl)) {
      event.preventDefault();
    }
  });

  overlayWindow.webContents.on('will-redirect', (event, navigationUrl) => {
    if (!isAllowedAppUrl(navigationUrl)) {
      event.preventDefault();
    }
  });

  const isDev = !app.isPackaged && (process.argv.includes('--dev') || process.env.NODE_ENV === 'development');
  const rendererUrl = !app.isPackaged ? (process.env.ELECTRON_RENDERER_URL || (isDev ? 'http://127.0.0.1:5173' : null)) : null;
  const indexPath = path.join(__dirname, '..', 'app-dist', 'index.html');

  if (rendererUrl) {
    overlayWindow.loadURL(`${rendererUrl}#overlay`);
  } else {
    overlayWindow.loadFile(indexPath, { hash: 'overlay' });
  }

  overlayWindow.on('blur', () => {
    overlayWindow.hide();
  });
}

function toggleOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow();
  }
  if (overlayWindow.isVisible()) {
    overlayWindow.hide();
  } else {
    overlayWindow.center();
    overlayWindow.show();
    overlayWindow.focus();
    try {
      overlayWindow.webContents.send('overlay:shown');
    } catch {}
  }
}

function createWindow() {
  const windowState = windowStateKeeper({
    defaultWidth: 1280,
    defaultHeight: 800,
    minimumWidth: 1024,
    minimumHeight: 640,
  })

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0c0d10',
    icon: getAppIconPath(),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  windowState.manage(mainWindow)

  mainWindow.on('close', (event) => {
    if (app.isQuitting) return
    const settings = db ? (getLibrarySettings(db) || {}) : {}
    if (settings.minimizeToTray) {
      event.preventDefault()
      mainWindow.hide()
      return false
    }
  })

  mainWindow.on('minimize', (event) => {
    const settings = db ? (getLibrarySettings(db) || {}) : {}
    if (settings.minimizeToTray) {
      event.preventDefault()
      mainWindow.hide()
      return false
    }
  })
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    try {
      startSteamFamilyWatcher((locks) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('steam:family-locks-updated', locks)
        }
      })
    } catch (err) {
      console.warn('[SteamFamily] Failed starting watcher:', err)
    }
  })
  setupTray(mainWindow, db)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Keyboard accelerators for frameless window: F5 / Ctrl+R (reload), F12 (DevTools)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      if (input.key === 'F5' || (input.control && (input.key.toLowerCase() === 'r'))) {
        mainWindow.webContents.reloadIgnoringCache()
        event.preventDefault()
      } else if (input.key === 'F11') {
        mainWindow.setFullScreen(!mainWindow.isFullScreen())
        event.preventDefault()
      } else if (!app.isPackaged && (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))) {
        mainWindow.webContents.toggleDevTools()
        event.preventDefault()
      }
    }
  })

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (!app.isPackaged) {
      console.log(`[Renderer L${level}] ${message}`)
    }
  })

  const isDev = !app.isPackaged && (process.argv.includes('--dev') || process.env.NODE_ENV === 'development')
  const rendererUrl = !app.isPackaged ? (process.env.ELECTRON_RENDERER_URL || (isDev ? 'http://127.0.0.1:5173' : null)) : null
  const indexPath = path.join(__dirname, '..', 'app-dist', 'index.html')

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowedAppUrl(navigationUrl)) {
      event.preventDefault()
    }
  })

  mainWindow.webContents.on('will-redirect', (event, navigationUrl) => {
    if (!isAllowedAppUrl(navigationUrl)) {
      event.preventDefault()
    }
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Renderer] Failed to load ${validatedURL}: ${errorCode} (${errorDescription})`)
  })

  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl)
  } else {
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[App] Failed to loadFile:', err)
    })
  }
}

function registerIpc() {
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
    return mainWindow.isMaximized()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => Boolean(mainWindow?.isMaximized()))
  ipcMain.handle('window:toggleFullScreen', () => {
    if (!mainWindow) return false
    const next = !mainWindow.isFullScreen()
    mainWindow.setFullScreen(next)
    return next
  })
  ipcMain.handle('window:isFullScreen', () => Boolean(mainWindow?.isFullScreen()))
  ipcMain.handle('window:reload', () => {
    if (mainWindow) {
      mainWindow.webContents.reloadIgnoringCache()
      return true
    }
    return false
  })

  ipcMain.handle('window:saveBragCollage', async (_event, dataUrl, filenamePrefix = 'Logpile-Showcase') => {
    try {
      if (!dataUrl || typeof dataUrl !== 'string') {
        throw new Error('Invalid image data URL.')
      }
      const capturesDir = path.join(app.getPath('userData'), 'captures')
      if (!fs.existsSync(capturesDir)) {
        fs.mkdirSync(capturesDir, { recursive: true })
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filename = `${filenamePrefix || 'Logpile-Showcase'}-${timestamp}.png`
      const filePath = path.join(capturesDir, filename)

      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      fs.writeFileSync(filePath, buffer)

      try {
        const img = nativeImage.createFromBuffer(buffer)
        clipboard.writeImage(img)
      } catch (clipErr) {
        console.warn('[BragCollage] Failed to write image to clipboard:', clipErr?.message)
      }

      return { success: true, filePath }
    } catch (err) {
      console.error('[BragCollage] Save failed:', err)
      return { success: false, error: err.message || 'Failed to save showcase image.' }
    }
  })

  ipcMain.handle('window:openCapturesFolder', async () => {
    const capturesDir = path.join(app.getPath('userData'), 'captures')
    if (!fs.existsSync(capturesDir)) {
      fs.mkdirSync(capturesDir, { recursive: true })
    }
    await shell.openPath(capturesDir)
    return true
  })

  ipcMain.handle('window:captureScreen', async (_event, prefix = 'Logpile-Screenshot') => {
    try {
      if (!mainWindow) return { success: false, error: 'No main window' }
      const image = await mainWindow.webContents.capturePage()
      const capturesDir = path.join(app.getPath('userData'), 'captures')
      if (!fs.existsSync(capturesDir)) {
        fs.mkdirSync(capturesDir, { recursive: true })
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filename = `${prefix}-${timestamp}.png`
      const filePath = path.join(capturesDir, filename)
      fs.writeFileSync(filePath, image.toPNG())
      try {
        clipboard.writeImage(image)
      } catch {}
      return { success: true, filePath }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('window:captureRect', async (_event, rect) => {
    try {
      if (!mainWindow) return { success: false, error: 'No main window' }
      let captureBounds
      if (rect && typeof rect.x === 'number') {
        const bounds = mainWindow.getContentBounds()
        const x = Math.max(0, Math.min(Math.round(rect.x), Math.max(0, bounds.width - 1)))
        const y = Math.max(0, Math.min(Math.round(rect.y), Math.max(0, bounds.height - 1)))
        const width = Math.max(1, Math.min(Math.round(rect.width), bounds.width - x))
        const height = Math.max(1, Math.min(Math.round(rect.height), bounds.height - y))
        captureBounds = { x, y, width, height }
      }
      const image = captureBounds
        ? await mainWindow.webContents.capturePage(captureBounds)
        : await mainWindow.webContents.capturePage()
      return {
        success: true,
        dataUrl: image.toDataURL(),
        capturedWidth: captureBounds ? captureBounds.width : mainWindow.getContentBounds().width,
        capturedHeight: captureBounds ? captureBounds.height : mainWindow.getContentBounds().height,
      }
    } catch (err) {
      console.warn('[Main] captureRect failed:', err.message)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('db:seedCheck', () => seedIfEmpty(db))
  ipcMain.handle('db:resolveGameByQuery', (_event, queryStr) => resolveGameByQuery(db, queryStr))
  ipcMain.handle('db:getGames', (_event, filters, sort) => {
    if (!isSafeFilters(filters) || !isSafeSort(sort)) throw new Error('Invalid query arguments')
    return getGames(db, filters || {}, sort || {})
  })
  ipcMain.handle('db:getLibraryStats', () => {
    const stats = getLibraryStats(db)
    try {
      stats.systemSpecs = getSystemSpecs()
    } catch {}
    return stats
  })
  ipcMain.handle('system:getSpecs', () => getSystemSpecs())
  ipcMain.handle('system:openExternal', async (_event, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) {
      try {
        await shell.openExternal(url.trim())
        return { success: true }
      } catch (err) {
        return { success: false, error: err.message }
      }
    }
    return { success: false, error: 'Invalid URL' }
  })
  ipcMain.handle('system:checkPreLaunch', async () => {
    const freeBytes = os.freemem()
    const totalBytes = os.totalmem()
    const freeMemGb = Number((freeBytes / (1024 ** 3)).toFixed(2))
    const totalMemGb = Number((totalBytes / (1024 ** 3)).toFixed(2))
    const isLowMemory = freeMemGb < 2.5

    const HEAVY_PROCESS_DEFS = [
      { name: 'chrome.exe', label: 'Google Chrome' },
      { name: 'msedge.exe', label: 'Microsoft Edge' },
      { name: 'discord.exe', label: 'Discord' },
      { name: 'python.exe', label: 'Python / ComfyUI' },
    ]

    const heavyProcesses = []
    try {
      const stdout = await new Promise((resolve) => {
        execFile('tasklist', ['/NH', '/FO', 'CSV'], { windowsHide: true }, (err, out) => {
          resolve(err ? '' : (out || ''))
        })
      })
      const lower = stdout.toLowerCase()
      for (const item of HEAVY_PROCESS_DEFS) {
        if (lower.includes(`"${item.name.toLowerCase()}"`)) {
          heavyProcesses.push(item)
        }
      }
    } catch {}

    return {
      isLowMemory,
      freeMemGb,
      totalMemGb,
      heavyProcesses,
      shouldWarn: isLowMemory || heavyProcesses.length > 0,
    }
  })
  ipcMain.handle('system:closeHeavyProcesses', async (_event, processNames = []) => {
    if (!Array.isArray(processNames) || processNames.length === 0) return { success: true }
    const allowed = new Set(['chrome.exe', 'msedge.exe', 'discord.exe', 'python.exe'])
    const valid = processNames.filter((name) => allowed.has(String(name).toLowerCase()))
    for (const proc of valid) {
      await new Promise((resolve) => {
        execFile('taskkill', ['/IM', proc, '/T'], { windowsHide: true }, () => resolve())
      })
    }
    return { success: true }
  })
  ipcMain.handle('steam:getFamilyLocks', () => getFamilyLocks())
  ipcMain.handle('pcgw:fetch:manual', async (_event, gameId) => {
    if (!gameId || !db) return { success: false, error: 'Invalid gameId or database offline.' }
    const game = db.prepare('SELECT canonical_title FROM games WHERE id = ?').get(String(gameId))
    if (!game) return { success: false, error: 'Game not found in library.' }
    return fetchPcgwTechDataManual(db, gameId, game.canonical_title)
  })
  ipcMain.handle('saves:list', async (_event, gameId) => {
    if (!gameId || !db) return []
    return listSaveBackupsForGame(db, gameId)
  })
  ipcMain.handle('saves:backupNow', async (_event, gameId) => {
    if (!gameId || !db) return { success: false, error: 'Invalid gameId or database offline.' }
    return createSaveBackup(db, gameId, app.getPath('userData'), { isManual: true })
  })
  ipcMain.handle('saves:restore', async (_event, gameId, backupId) => {
    if (!gameId || !db) return { success: false, error: 'Invalid gameId or database offline.' }
    const game = db.prepare('SELECT save_dir_path FROM games WHERE id = ?').get(String(gameId))
    if (!game || !game.save_dir_path) return { success: false, error: 'No save directory configured for this game.' }

    let archivePath = null
    if (backupId) {
      const backup = db.prepare('SELECT archive_path FROM save_backups WHERE id = ?').get(Number(backupId))
      archivePath = backup?.archive_path
    } else {
      const backups = getSaveBackups(db, gameId)
      archivePath = backups[0]?.archive_path
    }

    if (!archivePath) return { success: false, error: 'Backup archive not found.' }
    return restoreSaveBackup(archivePath, game.save_dir_path)
  })
  ipcMain.handle('saves:checkConflict', async (_event, gameId) => {
    if (!gameId || !db) return { hasConflict: false }
    return checkSaveConflict(db, gameId)
  })
  ipcMain.handle('db:getLibrarySettings', () => {
    const settings = getLibrarySettings(db) || {}
    return {
      autoHideSupportEntries: Boolean(settings.autoHideSupportEntries),
      steamGridDbApiKey: typeof settings.steamGridDbApiKey === 'string' ? settings.steamGridDbApiKey : '',
      igdbClientId: typeof settings.igdbClientId === 'string' ? settings.igdbClientId : '',
      igdbClientSecret: typeof settings.igdbClientSecret === 'string' ? settings.igdbClientSecret : '',
      heroResolution: typeof settings.heroResolution === 'string' && settings.heroResolution ? settings.heroResolution : '2.5k',
      minimizeToTray: Boolean(settings.minimizeToTray),
    }
  })
  ipcMain.handle('db:setLibrarySettings', (_event, settings) => {
    const next = setLibrarySettings(db, settings) || {}
    return {
      autoHideSupportEntries: Boolean(next.autoHideSupportEntries),
      steamGridDbApiKey: typeof next.steamGridDbApiKey === 'string' ? next.steamGridDbApiKey : '',
      igdbClientId: typeof next.igdbClientId === 'string' ? next.igdbClientId : '',
      igdbClientSecret: typeof next.igdbClientSecret === 'string' ? next.igdbClientSecret : '',
      heroResolution: typeof next.heroResolution === 'string' && next.heroResolution ? next.heroResolution : '2.5k',
      minimizeToTray: Boolean(next.minimizeToTray),
    }
  })
  ipcMain.handle('db:getActivityLog', (_event, limit) => {
    const entries = getActivityLog(db, limit)
    return Array.isArray(entries) ? entries : []
  })
  ipcMain.handle('network:getActivityLog', (_event, options) => {
    const entries = getNetworkActivityLog(db, options)
    return Array.isArray(entries) ? entries : []
  })
  ipcMain.handle('network:getStats', () => {
    return getNetworkActivityStats(db) || { totalRequests: 0, totalBytesTransferred: 0, formattedTransfer: '0 KB', byService: {} }
  })
  ipcMain.handle('network:clearLog', () => {
    clearNetworkActivityLog(db)
    return true
  })
  ipcMain.handle('db:getLibraryHealth', () => {
    const health = getLibraryHealth(db)
    const backupsDir = path.join(app.getPath('userData'), 'backups')
    const possibleArtworkDirs = [
      path.join(app.getPath('userData'), 'artwork_database'),
      path.join(app.getPath('userData'), 'artwork'),
      path.join(app.getPath('userData'), 'art_cache'),
    ]
    const artworkDir = possibleArtworkDirs.find((d) => fs.existsSync(d)) || possibleArtworkDirs[0]
    const liveDbPath = path.join(app.getPath('userData'), 'logpile.db')
    health.backupsDirectory = backupsDir
    if (fs.existsSync(liveDbPath)) {
      try {
        health.dbSizeBytes = fs.statSync(liveDbPath).size
      } catch {}
    }
    if (fs.existsSync(artworkDir)) {
      try {
        const artFiles = fs.readdirSync(artworkDir)
        health.cachedArtworkFiles = artFiles.length
      } catch {}
    }
    if (fs.existsSync(backupsDir)) {
      try {
        const files = fs.readdirSync(backupsDir)
          .filter((f) => f.endsWith('.db'))
          .map((f) => {
            const stat = fs.statSync(path.join(backupsDir, f))
            return { name: f, time: stat.mtimeMs, size: stat.size }
          })
        health.snapshotsCount = files.length
        health.totalBackupsSizeBytes = files.reduce((sum, f) => sum + f.size, 0)
        const regularBackups = files.filter((f) => !f.name.startsWith('safety-pre-restore-')).sort((a, b) => b.time - a.time)
        if (!health.lastBackupPath && regularBackups.length > 0) {
          health.lastBackupPath = path.join(backupsDir, regularBackups[0].name)
          if (!health.lastBackupTimestamp) health.lastBackupTimestamp = regularBackups[0].time
        }
      } catch {}
    }
    return health
  })
  ipcMain.handle('db:backupNow', async () => {
    try {
      const result = await performDatabaseBackup(db, app.getPath('userData'))
      return result
    } catch (err) {
      console.error('[IPC] db:backupNow failed:', err)
      throw err
    }
  })
  ipcMain.handle('db:listBackups', async () => {
    return listDatabaseBackups(app.getPath('userData'))
  })
  ipcMain.handle('db:openBackupsFolder', async (_event, customPath) => {
    const backupsDir = path.join(app.getPath('userData'), 'backups')
    await fs.promises.mkdir(backupsDir, { recursive: true })
    if (customPath && typeof customPath === 'string' && fs.existsSync(customPath)) {
      let isContained = false
      try {
        const realBackupsDir = fs.realpathSync(backupsDir)
        const realCustom = fs.realpathSync(customPath)
        const rel = path.relative(realBackupsDir, realCustom)
        isContained = rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
      } catch {
        isContained = false
      }

      if (isContained) {
        try {
          const stat = fs.statSync(customPath)
          if (stat.isFile()) {
            shell.showItemInFolder(customPath)
            return { success: true, path: customPath, openedFolder: false }
          }
          await shell.openPath(customPath)
          return { success: true, path: customPath, openedFolder: true }
        } catch {
          shell.showItemInFolder(customPath)
          return { success: true, path: customPath, openedFolder: false }
        }
      }
    }
    await shell.openPath(backupsDir)
    return { success: true, path: backupsDir, openedFolder: true }
  })
  ipcMain.handle('db:chooseBackupFile', async () => {
    const backupsDir = path.join(app.getPath('userData'), 'backups')
    await fs.promises.mkdir(backupsDir, { recursive: true })
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select database snapshot to restore',
      defaultPath: backupsDir,
      filters: [{ name: 'SQLite Database / Backup', extensions: ['db', 'sqlite', 'sqlite3'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths?.length) return null
    return result.filePaths[0]
  })
  ipcMain.handle('db:restoreBackup', async (_event, backupFilePath) => {
    let targetPath = backupFilePath
    if (!targetPath) {
      const backupsDir = path.join(app.getPath('userData'), 'backups')
      await fs.promises.mkdir(backupsDir, { recursive: true })
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select database snapshot to restore',
        defaultPath: backupsDir,
        filters: [{ name: 'SQLite Database / Backup', extensions: ['db', 'sqlite', 'sqlite3'] }],
        properties: ['openFile'],
      })
      if (result.canceled || !result.filePaths?.length) return { cancelled: true }
      targetPath = result.filePaths[0]
    }
    const result = await restoreDatabaseBackup(targetPath, app.getPath('userData'))
    if (mainWindow) {
      mainWindow.webContents.send('library:updated', { source: 'database:restored' })
      mainWindow.webContents.send('artwork:updated', { source: 'database:restored' })
    }
    return result
  })
  ipcMain.handle('db:exportCsv', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export logpile library',
      defaultPath: 'logpile-library-export.csv',
      filters: [{ name: 'CSV files', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePath) return null
    return exportLibraryCsv(db, result.filePath)
  })
  ipcMain.handle('db:exportSelectedCsv', async (_event, gameIds) => {
    if (!Array.isArray(gameIds) || gameIds.length < 1 || gameIds.length > 500) {
      throw new Error('Select between 1 and 500 library entries.')
    }
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export selected logpile games',
      defaultPath: 'logpile-selected-export.csv',
      filters: [{ name: 'CSV files', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePath) return null
    return exportSelectedCsv(db, result.filePath, gameIds)
  })
  ipcMain.handle('artwork:backupCache', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Backup artwork cache',
      defaultPath: 'logpile_Artwork_Backup.zip',
      filters: [{ name: 'ZIP archives', extensions: ['zip'] }],
    })
    if (result.canceled || !result.filePath) return null
    return backupArtworkCache(app.getPath('userData'), result.filePath)
  })
  ipcMain.handle('artwork:restoreCache', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Restore artwork cache',
      properties: ['openFile'],
      filters: [{ name: 'ZIP archives', extensions: ['zip'] }],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const restored = restoreArtworkCache(app.getPath('userData'), result.filePaths[0])
    mainWindow?.webContents.send('artwork:updated', restored)
    return restored
  })
  ipcMain.handle('clear-art-cache', async () => {
    return 0
  })
  ipcMain.handle('db:purgeLibrary', () => {
    const result = purgeLibrary(db)
    mainWindow?.webContents.send('library:updated', { type: 'purged', ...result })
    return result
  })
  ipcMain.handle('db:setGameHidden', (_event, gameId, hidden) => {
    if (typeof gameId !== 'string' || gameId.length > 120 || typeof hidden !== 'boolean') {
      throw new Error('Invalid hidden-game request.')
    }
    const updated = setGameHidden(db, gameId, hidden)
    mainWindow?.webContents.send('library:updated', updated)
    return updated
  })
  ipcMain.handle('db:update-game-status', (_event, arg1, arg2) => {
    let gameId = arg1
    let status = arg2
    if (arg1 && typeof arg1 === 'object') {
      gameId = arg1.id ?? arg1.gameId
      status = arg1.status
    }
    if (!gameId || typeof status !== 'string') {
      throw new Error('Invalid game status update request.')
    }
    const updated = updateGameStatus(db, String(gameId), status)
    mainWindow?.webContents.send('library:updated', updated)
    return updated
  })
  ipcMain.handle('db:updateGameStatus', (_event, arg1, arg2) => {
    let gameId = arg1
    let status = arg2
    if (arg1 && typeof arg1 === 'object') {
      gameId = arg1.id ?? arg1.gameId
      status = arg1.status
    }
    if (!gameId || typeof status !== 'string') {
      throw new Error('Invalid game status update request.')
    }
    const updated = updateGameStatus(db, String(gameId), status)
    mainWindow?.webContents.send('library:updated', updated)
    return updated
  })
  ipcMain.handle('db:updateGameMetadata', (_event, gameId, fields) => {
    if (typeof gameId !== 'string' || gameId.length > 120 || !fields || typeof fields !== 'object' || Array.isArray(fields)) {
      throw new Error('Invalid metadata update request.')
    }
    const updated = updateGameMetadata(db, gameId, fields)
    mainWindow?.webContents.send('library:updated', updated)
    return updated
  })
  ipcMain.handle('db:deleteGames', (_event, gameIds) => {
    const result = deleteGames(db, gameIds)
    mainWindow?.webContents.send('library:updated', result)
    return result
  })
  ipcMain.handle('db:bulkUpdateGames', (_event, gameIds, fields) => {
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      throw new Error('Invalid bulk edit request.')
    }
    const result = bulkUpdateGames(db, gameIds, fields)
    mainWindow?.webContents.send('library:updated', result)
    return result
  })
  ipcMain.handle('db:bulkMoveGameCategory', (_event, gameIds, category) => {
    if (!Array.isArray(gameIds) || !['main', 'dlc', 'utility'].includes(category)) {
      throw new Error('Invalid bulk category relocation request.')
    }
    const result = bulkMoveGameCategory(db, gameIds, category)
    mainWindow?.webContents.send('library:updated', result)
    return result
  })
  ipcMain.handle('db:bulkSetGameHidden', (_event, gameIds, hidden) => {
    if (!Array.isArray(gameIds) || typeof hidden !== 'boolean') {
      throw new Error('Invalid bulk hidden-game request.')
    }
    const result = bulkSetGameHidden(db, gameIds, hidden)
    mainWindow?.webContents.send('library:updated', result)
    return result
  })

  const applyCategoryMove = (gameId, category) => {
    if (typeof gameId !== 'string' || gameId.length > 120 || !['main', 'dlc', 'utility'].includes(category)) {
      throw new Error('Invalid category relocation request.')
    }
    const updated = moveGameCategory(db, gameId, category)
    mainWindow?.webContents.send('library:updated', updated)
    return updated
  }

  ipcMain.handle('db:moveGameCategory', (_event, gameId, category) => applyCategoryMove(gameId, category))
  ipcMain.handle('games:setCategory', (_event, gameId, category) => {
    const mapped = { game: 'main', dlc: 'dlc', utility: 'utility' }[category]
    if (!mapped) throw new Error('Invalid category relocation request.')
    return applyCategoryMove(gameId, mapped)
  })

  ipcMain.handle('roulette:pick', () => getRandomInstalledGame(db))
  let currentScanPromise = null
  const sendProgress = (payload) => {
    mainWindow?.webContents.send('scanner:progress', payload)
    if (payload?.type === 'batch-updated' || payload?.type === 'scan-complete') {
      mainWindow?.webContents.send('library:updated', { type: payload.type, source: payload.source })
    }
  }
  ipcMain.handle('scanner:scanAll', async () => {
    if (currentScanPromise) return currentScanPromise
    currentScanPromise = (async () => {
      try {
        const summary = await scanAll(db, sendProgress, app.getPath('userData'))
        setAppConfig(db, 'last_scan_timestamp', String(Date.now()))
        logActivity(db, 'scan', null, {
          message: `Library scan complete · ${summary.scannedInstalledGames} installed titles detected`,
          scannedInstalledGames: summary.scannedInstalledGames,
          detectedRecords: summary.detectedRecords,
          created: summary.created,
          updated: summary.updated,
          elapsedMs: summary.elapsedMs,
        })
        mainWindow?.webContents.send('library:updated', { type: 'scan-complete' })
        return summary
      } catch (err) {
        console.error('[Scanner] scanAll error:', err)
        throw err
      } finally {
        currentScanPromise = null
      }
    })()
    return currentScanPromise
  })
  ipcMain.handle('scanner:chooseImportFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import game catalog',
      properties: ['openFile'],
      filters: [{ name: 'Game catalogs', extensions: ['xlsx', 'xls', 'csv'] }],
    })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('scanner:importFile', async (_event, filePath) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath) || !fs.existsSync(filePath)) {
      throw new Error('The selected catalog file could not be found.')
    }
    const summary = await importFile(db, filePath, sendProgress, app.getPath('userData'))
    setAppConfig(db, 'last_scan_timestamp', String(Date.now()))
    logActivity(db, 'scan', null, {
      message: `Catalog import complete · ${summary.importedCatalogGames} titles processed`,
      importedCatalogGames: summary.importedCatalogGames,
      created: summary.created,
      updated: summary.updated,
    })
    return summary
  })
  ipcMain.handle('scanner:importBuffer', async (_event, data, filename) => {
    if (!data) throw new Error('No catalog file data provided.')
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
    const summary = await importBuffer(db, buffer, filename, sendProgress, app.getPath('userData'))
    setAppConfig(db, 'last_scan_timestamp', String(Date.now()))
    logActivity(db, 'scan', null, {
      message: `Catalog buffer import complete · ${summary.importedCatalogGames} titles processed`,
      importedCatalogGames: summary.importedCatalogGames,
      created: summary.created,
      updated: summary.updated,
    })
    return summary
  })
  ipcMain.handle('scanner:downloadTemplate', async (_event, format = 'xlsx') => {
    const ext = format === 'csv' ? 'csv' : 'xlsx'
    const defaultPath = path.join(app.getPath('downloads'), `Logpile_Game_Catalog_Template.${ext}`)
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Blank Game Catalog Template',
      defaultPath,
      filters: [
        format === 'csv'
          ? { name: 'CSV File (*.csv)', extensions: ['csv'] }
          : { name: 'Excel Spreadsheet (*.xlsx)', extensions: ['xlsx'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    if (result.canceled || !result.filePath) return { success: false, canceled: true }

    const { generateBlankTemplateBuffer } = require('../src/main/services/excelImporter.cjs')
    const buffer = generateBlankTemplateBuffer(format)
    fs.writeFileSync(result.filePath, buffer)
    return { success: true, filePath: result.filePath }
  })

  const sendArtworkProgress = (payload) => mainWindow?.webContents.send('scraper:progress', payload)
  const resolveArtworkKey = (apiKey) => {
    const supplied = typeof apiKey === 'string' ? apiKey.trim() : ''
    return supplied || String(getLibrarySettings(db).steamGridDbApiKey || '').trim()
  }
  const requireArtworkKey = (apiKey) => {
    const key = resolveArtworkKey(apiKey)
    if (key.length < 8 || key.length > 300) throw new Error('Enter a valid SteamGridDB API key.')
    return key
  }

  ipcMain.handle('scraper:fetchMissingArt', (_event, apiKey) =>
    fetchMissingArtwork(db, app.getPath('userData'), requireArtworkKey(apiKey), sendArtworkProgress)
  )
  ipcMain.handle('scraper:restoreStaticCoversLocal', async () => {
    const result = restoreStaticCoversLocal(db, app.getPath('userData'))
    logActivity(db, 'artwork_update', null, {
      message: `Restored static covers for 120+ FPS scrolling (${result.updated || 0} updated)`,
      updated: result.updated,
    })
    mainWindow?.webContents.send('artwork:updated', result)
    return result
  })

  ipcMain.handle('scraper:runBulkArtworkSync', async (_event, apiKey, options = {}) => {
    const key = requireArtworkKey(apiKey)
    if (bulkArtworkSyncPromise || unifiedSyncPromise) throw new Error('An artwork sync is already running.')
    bulkArtworkSyncController = new AbortController()
    bulkArtworkSyncPromise = runBulkArtworkSync(db, app.getPath('userData'), key, sendArtworkProgress, bulkArtworkSyncController.signal, options)
    try {
      const result = await bulkArtworkSyncPromise
      logActivity(db, 'artwork_update', null, {
        message: `Bulk artwork sync complete · ${result.updated || 0} covers updated`,
        candidates: result.candidates,
        updated: result.updated,
        matched: result.matched,
        skipped: result.skipped,
        failed: result.failed,
      })
      mainWindow?.webContents.send('artwork:updated', result)
      return result
    } finally {
      bulkArtworkSyncPromise = null
      bulkArtworkSyncController = null
    }
  })
  ipcMain.handle('scraper:syncMetadataAndArt', async (_event, apiKey) => {
    const key = requireArtworkKey(apiKey)
    if (unifiedSyncPromise) throw new Error('A metadata and artwork sync is already running.')
    unifiedSyncController = new AbortController()
    unifiedSyncPromise = syncLibraryMetadataAndArt(db, app.getPath('userData'), key, sendArtworkProgress, unifiedSyncController.signal, { forceAll: true })
    try {
      const result = await unifiedSyncPromise
      logActivity(db, 'metadata_update', null, {
        message: `Library metadata & art sync complete · ${result.metadataUpdated || 0} metadata updated, ${result.updated || 0} artwork updated`,
        candidates: result.candidates,
        metadataUpdated: result.metadataUpdated,
        artworkUpdated: result.updated,
        matched: result.matched,
        skipped: result.skipped,
        failed: result.failed,
      })
      mainWindow?.webContents.send('artwork:updated', result)
      return result
    } finally {
      unifiedSyncPromise = null
      unifiedSyncController = null
    }
  })
  ipcMain.handle('scraper:isSyncing', () =>
    Boolean(unifiedSyncPromise || bulkArtworkSyncPromise || metadataSyncPromise)
  )
  ipcMain.handle('scraper:cancelSync', () => {
    let cancelled = false
    if (unifiedSyncController) {
      unifiedSyncController.abort()
      cancelled = true
    }
    if (bulkArtworkSyncController) {
      bulkArtworkSyncController.abort()
      cancelled = true
    }
    if (metadataSyncController) {
      metadataSyncController.abort()
      cancelled = true
    }
    return { cancelled }
  })
  ipcMain.handle('scraper:syncMetadata', async (_event, apiKey) => {
    if (apiKey !== undefined && (typeof apiKey !== 'string' || apiKey.length > 300)) {
      throw new Error('Invalid SteamGridDB API key.')
    }
    if (metadataSyncPromise || bulkArtworkSyncPromise || unifiedSyncPromise) {
      throw new Error('A sync is already running.')
    }
    metadataSyncController = new AbortController()
    metadataSyncPromise = syncLibraryMetadata(db, app.getPath('userData'), resolveArtworkKey(apiKey), sendArtworkProgress, metadataSyncController.signal)
    try {
      const result = await metadataSyncPromise
      logActivity(db, 'metadata_update', null, {
        message: `Library metadata sync complete · ${result.metadataUpdated || 0} titles updated`,
        candidates: result.candidates,
        metadataUpdated: result.metadataUpdated,
        matched: result.matched,
        skipped: result.skipped,
        failed: result.failed,
      })
      mainWindow?.webContents.send('artwork:updated', result)
      return result
    } finally {
      metadataSyncPromise = null
      metadataSyncController = null
    }
  })
  ipcMain.handle('scraper:generateAutomaticFallbacks', async () => {
    const result = await generateAutomaticFallbacks(db, app.getPath('userData'), sendArtworkProgress)
    logActivity(db, 'artwork_update', null, {
      message: `Automatic fallback artwork generated · ${result.fallbackCovers || 0} covers, ${result.fallbackHeroes || 0} heroes`,
      candidates: result.candidates,
      fallbackCovers: result.fallbackCovers,
      fallbackHeroes: result.fallbackHeroes,
    })
    return result
  })
  ipcMain.handle('scraper:testIgdb', async (_event, clientId, clientSecret) => {
    const settings = getLibrarySettings(db) || {}
    const id = clientId || settings.igdbClientId || ''
    const secret = clientSecret || settings.igdbClientSecret || ''
    return testIgdbConnection(id, secret)
  })
  ipcMain.handle('scraper:fetchGameMetadata', async (_event, gameId) => {
    if (typeof gameId !== 'string' || !gameId.trim()) throw new Error('Invalid game ID.')
    return fetchGameMetadata(db, gameId.trim())
  })
  ipcMain.handle('artwork:refetchSelected', async (_event, gameIds, apiKey) => {
    if (!Array.isArray(gameIds) || gameIds.length < 1 || gameIds.length > 500 || (apiKey !== undefined && (typeof apiKey !== 'string' || apiKey.length > 300))) {
      throw new Error('Invalid bulk artwork refetch request.')
    }
    const result = await refetchSelectedArtwork(db, app.getPath('userData'), gameIds, resolveArtworkKey(apiKey), sendArtworkProgress)
    logActivity(db, 'artwork_update', null, {
      message: `Artwork refetched for ${gameIds.length} selected titles`,
      gameCount: gameIds.length,
      updated: result.updated,
    })
    mainWindow?.webContents.send('artwork:updated', result)
    return result
  })
  ipcMain.handle('artwork:refetchExact', async (_event, gameId, exactId, apiKey) => {
    if (typeof gameId !== 'string' || gameId.length < 1 || gameId.length > 120 || typeof exactId !== 'string' || exactId.length < 1 || exactId.length > 80 || (apiKey !== undefined && (typeof apiKey !== 'string' || apiKey.length > 300))) {
      throw new Error('Invalid artwork refetch request.')
    }
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId)
    if (!game) throw new Error('The selected game could not be found.')
    const resolvedKey = resolveArtworkKey(apiKey)
    if (apiKey && typeof apiKey === 'string' && apiKey.trim().length >= 8) {
      try { setLibrarySettings(db, { steamGridDbApiKey: apiKey.trim() }) } catch {}
    }
    const updated = await refetchArtworkByExactId(
      db,
      app.getPath('userData'),
      { ...game, sources: db.prepare('SELECT platform, platform_game_id AS platformGameId FROM game_sources WHERE game_id = ?').all(gameId) },
      exactId,
      resolvedKey
    )
    mainWindow?.webContents.send('artwork:updated', updated)
    return updated
  })
  ipcMain.handle('artwork:chooseAndSave', async (_event, gameId, kind) => {
    if (typeof gameId !== 'string' || gameId.length > 120 || !['cover', 'hero'].includes(kind)) {
      throw new Error('Invalid artwork upload request.')
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: kind === 'hero' ? 'Choose hero banner' : 'Choose poster cover',
      properties: ['openFile'],
      filters: [{ name: 'Artwork', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    })
    if (result.canceled) return null
    const updated = await copyArtworkOverride(db, app.getPath('userData'), gameId, result.filePaths[0], kind)
    mainWindow?.webContents.send('artwork:updated', updated)
    return updated
  })
  ipcMain.handle('artwork:chooseOverride', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose artwork',
      properties: ['openFile'],
      filters: [{ name: 'Artwork', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  const selectCustomArtwork = async (_event, gameId) => {
    if (typeof gameId !== 'string' || gameId.length > 120) throw new Error('Invalid game selection.')
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Change artwork',
      properties: ['openFile'],
      filters: [{ name: 'Artwork', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    })
    if (result.canceled) return null
    const updated = await copyManualArtwork(db, app.getPath('userData'), gameId, result.filePaths[0])
    mainWindow?.webContents.send('artwork:updated', updated)
    return updated
  }
  ipcMain.handle('selectCustomArtwork', selectCustomArtwork)
  ipcMain.handle('artwork:change', selectCustomArtwork)

  ipcMain.handle('game:chooseExecutable', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose game executable',
      properties: ['openFile'],
      filters: [{ name: 'Windows executables', extensions: ['exe'] }],
    })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('game:addCustomGame', async (_event, targetPath) => {
    if (typeof targetPath !== 'string' || !path.isAbsolute(targetPath)) {
      throw new Error('Please select a valid executable or game folder.')
    }
    let executablePath = targetPath
    if (!fs.existsSync(executablePath)) {
      throw new Error('The selected path could not be found.')
    }

    // Resolve shortcut if .lnk
    if (path.extname(executablePath).toLowerCase() === '.lnk') {
      try {
        const linkTarget = shell.readShortcutLink(executablePath).target
        if (linkTarget && fs.existsSync(linkTarget)) {
          executablePath = linkTarget
        }
      } catch (err) {
        console.warn('[CustomGame] Could not resolve shortcut link:', err.message)
      }
    }

    // Resolve executable if folder
    if (fs.statSync(executablePath).isDirectory()) {
      const findExe = (dir, depth = 0) => {
        if (depth > 2) return null
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        const exes = []
        for (const entry of entries) {
          if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.exe') {
            const lower = entry.name.toLowerCase()
            if (!lower.includes('unins') && !lower.includes('crash') && !lower.includes('setup') && !lower.includes('update') && !lower.includes('redist')) {
              exes.push(path.join(dir, entry.name))
            }
          }
        }
        if (exes.length > 0) return exes[0]
        for (const entry of entries) {
          if (entry.isDirectory() && !['temp', 'redist', '_redist', 'directx'].includes(entry.name.toLowerCase())) {
            const found = findExe(path.join(dir, entry.name), depth + 1)
            if (found) return found
          }
        }
        return null
      }
      const foundExe = findExe(executablePath)
      if (foundExe) {
        executablePath = foundExe
      } else {
        throw new Error('No game executable (.exe) found inside the dropped folder.')
      }
    }

    if (path.extname(executablePath).toLowerCase() !== '.exe') {
      throw new Error('Please select a valid .exe game file or shortcut.')
    }

    let fileName = path.basename(executablePath, '.exe')
    if (['game', 'launcher', 'launch', 'start', 'play', 'main', 'shipping'].some(g => fileName.toLowerCase().includes(g))) {
      fileName = path.basename(path.dirname(executablePath))
    }
    const cleanTitle = fileName
      .replace(/[._-]/g, ' ')
      .replace(/\s*v\d+(\.\d+)*\s*/gi, '')
      .replace(/\s*build\s*\d+\s*/gi, '')
      .replace(/\s*(repack|setup|patch|update|crack|fitgirl|dodi|portable)\s*/gi, '')
      .trim() || fileName

    const installPath = path.dirname(executablePath)
    const record = {
      canonicalTitle: cleanTitle,
      normalizedTitle: cleanTitle.toLowerCase(),
      storeName: 'Custom',
      executablePath,
      installPath,
      isInstalled: 1,
      platform: 'custom',
      driveLetter: path.parse(executablePath).root.replace(/[:\\/]/g, '').toUpperCase() || 'C',
    }
    const { mergeRecord } = require('../src/main/services/deduplicationService.cjs')
    const game = mergeRecord(db, record)
    logActivity(db, 'custom_game_added', game.id, {
      title: game.canonical_title,
      executablePath,
    })
    mainWindow?.webContents.send('library:updated', { type: 'custom-game-added', gameId: game.id })

    // Kick off background HLTB
    try {
      const { fetchAndSaveHltb } = require('../src/main/services/hltbService.cjs')
      fetchAndSaveHltb(db, game.id, game.canonical_title).then((updated) => {
        if (updated) {
          mainWindow?.webContents.send('library:updated', { type: 'hltb-updated', gameId: game.id })
        }
      }).catch(() => {})
    } catch {}

    return game
  })

  ipcMain.handle('game:fetchHltb', async (_event, gameId, title) => {
    if (!gameId || !title) return null
    try {
      const { fetchAndSaveHltb } = require('../src/main/services/hltbService.cjs')
      return await fetchAndSaveHltb(db, gameId, title)
    } catch (err) {
      console.warn('[Main] game:fetchHltb failed:', err.message)
      return null
    }
  })

  let hltbSyncCancelled = false

  ipcMain.handle('library:cancelHltbSync', () => {
    hltbSyncCancelled = true
    return { success: true }
  })

  ipcMain.handle('library:syncHltb', async (_event, options = {}) => {
    try {
      const { fetchAndSaveHltb } = require('../src/main/services/hltbService.cjs')
      hltbSyncCancelled = false
      const forceAll = Boolean(options?.forceAll)

      // Query non-utility, non-DLC games: all games if forceAll, or unhydrated/failed (hltb_id IS NULL or <= 0)
      const query = forceAll
        ? 'SELECT id, canonical_title FROM games WHERE is_utility = 0 AND is_dlc = 0 ORDER BY canonical_title ASC'
        : 'SELECT id, canonical_title FROM games WHERE (hltb_id IS NULL OR hltb_id <= 0) AND is_utility = 0 AND is_dlc = 0 ORDER BY canonical_title ASC'

      const targets = db.prepare(query).all()
      const total = targets.length
      let count = 0
      let processed = 0

      for (const g of targets) {
        if (hltbSyncCancelled) break
        processed++
        try {
          mainWindow?.webContents.send('hltb:progress', {
            current: processed,
            total,
            synced: count,
            gameTitle: g.canonical_title,
          })
        } catch {}

        try {
          const res = await fetchAndSaveHltb(db, g.id, g.canonical_title)
          if (res && res.hltb_main_hours > 0) count++
          // polite rate-limiting between HLTB calls
          await new Promise(r => setTimeout(r, 450))
        } catch {}
      }

      mainWindow?.webContents.send('library:updated', { type: 'hltb-batch-synced', count })
      return { success: true, synced: count, total, processed, cancelled: hltbSyncCancelled }
    } catch (err) {
      console.warn('[Main] library:syncHltb failed:', err.message)
      return { success: false, error: err.message }
    }
  })
  ipcMain.handle('game:launchExecutable', async (_event, executablePath, launchArguments = '', launchMeta = {}) => {
    const targetExe = resolvePortablePath(executablePath)
    if (typeof targetExe !== 'string' || !path.isAbsolute(targetExe) || path.extname(targetExe).toLowerCase() !== '.exe') {
      throw new Error('Invalid executable path.')
    }
    if (!fs.existsSync(targetExe) || !fs.statSync(targetExe).isFile()) {
      throw new Error('The mapped executable could not be found.')
    }
    if (typeof launchArguments !== 'string' || launchArguments.length > 4000) {
      throw new Error('Invalid launch arguments.')
    }

    let finalLaunchArguments = launchArguments || ''
    const gameId = launchMeta?.gameId || (Number.isInteger(launchMeta?.id) ? launchMeta.id : null)
    if (gameId && db) {
      try {
        const gameRow = db.prepare('SELECT active_mod_profile FROM games WHERE id = ?').get(String(gameId))
        if (gameRow?.active_mod_profile && typeof gameRow.active_mod_profile === 'string' && gameRow.active_mod_profile.trim()) {
          const modArgs = gameRow.active_mod_profile.trim()
          finalLaunchArguments = finalLaunchArguments ? `${finalLaunchArguments} ${modArgs}` : modArgs
        }
      } catch {}
    }

    const args = [...finalLaunchArguments.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^']*)'|([^\s]+)/g)].map((match) => match[1] ?? match[2] ?? match[3]).filter(Boolean)
    return new Promise((resolve, reject) => {
      const child = spawn(targetExe, args, { cwd: path.dirname(targetExe), detached: true, stdio: 'ignore', windowsHide: false })
      child.once('error', (error) => reject(new Error(error.message || 'The mapped executable could not be launched.')))
      child.once('spawn', () => {
        child.unref()
        try { unloadEngine() } catch {}
        try {
          const gameId = launchMeta?.gameId || (Number.isInteger(launchMeta?.id) ? launchMeta.id : null)
          const title = launchMeta?.title || path.basename(targetExe, '.exe')
          logActivity(db, 'game_launch', gameId, {
            title,
            executablePath: targetExe,
            method: 'executable'
          })
          startTrackingGameSession(gameId, title, targetExe, null)
        } catch (logErr) {
          console.error('[ActivityLog] Failed to log executable launch:', logErr)
        }
        resolve(true)
      })
    })
  })
  ipcMain.handle('game:updateModProfile', async (_event, gameId, activeModProfile) => {
    return updateGameModProfile(db, gameId, activeModProfile)
  })
  ipcMain.handle('game:updateCheckpointNote', async (_event, gameId, note) => {
    return updateCheckpointNote(db, gameId, note)
  })
  ipcMain.handle('game:logAttempt', (_event, launchMeta = {}) => {
    const meta = launchMeta && typeof launchMeta === 'object' && !Array.isArray(launchMeta) ? launchMeta : {}
    logLaunchAttempt({ uri: meta.uri, storefront: meta.storefront, id: meta.id, idSource: meta.idSource, result: meta.result || 'renderer-missing-fallback', error: meta.error })
    return true
  })
  ipcMain.handle('game:openUri', async (_event, uri, launchMeta = {}) => {
    const allowedSchemes = /^(https?|steam|com\.epicgames\.launcher|goggalaxy|origin2|origin|ea|ubisoft|uplay|xbox|ms-xbl|ms-windows-store|amazon-games|itch|battle-net|battlenet|riotclient):\/\//i
    const meta = launchMeta && typeof launchMeta === 'object' && !Array.isArray(launchMeta) ? launchMeta : {}
    const details = { uri, storefront: meta.storefront, id: meta.id, idSource: meta.idSource }
    const steamMatch = typeof uri === 'string' ? uri.match(/^steam:\/\/rungameid\/([^/?#]+)$/i) : null
    if (typeof uri === 'string' && /^steam:\/\//i.test(uri) && (!steamMatch || !/^\d+$/.test(steamMatch[1]) || Number(steamMatch[1]) <= 0 || steamMatch[1] === '7' || /^(?:text|title)[-_ ]?fallback$/i.test(steamMatch[1]))) {
      logLaunchAttempt({ ...details, result: 'invalid-steam-appid', error: 'Invalid Steam configuration / missing AppID' })
      throw new Error('Invalid Steam configuration / missing AppID')
    }
    if (typeof uri !== 'string' || !allowedSchemes.test(uri)) {
      logLaunchAttempt({ ...details, result: 'unsupported-protocol', error: 'Unsupported launcher protocol.' })
      throw new Error('Unsupported launcher protocol.')
    }
    try {
      await shell.openExternal(uri)
      try { unloadEngine() } catch {}
      logLaunchAttempt({ ...details, result: 'resolved' })
      try {
        const gameId = meta.gameId || (Number.isInteger(meta.id) ? meta.id : null)
        const title = meta.title || meta.name || 'Game'
        logActivity(db, 'game_launch', gameId, {
          title,
          uri,
          storefront: meta.storefront || null,
          method: 'protocol'
        })
        startTrackingGameSession(gameId, title, null, null)
      } catch (logErr) {
        console.error('[ActivityLog] Failed to log URI launch:', logErr)
      }
      return true
    } catch (error) {
      logLaunchAttempt({ ...details, result: 'os-rejected', error: error?.message || 'OS rejected launcher URI.' })
      throw new Error('OS rejected launcher URI.')
    }
  })

  ipcMain.handle('captures:getForGame', async (_event, gameId) => {
    if (!gameId || typeof gameId !== 'string') return []
    return getUserCaptures(db, gameId)
  })

  ipcMain.handle('captures:add', async (_event, gameId) => {
    if (!gameId || typeof gameId !== 'string') throw new Error('Invalid gameId.')
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select game screenshots to add',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }],
    })
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) return []

    const userCapturesDir = path.join(app.getPath('userData'), 'captures', gameId)
    if (!fs.existsSync(userCapturesDir)) {
      fs.mkdirSync(userCapturesDir, { recursive: true })
    }

    const added = []
    for (const srcPath of result.filePaths) {
      try {
        const ext = path.extname(srcPath) || '.png'
        const baseName = `capture_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`
        const destPath = path.join(userCapturesDir, baseName)
        fs.copyFileSync(srcPath, destPath)
        const row = addUserCapture(db, gameId, destPath, path.basename(srcPath, ext))
        if (row) added.push(row)
      } catch (err) {
        console.warn('[Captures] Failed to copy/save capture:', err?.message)
      }
    }
    return added
  })

  ipcMain.handle('captures:delete', async (_event, captureId) => {
    if (!captureId) throw new Error('Invalid captureId')
    const capture = db.prepare('SELECT * FROM user_captures WHERE id = ?').get(captureId)
    if (capture?.file_path && fs.existsSync(capture.file_path)) {
      try { fs.unlinkSync(capture.file_path) } catch {}
    }
    deleteUserCapture(db, captureId)
    return true
  })
  ipcMain.handle('overlay:setSelectedGame', (_event, game) => {
    if (game?.id && game?.title) {
      lastFocusedGame = { id: game.id, title: game.title };
    } else {
      lastFocusedGame = { id: null, title: '' };
    }
    return true;
  });

  ipcMain.handle('overlay:getActiveGame', async () => {
    const isUtilityApp = (t) => /wallpaper engine|soundpad|steam|epic games|ea app|ubisoft connect|discord|obs|lossless scaling|occt/i.test(t || '');

    // 1. Check currently active game sessions (even before 4-second confirmation poll)
    for (const [_id, session] of activeGameSessions.entries()) {
      if (!isUtilityApp(session.title)) {
        return { title: session.title, gameId: session.gameId, isPlaying: true };
      }
    }

    // 2. Check running Windows processes against installed games in database
    if (db) {
      try {
        const running = await getRunningProcessNames();
        if (running && running.size > 0) {
          const installedGames = db.prepare('SELECT id, canonical_title, executable_path, install_path FROM games WHERE is_installed = 1 AND is_utility = 0').all();
          for (const g of installedGames) {
            if (g.executable_path) {
              const exeName = path.basename(g.executable_path).toLowerCase();
              if (running.has(exeName)) {
                return { title: g.canonical_title, gameId: g.id, isPlaying: true };
              }
            }
            if (g.install_path) {
              const candidateExes = findGameExecutables(g.install_path);
              for (const exe of candidateExes) {
                if (running.has(exe)) {
                  return { title: g.canonical_title, gameId: g.id, isPlaying: true };
                }
              }
            }
          }
        }
      } catch {
      }
    }

    // 3. Fall back to the game currently open in Logpile game details view
    if (lastFocusedGame?.title) {
      return { title: lastFocusedGame.title, gameId: lastFocusedGame.id, isPlaying: false };
    }

    return { title: '', gameId: null, isPlaying: false };
  });

  ipcMain.handle('overlay:hide', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.hide();
    }
  });

  ipcMain.handle('overlay:openUrl', (_event, url) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url);
      if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
    }
  });

  ipcMain.handle('ai:getStatus', () => getModelStatus(app));
  ipcMain.handle('ai:askQuestion', async (_event, userPrompt, activeGameTitle, options = {}) => {
    let libraryContext = null;
    const isUtility = (t) => !t || /wallpaper engine|soundpad|steam|epic games|ea app|ubisoft connect|discord|obs|lossless scaling|occt/i.test(t);
    const cleanActiveTitle = isUtility(activeGameTitle) ? '' : activeGameTitle;
    let targetTitle = cleanActiveTitle;

    if (db) {
      try {
        const stats = getLibraryStats(db);

        // Detect if user mentions a specific game entity in prompt (prioritize mentioned game over UI-focused game)
        const mentionedGame = findGameEntityInText(db, userPrompt);
        if (mentionedGame?.canonical_title) {
          targetTitle = mentionedGame.canonical_title;
        }

        // Check if prompt explicitly mentions a game title even if not in DB
        if (!targetTitle) {
          const mentionMatch = (userPrompt || '').match(/\b(?:play|playing|planing to play|planning to play|in|for|on|about)\s+([a-zA-Z0-9\s:''-]+?)(?:\s+(?:and|how|where|what|why|who|stuck|i|can|to|dont|don't|do|guide|walkthrough)|\?|$)/i);
          if (mentionMatch && mentionMatch[1]?.trim()) {
            targetTitle = mentionMatch[1].trim();
          }
        }

        // Fall back to active playing session or last selected game if not specified
        if (!targetTitle) {
          for (const [_id, session] of activeGameSessions.entries()) {
            if (!isUtility(session.title)) {
              targetTitle = session.title;
              break;
            }
          }
        }
        if (!targetTitle && lastFocusedGame?.title) {
          targetTitle = lastFocusedGame.title;
        }
        // Never silently fall back to a random recent game if user is asking a question
        const isQuestion = /\?/.test(userPrompt) || /\b(?:how|where|what|why|who|when|which|stuck|guide|help|walkthrough|solve|beat|defeat|kill|find|locate|get out|gwet out|pass|progress|puzzle|boss|mission|quest|tip|tips|advice|fuck|do here|need to do)\b/i.test(userPrompt);
        if (!targetTitle && !isQuestion) {
          try {
            const recent = db.prepare('SELECT canonical_title FROM games WHERE is_utility = 0 AND last_played_time IS NOT NULL ORDER BY last_played_time DESC LIMIT 1').get();
            if (recent?.canonical_title) targetTitle = recent.canonical_title;
          } catch {}
        }

        // Fetch target game metadata if available (ignore utilities)
        let activeGameDetails = null;
        let guideNotes = '';
        if (targetTitle) {
          activeGameDetails = db.prepare(`
            SELECT id, canonical_title, genre, developer, publisher, release_date, description, play_time_seconds
            FROM games
            WHERE (canonical_title = ? OR normalized_title = ?) AND is_utility = 0
            LIMIT 1
          `).get(targetTitle, targetTitle.toLowerCase().replace(/[^a-z0-9]/g, ''));

          if (activeGameDetails?.id) {
            try {
              const chunks = searchGameKnowledge(db, activeGameDetails.id, userPrompt, 3, activeGameDetails.canonical_title);
              if (chunks && chunks.length > 0) {
                const formattedChunks = chunks.map((c) => `[${c.section_title}]:\n${c.content}`).join('\n\n');
                guideNotes = `Game Guide Context for ${activeGameDetails.canonical_title}:\n${formattedChunks}\n\nUser Question: ${userPrompt.trim()}\n\nInstructions: Answer using the specific mechanics, items, and tactics described in the guide context above. Avoid generic filler advice. Ensure your response is concise (under 120 words) but always completes its final sentence cleanly. Do not leave thoughts unfinished.`;
              }
            } catch (ragErr) {
              console.warn('[Main] RAG guide search error:', ragErr.message);
            }
          }
        }

        libraryContext = {
          totalGames: stats?.visibleGames || 0,
          visibleGames: stats?.visibleGames || 0,
          readyToInstall: stats?.readyToInstallCount || 0,
          installedGamesCount: stats?.visibleInstalledGames || 0,
          dlcCount: stats?.dlcGames || 0,
          utilityCount: stats?.utilityTools || 0,
          totalDatabaseRecords: stats?.totalGames || 0,
          activeGame: activeGameDetails ? {
            id: activeGameDetails.id,
            title: activeGameDetails.canonical_title,
            genre: activeGameDetails.genre || '',
            developer: activeGameDetails.developer || '',
            publisher: activeGameDetails.publisher || '',
            releaseDate: activeGameDetails.release_date || '',
            hoursPlayed: Math.round(((activeGameDetails.play_time_seconds || 0) / 3600) * 10) / 10,
            summary: activeGameDetails.description ? activeGameDetails.description.slice(0, 220) : '',
          } : null,
          guideNotes,
        };
      } catch (err) {
        console.warn('[AI] Error preparing library context:', err?.message);
      }
    }
    return askGamingAssistant(app, userPrompt, targetTitle, libraryContext, { ...options, db });
  });
  ipcMain.handle('ai:getRecommendation', async (_event, userPreferencePrompt, options = {}) => {
    const installed = db ? db.prepare("SELECT id, canonical_title, genre FROM games WHERE is_installed = 1 AND is_utility = 0 LIMIT 150").all() : [];
    return recommendFromLibrary(app, userPreferencePrompt, installed, options);
  });
  ipcMain.handle('ai:unload', () => {
    unloadEngine();
    return true;
  });
  ipcMain.handle('ai:openFolder', async () => {
    const modelsDir = getModelsDirectory(app);
    try {
      if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
      }
      await shell.openPath(modelsDir);
      return true;
    } catch (err) {
      console.warn('[AI] Failed to open models folder:', err?.message);
      return false;
    }
  });
  ipcMain.handle('ai:parseFilter', async (_event, text) => {
    return await parseLibraryFilterIntent(text, { app });
  });

  ipcMain.handle('guides:scan', () => {
    return scanAndImportGuides(db, app);
  });
  ipcMain.handle('guides:hasGuide', (_event, gameId) => {
    return hasGuide(db, gameId);
  });
  ipcMain.handle('guides:search', (_event, gameId, query) => {
    return searchGameKnowledge(db, gameId, query, 3);
  });
  ipcMain.handle('guides:downloadForGame', async (_event, gameId, title) => {
    try {
      const { downloadGuideForGame } = require('../src/main/services/guideDownloaderService.cjs');
      return await downloadGuideForGame(app, db, gameId, title);
    } catch (err) {
      console.error('[GuideDownloader] downloadForGame error:', err);
      return { success: false, error: err.message };
    }
  });
  let activeGuideSync = {
    running: false,
    progress: null,
  };

  function broadcastGuideProgress(payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.send('guides:batch-progress', payload);
      } catch {}
    }
  }

  ipcMain.handle('guides:getStatus', () => activeGuideSync);

  ipcMain.handle('guides:downloadBatch', async (_event, options = {}) => {
    if (activeGuideSync.running) {
      return { success: false, error: 'Guide sync is already in progress' };
    }
    activeGuideSync.running = true;
    activeGuideSync.progress = null;
    broadcastGuideProgress({ running: true, progress: null });

    try {
      const { downloadGuidesBatch } = require('../src/main/services/guideDownloaderService.cjs');
      const res = await downloadGuidesBatch(app, db, options, (progress) => {
        activeGuideSync.progress = progress;
        broadcastGuideProgress({ running: true, progress });
      });
      return res;
    } catch (err) {
      console.error('[GuideDownloader] downloadBatch error:', err);
      return { success: false, error: err.message };
    } finally {
      activeGuideSync.running = false;
      activeGuideSync.progress = null;
      broadcastGuideProgress({ running: false, progress: null });
    }
  });

  ipcMain.handle('guides:cancelBatch', () => {
    const { cancelGuideBatch } = require('../src/main/services/guideDownloaderService.cjs');
    const res = cancelGuideBatch();
    activeGuideSync.running = false;
    activeGuideSync.progress = null;
    broadcastGuideProgress({ running: false, progress: null });
    return res;
  });

  voiceService.on('recognized', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { mainWindow.webContents.send('voice:recognized', data); } catch {}
    }
  });

  voiceService.on('stateChange', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { mainWindow.webContents.send('voice:stateChange', data); } catch {}
    }
  });

  ipcMain.handle('voice:start', (_event, options) => voiceService.start(options));
  ipcMain.handle('voice:stop', () => voiceService.stop());
  ipcMain.handle('voice:setWakeWord', (_event, enabled) => voiceService.setWakeWord(enabled));
  ipcMain.handle('voice:getStatus', () => voiceService.getStatus());
}


const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.ico', '.webm', '.mp4'])

let cachedAllowedRoots = []
let lastRootsComputedAt = 0
const ROOTS_CACHE_TTL_MS = 30000

function getAllowedArtworkRoots(userDataPath, appPath, database) {
  const now = Date.now()
  if (cachedAllowedRoots.length > 0 && (now - lastRootsComputedAt < ROOTS_CACHE_TTL_MS)) {
    return cachedAllowedRoots
  }

  const roots = new Set()

  if (userDataPath) {
    roots.add(path.join(userDataPath, 'artwork_database'))
    roots.add(path.join(userDataPath, 'artwork'))
    roots.add(path.join(userDataPath, 'art_cache'))
    roots.add(path.join(userDataPath, 'artwork_cache'))
    roots.add(path.join(userDataPath, 'captures'))
  }

  const legacyAppData = path.join(process.env.APPDATA || '', 'logpile')
  if (legacyAppData) {
    roots.add(path.join(legacyAppData, 'artwork_database'))
    roots.add(path.join(legacyAppData, 'art_cache'))
  }

  if (appPath) {
    roots.add(appPath)
  }
  if (process.resourcesPath) {
    roots.add(process.resourcesPath)
  }

  if (database) {
    try {
      const rows = database.prepare("SELECT DISTINCT install_path FROM games WHERE install_path IS NOT NULL AND TRIM(install_path) != ''").all()
      for (const row of rows) {
        if (row.install_path) roots.add(row.install_path)
      }
    } catch {}
  }

  const resolved = []
  for (const root of roots) {
    try {
      if (path.parse(root).root === root) {
        continue
      }
      if (fs.existsSync(root)) {
        const real = fs.realpathSync(root)
        if (path.parse(real).root !== real) {
          resolved.push(real)
        }
      }
    } catch {}
  }
  cachedAllowedRoots = resolved
  lastRootsComputedAt = now
  return resolved
}

app.whenReady().then(() => {
  const artworkDir = path.join(app.getPath('userData'), 'artwork_database')
  if (!fs.existsSync(artworkDir)) {
    try { fs.mkdirSync(artworkDir, { recursive: true }) } catch {}
  }
  try {
    const { migrateLegacyArtwork } = require('../src/main/services/artworkService.cjs')
    migrateLegacyArtwork(app.getPath('userData'))
  } catch (migErr) {
    console.warn('[App] Artwork migration notice:', migErr?.message)
  }

  protocol.handle('local-file', async (request) => {
    try {
      const parsedUrl = new URL(request.url)
      let diskPath = ''

      if (process.platform === 'win32') {
        if (/^[a-zA-Z]$/.test(parsedUrl.host)) {
          diskPath = `${parsedUrl.host.toUpperCase()}:${decodeURIComponent(parsedUrl.pathname)}`
        } else if (/^[a-zA-Z]:/.test(parsedUrl.pathname.replace(/^\/+/, ''))) {
          diskPath = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''))
        } else {
          const raw = decodeURIComponent(request.url.replace(/^local-file:\/\//i, ''))
          diskPath = raw.replace(/^\/+([a-zA-Z]:)/, '$1')
        }
      } else {
        diskPath = decodeURIComponent(parsedUrl.pathname)
      }

      const normalizedDiskPath = path.normalize(diskPath)

      // 1. Block UNC paths (starting with \\ or //)
      if (normalizedDiskPath.startsWith('\\\\') || normalizedDiskPath.startsWith('//') || (process.platform === 'win32' && /^[\\/]{2}/.test(diskPath))) {
        return new Response('Access denied: UNC paths not permitted', { status: 403, statusText: 'Forbidden' })
      }

      // 2. Extension whitelist: return 403 for disallowed extensions
      const ext = path.extname(normalizedDiskPath).toLowerCase()
      if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        return new Response('Access denied: Forbidden file type', { status: 403, statusText: 'Forbidden' })
      }

      // 3. Missing file: return 404
      if (!fs.existsSync(normalizedDiskPath)) {
        return new Response('Artwork file not found', { status: 404, statusText: 'Not Found' })
      }

      // 4. Resolve real path with fs.realpathSync
      let realDiskPath
      try {
        realDiskPath = fs.realpathSync(normalizedDiskPath)
      } catch {
        return new Response('Artwork file not found', { status: 404, statusText: 'Not Found' })
      }

      if (!fs.statSync(realDiskPath).isFile()) {
        return new Response('Artwork file not found', { status: 404, statusText: 'Not Found' })
      }

      // 5. Allowed root containment check using path.relative()
      const allowedRoots = getAllowedArtworkRoots(app.getPath('userData'), app.getAppPath(), db)
      const isContained = allowedRoots.some((root) => {
        const rel = path.relative(root, realDiskPath)
        return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
      })

      if (!isContained) {
        return new Response('Access denied: Path outside allowed directories', { status: 403, statusText: 'Forbidden' })
      }

      const response = await net.fetch(pathToFileURL(realDiskPath).href)
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (error) {
      return new Response('Internal error loading artwork', { status: 500 })
    }
  })

  if (process.platform === 'win32') app.setAppUserModelId('com.logpile.library')
  db = createDatabase(path.join(app.getPath('userData'), 'logpile.db'))
  try {
    const { relinkAllLocalArtwork } = require('../src/main/services/artworkService.cjs')
    relinkAllLocalArtwork(db, app.getPath('userData'))
  } catch (migErr) {
    console.warn('[App] Artwork relink notice:', migErr?.message)
  }
  repairBrokenArtworkLinks(db, app.getPath('userData'))
  try {
    scanAndImportGuides(db, app)
    startGuideWatcher(db, app)
  } catch (gErr) {
    console.warn('[Guides] Initial scan notice:', gErr?.message)
  }
  registerIpc()
  createWindow()
  createOverlayWindow()
  try {
    globalShortcut.register('CommandOrControl+Space', () => {
      toggleOverlay()
    })
  } catch {}
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  const settings = db ? (getLibrarySettings(db) || {}) : {}
  if (settings.minimizeToTray && !app.isQuitting) {
    return
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  app.isQuitting = true
  try { globalShortcut.unregisterAll() } catch {}
  try { stopSteamFamilyWatcher() } catch {}
  try { voiceService.stop() } catch {}
  flushAllActiveSessions()
  unloadEngine()
  if (db) db.close()
})