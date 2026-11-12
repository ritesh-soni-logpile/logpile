const os = require('node:os')
const path = require('node:path')
const fs = require('node:fs')
const { updateGameSavePath, insertTechKnowledge } = require('../../../electron/db.cjs')

const HEADERS = {
  'User-Agent': 'Logpile/1.3.0 (Offline Game Launcher; https://github.com/ritesh-soni-logpile/logpile)',
  'Accept': 'application/json',
}

/**
 * Cleans a game title for PCGamingWiki searching.
 */
function cleanTitleForPcgw(title) {
  if (!title || typeof title !== 'string') return ''
  let clean = title.trim()

  // Strip trademark and copyright symbols
  clean = clean.replace(/[™®©]/g, '')

  // Strip common store/edition suffixes
  const suffixes = [
    /\s*[-–—:]\s*(?:Game of the Year|GOTY|Enhanced|Legacy|Definitive|Director'?s Cut|Remastered|Complete|Ultimate|Standard|Collector'?s|Anniversary|Deluxe|Special|Digital Deluxe)\s*Edition\b/i,
    /\s*\((?:Game of the Year|GOTY|Enhanced|Legacy|Definitive|Director'?s Cut|Remastered|Complete|Ultimate)\s*Edition\)/i,
    /\s+Director'?s Cut\b/i,
    /\s+GOTY\b/i,
    /\s+Remastered\b/i,
    /\s+Definitive Edition\b/i,
    /\s+Enhanced Edition\b/i,
    /\s+Complete Edition\b/i,
  ]

  for (const pattern of suffixes) {
    clean = clean.replace(pattern, '')
  }

  return clean.trim()
}

/**
 * Validates that a resolved path is safe for game save reading/zipping.
 * Prevents path traversal, UNC network attacks, drive roots, and system directories.
 *
 * @param {string} targetPath - Path to evaluate
 * @returns {boolean} True if the path is safe
 */
function isSafeSavePath(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return false
  const p = path.resolve(targetPath)

  // 1. Must be an absolute path
  if (!path.isAbsolute(p)) return false

  // 2. Reject UNC network paths (e.g. \\server\share or //server/share)
  if (targetPath.startsWith('\\\\') || targetPath.startsWith('//') || p.startsWith('\\\\')) {
    return false
  }

  // 3. Reject drive root paths (e.g. C:\, D:\)
  const parsed = path.parse(p)
  if (p === parsed.root || p === parsed.root.replace(/[\\\/]$/, '')) {
    return false
  }

  // 4. Reject Windows system directories
  const systemRoot = process.env.SystemRoot || process.env.windir || 'C:\\Windows'
  const normSystemRoot = path.resolve(systemRoot).toLowerCase()
  const normPath = p.toLowerCase()

  if (normPath === normSystemRoot || normPath.startsWith(normSystemRoot + path.sep)) {
    return false
  }

  // 5. Disallow top-level Program Files or Windows root directories directly as a save folder
  const progFiles = (process.env.ProgramFiles || 'C:\\Program Files').toLowerCase()
  const progFilesX86 = (process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)').toLowerCase()
  if (normPath === progFiles || normPath === progFilesX86) {
    return false
  }

  // 6. Must have at least 2 segments beyond drive root (e.g. C:\Users\... or D:\Games\...)
  const segments = p.split(path.sep).filter(Boolean)
  if (segments.length < 2) {
    return false
  }

  return true
}

/**
 * Resolves a PCGamingWiki path template string into an absolute Windows local path.
 * Enforces strict path traversal and safety checks.
 *
 * Example inputs:
 *   "{{P|userprofile\\Documents}}\\Rockstar Games\\GTA V\\Profiles\\{{P|uid}}"
 *   "{{p|userprofile\\Documents}}\\Saved Games\\Hades"
 *   "{{LOCALAPPDATA}}\\Capcom\\Resident Evil 4"
 */
function resolvePcgwPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return null

  // 1. Clean out wiki markup, notes, and references
  let cleaned = rawPath
    .replace(/<ref[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\{\{Folder\|([^}]+)\}\}/gi, '$1')
    .trim()

  // Reject immediate UNC network path attempts
  if (cleaned.startsWith('\\\\') || cleaned.startsWith('//')) {
    return null
  }

  // If multiple alternative paths separated by pipe (|) or newline, take the first primary path
  if (cleaned.includes('|') && !cleaned.startsWith('{{')) {
    cleaned = cleaned.split('|')[0].trim()
  }

  const homedir = os.homedir()
  const localAppData = process.env.LOCALAPPDATA || path.join(homedir, 'AppData', 'Local')
  const appData = process.env.APPDATA || path.join(homedir, 'AppData', 'Roaming')
  const programData = process.env.ProgramData || 'C:\\ProgramData'
  const documents = path.join(homedir, 'Documents')
  const savedGames = path.join(homedir, 'Saved Games')

  // Map known template tokens case-insensitively
  cleaned = cleaned
    .replace(/\{\{P\|userprofile[\\\/]+documents\}\}/gi, documents)
    .replace(/\{\{P\|userprofile[\\\/]+saved games\}\}/gi, savedGames)
    .replace(/\{\{P\|userprofile[\\\/]+appdata[\\\/]+local\}\}/gi, localAppData)
    .replace(/\{\{P\|userprofile[\\\/]+appdata[\\\/]+roaming\}\}/gi, appData)
    .replace(/\{\{P\|userprofile[\\\/]+appdata[\\\/]+locallow\}\}/gi, path.join(homedir, 'AppData', 'LocalLow'))
    .replace(/\{\{P\|documents\}\}/gi, documents)
    .replace(/\{\{P\|saved games\}\}/gi, savedGames)
    .replace(/\{\{P\|localappdata\}\}/gi, localAppData)
    .replace(/\{\{P\|appdata\}\}/gi, appData)
    .replace(/\{\{P\|programdata\}\}/gi, programData)
    .replace(/\{\{P\|userprofile\}\}/gi, homedir)
    .replace(/\{\{USERPROFILE\}\}/gi, homedir)
    .replace(/\{\{LOCALAPPDATA\}\}/gi, localAppData)
    .replace(/\{\{APPDATA\}\}/gi, appData)
    .replace(/\{\{PROGRAMDATA\}\}/gi, programData)
    .replace(/\{\{DOCUMENTS\}\}/gi, documents)
    .replace(/\{\{SAVEDGAMES\}\}/gi, savedGames)

  // Strip remaining variable wrappers like {{p|uid}}, {{p|steamid}}, {{p|username}}
  const hasWildcardSubdir = /\{\{P\|(?:uid|steamid|username|user)\}\}/i.test(cleaned)
  cleaned = cleaned.replace(/\{\{P\|[^\}]+\}\}/gi, '')

  // Normalize slashes
  cleaned = cleaned.replace(/[\/\\]+/g, path.sep).trim()
  // Remove trailing slashes
  cleaned = cleaned.replace(/[\\\/]+$/, '')

  // Resolve fully to absolute path (collapses any .. traversal sequences)
  const resolved = path.resolve(cleaned)

  // Strict security check: reject if path is unsafe or traversed into system dirs
  if (!isSafeSavePath(resolved)) {
    return null
  }

  // If path contained a user-specific subfolder (like {{p|uid}}), resolve to existing child if present
  if (hasWildcardSubdir && fs.existsSync(resolved)) {
    try {
      const entries = fs.readdirSync(resolved, { withFileTypes: true })
      const subdirs = entries.filter((e) => e.isDirectory())
      if (subdirs.length === 1) {
        const childPath = path.join(resolved, subdirs[0].name)
        return isSafeSavePath(childPath) ? childPath : null
      }
    } catch {}
  }

  return resolved
}

/**
 * Converts PCGW wikitext sections to clean Markdown.
 */
function convertWikitextToMarkdown(wikitext) {
  if (!wikitext || typeof wikitext !== 'string') return ''

  return wikitext
    // Strip fixbox template wrappers
    .replace(/\{\{Fixbox\|([\s\S]*?)\}\}/gi, (_match, inner) => {
      // Extract fix= or description=
      const fixMatch = inner.match(/fix=([\s\S]*?)(?:\|[a-z_]+=|$)/i)
      const descMatch = inner.match(/description=([^|]+)/i)
      const desc = descMatch ? `**${descMatch[1].trim()}**\n\n` : ''
      const fix = fixMatch ? fixMatch[1].trim() : inner
      return `${desc}${fix}`
    })
    // Strip ref tags and templates
    .replace(/<ref[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/\{\{Refcheck[^\}]*\}\}/gi, '')
    .replace(/\{\{ii\}\}/gi, 'ℹ️')
    .replace(/\{\{folder\|([^\}]+)\}\}/gi, '`$1`')
    .replace(/\{\{file\|([^\}]+)\}\}/gi, '`$1`')
    .replace(/\{\{p\|([^\}]+)\}\}/gi, '$1')
    .replace(/\{\{code\|([^\}]+)\}\}/gi, '`$1`')
    // Convert wiki headers
    .replace(/^=====\s*(.*?)\s*=====/gm, '##### $1')
    .replace(/^====\s*(.*?)\s*====/gm, '#### $1')
    .replace(/^===\s*(.*?)\s*===/gm, '### $1')
    .replace(/^==\s*(.*?)\s*==/gm, '## $1')
    // Convert wiki links [[target|label]] -> label, [[target]] -> target
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    // Convert external links [url label] -> [label](url)
    .replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, '[$2]($1)')
    // Clean bullet formatting
    .replace(/^\*\*\*\s*/gm, '      - ')
    .replace(/^\*\*\s*/gm, '    - ')
    .replace(/^\*\s*/gm, '  - ')
    // Remove extra blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Extracts Windows save path template from PCGW wikitext, handling nested templates.
 * e.g. {{Game data/saves|Windows|{{p|userprofile\Documents}}\Saved Games\Hades\}}
 */
function extractWindowsSaveTemplate(wikitext) {
  if (!wikitext || typeof wikitext !== 'string') return null

  const regex = /\{\{\s*Game data\/saves\s*\|\s*Windows\s*\|/i
  const match = wikitext.match(regex)
  if (!match) return null

  const startPos = match.index + match[0].length
  let depth = 1
  let i = startPos

  while (i < wikitext.length && depth > 0) {
    if (wikitext[i] === '{' && wikitext[i + 1] === '{') {
      depth++
      i += 2
      continue
    }
    if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
      depth--
      if (depth === 0) {
        return wikitext.slice(startPos, i).trim()
      }
      i += 2
      continue
    }
    i++
  }

  return null
}

/**
 * Queries PCGamingWiki for game technical information and save game directory.
 * STRICTLY OPT-IN: Only called via explicit manual UI trigger.
 *
 * @param {object} db - SQLite database instance
 * @param {string} gameId - Game ID in database
 * @param {string} canonicalTitle - Game title
 * @returns {Promise<{ success: boolean, saveDirPath?: string, engine?: string, sectionsImported?: number, error?: string }>}
 */
async function fetchPcgwTechDataManual(db, gameId, canonicalTitle) {
  if (!gameId || !canonicalTitle) {
    return { success: false, error: 'Game ID and title are required.' }
  }

  const cleanTitle = cleanTitleForPcgw(canonicalTitle)
  let rawSaveWindows = null
  let engine = null
  let fullWikitext = null

  try {
    const cargoUrl = `https://www.pcgamingwiki.com/w/api.php?action=cargoquery&tables=Infobox_game,Save_game_data&fields=Infobox_game.Engine,Save_game_data.Windows&where=Infobox_game._pageName="${encodeURIComponent(cleanTitle)}"&format=json`
    const cargoRes = await fetch(cargoUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
    if (cargoRes.ok) {
      const cargoData = await cargoRes.json()
      if (cargoData?.cargoquery?.length) {
        const row = cargoData.cargoquery[0]?.title
        if (row) {
          rawSaveWindows = row['Save_game_data.Windows'] || row.Windows || null
          engine = row['Infobox_game.Engine'] || row.Engine || null
        }
      }
    }
  } catch {}

  try {
    const parseUrl = `https://www.pcgamingwiki.com/w/api.php?action=parse&page=${encodeURIComponent(cleanTitle)}&prop=wikitext&format=json`
    const parseRes = await fetch(parseUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
    if (parseRes.ok) {
      const parseData = await parseRes.json()
      fullWikitext = parseData?.parse?.wikitext?.['*'] || null
    }

    if (!fullWikitext && /[:\-–—]/.test(cleanTitle)) {
      const prefix = cleanTitle.split(/[:\-–—]/)[0].trim()
      if (prefix && prefix !== cleanTitle) {
        const altUrl = `https://www.pcgamingwiki.com/w/api.php?action=parse&page=${encodeURIComponent(prefix)}&prop=wikitext&format=json`
        const altRes = await fetch(altUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
        if (altRes.ok) {
          const altData = await altRes.json()
          fullWikitext = altData?.parse?.wikitext?.['*'] || null
        }
      }
    }
  } catch {}

  if (!rawSaveWindows && fullWikitext) {
    rawSaveWindows = extractWindowsSaveTemplate(fullWikitext)
  }

  let resolvedSavePath = null
  if (rawSaveWindows) {
    resolvedSavePath = resolvePcgwPath(rawSaveWindows)
    if (resolvedSavePath) {
      updateGameSavePath(db, gameId, resolvedSavePath)
    }
  }

  let sectionsImported = 0
  if (fullWikitext) {
    const impMatch = fullWikitext.match(/==\s*Essential improvements\s*==([\s\S]*?)(?=\n==[^=]|$)/i)
    if (impMatch && impMatch[1] && impMatch[1].trim().length > 20) {
      const mdContent = convertWikitextToMarkdown(impMatch[1])
      if (mdContent) {
        insertTechKnowledge(db, gameId, 'Essential improvements', mdContent)
        sectionsImported++
      }
    }

    const fixMatch = fullWikitext.match(/==\s*Issues (?:fixed|unresolved)\s*==([\s\S]*?)(?=\n==[^=]|$)/i)
    if (fixMatch && fixMatch[1] && fixMatch[1].trim().length > 20) {
      const mdContent = convertWikitextToMarkdown(fixMatch[1])
      if (mdContent) {
        insertTechKnowledge(db, gameId, 'Issues fixed', mdContent)
        sectionsImported++
      }
    }

    const gameDataMatch = fullWikitext.match(/==\s*Game data\s*==([\s\S]*?)(?=\n==[^=]|$)/i)
    if (gameDataMatch && gameDataMatch[1] && gameDataMatch[1].trim().length > 20) {
      const mdContent = convertWikitextToMarkdown(gameDataMatch[1])
      if (mdContent) {
        insertTechKnowledge(db, gameId, 'Save & Config Locations', mdContent)
        sectionsImported++
      }
    }
  }

  return {
    success: Boolean(resolvedSavePath || sectionsImported > 0),
    saveDirPath: resolvedSavePath,
    engine,
    sectionsImported,
  }
}

module.exports = {
  cleanTitleForPcgw,
  resolvePcgwPath,
  isSafeSavePath,
  convertWikitextToMarkdown,
  fetchPcgwTechDataManual,
}
