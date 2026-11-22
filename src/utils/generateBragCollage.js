import { normalizeArtworkUrl } from './artworkUrl'
import { themeVars, LAYOUT_PALETTES, COLOR_PALETTES } from './themePalettes'
import { getAddonPalette, getCustomThemes } from './themeAddons'

const THEME_METADATA = {
  cinematic: {
    displayName: 'Cinematic',
    tagline: 'Prestige & Cinema Showcase',
    cardRadius: 10,
    borderWidth: 1.5,
  },
  kinetic: {
    displayName: 'Kinetic',
    tagline: 'Velocity & Telemetry Showcase',
    cardRadius: 2,
    borderWidth: 2,
  },
  atmospheric: {
    displayName: 'Atmospheric',
    tagline: 'Isolation & Dread Showcase',
    cardRadius: 8,
    borderWidth: 1.5,
  },
  competitive: {
    displayName: 'Competitive',
    tagline: 'Ranked Esports Showcase',
    cardRadius: 4,
    borderWidth: 2,
    hasTopAccent: true,
  },
  playful: {
    displayName: 'Playful',
    tagline: 'Arcade & Nostalgia Showcase',
    cardRadius: 14,
    borderWidth: 2,
  },
}

/**
 * Resolves full live palette variables and metadata for any core or custom theme
 */
function resolveCollageTheme(layoutTheme = 'cinematic', colorPalette = 'auto') {
  const vars = themeVars(layoutTheme, colorPalette)
  const meta = THEME_METADATA[layoutTheme] || {
    displayName: layoutTheme ? (layoutTheme.charAt(0).toUpperCase() + layoutTheme.slice(1)) : 'Custom',
    tagline: 'Community Custom Showcase',
    cardRadius: 8,
    borderWidth: 1.5,
  }

  // Check if custom addon has special details
  const customTheme = getCustomThemes().find((t) => t.id === layoutTheme)
  if (customTheme) {
    meta.displayName = customTheme.name || meta.displayName
    meta.tagline = customTheme.tagline || meta.tagline
  }

  const accent = vars['--accent'] || '#C6A56B'
  const accentGlow = vars['--accent-glow'] || 'rgba(198, 165, 107, 0.28)'
  const baseBg = vars['--bg-base'] || '#0B0B0A'
  const surfaceBg = vars['--bg-surface'] || '#171714'
  const cardBg = vars['--bg-card'] || '#121210'
  const borderColor = vars['--border-color'] || 'rgba(255, 255, 255, 0.14)'
  const badgeText = vars['--badge-text'] || accent

  return {
    ...meta,
    accent,
    accentGlow,
    baseBg,
    surfaceBg,
    cardBg,
    borderColor,
    badgeText,
    fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }
}

/**
 * Truncate text to fit within a maxWidth on the canvas context, adding ellipsis if needed.
 */
function fitText(ctx, text, maxWidth) {
  if (!text) return ''
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1).trim()
  }
  return truncated ? truncated + '…' : ''
}

/**
 * Wraps text cleanly across up to maxLines without cutting off words.
 */
function wrapText(ctx, text, maxWidth, maxLines = 2) {
  if (!text) return []
  const words = text.split(/\s+/)
  const lines = []
  let currentLine = words[0] || ''

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const testLine = currentLine + ' ' + word
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine
    } else {
      lines.push(currentLine)
      currentLine = word
      if (lines.length === maxLines - 1) {
        // Last line: append remaining words and fit with ellipsis if needed
        const remaining = words.slice(i).join(' ')
        lines.push(fitText(ctx, remaining, maxWidth))
        return lines
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines.slice(0, maxLines)
}

/**
 * Helper to safely draw a rounded rectangle on standard Canvas context.
 */
function drawCardShape(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (r <= 0) {
    ctx.rect(x, y, w, h)
  } else if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
  }
  ctx.closePath()
}

/**
 * High-quality aspect-fill image drawing (crisp center-cropped, zero distortion or blur)
 */
function drawPosterSharp(ctx, img, x, y, w, h) {
  if (!img) return
  const scale = Math.max(w / img.width, h / img.height)
  const sw = Math.round(w / scale)
  const sh = Math.round(h / scale)
  const sx = Math.max(0, Math.round((img.width - sw) / 2))
  const sy = Math.max(0, Math.round((img.height - sh) / 2))

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

/**
 * Generates an authentic, high-resolution, theme-matched "Brag Grid Showcase" collage.
 * Renders complete collectible-grade game cards (Poster + Full Wrapped Title + Studio + Platform).
 * Supports standard formats: 'auto' (Full Grid Gallery), '16:9' (Desktop / Reddit), '9:16' (Story / Reel), '1:1' (Square Post).
 *
 * @param {Array} games - List of currently filtered games
 * @param {Object} stats - Vault statistics
 * @param {Object|string} options - { layoutTheme, colorPalette, viewTitle, aspectRatio }
 */
export async function generateBragCollage(games = [], stats = {}, options = {}) {
  const layoutTheme = (typeof options === 'string' ? options : options?.layoutTheme) || 'cinematic'
  const colorPalette = (typeof options === 'object' && options?.colorPalette) ? options.colorPalette : 'auto'
  const viewTitle = (typeof options === 'object' && options?.viewTitle) ? options.viewTitle : 'Game Sanctuary Showcase'
  const aspectRatio = (typeof options === 'object' && options?.aspectRatio) ? options.aspectRatio : 'auto'

  const theme = resolveCollageTheme(layoutTheme, colorPalette)

  const visibleGames = games.filter((g) => !g.is_utility && !g.is_dlc).length > 0
    ? games.filter((g) => !g.is_utility && !g.is_dlc)
    : games

  if (!visibleGames.length) {
    throw new Error('No games available in library to showcase.')
  }

  // 1. Setup Canvas Dimensions & Dynamic Grid Packaging
  let width = 3840
  let height = 2160
  let isFixed = false

  if (aspectRatio === '16:9') {
    width = 3840
    height = 2160
    isFixed = true
  } else if (aspectRatio === '9:16') {
    width = 2160
    height = 3840
    isFixed = true
  } else if (aspectRatio === '1:1') {
    width = 2560
    height = 2560
    isFixed = true
  } else {
    // 'auto' - Dynamic Gallery Tapestry (balanced widescreen proportions)
    width = 3840
    isFixed = false
  }

  const isVertical = width < 2500
  const padX = isVertical ? 60 : 80
  const headerTop = isVertical ? 70 : 64
  const headerHeight = isVertical ? 230 : 170
  const gridTop = headerTop + headerHeight
  const footerHeight = 84
  const availableWidth = width - padX * 2
  const availableHeight = isFixed ? Math.max(800, height - gridTop - footerHeight - 20) : 0

  let gamesToRender = visibleGames
  let overflowCount = 0
  let cols = 8
  let rows = 1
  let gap = 20
  let cardWidth = 0
  let posterHeight = 0
  let captionHeight = 0
  let cardHeight = 0
  let offsetY = 0

  if (!isFixed) {
    // Adaptive column scaling for balanced gallery aspect ratios (prevents 12,000px tall receipts!)
    const n = visibleGames.length
    if (n <= 12) cols = 4
    else if (n <= 24) cols = 6
    else if (n <= 48) cols = 8
    else if (n <= 80) cols = 10
    else if (n <= 140) cols = 12
    else if (n <= 220) cols = 14
    else cols = 16

    gap = cols >= 12 ? 16 : 22
    cardWidth = Math.floor((availableWidth - (cols - 1) * gap) / cols)
    posterHeight = Math.round(cardWidth * 1.48)
    // Caption area sized generously for 2 lines of title + developer/platform metadata
    captionHeight = Math.max(62, Math.round(cardWidth * 0.28))
    cardHeight = posterHeight + captionHeight
    rows = Math.ceil(visibleGames.length / cols)
    const gridHeight = rows * cardHeight + (rows - 1) * gap
    height = Math.max(2160, gridTop + gridHeight + footerHeight + 40)
  } else {
    // Fixed aspect ratio (16:9, 9:16, 1:1): find best column packing to maximize card size
    const minCardW = isVertical ? 150 : 170
    const targetN = visibleGames.length

    let bestCols = null
    let bestCardW = 0
    let bestRows = 0

    for (let c = 2; c <= 24; c++) {
      const g = c >= 12 ? 14 : 18
      const testCardW = Math.floor((availableWidth - (c - 1) * g) / c)
      if (testCardW < minCardW) break

      const testPosterH = Math.round(testCardW * 1.48)
      const testCapH = Math.max(60, Math.round(testCardW * 0.28))
      const testCardH = testPosterH + testCapH
      const testRows = Math.ceil(targetN / c)
      const testGridH = testRows * testCardH + (testRows - 1) * g

      if (testGridH <= availableHeight) {
        bestCols = c
        bestCardW = testCardW
        bestRows = testRows
        gap = g
        break
      }
    }

    if (bestCols !== null) {
      cols = bestCols
      cardWidth = bestCardW
      posterHeight = Math.round(cardWidth * 1.48)
      captionHeight = Math.max(60, Math.round(cardWidth * 0.28))
      cardHeight = posterHeight + captionHeight
      rows = bestRows
      gamesToRender = visibleGames
    } else {
      // Library has more games than fit in a single frame: pack maximum readable cards and show overflow card
      const maxCols = Math.max(3, Math.floor((availableWidth + 14) / (minCardW + 14)))
      gap = maxCols >= 12 ? 14 : 18
      cardWidth = Math.floor((availableWidth - (maxCols - 1) * gap) / maxCols)
      posterHeight = Math.round(cardWidth * 1.48)
      captionHeight = Math.max(60, Math.round(cardWidth * 0.28))
      cardHeight = posterHeight + captionHeight
      const maxRows = Math.max(2, Math.floor((availableHeight + gap) / (cardHeight + gap)))

      cols = maxCols
      rows = maxRows
      const maxSlots = cols * rows
      if (targetN > maxSlots) {
        overflowCount = targetN - (maxSlots - 1)
        gamesToRender = visibleGames.slice(0, maxSlots - 1)
      } else {
        gamesToRender = visibleGames
      }
    }

    const actualGridH = rows * cardHeight + (rows - 1) * gap
    if (actualGridH < availableHeight) {
      offsetY = Math.floor((availableHeight - actualGridH) / 2)
    }
  }

  const finalGridTop = gridTop + offsetY

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // 2. Background Painting with Theme Ambience
  // Base dark gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height)
  bgGrad.addColorStop(0, theme.baseBg)
  bgGrad.addColorStop(0.5, '#07080a')
  bgGrad.addColorStop(1, '#030406')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Radial theme accent ambient glow (spotlight on top center)
  const glow = ctx.createRadialGradient(width / 2, 80, 80, width / 2, 80, Math.max(1600, width * 0.55))
  glow.addColorStop(0, theme.accentGlow)
  glow.addColorStop(0.65, 'rgba(0, 0, 0, 0.2)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  // 3. Header Section
  ctx.textBaseline = 'top'

  // Eyebrow Tag Pill
  const eyebrowText = `LOGPILE SANCTUARY  •  ${theme.displayName.toUpperCase()} SHOWCASE`
  ctx.font = `700 15px ${theme.fontFamily}`
  const eyebrowW = ctx.measureText(eyebrowText).width + 36
  const eyebrowH = 30
  const eyebrowX = padX
  const eyebrowY = headerTop

  ctx.save()
  drawCardShape(ctx, eyebrowX, eyebrowY, eyebrowW, eyebrowH, 15)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.fill()
  ctx.strokeStyle = theme.accent
  ctx.lineWidth = 1.2
  ctx.stroke()

  // Accent Dot
  ctx.beginPath()
  ctx.arc(eyebrowX + 16, eyebrowY + 15, 4.5, 0, Math.PI * 2)
  ctx.fillStyle = theme.accent
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.fillText(eyebrowText, eyebrowX + 28, eyebrowY + 7)
  ctx.restore()

  // Main Showcase Title
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 ${isVertical ? '48px' : '60px'} ${theme.fontFamily}`
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 2
  const maxTitleW = isVertical ? availableWidth : availableWidth - 1100
  const renderedTitle = fitText(ctx, viewTitle, maxTitleW)
  ctx.fillText(renderedTitle, padX, headerTop + 44)
  ctx.shadowColor = 'transparent'

  // Telemetry Metrics Ribbon
  const totalVaultTitles = stats.totalGames || games.length
  const totalInstalled = stats.installedGames || games.filter((g) => g.is_installed).length
  const totalPlaytimeHours = Math.round(
    games.reduce((acc, g) => acc + (Number(g.play_time_seconds) || 0), 0) / 3600
  )

  const statsList = [
    { label: 'SHOWCASED', value: `${visibleGames.length} Titles` },
    { label: 'INSTALLED', value: `${totalInstalled} Games` },
    { label: 'PLAYTIME', value: `${totalPlaytimeHours} Hours` },
    { label: 'STORAGE', value: `${stats.totalStorageGb ? `${stats.totalStorageGb} GB` : 'Offline'}` },
  ]

  if (isVertical) {
    // Vertical layout (9:16): Stat cards row under title
    const chipW = Math.floor((availableWidth - 30) / 4)
    for (let i = 0; i < Math.min(4, statsList.length); i++) {
      const s = statsList[i]
      const chipX = padX + i * (chipW + 10)
      const chipY = headerTop + 125

      ctx.save()
      drawCardShape(ctx, chipX, chipY, chipW, 64, 8)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.font = `700 11px ${theme.fontFamily}`
      ctx.fillText(s.label, chipX + 12, chipY + 12)

      ctx.fillStyle = theme.accent
      ctx.font = `800 18px ${theme.fontFamily}`
      ctx.fillText(s.value, chipX + 12, chipY + 32)
      ctx.restore()
    }
  } else {
    // Landscape layout: Stat cards on right side of header
    let rightX = width - padX
    const chipW = 210
    const chipH = 68
    const chipY = headerTop + 36

    for (let i = statsList.length - 1; i >= 0; i--) {
      const s = statsList[i]
      const chipX = rightX - chipW

      ctx.save()
      drawCardShape(ctx, chipX, chipY, chipW, chipH, 8)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.font = `700 11px ${theme.fontFamily}`
      ctx.fillText(s.label, chipX + 14, chipY + 12)

      ctx.fillStyle = theme.accent
      ctx.font = `800 22px ${theme.fontFamily}`
      ctx.fillText(s.value, chipX + 14, chipY + 32)
      ctx.restore()

      rightX -= chipW + 14
    }
  }

  // Header Divider Accent Line
  const divY = isVertical ? headerTop + 205 : headerTop + 140
  const divGrad = ctx.createLinearGradient(padX, divY, width - padX, divY)
  divGrad.addColorStop(0, theme.accent)
  divGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.15)')
  divGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)')
  ctx.strokeStyle = divGrad
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(padX, divY)
  ctx.lineTo(width - padX, divY)
  ctx.stroke()

  // 4. Preload artwork posters in parallel batches
  const loadImage = (rawUrl) => {
    return new Promise((resolve) => {
      if (!rawUrl) return resolve(null)
      const url = normalizeArtworkUrl(rawUrl)
      const img = new Image()
      if (/^https?:\/\//i.test(url)) {
        img.crossOrigin = 'anonymous'
      }
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = url
    })
  }

  const loadedImages = new Array(gamesToRender.length)
  const batchSize = 40
  for (let i = 0; i < gamesToRender.length; i += batchSize) {
    const chunk = gamesToRender.slice(i, i + batchSize)
    const chunkImages = await Promise.all(
      chunk.map((g) => loadImage(g.cover_url || g.hero_url))
    )
    for (let j = 0; j < chunkImages.length; j++) {
      loadedImages[i + j] = chunkImages[j]
    }
  }

  // 5. Draw Collectible Game Cards with True Theme Styling & Zero Cuts
  gamesToRender.forEach((game, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const x = Math.round(padX + col * (cardWidth + gap))
    const y = Math.round(finalGridTop + row * (cardHeight + gap))
    const r = theme.cardRadius
    const padSide = Math.max(10, Math.round(cardWidth * 0.05))
    const maxTextW = cardWidth - padSide * 2

    // Step 1: Draw Card Body Background
    ctx.save()
    drawCardShape(ctx, x, y, cardWidth, cardHeight, r)
    ctx.fillStyle = theme.cardBg || '#111318'
    ctx.fill()
    ctx.restore()

    // Step 2: Draw Poster Artwork (clipped to top rounded corners)
    ctx.save()
    ctx.beginPath()
    if (r <= 0) {
      ctx.rect(x, y, cardWidth, posterHeight)
    } else if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, cardWidth, posterHeight, [r, r, 0, 0])
    } else {
      ctx.rect(x, y, cardWidth, posterHeight)
    }
    ctx.clip()

    const img = loadedImages[idx]
    if (img) {
      drawPosterSharp(ctx, img, x, y, cardWidth, posterHeight)
    } else {
      // High-end fallback poster block with subtle geometric pattern
      ctx.fillStyle = '#171922'
      ctx.fillRect(x, y, cardWidth, posterHeight)

      ctx.fillStyle = theme.accent
      ctx.font = `bold ${Math.round(cardWidth * 0.16)}px ${theme.fontFamily}`
      ctx.textAlign = 'center'
      ctx.fillText((game.canonical_title || 'G')[0].toUpperCase(), x + cardWidth / 2, y + posterHeight * 0.38)

      ctx.fillStyle = '#ffffff'
      ctx.font = `700 ${Math.round(cardWidth * 0.065)}px ${theme.fontFamily}`
      ctx.fillText(fitText(ctx, game.canonical_title || 'Untitled', maxTextW), x + cardWidth / 2, y + posterHeight * 0.6)
      ctx.textAlign = 'left'
    }

    // Poster bottom subtle shadow gradient into caption area
    const shadeGrad = ctx.createLinearGradient(x, y + posterHeight - 40, x, y + posterHeight)
    shadeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
    shadeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)')
    ctx.fillStyle = shadeGrad
    ctx.fillRect(x, y + posterHeight - 40, cardWidth, 40)

    ctx.restore()

    // Step 3: Draw Card Caption Footer (Multi-line title + developer / platform without cutting off!)
    const captionTop = y + posterHeight + 8
    const rawTitle = game.canonical_title || game.name || 'Untitled Game'

    // Adaptive font sizing based on title length
    let titleFontSize = Math.max(12, Math.round(cardWidth * 0.054))
    if (rawTitle.length > 26) titleFontSize = Math.max(11, Math.round(cardWidth * 0.048))
    if (rawTitle.length > 40) titleFontSize = Math.max(10, Math.round(cardWidth * 0.042))

    ctx.save()
    ctx.font = `700 ${titleFontSize}px ${theme.fontFamily}`
    const titleLines = wrapText(ctx, rawTitle, maxTextW, 2)

    // Render title lines
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetY = 1

    const lineHeight = titleFontSize + 3
    let curTextY = captionTop
    titleLines.forEach((tl) => {
      ctx.fillText(tl, x + padSide, curTextY)
      curTextY += lineHeight
    })
    ctx.shadowColor = 'transparent'

    // Subtitle / Developer / Store Platform
    const subFontSize = Math.max(9, Math.round(cardWidth * 0.038))
    ctx.font = `500 ${subFontSize}px ${theme.fontFamily}`

    const rawDev = game.developer || game.publisher || (game.is_utility ? 'Utility' : '')
    const devSnippet = rawDev ? rawDev.slice(0, 20) : ''
    const platformLabel = (game.sources?.[0]?.platform || (game.is_steam ? 'Steam' : '')).toUpperCase()
    const metaText = [devSnippet, platformLabel].filter(Boolean).join(' · ') || 'Installed'

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    const finalMeta = fitText(ctx, metaText, maxTextW)
    ctx.fillText(finalMeta, x + padSide, curTextY + 2)
    ctx.restore()

    // Step 4: Draw Card Outer Border with Theme Accent
    ctx.save()
    drawCardShape(ctx, x, y, cardWidth, cardHeight, r)
    ctx.strokeStyle = game.is_favorite ? '#facc15' : theme.borderColor
    ctx.lineWidth = game.is_favorite ? 2 : theme.borderWidth
    ctx.stroke()

    // Step 5: Draw Theme Signature Accents (e.g. Competitive top crimson bar)
    if (theme.hasTopAccent) {
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      if (r > 0 && typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, cardWidth, 4, [r, r, 0, 0])
      } else {
        ctx.rect(x, y, cardWidth, 4)
      }
      ctx.fill()
    }

    // Favorite Gold Star Badge
    if (game.is_favorite) {
      const starX = x + cardWidth - 22
      const starY = y + 8
      ctx.save()
      ctx.fillStyle = '#facc15'
      ctx.font = 'bold 14px sans-serif'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 6
      ctx.fillText('★', starX, starY)
      ctx.restore()
    }

    ctx.restore()
  })

  // 6. Draw Overflow Vault Card (if titles exceed fixed aspect ratio capacity)
  if (overflowCount > 0) {
    const idx = gamesToRender.length
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const x = Math.round(padX + col * (cardWidth + gap))
    const y = Math.round(finalGridTop + row * (cardHeight + gap))
    const r = theme.cardRadius

    ctx.save()
    drawCardShape(ctx, x, y, cardWidth, cardHeight, r)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)'
    ctx.fill()
    ctx.strokeStyle = theme.accent
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = theme.accent
    ctx.textAlign = 'center'
    ctx.font = `900 ${Math.round(cardWidth * 0.16)}px ${theme.fontFamily}`
    ctx.fillText(`+${overflowCount}`, x + cardWidth / 2, y + cardHeight * 0.35)

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.round(cardWidth * 0.065)}px ${theme.fontFamily}`
    ctx.fillText('MORE IN VAULT', x + cardWidth / 2, y + cardHeight * 0.52)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = `500 ${Math.round(cardWidth * 0.045)}px ${theme.fontFamily}`
    ctx.fillText('Select "Full Grid" to brag', x + cardWidth / 2, y + cardHeight * 0.65)
    ctx.fillText('every single title', x + cardWidth / 2, y + cardHeight * 0.72)
    ctx.textAlign = 'left'
    ctx.restore()
  }

  // 7. Footer Showcase Branding
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
  ctx.font = `500 18px ${theme.fontFamily}`
  ctx.fillText('LOGPILE  •  100% Offline Game Sanctuary & Launcher  •  Open-Source', padX, height - 42)

  ctx.textAlign = 'right'
  ctx.fillStyle = theme.accent
  ctx.font = `700 16px ${theme.fontFamily}`
  const ratioLabel = aspectRatio === 'auto' ? 'FULL VAULT GALLERY' : `${aspectRatio} ULTRA HD`
  ctx.fillText(`4K RESOLUTION  •  ${ratioLabel}`, width - padX, height - 42)
  ctx.textAlign = 'left'

  return canvas.toDataURL('image/png', 0.95)
}
