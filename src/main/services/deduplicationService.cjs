const crypto = require('node:crypto')
const { isUtilityTitle, isHiddenByDefaultTitle, isDlcTitle, isDlcException } = require('./utilityRules.cjs')

function id() { return crypto.randomUUID() }

const TITLE_SUFFIXES = [
  'xbox game studios',
  'standard edition',
  'definitive edition',
  'game of the year edition',
  'game of the year',
  'goty edition',
  'goty',
  'master assassin edition',
  'master assassin',
  'gold edition',
  'legacy collection',
  'directors cut',
  'director s cut',
  'enhanced edition directors cut',
  'enhanced edition director s cut',
  'enhanced edition',
  'enhanced',
  'premium edition',
  'special edition',
  'anniversary edition',
  '20th anniversary edition',
  'legendary edition',
  'challenger edition',
  'rampage edition',
  'premier edition',
  'collector s edition',
  'collectors edition',
  'the collection',
  'handsome collection',
  'amazon prime',
  'amazon luna',
  'epic games',
  'windows',
  'steam',
  'pc'
]

const PUBLISHER_PREFIXES = [
  'deep silver',
  'bethesda softworks',
  'bethesda',
  'warner bros games',
  'warner bros interactive entertainment',
  'warner bros',
  'wb games',
  'koch media',
  'plaion',
  'xbox game studios',
  'microsoft studios',
  '2k games',
  '2k',
  'square enix',
  'bandai namco entertainment',
  'bandai namco',
  'focus home interactive',
  'focus entertainment',
  'thq nordic',
  'thq',
  'ubisoft entertainment',
  'ubisoft',
  'electronic arts',
  'ea games',
  'ea',
  'capcom',
  'konami',
  'sega'
]

function cleanTitlePrefixes(rawTitle) {
  if (!rawTitle) return ''
  let title = String(rawTitle).trim()
  if (/^(?:deep\s*silver\s*)?project\s*windfall$/i.test(title)) {
    return 'Metro Exodus'
  }
  for (const pub of PUBLISHER_PREFIXES) {
    const regex = new RegExp(`^${pub.replace(/\./g, '\\.')}\\s*[-:–—]?\\s+`, 'i')
    if (regex.test(title)) {
      title = title.replace(regex, '').trim()
      break
    }
  }
  title = title.replace(/\s*Xbox\s*Game\s*Studios$/i, '').trim()
  title = title.replace(/^Metro-\s*/i, 'Metro: ')
  return title
}

function normalizeCanonicalTitle(title) {
  let value = String(title || '')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/\s*\((pc|windows|mac|linux)\)\s*/gi, ' ')
    .replace(/\b(legacy collection|bundle|edition)\s*\(\d{4}\)/gi, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (/^(?:deep\s*silver\s*)?project\s*windfall$/i.test(value)) {
    value = 'metro exodus'
  }

  for (const pub of PUBLISHER_PREFIXES) {
    if (value.startsWith(pub + ' ')) {
      value = value.slice(pub.length + 1).trim()
      break
    }
  }

  let changed = true
  while (changed && value) {
    changed = false
    for (const suffix of TITLE_SUFFIXES) {
      if (value === suffix) continue
      const marker = ` ${suffix}`
      if (value.endsWith(marker)) {
        value = value.slice(0, -marker.length).trim()
        changed = true
        break
      }
    }
  }
  return value.replace(/\b(game of the year|goty|definitive|ultimate|complete|deluxe|standard|edition|remastered|remaster|enhanced|digital|director s cut|directors cut|gold|legacy collection|master assassin|premium)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '')
}

function getEditionTierScore(title) {
  const t = String(title || '').toLowerCase()
  if (/\b(?:master assassin|ultimate|complete|collector'?s|legacy collection|handsome collection)\b/i.test(t)) return 5
  if (/\b(?:game of the year|goty|gold|golden|director'?s cut|enhanced edition)\b/i.test(t)) return 4
  if (/\b(?:deluxe|premium|special|anniversary|remastered|remaster|definitive|challenger|rampage|premier)\b/i.test(t)) return 3
  if (/\b(?:enhanced|digital)\b/i.test(t)) return 2
  return 1
}

function clean(value) { return value === undefined || value === null ? null : String(value).trim() || null }
function normalizeRecordPlatform(platform) {
  const value = String(platform || '').trim().toLowerCase()
  return ['steam', 'epic', 'gog'].includes(value) ? value : 'custom'
}
function normalizeStoreName(name) {
  const cleanName = clean(name)
  if (!cleanName) return null
  const lower = cleanName.toLowerCase()
  if (lower === 'ea' || lower === 'ea games' || lower === 'origin' || lower === 'origin2') return 'EA Games'
  if (lower === 'ubisoft' || lower === 'uplay') return 'Ubisoft'
  if (lower === 'epic' || lower === 'epic games') return 'Epic Games'
  if (lower === 'gog' || lower === 'gog galaxy') return 'GOG'
  if (lower === 'steam') return 'Steam'
  if (lower === 'xbox' || lower === 'microsoft' || lower === 'ms-xbl' || lower === 'ms-windows-store') return 'Xbox'
  if (lower === 'repack') return 'Repack'
  if (lower === 'amazon' || lower === 'amazon games') return 'Amazon Games'
  if (lower === 'battlenet' || lower === 'battle.net') return 'Battle.net'
  if (lower === 'itch' || lower === 'itch.io') return 'Itch.io'
  return cleanName
}

function recordStoreName(record) {
  const explicit = clean(record.storeName) || clean(record.store)
  if (explicit) return normalizeStoreName(explicit)
  const raw = clean(record.platform)
  if (raw && !['steam', 'epic', 'gog', 'custom'].includes(raw.toLowerCase())) {
    return normalizeStoreName(raw)
  }
  return null
}

function isTitleFallbackId(platformGameId, canonicalTitle) {
  const value = clean(platformGameId)
  if (!value) return true
  return normalizeCanonicalTitle(value) === normalizeCanonicalTitle(canonicalTitle)
}

function sourceIdSource(record, canonicalTitle) {
  return clean(record.idSource) || clean(record.platformIdSource) || (isTitleFallbackId(record.platformGameId, canonicalTitle) ? 'title-fallback' : 'imported')
}

function logIdConflict({ canonicalTitle, platform, existingId, incomingId, incomingSource }) {
  try { console.warn(`[logpile ID CONFLICT] ${platform} · ${canonicalTitle} · existing=${existingId} · scanner=${incomingId} · source=${incomingSource}`) } catch { /* Logging must never interrupt ingestion. */ }
}

function autoHideEnabled(db) {
  try { return db.prepare("SELECT value FROM app_settings WHERE key = 'auto_hide_support_entries'").get()?.value !== '0' } catch { return true }
}

function findMatchingGame(db, record) {
  const normalized = normalizeCanonicalTitle(record.canonicalTitle)
  const direct = db.prepare('SELECT * FROM games WHERE normalized_title = ? LIMIT 1').get(normalized)
  if (direct) return direct
  const candidates = db.prepare('SELECT id, canonical_title FROM games').all()
  const matched = candidates.find((candidate) => normalizeCanonicalTitle(candidate.canonical_title) === normalized)
  return matched ? db.prepare('SELECT * FROM games WHERE id = ?').get(matched.id) : null
}

function mergeRecord(db, record) {
  const canonicalTitle = cleanTitlePrefixes(clean(record.canonicalTitle) || 'Untitled')
  const normalized = normalizeCanonicalTitle(canonicalTitle)
  let game = findMatchingGame(db, record)
  let created = false
  let sourceLinked = false
  const strictUtility = isUtilityTitle(canonicalTitle) ? 1 : 0
  const strictDlc = isDlcTitle(canonicalTitle) ? 1 : 0
  const isException = isDlcException(canonicalTitle) ? 1 : 0
  const strictHidden = autoHideEnabled(db) && isHiddenByDefaultTitle(canonicalTitle) ? 1 : 0
  if (!game) {
    const gameId = id()
    db.prepare(`INSERT INTO games (
      id, canonical_title, normalized_title, description, genre, genres, purchase_price, developer, publisher, release_date,
      cover_url, hero_url, logo_url, store_name, executable_path, steamgriddb_id, is_installed, drive_letter, install_path, install_size_bytes, play_time_seconds,
      last_played, backlog_status, user_rating, is_favorite, is_utility, is_dlc, is_hidden, hidden_reason, drive_status
    ) VALUES (@id, @canonicalTitle, @normalizedTitle, @description, @genre, @genres, @price, @developer, @publisher, @releaseDate,
      @coverUrl, @heroUrl, @logoUrl, @storeName, @executablePath, @steamGridDbId, @isInstalled, @driveLetter, @installPath, @installSizeBytes, @playTimeSeconds,
      @lastPlayed, @backlogStatus, @userRating, @isFavorite, @isUtility, @isDlc, @isHidden, @hiddenReason, @driveStatus)`).run({
      id: gameId,
      canonicalTitle,
      normalizedTitle: normalized,
      description: clean(record.description),
      genre: clean(record.genre) || clean(record.genres),
      genres: clean(record.genres) || clean(record.genre),
      price: Number(record.price || 0),
      developer: clean(record.developer),
      publisher: clean(record.publisher),
      releaseDate: clean(record.releaseDate),
      coverUrl: clean(record.coverUrl),
      heroUrl: clean(record.heroUrl),
      logoUrl: clean(record.logoUrl),
      storeName: recordStoreName(record),
      executablePath: clean(record.executablePath) || clean(record.executable) || null,
      steamGridDbId: clean(record.steamGridDbId) || clean(record.steamgriddbId) || null,
      isInstalled: record.isInstalled ? 1 : 0,
      driveLetter: clean(record.driveLetter),
      installPath: clean(record.installPath),
      installSizeBytes: Number(record.installSizeBytes || 0),
      playTimeSeconds: Number(record.playTimeSeconds || 0),
      lastPlayed: clean(record.lastPlayed),
      backlogStatus: record.backlogStatus || (Number(record.playTimeSeconds || 0) > 0 ? 'playing' : 'unplayed'),
      userRating: Number(record.userRating || 0),
      isFavorite: record.isFavorite ? 1 : 0,
      isUtility: (record.isUtility || strictUtility) ? 1 : 0,
      isDlc: (!isException && (record.isDlc || strictDlc)) ? 1 : 0,
      isHidden: (record.isHidden || strictHidden) ? 1 : 0,
      hiddenReason: record.hiddenReason || (strictHidden ? 'support-component-or-addon' : null),
      driveStatus: record.driveStatus || 'online',
    })
    game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId)
    created = true
  } else {
    const incomingTier = getEditionTierScore(canonicalTitle)
    const existingTier = getEditionTierScore(game.canonical_title)
    const existingHasPub = PUBLISHER_PREFIXES.some(p => String(game.canonical_title || '').toLowerCase().startsWith(p))
    const incomingHasPub = PUBLISHER_PREFIXES.some(p => String(canonicalTitle || '').toLowerCase().startsWith(p))

    let preferIncomingTitle = 0
    if (existingHasPub && !incomingHasPub) {
      preferIncomingTitle = 1
    } else if (incomingHasPub && !existingHasPub) {
      preferIncomingTitle = 0
    } else if (incomingTier > existingTier) {
      preferIncomingTitle = 1
    } else if (incomingTier === existingTier && canonicalTitle.length > String(game.canonical_title || '').length) {
      preferIncomingTitle = 1
    }

    db.prepare(`UPDATE games SET
      canonical_title = CASE WHEN @preferIncomingTitle = 1 THEN @canonicalTitle ELSE canonical_title END,
      store_name = CASE WHEN @preferIncomingTitle = 1 AND NULLIF(@storeName, '') IS NOT NULL THEN @storeName ELSE store_name END,
      cover_url = CASE WHEN @preferIncomingTitle = 1 AND NULLIF(@coverUrl, '') IS NOT NULL THEN @coverUrl ELSE cover_url END,
      hero_url = CASE WHEN @preferIncomingTitle = 1 AND NULLIF(@heroUrl, '') IS NOT NULL THEN @heroUrl ELSE hero_url END,
      steamgriddb_id = CASE WHEN @preferIncomingTitle = 1 AND NULLIF(@steamGridDbId, '') IS NOT NULL THEN @steamGridDbId ELSE steamgriddb_id END,
      normalized_title = COALESCE(NULLIF(@normalizedTitle, ''), normalized_title),
      description = COALESCE(NULLIF(@description, ''), description),
      genre = COALESCE(NULLIF(@genre, ''), genre),
      genres = COALESCE(NULLIF(@genres, ''), genres),
      purchase_price = CASE WHEN @price > 0 THEN @price ELSE purchase_price END,
      developer = COALESCE(NULLIF(@developer, ''), developer),
      publisher = COALESCE(NULLIF(@publisher, ''), publisher),
      release_date = COALESCE(NULLIF(@releaseDate, ''), release_date),
      executable_path = COALESCE(NULLIF(@executablePath, ''), executable_path),
      is_installed = CASE WHEN @isInstalled = 1 THEN 1 ELSE is_installed END,
      drive_letter = CASE WHEN @isInstalled = 1 AND NULLIF(@driveLetter, '') IS NOT NULL THEN @driveLetter ELSE COALESCE(NULLIF(@driveLetter, ''), drive_letter) END,
      install_path = CASE WHEN @isInstalled = 1 AND NULLIF(@installPath, '') IS NOT NULL THEN @installPath ELSE COALESCE(NULLIF(@installPath, ''), install_path) END,
      install_size_bytes = CASE WHEN @installSizeBytes > 0 THEN @installSizeBytes ELSE install_size_bytes END,
      play_time_seconds = CASE WHEN @playTimeSeconds > 0 THEN @playTimeSeconds ELSE play_time_seconds END,
      last_played = COALESCE(NULLIF(@lastPlayed, ''), last_played),
      backlog_status = CASE WHEN @backlogStatusExplicit = 1 THEN @backlogStatus WHEN @derivedPlaying = 1 AND backlog_status = 'unplayed' THEN 'playing' ELSE backlog_status END,
      user_rating = CASE WHEN @userRating > 0 THEN @userRating ELSE user_rating END,
      is_utility = CASE WHEN @strictDlc = 1 THEN 0 WHEN @isUtility = 1 OR @strictUtility = 1 THEN 1 ELSE is_utility END,
      is_dlc = CASE WHEN @isException = 1 THEN 0 WHEN @isDlc = 1 OR @strictDlc = 1 THEN 1 ELSE is_dlc END,
      is_hidden = CASE WHEN @isHidden = 1 OR (@strictHidden = 1 AND @autoHideSupportEntries = 1 AND COALESCE(hidden_reason, '') <> 'user-visible') THEN 1 ELSE is_hidden END,
      hidden_reason = CASE WHEN @isHidden = 1 OR (@strictHidden = 1 AND @autoHideSupportEntries = 1 AND COALESCE(hidden_reason, '') <> 'user-visible') THEN COALESCE(NULLIF(@hiddenReason, ''), 'support-component-or-addon') ELSE hidden_reason END,
      drive_status = CASE WHEN @isInstalled = 1 THEN @driveStatus ELSE drive_status END,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = @id`).run({
      id: game.id,
      canonicalTitle,
      preferIncomingTitle,
      normalizedTitle: normalized,
      description: clean(record.description) || '',
      genre: clean(record.genre) || clean(record.genres) || '',
      genres: clean(record.genres) || clean(record.genre) || '',
      price: Number(record.price || 0),
      developer: clean(record.developer) || '',
      publisher: clean(record.publisher) || '',
      releaseDate: clean(record.releaseDate) || '',
      coverUrl: clean(record.coverUrl) || '',
      heroUrl: clean(record.heroUrl) || '',
      logoUrl: clean(record.logoUrl) || '',
      storeName: recordStoreName(record) || '',
      executablePath: clean(record.executablePath) || clean(record.executable) || '',
      steamGridDbId: clean(record.steamGridDbId) || clean(record.steamgriddbId) || '',
      isInstalled: record.isInstalled ? 1 : 0,
      driveLetter: clean(record.driveLetter) || '',
      installPath: clean(record.installPath) || '',
      installSizeBytes: Number(record.installSizeBytes || 0),
      playTimeSeconds: Number(record.playTimeSeconds || 0),
      lastPlayed: clean(record.lastPlayed) || '',
      backlogStatusExplicit: record.backlogStatus ? 1 : 0,
      backlogStatus: record.backlogStatus || 'unplayed',
      derivedPlaying: Number(record.playTimeSeconds || 0) > 0 ? 1 : 0,
      userRating: Number(record.userRating || 0),
      isUtility: record.isUtility ? 1 : 0,
      strictUtility,
      isDlc: record.isDlc ? 1 : 0,
      strictDlc,
      isException,
      isHidden: record.isHidden ? 1 : 0,
      strictHidden,
      autoHideSupportEntries: autoHideEnabled(db) ? 1 : 0,
      hiddenReason: clean(record.hiddenReason) || '',
      driveStatus: record.driveStatus || 'online',
    })
    game = db.prepare('SELECT * FROM games WHERE id = ?').get(game.id)
  }
  const platform = normalizeRecordPlatform(record.platform)
  const platformGameId = clean(record.platformGameId) || canonicalTitle
  const platformLaunchId = clean(record.platformLaunchId) || platformGameId
  const idSource = sourceIdSource(record, canonicalTitle)
  const existingSources = db.prepare('SELECT * FROM game_sources WHERE game_id = ?').all(game.id)
  const exactSource = existingSources.find((source) => source.platform === platform && source.platform_game_id === platformGameId)
  const existingPlatform = existingSources.find((source) => source.platform === platform)
  const replaceableSource = existingSources.find((source) => source.platform === platform && (isTitleFallbackId(source.platform_game_id, canonicalTitle) || isTitleFallbackId(source.platform_launch_id, canonicalTitle) || source.id_source === 'title-fallback'))
  if (exactSource) {
    db.prepare("UPDATE game_sources SET platform_launch_id = CASE WHEN ? = 'epic' AND ? <> '' THEN ? ELSE COALESCE(NULLIF(platform_launch_id, ''), ?) END, id_source = CASE WHEN COALESCE(id_source, '') IN ('', 'unknown') THEN ? ELSE id_source END, launch_uri = COALESCE(NULLIF(?, ''), launch_uri), install_uri = COALESCE(NULLIF(?, ''), install_uri), play_time_seconds = CASE WHEN ? > 0 THEN ? ELSE play_time_seconds END, source_name = COALESCE(NULLIF(?, ''), source_name) WHERE id = ?").run(platform, platformLaunchId, platformLaunchId, platformLaunchId, idSource, record.launchUri || '', record.installUri || '', Number(record.playTimeSeconds || 0), Number(record.playTimeSeconds || 0), recordStoreName(record) || '', exactSource.id)
  } else if (replaceableSource && !isTitleFallbackId(platformGameId, canonicalTitle)) {
    db.prepare("UPDATE game_sources SET platform_game_id = ?, platform_launch_id = ?, id_source = ?, launch_uri = COALESCE(NULLIF(?, ''), launch_uri), install_uri = COALESCE(NULLIF(?, ''), install_uri), play_time_seconds = CASE WHEN ? > 0 THEN ? ELSE play_time_seconds END, source_name = COALESCE(NULLIF(?, ''), source_name) WHERE id = ?").run(platformGameId, platformLaunchId, idSource, record.launchUri || '', record.installUri || '', Number(record.playTimeSeconds || 0), Number(record.playTimeSeconds || 0), recordStoreName(record) || '', replaceableSource.id)
  } else if (existingSources.length && !isTitleFallbackId(platformGameId, canonicalTitle)) {
    const existingReal = existingSources.find((source) => !isTitleFallbackId(source.platform_game_id, canonicalTitle))
    if (existingReal && existingReal.platform_game_id !== platformGameId) {
      logIdConflict({ canonicalTitle, platform, existingId: existingReal.platform_game_id, incomingId: platformGameId, incomingSource: idSource })
      if (platform === 'epic' && idSource.startsWith('epic-manifest:') && platformLaunchId) {
        db.prepare("UPDATE game_sources SET platform_launch_id = ?, launch_uri = COALESCE(NULLIF(?, ''), launch_uri), install_uri = COALESCE(NULLIF(?, ''), install_uri) WHERE id = ?").run(platformLaunchId, record.launchUri || '', record.installUri || '', existingReal.id)
      }
    }
  } else if (!existingSources.length) {
    db.prepare(`INSERT INTO game_sources (id, game_id, platform, platform_game_id, platform_launch_id, id_source, launch_uri, install_uri, play_time_seconds, source_name, ownership_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'owned')`).run(id(), game.id, platform, platformGameId, platformLaunchId, idSource, record.launchUri || null, record.installUri || null, Number(record.playTimeSeconds || 0), recordStoreName(record))
    sourceLinked = Boolean(existingPlatform)
  }
  const sourceTotal = db.prepare('SELECT COALESCE(SUM(play_time_seconds), 0) AS total FROM game_sources WHERE game_id = ?').get(game.id).total
  if (sourceTotal > 0) db.prepare("UPDATE games SET play_time_seconds = ?, backlog_status = CASE WHEN backlog_status = 'unplayed' THEN 'playing' ELSE backlog_status END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(sourceTotal, game.id)
  return { created, updated: !created, sourceLinked, multiPlatformDuplicate: sourceLinked }
}

async function mergeRecords(db, records, chunkSize = 50) {
  const summary = { created: 0, updated: 0, linked: 0, multiPlatformDuplicates: 0 }
  const allRecords = Array.isArray(records) ? records : []
  if (!allRecords.length || !db) return summary

  const chunkTransaction = db.transaction((chunk) => {
    for (const record of chunk) {
      if (!record?.canonicalTitle) continue
      const result = mergeRecord(db, record)
      if (result.created) summary.created += 1
      if (result.updated) summary.updated += 1
      if (result.sourceLinked) {
        summary.linked += 1
        if (result.multiPlatformDuplicate) summary.multiPlatformDuplicates += 1
      }
    }
  })

  for (let i = 0; i < allRecords.length; i += chunkSize) {
    const chunk = allRecords.slice(i, i + chunkSize)
    chunkTransaction(chunk)

    // Yield to the libuv event loop so UI / IPC messages can be processed
    if (i + chunkSize < allRecords.length) {
      await new Promise((resolve) => setImmediate(resolve))
    }
  }

  return summary
}

module.exports = { mergeRecords, mergeRecord, normalizeCanonicalTitle, cleanTitlePrefixes }
