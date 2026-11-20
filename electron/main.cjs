const { app, BrowserWindow, ipcMain, shell, dialog, protocol, net, clipboard, nativeImage, Tray, Menu, MenuItem, globalShortcut, screen } = require('electron')
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

// Prevent background throttling so transparent HUD animations remain smooth at 60/144 FPS when games have focus
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
// Cap compositor frame rate to 60 FPS to eliminate redundant DWM composition wakeups on 144Hz/200Hz+ panels (under 1% GPU overhead)
app.commandLine.appendSwitch('limit-fps', '60');

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
  setCustomModelPath,
  getCustomModelPath,
  setExecutionMode,
  getExecutionMode,
  generateHudThemeDesign,
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
const { getConnectedGamepads } = require('../src/main/services/gamepadService.cjs')
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

const IGNORED_EXE_SUBSTRINGS = ['crash', 'unins', 'setup', 'redist', 'unitycrash', 'installer', 'autorun', '7za', 'directx', 'vcredist', 'dxwebsetup'];
const IGNORED_EXE_NAMES = new Set([
  'steam.exe', 'steamwebhelper.exe', 'steamservice.exe', 'gameoverlayui.exe',
  'epicgameslauncher.exe', 'epicwebhelper.exe',
  'galaxyclient.exe', 'galaxyclientservice.exe',
  'origin.exe', 'originwebhelperservice.exe', 'eaconnect_interop.exe', 'eadp.exe', 'ealauncher.exe', 'eadesktop.exe',
  'ubisoftconnect.exe', 'upc.exe', 'uplay.exe', 'uplaywebcore.exe',
  'battle.net.exe', 'agent.exe',
  'riotclientservices.exe', 'riotclientux.exe',
  'gog.com.galaxy.client.exe',
  'electron.exe', 'logpile.exe', 'node.exe', 'cmd.exe', 'powershell.exe', 'tasklist.exe',
  'explorer.exe', 'svchost.exe', 'dwm.exe', 'runtimebroker.exe'
]);
const BINARY_SUBDIRS = new Set(['bin', 'binaries', 'win64', 'x64', 'win32', 'x86', 'retail', 'shipping', 'game', 'engine', 'content']);

function isCleanGameExe(name) {
  const lower = name.toLowerCase();
  if (!lower.endsWith('.exe')) return false;
  if (IGNORED_EXE_NAMES.has(lower)) return false;
  for (const ign of IGNORED_EXE_SUBSTRINGS) {
    if (lower.includes(ign)) return false;
  }
  return true;
}

function findGameExecutables(installPath) {
  const exeNames = new Set();
  if (!installPath || typeof installPath !== 'string' || !fs.existsSync(installPath)) return exeNames;
  try {
    const entries = fs.readdirSync(installPath, { withFileTypes: true });
    const subdirsToCheck = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        if (isCleanGameExe(entry.name)) exeNames.add(entry.name.toLowerCase());
      } else if (entry.isDirectory()) {
        const subName = entry.name.toLowerCase();
        if (BINARY_SUBDIRS.has(subName)) {
          subdirsToCheck.push(path.join(installPath, entry.name));
        }
      }
    }

    for (const sdir of subdirsToCheck) {
      try {
        const subEntries = fs.readdirSync(sdir, { withFileTypes: true });
        for (const s of subEntries) {
          if (s.isFile()) {
            if (isCleanGameExe(s.name)) exeNames.add(s.name.toLowerCase());
          } else if (s.isDirectory() && ['win64', 'x64', 'win32', 'x86', 'retail', 'shipping'].includes(s.name.toLowerCase())) {
            try {
              const sub2 = fs.readdirSync(path.join(sdir, s.name), { withFileTypes: true });
              for (const s2 of sub2) {
                if (s2.isFile() && isCleanGameExe(s2.name)) {
                  exeNames.add(s2.name.toLowerCase());
                }
              }
            } catch {}
          }
        }
      } catch {}
    }
  } catch {}
  return exeNames;
}

let cachedProcessNames = null;
let lastProcessCheckTime = 0;

function getRunningProcessNames(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedProcessNames && (now - lastProcessCheckTime < 5000)) {
    return Promise.resolve(cachedProcessNames);
  }
  return new Promise((resolve) => {
    execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true }, (err, stdout) => {
      if (err || !stdout) return resolve(cachedProcessNames || new Set());
      const set = new Set();
      const lines = stdout.split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.match(/^"([^"]+)"/);
        if (match) set.add(match[1].toLowerCase());
      }
      cachedProcessNames = set;
      lastProcessCheckTime = now;
      resolve(set);
    });
  });
}

// -----------------------------------------------------------------------------
// INTEL PRESENTMON ETW TELEMETRY MANAGER (MIT License)
// -----------------------------------------------------------------------------
let presentMonProcess = null;
let presentMonRollingFrames = [];
let lastPresentMonIpcTime = 0;

function getPresentMonExecutablePath() {
  const unpackedPath = path.join(__dirname, 'bin', 'PresentMon-x64.exe').replace('app.asar', 'app.asar.unpacked');
  if (fs.existsSync(unpackedPath)) return unpackedPath;
  const directPath = path.join(__dirname, 'bin', 'PresentMon-x64.exe');
  if (fs.existsSync(directPath)) return directPath;
  return null;
}

function startPresentMonForGame(targetExe) {
  stopPresentMon();
  const exePath = getPresentMonExecutablePath();
  if (!exePath) {
    console.warn('[PresentMon] Executable not found at:', exePath);
    return;
  }
  const cleanExeName = path.basename(targetExe);
  try {
    const args = [
      '--process_name', cleanExeName,
      '--output_stdout',
      '--no_console_stats',
      '--v1_metrics'
    ];
    presentMonProcess = spawn(exePath, args, { windowsHide: true });
    hardwareTelemetry.isEtwActive = true;
    presentMonRollingFrames = [];

    let buffer = '';
    let headerMap = null;

    presentMonProcess.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop(); // keep partial trailing line

      for (const line of lines) {
        if (!line.trim()) continue;
        const cols = line.split(',');
        if (!headerMap) {
          headerMap = {};
          cols.forEach((col, idx) => {
            headerMap[col.trim()] = idx;
          });
          continue;
        }

        const msBetweenIdx = headerMap['MsBetweenPresents'] !== undefined ? headerMap['MsBetweenPresents'] : headerMap['FrameTime'];
        const msRenderIdx = headerMap['MsUntilRenderComplete'] !== undefined ? headerMap['MsUntilRenderComplete'] : headerMap['GPUBusy'];

        if (msBetweenIdx !== undefined && cols[msBetweenIdx]) {
          const frameTimeMs = parseFloat(cols[msBetweenIdx]);
          if (!isNaN(frameTimeMs) && frameTimeMs > 0 && frameTimeMs < 1000) {
            const currentFps = Math.round(1000 / frameTimeMs);
            hardwareTelemetry.fps = currentFps;
            hardwareTelemetry.frametime = Number(frameTimeMs.toFixed(1));

            presentMonRollingFrames.push(frameTimeMs);
            if (presentMonRollingFrames.length > 60) presentMonRollingFrames.shift();

            // Calculate 1% low from rolling 60 frames
            const sorted = [...presentMonRollingFrames].sort((a, b) => b - a);
            const slowest = sorted[0];
            if (slowest > 0) {
              hardwareTelemetry.onePercentLow = Math.max(1, Math.min(currentFps, Math.round(1000 / slowest)));
            }

            if (msRenderIdx !== undefined && cols[msRenderIdx]) {
              const renderMs = parseFloat(cols[msRenderIdx]);
              if (!isNaN(renderMs)) {
                hardwareTelemetry.gpuBusyMs = Number(renderMs.toFixed(1));
                hardwareTelemetry.isGpuBound = renderMs >= (frameTimeMs * 0.82);
              }
            }

            const now = Date.now();
            if (now - lastPresentMonIpcTime >= 100) {
              lastPresentMonIpcTime = now;
              if (hudWindow && !hudWindow.isDestroyed() && hudWindow.isVisible()) {
                hudWindow.webContents.send('hardware:telemetry-update', hardwareTelemetry);
              }
            }
          }
        }
      }
    });

    presentMonProcess.on('error', (err) => {
      console.warn('[PresentMon] Process error:', err?.message);
      hardwareTelemetry.isEtwActive = false;
    });

    presentMonProcess.on('exit', () => {
      hardwareTelemetry.isEtwActive = false;
      presentMonProcess = null;
    });
  } catch (err) {
    console.warn('[PresentMon] Failed to spawn:', err?.message);
    hardwareTelemetry.isEtwActive = false;
  }
}

function stopPresentMon() {
  if (presentMonProcess) {
    try {
      presentMonProcess.kill();
    } catch {}
    presentMonProcess = null;
  }
  hardwareTelemetry.isEtwActive = false;
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

  // Primary game executable for Intel PresentMon ETW tracking
  const primaryExe = Array.from(candidateExes).find((e) => !e.includes('crash') && !e.includes('helper') && !e.includes('report') && !e.includes('env') && !e.includes('8za')) || Array.from(candidateExes)[0];
  if (primaryExe) {
    startPresentMonForGame(primaryExe);
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
  isGameCurrentlyRunning = true;
  try {
    updateHudDisplayState();
  } catch {}

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
          checkIsAnyGameRunning().then((stillRunning) => {
            isGameCurrentlyRunning = stillRunning;
            updateHudDisplayState();
          }).catch(() => {});
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
  stopPresentMon();
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
  checkIsAnyGameRunning().then((stillRunning) => {
    isGameCurrentlyRunning = stillRunning;
    updateHudDisplayState();
  }).catch(() => {});
}

function flushAllActiveSessions() {
  stopPresentMon();
  for (const [_gameId, session] of activeGameSessions.entries()) {
    if (session.timer) clearInterval(session.timer);
    if (session.hasBeenDetected) {
      endGameSession(session);
    }
  }
  activeGameSessions.clear();
}


let overlayWindow = null;
let hudWindow = null;
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

function attachSpellcheckContextMenu(targetWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) return
  targetWindow.webContents.on('context-menu', (event, params) => {
    if (!params.isEditable && !params.misspelledWord) return

    const menu = new Menu()

    // 1. Spellcheck suggestions & dictionary
    if (params.misspelledWord) {
      if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
        for (const suggestion of params.dictionarySuggestions) {
          menu.append(
            new MenuItem({
              label: suggestion,
              click: () => targetWindow.webContents.replaceMisspelling(suggestion)
            })
          )
        }
      } else {
        menu.append(
          new MenuItem({
            label: 'No spelling suggestions',
            enabled: false
          })
        )
      }

      menu.append(
        new MenuItem({
          label: `Add "${params.misspelledWord}" to dictionary`,
          click: () => targetWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
        })
      )
      menu.append(new MenuItem({ type: 'separator' }))
    }

    // 2. Standard editing options (Undo/Redo, Cut/Copy/Paste)
    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'undo', label: 'Undo' }))
      menu.append(new MenuItem({ role: 'redo', label: 'Redo' }))
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ role: 'cut', label: 'Cut' }))
      menu.append(new MenuItem({ role: 'copy', label: 'Copy' }))
      menu.append(new MenuItem({ role: 'paste', label: 'Paste' }))
      menu.append(new MenuItem({ role: 'selectAll', label: 'Select All' }))
    }

    menu.popup({ window: targetWindow })
  })
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
      spellcheck: true,
    },
  });

  attachSpellcheckContextMenu(overlayWindow);

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

let isGameCurrentlyRunning = false;
let hudMonitorTimer = null;
let cachedGameExeNames = null;
let lastGameExeCacheTime = 0;

function getKnownGameExeSet() {
  const now = Date.now();
  if (cachedGameExeNames && (now - lastGameExeCacheTime < 300000)) {
    return cachedGameExeNames;
  }
  const set = new Set();
  if (db) {
    try {
      const installed = db.prepare('SELECT executable_path, install_path FROM games WHERE is_installed = 1 AND is_utility = 0').all();
      for (const g of installed) {
        if (g.executable_path) {
          const bName = path.basename(g.executable_path).toLowerCase();
          if (isCleanGameExe(bName)) set.add(bName);
        } else if (g.install_path) {
          try {
            const folderExes = findGameExecutables(g.install_path);
            for (const e of folderExes) {
              if (isCleanGameExe(e)) set.add(e.toLowerCase());
            }
          } catch {}
        }
      }
    } catch {}
  }
  cachedGameExeNames = set;
  lastGameExeCacheTime = now;
  return set;
}

async function checkIsAnyGameRunning() {
  // 1. Any active session launched through Logpile
  for (const [_id, session] of activeGameSessions.entries()) {
    if (session && !session.isEnded) return true;
  }

  // 2. Any installed game running anywhere in Windows (Steam, Epic, GOG, desktop, etc.)
  const knownExes = getKnownGameExeSet();
  if (knownExes.size > 0) {
    const running = await getRunningProcessNames();
    for (const exe of knownExes) {
      if (running.has(exe)) return true;
    }
  }

  return false;
}

function getHudWindowBounds(position, orientation = 'horizontal') {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width: screenWidth, height: screenHeight } = primaryDisplay.bounds;

  const isVertical = orientation === 'vertical';
  const hudWidth = isVertical ? 180 : 1200;
  const hudHeight = isVertical ? 380 : 32;

  let posX = x;
  let posY = y;

  switch (position) {
    case 'top-left':
      posX = x;
      posY = y;
      break;
    case 'top-center':
      posX = x + Math.round((screenWidth - hudWidth) / 2);
      posY = y;
      break;
    case 'top-right':
      posX = x + screenWidth - hudWidth;
      posY = y;
      break;
    case 'left-center':
      posX = x;
      posY = y + Math.round((screenHeight - hudHeight) / 2);
      break;
    case 'right-center':
      posX = x + screenWidth - hudWidth;
      posY = y + Math.round((screenHeight - hudHeight) / 2);
      break;
    case 'bottom-left':
      posX = x;
      posY = y + screenHeight - hudHeight;
      break;
    case 'bottom-center':
      posX = x + Math.round((screenWidth - hudWidth) / 2);
      posY = y + screenHeight - hudHeight;
      break;
    case 'bottom-right':
    default:
      posX = x + screenWidth - hudWidth;
      posY = y + screenHeight - hudHeight;
      break;
  }

  return { x: posX, y: posY, width: hudWidth, height: hudHeight };
}

function createHudWindow() {
  if (hudWindow && !hudWindow.isDestroyed()) return;
  try {
    const settings = db ? (getLibrarySettings(db) || {}) : {};
    const bounds = getHudWindowBounds(settings.fpsPosition || 'top-left', settings.fpsOrientation || 'horizontal');

    hudWindow = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      resizable: false,
      focusable: false,
      backgroundColor: '#00000000',
      hasShadow: false,
      thickFrame: false,
      roundedCorners: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        backgroundThrottling: false,
      },
    });

    hudWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    hudWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    hudWindow.setIgnoreMouseEvents(true);

    const isDev = !app.isPackaged && (process.argv.includes('--dev') || process.env.NODE_ENV === 'development');
    const rendererUrl = !app.isPackaged ? (process.env.ELECTRON_RENDERER_URL || (isDev ? 'http://127.0.0.1:5173' : null)) : null;
    const indexPath = path.join(__dirname, '..', 'app-dist', 'index.html');

    if (rendererUrl) {
      hudWindow.loadURL(`${rendererUrl}#hud`);
    } else {
      hudWindow.loadFile(indexPath, { hash: 'hud' });
    }
  } catch (err) {
    console.warn('[HUD] Failed to create hudWindow:', err?.message);
  }
}

function updateHudDisplayState(forceShow = false) {
  if (!hudWindow || hudWindow.isDestroyed()) {
    createHudWindow();
  }
  if (!hudWindow || hudWindow.isDestroyed()) return;

  const settings = db ? (getLibrarySettings(db) || {}) : {};
  const fpsEnabled = !!settings.fpsEnabled;
  const fpsTestMode = settings.fpsTestMode !== undefined ? !!settings.fpsTestMode : false;

  // HUD Visibility Rules:
  // - If fpsTestMode is true (Testing Mode): HUD stays on continuously across desktop and apps,
  //   completely independent of whether Logpile is focused, minimized, or in the background.
  // - If fpsTestMode is false (In-Game Only): HUD strictly displays ONLY when a game is running
  //   (isGameCurrentlyRunning) and automatically hides when the game closes.
  const shouldShow = fpsEnabled && (isGameCurrentlyRunning || fpsTestMode || forceShow);

  try {
    if (shouldShow) {
      const bounds = getHudWindowBounds(settings.fpsPosition || 'top-left', settings.fpsOrientation || 'horizontal');
      hudWindow.setBounds(bounds);
      hudWindow.setPosition(bounds.x, bounds.y);
      hudWindow.setSize(bounds.width, bounds.height);

      hudWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      hudWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      hudWindow.setIgnoreMouseEvents(true);

      if (!hudWindow.isVisible()) {
        hudWindow.showInactive();
      }
    } else {
      if (hudWindow.isVisible()) {
        hudWindow.hide();
      }
    }
  } catch (err) {
    console.warn('[HUD] updateHudDisplayState error:', err?.message);
  }
}

function syncHudVisibility(_enabled) {
  updateHudDisplayState();
}

function startHudGameMonitor() {
  if (hudMonitorTimer) clearInterval(hudMonitorTimer);
  createHudWindow();

  hudMonitorTimer = setInterval(async () => {
    try {
      const settings = db ? (getLibrarySettings(db) || {}) : {};
      if (!settings.fpsEnabled) {
        if (hudWindow && !hudWindow.isDestroyed() && hudWindow.isVisible()) {
          hudWindow.hide();
        }
        return;
      }

      // If a session is tracked directly in Logpile, game is running with zero scan overhead
      let running = activeGameSessions.size > 0;
      if (!running) {
        running = await checkIsAnyGameRunning();
      }
      if (running !== isGameCurrentlyRunning) {
        isGameCurrentlyRunning = running;
        updateHudDisplayState();
      } else if (isGameCurrentlyRunning && hudWindow && !hudWindow.isDestroyed()) {
        if (!hudWindow.isVisible()) {
          updateHudDisplayState();
        } else {
          hudWindow.setAlwaysOnTop(true, 'screen-saver', 1);
        }
      }
    } catch {}
  }, 4000);
}

let systemIs24Hour = false;
let lastTimeRegCheck = 0;

function checkSystemTimeFormat() {
  const now = Date.now();
  if (now - lastTimeRegCheck < 10000) return;
  lastTimeRegCheck = now;

  if (process.platform === 'win32') {
    execFile('reg', ['query', 'HKCU\\Control Panel\\International', '/v', 'iTime'], { windowsHide: true, timeout: 800 }, (err, stdout) => {
      if (!err && stdout) {
        const match = stdout.match(/iTime\s+REG_SZ\s+([01])/i);
        if (match) {
          systemIs24Hour = match[1] === '1';
        }
      }
    });
  } else {
    try {
      systemIs24Hour = !new Intl.DateTimeFormat().resolvedOptions().hour12;
    } catch {}
  }
}

function formatSystemClock(date, is24Hour) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  const mins = String(d.getMinutes()).padStart(2, '0');
  if (is24Hour) {
    const hours = String(d.getHours()).padStart(2, '0');
    return `${hours}:${mins}`;
  }
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${mins} ${ampm}`;
}

checkSystemTimeFormat();

let hardwareTelemetry = {
  cpuUsage: 12,
  cpuClock: 2500,
  cpuTemp: null,
  ramUsage: 44,
  ramUsedGb: 14.1,
  ramTotalGb: 31.8,
  hasGpu: true,
  gpuUsage: 1,
  gpuTemp: 51,
  gpuClock: 2500,
  gpuPower: 25,
  gpuFan: 0,
  vramUsedGb: 1.5,
  vramTotalGb: 8.0,
  hasBattery: false,
  batteryPercent: null,
  batteryCharging: false,
  is24Hour: false,
  clock: formatSystemClock(new Date(), false),
  fps: null,
  onePercentLow: null,
  frametime: null,
  gpuBusyMs: null,
  isGpuBound: true,
  isEtwActive: false,
};
let prevCpuTimes = null;
let hardwareMonitorTimer = null;
let hasPhysicalBatteryChecked = false;

function checkPhysicalBatteryHardware() {
  if (hasPhysicalBatteryChecked || process.platform !== 'win32') return;
  hasPhysicalBatteryChecked = true;
  execFile('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Measure-Object).Count'], { windowsHide: true, timeout: 3000 }, (err, stdout) => {
    if (!err && stdout) {
      const count = parseInt(stdout.trim(), 10);
      hardwareTelemetry.hasBattery = !isNaN(count) && count > 0;
    }
  });
}
checkPhysicalBatteryHardware();

function sampleHardwareStats() {
  try {
    const cpus = os.cpus();
    if (cpus && cpus.length > 0) {
      if (cpus[0].speed) {
        hardwareTelemetry.cpuClock = Math.round(cpus[0].speed);
      }
      let idle = 0;
      let total = 0;
      for (const cpu of cpus) {
        for (const t in cpu.times) total += cpu.times[t];
        idle += cpu.times.idle;
      }
      if (prevCpuTimes) {
        const idleDiff = idle - prevCpuTimes.idle;
        const totalDiff = total - prevCpuTimes.total;
        if (totalDiff > 0) {
          hardwareTelemetry.cpuUsage = Math.max(1, Math.min(100, Math.round(100 - (100 * idleDiff / totalDiff))));
        }
      }
      prevCpuTimes = { idle, total };
    }

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    hardwareTelemetry.ramUsage = Math.round((usedMem / totalMem) * 100);
    hardwareTelemetry.ramUsedGb = Number((usedMem / (1024 ** 3)).toFixed(1));
    hardwareTelemetry.ramTotalGb = Number((totalMem / (1024 ** 3)).toFixed(1));

    checkSystemTimeFormat();
    const now = new Date();
    hardwareTelemetry.is24Hour = systemIs24Hour;
    hardwareTelemetry.clock = formatSystemClock(now, systemIs24Hour);

    if (process.platform === 'win32') {
      execFile('nvidia-smi', ['--query-gpu=utilization.gpu,temperature.gpu,clocks.current.graphics,power.draw,fan.speed,memory.used,memory.total', '--format=csv,noheader,nounits'], { windowsHide: true, timeout: 1500 }, (err, stdout) => {
        if (!err && stdout) {
          const parts = stdout.trim().split(',');
          if (parts.length >= 2) {
            const u = parseInt(parts[0].trim(), 10);
            const t = parseFloat(parts[1].trim());
            if (!isNaN(u)) hardwareTelemetry.gpuUsage = u;
            if (!isNaN(t)) hardwareTelemetry.gpuTemp = Math.round(t);
            if (parts.length >= 7) {
              const clk = parseInt(parts[2].trim(), 10);
              const pwr = parseFloat(parts[3].trim());
              const fan = parseInt(parts[4].trim(), 10);
              const vramUsed = parseFloat(parts[5].trim());
              const vramTot = parseFloat(parts[6].trim());
              if (!isNaN(clk)) hardwareTelemetry.gpuClock = clk;
              if (!isNaN(pwr)) hardwareTelemetry.gpuPower = Math.round(pwr);
              if (!isNaN(fan)) hardwareTelemetry.gpuFan = fan;
              if (!isNaN(vramUsed)) hardwareTelemetry.vramUsedGb = Number((vramUsed / 1024).toFixed(1));
              if (!isNaN(vramTot)) hardwareTelemetry.vramTotalGb = Number((vramTot / 1024).toFixed(1));
            }

            if (hudWindow && !hudWindow.isDestroyed() && hudWindow.isVisible()) {
              hudWindow.webContents.send('hardware:telemetry-update', hardwareTelemetry);
            }
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
              mainWindow.webContents.send('hardware:telemetry-update', hardwareTelemetry);
            }
          }
        }
      });
    }

    if (hudWindow && !hudWindow.isDestroyed() && hudWindow.isVisible()) {
      hudWindow.webContents.send('hardware:telemetry-update', hardwareTelemetry);
    }
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      mainWindow.webContents.send('hardware:telemetry-update', hardwareTelemetry);
    }
  } catch {}
}

function startHardwareMonitor() {
  if (hardwareMonitorTimer) clearInterval(hardwareMonitorTimer);
  sampleHardwareStats();
  hardwareMonitorTimer = setInterval(sampleHardwareStats, 2500);
}

function registerGlobalShortcuts() {
  try {
    globalShortcut.unregisterAll()
  } catch {}

  const settings = db ? (getLibrarySettings(db) || {}) : {}
  const overlayKey = settings.overlayShortcut || 'CommandOrControl+Shift+Space'
  const fpsKey = settings.fpsShortcut || 'CommandOrControl+Shift+F'

  if (overlayKey) {
    try {
      globalShortcut.register(overlayKey, () => {
        toggleOverlay()
      })
    } catch (err) {
      console.warn('[Shortcuts] Failed to register overlay shortcut:', overlayKey, err?.message)
    }
  }

  if (fpsKey) {
    try {
      globalShortcut.register(fpsKey, () => {
        try {
          const current = getLibrarySettings(db) || {}
          const nextEnabled = !current.fpsEnabled
          setLibrarySettings(db, { fpsEnabled: nextEnabled })
          syncHudVisibility(nextEnabled)
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('fps:status-changed', { fpsEnabled: nextEnabled })
          }
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('fps:status-changed', { fpsEnabled: nextEnabled })
          }
          if (hudWindow && !hudWindow.isDestroyed()) {
            hudWindow.webContents.send('fps:status-changed', { fpsEnabled: nextEnabled })
          }
        } catch (fErr) {
          console.warn('[Shortcuts] Error toggling FPS status:', fErr?.message)
        }
      })
    } catch (err) {
      console.warn('[Shortcuts] Failed to register FPS shortcut:', fpsKey, err?.message)
    }
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
      spellcheck: true,
    },
  })

  attachSpellcheckContextMenu(mainWindow)

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
  ipcMain.handle('system:getConnectedGamepads', () => getConnectedGamepads())
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
      preferAnimatedArtwork: Boolean(settings.preferAnimatedArtwork),
      preferAnimatedCovers: Boolean(settings.preferAnimatedCovers),
      minimizeToTray: Boolean(settings.minimizeToTray),
      overlayShortcut: settings.overlayShortcut || 'CommandOrControl+Shift+Space',
      fpsShortcut: settings.fpsShortcut || 'CommandOrControl+Shift+F',
      searchShortcut: settings.searchShortcut || 'CommandOrControl+F',
      fpsEnabled: Boolean(settings.fpsEnabled),
      fpsPosition: settings.fpsPosition || 'top-right',
      fpsOrientation: settings.fpsOrientation || 'horizontal',
      fpsOpacity: Number(settings.fpsOpacity) || 80,
      fpsStyle: settings.fpsStyle || 'minimalist-pill',
      fpsMetrics: settings.fpsMetrics || {
        fps: true,
        onePercentLow: true,
        frametime: true,
        gpu: true,
        cpu: true,
        ram: true,
        battery: true,
        clock: true,
      },
    }
  })
  ipcMain.handle('hardware:getMetrics', () => hardwareTelemetry)
  ipcMain.handle('telemetry:enableEtw', async () => {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') return resolve({ success: false, error: 'Windows required' });
      execFile('powershell', ['-NoProfile', '-Command', 'Start-Process cmd -ArgumentList "/c net localgroup \\"Performance Log Users\\" \\"$env:USERNAME\\" /add" -Verb RunAs'], { windowsHide: false }, (err) => {
        if (err) return resolve({ success: false, error: err.message });
        resolve({ success: true });
      });
    });
  })
  ipcMain.handle('db:setLibrarySettings', (_event, settings) => {
    const next = setLibrarySettings(db, settings) || {}
    if (settings && (settings.overlayShortcut !== undefined || settings.fpsShortcut !== undefined)) {
      registerGlobalShortcuts()
    }
    if (settings && (settings.fpsEnabled !== undefined || settings.fpsPosition !== undefined || settings.fpsOrientation !== undefined || settings.fpsStyle !== undefined || settings.fpsOpacity !== undefined || settings.fpsMetrics !== undefined || settings.fpsTestMode !== undefined)) {
      updateHudDisplayState()
    }
    if (hudWindow && !hudWindow.isDestroyed()) {
      try {
        hudWindow.webContents.send('fps:settings-updated', next)
      } catch {}
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.send('fps:settings-updated', next)
      } catch {}
    }
    return {
      autoHideSupportEntries: Boolean(next.autoHideSupportEntries),
      steamGridDbApiKey: typeof next.steamGridDbApiKey === 'string' ? next.steamGridDbApiKey : '',
      igdbClientId: typeof next.igdbClientId === 'string' ? next.igdbClientId : '',
      igdbClientSecret: typeof next.igdbClientSecret === 'string' ? next.igdbClientSecret : '',
      heroResolution: typeof next.heroResolution === 'string' && next.heroResolution ? next.heroResolution : '2.5k',
      preferAnimatedArtwork: Boolean(next.preferAnimatedArtwork),
      preferAnimatedCovers: Boolean(next.preferAnimatedCovers),
      minimizeToTray: Boolean(next.minimizeToTray),
      overlayShortcut: next.overlayShortcut || 'CommandOrControl+Shift+Space',
      fpsShortcut: next.fpsShortcut || 'CommandOrControl+Shift+F',
      searchShortcut: next.searchShortcut || 'CommandOrControl+F',
      fpsEnabled: Boolean(next.fpsEnabled),
      fpsPosition: next.fpsPosition || 'top-right',
      fpsOrientation: next.fpsOrientation || 'horizontal',
      fpsOpacity: Number(next.fpsOpacity) || 80,
      fpsStyle: next.fpsStyle || 'minimalist-pill',
      fpsMetrics: next.fpsMetrics || {
        fps: true,
        onePercentLow: true,
        frametime: true,
        gpu: true,
        cpu: true,
        ram: true,
        battery: true,
        clock: true,
      },
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
  function maybeAutoUnloadEngine() {
    try {
      if (!db) return;
      const row = db.prepare("SELECT value FROM app_settings WHERE key = 'ai_auto_unload_on_game'").get();
      const shouldUnload = row ? (row.value === '1' || row.value === 'true') : true;
      if (shouldUnload) {
        unloadEngine();
      }
    } catch {}
  }

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
        maybeAutoUnloadEngine()
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
      maybeAutoUnloadEngine()
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

        // When a game is active or dossier is open, STRICTLY prioritize that game.
        // Never switch away unless the user explicitly asks about another game (e.g. "switch to [game]" or "how about [game]")
        if (!targetTitle) {
          const mentionedGame = findGameEntityInText(db, userPrompt);
          if (mentionedGame?.canonical_title) {
            targetTitle = mentionedGame.canonical_title;
          }
        } else {
          // If a game is already active, only switch if user explicitly types "switch to <game>" or "how about <game>"
          const explicitSwitchMatch = (userPrompt || '').match(/\b(?:switch to|how about|what about)\s+([a-zA-Z0-9\s:''-]+?)(?:\s+(?:how|where|what|why|who|stuck|guide|walkthrough)|\?|$)/i);
          if (explicitSwitchMatch && explicitSwitchMatch[1]?.trim()) {
            const explicitGame = findGameEntityInText(db, explicitSwitchMatch[1]);
            if (explicitGame?.canonical_title) {
              targetTitle = explicitGame.canonical_title;
            }
          }
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
        let hasDirectMatch = false;
        let guideChunks = [];
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
                guideChunks = chunks;
                hasDirectMatch = chunks.some((c) => Boolean(c.isDirectMatch));
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
          hasDirectMatch,
          guideChunks,
        };
      } catch (err) {
        console.warn('[AI] Error preparing library context:', err?.message);
      }
    }
    return askGamingAssistant(app, userPrompt, targetTitle, libraryContext, {
      ...options,
      db,
      onToken: (payload) => {
        try {
          if (_event?.sender && !_event.sender.isDestroyed()) {
            _event.sender.send('ai:token', payload);
          }
        } catch {}
      },
    });
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

  ipcMain.handle('ai:generateHudTheme', async (_event, userPrompt, gameInfo = null, options = {}) => {
    return await generateHudThemeDesign(userPrompt, gameInfo, { ...options, app });
  });

  ipcMain.handle('ai:selectModelFile', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Local GGUF Model',
        filters: [{ name: 'GGUF Models (*.gguf)', extensions: ['gguf'] }],
        properties: ['openFile']
      });
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { canceled: true };
      }
      const filePath = result.filePaths[0];
      const stats = fs.statSync(filePath);
      return {
        canceled: false,
        filePath,
        fileName: path.basename(filePath),
        sizeMb: Math.round(stats.size / (1024 * 1024)),
      };
    } catch (err) {
      return { canceled: true, error: err?.message };
    }
  });

  ipcMain.handle('ai:attachModelFile', async (_event, filePath, action = 'link') => {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('File does not exist: ' + filePath);
      }
      const modelsDir = getModelsDirectory(app);
      if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
      }

      let activePath = filePath;
      const fileName = path.basename(filePath);
      const destPath = path.join(modelsDir, fileName);

      if (action === 'move') {
        if (filePath.toLowerCase() !== destPath.toLowerCase()) {
          fs.renameSync(filePath, destPath);
          activePath = destPath;
        }
      } else if (action === 'copy') {
        if (filePath.toLowerCase() !== destPath.toLowerCase()) {
          fs.copyFileSync(filePath, destPath);
          activePath = destPath;
        }
      }

      if (db) {
        db.prepare("INSERT INTO app_settings (key, value) VALUES ('ai_custom_model_path', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(activePath);
      }
      setCustomModelPath(activePath);
      unloadEngine().catch(() => {});
      return { success: true, status: getModelStatus(app) };
    } catch (err) {
      return { success: false, error: err?.message };
    }
  });

  ipcMain.handle('ai:setExecutionMode', (_event, mode) => {
    if (['cpu-safe', 'gamer-balanced', 'full-beast'].includes(mode)) {
      setExecutionMode(mode);
      if (db) {
        try {
          db.prepare("INSERT INTO app_settings (key, value) VALUES ('ai_execution_mode', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(mode);
        } catch {}
      }
      return { success: true, mode };
    }
    return { success: false, error: 'Invalid execution mode' };
  });

  ipcMain.handle('ai:getExecutionMode', () => {
    return getExecutionMode();
  });

  ipcMain.handle('ai:setAutoUnload', (_event, enabled) => {
    const val = enabled ? '1' : '0';
    if (db) {
      try {
        db.prepare("INSERT INTO app_settings (key, value) VALUES ('ai_auto_unload_on_game', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(val);
      } catch {}
    }
    return { success: true, enabled: Boolean(enabled) };
  });

  ipcMain.handle('ai:getAutoUnload', () => {
    if (db) {
      try {
        const row = db.prepare("SELECT value FROM app_settings WHERE key = 'ai_auto_unload_on_game'").get();
        return row ? (row.value === '1' || row.value === 'true') : true;
      } catch {}
    }
    return true;
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
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      try { overlayWindow.webContents.send('voice:recognized', data); } catch {}
    }
  });

  voiceService.on('stateChange', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { mainWindow.webContents.send('voice:stateChange', data); } catch {}
    }
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      try { overlayWindow.webContents.send('voice:stateChange', data); } catch {}
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
    const savedCustomModel = db.prepare("SELECT value FROM app_settings WHERE key = 'ai_custom_model_path'").get()
    if (savedCustomModel?.value) setCustomModelPath(savedCustomModel.value)
    const savedExecMode = db.prepare("SELECT value FROM app_settings WHERE key = 'ai_execution_mode'").get()
    if (savedExecMode?.value) setExecutionMode(savedExecMode.value)
  } catch {}
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
    startHudGameMonitor()
    startHardwareMonitor()
  } catch {}
  try {
    registerGlobalShortcuts()
  } catch (sErr) {
    console.warn('[Shortcuts] Initial shortcut setup error:', sErr?.message)
  }
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
  if (hudMonitorTimer) clearInterval(hudMonitorTimer);
  try { globalShortcut.unregisterAll() } catch {}
  try { stopSteamFamilyWatcher() } catch {}
  try { voiceService.stop() } catch {}
  flushAllActiveSessions()
  unloadEngine()
  if (db) db.close()
})