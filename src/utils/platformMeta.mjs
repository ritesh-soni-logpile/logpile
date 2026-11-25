export const PLATFORM_META = {
  steam: { label: 'Steam', className: 'platform-steam' },
  epic: { label: 'Epic Games', className: 'platform-epic' },
  gog: { label: 'GOG', className: 'platform-gog' },
  amazon: { label: 'Amazon Games', className: 'platform-amazon' },
  xbox: { label: 'Xbox', className: 'platform-xbox' },
  ea: { label: 'EA Games', className: 'platform-ea' },
  ubisoft: { label: 'Ubisoft', className: 'platform-ubisoft' },
  itch: { label: 'Itch.io', className: 'platform-itch' },
  battlenet: { label: 'Battle.net', className: 'platform-battlenet' },
  riot: { label: 'Riot Games', className: 'platform-riot' },
  rockstar: { label: 'Rockstar Games', className: 'platform-rockstar' },
  cdprojekt: { label: 'CD Projekt', className: 'platform-cdprojekt' },
  netmarble: { label: 'Netmarble', className: 'platform-netmarble' },
  netease: { label: 'NetEase', className: 'platform-netease' },
  legacy: { label: 'Legacy Games', className: 'platform-legacy' },
  hoyo: { label: 'HoYoPlay', className: 'platform-hoyo' },
  humble: { label: 'Humble', className: 'platform-humble' },
  wargaming: { label: 'Wargaming', className: 'platform-wargaming' },
  gaijin: { label: 'Gaijin', className: 'platform-gaijin' },
  nexon: { label: 'Nexon', className: 'platform-nexon' },
  kuro: { label: 'Kuro Games', className: 'platform-kuro' },
  roblox: { label: 'Roblox', className: 'platform-roblox' },
  custom: { label: 'Custom', className: 'platform-custom' },
}

export function normalizePlatform(platform) {
  const key = String(platform || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (key.includes('steam')) return 'steam'
  if (key.includes('epic')) return 'epic'
  if (key.includes('gog')) return 'gog'
  if (key.includes('amazon') || key.includes('luna')) return 'amazon'
  if (key.includes('xbox') || key.includes('microsoft') || key.includes('xbl')) return 'xbox'
  if (key === 'ea' || key.includes('eagames') || key.includes('origin') || key.includes('electronicarts')) return 'ea'
  if (key.includes('ubisoft') || key.includes('uplay')) return 'ubisoft'
  if (key.includes('itch')) return 'itch'
  if (key.includes('battle') || key.includes('blizzard')) return 'battlenet'
  if (key.includes('riot')) return 'riot'
  if (key.includes('rockstar')) return 'rockstar'
  if (key.includes('cdprojekt') || key.includes('redlauncher')) return 'cdprojekt'
  if (key.includes('netmarble')) return 'netmarble'
  if (key.includes('netease') || key.includes('loadingbay')) return 'netease'
  if (key.includes('legacy')) return 'legacy'
  if (key.includes('hoyo') || key.includes('mihoyo')) return 'hoyo'
  if (key.includes('humble')) return 'humble'
  if (key.includes('wargaming') || key === 'wgc') return 'wargaming'
  if (key.includes('gaijin')) return 'gaijin'
  if (key.includes('nexon')) return 'nexon'
  if (key.includes('kuro')) return 'kuro'
  if (key.includes('roblox')) return 'roblox'
  return 'custom'
}

export function platformLabel(platform) {
  return PLATFORM_META[normalizePlatform(platform)]?.label || platform
}

export function platformClass(platform) {
  return PLATFORM_META[normalizePlatform(platform)]?.className || 'platform-custom'
}

export function normalizeStoreLabel(label) {
  const clean = String(label || '').trim()
  const lower = clean.toLowerCase()
  if (lower === 'ea' || lower === 'ea games' || lower === 'origin' || lower === 'origin2' || lower === 'electronic arts') return 'EA Games'
  if (lower === 'ubisoft' || lower === 'uplay' || lower === 'ubisoft connect') return 'Ubisoft'
  if (lower === 'epic' || lower === 'epic games') return 'Epic Games'
  if (lower === 'gog' || lower === 'gog galaxy') return 'GOG'
  if (lower === 'steam') return 'Steam'
  if (lower === 'xbox' || lower === 'microsoft' || lower === 'ms-xbl' || lower === 'ms-windows-store') return 'Xbox'
  if (lower === 'repack' || lower === 'standalone' || lower === 'custom-folder' || lower === 'standalone-clients') return 'Standalone'
  if (lower === 'amazon' || lower === 'amazon games') return 'Amazon Games'
  if (lower === 'battlenet' || lower === 'battle.net' || lower === 'blizzard') return 'Battle.net'
  if (lower === 'itch' || lower === 'itch.io') return 'Itch.io'
  if (lower === 'riot' || lower === 'riot games' || lower === 'riotclient') return 'Riot Games'
  if (lower === 'rockstar' || lower === 'rockstar games') return 'Rockstar Games'
  if (lower === 'cdprojekt' || lower === 'cd projekt' || lower === 'cd projekt red' || lower === 'redlauncher') return 'CD Projekt'
  if (lower === 'netmarble') return 'Netmarble'
  if (lower === 'netease' || lower === 'netease games' || lower === 'loading bay') return 'NetEase'
  if (lower === 'legacy' || lower === 'legacy games') return 'Legacy Games'
  if (lower === 'hoyo' || lower === 'hoyoplay' || lower === 'hoyoverse' || lower === 'mihoyo') return 'HoYoPlay'
  if (lower === 'humble' || lower === 'humble app' || lower === 'humble bundle' || lower === 'humble games') return 'Humble'
  if (lower === 'wargaming' || lower === 'wgc' || lower === 'wargaming.net') return 'Wargaming'
  if (lower === 'gaijin') return 'Gaijin'
  if (lower === 'nexon') return 'Nexon'
  if (lower === 'kuro' || lower === 'kuro games') return 'Kuro Games'
  if (lower === 'roblox') return 'Roblox'
  return clean
}

export function launcherLabelFromUri(uri) {
  const scheme = String(uri || '').match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1]?.toLowerCase()
  return ({
    ea: 'EA Games', origin2: 'EA Games', ubisoft: 'Ubisoft', uplay: 'Ubisoft',
    xbox: 'Xbox', 'ms-xbl': 'Xbox', 'ms-windows-store': 'Xbox',
    'amazon-games': 'Amazon Games', itch: 'Itch.io',
    'battle-net': 'Battle.net', battlenet: 'Battle.net',
    riotclient: 'Riot Games', rockstar: 'Rockstar Games',
    legacygames: 'Legacy Games', hoyoplay: 'HoYoPlay',
    wgc: 'Wargaming', humble: 'Humble', 'roblox-player': 'Roblox',
  })[scheme] || null
}

export function isLauncherUri(uri) {
  return /^(steam|com\.epicgames\.launcher|goggalaxy|origin2|origin|ea|ubisoft|uplay|xbox|ms-xbl|ms-windows-store|amazon-games|itch|battle-net|battlenet|riotclient|rockstar|legacygames|hoyoplay|wgc|humble|roblox-player):\/\//i.test(String(uri || ''))
}
