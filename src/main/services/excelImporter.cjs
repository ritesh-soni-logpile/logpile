const path = require('node:path')
const fs = require('node:fs')
const XLSX = require('xlsx')
const { artworkUrls, emitProgress, toNumber } = require('./scanners/scannerUtils.cjs')

function normalizeHeader(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function firstValue(row, aliases) {
  if (!row || typeof row !== 'object') return ''
  const keys = Object.keys(row).filter((k) => k !== '__proto__' && k !== 'constructor' && k !== 'prototype')
  const normalizedAliases = aliases.map(normalizeHeader)
  const key = keys.find((candidate) => normalizedAliases.includes(normalizeHeader(candidate)))
  return key ? row[key] : ''
}

function inferPlatform(sheetName, row) {
  const explicit = String(firstValue(row, ['Platform', 'Store', 'Source', 'Launcher'])).toLowerCase()
  const context = `${sheetName} ${explicit}`.toLowerCase()
  if (context.includes('epic')) return 'epic'
  if (context.includes('gog')) return 'gog'
  if (context.includes('steam')) return 'steam'
  return 'custom'
}

function inferStoreName(sheetName, row) {
  const explicit = String(firstValue(row, ['Platform', 'Store', 'Source', 'Launcher'])).trim()
  if (explicit) return explicit
  const sheet = String(sheetName || '').trim()
  if (/steam/i.test(sheet)) return 'Steam'
  if (/epic/i.test(sheet)) return 'Epic Games'
  if (/gog/i.test(sheet)) return 'GOG'
  return null
}

function autoLabelCustomStore(storeName, title, publisher, developer) {
  const current = String(storeName || '').trim()
  if (current.toLowerCase() !== 'custom') return current || null
  const text = `${title || ''} ${publisher || ''} ${developer || ''}`
  if (/xbox|microsoft/i.test(text)) return 'Xbox'
  if (/electronic arts|\bea\b/i.test(text)) return 'EA Games'
  if (/amazon/i.test(text)) return 'Amazon Games'
  return 'Custom'
}

function parsePlayTime(value) {
  if (typeof value === 'number') return Math.round(value * 3600)
  const text = String(value || '').toLowerCase().trim()
  if (!text) return 0
  const hours = Number((text.match(/([\d.]+)\s*h/) || [])[1] || 0)
  const minutes = Number((text.match(/([\d.]+)\s*m/) || [])[1] || 0)
  if (hours || minutes) return Math.round(hours * 3600 + minutes * 60)
  const numeric = Number(text.replace(/[^\d.]/g, ''))
  return Number.isFinite(numeric) ? Math.round(numeric * 3600) : 0
}

function parseBacklogStatus(value) {
  const text = String(value || '').toLowerCase().trim()
  if (!text) return null
  if (/completed|complete|finished|done|beaten|100%/.test(text)) return 'completed'
  if (/playing|in progress|active|current|started/.test(text)) return 'playing'
  if (/dropped|abandoned|quit|retired/.test(text)) return 'dropped'
  if (/unplayed|unstarted|backlog|not started|pending|never played/.test(text)) return 'unplayed'
  return null
}

function parseBoolean(value) {
  return /^(1|true|yes|y)$/i.test(String(value || '').trim())
}

function parseRating(value) {
  const number = toNumber(value, 0)
  if (number <= 0) return 0
  return Number((number > 5 ? number / 20 : number).toFixed(1))
}

function parsePrice(value) {
  const number = toNumber(String(value || '').replace(/[^\d.,-]/g, ''), 0)
  return number
}

function parseRow(row, sheetName) {
  const title = String(firstValue(row, ['Name', 'Game Name', 'Product Name', 'Title', 'Game'])).trim()
  if (!title || /^(nan|null|undefined|none)$/i.test(title)) return null
  if (/^coupon discount$/i.test(title)) return null
  const platform = inferPlatform(sheetName, row)
  const rawStoreName = inferStoreName(sheetName, row)
  const appId = String(firstValue(row, [
    'Storefront ID', 'Storefront_ID', 'StorefrontId', 'Storefront',
    'Source ID', 'Source_ID', 'SourceID', 'Source_Ids',
    'Platform Game ID', 'Platform_Game_ID', 'PlatformGameId',
    'Steam AppID', 'Steam App Id', 'AppID', 'App Id', 'Catalog Item Id', 'Game ID', 'Game_ID'
  ])).trim() || null
  const steamGridDbId = String(firstValue(row, [
    'SteamGridDB ID', 'SteamGridDB_ID', 'SteamGridDB', 'SGDB ID', 'SGDB_ID', 'SteamGridDBId', 'sgdb_id', 'SteamGrid_ID'
  ])).trim() || null
  const explicitCover = String(firstValue(row, ['Cover URL', 'Cover_URL', 'Cover', 'Artwork', 'Artwork URL', 'Artwork_URL', 'Poster', 'Poster URL'])).trim() || null
  const explicitHero = String(firstValue(row, ['Hero URL', 'Hero_URL', 'Hero', 'Banner', 'Banner URL', 'Banner_URL'])).trim() || null
  const developer = String(firstValue(row, ['Developer', 'Developers'])).trim() || null
  const publisher = String(firstValue(row, ['Publisher', 'Publishers'])).trim() || null
  const storeName = autoLabelCustomStore(rawStoreName, title, publisher, developer)
  const genre = String(firstValue(row, ['Genre', 'Genres', 'Category'])).trim() || null
  const description = String(firstValue(row, ['Description', 'Summary'])).trim() || null
  const price = parsePrice(firstValue(row, ['Price', 'Paid', 'Cost']))
  const playTimeSeconds = parsePlayTime(firstValue(row, ['Play Time', 'Playtime', 'Playtime_Hours', 'Hours Played', 'Hours on Record', 'Time Played', 'Minutes Played', 'Minutes']))
  const explicitBacklog = parseBacklogStatus(firstValue(row, ['Backlog', 'Backlog Status', 'Status', 'Completion', 'Completion Status', 'State', 'Play Status', 'Progress']))
  const userRating = parseRating(firstValue(row, ['Rating', 'User Rating', 'Score']))

  let coverUrl = explicitCover
  let heroUrl = explicitHero
  if (!coverUrl && platform === 'steam' && appId && /^\d+$/.test(appId)) {
    const autoArt = artworkUrls(appId)
    coverUrl = autoArt.coverUrl
    if (!heroUrl) heroUrl = autoArt.heroUrl
  }

  const encodedId = encodeURIComponent(appId || title)
  const launchUri = platform === 'steam' && appId ? `steam://rungameid/${appId}` : platform === 'epic' ? `com.epicgames.launcher://apps/${encodedId}?action=launch&silent=true` : platform === 'gog' && appId ? `goggalaxy://openGameView/${encodedId}` : null
  const installUri = platform === 'steam' && appId ? `steam://install/${appId}` : platform === 'epic' ? `com.epicgames.launcher://apps/${encodedId}?action=install` : launchUri
  const idSource = appId ? 'catalog-import:AppID' : 'title-fallback'
  return {
    canonicalTitle: title,
    normalizedTitle: title,
    description,
    developer,
    publisher,
    releaseDate: null,
    coverUrl,
    heroUrl,
    artworkStatus: coverUrl ? 'available' : 'missing',
    isInstalled: parseBoolean(firstValue(row, ['Is Installed', 'Is_Installed', 'Installed', 'IsInstalled'])),
    driveLetter: null,
    installPath: null,
    executablePath: String(firstValue(row, ['Executable Path', 'Executable_Path', 'Exe', 'Executable'])).trim() || null,
    installSizeBytes: 0,
    playTimeSeconds,
    lastPlayed: null,
    backlogStatus: explicitBacklog,
    userRating,
    isFavorite: false,
    isUtility: parseBoolean(firstValue(row, ['Is Utility', 'Is_Utility', 'Utility', 'IsUtility'])),
    isDlc: parseBoolean(firstValue(row, ['Is DLC', 'Is_DLC', 'DLC', 'IsDlc'])),
    steamGridDbId,
    driveStatus: 'online',
    price,
    genre,
    platform,
    storeName,
    platformGameId: appId || title,
    platformLaunchId: appId || title,
    idSource,
    launchUri,
    installUri,
    source: 'catalog-import',
  }
}

const MAX_CATALOG_FILE_SIZE = 25 * 1024 * 1024

function importCatalog(filePath, onProgress) {
  if (!filePath || !/\.(xlsx|xls|csv)$/i.test(filePath)) throw new Error('Choose an .xlsx, .xls, or .csv catalog file.')
  try {
    const stats = fs.statSync(filePath)
    if (stats.size > MAX_CATALOG_FILE_SIZE) {
      throw new Error('Spreadsheet file exceeds the 25 MB size limit.')
    }
  } catch (err) {
    if (err.message.includes('25 MB')) throw err
    throw new Error('Unable to read selected catalog file.')
  }
  let workbook
  try {
    workbook = XLSX.readFile(filePath, { cellDates: true })
  } catch (err) {
    throw new Error('Failed to parse catalog spreadsheet. Please verify the file is not corrupted.')
  }
  return processWorkbook(workbook, path.normalize(filePath), onProgress)
}

function importCatalogFromBuffer(buffer, filename, onProgress) {
  if (buffer && buffer.length > MAX_CATALOG_FILE_SIZE) {
    throw new Error('Spreadsheet file exceeds the 25 MB size limit.')
  }
  let workbook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  } catch (err) {
    throw new Error('Failed to parse catalog spreadsheet. Please verify the file is not corrupted.')
  }
  return processWorkbook(workbook, filename || 'uploaded_catalog.csv', onProgress)
}

function processWorkbook(workbook, sourceIdentifier, onProgress) {
  const sheets = workbook.SheetNames
  const records = []
  const sheetSummaries = []
  sheets.forEach((sheetName, sheetIndex) => {
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
    let imported = 0
    for (const rawRow of rawRows) {
      if (!rawRow || typeof rawRow !== 'object') continue
      const row = Object.create(null)
      for (const [k, v] of Object.entries(rawRow)) {
        if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
          row[k] = v
        }
      }
      const record = parseRow(row, sheetName)
      if (record) { records.push(record); imported += 1 }
    }
    sheetSummaries.push({ sheet: sheetName, rows: rows.length, imported })
    emitProgress(onProgress, { source: 'catalog', phase: 'importing', current: sheetIndex + 1, total: sheets.length, message: `Imported ${imported} title${imported === 1 ? '' : 's'} from ${sheetName}.` })
  })
  return { filePath: sourceIdentifier, sheets: sheetSummaries, records, totalRows: records.length }
}

function generateBlankTemplateBuffer(format = 'xlsx') {
  const headers = [
    'Title',
    'Platform',
    'Status',
    'Genre',
    'Developer',
    'Publisher',
    'Playtime_Hours',
    'Is_Installed',
    'Notes'
  ]

  const sampleRows = [
    [
      'The Witcher 3: Wild Hunt',
      'Steam',
      'completed',
      'RPG, Action',
      'CD PROJEKT RED',
      'CD PROJEKT RED',
      120,
      true,
      'Main story + Blood & Wine complete'
    ],
    [
      'Ghostwire Tokyo',
      'Epic Games',
      'unplayed',
      'Action, Supernatural',
      'Tango Gameworks',
      'Bethesda Softworks',
      0,
      false,
      'Uninstalled backlog from Epic giveaway'
    ],
    [
      'Hades',
      'Steam',
      'playing',
      'Roguelike, Action',
      'Supergiant Games',
      'Supergiant Games',
      45,
      true,
      'Currently on heat level 8'
    ],
  ]

  const wsData = [headers, ...sampleRows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  ws['!cols'] = [
    { wch: 30 },
    { wch: 15 },
    { wch: 12 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 35 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Logpile Catalog')

  if (format === 'csv') {
    return Buffer.from(XLSX.utils.sheet_to_csv(ws), 'utf8')
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

module.exports = { importCatalog, importCatalogFromBuffer, generateBlankTemplateBuffer, parseRow, inferPlatform, inferStoreName, autoLabelCustomStore, parsePlayTime, parseBacklogStatus, parseRating, parseBoolean, normalizeHeader }
