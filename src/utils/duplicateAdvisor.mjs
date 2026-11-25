import { normalizeStoreLabel } from './platformMeta.mjs'
import { getEditionTierScore } from './titleNormalizer.mjs'

const STORE_KEEP_PRIORITY = {
  'GOG': 45,
  'Itch.io': 38,
  'Humble': 35,
  'Steam': 32,
  'Epic Games': 24,
  'Amazon Games': 22,
  'Xbox': 20,
  'Battle.net': 18,
  'Riot Games': 18,
  'Rockstar Games': 18,
  'CD Projekt': 18,
  'EA Games': 18,
  'Ubisoft': 18,
  'HoYoPlay': 18,
  'Wargaming': 18,
  'Legacy Games': 18,
  'Gaijin': 16,
  'Nexon': 16,
  'Kuro Games': 16,
  'Netmarble': 16,
  'NetEase': 16,
  'Roblox': 15,
  'Standalone': 10,
  'Custom': 8,
}

function normalizePathKey(p) {
  return String(p || '').trim().replace(/[\\/]+$/, '').toLowerCase()
}

function buildCopyReasons(copy, isKeep, keepCopy) {
  const reasons = []
  if (isKeep) {
    if (copy.playTimeSeconds > 0) {
      const hrs = (copy.playTimeSeconds / 3600).toFixed(1)
      reasons.push(`${hrs}h playtime logged`)
    }
    if (copy.storeLabel === 'GOG' || copy.storeLabel === 'Itch.io') {
      reasons.push('DRM-free copy')
    } else if (copy.storeLabel === 'Steam') {
      reasons.push('Primary PC storefront')
    }
    if (copy.executablePath) {
      reasons.push('Direct .exe ready')
    }
    if (getEditionTierScore(copy.title) >= 3) {
      reasons.push('Higher edition')
    }
    if (!reasons.length) reasons.push(`Preferred storefront (${copy.storeLabel})`)
    return reasons.join(' · ')
  }

  if (copy.playTimeSeconds === 0 && keepCopy.playTimeSeconds > 0) {
    reasons.push('0m logged here')
  }
  if (copy.installSizeBytes > 0) {
    const gb = (copy.installSizeBytes / (1024 ** 3)).toFixed(1)
    reasons.push(`Frees ${gb} GB`)
  }
  if (copy.storeLabel === 'Standalone') {
    reasons.push(`Official ${keepCopy.storeLabel} copy preferred`)
  } else {
    reasons.push(`Duplicate of ${keepCopy.storeLabel} install`)
  }
  return reasons.join(' · ')
}

function scoreCopy(copy) {
  let score = 0
  if (copy.playTimeSeconds > 0) {
    score += 100 + Math.min(50, Math.round(copy.playTimeSeconds / 3600))
  }
  score += STORE_KEEP_PRIORITY[copy.storeLabel] ?? 12
  if (copy.executablePath) score += 12
  if (copy.launchUri) score += 6
  score += getEditionTierScore(copy.title) * 8
  if (copy.installSizeBytes > 0) score += 5
  return score
}

export function analyzeDuplicateInstalls(game) {
  if (!game || game.is_utility || game.is_dlc) return null

  const variants = Array.isArray(game.variants) && game.variants.length > 0 ? game.variants : [game]
  const copyMap = new Map()

  for (const variant of variants) {
    const sources = Array.isArray(variant.sources) ? variant.sources : []
    const installedSources = sources.filter((s) => Boolean(s?.isInstalled))

    if (installedSources.length > 0) {
      for (const src of installedSources) {
        const storeLabel = normalizeStoreLabel(src.sourceName || src.source_name || src.platform || variant.store_name || 'Custom')
        const installPath = src.installPath || (installedSources.length === 1 && variant.is_installed ? variant.install_path : null)
        const pathKey = normalizePathKey(installPath)
        const dedupKey = pathKey ? `path:${pathKey}` : `store:${storeLabel.toLowerCase()}:${src.platformGameId || variant.id}`
        if (copyMap.has(dedupKey)) continue

        copyMap.set(dedupKey, {
          key: dedupKey,
          gameId: variant.id,
          title: variant.canonical_title || game.canonical_title,
          platform: src.platform || 'custom',
          platformGameId: src.platformGameId || '',
          storeLabel,
          installPath: installPath || null,
          executablePath: src.executablePath || (installedSources.length === 1 ? variant.executable_path : null),
          installSizeBytes: Number(src.installSizeBytes || (installedSources.length === 1 ? variant.install_size_bytes : 0) || 0),
          playTimeSeconds: Number(src.playTimeSeconds || variant.play_time_seconds || 0),
          launchUri: src.launchUri || null,
        })
      }
    } else if (variant.is_installed) {
      const storeLabel = normalizeStoreLabel(variant.store_name || variant.storeName || sources[0]?.sourceName || sources[0]?.platform || 'Custom')
      const pathKey = normalizePathKey(variant.install_path)
      const dedupKey = pathKey ? `path:${pathKey}` : `variant:${variant.id}:${storeLabel.toLowerCase()}`
      if (!copyMap.has(dedupKey)) {
        copyMap.set(dedupKey, {
          key: dedupKey,
          gameId: variant.id,
          title: variant.canonical_title || game.canonical_title,
          platform: sources[0]?.platform || 'custom',
          platformGameId: sources[0]?.platformGameId || '',
          storeLabel,
          installPath: variant.install_path || null,
          executablePath: variant.executable_path || null,
          installSizeBytes: Number(variant.install_size_bytes || 0),
          playTimeSeconds: Number(variant.play_time_seconds || 0),
          launchUri: sources[0]?.launchUri || null,
        })
      }
    }
  }

  const copies = [...copyMap.values()]
  if (copies.length < 2) return null

  const sorted = copies
    .map((copy) => ({ ...copy, score: scoreCopy(copy) }))
    .sort((a, b) => b.score - a.score || b.playTimeSeconds - a.playTimeSeconds || b.installSizeBytes - a.installSizeBytes)

  const keep = {
    ...sorted[0],
    recommendation: 'keep',
    reason: buildCopyReasons(sorted[0], true, sorted[0]),
  }

  const remove = sorted.slice(1).map((copy) => ({
    ...copy,
    recommendation: 'uninstall',
    reason: buildCopyReasons(copy, false, keep),
  }))

  const reclaimableBytes = remove.reduce((sum, c) => sum + Number(c.installSizeBytes || 0), 0)

  return {
    gameId: game.id,
    title: game.canonical_title,
    coverUrl: game.cover_url || null,
    keep,
    remove,
    allCopies: [keep, ...remove],
    reclaimableBytes,
    reclaimableGb: Number((reclaimableBytes / (1024 ** 3)).toFixed(2)),
  }
}

export function findDuplicateInstalls(games = []) {
  const items = []
  let totalExtraCopies = 0
  let totalReclaimableBytes = 0

  for (const game of games) {
    const analysis = analyzeDuplicateInstalls(game)
    if (analysis) {
      items.push(analysis)
      totalExtraCopies += analysis.remove.length
      totalReclaimableBytes += analysis.reclaimableBytes
    }
  }

  items.sort((a, b) => b.reclaimableBytes - a.reclaimableBytes || a.title.localeCompare(b.title))

  return {
    items,
    totalDuplicateGames: items.length,
    totalExtraCopies,
    totalReclaimableBytes,
    totalReclaimableGb: Number((totalReclaimableBytes / (1024 ** 3)).toFixed(2)),
  }
}
