import { normalizeArtworkUrl } from './artworkUrl'

const THEME_CONFIGS = {
  cinematic: {
    name: 'Cinematic',
    accent: '#818cf8',
    glow: 'rgba(99, 102, 241, 0.20)',
    cardRadius: 16,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 2,
    bgBottom: '#040508',
  },
  atmospheric: {
    name: 'Atmospheric',
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.22)',
    cardRadius: 20,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderWidth: 2,
    bgBottom: '#030806',
  },
  kinetic: {
    name: 'Kinetic',
    accent: '#f97316',
    glow: 'rgba(249, 115, 22, 0.22)',
    cardRadius: 0,
    borderColor: 'rgba(249, 115, 22, 0.65)',
    borderWidth: 2.5,
    bgBottom: '#060402',
  },
  playful: {
    name: 'Playful',
    accent: '#d6ff4b',
    glow: 'rgba(214, 255, 75, 0.22)',
    cardRadius: 24,
    borderColor: 'rgba(214, 255, 75, 0.55)',
    borderWidth: 2.5,
    bgBottom: '#040700',
  },
  competitive: {
    name: 'Competitive',
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.22)',
    cardRadius: 6,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 2,
    topAccent: '#f59e0b',
    topAccentHeight: 4.5,
    bgBottom: '#070501',
  },
}

/**
 * Truncate text to fit within a maxWidth on the canvas context, adding ellipsis if needed.
 */
function fitText(ctx, text, maxWidth) {
  if (!text) return ''
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '…'
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
 * Generates a high-resolution, full-fidelity "Brag Grid Showcase" collage.
 * Renders currently filtered games as complete themed cards (Poster + Game Title + Studio).
 * Supports standard social media aspect ratios: 'auto' (Full Grid), '16:9', '9:16', '1:1'.
 *
 * @param {Array} games - List of currently filtered games
 * @param {Object} stats - Vault statistics
 * @param {Object|string} options - { layoutTheme, viewTitle, aspectRatio }
 */
export async function generateBragCollage(games = [], stats = {}, options = {}) {
  const layoutTheme = (typeof options === 'string' ? options : options?.layoutTheme) || 'cinematic'
  const theme = THEME_CONFIGS[layoutTheme] || THEME_CONFIGS.cinematic
  const viewTitle = (typeof options === 'object' && options?.viewTitle) ? options.viewTitle : 'Collection Showcase'
  const aspectRatio = (typeof options === 'object' && options?.aspectRatio) ? options.aspectRatio : 'auto'

  const visibleGames = games.filter((g) => !g.is_utility && !g.is_dlc).length > 0
    ? games.filter((g) => !g.is_utility && !g.is_dlc)
    : games

  if (!visibleGames.length) {
    throw new Error('No games available in library to showcase.')
  }

  // 1. Setup Canvas Dimensions & Frame Configuration
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
    // 'auto' - Dynamic height full continuous tapestry
    width = 3840
    isFixed = false
  }

  const isVertical = width < 2500
  const padX = isVertical ? 60 : 80
  const headerTop = isVertical ? 70 : 60
  const headerHeight = isVertical ? 220 : 160
  const gridTop = headerTop + headerHeight
  const footerHeight = 80
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
    // Auto dynamic grid: adaptive columns based on count so all games are rendered without cutoff
    if (visibleGames.length <= 16) cols = 5
    else if (visibleGames.length <= 32) cols = 6
    else if (visibleGames.length <= 60) cols = 7
    else if (visibleGames.length <= 130) cols = 8
    else if (visibleGames.length <= 260) cols = 10
    else if (visibleGames.length <= 500) cols = 12
    else if (visibleGames.length <= 800) cols = 14
    else cols = 16

    gap = cols >= 12 ? 16 : 22
    cardWidth = (availableWidth - (cols - 1) * gap) / cols
    posterHeight = cardWidth * 1.5
    captionHeight = Math.max(46, Math.round(cardWidth * 0.25))
    cardHeight = posterHeight + captionHeight
    rows = Math.ceil(visibleGames.length / cols)
    const gridHeight = rows * cardHeight + (rows - 1) * gap
    height = Math.max(2160, gridTop + gridHeight + footerHeight)
  } else {
    // Fixed aspect ratio (16:9, 9:16, 1:1): find best column packing to maximize card size
    const minCardW = isVertical ? 140 : 160
    const targetN = visibleGames.length

    let bestCols = null
    let bestCardW = 0
    let bestRows = 0

    // Search for column count where all targetN cards comfortably fit
    for (let c = 2; c <= 24; c++) {
      const g = c >= 12 ? 14 : 18
      const testCardW = (availableWidth - (c - 1) * g) / c
      if (testCardW < minCardW) break

      const testPosterH = testCardW * 1.5
      const testCapH = Math.max(46, Math.round(testCardW * 0.25))
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
      posterHeight = cardWidth * 1.5
      captionHeight = Math.max(46, Math.round(cardWidth * 0.25))
      cardHeight = posterHeight + captionHeight
      rows = bestRows
      gamesToRender = visibleGames
    } else {
      // Library has more games than can fit at minCardW - pack maximum readable cards and show overflow card
      const maxCols = Math.max(3, Math.floor((availableWidth + 14) / (minCardW + 14)))
      gap = maxCols >= 12 ? 14 : 18
      cardWidth = (availableWidth - (maxCols - 1) * gap) / maxCols
      posterHeight = cardWidth * 1.5
      captionHeight = Math.max(46, Math.round(cardWidth * 0.25))
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

    // Center grid vertically within the frame for balanced poster aesthetics
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

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height)
  bgGrad.addColorStop(0, '#0a0d14')
  bgGrad.addColorStop(0.5, '#05070a')
  bgGrad.addColorStop(1, theme.bgBottom || '#020305')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Background ambient theme glow
  const glow = ctx.createRadialGradient(width / 2, 0, 50, width / 2, 0, Math.max(1800, height / 2))
  glow.addColorStop(0, theme.glow)
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  // 2. Header Section
  ctx.textBaseline = 'top'

  // Eyebrow
  ctx.fillStyle = theme.accent
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  const eyebrowText = `// LOGPILE // ${theme.name.toUpperCase()} THEME`
  ctx.fillText(eyebrowText, padX, headerTop)

  // Title
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 ${isVertical ? '52px' : '64px'} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  const maxTitleW = isVertical ? availableWidth : availableWidth - 1100
  const renderedTitle = fitText(ctx, viewTitle, maxTitleW)
  ctx.fillText(renderedTitle, padX, headerTop + 36)

  // Telemetry stats
  const totalVaultTitles = stats.totalGames || games.length
  const totalInstalled = stats.installedGames || games.filter((g) => g.is_installed).length
  const totalPlaytimeHours = Math.round(
    games.reduce((acc, g) => acc + (Number(g.play_time_seconds) || 0), 0) / 3600
  )

  const statsList = [
    { label: 'SHOWCASED', value: `${visibleGames.length}` },
    { label: 'INSTALLED', value: `${totalInstalled}` },
    { label: 'VAULT TOTAL', value: `${totalVaultTitles}` },
    { label: 'PLAYTIME', value: `${totalPlaytimeHours} hrs` },
    { label: 'STORAGE', value: `${stats.totalStorageGb ? `${stats.totalStorageGb} GB` : 'Offline'}` },
  ]

  if (isVertical) {
    // 9:16 Story / vertical: render stats in a horizontal chip row under the title
    const statChipWidth = Math.floor(availableWidth / 4)
    for (let i = 0; i < Math.min(4, statsList.length); i++) {
      const s = statsList[i]
      const chipX = padX + i * statChipWidth
      ctx.textAlign = 'left'
      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(s.label, chipX, headerTop + 115)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(s.value, chipX, headerTop + 140)
    }
  } else {
    // Landscape / Standard layout: stats right-aligned
    let badgeRight = width - padX
    for (let i = statsList.length - 1; i >= 0; i--) {
      const s = statsList[i]
      ctx.textAlign = 'right'
      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(s.label, badgeRight, headerTop + 40)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(s.value, badgeRight, headerTop + 66)
      badgeRight -= 230
    }
  }
  ctx.textAlign = 'left'

  // Header Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 2
  ctx.beginPath()
  const divY = isVertical ? headerTop + 195 : headerTop + 130
  ctx.moveTo(padX, divY)
  ctx.lineTo(width - padX, divY)
  ctx.stroke()

  // 3. Preload posters in batches for the rendered titles
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

  // 4. Draw ALL complete cards (Poster Artwork + Game Title + Developer) matching app card UI
  gamesToRender.forEach((game, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const x = padX + col * (cardWidth + gap)
    const y = finalGridTop + row * (cardHeight + gap)
    const r = theme.cardRadius
    const pad = Math.max(8, Math.round(cardWidth * 0.04))

    // Step 1: Draw Card Container Background
    ctx.save()
    drawCardShape(ctx, x, y, cardWidth, cardHeight, r)
    ctx.fillStyle = '#0b0e14'
    ctx.fill()
    ctx.restore()

    // Step 2: Draw Poster Artwork (clipped to card's top rounded corners)
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
      ctx.drawImage(img, x, y, cardWidth, posterHeight)
    } else {
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(x, y, cardWidth, posterHeight)

      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.round(cardWidth * 0.07)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(game.canonical_title.slice(0, 16), x + cardWidth / 2, y + posterHeight / 2 - 10)
      ctx.textAlign = 'left'
    }
    ctx.restore()

    // Step 3: Draw Card Caption Footer (Game Title + Developer / Studio)
    const padSide = Math.max(8, Math.round(cardWidth * 0.05))
    const maxTextWidth = cardWidth - padSide * 2

    const titleFontSize = Math.max(11, Math.round(cardWidth * 0.052))
    const subFontSize = Math.max(9, Math.round(cardWidth * 0.038))
    const lineGap = Math.max(3, Math.round(cardWidth * 0.015))
    const contentHeight = titleFontSize + lineGap + subFontSize
    const topPad = Math.max(6, Math.round((captionHeight - contentHeight) / 2))

    // Game Title
    ctx.fillStyle = '#f8fafc'
    ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    const titleText = fitText(ctx, game.canonical_title || 'Untitled Game', maxTextWidth)
    ctx.fillText(titleText, x + padSide, y + posterHeight + topPad)

    // Developer / Studio
    ctx.fillStyle = '#94a3b8'
    ctx.font = `500 ${subFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    const devText = fitText(ctx, game.developer || game.publisher || (game.is_utility ? 'Utility Tool' : 'Studio Unknown'), maxTextWidth)
    ctx.fillText(devText, x + padSide, y + posterHeight + topPad + titleFontSize + lineGap)

    // Step 4: Draw Theme Card Border
    ctx.save()
    drawCardShape(ctx, x, y, cardWidth, cardHeight, r)
    ctx.strokeStyle = game.is_favorite ? 'rgba(250, 204, 21, 0.65)' : theme.borderColor
    ctx.lineWidth = theme.borderWidth
    ctx.stroke()

    // Step 5: Draw Theme Signature Accents (e.g. Competitive top amber accent bar)
    if (theme.topAccent) {
      ctx.fillStyle = theme.topAccent
      ctx.beginPath()
      if (r > 0 && typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, cardWidth, theme.topAccentHeight, [r, r, 0, 0])
      } else {
        ctx.rect(x, y, cardWidth, theme.topAccentHeight)
      }
      ctx.fill()
    }
    ctx.restore()
  })

  // 5. Draw Overflow Vault Card (if in fixed frame and titles exceed max readable capacity)
  if (overflowCount > 0) {
    const idx = gamesToRender.length
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const x = padX + col * (cardWidth + gap)
    const y = finalGridTop + row * (cardHeight + gap)
    const r = theme.cardRadius

    ctx.save()
    drawCardShape(ctx, x, y, cardWidth, cardHeight, r)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)'
    ctx.fill()
    ctx.strokeStyle = theme.accent
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.fillStyle = theme.accent
    ctx.textAlign = 'center'
    ctx.font = `900 ${Math.round(cardWidth * 0.16)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillText(`+${overflowCount}`, x + cardWidth / 2, y + cardHeight * 0.35)

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.round(cardWidth * 0.065)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillText('MORE IN VAULT', x + cardWidth / 2, y + cardHeight * 0.52)

    ctx.fillStyle = '#94a3b8'
    ctx.font = `500 ${Math.round(cardWidth * 0.045)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillText('Select "Full Grid" to brag', x + cardWidth / 2, y + cardHeight * 0.65)
    ctx.fillText('every single title', x + cardWidth / 2, y + cardHeight * 0.72)
    ctx.textAlign = 'left'
    ctx.restore()
  }

  // 6. Footer Branding
  ctx.fillStyle = '#64748b'
  ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  const ratioTag = aspectRatio === 'auto' ? '' : ` • ${aspectRatio} FORMAT`
  ctx.fillText(`LOGPILE • 100% Offline Game Sanctuary & Launcher • Open-Source${ratioTag}`, padX, height - 36)

  return canvas.toDataURL('image/png', 0.95)
}
