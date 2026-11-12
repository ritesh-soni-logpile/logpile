const fs = require('fs')
const path = require('path')
const { indexSingleFile } = require('./guideImporter.cjs')
const { hasGuide } = require('../../../electron/db.cjs')

const USER_AGENT = 'Logpile/1.1 (https://github.com/ritesh-soni-logpile/logpile; contact@logpile.local)'

const HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'application/json',
}

let batchCancelled = false

/**
 * Splits camelCase and PascalCase words ("GrandChase" -> "Grand Chase").
 */
function splitPascalCase(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
}

/**
 * Cleans a game title by stripping store tags, edition suffixes, and punctuation noise.
 */
function cleanTitleForWiki(title) {
  if (!title) return ''
  let cleaned = String(title)

  // 1. Fix encoding artifacts and normalize quotes/dashes
  cleaned = cleaned
    .replace(/(?:[\uFFFD\u00BF]\?Ts|\?Ts)/gi, "'s")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/[™®©]/g, '')

  // 2. PascalCase splitting for joined names like GrandChase -> Grand Chase
  cleaned = splitPascalCase(cleaned)

  // 3. Remove store / release tags in brackets e.g. (Steam), [GOG], (2022)
  cleaned = cleaned.replace(/\s*\(\d{4}\)/g, '')
  cleaned = cleaned.replace(/\s*[\(\[][^()\[\]]*(?:steam|epic|gog|ea|ubisoft|repack|edition|definitive|remastered|goty|cut|version|build|patch|update|unplayed|bundle|pack|demo|prologue|beta)[^()\[\]]*[\)\]]/gi, '')
  cleaned = cleaned.replace(/\s*\((?:or\s+)?[^)]+\)/gi, '')

  // 4. Strip common store and edition suffixes
  cleaned = cleaned
    .replace(/\s*[-:]?\s*\b(?:standard|deluxe|digital deluxe|premium|collector'?s?|special|definitive|remastered|enhanced|anniversary|complete|goty|game of the year|director'?s? cut|spacer'?s? choice|omega|starter|platinum|ultimate|celebration|legacy|gold|silver|royale|first contact|day one|launch|master assassin|elite nightfall|challenger|rampage)\s+edition\b.*$/gi, '')
    .replace(/\s*[-:]\s*(?:[A-Za-z0-9'\s]+)?\s*edition\b.*$/gi, '')
    .replace(/\s*\b(?:game of the year edition|goty edition|definitive edition|remastered|enhanced edition|premium edition|legacy edition|director'?s? cut)\b.*$/gi, '')
    .replace(/\s*[-:]\s*(?:prologue|beta|demo|starter pack|starter edition|ultimate edition|redmod)\b.*$/gi, '')
    .replace(/\s+\b(?:enhanced|legacy|remastered|goty)\b$/gi, '')

  return cleaned.replace(/\s+/g, ' ').trim()
}

/**
 * Strips subtitles following colons or dashes (e.g. "Hellblade: Senua's Sacrifice" -> "Hellblade").
 */
function stripSubtitles(title) {
  if (!title) return ''
  const parts = title.split(/\s*[:\-–—]\s*/)
  if (parts.length > 1 && parts[0].trim().length >= 2) {
    return parts[0].trim()
  }
  return title.trim()
}

/**
 * Strips wikitext markup and translates headings into Markdown.
 */
function cleanWikitextToMarkdown(wikitext, gameTitle) {
  if (!wikitext || typeof wikitext !== 'string') return ''
  let md = wikitext

  // Remove comments, file embeds, tables, and templates
  md = md.replace(/<!--[\s\S]*?-->/g, '')
  md = md.replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, '')
  md = md.replace(/\{\|[\s\S]*?\|\}/g, '')

  let prev
  let depth = 0
  do {
    prev = md
    md = md.replace(/\{\{[^{}]*\}\}/g, '')
    depth++
  } while (md !== prev && depth < 10)

  // Convert headings
  md = md.replace(/^====\s*([^=\r\n]+)\s*====/gm, '#### $1')
  md = md.replace(/^===\s*([^=\r\n]+)\s*===/gm, '### $1')
  md = md.replace(/^==\s*([^=\r\n]+)\s*==/gm, '## $1')

  // Formatting & links
  md = md.replace(/'''([^'\r\n]+)'''/g, '**$1**')
  md = md.replace(/''([^'\r\n]+)''/g, '*$1*')
  md = md.replace(/\[\[(?:[^|\]\r\n]+\|)?([^\]\r\n]+)\]\]/g, '$1')
  md = md.replace(/<\/?[a-zA-Z][^>]*>/g, '')

  return md
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

/**
 * Queries StrategyWiki for a matching article title.
 */
async function searchStrategyWikiDirect(term) {
  if (!term || term.length < 2) return null

  // 1. OpenSearch
  try {
    const openUrl = `https://strategywiki.org/w/api.php?action=opensearch&search=${encodeURIComponent(term)}&limit=5&format=json`
    const res = await fetch(openUrl, { headers: HEADERS })
    if (res.ok) {
      const data = await res.json()
      const titles = Array.isArray(data?.[1]) ? data[1] : []
      if (titles.length > 0) {
        const exact = titles.find((t) => t.toLowerCase() === term.toLowerCase())
        if (exact) return exact
        const root = titles.find((t) => !t.includes('/'))
        if (root) return root
        return titles[0]
      }
    }
  } catch {}

  // 2. Query search
  try {
    const queryUrl = `https://strategywiki.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json`
    const res = await fetch(queryUrl, { headers: HEADERS })
    if (res.ok) {
      const data = await res.json()
      const searchResults = data?.query?.search || []
      if (searchResults.length > 0) {
        const exact = searchResults.find((s) => s.title.toLowerCase() === term.toLowerCase())
        if (exact) return exact.title
        const root = searchResults.find((s) => !s.title.includes('/'))
        if (root) return root.title
        return searchResults[0].title
      }
    }
  } catch {}

  return null
}

/**
 * Fetches StrategyWiki wikitext for a given page.
 */
async function fetchPageWikitext(pageTitle) {
  try {
    const url = `https://strategywiki.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext&format=json`
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) return null
    const data = await res.json()
    return data?.parse?.wikitext?.['*'] || null
  } catch {
    return null
  }
}

/**
 * Extracts subpage links from StrategyWiki main hub page.
 */
function extractSubpageLinks(wikitext, hubTitle) {
  if (!wikitext) return []
  const escapedHub = hubTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`\\[\\[(${escapedHub}\\/[^\\|\\]]+)(?:\\|([^\\]]+))?\\]\\]`, 'gi')
  const links = []
  let match
  while ((match = regex.exec(wikitext)) !== null) {
    const page = match[1].trim()
    const label = match[2] ? match[2].trim() : page.replace(`${hubTitle}/`, '')
    if (!links.some((l) => l.page === page)) {
      links.push({ page, label })
    }
  }
  return links
}

/**
 * Tier 1: Attempts to download a walkthrough from StrategyWiki.
 */
async function fetchStrategyWikiGuide(cleanTitle, canonicalTitle) {
  let wikiTitle = await searchStrategyWikiDirect(cleanTitle)
  if (!wikiTitle && /[:\-–—]/.test(cleanTitle)) {
    const prefix = stripSubtitles(cleanTitle)
    if (prefix && prefix !== cleanTitle) {
      wikiTitle = await searchStrategyWikiDirect(prefix)
    }
  }

  if (!wikiTitle) return null

  const mainWikitext = await fetchPageWikitext(wikiTitle)
  if (!mainWikitext) return null

  const cleanedMain = cleanWikitextToMarkdown(mainWikitext, canonicalTitle)
  // Check if content is substantive (> 200 chars and not just wiki category tags)
  const isMeaningful = cleanedMain.length > 200 && !/^(\[\[Category:[^\]]+\]\]\s*)+$/i.test(cleanedMain)
  if (!isMeaningful) return null

  let fullMarkdown = `# ${canonicalTitle} Guide\n\n## Overview\n\n${cleanedMain}\n\n`

  let subpages = extractSubpageLinks(mainWikitext, wikiTitle)
  if (subpages.length === 0) {
    const tocWikitext = await fetchPageWikitext(`${wikiTitle}/Table of Contents`)
    if (tocWikitext) {
      subpages = extractSubpageLinks(tocWikitext, wikiTitle)
    }
  }

  if (subpages.length > 0) {
    const targetSubpages = subpages
      .filter((s) => !/table of contents|staff|version/i.test(s.label))
      .slice(0, 10)

    for (const sub of targetSubpages) {
      await new Promise((r) => setTimeout(r, 200))
      const subWiki = await fetchPageWikitext(sub.page)
      if (subWiki) {
        const cleanedSub = cleanWikitextToMarkdown(subWiki, canonicalTitle)
        if (cleanedSub && cleanedSub.length > 60) {
          fullMarkdown += `## ${sub.label}\n\n${cleanedSub}\n\n`
        }
      }
    }
  }

  return fullMarkdown
}

/**
 * Extracts and formats clean Markdown sections from Wikipedia article extract text.
 */
function extractWikipediaSections(extract, gameTitle) {
  if (!extract || typeof extract !== 'string') return null

  // 1. Overview & Premise: Text preceding the first section header
  const firstHeaderMatch = extract.match(/\n==+\s*([^=]+)\s*==+/)
  let overview = ''
  let remaining = ''

  if (firstHeaderMatch && firstHeaderMatch.index !== undefined) {
    overview = extract.slice(0, firstHeaderMatch.index).trim()
    remaining = extract.slice(firstHeaderMatch.index)
  } else {
    overview = extract.trim()
    remaining = ''
  }

  overview = overview
    .replace(/\[\d+\]/g, '')
    .replace(/\[(?:note|citation)[^\]]*\]/gi, '')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()

  // 2. Gameplay & Mechanics section
  let gameplay = ''
  const gameplayMatch = remaining.match(/\n==\s*Gameplay(?:\s*(?:and|&)\s*(?:mechanics|features|modes?))?\s*==([\s\S]*?)(?=\n==\s*[^=]|$)/i)

  if (gameplayMatch && gameplayMatch[1]) {
    gameplay = gameplayMatch[1]
      .replace(/^===\s*([^=\r\n]+)\s*===/gm, '### $1')
      .replace(/^====\s*([^=\r\n]+)\s*====/gm, '#### $1')
      .replace(/\[\d+\]/g, '')
      .replace(/\[(?:note|citation)[^\]]*\]/gi, '')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim()
  }

  // Fallback to Synopsis / Premise / Setting if no Gameplay section
  if (!gameplay) {
    const synopsisMatch = remaining.match(/\n==\s*(?:Synopsis|Plot|Premise|Setting)\s*==([\s\S]*?)(?=\n==\s*[^=]|$)/i)
    if (synopsisMatch && synopsisMatch[1]) {
      gameplay = synopsisMatch[1]
        .replace(/^===\s*([^=\r\n]+)\s*===/gm, '### $1')
        .replace(/^====\s*([^=\r\n]+)\s*====/gm, '#### $1')
        .replace(/\[\d+\]/g, '')
        .replace(/\[(?:note|citation)[^\]]*\]/gi, '')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim()
    }
  }

  if (!overview && !gameplay) return null

  let markdown = `# ${gameTitle} Guide\n\n`
  if (overview) {
    markdown += `## Overview & Premise\n\n${overview}\n\n`
  }
  if (gameplay) {
    markdown += `## Gameplay & Mechanics\n\n${gameplay}\n\n`
  }

  return markdown
}

/**
 * Tier 2: Queries Wikipedia's free REST/Action API with disambiguation handling.
 */
async function fetchWikipediaGuide(cleanTitle, canonicalTitle) {
  if (!cleanTitle || cleanTitle.length < 2) return null

  const queryWiki = async (searchTitle) => {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageprops&explaintext=1&redirects=1&titles=${encodeURIComponent(searchTitle)}&format=json`
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) return null
      const data = await res.json()
      const pages = data?.query?.pages || {}
      const pid = Object.keys(pages)[0]
      return pid && pid !== '-1' ? pages[pid] : null
    } catch {
      return null
    }
  }

  let page = await queryWiki(cleanTitle)

  // Disambiguation check
  const isDisambiguation = (p) => {
    if (!p || !p.extract) return true
    if (p.pageprops?.disambiguation !== undefined) return true
    const lead = p.extract.slice(0, 350)
    return /\b(?:may refer to|refer to|refers to|disambiguation)\b/i.test(lead) || (p.extract.length < 600 && /\brefer\b/i.test(p.extract))
  }

  // If missing or disambiguation page, search with "video game" query
  if (!page || !page.extract || isDisambiguation(page) || page.extract.length < 150) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTitle + ' video game')}&format=json`
      const sRes = await fetch(searchUrl, { headers: HEADERS })
      if (sRes.ok) {
        const sData = await sRes.json()
        const topResult = sData?.query?.search?.[0]?.title
        if (topResult) {
          page = await queryWiki(topResult)
        }
      }
    } catch {}
  }

  // Fallback: If still nothing and cleanTitle has subtitles, try searching prefix
  if ((!page || !page.extract || isDisambiguation(page)) && /[:\-–—]/.test(cleanTitle)) {
    const prefix = stripSubtitles(cleanTitle)
    if (prefix && prefix !== cleanTitle) {
      try {
        const sRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(prefix + ' video game')}&format=json`, { headers: HEADERS })
        if (sRes.ok) {
          const sData = await sRes.json()
          const topResult = sData?.query?.search?.[0]?.title
          if (topResult) {
            page = await queryWiki(topResult)
          }
        }
      } catch {}
    }
  }

  if (!page || !page.extract || isDisambiguation(page)) return null

  const markdown = extractWikipediaSections(page.extract, canonicalTitle)
  return (markdown && markdown.length > 250) ? markdown : null
}

/**
 * Downloads guide content using a 2-Tier pipeline (StrategyWiki -> Wikipedia fallback).
 */
async function downloadGuideForGame(app, db, gameId, canonicalTitle) {
  if (!canonicalTitle) {
    return { success: false, error: 'No canonical title provided.' }
  }

  const cleanTitle = cleanTitleForWiki(canonicalTitle)
  let markdown = null
  let source = null

  // --- Tier 1: StrategyWiki ---
  try {
    markdown = await fetchStrategyWikiGuide(cleanTitle, canonicalTitle)
    if (markdown) {
      source = 'StrategyWiki'
      console.log(`[GuideDownloader] StrategyWiki hit: ${canonicalTitle}`)
    }
  } catch (err) {
    // Silently fall through to Wikipedia
  }

  // --- Tier 2: Wikipedia Fallback ---
  if (!markdown) {
    try {
      markdown = await fetchWikipediaGuide(cleanTitle, canonicalTitle)
      if (!markdown && /[:\-–—]/.test(canonicalTitle)) {
        const prefix = stripSubtitles(cleanTitle)
        if (prefix && prefix !== cleanTitle) {
          markdown = await fetchWikipediaGuide(prefix, canonicalTitle)
        }
      }
      if (markdown) {
        source = 'Wikipedia'
        console.log(`[GuideDownloader] Wikipedia fallback: ${canonicalTitle}`)
      }
    } catch (err) {
      // Fall through to skipped notice
    }
  }

  // --- Tier 3: No public wiki entry ---
  if (!markdown) {
    console.log(`[GuideDownloader] Skipped (No public wiki entry): ${canonicalTitle}`)
    return { success: false, error: 'No public wiki entry found.' }
  }

  // Save to disk in logpile_data/guides/
  const userData = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), 'logpile_data')
  const guidesDir = path.join(userData, 'guides')
  if (!fs.existsSync(guidesDir)) {
    try { fs.mkdirSync(guidesDir, { recursive: true }) } catch {}
  }

  const safeBasename = canonicalTitle.replace(/[/\\?%*:|"<>]/g, '_').trim()
  const filePath = path.join(guidesDir, `${safeBasename}.md`)
  fs.writeFileSync(filePath, markdown, 'utf8')

  // Auto-FTS5 Ingestion immediately
  let sectionsCount = 1
  try {
    const importRes = indexSingleFile(filePath, gameId, db)
    if (importRes && importRes.sectionsCount) {
      sectionsCount = importRes.sectionsCount
    }
  } catch (idxErr) {
    console.warn(`[GuideDownloader] FTS5 index notice for "${canonicalTitle}":`, idxErr?.message)
  }

  // Update has_guide = 1 in database
  if (db && gameId) {
    try {
      db.prepare('UPDATE games SET has_guide = 1 WHERE id = ?').run(gameId)
    } catch {}
  }

  return {
    success: true,
    source,
    gameId,
    title: canonicalTitle,
    filePath,
    sectionsCount,
  }
}

/**
 * Downloads guides in batch with progress reporting and cancellation support.
 */
async function downloadGuidesBatch(app, db, options = {}, onProgress) {
  batchCancelled = false
  const installedOnly = Boolean(options.installedOnly)

  let sql = 'SELECT id, canonical_title FROM games WHERE is_utility = 0 AND is_dlc = 0 AND is_hidden = 0'
  if (installedOnly) {
    sql += ' AND is_installed = 1'
  }
  sql += ' ORDER BY canonical_title ASC'

  let candidates = []
  try {
    candidates = db.prepare(sql).all()
  } catch (dbErr) {
    return { success: false, error: dbErr.message }
  }

  const targets = candidates.filter((g) => !hasGuide(db, g.id))
  const total = targets.length

  let synced = 0
  let processed = 0

  for (const g of targets) {
    if (batchCancelled) break
    processed++

    if (onProgress) {
      try {
        onProgress({
          current: processed,
          total,
          synced,
          title: g.canonical_title,
        })
      } catch {}
    }

    try {
      const res = await downloadGuideForGame(app, db, g.id, g.canonical_title)
      if (res && res.success) {
        synced++
      }
    } catch {}

    // Polite rate limiting: 350ms between requests
    await new Promise((r) => setTimeout(r, 350))
  }

  return {
    success: true,
    total,
    synced,
    processed,
    cancelled: batchCancelled,
  }
}

function cancelGuideBatch() {
  batchCancelled = true
  return true
}

module.exports = {
  splitPascalCase,
  cleanTitleForWiki,
  stripSubtitles,
  cleanWikitextToMarkdown,
  fetchWikipediaGuide,
  downloadGuideForGame,
  downloadGuidesBatch,
  cancelGuideBatch,
}
