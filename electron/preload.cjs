const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file)
      }
    } catch {}
    return file?.path || ''
  },
  selectCustomArtwork: (gameId) => ipcRenderer.invoke('selectCustomArtwork', gameId),
  clearArtCache: () => ipcRenderer.invoke('clear-art-cache'),
  setGameCategory: (gameId, category) => ipcRenderer.invoke('games:setCategory', gameId, category),
  updateGameStatus: (gameId, status) => ipcRenderer.invoke('db:update-game-status', gameId, status),
  openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    reload: () => ipcRenderer.invoke('window:reload'),
    toggleFullScreen: () => ipcRenderer.invoke('window:toggleFullScreen'),
    isFullScreen: () => ipcRenderer.invoke('window:isFullScreen'),
    captureScreen: (prefix) => ipcRenderer.invoke('window:captureScreen', prefix),
    captureRect: (rect) => ipcRenderer.invoke('window:captureRect', rect),
    saveBragCollage: (dataUrl, filenamePrefix) => ipcRenderer.invoke('window:saveBragCollage', dataUrl, filenamePrefix),
    openCapturesFolder: () => ipcRenderer.invoke('window:openCapturesFolder'),
    openPicturesFolder: () => ipcRenderer.invoke('window:openCapturesFolder'),
  },
  database: {
    resolveGameByQuery: (queryStr) => ipcRenderer.invoke('db:resolveGameByQuery', queryStr),
    getGames: (filters = {}, sort = {}) => ipcRenderer.invoke('db:getGames', filters, sort),
    getLibraryStats: () => ipcRenderer.invoke('db:getLibraryStats'),
    exportCsv: () => ipcRenderer.invoke('db:exportCsv'),
    exportSelectedCsv: (gameIds) => ipcRenderer.invoke('db:exportSelectedCsv', gameIds),
    purgeLibrary: () => ipcRenderer.invoke('db:purgeLibrary'),
    setGameHidden: (gameId, hidden) => ipcRenderer.invoke('db:setGameHidden', gameId, hidden),
    updateGameStatus: (gameId, status) => ipcRenderer.invoke('db:update-game-status', gameId, status),
    updateGameMetadata: (gameId, fields) => ipcRenderer.invoke('db:updateGameMetadata', gameId, fields),
    deleteGames: (gameIds) => ipcRenderer.invoke('db:deleteGames', gameIds),
    bulkUpdateGames: (gameIds, fields) => ipcRenderer.invoke('db:bulkUpdateGames', gameIds, fields),
    bulkMoveGameCategory: (gameIds, category) => ipcRenderer.invoke('db:bulkMoveGameCategory', gameIds, category),
    bulkSetGameHidden: (gameIds, hidden) => ipcRenderer.invoke('db:bulkSetGameHidden', gameIds, hidden),
    onUpdated: (callback) => {
      if (typeof callback !== 'function') return () => {}
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('library:updated', listener)
      return () => ipcRenderer.removeListener('library:updated', listener)
    },
    seedCheck: () => ipcRenderer.invoke('db:seedCheck'),
    getLibrarySettings: () => ipcRenderer.invoke('db:getLibrarySettings'),
    setLibrarySettings: (settings) => ipcRenderer.invoke('db:setLibrarySettings', settings),
    getActivityLog: (limit = 50) => ipcRenderer.invoke('db:getActivityLog', limit),
    getLibraryHealth: () => ipcRenderer.invoke('db:getLibraryHealth'),
    backupNow: () => ipcRenderer.invoke('db:backupNow'),
    listBackups: () => ipcRenderer.invoke('db:listBackups'),
    openBackupsFolder: (targetPath) => ipcRenderer.invoke('db:openBackupsFolder', targetPath),
    chooseBackupFile: () => ipcRenderer.invoke('db:chooseBackupFile'),
    restoreBackup: (backupPath) => ipcRenderer.invoke('db:restoreBackup', backupPath),
  },
  roulette: {
    pick: () => ipcRenderer.invoke('roulette:pick'),
  },
  scanner: {
    scanAll: () => ipcRenderer.invoke('scanner:scanAll'),
    chooseImportFile: () => ipcRenderer.invoke('scanner:chooseImportFile'),
    importFile: (filePath) => ipcRenderer.invoke('scanner:importFile', filePath),
    importBuffer: (data, filename) => ipcRenderer.invoke('scanner:importBuffer', data, filename),
    downloadTemplate: (format) => ipcRenderer.invoke('scanner:downloadTemplate', format),
    onProgress: (callback) => {
      if (typeof callback !== 'function') return () => {}
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('scanner:progress', listener)
      return () => ipcRenderer.removeListener('scanner:progress', listener)
    },
  },
  games: {
    openUri: (uri, launchMeta) => ipcRenderer.invoke('game:openUri', uri, launchMeta),
    logLaunchAttempt: (launchMeta) => ipcRenderer.invoke('game:logAttempt', launchMeta),
    selectCustomArtwork: (gameId) => ipcRenderer.invoke('selectCustomArtwork', gameId),
    changeArtwork: (gameId) => ipcRenderer.invoke('selectCustomArtwork', gameId),
    refetchArtwork: (gameId, exactId, apiKey) => ipcRenderer.invoke('artwork:refetchExact', gameId, exactId, apiKey),
    refetchSelectedArtwork: (gameIds, apiKey) => ipcRenderer.invoke('artwork:refetchSelected', gameIds, apiKey),
    chooseAndSaveArtwork: (gameId, kind) => ipcRenderer.invoke('artwork:chooseAndSave', gameId, kind),
    chooseExecutable: () => ipcRenderer.invoke('game:chooseExecutable'),
    launchExecutable: (executablePath, launchArguments, launchMeta) => ipcRenderer.invoke('game:launchExecutable', executablePath, launchArguments, launchMeta),
    addCustomGame: (executablePath) => ipcRenderer.invoke('game:addCustomGame', executablePath),
    fetchHltb: (gameId, title) => ipcRenderer.invoke('game:fetchHltb', gameId, title),
    syncHltb: (options) => ipcRenderer.invoke('library:syncHltb', options),
    cancelHltbSync: () => ipcRenderer.invoke('library:cancelHltbSync'),
    onHltbProgress: (callback) => {
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('hltb:progress', handler)
      return () => ipcRenderer.removeListener('hltb:progress', handler)
    },
    getCaptures: (gameId) => ipcRenderer.invoke('captures:getForGame', gameId),
    addCaptures: (gameId) => ipcRenderer.invoke('captures:add', gameId),
    deleteCapture: (captureId) => ipcRenderer.invoke('captures:delete', captureId),
    onSessionStarted: (callback) => {
      if (typeof callback !== 'function') return () => {}
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('game:sessionStarted', handler)
      return () => ipcRenderer.removeListener('game:sessionStarted', handler)
    },
    onSessionEnded: (callback) => {
      if (typeof callback !== 'function') return () => {}
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('game:sessionEnded', handler)
      return () => ipcRenderer.removeListener('game:sessionEnded', handler)
    },
    onPromptCheckpointNote: (callback) => {
      if (typeof callback !== 'function') return () => {}
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('game:promptCheckpointNote', handler)
      return () => ipcRenderer.removeListener('game:promptCheckpointNote', handler)
    },
    updateModProfile: (gameId, activeModProfile) => ipcRenderer.invoke('game:updateModProfile', gameId, activeModProfile),
    updateCheckpointNote: (gameId, note) => ipcRenderer.invoke('game:updateCheckpointNote', gameId, note),
  },
  scraper: {
    isSyncing: () => ipcRenderer.invoke('scraper:isSyncing'),
    fetchMissingArt: (apiKey) => ipcRenderer.invoke('scraper:fetchMissingArt', apiKey),
    restoreStaticCoversLocal: () => ipcRenderer.invoke('scraper:restoreStaticCoversLocal'),
    runBulkArtworkSync: (apiKey, options) => ipcRenderer.invoke('scraper:runBulkArtworkSync', apiKey, options),
    syncMetadataAndArt: (apiKey) => ipcRenderer.invoke('scraper:syncMetadataAndArt', apiKey),
    cancelSync: () => ipcRenderer.invoke('scraper:cancelSync'),
    syncMetadata: (apiKey) => ipcRenderer.invoke('scraper:syncMetadata', apiKey),
    generateAutomaticFallbacks: () => ipcRenderer.invoke('scraper:generateAutomaticFallbacks'),
    testIgdb: (clientId, clientSecret) => ipcRenderer.invoke('scraper:testIgdb', clientId, clientSecret),
    fetchGameMetadata: (gameId) => ipcRenderer.invoke('scraper:fetchGameMetadata', gameId),
    chooseOverride: () => ipcRenderer.invoke('artwork:chooseOverride'),
    backupCache: () => ipcRenderer.invoke('artwork:backupCache'),
    restoreCache: () => ipcRenderer.invoke('artwork:restoreCache'),
    clearArtCache: () => ipcRenderer.invoke('clear-art-cache'),
    onUpdated: (callback) => {
      if (typeof callback !== 'function') return () => {}
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('artwork:updated', listener)
      return () => ipcRenderer.removeListener('artwork:updated', listener)
    },
    onProgress: (callback) => {
      if (typeof callback !== 'function') return () => {}
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('scraper:progress', listener)
      return () => ipcRenderer.removeListener('scraper:progress', listener)
    },
  },
  system: {
    getSpecs: () => ipcRenderer.invoke('system:getSpecs'),
    checkPreLaunch: () => ipcRenderer.invoke('system:checkPreLaunch'),
    closeHeavyProcesses: (processes) => ipcRenderer.invoke('system:closeHeavyProcesses', processes),
  },
  overlay: {
    getActiveGame: () => ipcRenderer.invoke('overlay:getActiveGame'),
    setSelectedGame: (game) => ipcRenderer.invoke('overlay:setSelectedGame', game),
    hide: () => ipcRenderer.invoke('overlay:hide'),
    openUrl: (url) => ipcRenderer.invoke('overlay:openUrl', url),
    onShown: (callback) => {
      const handler = () => callback()
      ipcRenderer.on('overlay:shown', handler)
      return () => ipcRenderer.removeListener('overlay:shown', handler)
    },
  },
  network: {
    getActivityLog: (options) => ipcRenderer.invoke('network:getActivityLog', options),
    getStats: () => ipcRenderer.invoke('network:getStats'),
    clearLog: () => ipcRenderer.invoke('network:clearLog'),
  },
  ai: {
    getStatus: () => ipcRenderer.invoke('ai:getStatus'),
    askQuestion: (prompt, activeGameTitle, options) => ipcRenderer.invoke('ai:askQuestion', prompt, activeGameTitle, options),
    getRecommendation: (preference, options) => ipcRenderer.invoke('ai:getRecommendation', preference, options),
    unload: () => ipcRenderer.invoke('ai:unload'),
    openFolder: () => ipcRenderer.invoke('ai:openFolder'),
    parseFilter: (text) => ipcRenderer.invoke('ai:parseFilter', text),
  },
  steam: {
    getFamilyLocks: () => ipcRenderer.invoke('steam:getFamilyLocks'),
    onFamilyLocksUpdated: (callback) => {
      if (typeof callback !== 'function') return () => {}
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('steam:family-locks-updated', listener)
      return () => ipcRenderer.removeListener('steam:family-locks-updated', listener)
    },
  },
  guides: {
    getStatus: () => ipcRenderer.invoke('guides:getStatus'),
    scan: () => ipcRenderer.invoke('guides:scan'),
    hasGuide: (gameId) => ipcRenderer.invoke('guides:hasGuide', gameId),
    search: (gameId, query) => ipcRenderer.invoke('guides:search', gameId, query),
    downloadForGame: (gameId, title) => ipcRenderer.invoke('guides:downloadForGame', gameId, title),
    downloadBatch: (options) => ipcRenderer.invoke('guides:downloadBatch', options),
    cancelBatch: () => ipcRenderer.invoke('guides:cancelBatch'),
    onBatchProgress: (callback) => {
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('guides:batch-progress', handler)
      return () => ipcRenderer.removeListener('guides:batch-progress', handler)
    },
  },
  pcgw: {
    fetchManual: (gameId) => ipcRenderer.invoke('pcgw:fetch:manual', gameId),
  },
  saves: {
    list: (gameId) => ipcRenderer.invoke('saves:list', gameId),
    backupNow: (gameId) => ipcRenderer.invoke('saves:backupNow', gameId),
    restore: (gameId, backupId) => ipcRenderer.invoke('saves:restore', gameId, backupId),
    checkConflict: (gameId) => ipcRenderer.invoke('saves:checkConflict', gameId),
  },
  voice: {
    start: (options) => ipcRenderer.invoke('voice:start', options),
    stop: () => ipcRenderer.invoke('voice:stop'),
    setWakeWord: (enabled) => ipcRenderer.invoke('voice:setWakeWord', enabled),
    getStatus: () => ipcRenderer.invoke('voice:getStatus'),
    onRecognized: (callback) => {
      if (typeof callback !== 'function') return () => {}
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('voice:recognized', handler)
      return () => ipcRenderer.removeListener('voice:recognized', handler)
    },
    onStateChange: (callback) => {
      if (typeof callback !== 'function') return () => {}
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('voice:stateChange', handler)
      return () => ipcRenderer.removeListener('voice:stateChange', handler)
    },
  },
})
