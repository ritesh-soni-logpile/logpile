const { scanSteam } = require('./scanners/steamScanner.cjs')
const { scanEpic } = require('./scanners/epicScanner.cjs')
const { scanGog } = require('./scanners/gogScanner.cjs')
const { scanRepacks } = require('./scanners/repackScanner.cjs')
const { scanUbisoft } = require('./scanners/ubisoftScanner.cjs')
const { scanEA } = require('./scanners/eaScanner.cjs')
const { scanXbox } = require('./scanners/xboxScanner.cjs')
const { scanAmazon } = require('./scanners/amazonScanner.cjs')
const { importCatalog, importCatalogFromBuffer } = require('./excelImporter.cjs')
const { mergeRecords } = require('./deduplicationService.cjs')
const {
  relinkAllLocalArtwork,
  autoResolveMissingArtwork,
} = require('./artworkService.cjs')
const { emitProgress } = require('./scanners/scannerUtils.cjs')

async function scanAll(db, onProgress, userDataPath) {
  const startedAt = Date.now()
  const results = []
  const scanners = [
    { source: 'steam', run: scanSteam },
    { source: 'epic', run: scanEpic },
    { source: 'gog', run: scanGog },
    { source: 'amazon', run: scanAmazon },
    { source: 'repack', run: scanRepacks },
    { source: 'ubisoft', run: scanUbisoft },
    { source: 'ea', run: scanEA },
    { source: 'xbox', run: scanXbox },
  ]

  let totalCreated = 0
  let totalUpdated = 0
  let totalLinked = 0
  let totalMultiPlatformDuplicates = 0

  for (let index = 0; index < scanners.length; index++) {
    const scanner = scanners[index]
    const source = scanner.source
    emitProgress(onProgress, {
      source,
      phase: 'starting',
      current: index,
      total: scanners.length,
      message: `Starting ${source} scanner...`,
    })
    try {
      const result = await scanner.run(onProgress, db)
      results.push(result)

      // Batch merge records immediately so the library UI updates in real-time
      const records = result.records || []
      if (records.length > 0) {
        const batchMerge = await mergeRecords(db, records)
        totalCreated += batchMerge.created
        totalUpdated += batchMerge.updated
        totalLinked += batchMerge.linked
        totalMultiPlatformDuplicates += batchMerge.multiPlatformDuplicates

        emitProgress(onProgress, {
          source,
          phase: 'batch-complete',
          current: index + 1,
          total: scanners.length,
          message: `Discovered and merged ${records.length} ${source} games.`,
          type: 'batch-updated',
        })
      }
    } catch (error) {
      console.error(`[ScanService] Error in ${source} scanner:`, error)
      results.push({ source, records: [], error: error.message })
    }
  }

  // 1. Relink any artwork already present in local disk cache
  const localArtworkRelinked = userDataPath ? relinkAllLocalArtwork(db, userDataPath) : 0

  // 2. Automatically resolve posters via Steam public store search or extract exe icons
  let resolvedArtworkCount = 0
  if (userDataPath) {
    emitProgress(onProgress, {
      source: 'artwork',
      phase: 'fetching',
      current: 0,
      total: 1,
      message: 'Resolving posters and artwork for non-Steam titles...',
    })
    try {
      const artResult = await autoResolveMissingArtwork(db, userDataPath, onProgress)
      resolvedArtworkCount = artResult.updated
    } catch (e) {
      /* Fallback safely */
    }
  }

  const allRecords = results.flatMap((result) => result.records || [])
  const offline = allRecords.filter((record) => record.isInstalled && record.driveStatus === 'offline').length
  const sources = results.map((result) => ({
    source: result.source,
    detected: (result.records || []).length,
    error: result.error || null,
  }))

  const installedInDb = db.prepare('SELECT COUNT(*) as count FROM games WHERE is_installed = 1').get()?.count || 0

  const summary = {
    type: 'scan',
    scannedInstalledGames: installedInDb,
    detectedRecords: allRecords.length,
    offlineDrives: offline,
    sources,
    created: totalCreated,
    updated: totalUpdated,
    linked: totalLinked,
    multiPlatformDuplicates: totalMultiPlatformDuplicates,
    localArtworkRelinked,
    resolvedArtworkCount,
    elapsedMs: Date.now() - startedAt,
  }

  emitProgress(onProgress, {
    source: 'all',
    phase: 'complete',
    current: scanners.length,
    total: scanners.length,
    message: `Scan complete. ${summary.scannedInstalledGames} installed titles detected.`,
    type: 'scan-complete',
  })

  return summary
}

async function importFile(db, filePath, onProgress, userDataPath) {
  const imported = importCatalog(filePath, onProgress)
  return await finalizeImport(db, imported, onProgress, userDataPath)
}

async function importBuffer(db, buffer, filename, onProgress, userDataPath) {
  const imported = importCatalogFromBuffer(buffer, filename, onProgress)
  return await finalizeImport(db, imported, onProgress, userDataPath)
}

async function finalizeImport(db, imported, onProgress, userDataPath) {
  const merge = await mergeRecords(db, imported.records)
  const localArtworkRelinked = userDataPath ? relinkAllLocalArtwork(db, userDataPath) : 0
  const summary = {
    type: 'import',
    filePath: imported.filePath,
    importedCatalogGames: imported.totalRows,
    sheets: imported.sheets,
    created: merge.created,
    updated: merge.updated,
    linked: merge.linked,
    multiPlatformDuplicates: merge.multiPlatformDuplicates,
    localArtworkRelinked,
  }

  emitProgress(onProgress, {
    source: 'catalog',
    phase: 'complete',
    current: imported.sheets.length,
    total: imported.sheets.length,
    message: `Import complete. ${summary.importedCatalogGames} catalog titles processed.`,
  })

  return summary
}

module.exports = { scanAll, importFile, importBuffer }