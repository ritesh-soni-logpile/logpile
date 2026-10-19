const UTILITY_TITLES = Object.freeze([
  '3DMark',
  'Wand',
  'Wallpaper Engine',
  'OBS Studio',
  'Lossless Scaling',
  'OCCT',
  'Steamworks Common Redistributables',
])

const UTILITY_KEYS = new Set(UTILITY_TITLES.map((title) => normalizeKey(title)))

const UTILITY_PATTERNS = Object.freeze([
  /\b(editor|benchmark|dedicated server|test server|gaming browser|creator kit|server browser|redistributables?)\b/i,
  /\bunreal (?:editor|engine)\b/i,
  /\b3dmark\b/i,
  /\bmodkit\b/i,
])

const HIDDEN_EXACT_TITLES = new Set([
  'steamworkscommonredistributables',
])
const HIDDEN_TITLE_PATTERNS = Object.freeze([
  /\bredmod\b/i,
  /\bredistributable(s)?\b/i,
  /\bredistributables\b/i,
  /\b(dlc|add[- ]?on|addon|expansion pass|content pack|season pass)\b/i,
  /\b(soundtrack|digital artbook|bonus content|dedicated server|sdk|software development kit)\b/i,
  /\b(demo|prologue)\b/i,
])
const DLC_TITLE_PATTERNS = Object.freeze([
  /\b(dlc|add[- ]?ons?|addons?)\b/i,
  /\b(expansion|expansions)\b/i,
  /\b(season pass|expansion pass|battle pass|starter pass|year \d+ pass)\b/i,
  /\b(soundtrack|soundtracks|original soundtrack|ost)\b/i,
  /\b(artbook|digital artbook|goodies|bonus content)\b/i,
  /\b(content pack|starter pack|booster pack|item pack|skin pack|costume pack|texture pack|weapon pack|character pack|voice pack|livery(?: pack)?|starter access|legendary status)\b/i,
  /\b(deluxe upgrade|upgrade pack)\b/i,
  /^(?:complete|deluxe|standard|gold|ultimate) edition$/i,
  /\b(redmod)\b/i,
  /\b(wrap|livery)\b/i,
  / - .*\b(costume|wheels|cap|gift|airborne|winter warfare|near miss|legendary status|starter access|outfit|skin pack)\b/i,
  /\barchinteriors\b/i,
  /\bpack\b/i,
  /\bbundle\b/i,
  /\bcreator kit\b/i,
  /(?:^|[-:])\s*first response\b/i,
  // Story expansions and known DLC add-ons:
  /\b(the assignment|the consequence|the executioner)\b/i,
  /\b(sam'?s story|the two colonels)\b/i,
  /\b(burial at sea|clash in the clouds)\b/i,
  /\b(hearts of stone|blood and wine)\b/i,
  /\b(the knife of dunwall|the brigmore witches)\b/i,
  /\b(tiny tina'?s assault on dragon keep)\b/i,
  /\b(far harbor|nuka[- ]world)\b/i,
  /\b(dead money|honest hearts|old world blues|lonesome road|point lookout|mothership zeta|broken steel|operation anchorage|the pitt)\b/i,
  /\b(shadow of the erdtree|phantom liberty|undead nightmare)\b/i,
  /\b(artorias of the abyss|ashes of ariandel|the ringed city)\b/i,
])
const DLC_TITLE_EXCEPTIONS = new Set([
  'contentwarning',
  'backpackhero',
  'costumequest',
  'costumequest2',
  'hotwheelsunleashed',
  'hotwheelsunleashed2',
  'fallout3',
  'fallout4',
  'silenthill',
  'silenthill2',
  'silenthill3',
  'silenthill4',
  'silenthillf',
  'silenthilltownfall',
  'silenthilltheshortmessage',
  'silenthilldownpour',
  'silenthillhomecoming',
  'silenthillshatteredmemories',
  'thesilentage',
  'hitman2silentassassin',
  'theevilwithin',
  'theevilwithin2',
  'metro2033',
  'metro2033redux',
  'metrolastlight',
  'metrolastlightredux',
  'metroexodus',
  'metroexodusenhancededition',
])

function normalizeKey(title) {
  return String(title || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function utilityKey(title) {
  return normalizeKey(title)
}

function isUtilityTitle(title) {
  const value = String(title || '').trim()
  if (UTILITY_KEYS.has(utilityKey(value))) return true
  return UTILITY_PATTERNS.some((pattern) => pattern.test(value))
}

function isHiddenByDefaultTitle(title) {
  const value = String(title || '').trim()
  const key = normalizeKey(value)
  return HIDDEN_EXACT_TITLES.has(key) || HIDDEN_TITLE_PATTERNS.some((pattern) => pattern.test(value))
}

function isDlcException(title) {
  const value = String(title || '').trim()
  const key = normalizeKey(value)
  if (DLC_TITLE_EXCEPTIONS.has(key)) return true
  const strippedKey = key.replace(/(gameoftheyear|goty|enhanced|definitive|special|deluxe|standard|edition|remastered|remaster)/g, '')
  if (DLC_TITLE_EXCEPTIONS.has(strippedKey)) return true
  return false
}

function isDlcTitle(title) {
  const value = String(title || '').trim()
  if (isDlcException(value)) return false
  if (isUtilityTitle(value)) return false
  return DLC_TITLE_PATTERNS.some((pattern) => pattern.test(value))
}

module.exports = { UTILITY_TITLES, utilityKey, isUtilityTitle, isHiddenByDefaultTitle, isDlcTitle, isDlcException, DLC_TITLE_EXCEPTIONS }

