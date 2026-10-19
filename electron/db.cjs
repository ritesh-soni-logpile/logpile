const Database = require('better-sqlite3')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { fileURLToPath } = require('node:url')
const { isUtilityTitle, isHiddenByDefaultTitle, isDlcTitle, isDlcException } = require('../src/main/services/utilityRules.cjs')
const { normalizeCanonicalTitle, cleanTitlePrefixes } = require('../src/main/services/deduplicationService.cjs')

function normalizeTitle(title) {
  return normalizeCanonicalTitle(title)
}

const PLATFORM_NAMES = new Set(['steam', 'epic', 'gog', 'custom'])
const SORT_FIELDS = new Set(['canonical_title', 'updated_at', 'install_size_bytes', 'last_played'])

function id() {
  return crypto.randomUUID()
}

function platformKeySql(column) {
  return `CASE
    WHEN LOWER(REPLACE(REPLACE(${column}, ' ', ''), '-', '')) LIKE 'steam%' THEN 'steam'
    WHEN LOWER(REPLACE(REPLACE(${column}, ' ', ''), '-', '')) LIKE 'epic%' THEN 'epic'
    WHEN LOWER(REPLACE(REPLACE(${column}, ' ', ''), '-', '')) LIKE 'gog%' THEN 'gog'
    ELSE 'custom'
  END`
}


function enforceUtilityClassification(db) {
  const update = db.prepare('UPDATE games SET is_utility = CASE WHEN @isUtility = 1 THEN 1 ELSE is_utility END, is_dlc = CASE WHEN @isUtility = 1 THEN 0 ELSE is_dlc END WHERE id = @id')
  const games = db.prepare('SELECT id, canonical_title FROM games').all()
  const migrate = db.transaction(() => {
    for (const game of games) update.run({ id: game.id, isUtility: isUtilityTitle(game.canonical_title) ? 1 : 0 })
  })
  migrate()
}

function enforceDlcClassification(db) {
  const update = db.prepare('UPDATE games SET is_dlc = @isDlc, is_utility = CASE WHEN @isDlc = 1 THEN 0 ELSE is_utility END WHERE id = @id')
  const games = db.prepare('SELECT id, canonical_title, is_dlc FROM games').all()
  const migrate = db.transaction(() => {
    for (const game of games) {
      const rawTitle = game.canonical_title || ''
      // If standalone sequel exception (Silent Hill, Evil Within, Metro base games), enforce is_dlc = 0
      if (isDlcException(rawTitle)) {
        if (game.is_dlc !== 0) {
          update.run({ id: game.id, isDlc: 0 })
        }
      } else if (isDlcTitle(rawTitle)) {
        if (game.is_dlc !== 1) {
          update.run({ id: game.id, isDlc: 1 })
        }
      }
    }
  })
  migrate()
}

function cleanupLegacyGameRecords(db) {
  try {
    const games = db.prepare("SELECT id, canonical_title, drive_letter, install_path FROM games WHERE canonical_title LIKE 'Deep Silver %' OR canonical_title LIKE '%Project Windfall%' OR canonical_title LIKE '%Xbox Game Studios%' OR (install_path IS NOT NULL AND drive_letter = 'C:' AND install_path NOT LIKE 'C:%')").all()
    if (!games || !games.length) return
    const update = db.prepare('UPDATE games SET canonical_title = @title, normalized_title = @norm, drive_letter = @drive WHERE id = @id')
    const migrate = db.transaction(() => {
      for (const g of games) {
        const cleaned = cleanTitlePrefixes ? cleanTitlePrefixes(g.canonical_title) : g.canonical_title
        const norm = normalizeCanonicalTitle(cleaned)
        let drive = g.drive_letter
        if (g.install_path && /^[a-zA-Z]:[/\\]/i.test(g.install_path)) {
          drive = `${g.install_path.charAt(0).toUpperCase()}:`
        }
        if (cleaned !== g.canonical_title || drive !== g.drive_letter) {
          update.run({ id: g.id, title: cleaned, norm, drive })
        }
      }
    })
    migrate()
  } catch (err) {
    console.warn('[DB] cleanupLegacyGameRecords warning:', err?.message)
  }
}

function getAppSetting(db, key, fallback = null) {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key)
  return row ? row.value : fallback
}

function autoHideSupportEntriesEnabled(db) {
  return getAppSetting(db, 'auto_hide_support_entries', '1') !== '0'
}

function enforceHiddenClassification(db) {
  if (!autoHideSupportEntriesEnabled(db)) {
    db.prepare("UPDATE games SET is_hidden = 0, hidden_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE hidden_reason = 'support-component-or-addon'").run()
    return
  }
  const update = db.prepare('UPDATE games SET is_hidden = 1, hidden_reason = @reason WHERE id = @id AND is_hidden = 0 AND COALESCE(hidden_reason, \'\') <> \'user-visible\'')
  const games = db.prepare("SELECT id, canonical_title FROM games WHERE is_hidden = 0 AND COALESCE(hidden_reason, '') <> 'user-visible'").all()
  const migrate = db.transaction(() => {
    for (const game of games) {
      if (isHiddenByDefaultTitle(game.canonical_title)) update.run({ id: game.id, reason: 'support-component-or-addon' })
    }
  })
  migrate()
}

function getSqliteNativeBinding() {
  const abi = process.versions?.modules
  const candidates = [
    abi ? path.join(__dirname, 'bin', `better_sqlite3_v${abi}.node`) : null,
    path.join(__dirname, 'bin', 'better_sqlite3.node'),
    path.join(__dirname, '..', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {}
  }
  return null
}

function openDatabase(dbPath, options = {}) {
  const binding = getSqliteNativeBinding()
  const dbOptions = { ...options }
  if (binding && !dbOptions.nativeBinding) {
    dbOptions.nativeBinding = binding
  }
  return new Database(dbPath, dbOptions)
}

function createDatabase(dbPath) {
  const db = openDatabase(dbPath)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      canonical_title TEXT NOT NULL,
      normalized_title TEXT NOT NULL,
      description TEXT,
      genre TEXT,
      genres TEXT,
      purchase_price REAL DEFAULT 0,
      developer TEXT,
      publisher TEXT,
      release_date TEXT,
      cover_url TEXT,
      hero_url TEXT,
      logo_url TEXT,
      store_name TEXT,
      executable_path TEXT,
      launch_arguments TEXT,
      tags TEXT,
      steamgriddb_id TEXT,
      metadata_sync_status TEXT DEFAULT 'pending',
      is_installed INTEGER DEFAULT 0,
      drive_letter TEXT,
      install_path TEXT,
      install_size_bytes INTEGER DEFAULT 0,
      play_time_seconds INTEGER DEFAULT 0,
      last_played TEXT,
      backlog_status TEXT DEFAULT 'unplayed' CHECK(backlog_status IN ('unplayed', 'playing', 'completed', 'dropped')),
      status TEXT DEFAULT 'unplayed' CHECK(status IN ('unplayed', 'playing', 'paused', 'completed')),
      completed_at TEXT,
      user_rating REAL DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      is_utility INTEGER DEFAULT 0,
      is_dlc INTEGER DEFAULT 0,
      is_hidden INTEGER DEFAULT 0,
      hidden_reason TEXT,
      drive_status TEXT DEFAULT 'online' CHECK(drive_status IN ('online', 'offline')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS game_sources (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      platform TEXT NOT NULL CHECK(platform IN ('steam', 'epic', 'gog', 'custom')),
      platform_game_id TEXT NOT NULL,
      platform_launch_id TEXT,
      id_source TEXT DEFAULT 'unknown',
      launch_uri TEXT,
      install_uri TEXT,
      play_time_seconds INTEGER DEFAULT 0,
      source_name TEXT,
      ownership_status TEXT DEFAULT 'owned',
      FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_games_canonical_title ON games(canonical_title);
    CREATE INDEX IF NOT EXISTS idx_games_normalized_title ON games(normalized_title);
    CREATE INDEX IF NOT EXISTS idx_games_is_installed ON games(is_installed);
    CREATE INDEX IF NOT EXISTS idx_games_is_utility ON games(is_utility);
    CREATE INDEX IF NOT EXISTS idx_sources_game_id ON game_sources(game_id);
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      game_id INTEGER,
      timestamp INTEGER,
      details TEXT
    );
    CREATE TABLE IF NOT EXISTS user_captures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      caption TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_captures_game_id ON user_captures(game_id);
  `)
  db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('auto_hide_support_entries', '1')").run()
  const activityCols = db.prepare('PRAGMA table_info(activity_log)').all().map((c) => c.name)
  if (!activityCols.includes('event_type')) db.exec("ALTER TABLE activity_log ADD COLUMN event_type TEXT NOT NULL DEFAULT 'scan'")
  if (!activityCols.includes('game_id')) db.exec('ALTER TABLE activity_log ADD COLUMN game_id INTEGER')
  if (!activityCols.includes('timestamp')) {
    db.exec('ALTER TABLE activity_log ADD COLUMN timestamp INTEGER')
    if (activityCols.includes('created_at')) {
      db.exec("UPDATE activity_log SET timestamp = CAST(strftime('%s', created_at) AS INTEGER) * 1000 WHERE timestamp IS NULL")
    }
  }
  if (!activityCols.includes('details')) {
    db.exec('ALTER TABLE activity_log ADD COLUMN details TEXT')
    if (activityCols.includes('details_json')) {
      db.exec('UPDATE activity_log SET details = details_json WHERE details IS NULL')
    }
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp DESC)')
  const columns = db.prepare('PRAGMA table_info(games)').all().map((column) => column.name)
  const sourceColumns = db.prepare('PRAGMA table_info(game_sources)').all().map((column) => column.name)
  if (!sourceColumns.includes('platform_launch_id')) db.exec('ALTER TABLE game_sources ADD COLUMN platform_launch_id TEXT')
  if (!sourceColumns.includes('id_source')) db.exec("ALTER TABLE game_sources ADD COLUMN id_source TEXT DEFAULT 'unknown'")
  if (!sourceColumns.includes('play_time_seconds')) db.exec('ALTER TABLE game_sources ADD COLUMN play_time_seconds INTEGER DEFAULT 0')
  if (!sourceColumns.includes('source_name')) db.exec('ALTER TABLE game_sources ADD COLUMN source_name TEXT')
  if (!columns.includes('genre')) db.exec('ALTER TABLE games ADD COLUMN genre TEXT')
  if (!columns.includes('genres')) db.exec('ALTER TABLE games ADD COLUMN genres TEXT')
  if (!columns.includes('is_dlc')) db.exec('ALTER TABLE games ADD COLUMN is_dlc INTEGER DEFAULT 0')
  if (!columns.includes('purchase_price')) db.exec('ALTER TABLE games ADD COLUMN purchase_price REAL DEFAULT 0')
  if (!columns.includes('logo_url')) db.exec('ALTER TABLE games ADD COLUMN logo_url TEXT')
  if (!columns.includes('store_name')) db.exec('ALTER TABLE games ADD COLUMN store_name TEXT')
  if (!columns.includes('executable_path')) db.exec('ALTER TABLE games ADD COLUMN executable_path TEXT')
  if (!columns.includes('launch_arguments')) db.exec('ALTER TABLE games ADD COLUMN launch_arguments TEXT')
  if (!columns.includes('tags')) db.exec('ALTER TABLE games ADD COLUMN tags TEXT')
  if (!columns.includes('steamgriddb_id')) db.exec('ALTER TABLE games ADD COLUMN steamgriddb_id TEXT')
  if (!columns.includes('metadata_sync_status')) db.exec("ALTER TABLE games ADD COLUMN metadata_sync_status TEXT DEFAULT 'pending'")
  if (!columns.includes('is_hidden')) db.exec('ALTER TABLE games ADD COLUMN is_hidden INTEGER DEFAULT 0')
  if (!columns.includes('hidden_reason')) db.exec('ALTER TABLE games ADD COLUMN hidden_reason TEXT')
  if (!columns.includes('status')) db.exec("ALTER TABLE games ADD COLUMN status TEXT DEFAULT 'unplayed'")
  if (!columns.includes('completed_at')) db.exec('ALTER TABLE games ADD COLUMN completed_at TEXT')
  try {
    db.prepare("UPDATE games SET status = COALESCE(NULLIF(status, ''), backlog_status, 'unplayed') WHERE status IS NULL OR status = ''").run()
  } catch {}
  db.exec('CREATE INDEX IF NOT EXISTS idx_games_is_dlc ON games(is_dlc)')
  enforceUtilityClassification(db)
  enforceHiddenClassification(db)
  db.prepare("UPDATE games SET genres = genre WHERE (genres IS NULL OR TRIM(genres) = '') AND genre IS NOT NULL AND TRIM(genre) <> ''").run()
  cleanupLegacyGameRecords(db)
  enforceDlcClassification(db)
  return db
}

function seedIfEmpty(db) {
  const count = db?.prepare ? (db.prepare('SELECT COUNT(*) AS count FROM games').get()?.count || 0) : 0
  return { seeded: false, count }
}

function getGames(db, filters = {}, sort = {}) {
  const where = []
  const params = {}
  if (filters.search) {
    where.push('(g.canonical_title LIKE @search OR g.developer LIKE @search)')
    params.search = `%${String(filters.search).slice(0, 80)}%`
  }
  if (filters.installed === true || filters.installed === false) {
    where.push('g.is_installed = @installed')
    params.installed = filters.installed ? 1 : 0
  }
  if (filters.missingArtwork === true) {
    where.push("(NULLIF(TRIM(g.cover_url), '') IS NULL OR LOWER(TRIM(g.cover_url)) IN ('null', 'undefined') OR LOWER(TRIM(g.cover_url)) LIKE '%.svg')")
  }
  if (filters.missingIds === true) {
    where.push("(NULLIF(TRIM(g.steamgriddb_id), '') IS NULL OR LOWER(TRIM(g.steamgriddb_id)) IN ('null', 'undefined'))")
  }
  if (filters.utility === true) {
    where.push('g.is_utility = 1')
  } else if (filters.dlc === true) {
    where.push('g.is_utility = 0')
    where.push('g.is_dlc = 1')
  } else {
    where.push('g.is_utility = 0')
    if (!filters.includeDlc) where.push('g.is_dlc = 0')
  }
  if (!filters.includeHidden) where.push('g.is_hidden = 0')
  if (filters.platform && PLATFORM_NAMES.has(filters.platform)) {
    where.push(`EXISTS (SELECT 1 FROM game_sources filter_source WHERE filter_source.game_id = g.id AND ${platformKeySql('filter_source.platform')} = @platform)`)
    params.platform = filters.platform
  }
  const orderField = SORT_FIELDS.has(sort.field) ? sort.field : 'canonical_title'
  const direction = sort.direction === 'desc' ? 'DESC' : 'ASC'
  const rows = db.prepare(`
    SELECT g.*,
      COALESCE(json_group_array(json_object(
        'platform', ${platformKeySql('gs.platform')},
        'platformGameId', gs.platform_game_id,
        'platformLaunchId', gs.platform_launch_id,
        'idSource', gs.id_source,
        'launchUri', gs.launch_uri,
        'playTimeSeconds', gs.play_time_seconds,
        'sourceName', gs.source_name,
        'ownershipStatus', gs.ownership_status
      )), '[]') AS sources_json
    FROM games g
    LEFT JOIN game_sources gs ON gs.game_id = g.id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    GROUP BY g.id
    ORDER BY g.${orderField} ${direction}, g.canonical_title ASC
  `).all(params)
  return rows.map((row) => ({
    ...row,
    status: row.status || row.backlog_status || 'unplayed',
    completed_at: row.completed_at || null,
    is_installed: Boolean(row.is_installed),
    is_favorite: Boolean(row.is_favorite),
    is_utility: Boolean(row.is_utility),
    is_dlc: Boolean(row.is_dlc),
    is_hidden: Boolean(row.is_hidden),
    sources: JSON.parse(row.sources_json).filter((source) => source.platform !== null),
    install_size_gb: Number((row.install_size_bytes / (1024 ** 3)).toFixed(2)),
  }))
}

function setGameHidden(db, gameId, hidden) {
  const value = hidden ? 1 : 0
  const result = db.prepare("UPDATE games SET is_hidden = ?, hidden_reason = CASE WHEN ? = 1 THEN COALESCE(hidden_reason, 'manual') ELSE 'user-visible' END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(value, value, gameId)
  if (!result.changes) throw new Error('The selected game could not be updated.')
  return db.prepare('SELECT id, canonical_title, is_hidden, hidden_reason FROM games WHERE id = ?').get(gameId)
}

function updateGameStatus(db, gameId, status) {
  if (!gameId) throw new Error('Game ID is required')
  const allowed = ['unplayed', 'playing', 'paused', 'completed']
  const cleanStatus = String(status || '').trim().toLowerCase()
  if (!allowed.includes(cleanStatus)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${allowed.join(', ')}`)
  }

  const current = db.prepare('SELECT id, status, backlog_status, completed_at FROM games WHERE id = ?').get(gameId)
  if (!current) throw new Error(`Game not found: ${gameId}`)

  const completedAt = cleanStatus === 'completed'
    ? (current.completed_at || new Date().toISOString())
    : null

  const backlogVal = ['unplayed', 'playing', 'completed'].includes(cleanStatus)
    ? cleanStatus
    : (current.backlog_status === 'dropped' ? 'dropped' : 'playing')

  db.prepare(`
    UPDATE games SET
      status = ?,
      backlog_status = ?,
      completed_at = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(cleanStatus, backlogVal, completedAt, gameId)

  const updatedRow = db.prepare(`
    SELECT g.*,
      COALESCE(json_group_array(json_object(
        'platform', ${platformKeySql('gs.platform')},
        'platformGameId', gs.platform_game_id,
        'platformLaunchId', gs.platform_launch_id,
        'idSource', gs.id_source,
        'launchUri', gs.launch_uri,
        'playTimeSeconds', gs.play_time_seconds,
        'sourceName', gs.source_name,
        'ownershipStatus', gs.ownership_status
      )), '[]') AS sources_json
    FROM games g
    LEFT JOIN game_sources gs ON gs.game_id = g.id
    WHERE g.id = ?
    GROUP BY g.id
  `).get(gameId)

  if (!updatedRow) return db.prepare('SELECT * FROM games WHERE id = ?').get(gameId)

  return {
    ...updatedRow,
    status: updatedRow.status || updatedRow.backlog_status || 'unplayed',
    completed_at: updatedRow.completed_at || null,
    is_installed: Boolean(updatedRow.is_installed),
    is_favorite: Boolean(updatedRow.is_favorite),
    is_utility: Boolean(updatedRow.is_utility),
    is_dlc: Boolean(updatedRow.is_dlc),
    is_hidden: Boolean(updatedRow.is_hidden),
    sources: JSON.parse(updatedRow.sources_json).filter((source) => source.platform !== null),
    install_size_gb: Number((updatedRow.install_size_bytes / (1024 ** 3)).toFixed(2)),
  }
}

function getLibrarySettings(db) {
  const storedKey = getAppSetting(db, 'steamgriddb_api_key', '')
  const storedIgdbId = getAppSetting(db, 'igdb_client_id', '')
  const storedIgdbSecret = getAppSetting(db, 'igdb_client_secret', '')
  const storedHeroRes = getAppSetting(db, 'hero_resolution', '2.5k')
  const storedPreferAnimated = getAppSetting(db, 'prefer_animated_artwork', 'false')
  return {
    autoHideSupportEntries: Boolean(autoHideSupportEntriesEnabled(db)),
    steamGridDbApiKey: typeof storedKey === 'string' ? storedKey : '',
    igdbClientId: typeof storedIgdbId === 'string' ? storedIgdbId : '',
    igdbClientSecret: typeof storedIgdbSecret === 'string' ? storedIgdbSecret : '',
    heroResolution: typeof storedHeroRes === 'string' && storedHeroRes ? storedHeroRes : '2.5k',
    preferAnimatedArtwork: storedPreferAnimated === 'true' || storedPreferAnimated === '1',
  }
}

function setLibrarySettings(db, settings = {}) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Invalid library settings.')
  if (settings.autoHideSupportEntries !== undefined && typeof settings.autoHideSupportEntries !== 'boolean') throw new Error('Invalid auto-hide setting.')
  if (settings.steamGridDbApiKey !== undefined && (typeof settings.steamGridDbApiKey !== 'string' || settings.steamGridDbApiKey.length > 300)) throw new Error('Invalid SteamGridDB API key.')
  if (settings.igdbClientId !== undefined && (typeof settings.igdbClientId !== 'string' || settings.igdbClientId.length > 300)) throw new Error('Invalid IGDB Client ID.')
  if (settings.igdbClientSecret !== undefined && (typeof settings.igdbClientSecret !== 'string' || settings.igdbClientSecret.length > 300)) throw new Error('Invalid IGDB Client Secret.')
  if (settings.heroResolution !== undefined && typeof settings.heroResolution !== 'string') throw new Error('Invalid hero resolution.')
  if (settings.preferAnimatedArtwork !== undefined && typeof settings.preferAnimatedArtwork !== 'boolean') throw new Error('Invalid prefer-animated setting.')

  if (settings.autoHideSupportEntries !== undefined) db.prepare("INSERT INTO app_settings (key, value) VALUES ('auto_hide_support_entries', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(settings.autoHideSupportEntries ? '1' : '0')
  if (settings.steamGridDbApiKey !== undefined) db.prepare("INSERT INTO app_settings (key, value) VALUES ('steamgriddb_api_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(settings.steamGridDbApiKey).trim())
  if (settings.igdbClientId !== undefined) db.prepare("INSERT INTO app_settings (key, value) VALUES ('igdb_client_id', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(settings.igdbClientId).trim())
  if (settings.igdbClientSecret !== undefined) db.prepare("INSERT INTO app_settings (key, value) VALUES ('igdb_client_secret', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(settings.igdbClientSecret).trim())
  if (settings.heroResolution !== undefined) db.prepare("INSERT INTO app_settings (key, value) VALUES ('hero_resolution', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(settings.heroResolution).trim())
  if (settings.preferAnimatedArtwork !== undefined) db.prepare("INSERT INTO app_settings (key, value) VALUES ('prefer_animated_artwork', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(settings.preferAnimatedArtwork ? 'true' : 'false')

  if (settings.autoHideSupportEntries !== undefined) enforceHiddenClassification(db)
  return getLibrarySettings(db)
}

function updateGameMetadata(db, gameId, fields = {}) {
  if (typeof gameId !== 'string' || gameId.length < 1 || gameId.length > 120) throw new Error('Invalid game selection.')
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new Error('Invalid metadata update.')
  const current = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId)
  if (!current) throw new Error('The selected game could not be found.')
  const value = (key, limit) => fields[key] === undefined ? current[key] || '' : String(fields[key] || '').trim().slice(0, limit)
  const title = value('title', 240)
  if (!title) throw new Error('Title cannot be empty.')
  const description = value('description', 12000)
  const genres = value('genres', 500)
  const developer = value('developer', 500)
  const publisher = value('publisher', 500)
  const releaseDate = value('releaseDate', 120)
  const storeName = value('storeName', 120)
  const executablePath = value('executablePath', 1000)
  const launchArguments = value('launchArguments', 2000)
  const tags = value('tags', 500)
  const hasFavorite = fields.is_favorite !== undefined || fields.isFavorite !== undefined
  const isFavorite = hasFavorite ? (Boolean(fields.is_favorite ?? fields.isFavorite) ? 1 : 0) : (current.is_favorite ? 1 : 0)
  const hasBacklog = fields.backlog_status !== undefined || fields.backlogStatus !== undefined
  const backlogStatus = hasBacklog ? String(fields.backlog_status ?? fields.backlogStatus).trim().toLowerCase() : (current.backlog_status || 'unplayed')
  const hasSteamGridDbField = fields.steamGridDbId !== undefined || fields.steamgriddbId !== undefined
  const steamGridDbId = hasSteamGridDbField ? String(fields.steamGridDbId ?? fields.steamgriddbId ?? '').trim().slice(0, 120) : String(current.steamgriddb_id || '')
  const steamGridDbIdChanged = hasSteamGridDbField && steamGridDbId !== String(current.steamgriddb_id || '')
  const explicitCover = fields.coverUrl !== undefined || fields.cover_url !== undefined ? String(fields.coverUrl ?? fields.cover_url ?? '').trim() : null
  if (executablePath && !/\.exe$/i.test(executablePath)) throw new Error('Executable path must point to a .exe file.')
  db.prepare(`UPDATE games SET
    canonical_title = @title,
    normalized_title = @normalizedTitle,
    description = @description,
    genres = @genres,
    genre = @genres,
    developer = @developer,
    publisher = @publisher,
    release_date = @releaseDate,
    store_name = @storeName,
    executable_path = @executablePath,
    launch_arguments = @launchArguments,
    tags = @tags,
    steamgriddb_id = @steamGridDbId,
    is_favorite = @isFavorite,
    backlog_status = CASE WHEN @backlogStatus IN ('unplayed', 'playing', 'completed', 'dropped') THEN @backlogStatus ELSE backlog_status END,
    cover_url = CASE 
      WHEN @explicitCover IS NOT NULL AND @explicitCover != '' THEN @explicitCover
      WHEN @steamGridDbIdChanged AND @steamGridDbId = '' THEN NULL 
      ELSE cover_url 
    END,
    metadata_sync_status = CASE WHEN @steamGridDbIdChanged THEN 'pending' ELSE metadata_sync_status END,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = @id`).run({ id: gameId, title, normalizedTitle: normalizeTitle(title), description, genres, developer, publisher, releaseDate, storeName, executablePath, launchArguments, tags, steamGridDbId, steamGridDbIdChanged: steamGridDbIdChanged ? 1 : 0, explicitCover, isFavorite, backlogStatus })
  return db.prepare('SELECT * FROM games WHERE id = ?').get(gameId)
}

function getAppConfig(db, key, fallback = null) {
  try {
    const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key)
    return row ? row.value : fallback
  } catch {
    return fallback
  }
}

function setAppConfig(db, key, value) {
  try {
    db.prepare('INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value))
  } catch (err) {
    console.warn('Failed setting app_config:', err.message)
  }
}

function logActivity(db, eventType, gameId = null, details = null) {
  if (!db) return
  const now = Date.now()
  let detailsStr = '{}'
  if (typeof details === 'string') {
    detailsStr = details
  } else if (details && typeof details === 'object') {
    try { detailsStr = JSON.stringify(details) } catch { detailsStr = '{}' }
  }

  const validTypes = new Set(['scan', 'metadata_update', 'artwork_update', 'game_launch', 'backup'])
  const safeEventType = validTypes.has(eventType) ? eventType : String(eventType || 'scan')
  const safeGameId = gameId !== null && gameId !== undefined ? (Number.isInteger(Number(gameId)) ? Number(gameId) : null) : null

  try {
    const cols = db.prepare('PRAGMA table_info(activity_log)').all().map((c) => c.name)
    const hasLegacy = cols.includes('title') && cols.includes('status')
    if (hasLegacy) {
      let title = safeEventType
      let message = ''
      try {
        const parsed = typeof details === 'object' && details !== null ? details : JSON.parse(detailsStr)
        title = parsed.title || parsed.gameTitle || parsed.message || safeEventType
        message = parsed.message || ''
      } catch {}
      db.prepare(`
        INSERT INTO activity_log (event_type, game_id, timestamp, details, title, status, message, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        safeEventType,
        safeGameId,
        now,
        detailsStr,
        String(title).slice(0, 300),
        'completed',
        String(message).slice(0, 1000),
        detailsStr
      )
    } else {
      db.prepare(`
        INSERT INTO activity_log (event_type, game_id, timestamp, details)
        VALUES (?, ?, ?, ?)
      `).run(safeEventType, safeGameId, now, detailsStr)
    }
  } catch (err) {
    console.warn('Failed logging activity:', err.message)
  }
}

function getActivityLog(db, limit = 50) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50))
  const rows = db.prepare('SELECT * FROM activity_log ORDER BY id DESC LIMIT ?').all(safeLimit) || []
  return rows.map((row) => {
    let details = {}
    const raw = row.details || row.details_json
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        details = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
      } catch {
        details = {}
      }
    }
    const timestamp = row.timestamp ? Number(row.timestamp) : (row.created_at ? new Date(row.created_at).getTime() : Date.now())
    return {
      id: row.id,
      event_type: row.event_type || 'scan',
      game_id: row.game_id,
      timestamp,
      details,
    }
  })
}

function getLibraryHealth(db) {
  const totalRow = db.prepare('SELECT COUNT(*) AS total, SUM(is_installed) AS installed FROM games').get()
  let artworkCovered = 0
  let installedWithExecutable = 0
  try {
    const artRow = db.prepare(`SELECT SUM(CASE 
      WHEN cover_url IS NOT NULL 
       AND TRIM(cover_url) != '' 
       AND LOWER(TRIM(cover_url)) NOT IN ('null', 'undefined')
       AND LOWER(cover_url) NOT LIKE '%.ico%' 
       AND LOWER(cover_url) NOT LIKE '%.exe%' 
       AND LOWER(cover_url) NOT LIKE '%.svg%' 
       AND LOWER(cover_url) NOT LIKE '%fallback%' 
       AND LOWER(cover_url) NOT LIKE '%-icon.png%' 
       AND LOWER(cover_url) NOT LIKE '%icon_cache%' 
      THEN 1 ELSE 0 
    END) AS covered FROM games`).get()
    artworkCovered = artRow?.covered || 0
  } catch {}
  try {
    const pathRow = db.prepare("SELECT SUM(CASE WHEN executable_path IS NOT NULL AND TRIM(executable_path) != '' THEN 1 ELSE 0 END) AS with_path FROM games WHERE is_installed = 1").get()
    installedWithExecutable = pathRow?.with_path || 0
  } catch {}
  const lastBackupTimestamp = getAppConfig(db, 'last_backup_timestamp', null)
  const lastBackupPath = getAppConfig(db, 'last_backup_path', null)
  const lastScanTimestamp = getAppConfig(db, 'last_scan_timestamp', null)
  let integrity = 'OK'
  try {
    const check = db.prepare('PRAGMA quick_check(1)').get()
    integrity = check && Object.values(check)[0] === 'ok' ? 'OK' : 'Warning'
  } catch {}
  const total = totalRow?.total || 0
  const installed = totalRow?.installed || 0
  return {
    totalGames: total,
    installedGames: installed,
    artworkCovered,
    missingArtworkCount: Math.max(0, total - artworkCovered),
    installedWithExecutable,
    integrity,
    lastBackupTimestamp: lastBackupTimestamp ? Number(lastBackupTimestamp) : null,
    lastBackupPath,
    lastScanTimestamp: lastScanTimestamp ? Number(lastScanTimestamp) : null,
  }
}

function normalizeBulkGameIds(gameIds) {
  if (!Array.isArray(gameIds) || gameIds.length < 1 || gameIds.length > 500) throw new Error('Select between 1 and 500 library entries.')
  const ids = [...new Set(gameIds.map((gameId) => String(gameId || '').trim()))]
  if (ids.some((gameId) => !gameId || gameId.length > 120)) throw new Error('Invalid library selection.')
  return ids
}

function deleteGames(db, gameIds) {
  const ids = normalizeBulkGameIds(gameIds)
  const placeholders = ids.map(() => '?').join(',')
  const result = db.transaction(() => db.prepare(`DELETE FROM games WHERE id IN (${placeholders})`).run(...ids))()
  return { deletedGames: result.changes, gameIds: ids }
}

function bulkUpdateGames(db, gameIds, fields = {}) {
  const ids = normalizeBulkGameIds(gameIds)
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new Error('Invalid bulk edit request.')
  const hasStore = fields.storeName !== undefined
  const hasTags = fields.tags !== undefined
  if (!hasStore && !hasTags) throw new Error('Choose a store or tag value to apply.')
  const storeName = hasStore ? String(fields.storeName || '').trim().slice(0, 120) : null
  const tags = hasTags ? String(fields.tags || '').trim().slice(0, 500) : null
  const update = db.prepare(`UPDATE games SET
    store_name = CASE WHEN @hasStore THEN @storeName ELSE store_name END,
    tags = CASE WHEN @hasTags THEN @tags ELSE tags END,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = @id`)
  const updated = db.transaction(() => ids.reduce((count, id) => count + update.run({ id, hasStore: hasStore ? 1 : 0, storeName, hasTags: hasTags ? 1 : 0, tags }).changes, 0))()
  return { updatedGames: updated, gameIds: ids }
}

function moveGameCategory(db, gameId, category) {
  if (typeof gameId !== 'string' || gameId.length < 1 || gameId.length > 120) throw new Error('Invalid game selection.')
  const values = { main: [0, 0], dlc: [1, 0], utility: [0, 1] }[category]
  if (!values) throw new Error('Invalid library category.')
  const result = db.prepare('UPDATE games SET is_dlc = ?, is_utility = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(values[0], values[1], gameId)
  if (!result.changes) throw new Error('The selected game could not be found.')
  return db.prepare('SELECT * FROM games WHERE id = ?').get(gameId)
}

function bulkMoveGameCategory(db, gameIds, category) {
  const ids = normalizeBulkGameIds(gameIds)
  const values = { main: [0, 0], dlc: [1, 0], utility: [0, 1] }[category]
  if (!values) throw new Error('Invalid library category.')
  const placeholders = ids.map(() => '?').join(',')
  const result = db.transaction(() => db.prepare(`UPDATE games SET is_dlc = ?, is_utility = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(values[0], values[1], ...ids))()
  return { updatedGames: result.changes, gameIds: ids, category }
}

function bulkSetGameHidden(db, gameIds, hidden) {
  const ids = normalizeBulkGameIds(gameIds)
  if (typeof hidden !== 'boolean') throw new Error('Invalid hidden-game request.')
  const placeholders = ids.map(() => '?').join(',')
  const value = hidden ? 1 : 0
  const reason = hidden ? 'manual' : 'user-visible'
  const result = db.transaction(() => db.prepare(`UPDATE games SET is_hidden = ?, hidden_reason = CASE WHEN ? = 1 THEN COALESCE(hidden_reason, 'manual') ELSE 'user-visible' END, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(value, value, ...ids))()
  return { updatedGames: result.changes, gameIds: ids, hidden }
}

function getRandomInstalledGame(db) {
  const rows = getGames(db, { installed: true, utility: false }, { field: 'canonical_title', direction: 'asc' })
  return rows.length ? rows[Math.floor(Math.random() * rows.length)] : null
}

function hasArtworkValue(value) { return typeof value === 'string' && value.trim().length > 0 }
function localArtworkExists(value) {
  if (!value) return false
  try {
    let candidate = String(value).trim()
    if (candidate.startsWith('local-file://')) {
      const parsedUrl = new URL(candidate)
      if (process.platform === 'win32') {
        if (/^[a-zA-Z]$/.test(parsedUrl.host)) {
          candidate = `${parsedUrl.host.toUpperCase()}:${decodeURIComponent(parsedUrl.pathname)}`
        } else if (/^[a-zA-Z]:/.test(parsedUrl.pathname.replace(/^\/+/, ''))) {
          candidate = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''))
        } else {
          candidate = decodeURIComponent(candidate.replace(/^local-file:\/\//i, '')).replace(/^\/+([a-zA-Z]:)/, '$1')
        }
      } else {
        candidate = decodeURIComponent(parsedUrl.pathname)
      }
    } else if (candidate.startsWith('file:')) {
      candidate = fileURLToPath(candidate)
    }
    return path.isAbsolute(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
  } catch { return false }
}
function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"` }
function exportLibraryCsv(db, destinationPath) {
  if (typeof destinationPath !== 'string' || !path.isAbsolute(destinationPath)) throw new Error('Invalid CSV export path.')
  const rows = db.prepare(`SELECT g.*, GROUP_CONCAT(DISTINCT COALESCE(NULLIF(gs.source_name, ''), NULLIF(g.store_name, ''), gs.platform)) AS source_names,
    GROUP_CONCAT(DISTINCT gs.platform_game_id) AS source_ids
    FROM games g LEFT JOIN game_sources gs ON gs.game_id = g.id GROUP BY g.id ORDER BY g.canonical_title COLLATE NOCASE`).all()
  const header = ['Title', 'Source', 'Playtime_Hours', 'Is_Installed', 'Is_DLC', 'Is_Utility', 'SteamGridDB_ID', 'Description', 'Developer', 'Publisher', 'Release_Date', 'Executable_Path', 'Has_Artwork']
  const lines = [header.map(csvCell).join(',')]
  for (const row of rows) {
    const hasArtwork = localArtworkExists(row.cover_url) || localArtworkExists(row.hero_url) || (hasArtworkValue(row.cover_url) && !row.cover_url.startsWith('file:') && !row.cover_url.startsWith('local-file:'))
    lines.push([row.canonical_title, row.source_names || '', (Number(row.play_time_seconds || 0) / 3600).toFixed(2), row.is_installed ? 'true' : 'false', row.is_dlc ? 'true' : 'false', row.is_utility ? 'true' : 'false', row.steamgriddb_id || '', row.description || '', row.developer || '', row.publisher || '', row.release_date || '', row.executable_path || '', hasArtwork ? 'true' : 'false'].map(csvCell).join(','))
  }
  fs.writeFileSync(destinationPath, `${lines.join('\r\n')}\r\n`, 'utf8')
  return { savedPath: destinationPath, rows: rows.length }
}
function artworkStatus(row) {
  const values = [row.cover_url, row.hero_url].map((value) => String(value || '').trim()).filter(Boolean)
  if (values.some((value) => /\.svg(?:$|[?#])/i.test(value))) return 'Placeholder SVG'
  const hasLocal = values.some((val) => (val.startsWith('file:') || val.startsWith('local-file:')) && localArtworkExists(val))
  if (hasLocal) return 'Available'
  const hasRemote = values.some((val) => (val.startsWith('http:') || val.startsWith('https:')) && !val.includes('.svg'))
  if (hasRemote) return 'Available'
  return 'Missing'
}

function exportSelectedCsv(db, destinationPath, gameIds) {
  if (typeof destinationPath !== 'string' || !path.isAbsolute(destinationPath)) throw new Error('Invalid CSV export path.')
  const ids = normalizeBulkGameIds(gameIds)
  const placeholders = ids.map(() => '?').join(',')
  const rows = db.prepare(`SELECT g.*, GROUP_CONCAT(DISTINCT COALESCE(NULLIF(gs.source_name, ''), NULLIF(g.store_name, ''), gs.platform)) AS source_names,
    GROUP_CONCAT(DISTINCT gs.platform_game_id) AS source_ids
    FROM games g LEFT JOIN game_sources gs ON gs.game_id = g.id
    WHERE g.id IN (${placeholders}) GROUP BY g.id ORDER BY g.canonical_title COLLATE NOCASE`).all(...ids)
  const header = ['Title', 'Source', 'Storefront ID', 'Artwork Status']
  const lines = [header.map(csvCell).join(',')]
  for (const row of rows) lines.push([row.canonical_title, row.source_names || row.store_name || '', row.source_ids || '', artworkStatus(row)].map(csvCell).join(','))
  fs.writeFileSync(destinationPath, `${String.fromCharCode(0xFEFF)}${lines.join(String.fromCharCode(13, 10))}${String.fromCharCode(13, 10)}`, 'utf8')
  return { savedPath: destinationPath, rows: rows.length, gameIds: ids }
}

function purgeLibrary(db) {
  const result = db.transaction(() => {
    const games = db.prepare('SELECT COUNT(*) AS count FROM games').get().count
    const sources = db.prepare('SELECT COUNT(*) AS count FROM game_sources').get().count
    db.prepare('DELETE FROM games').run()
    db.prepare("INSERT INTO app_settings (key, value) VALUES ('library_purged', '1') ON CONFLICT(key) DO UPDATE SET value = '1'").run()
    return { deletedGames: games, deletedSources: sources, cachePreserved: true }
  })()
  return result
}

function getLibraryStats(db) {
  const totals = db.prepare(`SELECT COUNT(*) AS total, SUM(is_installed) AS installed,
    SUM(is_utility) AS utilities,
    SUM(CASE WHEN is_utility = 1 AND is_installed = 1 THEN 1 ELSE 0 END) AS installedUtilities,
    SUM(CASE WHEN is_utility = 0 AND is_dlc = 0 AND is_hidden = 0 THEN 1 ELSE 0 END) AS visibleGames,
    SUM(CASE WHEN is_utility = 0 AND is_dlc = 0 AND is_hidden = 0 AND is_installed = 1 THEN 1 ELSE 0 END) AS visibleInstalledGames,
    SUM(CASE WHEN is_dlc = 1 AND is_utility = 0 AND is_hidden = 0 THEN 1 ELSE 0 END) AS dlcGames,
    SUM(CASE WHEN is_dlc = 1 AND is_utility = 0 AND is_hidden = 0 AND is_installed = 1 THEN 1 ELSE 0 END) AS installedDlc,
    SUM(CASE WHEN is_hidden = 1 AND is_utility = 0 AND is_dlc = 0 THEN 1 ELSE 0 END) AS hidden,
    SUM(CASE WHEN is_hidden = 1 AND is_utility = 0 AND is_dlc = 0 AND is_installed = 1 THEN 1 ELSE 0 END) AS hiddenInstalled,
    SUM(CASE WHEN is_hidden = 1 AND is_utility = 0 AND is_dlc = 1 THEN 1 ELSE 0 END) AS hiddenDlc,
    SUM(CASE WHEN is_hidden = 1 AND is_utility = 0 AND is_dlc = 1 AND is_installed = 1 THEN 1 ELSE 0 END) AS hiddenInstalledDlc,
    SUM(CASE WHEN is_installed = 0 AND is_utility = 0 AND is_dlc = 0 AND is_hidden = 0 THEN 1 ELSE 0 END) AS readyToInstall,
    SUM(CASE 
      WHEN cover_url IS NOT NULL 
       AND TRIM(cover_url) != '' 
       AND LOWER(TRIM(cover_url)) NOT IN ('null', 'undefined')
       AND LOWER(cover_url) NOT LIKE '%.ico%' 
       AND LOWER(cover_url) NOT LIKE '%.exe%' 
       AND LOWER(cover_url) NOT LIKE '%.svg%' 
       AND LOWER(cover_url) NOT LIKE '%fallback%' 
       AND LOWER(cover_url) NOT LIKE '%-icon.png%' 
       AND LOWER(cover_url) NOT LIKE '%icon_cache%' 
      THEN 1 ELSE 0 
    END) AS artworkCovered,
    SUM(install_size_bytes) AS bytes FROM games`).get()
  const platforms = db.prepare(`SELECT ${platformKeySql('gs.platform')} AS platform, COUNT(DISTINCT gs.game_id) AS count
    FROM game_sources gs GROUP BY ${platformKeySql('gs.platform')} ORDER BY count DESC`).all()
  return {
    totalGames: totals.total || 0,
    installedGames: totals.installed || 0,
    utilityTools: totals.utilities || 0,
    installedUtilities: totals.installedUtilities || 0,
    visibleGames: totals.visibleGames || 0,
    visibleInstalledGames: totals.visibleInstalledGames || 0,
    dlcGames: totals.dlcGames || 0,
    installedDlc: totals.installedDlc || 0,
    hiddenGames: totals.hidden || 0,
    hiddenInstalledGames: totals.hiddenInstalled || 0,
    hiddenDlc: totals.hiddenDlc || 0,
    hiddenInstalledDlc: totals.hiddenInstalledDlc || 0,
    readyToInstallCount: totals.readyToInstall || 0,
    artworkCovered: totals.artworkCovered || 0,
    missingArtwork: Math.max(0, (totals.total || 0) - (totals.artworkCovered || 0)),
    totalStorageGb: Number(((totals.bytes || 0) / (1024 ** 3)).toFixed(2)),
    platformBreakdown: platforms,
  }
}

function getUserCaptures(db, gameId) {
  if (!gameId || typeof gameId !== 'string') return []
  try {
    return db.prepare('SELECT * FROM user_captures WHERE game_id = ? ORDER BY id DESC').all(gameId)
  } catch (err) {
    console.warn('[DB] getUserCaptures error:', err?.message)
    return []
  }
}

function addUserCapture(db, gameId, filePath, caption = '') {
  if (!gameId || !filePath) throw new Error('gameId and filePath are required')
  const stmt = db.prepare('INSERT INTO user_captures (game_id, file_path, caption) VALUES (?, ?, ?)')
  const info = stmt.run(gameId, filePath, caption || null)
  return db.prepare('SELECT * FROM user_captures WHERE id = ?').get(info.lastInsertRowid)
}

function deleteUserCapture(db, captureId) {
  if (!captureId) throw new Error('captureId is required')
  return db.prepare('DELETE FROM user_captures WHERE id = ?').run(captureId)
}

module.exports = { createDatabase, openDatabase, seedIfEmpty, getGames, setGameHidden, updateGameStatus, updateGameMetadata, deleteGames, bulkUpdateGames, moveGameCategory, bulkMoveGameCategory, bulkSetGameHidden, getLibrarySettings, setLibrarySettings, getActivityLog, logActivity, getAppConfig, setAppConfig, getLibraryHealth, getRandomInstalledGame, getLibraryStats, exportLibraryCsv, exportSelectedCsv, purgeLibrary, enforceUtilityClassification, enforceDlcClassification, getUserCaptures, addUserCapture, deleteUserCapture }
