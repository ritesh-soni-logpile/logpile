export const TITLE_SUFFIXES = [
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
  'legacy edition',
  'directors cut',
  'director s cut',
  'enhanced edition directors cut',
  'enhanced edition director s cut',
  'enhanced edition',
  'enhanced',
  'remastered',
  'remaster',
  'challenger edition',
  'rampage edition',
  'premier edition',
  'special edition',
  'anniversary edition',
  '20th anniversary edition',
  'legendary edition',
  'premium edition',
  'next gen edition',
  'next gen',
  'complete edition',
  'the complete edition',
  'complete collection',
  'deluxe edition',
  'digital deluxe edition',
  'deluxe',
  'ultimate edition',
  'the ultimate edition',
  'collector s edition',
  'collectors edition',
  'the collection',
  'handsome collection',
  'pc edition',
  'windows edition',
  'base game',
  'amazon prime',
  'amazon luna',
  'epic games',
  'windows',
  'steam',
  'pc',
]

export const PUBLISHER_PREFIXES = [
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
  'sega',
]

const ROMAN_MAP = {
  ii: '2',
  iii: '3',
  iv: '4',
  vi: '6',
  vii: '7',
  viii: '8',
  ix: '9',
  xi: '11',
  xii: '12',
  xiii: '13',
  xiv: '14',
  xv: '15',
  xvi: '16',
}

/**
 * Strip known publisher prefixes and storefront artifacts from a raw title.
 * @param {string} rawTitle
 * @returns {string}
 */
export function cleanTitlePrefixes(rawTitle) {
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

function expandKnownAbbreviations(spaced) {
  let value = spaced
    .replace(/\b(gta|rdr|cod|cs|tw|ff)(\d+)\b/g, '$1 $2')
    .replace(/\bgta\b/g, 'grand theft auto')
    .replace(/\brdr\b/g, 'red dead redemption')
    .replace(/\bcp\s*2077\b/g, 'cyberpunk 2077')
    .replace(/\bcs\s*2\b/g, 'counter strike 2')
    .replace(/\btws?\s*3\b/g, 'witcher 3')
    .replace(/\bplayerunknown\s*s?\s*battlegrounds\b/g, 'pubg')
    .replace(/^pubg\s+battlegrounds$/, 'pubg')
    .replace(/\btes\s*(v|5)\b/g, 'elder scrolls 5')
    .replace(/\bff\s*(\d+|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi)\b/g, 'final fantasy $1')

  // Convert Roman numeral sequel tokens across all storefronts
  const tokens = value.split(' ').filter(Boolean)
  const converted = tokens.map((tok, idx) => {
    if (ROMAN_MAP[tok]) return ROMAN_MAP[tok]
    if (tok === 'v' && idx > 0) return '5'
    return tok
  })
  value = converted.join(' ')

  // Grand Theft Auto V Legacy (2025 Rockstar split) -> unified with GTA V / Enhanced / Premium
  value = value.replace(/\bgrand theft auto 5 legacy\b/g, 'grand theft auto 5')
  return value
}

/**
 * Normalize a game title into lowercase space-separated canonical tokens for grouping and matching.
 * @param {string} title
 * @returns {string}
 */
export function normalizeTitleSpaced(title) {
  const raw = String(title || '').trim()
  const isEditionYear = /\b(?:edition|collection|bundle|remaster|cut)\s*\((?:19\d\d|20\d\d)\)/i.test(raw)
  const yearMatch = !isEditionYear ? raw.match(/\((19\d\d|20\d\d)\)/) : null
  const yearTag = yearMatch ? ` ${yearMatch[1]}` : ''

  let value = raw
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/\s*\((?:pc|windows|mac|linux)\)\s*/gi, ' ')
    .replace(/\b(legacy collection|bundle|edition)\s*\(\d{4}\)/gi, '$1')
    .replace(/\((19\d\d|20\d\d)\)/g, '')
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

  value = expandKnownAbbreviations(value)

  // Strip leading "the " when multi-word so "The Witcher 3" matches "Witcher 3"
  if (value.startsWith('the ') && value.split(' ').length > 1) {
    value = value.slice(4).trim()
  }

  value = value
    .replace(/\b(game of the year|goty|definitive|ultimate|complete|deluxe|standard|edition|remastered|remaster|enhanced|digital|director s cut|directors cut|gold|legacy collection|master assassin|premium)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return (value + yearTag).trim()
}

/**
 * Normalize a game title into an alphanumeric-only key for backend deduplication.
 * @param {string} title
 * @returns {string}
 */
export function normalizeCanonicalTitle(title) {
  return normalizeTitleSpaced(title).replace(/[^a-z0-9]/g, '')
}

/**
 * Rank game editions from standard (1) to ultimate/collector/complete (5).
 * @param {string} title
 * @returns {number}
 */
export function getEditionTierScore(title) {
  const t = String(title || '').toLowerCase()
  if (/\b(?:master assassin|ultimate|complete|collector'?s|legacy collection|handsome collection)\b/i.test(t)) return 5
  if (/\b(?:game of the year|goty|gold|golden|director'?s cut|enhanced edition)\b/i.test(t)) return 4
  if (/\b(?:deluxe|premium|special|anniversary|remastered|remaster|definitive|challenger|rampage|premier|enhanced)\b/i.test(t)) return 3
  if (/\b(?:digital)\b/i.test(t)) return 2
  return 1
}
