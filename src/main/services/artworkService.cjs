const fs = require('node:fs/promises')
const fsSync = require('node:fs')
const path = require('node:path')
const { pathToFileURL, fileURLToPath } = require('node:url')
const { execFileSync } = require('node:child_process')
const { fetchIgdbMetadata, stripTitleNoise } = require('./igdbService.cjs')
const { isDlcTitle, isDlcException } = require('./utilityRules.cjs')
const { normalizeCanonicalTitle } = require('./deduplicationService.cjs')

const API_BASE = 'https://www.steamgriddb.com/api/v2'

function safeKey(value) { return String(value || '').trim() }

function artworkSlug(game) {
  return String(game.normalized_title || game.canonical_title || game.id || 'untitled')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180) || 'untitled'
}

function cleanArtworkTitle(title) {
  let cleaned = String(title || '').trim()
    .replace(/[™®©]/g, '')
    .replace(/\s*\((?:or\s+[^)]+|pc|windows|mac|linux)\)/gi, '')
    .replace(/\s*-\s*(?:Definitive|Game of the Year|GOTY|Enhanced|Remastered|Standard|Deluxe|Ultimate|Collector'?s|Complete)\s+Edition.*$/i, '')
    .replace(/\s*\((?:Definitive|Game of the Year|GOTY|Enhanced|Remastered|Standard|Deluxe|Ultimate|Complete|Remake)\)/gi, '')
    .replace(/\b(?:Game of the Year|GOTY|Definitive|Deluxe|Standard|Complete|Enhanced)\s+Edition\b/gi, '')
    .replace(/[:\-–/]/g, ' ')
    .replace(/[?!*~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || String(title || '').trim()
}

function findBestAutocompleteMatch(candidates = [], targetTitle) {
  if (!candidates || !candidates.length || !targetTitle) return null
  const cleanTarget = cleanArtworkTitle(targetTitle).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (!cleanTarget) return candidates[0] || null

  const targetNumbers = cleanTarget.match(/\b\d+\b/g) || []

  // 1. Exact match on normalized title
  for (const item of candidates) {
    if (!item?.name) continue
    const cleanItem = cleanArtworkTitle(item.name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (cleanItem === cleanTarget) return item
  }

  // 2. Candidates whose prefix before ':' or ' - ' exactly matches the target
  const prefixMatches = candidates.filter(item => {
    if (!item?.name) return false
    const itemPrefix = item.name.split(/[:–—]| - /)[0]
    const cleanPrefix = cleanArtworkTitle(itemPrefix).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (cleanPrefix !== cleanTarget) return false
    const prefixNumbers = cleanPrefix.match(/\b\d+\b/g) || []
    return prefixNumbers.length === targetNumbers.length
  })

  if (prefixMatches.length === 1) return prefixMatches[0]
  if (prefixMatches.length > 1) {
    prefixMatches.sort((a, b) => (a.release_date || 9999999999) - (b.release_date || 9999999999))
    return prefixMatches[0]
  }

  // 3. Candidates starting with cleanTarget that don't introduce sequel numbers
  const prefixStartsWith = candidates.filter(item => {
    if (!item?.name) return false
    const cleanItem = cleanArtworkTitle(item.name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    const itemNumbers = cleanItem.match(/\b\d+\b/g) || []
    if (targetNumbers.length === 0 && itemNumbers.length > 0) return false
    return cleanItem.startsWith(cleanTarget)
  })
  if (prefixStartsWith.length > 0) return prefixStartsWith[0]

  return candidates[0] || null
}

function getArtworkDirectory(userDataPath) {
  const dir = path.join(userDataPath, 'artwork_database')
  if (!fsSync.existsSync(dir)) {
    try { fsSync.mkdirSync(dir, { recursive: true }) } catch {}
  }
  return dir
}

function migrateLegacyArtwork(userDataPath) {
  if (!userDataPath) return
  const targetDir = path.join(userDataPath, 'artwork_database')
  if (!fsSync.existsSync(targetDir)) {
    try { fsSync.mkdirSync(targetDir, { recursive: true }) } catch {}
  }
  const legacyDirs = [
    path.join(userDataPath, 'art_cache'),
    path.join(userDataPath, 'artwork_cache'),
    path.join(userDataPath, 'artwork'),
  ]
  for (const legacyDir of legacyDirs) {
    if (legacyDir === targetDir) continue
    if (fsSync.existsSync(legacyDir)) {
      try {
        const files = fsSync.readdirSync(legacyDir)
        for (const file of files) {
          const src = path.join(legacyDir, file)
          const dst = path.join(targetDir, file)
          if (fsSync.statSync(src).isFile() && !fsSync.existsSync(dst)) {
            try {
              fsSync.copyFileSync(src, dst)
            } catch {}
          }
        }
      } catch (err) {
        console.warn('[ArtworkService] Error migrating legacy artwork:', legacyDir, err?.message)
      }
    }
  }
}

function isLocalArtwork(value) {
  if (!value) return false
  try {
    const localPath = String(value).startsWith('file:') ? fileURLToPath(value) : String(value)
    return path.isAbsolute(localPath) && fsSync.existsSync(localPath) && fsSync.statSync(localPath).isFile()
  } catch { return false }
}

function extractExeIcon(exePath, destPngPath) {
  if (!exePath || !fsSync.existsSync(exePath)) return false
  try {
    const psCmd = `
      Add-Type -AssemblyName System.Drawing
      $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${exePath.replace(/'/g, "''")}')
      if ($icon) {
        $bitmap = $icon.ToBitmap()
        $bitmap.Save('${destPngPath.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
        $bitmap.Dispose()
        $icon.Dispose()
        Write-Output "OK"
      }
    `
    const res = execFileSync('powershell.exe', ['-NoProfile', '-Command', psCmd], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
    return res && res.includes('OK') && fsSync.existsSync(destPngPath)
  } catch { return false }
}

async function fetchGridsForId(id, apiKey, signal) {
  if (!id || !apiKey) return []
  const cleanId = String(id).trim()
  try {
    const grids = await apiGet(`/grids/game/${cleanId}?dimensions=600x900`, apiKey, signal)
    if (grids?.length > 0) return grids
  } catch {}
  try {
    const grids = await apiGet(`/grids/game/${cleanId}`, apiKey, signal)
    if (grids?.length > 0) return grids
  } catch {}
  if (/^\d+$/.test(cleanId)) {
    try {
      const grids = await apiGet(`/grids/steam/${cleanId}?dimensions=600x900`, apiKey, signal)
      if (grids?.length > 0) return grids
    } catch {}
    try {
      const grids = await apiGet(`/grids/steam/${cleanId}`, apiKey, signal)
      if (grids?.length > 0) return grids
    } catch {}
  }
  return []
}

async function fetchHeroesForId(id, apiKey, signal, heroResolution = '2.5k') {
  if (!id || !apiKey) return []
  const cleanId = String(id).trim()
  const dimQuery = heroResolution === '4k'
    ? '?dimensions=3840x2160,3840x1240'
    : (heroResolution === '720p'
      ? '?dimensions=1920x620,1920x1080'
      : (heroResolution === '1080p'
        ? '?dimensions=1920x1080,1920x620'
        : '?dimensions=2560x1440,1920x1080,1920x620'))
  try {
    const heroes = await apiGet(`/heroes/game/${cleanId}${dimQuery}`, apiKey, signal)
    if (heroes?.length > 0) return heroes
  } catch {}
  try {
    const heroes = await apiGet(`/heroes/game/${cleanId}`, apiKey, signal)
    if (heroes?.length > 0) return heroes
  } catch {}
  if (/^\d+$/.test(cleanId)) {
    try {
      const heroes = await apiGet(`/heroes/steam/${cleanId}${dimQuery}`, apiKey, signal)
      if (heroes?.length > 0) return heroes
    } catch {}
    try {
      const heroes = await apiGet(`/heroes/steam/${cleanId}`, apiKey, signal)
      if (heroes?.length > 0) return heroes
    } catch {}
  }
  return []
}

function pickBestGrid(grids = []) {
  if (!Array.isArray(grids) || !grids.length) return null

  // Filter out grids with DVD cases, plastic case mockups, or ugly borders when clean covers exist
  const isMockupOrDvd = (g) => {
    const url = String(g.url || '').toLowerCase()
    const notes = String(g.notes || '').toLowerCase()
    const style = String(g.style || '').toLowerCase()
    return url.includes('dvd') || url.includes('case') || url.includes('mockup') || notes.includes('dvd') || style.includes('dvd')
  }
  const cleanGrids = grids.filter(g => !isMockupOrDvd(g))
  const pool = cleanGrids.length > 0 ? cleanGrids : grids

  // 1. Prefer crisp static 600x900 WebP (lightweight & high fidelity)
  const webp600 = pool.find(g => String(g.url || '').toLowerCase().includes('.webp') && Number(g.width) === 600 && Number(g.height) === 900)
  if (webp600) return webp600
  // 2. Any 600x900 grid
  const standard600 = pool.find(g => Number(g.width) === 600 && Number(g.height) === 900)
  if (standard600) return standard600
  // 3. Any webp grid
  const anyWebp = pool.find(g => String(g.url || '').toLowerCase().includes('.webp'))
  if (anyWebp) return anyWebp
  return pool[0]
}

function pickBestHero(heroes, heroResolution = '2.5k', preferAnimated = false) {
  if (!Array.isArray(heroes) || !heroes.length) return null

  // If user enabled animated artwork, prioritize animated webp/gif for the hero showcase
  if (preferAnimated) {
    const animatedHero = heroes.find(h => {
      const url = String(h.url || '').toLowerCase()
      const mime = String(h.mime || '').toLowerCase()
      return mime.includes('webp') || mime.includes('gif') || url.includes('.webp') || url.includes('.gif') || Boolean(h.animated)
    })
    if (animatedHero) return animatedHero
  }

  const isWebp = (h) => String(h.url || '').toLowerCase().includes('.webp')

  if (heroResolution === '720p') {
    // 720p / Compact: prioritize 1920x620 or <=720 height (lowest storage)
    const compactWebp = heroes.find((h) => isWebp(h) && Number(h.height) <= 720)
    if (compactWebp) return compactWebp
    const exact620 = heroes.find((h) => Number(h.width) === 1920 && Number(h.height) === 620)
    if (exact620) return exact620
    const anyCompact = heroes.find((h) => Number(h.height) <= 720)
    if (anyCompact) return anyCompact
    const exact1080 = heroes.find((h) => Number(h.width) === 1920 && Number(h.height) === 1080)
    if (exact1080) return exact1080
  } else if (heroResolution === '1080p') {
    // 1080p / Full HD: prioritize 1920x1080 (balanced)
    const webp1080 = heroes.find((h) => isWebp(h) && Number(h.width) === 1920 && Number(h.height) === 1080)
    if (webp1080) return webp1080
    const exact1080 = heroes.find((h) => Number(h.width) === 1920 && Number(h.height) === 1080)
    if (exact1080) return exact1080
    const exact620 = heroes.find((h) => Number(h.width) === 1920 && Number(h.height) === 620)
    if (exact620) return exact620
    const exact1440 = heroes.find((h) => Number(h.width) === 2560 && Number(h.height) === 1440)
    if (exact1440) return exact1440
  } else if (heroResolution === '4k') {
    // 4K / Ultra HD
    const webp4k = heroes.find((h) => isWebp(h) && Number(h.width) === 3840)
    if (webp4k) return webp4k
    const exact4k = heroes.find((h) => Number(h.width) === 3840 && Number(h.height) === 2160)
    if (exact4k) return exact4k
    const wide4k = heroes.find((h) => Number(h.width) === 3840)
    if (wide4k) return wide4k
    const exact1440 = heroes.find((h) => Number(h.width) === 2560 && Number(h.height) === 1440)
    if (exact1440) return exact1440
    const exact1080 = heroes.find((h) => Number(h.width) === 1920 && Number(h.height) === 1080)
    if (exact1080) return exact1080
  } else {
    // Default 2.5K / 1440p (High Quality)
    const webp1440 = heroes.find((h) => isWebp(h) && Number(h.width) === 2560 && Number(h.height) === 1440)
    if (webp1440) return webp1440
    const exact1440 = heroes.find((h) => Number(h.width) === 2560 && Number(h.height) === 1440)
    if (exact1440) return exact1440
    const exact1080 = heroes.find((h) => Number(h.width) === 1920 && Number(h.height) === 1080)
    if (exact1080) return exact1080
    const exact4k = heroes.find((h) => Number(h.width) === 3840 && Number(h.height) === 2160)
    if (exact4k) return exact4k
  }
  const ratio169 = heroes.find((h) => h.width && h.height && Math.abs((h.width / h.height) - (16 / 9)) < 0.05)
  if (ratio169) return ratio169
  return heroes[0]
}

async function fetchLogosForId(id, apiKey, signal) {
  if (!id || !apiKey) return []
  const cleanId = String(id).trim()
  try {
    const logos = await apiGet(`/logos/game/${cleanId}`, apiKey, signal)
    if (logos?.length > 0) return logos
  } catch {}
  if (/^\d+$/.test(cleanId)) {
    try {
      const logos = await apiGet(`/logos/steam/${cleanId}`, apiKey, signal)
      if (logos?.length > 0) return logos
    } catch {}
  }
  return []
}

function resolveGameExecutable(game) {
  const direct = String(game?.executable_path || game?.executable || '').replace(/^"|"$/g, '').trim()
  if (direct && fsSync.existsSync(direct)) return direct
  const installPath = game?.install_path || game?.installPath
  if (installPath && fsSync.existsSync(installPath)) {
    try {
      const stat = fsSync.statSync(installPath)
      if (!stat.isDirectory()) return installPath.toLowerCase().endsWith('.exe') ? installPath : null
      
      const scanDir = (dir, depth = 0) => {
        if (depth > 2) return null
        let entries = []
        try { entries = fsSync.readdirSync(dir, { withFileTypes: true }) } catch { return null }
        
        for (const e of entries) {
          if (e.isFile() && e.name.toLowerCase().endsWith('.exe')) {
            const lower = e.name.toLowerCase()
            if (!lower.includes('unins') && !lower.includes('crash') && !lower.includes('setup') && !lower.includes('redist') && !lower.includes('dxsetup') && !lower.includes('vcredist')) {
              return path.join(dir, e.name)
            }
          }
        }
        for (const e of entries) {
          if (e.isDirectory()) {
            const lower = e.name.toLowerCase()
            if (!['$recycle.bin', 'system volume information', 'support', 'redist', 'directx', '_redist'].includes(lower)) {
              const found = scanDir(path.join(dir, e.name), depth + 1)
              if (found) return found
            }
          }
        }
        return null
      }
      return scanDir(installPath)
    } catch {}
  }
  return null
}

async function fetchSteamStorePoster(title) {
  const base = title.replace(/[™®]/g, '').trim()
  const stripped = stripTitleNoise(title)
  const beforeColon = base.split(':')[0].trim()
  const beforeHyphen = base.split('-')[0].trim()
  const queries = [...new Set([base, stripped, beforeColon, beforeHyphen])].filter(Boolean)

  for (const q of queries) {
    try {
      const res = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=english&cc=US`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      })
      if (!res.ok) continue
      const data = await res.json()
      if (data?.items?.length > 0) {
        const match = findBestAutocompleteMatch(data.items, q) || data.items[0]
        if (match?.id) {
          let coverUrl = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${match.id}/library_600x900.jpg`
          let heroUrl = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${match.id}/library_hero.jpg`
          
          try {
            const coverRes = await fetch(coverUrl, { method: 'HEAD' })
            if (!coverRes.ok) coverUrl = null
          } catch { coverUrl = null }
          
          try {
            const heroRes = await fetch(heroUrl, { method: 'HEAD' })
            if (!heroRes.ok) heroUrl = null
          } catch { heroUrl = null }
          
          if (coverUrl || heroUrl) {
            return { coverUrl, heroUrl }
          }
        }
      }
    } catch {}
  }
  return null
}

async function autoResolveMissingArtwork(db, userDataPath, onProgress) {
  const cacheDir = getArtworkDirectory(userDataPath)

  try {
    db.prepare(`UPDATE games SET cover_url = NULL WHERE cover_url LIKE '%.svg%' OR cover_url LIKE '%fallback%'`).run()
  } catch {}

  let candidates = []
  try {
    candidates = db.prepare(`SELECT * FROM games WHERE cover_url IS NULL OR TRIM(cover_url) = '' ORDER BY canonical_title COLLATE NOCASE`).all()
  } catch { return { total: 0, updated: 0 } }

  let updatedCount = 0

  for (let i = 0; i < candidates.length; i++) {
    const game = candidates[i]
    if (onProgress) onProgress({ source: 'artwork-resolver', phase: 'fetching', current: i + 1, total: candidates.length, title: game.canonical_title, message: `Searching Steam for: ${game.canonical_title}...` })

    let resolvedUrl = null

    try {
      const match = await fetchSteamStorePoster(game.canonical_title)
      if (match && match.coverUrl) {
        db.prepare('UPDATE games SET cover_url = COALESCE(@cover, cover_url), hero_url = COALESCE(@hero, hero_url), updated_at = CURRENT_TIMESTAMP WHERE id = @id').run({ id: game.id, cover: match.coverUrl, hero: match.heroUrl || null })
        resolvedUrl = match.coverUrl
        updatedCount++
        if (onProgress) onProgress({ source: 'artwork-resolver', phase: 'fetching', current: i + 1, total: candidates.length, title: game.canonical_title, message: `Success: Found Steam poster for ${game.canonical_title}` })
      }
    } catch {}

    if (!resolvedUrl) {
      const exe = resolveGameExecutable(game)
      if (exe) {
        try {
          const destPng = path.join(cacheDir, `${artworkSlug(game)}-icon.png`)
          if (extractExeIcon(exe, destPng)) {
            const iconUrl = pathToFileURL(destPng).href
            db.prepare('UPDATE games SET cover_url = ?, executable_path = COALESCE(executable_path, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(iconUrl, exe, game.id)
            resolvedUrl = iconUrl
            updatedCount++
            if (onProgress) onProgress({ source: 'artwork-resolver', phase: 'fetching', current: i + 1, total: candidates.length, title: game.canonical_title, message: `Extracted executable icon for ${game.canonical_title}` })
          }
        } catch {}
      }
    }
  }

  return { total: candidates.length, updated: updatedCount }
}

function relinkLocalArtwork(db, userDataPath, game) {
  const artworkDir = getArtworkDirectory(userDataPath)
  const legacyDir = path.join(userDataPath, 'art_cache')
  const updates = {}
  for (const kind of ['cover', 'hero']) {
    const column = kind === 'cover' ? 'cover_url' : 'hero_url'
    let currentValid = false
    if (isLocalArtwork(game[column])) {
      try {
        const localPath = String(game[column]).startsWith('file:') ? fileURLToPath(game[column]) : String(game[column])
        currentValid = fsSync.existsSync(localPath)
      } catch {
        currentValid = false
      }
    }
    if (!currentValid) {
      const slug = artworkSlug(game)
      const localMatches = [
        path.join(artworkDir, `${slug}-${kind}.webp`),
        path.join(artworkDir, `${slug}-${kind}.jpg`),
        path.join(artworkDir, `${slug}-${kind}.png`),
        path.join(artworkDir, `${slug}_${kind}.webp`),
        path.join(artworkDir, `${slug}_${kind}.jpg`),
        path.join(artworkDir, `${slug}-icon.png`),
        path.join(legacyDir, `${slug}-${kind}.webp`),
        path.join(legacyDir, `${slug}-${kind}.jpg`),
        path.join(legacyDir, `${slug}-${kind}.png`),
        path.join(legacyDir, `${slug}_${kind}.webp`),
        path.join(legacyDir, `${slug}_${kind}.jpg`),
        path.join(legacyDir, `${slug}-icon.png`),
      ]
      const found = localMatches.find(p => fsSync.existsSync(p))
      if (found) updates[kind] = pathToFileURL(found).href
    }
  }
  if (updates.cover || updates.hero) db.prepare('UPDATE games SET cover_url = COALESCE(@cover, cover_url), hero_url = COALESCE(@hero, hero_url), updated_at = CURRENT_TIMESTAMP WHERE id = @id').run({ id: game.id, cover: updates.cover || null, hero: updates.hero || null })
  return updates
}

function relinkAllLocalArtwork(db, userDataPath) {
  migrateLegacyArtwork(userDataPath)
  const games = db.prepare('SELECT * FROM games').all()
  let relinked = 0
  for (const game of games) {
    const updates = relinkLocalArtwork(db, userDataPath, game)
    if (updates.cover || updates.hero) relinked += 1
  }
  return relinked
}

async function apiGet(endpoint, apiKey, signal) {
  const res = await fetch(`${API_BASE}${endpoint}`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }, signal })
  if (!res.ok) throw new Error(`SteamGridDB error: ${res.status}`)
  return (await res.json()).data || []
}

function getArtworkExtension(url, fallback = 'jpg') {
  if (!url) return fallback
  const clean = String(url).split('?')[0].toLowerCase()
  if (clean.endsWith('.webp')) return 'webp'
  if (clean.endsWith('.png')) return 'png'
  if (clean.endsWith('.gif')) return 'gif'
  if (clean.endsWith('.jpeg') || clean.endsWith('.jpg')) return 'jpg'
  return fallback
}

async function downloadImage(url, destination) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  let finalDest = destination
  // If destination has a generic ext but actual content is webp or png, adjust extension
  if (contentType.includes('webp') && !finalDest.endsWith('.webp')) {
    finalDest = finalDest.replace(/\.[a-zA-Z0-9]+$/, '.webp')
  } else if (contentType.includes('png') && !finalDest.endsWith('.png')) {
    finalDest = finalDest.replace(/\.[a-zA-Z0-9]+$/, '.png')
  }
  await fs.writeFile(finalDest, Buffer.from(await res.arrayBuffer()))
  return pathToFileURL(finalDest).href
}

async function runBulkArtworkSync(db, userDataPath, apiKey, onProgress, signal, options = {}) {
  const key = safeKey(apiKey)
  if (!key) throw new Error('SteamGridDB API key is required.')
  const cacheDir = getArtworkDirectory(userDataPath)
  const heroResolution = getAppSettingValue(db, 'hero_resolution', '2.5k')
  const preferAnimated = Boolean(options?.preferAnimated ?? (getAppSettingValue(db, 'prefer_animated_artwork', 'false') === 'true'))

  const forceAll = Boolean(options?.forceAll || options?.forceHeroes)

  const candidates = forceAll
    ? db.prepare('SELECT * FROM games ORDER BY canonical_title COLLATE NOCASE').all()
    : db.prepare(`
        SELECT * FROM games 
        WHERE cover_url IS NULL OR TRIM(cover_url) = '' OR cover_url LIKE '%.svg%' OR cover_url LIKE '%fallback%'
           OR hero_url IS NULL OR TRIM(hero_url) = ''
           OR logo_url IS NULL OR TRIM(logo_url) = ''
           OR steamgriddb_id IS NULL OR TRIM(steamgriddb_id) = ''
        ORDER BY canonical_title COLLATE NOCASE
      `).all()

  let updated = 0
  for (let i = 0; i < candidates.length; i++) {
    if (signal?.aborted) break
    const game = candidates[i]
    const needsCover = forceAll || !game.cover_url || game.cover_url.includes('.svg') || game.cover_url.includes('fallback')
    const needsHero = forceAll || !game.hero_url || !String(game.hero_url).trim()
    const needsLogo = forceAll || !game.logo_url || !String(game.logo_url).trim()

    if (onProgress) onProgress({ source: 'steamgriddb', phase: 'fetching', current: i + 1, total: candidates.length, title: game.canonical_title, message: `Syncing: ${i + 1} / ${candidates.length} — ${game.canonical_title}` })

    let newCoverUrl = null
    let newHeroUrl = null
    let newLogoUrl = null
    let resolvedId = game.steamgriddb_id ? String(game.steamgriddb_id).trim() : null

    try {
      let grids = []
      let heroes = []
      let logos = []
      if (resolvedId) {
        if (needsCover) grids = await fetchGridsForId(resolvedId, key, signal)
        if (needsHero) heroes = await fetchHeroesForId(resolvedId, key, signal, heroResolution)
        if (needsLogo) logos = await fetchLogosForId(resolvedId, key, signal)
      }

      // Check storefront IDs directly (Steam App ID or GOG ID) for instant, exact lookup
      if ((!grids.length && needsCover) || (!heroes.length && needsHero) || (!logos.length && needsLogo)) {
        try {
          const sources = db.prepare("SELECT platform, platform_game_id FROM game_sources WHERE game_id = ?").all(game.id)
          for (const s of sources) {
            if (s.platform === 'steam' && /^\d+$/.test(s.platform_game_id)) {
              if (needsCover && !grids.length) grids = await apiGet(`/grids/steam/${s.platform_game_id}?dimensions=600x900`, key, signal).catch(() => [])
              if (needsCover && !grids.length) grids = await apiGet(`/grids/steam/${s.platform_game_id}`, key, signal).catch(() => [])
              if (needsHero && !heroes.length) heroes = await fetchHeroesForId(s.platform_game_id, key, signal, heroResolution)
              if (needsLogo && !logos.length) logos = await apiGet(`/logos/steam/${s.platform_game_id}`, key, signal).catch(() => [])
              if (!resolvedId) {
                const gameInfo = await apiGet(`/games/steam/${s.platform_game_id}`, key, signal).catch(() => null)
                if (gameInfo?.id) resolvedId = String(gameInfo.id)
              }
              break
            } else if (s.platform === 'gog' && /^\d+$/.test(s.platform_game_id)) {
              const gameInfo = await apiGet(`/games/gog/${s.platform_game_id}`, key, signal).catch(() => null)
              if (gameInfo?.id) {
                resolvedId = String(gameInfo.id)
                if (needsCover && !grids.length) grids = await fetchGridsForId(resolvedId, key, signal)
                if (needsHero && !heroes.length) heroes = await fetchHeroesForId(resolvedId, key, signal, heroResolution)
                if (needsLogo && !logos.length) logos = await fetchLogosForId(resolvedId, key, signal)
              }
              break
            }
          }
        } catch {}
      }

      // Fall back to title search autocomplete
      if ((!grids.length && needsCover) || (!heroes.length && needsHero && !resolvedId) || (!logos.length && needsLogo && !resolvedId)) {
        let searchRes = await apiGet(`/search/autocomplete/${encodeURIComponent(cleanArtworkTitle(game.canonical_title))}`, key, signal).catch(() => [])
        if (!searchRes?.length && (game.canonical_title.includes(':') || game.canonical_title.includes(' - '))) {
          const prefix = game.canonical_title.split(/[:–—]| - /)[0].trim()
          if (prefix && prefix !== game.canonical_title) {
            searchRes = await apiGet(`/search/autocomplete/${encodeURIComponent(cleanArtworkTitle(prefix))}`, key, signal).catch(() => [])
          }
        }
        const bestMatch = findBestAutocompleteMatch(searchRes, game.canonical_title)
        if (bestMatch?.id) {
          resolvedId = String(bestMatch.id)
          if (needsCover && !grids.length) grids = await fetchGridsForId(resolvedId, key, signal)
          if (needsHero && !heroes.length) heroes = await fetchHeroesForId(resolvedId, key, signal, heroResolution)
          if (needsLogo && !logos.length) logos = await fetchLogosForId(resolvedId, key, signal)
        }
      }
      const bestGrid = pickBestGrid(grids)
      if (bestGrid?.url && needsCover) {
        const ext = getArtworkExtension(bestGrid.url, 'jpg')
        const dest = path.join(cacheDir, `${artworkSlug(game)}-cover.${ext}`)
        newCoverUrl = await downloadImage(bestGrid.url, dest)
      }
      const bestHero = pickBestHero(heroes, heroResolution, preferAnimated)
      if (bestHero?.url && needsHero) {
        const ext = getArtworkExtension(bestHero.url, 'jpg')
        const destHero = path.join(cacheDir, `${artworkSlug(game)}-hero.${ext}`)
        newHeroUrl = await downloadImage(bestHero.url, destHero)
      }
      if (logos?.[0]?.url && needsLogo) {
        const destLogo = path.join(cacheDir, `${artworkSlug(game)}-logo.png`)
        try {
          newLogoUrl = await downloadImage(logos[0].url, destLogo)
        } catch {}
      }
    } catch {}

    // Fall back to Steam Store search if cover or hero still needed
    if ((needsCover && !newCoverUrl) || (needsHero && !newHeroUrl)) {
      try {
        const match = await fetchSteamStorePoster(game.canonical_title)
        if (match?.coverUrl && needsCover && !newCoverUrl) {
          const dest = path.join(cacheDir, `${artworkSlug(game)}-cover.jpg`)
          try { newCoverUrl = await downloadImage(match.coverUrl, dest) } catch { newCoverUrl = match.coverUrl }
        }
        if (match?.heroUrl && needsHero && !newHeroUrl) {
          const destHero = path.join(cacheDir, `${artworkSlug(game)}-hero.jpg`)
          try { newHeroUrl = await downloadImage(match.heroUrl, destHero) } catch { newHeroUrl = match.heroUrl }
        }
      } catch {}
    }

    // Fall back to executable icon if cover still needed
    let resolvedExe = null
    if (needsCover && !newCoverUrl) {
      resolvedExe = resolveGameExecutable(game)
      if (resolvedExe) {
        try {
          const destPng = path.join(cacheDir, `${artworkSlug(game)}-icon.png`)
          if (extractExeIcon(resolvedExe, destPng)) {
            newCoverUrl = pathToFileURL(destPng).href
          }
        } catch {}
      }
    }

    if (newCoverUrl || newHeroUrl || newLogoUrl || (resolvedId && resolvedId !== game.steamgriddb_id)) {
      db.prepare(`UPDATE games SET 
        cover_url = COALESCE(?, cover_url), 
        hero_url = COALESCE(?, hero_url), 
        logo_url = COALESCE(?, logo_url),
        steamgriddb_id = COALESCE(?, steamgriddb_id), 
        executable_path = COALESCE(?, executable_path),
        updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`
      ).run(newCoverUrl, newHeroUrl, newLogoUrl, resolvedId || null, resolvedExe || null, game.id)
      updated++
    }
    await new Promise((resolve) => setTimeout(resolve, 800))
  }
  if (onProgress) {
    onProgress({
      source: 'steamgriddb',
      phase: 'complete',
      current: candidates.length,
      total: candidates.length,
      message: `Artwork sync complete: ${updated} games updated.`,
    })
  }
  return { updated, candidates: candidates.length }
}

async function refetchArtworkByExactId(db, userDataPath, game, exactId, apiKey) {
  const key = safeKey(apiKey)
  if (!game || !game.id) throw new Error('A valid game record is required.')
  const cleanId = String(exactId || '').trim()
  if (!cleanId) throw new Error('An ID is required.')

  const cacheDir = getArtworkDirectory(userDataPath)

  let coverUrl = null
  let heroUrl = null

  // 1. If we have a SteamGridDB key, query SteamGridDB
  if (key) {
    const grids = await fetchGridsForId(cleanId, key)
    if (grids?.[0]?.url) {
      const dest = path.join(cacheDir, `${artworkSlug(game)}-cover.jpg`)
      coverUrl = await downloadImage(grids[0].url, dest)
    }
    const heroes = await fetchHeroesForId(cleanId, key)
    if (heroes?.[0]?.url) {
      const destHero = path.join(cacheDir, `${artworkSlug(game)}-hero.jpg`)
      heroUrl = await downloadImage(heroes[0].url, destHero)
    }
  }

  // 2. If not found on SGDB or no key, and cleanId is numeric, try official Steam Store CDN
  if ((!coverUrl || !heroUrl) && /^\d+$/.test(cleanId)) {
    const steamCover = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/library_600x900.jpg`
    const steamHero = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${cleanId}/library_hero.jpg`
    if (!coverUrl) {
      try {
        const coverRes = await fetch(steamCover, { method: 'HEAD' })
        if (coverRes.ok) {
          const dest = path.join(cacheDir, `${artworkSlug(game)}-cover.jpg`)
          coverUrl = await downloadImage(steamCover, dest)
        }
      } catch {}
    }
    if (!heroUrl) {
      try {
        const heroRes = await fetch(steamHero, { method: 'HEAD' })
        if (heroRes.ok) {
          const destHero = path.join(cacheDir, `${artworkSlug(game)}-hero.jpg`)
          heroUrl = await downloadImage(steamHero, destHero)
        }
      } catch {}
    }
  }

  if (!coverUrl && !heroUrl) {
    throw new Error(key ? `No artwork found for ID ${cleanId} on SteamGridDB or Steam.` : 'SteamGridDB API key is required, or enter a valid numeric Steam App ID.')
  }

  db.prepare(`UPDATE games SET 
    cover_url = COALESCE(?, cover_url), 
    hero_url = COALESCE(?, hero_url), 
    steamgriddb_id = ?, 
    updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?`
  ).run(coverUrl || null, heroUrl || null, cleanId, game.id)

  return db.prepare('SELECT * FROM games WHERE id = ?').get(game.id)
}

async function refetchSelectedArtwork(db, userDataPath, gameIds, apiKey, onProgress, signal) {
  const key = safeKey(apiKey)
  const cacheDir = getArtworkDirectory(userDataPath)
  const heroResolution = getAppSettingValue(db, 'hero_resolution', '2.5k')

  const ids = Array.isArray(gameIds) ? gameIds : [gameIds]
  let updated = 0

  for (let i = 0; i < ids.length; i++) {
    if (signal?.aborted) break
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(ids[i])
    if (!game) continue

    if (onProgress) onProgress({ source: 'refetch-selected', phase: 'fetching', current: i + 1, total: ids.length, title: game.canonical_title, message: `Refetching: ${game.canonical_title}...` })

    let newCoverUrl = null
    let newHeroUrl = null
    let targetId = game.steamgriddb_id ? String(game.steamgriddb_id).trim() : null

    if (key) {
      try {
        let grids = []
        let heroes = []
        if (targetId) {
          grids = await fetchGridsForId(targetId, key, signal)
          heroes = await fetchHeroesForId(targetId, key, signal, heroResolution)
        }

        // Check storefront IDs directly (Steam App ID or GOG ID)
        if (!grids.length || !heroes.length) {
          try {
            const sources = db.prepare("SELECT platform, platform_game_id FROM game_sources WHERE game_id = ?").all(game.id)
            for (const s of sources) {
              if (s.platform === 'steam' && /^\d+$/.test(s.platform_game_id)) {
                if (!grids.length) grids = await apiGet(`/grids/steam/${s.platform_game_id}?dimensions=600x900`, key, signal).catch(() => [])
                if (!grids.length) grids = await apiGet(`/grids/steam/${s.platform_game_id}`, key, signal).catch(() => [])
                if (!heroes.length) heroes = await fetchHeroesForId(s.platform_game_id, key, signal, heroResolution)
                if (!targetId) {
                  const gameInfo = await apiGet(`/games/steam/${s.platform_game_id}`, key, signal).catch(() => null)
                  if (gameInfo?.id) targetId = String(gameInfo.id)
                }
                break
              } else if (s.platform === 'gog' && /^\d+$/.test(s.platform_game_id)) {
                const gameInfo = await apiGet(`/games/gog/${s.platform_game_id}`, key, signal).catch(() => null)
                if (gameInfo?.id) {
                  targetId = String(gameInfo.id)
                  if (!grids.length) grids = await fetchGridsForId(targetId, key, signal)
                  if (!heroes.length) heroes = await fetchHeroesForId(targetId, key, signal, heroResolution)
                }
                break
              }
            }
          } catch {}
        }

        // Fall back to title search autocomplete
        if (!grids.length || !heroes.length) {
          let searchRes = await apiGet(`/search/autocomplete/${encodeURIComponent(cleanArtworkTitle(game.canonical_title))}`, key, signal).catch(() => [])
          if (!searchRes?.length && (game.canonical_title.includes(':') || game.canonical_title.includes(' - '))) {
            const prefix = game.canonical_title.split(/[:–—]| - /)[0].trim()
            if (prefix && prefix !== game.canonical_title) {
              searchRes = await apiGet(`/search/autocomplete/${encodeURIComponent(cleanArtworkTitle(prefix))}`, key, signal).catch(() => [])
            }
          }
          const bestMatch = findBestAutocompleteMatch(searchRes, game.canonical_title)
          if (bestMatch?.id) {
            targetId = String(bestMatch.id)
            if (!grids.length) grids = await fetchGridsForId(targetId, key, signal)
            if (!heroes.length) heroes = await fetchHeroesForId(targetId, key, signal, heroResolution)
          }
        }
        if (grids?.[0]?.url) {
          const dest = path.join(cacheDir, `${artworkSlug(game)}-cover.jpg`)
          newCoverUrl = await downloadImage(grids[0].url, dest)
        }
        const bestHero = pickBestHero(heroes, heroResolution)
        if (bestHero?.url) {
          const destHero = path.join(cacheDir, `${artworkSlug(game)}-hero.jpg`)
          newHeroUrl = await downloadImage(bestHero.url, destHero)
        }
      } catch {}
    }

    if (!newCoverUrl || !newHeroUrl) {
      try {
        const match = await fetchSteamStorePoster(game.canonical_title)
        if (match?.coverUrl && !newCoverUrl) {
          const dest = path.join(cacheDir, `${artworkSlug(game)}-cover.jpg`)
          try { newCoverUrl = await downloadImage(match.coverUrl, dest) } catch { newCoverUrl = match.coverUrl }
        }
        if (match?.heroUrl && !newHeroUrl) {
          const destHero = path.join(cacheDir, `${artworkSlug(game)}-hero.jpg`)
          try { newHeroUrl = await downloadImage(match.heroUrl, destHero) } catch { newHeroUrl = match.heroUrl }
        }
      } catch {}
    }

    let resolvedExe = null
    if (!newCoverUrl && (!game.cover_url || game.cover_url.includes('fallback'))) {
      resolvedExe = resolveGameExecutable(game)
      if (resolvedExe) {
        try {
          const destPng = path.join(cacheDir, `${artworkSlug(game)}-icon.png`)
          if (extractExeIcon(resolvedExe, destPng)) {
            newCoverUrl = pathToFileURL(destPng).href
          }
        } catch {}
      }
    }

    if (newCoverUrl || newHeroUrl) {
      db.prepare(`UPDATE games SET 
        cover_url = COALESCE(?, cover_url), 
        hero_url = COALESCE(?, hero_url), 
        steamgriddb_id = COALESCE(?, steamgriddb_id), 
        executable_path = COALESCE(?, executable_path),
        updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`
      ).run(newCoverUrl, newHeroUrl, targetId || null, resolvedExe || null, game.id)
      updated++
    }

    if (onProgress) onProgress({ source: 'refetch-selected', phase: 'fetching', current: i + 1, total: ids.length, title: game.canonical_title, message: (newCoverUrl || newHeroUrl) ? `Updated: ${game.canonical_title}` : `Not found: ${game.canonical_title}` })

    await new Promise(r => setTimeout(r, key ? 650 : 800))
  }

  return { updated, total: ids.length }
}

function copyManualArtwork(db, userDataPath, gameId, sourceFilePath) {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId)
  if (!game) throw new Error(`Game not found: ${gameId}`)
  if (!sourceFilePath || !fsSync.existsSync(sourceFilePath)) throw new Error('Source artwork file not found.')

  const cacheDir = getArtworkDirectory(userDataPath)
  const ext = path.extname(sourceFilePath) || '.jpg'
  const dest = path.join(cacheDir, `${artworkSlug(game)}-cover${ext}`)
  fsSync.copyFileSync(sourceFilePath, dest)

  const coverUrl = pathToFileURL(dest).href
  db.prepare('UPDATE games SET cover_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(coverUrl, gameId)
  return { coverUrl }
}

function copyArtworkOverride(db, userDataPath, gameId, sourceFilePath, kind) {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId)
  if (!game) throw new Error(`Game not found: ${gameId}`)
  if (!sourceFilePath || !fsSync.existsSync(sourceFilePath)) throw new Error('Source artwork file not found.')

  const column = kind === 'hero' ? 'hero_url' : 'cover_url'
  const cacheDir = getArtworkDirectory(userDataPath)
  const ext = path.extname(sourceFilePath) || '.jpg'
  const dest = path.join(cacheDir, `${artworkSlug(game)}-${kind === 'hero' ? 'hero' : 'cover'}${ext}`)
  fsSync.copyFileSync(sourceFilePath, dest)

  const fileUrl = pathToFileURL(dest).href
  db.prepare(`UPDATE games SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(fileUrl, gameId)
  return { [column]: fileUrl }
}

async function generateAutomaticFallbacks(db, userDataPath, onProgress) {
  const cacheDir = getArtworkDirectory(userDataPath)

  const candidates = db.prepare(`SELECT * FROM games WHERE cover_url IS NULL OR TRIM(cover_url) = '' OR cover_url LIKE '%.svg%' OR cover_url LIKE '%fallback%'`).all()
  let updated = 0

  for (let i = 0; i < candidates.length; i++) {
    const game = candidates[i]
    if (onProgress) onProgress({ source: 'fallback-art', phase: 'fetching', current: i + 1, total: candidates.length, title: game.canonical_title, message: `Extracting icon for: ${game.canonical_title}...` })

    const exe = resolveGameExecutable(game)
    if (exe) {
      try {
        const destPng = path.join(cacheDir, `${artworkSlug(game)}-icon.png`)
        if (extractExeIcon(exe, destPng)) {
          db.prepare('UPDATE games SET cover_url = ?, executable_path = COALESCE(executable_path, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(pathToFileURL(destPng).href, exe, game.id)
          updated++
          if (onProgress) onProgress({ source: 'fallback-art', phase: 'fetching', current: i + 1, total: candidates.length, title: game.canonical_title, message: `Extracted icon for ${game.canonical_title}` })
          continue
        }
      } catch {}
    }

    if (onProgress) onProgress({ source: 'fallback-art', phase: 'fetching', current: i + 1, total: candidates.length, title: game.canonical_title, message: `No executable/icon available for ${game.canonical_title}` })
  }

  return { candidates: candidates.length, updated }
}

function repairBrokenArtworkLinks(db, userDataPath) {
  const rows = db.prepare(`SELECT id, canonical_title, cover_url, hero_url FROM games WHERE (cover_url IS NOT NULL AND TRIM(cover_url) != '') OR (hero_url IS NOT NULL AND TRIM(hero_url) != '')`).all()
  let repaired = 0
  const details = []

  function isBrokenLocal(url) {
    if (!url || (!url.startsWith('file:') && !url.startsWith('local-file:'))) return false
    try {
      let localPath = ''
      if (url.startsWith('local-file:')) {
        const parsedUrl = new URL(url)
        if (process.platform === 'win32') {
          if (/^[a-zA-Z]$/.test(parsedUrl.host)) {
            localPath = `${parsedUrl.host.toUpperCase()}:${decodeURIComponent(parsedUrl.pathname)}`
          } else if (/^[a-zA-Z]:/.test(parsedUrl.pathname.replace(/^\/+/, ''))) {
            localPath = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''))
          } else {
            const raw = decodeURIComponent(url.replace(/^local-file:\/\//i, ''))
            localPath = raw.replace(/^\/+([a-zA-Z]:)/, '$1')
          }
        } else {
          localPath = decodeURIComponent(parsedUrl.pathname)
        }
        localPath = path.normalize(localPath)
      } else {
        localPath = fileURLToPath(url)
      }
      return !fsSync.existsSync(localPath)
    } catch {
      return true
    }
  }

  for (const row of rows) {
    let coverBroken = false
    let heroBroken = false
    let reason = ''

    if (row.cover_url) {
      const steamMatch = row.cover_url.match(/steam\/apps\/([^/]+)\//)
      if (steamMatch && !/^\d+$/.test(steamMatch[1])) {
        coverBroken = true
        reason = `non-numeric Steam app ID: ${steamMatch[1]}`
      } else if (isBrokenLocal(row.cover_url)) {
        coverBroken = true
        reason = `local cover missing`
      }
    }

    if (row.hero_url) {
      if (isBrokenLocal(row.hero_url)) {
        heroBroken = true
        reason = reason ? `${reason}, local hero missing` : 'local hero missing'
      }
    }

    if (coverBroken || heroBroken) {
      db.prepare(`UPDATE games SET 
        cover_url = CASE WHEN ? = 1 THEN NULL ELSE cover_url END,
        hero_url = CASE WHEN ? = 1 THEN NULL ELSE hero_url END,
        updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(coverBroken ? 1 : 0, heroBroken ? 1 : 0, row.id)
      repaired++
      details.push({ title: row.canonical_title, reason })
    }
  }

  return { repaired, total: rows.length }
}

function fastTrackCompleteLocalMetadataBatch() { return 0 }

async function fetchSteamAppDetails(appId, signal, retryCount = 0) {
  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal,
    })
    if (res.status === 429 && retryCount < 2) {
      console.warn(`[Steam] Rate-limited (429) on appId ${appId}. Backing off for ${(retryCount + 1) * 3}s...`)
      await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 3000))
      if (signal?.aborted) return null
      return fetchSteamAppDetails(appId, signal, retryCount + 1)
    }
    if (!res.ok) return null
    const json = await res.json()
    const appData = json?.[appId]?.data
    if (!appData) return null

    const dev = Array.isArray(appData.developers) ? appData.developers.filter(Boolean).join(', ').trim() : null
    const pub = Array.isArray(appData.publishers) ? appData.publishers.filter(Boolean).join(', ').trim() : null
    const genres = Array.isArray(appData.genres) ? appData.genres.map((g) => g.description).filter(Boolean).join(', ').trim() : null
    const desc = appData.short_description || (appData.about_the_game ? appData.about_the_game.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : null)
    const relDate = appData.release_date?.date ? String(appData.release_date.date).trim() : null

    const finalDev = (dev || pub) ? (dev || pub).trim() : null
    const finalPub = (pub || dev) ? (pub || dev).trim() : null

    return {
      description: desc ? desc.trim() : null,
      genres: genres || null,
      developer: finalDev,
      publisher: finalPub,
      releaseDate: relDate || null,
    }
  } catch {
    return null
  }
}

async function findSteamAppIdForTitle(title, signal, retryCount = 0) {
  const base = cleanArtworkTitle(title)
  const queries = [base]
  const stripped = stripTitleNoise(title)
  if (stripped && stripped !== base && !queries.includes(stripped)) {
    queries.push(stripped)
    const strippedClean = cleanArtworkTitle(stripped)
    if (strippedClean && strippedClean !== stripped && !queries.includes(strippedClean)) {
      queries.push(strippedClean)
    }
  }
  if (title.includes(':') || title.includes(' - ') || title.includes(' — ')) {
    const prefix = title.split(/[:–—]| - /)[0].trim()
    if (prefix && prefix !== base && !queries.includes(prefix)) queries.push(cleanArtworkTitle(prefix))
  }
  for (const q of queries) {
    if (!q) continue
    try {
      const res = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=english&cc=US`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal,
      })
      if (res.status === 429 && retryCount < 2) {
        console.warn(`[Steam Search] Rate-limited (429) for "${q}". Backing off for ${(retryCount + 1) * 3}s...`)
        await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 3000))
        if (signal?.aborted) return null
        return findSteamAppIdForTitle(title, signal, retryCount + 1)
      }
      if (!res.ok) continue
      const data = await res.json()
      if (data?.items?.length > 0) {
        const lowerTitle = title.toLowerCase().trim()
        const lowerClean = base.toLowerCase().trim()
        const lowerStripped = stripped ? stripped.toLowerCase().trim() : ''
        const exact = data.items.find((it) => {
          const itLower = String(it.name || '').toLowerCase().trim()
          return itLower === lowerTitle || itLower === lowerClean || (lowerStripped && itLower === lowerStripped)
        })
        const chosen = exact || findBestAutocompleteMatch(data.items, title) || data.items[0]
        if (chosen?.id) return String(chosen.id)
      }
    } catch {}
  }
  return null
}

function extractDlcBaseTitle(title) {
  if (!title) return null
  // Only extract base title if the title is actually a DLC!
  if (!isDlcTitle(title)) return null

  let t = String(title).trim().replace(/[™®©]/g, '').trim()
  if (t.includes(' - ')) {
    const cand = t.split(' - ')[0].trim()
    if (cand && cand.length >= 2) return cand
  }
  if (t.includes(' -- ')) {
    const cand = t.split(' -- ')[0].trim()
    if (cand && cand.length >= 2) return cand
  }
  if (t.includes(':')) {
    const cand = t.split(':')[0].trim()
    if (cand && cand.length >= 2) return cand
  }
  const noise = [
    /\b(?:Soundtrack|Original\s+Soundtrack|OST)\b/i,
    /\b(?:The\s+Assignment|The\s+Consequence|The\s+Executioner)\b/i,
    /\b(?:Sam'?s\s+Story|The\s+Two\s+Colonels)\b/i,
    /\b(?:Burial\s+at\s+Sea|Clash\s+in\s+the\s+Clouds)\b/i,
    /\b(?:Hearts\s+of\s+Stone|Blood\s+and\s+Wine)\b/i,
    /\b(?:The\s+Knife\s+of\s+Dunwall|The\s+Brigmore\s+Witches)\b/i,
    /\b(?:Far\s+Harbor|Nuka[- ]World|Dead\s+Money|Honest\s+Hearts|Old\s+World\s+Blues|Lonesome\s+Road)\b/i,
    /\b(?:Shadow\s+of\s+the\s+Erdtree|Phantom\s+Liberty|Undead\s+Nightmare)\b/i,
    /\b(?:Extras\s+Pack|Giveaway|Mega\s+Giveaway|Mega\s+Pack|Party\s+Pack|Founder'?s\s+Pack|Starter\s+Pack|Decal\s+Pack|Livery\s+Pack)\b/i,
    /\b(?:Deluxe\s+Edition\s+Upgrade(?:\s+Bundle)?|Upgrade\s+Bundle|Upgrade)\b/i,
    /\b(?:Franchise\s+Bundle|\d+th\s+Anniversary\s+Bundle|Starter\s+Bundle(?:\s*\d+)?|The\s+Daring\s+Lifestyle\s+Bundle|Seasoning'?s\s+Greetings\s+Bundle|Thanatoasty\s+Bundle|Winterfest\s+Bundle|Bundle)\b/i,
    /\b(?:Creator\s+Kit|REDmod|Wrap)\b/i,
    /\b(?:DLC|Pack)\b/i,
  ]
  for (const np of noise) {
    const sub = t.replace(np, '').trim()
    if (sub && sub !== t && sub.length >= 2) return sub
  }
  return null
}

function findLocalParentGame(db, dlcTitle, excludeId) {
  const baseTitle = extractDlcBaseTitle(dlcTitle)
  if (!baseTitle) return null
  try {
    const baseNorm = normalizeCanonicalTitle(baseTitle)
    let parent = db.prepare(`
      SELECT * FROM games 
      WHERE (normalized_title = ? OR LOWER(canonical_title) = LOWER(?))
        AND id <> ?
        AND (is_dlc = 0 OR is_dlc IS NULL)
      LIMIT 1
    `).get(baseNorm, baseTitle, excludeId)

    if (parent) return parent

    const candidates = db.prepare(`
      SELECT * FROM games 
      WHERE id <> ? 
        AND (is_dlc = 0 OR is_dlc IS NULL)
        AND (developer IS NOT NULL AND TRIM(developer) <> '')
    `).all(excludeId)

    for (const cand of candidates) {
      if (normalizeCanonicalTitle(cand.canonical_title) === baseNorm) {
        return cand
      }
    }
    return null
  } catch {
    return null
  }
}

function getAppSettingValue(db, key, fallback = '') {
  try {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key)
    return row?.value ? String(row.value).trim() : fallback
  } catch {
    return fallback
  }
}

async function syncLibraryMetadata(db, userDataPath, apiKey, onProgress, signal, options = {}) {
  const key = safeKey(apiKey)
  const igdbClientId = getAppSettingValue(db, 'igdb_client_id')
  const igdbClientSecret = getAppSettingValue(db, 'igdb_client_secret')

  const forceAll = Boolean(options?.forceAll)
  const candidates = forceAll
    ? db.prepare('SELECT * FROM games ORDER BY canonical_title COLLATE NOCASE').all()
    : db.prepare(`
        SELECT * FROM games 
        WHERE (description IS NULL OR TRIM(description) = '')
           OR (genres IS NULL OR TRIM(genres) = '')
           OR (developer IS NULL OR TRIM(developer) = '')
           OR (publisher IS NULL OR TRIM(publisher) = '')
           OR (release_date IS NULL OR TRIM(release_date) = '')
           OR (steamgriddb_id IS NULL OR TRIM(steamgriddb_id) = '')
        ORDER BY canonical_title COLLATE NOCASE
      `).all()

  let updated = 0
  const total = candidates.length

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) break
    const game = candidates[i]

    if (onProgress) {
      onProgress({
        source: 'metadata',
        phase: 'fetching',
        current: i + 1,
        total,
        title: game.canonical_title,
        message: `Syncing: ${i + 1} / ${total} — ${game.canonical_title}`,
      })
    }

    const needsDesc = !game.description || !String(game.description).trim()
    const needsGenres = !game.genres || !String(game.genres).trim()
    const needsDev = !game.developer || !String(game.developer).trim()
    const needsPub = !game.publisher || !String(game.publisher).trim()
    const needsRelDate = !game.release_date || !String(game.release_date).trim()
    const needsMeta = forceAll || needsDesc || needsGenres || needsDev || needsPub || needsRelDate

    const isConfirmedDlc = (game.is_dlc === 1 || isDlcTitle(game.canonical_title)) && !isDlcException(game.canonical_title)
    const dlcBaseTitle = isConfirmedDlc ? extractDlcBaseTitle(game.canonical_title) : null
    if (needsMeta && isConfirmedDlc && dlcBaseTitle) {
      const localParent = findLocalParentGame(db, game.canonical_title, game.id)
      if (localParent) {
        const desc = localParent.description || null
        const genres = localParent.genres || localParent.genre || null
        const dev = localParent.developer || localParent.publisher || null
        const pub = localParent.publisher || localParent.developer || null
        const relDate = localParent.release_date || null
        const parentSgdb = localParent.steamgriddb_id || null

        db.prepare(`UPDATE games SET 
          description = CASE WHEN (description IS NULL OR TRIM(description) = '') THEN COALESCE(?, description) ELSE description END,
          genres = CASE WHEN (genres IS NULL OR TRIM(genres) = '') THEN COALESCE(?, genres) ELSE genres END,
          genre = CASE WHEN (genre IS NULL OR TRIM(genre) = '') THEN COALESCE(?, genre) ELSE genre END,
          developer = CASE WHEN (developer IS NULL OR TRIM(developer) = '') THEN COALESCE(?, developer) ELSE developer END,
          publisher = CASE WHEN (publisher IS NULL OR TRIM(publisher) = '') THEN COALESCE(?, publisher) ELSE publisher END,
          release_date = CASE WHEN (release_date IS NULL OR TRIM(release_date) = '') THEN COALESCE(?, release_date) ELSE release_date END,
          steamgriddb_id = COALESCE(?, steamgriddb_id),
          metadata_sync_status = 'synced',
          is_dlc = 1,
          updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?`
        ).run(desc, genres, genres, dev, pub, relDate, parentSgdb || null, game.id)

        updated++
        continue
      }
    }

    const titleToSearch = dlcBaseTitle || game.canonical_title

    let steamAppId = null
    try {
      const source = db.prepare("SELECT platform_game_id FROM game_sources WHERE game_id = ? AND platform = 'steam'").get(game.id)
      if (source?.platform_game_id && /^\d+$/.test(source.platform_game_id)) {
        steamAppId = source.platform_game_id
      }
    } catch {}

    if (needsMeta && !steamAppId) {
      steamAppId = await findSteamAppIdForTitle(titleToSearch, signal)
    }

    let igdbMeta = null
    if (needsMeta && igdbClientId && igdbClientSecret) {
      try {
        igdbMeta = await fetchIgdbMetadata(titleToSearch, igdbClientId, igdbClientSecret, signal, steamAppId)
      } catch {}
    }

    const stillMissingFields = Boolean(
      (needsDesc && !igdbMeta?.synopsis) ||
      (needsDev && !igdbMeta?.developer) ||
      (needsPub && !igdbMeta?.publisher) ||
      (needsGenres && !igdbMeta?.genres) ||
      (needsRelDate && !igdbMeta?.release_date)
    )

    let details = null
    if (needsMeta && stillMissingFields && steamAppId) {
      details = await fetchSteamAppDetails(steamAppId, signal)
    }

    let resolvedSgdbId = game.steamgriddb_id ? String(game.steamgriddb_id).trim() : null
    if (!resolvedSgdbId && key) {
      try {
        if (!steamAppId) {
          steamAppId = await findSteamAppIdForTitle(game.canonical_title, signal)
        }
        if (steamAppId) {
          const gameInfo = await apiGet(`/games/steam/${steamAppId}`, key, signal).catch(() => null)
          if (gameInfo?.id) resolvedSgdbId = String(gameInfo.id)
        }
        if (!resolvedSgdbId) {
          const searchRes = await apiGet(`/search/autocomplete/${encodeURIComponent(cleanArtworkTitle(game.canonical_title))}`, key, signal).catch(() => [])
          const bestMatch = findBestAutocompleteMatch(searchRes, game.canonical_title)
          if (bestMatch?.id) resolvedSgdbId = String(bestMatch.id)
        }
      } catch {}
    }

    if (igdbMeta || details || (resolvedSgdbId && resolvedSgdbId !== game.steamgriddb_id)) {
      const desc = (igdbMeta?.synopsis || details?.description || '').trim() || null
      const genres = (details?.genres || igdbMeta?.genres || '').trim() || null
      const rawDev = (details?.developer || igdbMeta?.developer || '').trim() || null
      const rawPub = (details?.publisher || igdbMeta?.publisher || '').trim() || null
      const dev = rawDev || rawPub || null
      const pub = rawPub || rawDev || null
      const relDate = (details?.releaseDate || igdbMeta?.release_date || '').trim() || null

      db.prepare(`UPDATE games SET 
        description = CASE WHEN (description IS NULL OR TRIM(description) = '') THEN COALESCE(?, description) ELSE description END,
        genres = CASE WHEN (genres IS NULL OR TRIM(genres) = '') THEN COALESCE(?, genres) ELSE genres END,
        genre = CASE WHEN (genre IS NULL OR TRIM(genre) = '') THEN COALESCE(?, genre) ELSE genre END,
        developer = CASE WHEN (developer IS NULL OR TRIM(developer) = '') THEN COALESCE(?, developer) ELSE developer END,
        publisher = CASE WHEN (publisher IS NULL OR TRIM(publisher) = '') THEN COALESCE(?, publisher) ELSE publisher END,
        release_date = CASE WHEN (release_date IS NULL OR TRIM(release_date) = '') THEN COALESCE(?, release_date) ELSE release_date END,
        steamgriddb_id = COALESCE(?, steamgriddb_id),
        metadata_sync_status = 'synced',
        updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`
      ).run(desc, genres, genres, dev, pub, relDate, resolvedSgdbId || null, game.id)

      updated++
    }

    await new Promise((resolve) => setTimeout(resolve, 800))
  }

  if (onProgress) {
    onProgress({
      source: 'metadata',
      phase: 'complete',
      current: total,
      total,
      message: `Metadata sync complete: ${updated} games updated.`,
    })
  }

  return { metadataUpdated: updated, candidates: total }
}

async function syncLibraryMetadataAndArt(db, userDataPath, apiKey, onProgress, signal, options = {}) {
  const key = safeKey(apiKey)
  const cacheDir = getArtworkDirectory(userDataPath)
  const heroResolution = getAppSettingValue(db, 'hero_resolution', '2.5k')
  const preferAnimated = Boolean(options?.preferAnimated ?? (getAppSettingValue(db, 'prefer_animated_artwork', 'false') === 'true'))
  const igdbClientId = getAppSettingValue(db, 'igdb_client_id')
  const igdbClientSecret = getAppSettingValue(db, 'igdb_client_secret')

  const forceAll = options?.forceAll !== false
  const candidates = forceAll
    ? db.prepare('SELECT * FROM games ORDER BY canonical_title COLLATE NOCASE').all()
    : db.prepare(`
        SELECT * FROM games 
        WHERE hero_url IS NULL OR TRIM(hero_url) = ''
        ORDER BY canonical_title COLLATE NOCASE
      `).all()

  let updated = 0
  let metadataUpdated = 0
  let heroesUpdated = 0
  const total = candidates.length

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) break
    const game = candidates[i]
    const currentNum = i + 1

    if (onProgress) {
      onProgress({
        source: 'sync',
        phase: 'fetching',
        current: currentNum,
        total,
        title: game.canonical_title,
        message: `Syncing: ${currentNum} / ${total} — ${game.canonical_title}`,
      })
    }

    // 1. Dual-Fetch Metadata (IGDB + Steam Store Fallback)
    const needsDesc = !game.description || !String(game.description).trim()
    const needsGenres = !game.genres || !String(game.genres).trim()
    const needsDev = !game.developer || !String(game.developer).trim()
    const needsPub = !game.publisher || !String(game.publisher).trim()
    const needsRelDate = !game.release_date || !String(game.release_date).trim()
    const needsMeta = needsDesc || needsGenres || needsDev || needsPub || needsRelDate

    // Check if this is a DLC: if parent game is locally in library, inherit metadata and artwork!
    const isConfirmedDlc = (game.is_dlc === 1 || isDlcTitle(game.canonical_title)) && !isDlcException(game.canonical_title)
    const dlcBaseTitle = isConfirmedDlc ? extractDlcBaseTitle(game.canonical_title) : null
    if (isConfirmedDlc && dlcBaseTitle) {
      const localParent = findLocalParentGame(db, game.canonical_title, game.id)
      if (localParent) {
        const desc = localParent.description || null
        const genres = localParent.genres || localParent.genre || null
        const dev = localParent.developer || localParent.publisher || null
        const pub = localParent.publisher || localParent.developer || null
        const relDate = localParent.release_date || null
        const parentCover = (needsCover && localParent.cover_url) ? localParent.cover_url : null
        const parentHero = (needsHero && localParent.hero_url) ? localParent.hero_url : null
        const parentLogo = (needsLogo && localParent.logo_url) ? localParent.logo_url : null
        const parentSgdb = localParent.steamgriddb_id || null

        db.prepare(`UPDATE games SET 
          description = CASE WHEN (description IS NULL OR TRIM(description) = '') THEN COALESCE(?, description) ELSE description END,
          genres = CASE WHEN (genres IS NULL OR TRIM(genres) = '') THEN COALESCE(?, genres) ELSE genres END,
          genre = CASE WHEN (genre IS NULL OR TRIM(genre) = '') THEN COALESCE(?, genre) ELSE genre END,
          developer = CASE WHEN (developer IS NULL OR TRIM(developer) = '') THEN COALESCE(?, developer) ELSE developer END,
          publisher = CASE WHEN (publisher IS NULL OR TRIM(publisher) = '') THEN COALESCE(?, publisher) ELSE publisher END,
          release_date = CASE WHEN (release_date IS NULL OR TRIM(release_date) = '') THEN COALESCE(?, release_date) ELSE release_date END,
          cover_url = COALESCE(?, cover_url),
          hero_url = COALESCE(?, hero_url),
          logo_url = COALESCE(?, logo_url),
          steamgriddb_id = COALESCE(?, steamgriddb_id),
          metadata_sync_status = 'synced',
          is_dlc = 1,
          updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?`
        ).run(desc, genres, genres, dev, pub, relDate, parentCover, parentHero, parentLogo, parentSgdb, game.id)

        if (desc || genres || dev || pub || relDate) metadataUpdated++
        if (parentCover || parentHero || parentLogo) updated++
        if (parentHero) heroesUpdated++
        continue
      }
    }

    const titleToSearch = dlcBaseTitle || game.canonical_title

    let steamAppId = null
    try {
      const source = db.prepare("SELECT platform_game_id FROM game_sources WHERE game_id = ? AND platform = 'steam'").get(game.id)
      if (source?.platform_game_id && /^\d+$/.test(source.platform_game_id)) {
        steamAppId = source.platform_game_id
      }
    } catch {}

    if (needsMeta && !steamAppId) {
      steamAppId = await findSteamAppIdForTitle(titleToSearch, signal)
    }

    let igdbMeta = null
    if (needsMeta && igdbClientId && igdbClientSecret) {
      try {
        igdbMeta = await fetchIgdbMetadata(titleToSearch, igdbClientId, igdbClientSecret, signal, steamAppId)
      } catch {}
    }

    const stillNeedsMeta = Boolean(
      (needsDesc && !igdbMeta?.synopsis) ||
      (needsDev && !igdbMeta?.developer) ||
      (needsPub && !igdbMeta?.publisher) ||
      (needsGenres && !igdbMeta?.genres) ||
      (needsRelDate && !igdbMeta?.release_date)
    )

    let details = null
    if (needsMeta && stillNeedsMeta && steamAppId) {
      details = await fetchSteamAppDetails(steamAppId, signal)
    }

    // 2. Visual Assets (SteamGridDB Heroes, Covers & Logos)
    const needsCover = forceAll || !game.cover_url || game.cover_url.includes('.svg') || game.cover_url.includes('fallback')
    const needsHero = forceAll || !game.hero_url || !String(game.hero_url).trim()
    const needsLogo = forceAll || !game.logo_url || !String(game.logo_url).trim()

    let newCoverUrl = null
    let newHeroUrl = null
    let newLogoUrl = null
    let resolvedId = game.steamgriddb_id ? String(game.steamgriddb_id).trim() : null

    try {
      let grids = []
      let heroes = []
      let logos = []
      if (resolvedId && key) {
        if (needsCover) grids = await fetchGridsForId(resolvedId, key, signal)
        if (needsHero) heroes = await fetchHeroesForId(resolvedId, key, signal, heroResolution)
        if (needsLogo) logos = await fetchLogosForId(resolvedId, key, signal)
      }

      // Check storefront IDs directly (Steam App ID or GOG ID) for instant, exact lookup
      if (key && ((!grids.length && needsCover) || (!heroes.length && needsHero) || (!logos.length && needsLogo))) {
        try {
          const sources = db.prepare("SELECT platform, platform_game_id FROM game_sources WHERE game_id = ?").all(game.id)
          let targetSteamId = steamAppId
          for (const s of sources) {
            if (s.platform === 'steam' && /^\d+$/.test(s.platform_game_id)) {
              targetSteamId = s.platform_game_id
              break
            }
          }
          if (targetSteamId) {
            if (needsCover && !grids.length) grids = await apiGet(`/grids/steam/${targetSteamId}?dimensions=600x900`, key, signal).catch(() => [])
            if (needsCover && !grids.length) grids = await apiGet(`/grids/steam/${targetSteamId}`, key, signal).catch(() => [])
            if (needsHero && !heroes.length) heroes = await fetchHeroesForId(targetSteamId, key, signal, heroResolution)
            if (needsLogo && !logos.length) logos = await apiGet(`/logos/steam/${targetSteamId}`, key, signal).catch(() => [])
            if (!resolvedId) {
              const gameInfo = await apiGet(`/games/steam/${targetSteamId}`, key, signal).catch(() => null)
              if (gameInfo?.id) resolvedId = String(gameInfo.id)
            }
          }
          for (const s of sources) {
            if (s.platform === 'gog' && /^\d+$/.test(s.platform_game_id)) {
              const gameInfo = await apiGet(`/games/gog/${s.platform_game_id}`, key, signal).catch(() => null)
              if (gameInfo?.id) {
                resolvedId = String(gameInfo.id)
                if (needsCover && !grids.length) grids = await fetchGridsForId(resolvedId, key, signal)
                if (needsHero && !heroes.length) heroes = await fetchHeroesForId(resolvedId, key, signal, heroResolution)
                if (needsLogo && !logos.length) logos = await fetchLogosForId(resolvedId, key, signal)
              }
              break
            }
          }
        } catch {}
      }

      // Autocomplete title search fallback
      if (key && ((!grids.length && needsCover) || (!heroes.length && needsHero && !resolvedId) || (!logos.length && needsLogo && !resolvedId))) {
        let searchRes = await apiGet(`/search/autocomplete/${encodeURIComponent(cleanArtworkTitle(game.canonical_title))}`, key, signal).catch(() => [])
        if (!searchRes?.length) {
          const stripped = stripTitleNoise(game.canonical_title)
          if (stripped && stripped !== game.canonical_title) {
            searchRes = await apiGet(`/search/autocomplete/${encodeURIComponent(cleanArtworkTitle(stripped))}`, key, signal).catch(() => [])
          }
        }
        if (!searchRes?.length && (game.canonical_title.includes(':') || game.canonical_title.includes(' - '))) {
          const prefix = game.canonical_title.split(/[:–—]| - /)[0].trim()
          if (prefix && prefix !== game.canonical_title) {
            searchRes = await apiGet(`/search/autocomplete/${encodeURIComponent(cleanArtworkTitle(prefix))}`, key, signal).catch(() => [])
          }
        }
        const bestMatch = findBestAutocompleteMatch(searchRes, game.canonical_title)
        if (bestMatch?.id) {
          resolvedId = String(bestMatch.id)
          if (needsCover && !grids.length) grids = await fetchGridsForId(resolvedId, key, signal)
          if (needsHero && !heroes.length) heroes = await fetchHeroesForId(resolvedId, key, signal, heroResolution)
          if (needsLogo && !logos.length) logos = await fetchLogosForId(resolvedId, key, signal)
        }
      }

      const bestGrid = pickBestGrid(grids)
      if (bestGrid?.url && needsCover) {
        const ext = getArtworkExtension(bestGrid.url, 'jpg')
        const dest = path.join(cacheDir, `${artworkSlug(game)}-cover.${ext}`)
        newCoverUrl = await downloadImage(bestGrid.url, dest)
      }
      const bestHero = pickBestHero(heroes, heroResolution, preferAnimated)
      if (bestHero?.url && needsHero) {
        const ext = getArtworkExtension(bestHero.url, 'jpg')
        const destHero = path.join(cacheDir, `${artworkSlug(game)}-hero.${ext}`)
        newHeroUrl = await downloadImage(bestHero.url, destHero)
      }
      if (logos?.[0]?.url && needsLogo) {
        const destLogo = path.join(cacheDir, `${artworkSlug(game)}-logo.png`)
        try {
          newLogoUrl = await downloadImage(logos[0].url, destLogo)
        } catch {}
      }
    } catch {}

    // Fall back to Steam Store search if cover or hero still needed
    if ((needsCover && !newCoverUrl) || (needsHero && !newHeroUrl)) {
      try {
        const match = await fetchSteamStorePoster(game.canonical_title)
        if (match?.coverUrl && needsCover && !newCoverUrl) {
          const dest = path.join(cacheDir, `${artworkSlug(game)}-cover.jpg`)
          try { newCoverUrl = await downloadImage(match.coverUrl, dest) } catch { newCoverUrl = match.coverUrl }
        }
        if (match?.heroUrl && needsHero && !newHeroUrl) {
          const destHero = path.join(cacheDir, `${artworkSlug(game)}-hero.jpg`)
          try { newHeroUrl = await downloadImage(match.heroUrl, destHero) } catch { newHeroUrl = match.heroUrl }
        }
      } catch {}
    }

    // 3. Database Update
    const desc = (igdbMeta?.synopsis || details?.description || '').trim() || null
    const genres = (details?.genres || igdbMeta?.genres || '').trim() || null
    const rawDev = (details?.developer || igdbMeta?.developer || '').trim() || null
    const rawPub = (details?.publisher || igdbMeta?.publisher || '').trim() || null
    const dev = rawDev || rawPub || null
    const pub = rawPub || rawDev || null
    const relDate = (details?.releaseDate || igdbMeta?.release_date || '').trim() || null

    if (desc || genres || dev || pub || relDate || newCoverUrl || newHeroUrl || newLogoUrl || (resolvedId && resolvedId !== game.steamgriddb_id)) {
      db.prepare(`UPDATE games SET 
        description = CASE WHEN (description IS NULL OR TRIM(description) = '') THEN COALESCE(?, description) ELSE description END,
        genres = CASE WHEN (genres IS NULL OR TRIM(genres) = '') THEN COALESCE(?, genres) ELSE genres END,
        genre = CASE WHEN (genre IS NULL OR TRIM(genre) = '') THEN COALESCE(?, genre) ELSE genre END,
        developer = CASE WHEN (developer IS NULL OR TRIM(developer) = '') THEN COALESCE(?, developer) ELSE developer END,
        publisher = CASE WHEN (publisher IS NULL OR TRIM(publisher) = '') THEN COALESCE(?, publisher) ELSE publisher END,
        release_date = CASE WHEN (release_date IS NULL OR TRIM(release_date) = '') THEN COALESCE(?, release_date) ELSE release_date END,
        cover_url = COALESCE(?, cover_url),
        hero_url = COALESCE(?, hero_url),
        logo_url = COALESCE(?, logo_url),
        steamgriddb_id = COALESCE(?, steamgriddb_id),
        metadata_sync_status = 'synced',
        updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`
      ).run(desc, genres, genres, dev, pub, relDate, newCoverUrl, newHeroUrl, newLogoUrl, resolvedId || null, game.id)

      if (desc || genres || dev || pub || relDate) metadataUpdated++
      if (newCoverUrl || newHeroUrl || newLogoUrl) updated++
      if (newHeroUrl) heroesUpdated++
    }

    // 4. API Throttling (Rate Limit Protection: 800ms)
    await new Promise((resolve) => setTimeout(resolve, 800))
  }

  if (onProgress) {
    onProgress({
      source: 'sync',
      phase: 'complete',
      current: total,
      total,
      message: `Sync complete: ${updated} artwork updated, ${metadataUpdated} metadata updated.`,
    })
  }

  return {
    candidates: total,
    updated,
    metadataUpdated,
    heroesUpdated,
  }
}
async function fetchGameMetadata(db, gameId, signal) {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId)
  if (!game) throw new Error('The selected game could not be found.')

  const igdbClientId = getAppSettingValue(db, 'igdb_client_id')
  const igdbClientSecret = getAppSettingValue(db, 'igdb_client_secret')

  let steamAppId = null
  try {
    const source = db.prepare("SELECT platform_game_id FROM game_sources WHERE game_id = ? AND platform = 'steam'").get(game.id)
    if (source?.platform_game_id && /^\d+$/.test(source.platform_game_id)) {
      steamAppId = source.platform_game_id
    }
  } catch {}

  if (!steamAppId) {
    steamAppId = await findSteamAppIdForTitle(game.canonical_title, signal)
  }

  let igdbMeta = null
  if (igdbClientId && igdbClientSecret) {
    try {
      igdbMeta = await fetchIgdbMetadata(game.canonical_title, igdbClientId, igdbClientSecret, signal, steamAppId)
    } catch {}
  }

  const stillMissing = Boolean(
    (!igdbMeta?.synopsis) ||
    (!igdbMeta?.developer) ||
    (!igdbMeta?.publisher) ||
    (!igdbMeta?.genres) ||
    (!igdbMeta?.release_date)
  )

  let details = null
  if (stillMissing && steamAppId) {
    details = await fetchSteamAppDetails(steamAppId, signal)
  }

  const desc = (igdbMeta?.synopsis || details?.description || '').trim() || null
  const genres = (details?.genres || igdbMeta?.genres || '').trim() || null
  const rawDev = (details?.developer || igdbMeta?.developer || '').trim() || null
  const rawPub = (details?.publisher || igdbMeta?.publisher || '').trim() || null
  const dev = rawDev || rawPub || null
  const pub = rawPub || rawDev || null
  const relDate = (details?.releaseDate || igdbMeta?.release_date || '').trim() || null

  return {
    description: desc,
    genres,
    developer: dev,
    publisher: pub,
    releaseDate: relDate,
    steamAppId: steamAppId || null,
    igdbId: igdbMeta?.igdbId || null,
  }
}
function fetchMissingArtwork(db, userDataPath, apiKey, onProgress) { return runBulkArtworkSync(db, userDataPath, apiKey, onProgress) }

module.exports = {
  getArtworkDirectory,
  migrateLegacyArtwork,
  autoResolveMissingArtwork,
  relinkAllLocalArtwork,
  relinkLocalArtwork,
  fastTrackCompleteLocalMetadataBatch,
  generateAutomaticFallbacks,
  syncLibraryMetadata,
  syncLibraryMetadataAndArt,
  fetchMissingArtwork,
  fetchGameMetadata,
  runBulkArtworkSync,
  refetchArtworkByExactId,
  refetchSelectedArtwork,
  copyManualArtwork,
  copyArtworkOverride,
  repairBrokenArtworkLinks,
  fetchGridsForId,
  fetchHeroesForId,
  resolveGameExecutable,
}