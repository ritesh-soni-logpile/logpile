import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Volume2,
  VolumeX,
  Sparkles,
  Activity,
  Gamepad2,
  Moon,
  Trophy,
  Zap,
  Film,
  Monitor,
  TerminalSquare,
  Cpu,
  Compass,
  Palette
} from 'lucide-react'
import logoDark from '../assets/logo.png'
import logoCinematic from '../assets/themes/logo-cinematic.png'
import logoKinetic from '../assets/themes/logo-kinetic.png'
import logoPlayful from '../assets/themes/logo-playful.png'
import logoAtmospheric from '../assets/themes/logo-atmospheric.png'
import logoCompetitive from '../assets/themes/logo-competitive.png'
import { getCustomThemes } from '../utils/themeAddons'

export const THEME_LOGOS = {
  cinematic: logoCinematic,
  kinetic: logoKinetic,
  playful: logoPlayful,
  atmospheric: logoAtmospheric,
  competitive: logoCompetitive,
}

/**
 * Synthesize theme-specific startup audio using pure Web Audio API.
 * 100% offline, zero external audio assets, ultra-low latency.
 */
function playThemeAudio(theme = 'cinematic', isMuted = false, addon = null) {
  if (isMuted || typeof window === 'undefined') return () => {}
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return () => {}
    let ctx = null
    try {
      ctx = new AudioContextClass()
    } catch {
      return () => {}
    }
    if (!ctx) return () => {}
    if (ctx.state === 'suspended') {
      Promise.race([
        ctx.resume(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('audio timeout')), 200))
      ]).catch(() => {})
    }

    const now = ctx.currentTime
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.001, now)
    masterGain.connect(ctx.destination)

    // Normalize theme string
    const t = (theme || 'cinematic').toLowerCase()

    // ==========================================
    // 1. CINEMATIC: Netflix / Apple TV Luxe Bloom
    // ==========================================
    if (t === 'cinematic') {
      masterGain.gain.linearRampToValueAtTime(0.38, now + 0.15)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.3)

      const sub = ctx.createOscillator()
      const subG = ctx.createGain()
      sub.type = 'sine'
      sub.frequency.setValueAtTime(48, now)
      sub.frequency.exponentialRampToValueAtTime(32, now + 1.8)
      subG.gain.setValueAtTime(0.001, now)
      subG.gain.linearRampToValueAtTime(0.65, now + 0.12)
      subG.gain.exponentialRampToValueAtTime(0.0001, now + 1.9)
      sub.connect(subG); subG.connect(masterGain)
      sub.start(now); sub.stop(now + 2.4)

      ;[293.66, 440.0, 587.33, 880.0].forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + 0.18)
        const delay = 0.18 + idx * 0.04
        g.gain.setValueAtTime(0.0001, now + delay)
        g.gain.linearRampToValueAtTime(0.18 / (idx + 1), now + delay + 0.1)
        g.gain.exponentialRampToValueAtTime(0.00001, now + 2.2)
        osc.connect(g); g.connect(masterGain)
        osc.start(now + delay); osc.stop(now + 2.4)
      })
    }
    // ==========================================
    // 2. KINETIC: High-Octane Cyber Sub-Drop & Sweep
    // ==========================================
    else if (t === 'kinetic') {
      masterGain.gain.linearRampToValueAtTime(0.42, now + 0.08)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8)

      const sweep = ctx.createOscillator()
      const sweepGain = ctx.createGain()
      sweep.type = 'sawtooth'
      sweep.frequency.setValueAtTime(80, now)
      sweep.frequency.exponentialRampToValueAtTime(340, now + 0.25)
      sweepGain.gain.setValueAtTime(0.01, now)
      sweepGain.gain.linearRampToValueAtTime(0.35, now + 0.1)
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
      sweep.connect(sweepGain); sweepGain.connect(masterGain)
      sweep.start(now); sweep.stop(now + 0.5)

      const kick = ctx.createOscillator()
      const kickGain = ctx.createGain()
      kick.type = 'sine'
      kick.frequency.setValueAtTime(140, now + 0.18)
      kick.frequency.exponentialRampToValueAtTime(38, now + 0.5)
      kickGain.gain.setValueAtTime(0.01, now + 0.18)
      kickGain.gain.linearRampToValueAtTime(0.85, now + 0.22)
      kickGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6)
      kick.connect(kickGain); kickGain.connect(masterGain)
      kick.start(now + 0.18); kick.stop(now + 1.8)
    }
    // ==========================================
    // 3. PLAYFUL: Nintendo / Arcade Marimba Sparkle
    // ==========================================
    else if (t === 'playful') {
      masterGain.gain.linearRampToValueAtTime(0.35, now + 0.05)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1)

      const marimbaNotes = [523.25, 659.25, 783.99, 1046.50]
      marimbaNotes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now)
        const noteTime = now + 0.12 + idx * 0.09
        g.gain.setValueAtTime(0.001, noteTime)
        g.gain.linearRampToValueAtTime(0.32, noteTime + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.55)
        osc.connect(g); g.connect(masterGain)
        osc.start(noteTime); osc.stop(noteTime + 0.6)
      })

      const coin = ctx.createOscillator()
      const coinG = ctx.createGain()
      coin.type = 'sine'
      coin.frequency.setValueAtTime(1318.51, now + 0.5)
      coin.frequency.setValueAtTime(1760.00, now + 0.62)
      coinG.gain.setValueAtTime(0.001, now + 0.5)
      coinG.gain.linearRampToValueAtTime(0.25, now + 0.64)
      coinG.gain.exponentialRampToValueAtTime(0.0001, now + 1.9)
      coin.connect(coinG); coinG.connect(masterGain)
      coin.start(now + 0.5); coin.stop(now + 2.0)
    }
    // ==========================================
    // 4. ATMOSPHERIC: Mystical Emerald Ambient Drone
    // ==========================================
    else if (t === 'atmospheric') {
      masterGain.gain.linearRampToValueAtTime(0.36, now + 0.3)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5)

      const bowl = ctx.createOscillator()
      const bowlGain = ctx.createGain()
      bowl.type = 'sine'
      bowl.frequency.setValueAtTime(65.41, now)
      bowlGain.gain.setValueAtTime(0.001, now)
      bowlGain.gain.linearRampToValueAtTime(0.55, now + 0.4)
      bowlGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.3)
      bowl.connect(bowlGain); bowlGain.connect(masterGain)
      bowl.start(now); bowl.stop(now + 2.5)

      ;[392.00, 523.25, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)
        const delay = 0.25 + idx * 0.12
        g.gain.setValueAtTime(0.001, now + delay)
        g.gain.linearRampToValueAtTime(0.14, now + delay + 0.25)
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.3)
        osc.connect(g); g.connect(masterGain)
        osc.start(now + delay); osc.stop(now + 2.5)
      })
    }
    // ==========================================
    // 5. COMPETITIVE: Arena Power-On & Lock-On Beep
    // ==========================================
    else if (t === 'competitive') {
      masterGain.gain.linearRampToValueAtTime(0.40, now + 0.06)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0)

      ;[now + 0.2, now + 0.32].forEach((beepTime, i) => {
        const beep = ctx.createOscillator()
        const beepGain = ctx.createGain()
        beep.type = 'sine'
        beep.frequency.setValueAtTime(i === 0 ? 987.77 : 1479.98, beepTime)
        beepGain.gain.setValueAtTime(0.001, beepTime)
        beepGain.gain.linearRampToValueAtTime(0.25, beepTime + 0.02)
        beepGain.gain.exponentialRampToValueAtTime(0.0001, beepTime + 0.14)
        beep.connect(beepGain); beepGain.connect(masterGain)
        beep.start(beepTime); beep.stop(beepTime + 0.16)
      })

      const impact = ctx.createOscillator()
      const impactGain = ctx.createGain()
      impact.type = 'sine'
      impact.frequency.setValueAtTime(110, now + 0.35)
      impact.frequency.exponentialRampToValueAtTime(32, now + 1.2)
      impactGain.gain.setValueAtTime(0.01, now + 0.35)
      impactGain.gain.linearRampToValueAtTime(0.75, now + 0.4)
      impactGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8)
      impact.connect(impactGain); impactGain.connect(masterGain)
      impact.start(now + 0.35); impact.stop(now + 1.9)
    }
    // ==========================================
    // 6. CYBERPUNK 2077: Cyber Glitch & Bass Drop
    // ==========================================
    else if (t.includes('cyberpunk')) {
      masterGain.gain.linearRampToValueAtTime(0.45, now + 0.08)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2)

      // Cyber glitch burst
      ;[880, 1320, 1760, 2640].forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(freq, now + idx * 0.04)
        g.gain.setValueAtTime(0.001, now + idx * 0.04)
        g.gain.linearRampToValueAtTime(0.18, now + idx * 0.04 + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.12)
        osc.connect(g); g.connect(masterGain)
        osc.start(now + idx * 0.04); osc.stop(now + idx * 0.04 + 0.14)
      })

      // Heavy distorted sub
      const sub = ctx.createOscillator()
      const subG = ctx.createGain()
      sub.type = 'square'
      sub.frequency.setValueAtTime(55, now + 0.2)
      sub.frequency.exponentialRampToValueAtTime(30, now + 1.2)
      subG.gain.setValueAtTime(0.01, now + 0.2)
      subG.gain.linearRampToValueAtTime(0.4, now + 0.25)
      subG.gain.exponentialRampToValueAtTime(0.0001, now + 1.9)
      sub.connect(subG); subG.connect(masterGain)
      sub.start(now + 0.2); sub.stop(now + 2.0)
    }
    // ==========================================
    // 7. SYNTHWAVE 80s: Retro Chorus Chord & Sweep
    // ==========================================
    else if (t.includes('synthwave')) {
      masterGain.gain.linearRampToValueAtTime(0.38, now + 0.12)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4)

      // Warm 80s analog saw chord: F3, A3, C4, E4
      ;[174.61, 220.00, 261.63, 329.63].forEach((freq) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(freq, now + 0.1)
        g.gain.setValueAtTime(0.001, now + 0.1)
        g.gain.linearRampToValueAtTime(0.15, now + 0.3)
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.2)
        osc.connect(g); g.connect(masterGain)
        osc.start(now + 0.1); osc.stop(now + 2.3)
      })
    }
    // ==========================================
    // 8. MATRIX: Digital Stream Bleep Cascade
    // ==========================================
    else if (t.includes('matrix')) {
      masterGain.gain.linearRampToValueAtTime(0.35, now + 0.05)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0)

      ;[587.33, 783.99, 1046.50, 1318.51, 1567.98, 2093.00].forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        const tStep = now + idx * 0.06
        osc.frequency.setValueAtTime(freq, tStep)
        g.gain.setValueAtTime(0.001, tStep)
        g.gain.linearRampToValueAtTime(0.2, tStep + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, tStep + 0.12)
        osc.connect(g); g.connect(masterGain)
        osc.start(tStep); osc.stop(tStep + 0.14)
      })
    }
    // ==========================================
    // 9. GAME BOY: 8-Bit Chiptune Coin Fanfare
    // ==========================================
    else if (t.includes('gameboy') || t.includes('8bit')) {
      masterGain.gain.linearRampToValueAtTime(0.32, now + 0.04)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8)

      ;[261.63, 329.63, 392.00, 523.25, 659.25, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'square'
        const tStep = now + idx * 0.05
        osc.frequency.setValueAtTime(freq, tStep)
        g.gain.setValueAtTime(0.001, tStep)
        g.gain.linearRampToValueAtTime(0.18, tStep + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, tStep + 0.15)
        osc.connect(g); g.connect(masterGain)
        osc.start(tStep); osc.stop(tStep + 0.16)
      })
    }
    // ==========================================
    // 10. PIP-BOY: CRT Flyback Whine & Geiger Tick
    // ==========================================
    else if (t.includes('pipboy')) {
      masterGain.gain.linearRampToValueAtTime(0.34, now + 0.06)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9)

      // Geiger click double-burst
      ;[now + 0.1, now + 0.22, now + 0.35].forEach((tickTime) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(2400, tickTime)
        g.gain.setValueAtTime(0.001, tickTime)
        g.gain.linearRampToValueAtTime(0.3, tickTime + 0.005)
        g.gain.exponentialRampToValueAtTime(0.0001, tickTime + 0.04)
        osc.connect(g); g.connect(masterGain)
        osc.start(tickTime); osc.stop(tickTime + 0.05)
      })
    }
    // ==========================================
    // 11. STEAM 2004: Valve Steam Release & Steel Impact
    // ==========================================
    else if (t.includes('steam')) {
      masterGain.gain.linearRampToValueAtTime(0.38, now + 0.1)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0)

      const noise = ctx.createOscillator()
      const noiseG = ctx.createGain()
      noise.type = 'triangle'
      noise.frequency.setValueAtTime(180, now)
      noise.frequency.exponentialRampToValueAtTime(45, now + 1.2)
      noiseG.gain.setValueAtTime(0.001, now)
      noiseG.gain.linearRampToValueAtTime(0.6, now + 0.15)
      noiseG.gain.exponentialRampToValueAtTime(0.0001, now + 1.8)
      noise.connect(noiseG); noiseG.connect(masterGain)
      noise.start(now); noise.stop(now + 1.9)
    }
    // ==========================================
    // 12. NORD FROST / OLED NOIR / CUSTOM THEME
    // ==========================================
    else {
      masterGain.gain.linearRampToValueAtTime(0.32, now + 0.1)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2)

      const sub = ctx.createOscillator()
      const subG = ctx.createGain()
      sub.type = 'sine'
      sub.frequency.setValueAtTime(55, now)
      sub.frequency.exponentialRampToValueAtTime(35, now + 1.6)
      subG.gain.setValueAtTime(0.001, now)
      subG.gain.linearRampToValueAtTime(0.45, now + 0.15)
      subG.gain.exponentialRampToValueAtTime(0.0001, now + 1.8)
      sub.connect(subG); subG.connect(masterGain)
      sub.start(now); sub.stop(now + 2.0)

      ;[330, 440, 660].forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + 0.15)
        const delay = 0.15 + idx * 0.06
        g.gain.setValueAtTime(0.001, now + delay)
        g.gain.linearRampToValueAtTime(0.16, now + delay + 0.08)
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.0)
        osc.connect(g); g.connect(masterGain)
        osc.start(now + delay); osc.stop(now + 2.1)
      })
    }

    return () => {
      try {
        masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.08)
        setTimeout(() => ctx.close().catch(() => {}), 120)
      } catch {}
    }
  } catch (e) {
    return () => {}
  }
}

export function IntroSplash({ layoutTheme = 'cinematic', isDataLoaded = false, onFinish }) {
  const canvasRef = useRef(null)
  const [phase, setPhase] = useState('entering') // 'entering' | 'reveal' | 'holding' | 'leaving'
  const [isMuted, setIsMuted] = useState(() => {
    try {
      // Sound OFF by default per user specification
      return localStorage.getItem('logpile-intro-muted') !== 'false'
    } catch {
      return true
    }
  })
  const hasFinishedRef = useRef(false)
  const stopAudioRef = useRef(null)
  const minTimerRef = useRef(null)
  const minDurationPassedRef = useRef(false)

  // Look up custom theme if active
  const activeAddon = useMemo(() => {
    const list = getCustomThemes()
    return list.find((t) => t.id === layoutTheme) || null
  }, [layoutTheme])

  const triggerFinish = useCallback(() => {
    if (hasFinishedRef.current) return
    hasFinishedRef.current = true
    try {
      sessionStorage.setItem('logpile-intro-session-played', 'true')
    } catch {}
    setPhase('leaving')
    if (stopAudioRef.current) stopAudioRef.current()
    setTimeout(() => {
      if (typeof onFinish === 'function') onFinish()
    }, 550)
  }, [onFinish])

  const toggleMute = (e) => {
    e.stopPropagation()
    setIsMuted((prev) => {
      const next = !prev
      try {
        localStorage.setItem('logpile-intro-muted', String(next))
      } catch {}
      return next
    })
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['Escape', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault()
        triggerFinish()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [triggerFinish])

  useEffect(() => {
    stopAudioRef.current = playThemeAudio(layoutTheme, isMuted, activeAddon)

    const revealTimer = setTimeout(() => {
      setPhase('reveal')
    }, 180)

    minTimerRef.current = setTimeout(() => {
      minDurationPassedRef.current = true
      if (isDataLoaded) {
        triggerFinish()
      } else {
        setPhase('holding')
      }
    }, 2200)

    const safetyTimer = setTimeout(() => {
      triggerFinish()
    }, 2800)

    return () => {
      clearTimeout(revealTimer)
      clearTimeout(minTimerRef.current)
      clearTimeout(safetyTimer)
      if (stopAudioRef.current) stopAudioRef.current()
    }
  }, [layoutTheme, isMuted, isDataLoaded, triggerFinish, activeAddon])

  useEffect(() => {
    if (isDataLoaded && minDurationPassedRef.current) {
      triggerFinish()
    }
  }, [isDataLoaded, triggerFinish])

  // ==============================================================
  // THEME-SPECIFIC CANVAS ANIMATION ENGINE
  // ==============================================================
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId = null
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const tKey = (layoutTheme || '').toLowerCase()

    // Particle seed generator tailored by theme
    const PARTICLE_COUNT = tKey === 'kinetic' || tKey.includes('cyberpunk') ? 160 : tKey === 'playful' ? 50 : 120
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * width,
      y: (Math.random() - 0.5) * height,
      z: Math.random() * width,
      size: Math.random() * 2.0 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 4 + 2,
      char: String.fromCharCode(33 + Math.floor(Math.random() * 90)),
      hue: Math.random() * 40
    }))

    let startTime = performance.now()

    const render = (time) => {
      const elapsed = (time - startTime) / 1000
      ctx.clearRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2

      // -----------------------------------------------------------
      // 1. KINETIC: High-velocity horizontal laser lines & glitch
      // -----------------------------------------------------------
      if (tKey === 'kinetic') {
        ctx.fillStyle = 'rgba(10, 6, 4, 0.4)'
        ctx.fillRect(0, 0, width, height)

        particles.forEach((p) => {
          p.x += p.speed * 8
          if (p.x > width / 2) p.x = -width / 2

          const sx = cx + p.x
          const sy = cy + p.y
          const alpha = p.opacity * Math.min(elapsed * 2, 1)

          ctx.fillStyle = `rgba(249, 115, 22, ${alpha})`
          ctx.fillRect(sx, sy, p.size * 3.5, 1.2)
        })

        const sweepY = (Math.sin(elapsed * 4) * 0.5 + 0.5) * height
        ctx.fillStyle = 'rgba(249, 115, 22, 0.12)'
        ctx.fillRect(0, sweepY - 1, width, 2)
      }
      // -----------------------------------------------------------
      // 2. PLAYFUL: Floating pastel orbs & sparkling bubbles
      // -----------------------------------------------------------
      else if (tKey === 'playful') {
        particles.forEach((p) => {
          p.y -= p.speed * 0.6
          p.x += Math.sin(elapsed * 1.5 + p.z) * 0.8
          if (p.y < -height / 2) p.y = height / 2

          const sx = cx + p.x
          const sy = cy + p.y
          const r = p.size * 3.5

          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r)
          grad.addColorStop(0, 'rgba(244, 114, 182, 0.45)')
          grad.addColorStop(0.5, 'rgba(214, 255, 75, 0.25)')
          grad.addColorStop(1, 'rgba(244, 114, 182, 0)')

          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(sx, sy, r, 0, Math.PI * 2)
          ctx.fill()
        })
      }
      // -----------------------------------------------------------
      // 3. ATMOSPHERIC: Undulating emerald aurora borealis waves
      // -----------------------------------------------------------
      else if (tKey === 'atmospheric') {
        const waveCount = 3
        for (let w = 0; w < waveCount; w++) {
          ctx.beginPath()
          ctx.moveTo(0, height)
          for (let x = 0; x <= width; x += 40) {
            const waveY = cy + Math.sin(x * 0.003 + elapsed * 1.2 + w * 2) * 120 + Math.cos(x * 0.006 + elapsed * 0.8) * 60
            ctx.lineTo(x, waveY)
          }
          ctx.lineTo(width, height)
          ctx.closePath()

          const auroraGrad = ctx.createLinearGradient(0, cy - 100, 0, height)
          auroraGrad.addColorStop(0, `rgba(130, 147, 154, ${0.12 / (w + 1)})`)
          auroraGrad.addColorStop(0.5, `rgba(89, 102, 108, ${0.18 / (w + 1)})`)
          auroraGrad.addColorStop(1, 'rgba(9, 11, 13, 0)')

          ctx.fillStyle = auroraGrad
          ctx.fill()
        }
      }
      // -----------------------------------------------------------
      // 4. COMPETITIVE: Radar targeting sweep & stadium crosshair
      // -----------------------------------------------------------
      else if (tKey === 'competitive') {
        const angle = elapsed * 2.2
        const radius = Math.min(width, height) * 0.38

        ctx.save()
        ctx.translate(cx, cy)
        const sweepGrad = ctx.createConicGradient ? ctx.createConicGradient(angle, 0, 0) : null
        if (sweepGrad) {
          sweepGrad.addColorStop(0, 'rgba(239, 68, 68, 0.28)')
          sweepGrad.addColorStop(0.12, 'rgba(239, 68, 68, 0)')
          sweepGrad.addColorStop(1, 'rgba(239, 68, 68, 0)')
          ctx.fillStyle = sweepGrad
          ctx.beginPath()
          ctx.arc(0, 0, radius, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.20)'
        ctx.lineWidth = 1
        ;[radius * 0.35, radius * 0.7, radius].forEach((r) => {
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, Math.PI * 2)
          ctx.stroke()
        })
        ctx.restore()
      }
      // -----------------------------------------------------------
      // 5. CYBERPUNK: Canary Yellow Digital Grid & Cyber Glitch
      // -----------------------------------------------------------
      else if (tKey.includes('cyberpunk')) {
        ctx.fillStyle = 'rgba(7, 8, 14, 0.4)'
        ctx.fillRect(0, 0, width, height)

        particles.forEach((p) => {
          p.x += p.speed * 6
          if (p.x > width / 2) p.x = -width / 2

          const sx = cx + p.x
          const sy = cy + p.y
          ctx.fillStyle = Math.random() > 0.3 ? 'rgba(252, 238, 10, 0.5)' : 'rgba(0, 240, 255, 0.6)'
          ctx.fillRect(sx, sy, p.size * 3, 1.5)
        })

        // Cyber glitch scanline
        const glitchY = (Math.sin(elapsed * 6) * 0.5 + 0.5) * height
        ctx.fillStyle = 'rgba(252, 238, 10, 0.18)'
        ctx.fillRect(0, glitchY, width, 3)
      }
      // -----------------------------------------------------------
      // 6. SYNTHWAVE 80s: Outrun Perspective Grid Horizon
      // -----------------------------------------------------------
      else if (tKey.includes('synthwave')) {
        // Glowing magenta sun on horizon
        const sunGrad = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy - 20, 160)
        sunGrad.addColorStop(0, 'rgba(255, 42, 133, 0.5)')
        sunGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.25)')
        sunGrad.addColorStop(1, 'rgba(12, 7, 20, 0)')
        ctx.fillStyle = sunGrad
        ctx.beginPath()
        ctx.arc(cx, cy - 20, 160, 0, Math.PI * 2)
        ctx.fill()

        // Perspective grid lines
        ctx.strokeStyle = 'rgba(255, 42, 133, 0.22)'
        ctx.lineWidth = 1
        for (let i = -width; i <= width * 2; i += 70) {
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(i, height)
          ctx.stroke()
        }

        // Horizontal moving grid lines
        for (let y = cy + 10; y < height; y += 18) {
          ctx.strokeStyle = 'rgba(5, 217, 232, 0.18)'
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(width, y)
          ctx.stroke()
        }
      }
      // -----------------------------------------------------------
      // 7. MATRIX: Cascading Phosphor Digital Rain
      // -----------------------------------------------------------
      else if (tKey.includes('matrix')) {
        ctx.fillStyle = 'rgba(2, 7, 3, 0.35)'
        ctx.fillRect(0, 0, width, height)

        ctx.font = '12px monospace'
        particles.forEach((p) => {
          p.y += p.speed * 2.5
          if (p.y > height / 2) p.y = -height / 2

          const sx = cx + p.x
          const sy = cy + p.y
          ctx.fillStyle = p.speed > 4.5 ? '#a7f3d0' : 'rgba(0, 255, 65, 0.7)'
          ctx.fillText(p.char, sx, sy)
        })
      }
      // -----------------------------------------------------------
      // 8. GAME BOY: 8-Bit LCD Green Pixel Grid
      // -----------------------------------------------------------
      else if (tKey.includes('gameboy') || tKey.includes('8bit')) {
        ctx.fillStyle = 'rgba(15, 26, 14, 0.35)'
        ctx.fillRect(0, 0, width, height)

        particles.forEach((p) => {
          p.y -= p.speed * 0.8
          if (p.y < -height / 2) p.y = height / 2

          const sx = Math.floor((cx + p.x) / 8) * 8
          const sy = Math.floor((cy + p.y) / 8) * 8
          ctx.fillStyle = 'rgba(155, 188, 15, 0.65)'
          ctx.fillRect(sx, sy, 6, 6)
        })
      }
      // -----------------------------------------------------------
      // 9. PIP-BOY: Fallout Phosphor CRT Scanlines & Rads
      // -----------------------------------------------------------
      else if (tKey.includes('pipboy')) {
        ctx.fillStyle = 'rgba(2, 13, 4, 0.4)'
        ctx.fillRect(0, 0, width, height)

        // CRT horizontal raster scanlines
        ctx.fillStyle = 'rgba(27, 253, 48, 0.04)'
        for (let y = 0; y < height; y += 4) {
          ctx.fillRect(0, y, width, 1.5)
        }

        const sweepY = (Math.sin(elapsed * 2) * 0.5 + 0.5) * height
        ctx.fillStyle = 'rgba(27, 253, 48, 0.15)'
        ctx.fillRect(0, sweepY, width, 4)
      }
      // -----------------------------------------------------------
      // 10. STEAM 2004 / NORD FROST / CUSTOM ADDONS
      // -----------------------------------------------------------
      else if (activeAddon) {
        const accent = activeAddon.palette?.accent || '#38bdf8'
        particles.forEach((p) => {
          p.z -= 3.5
          if (p.z <= 0) p.z = width

          const k = 220 / p.z
          const px = p.x * k + cx
          const py = p.y * k + cy

          if (px >= 0 && px <= width && py >= 0 && py <= height) {
            ctx.fillStyle = accent
            ctx.beginPath()
            ctx.arc(px, py, p.size * (1 - p.z / width) * 2.2, 0, Math.PI * 2)
            ctx.fill()
          }
        })
      }
      // -----------------------------------------------------------
      // 11. DEFAULT CINEMATIC: 3D Warp Starfield
      // -----------------------------------------------------------
      else {
        particles.forEach((p) => {
          p.z -= 4.2
          if (p.z <= 0) p.z = width

          const k = 220 / p.z
          const px = p.x * k + cx
          const py = p.y * k + cy

          if (px >= 0 && px <= width && py >= 0 && py <= height) {
            const alpha = (1 - p.z / width) * p.opacity
            ctx.fillStyle = `rgba(198, 165, 107, ${alpha})`
            ctx.fillRect(px, py, p.size * (1 - p.z / width) * 2.2, p.size * (1 - p.z / width) * 2.2)
          }
        })
      }

      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animId) cancelAnimationFrame(animId)
    }
  }, [layoutTheme, activeAddon])

  const tKey = (layoutTheme || '').toLowerCase()

  return (
    <div
      className={`intro-splash-container phase-${phase} theme-${tKey}`}
      onClick={triggerFinish}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Logpile"
    >
      <canvas ref={canvasRef} className="intro-splash-canvas" />

      <div className={`intro-splash-glow glow-${tKey}`} />

      <div className="intro-splash-center">
        <div className="intro-logo-wrapper">
          <img
            src={THEME_LOGOS[tKey] || logoDark}
            alt="Logpile"
            className="intro-logo-image"
            draggable="false"
          />
          <div className="intro-logo-sheen" />
          <div
            className="intro-logo-aura"
            style={{
              boxShadow: activeAddon?.palette?.accentGlow
                ? `0 0 70px ${activeAddon.palette.accentGlow}`
                : undefined
            }}
          />
        </div>

        {/* Wordmark with Theme-Specific Styling & Typography */}
        <div className={`intro-brand-title brand-${tKey}`}>
          {tKey === 'kinetic' ? (
            <span className="brand-wordmark-kinetic">// LOGPILE //</span>
          ) : tKey === 'playful' ? (
            <span className="brand-wordmark-playful">Logpile</span>
          ) : tKey === 'atmospheric' ? (
            <span className="brand-wordmark-atmospheric">LOGPILE</span>
          ) : tKey === 'competitive' ? (
            <span className="brand-wordmark-competitive">LOGPILE</span>
          ) : tKey.includes('cyberpunk') ? (
            <span className="brand-wordmark-cyberpunk">// CYBERPUNK 2077 //</span>
          ) : tKey.includes('synthwave') ? (
            <span className="brand-wordmark-synthwave">LOGPILE '84</span>
          ) : tKey.includes('matrix') ? (
            <span className="brand-wordmark-matrix">[ LOGPILE.HEX ]</span>
          ) : tKey.includes('gameboy') || tKey.includes('8bit') ? (
            <span className="brand-wordmark-gameboy">LOGPILE 8-BIT</span>
          ) : tKey.includes('pipboy') ? (
            <span className="brand-wordmark-pipboy">LOGPILE 3000</span>
          ) : tKey.includes('steam') ? (
            <span className="brand-wordmark-steam">LOGPILE // VALVE</span>
          ) : tKey.includes('nord') ? (
            <span className="brand-wordmark-nord">LOGPILE ARCTIC</span>
          ) : tKey.includes('oled') ? (
            <span className="brand-wordmark-oled">LOGPILE</span>
          ) : activeAddon ? (
            <span style={{ color: activeAddon.palette?.accent || '#ffffff' }}>
              {activeAddon.name.toUpperCase()}
            </span>
          ) : (
            <>
              <span>L</span>
              <span>O</span>
              <span>G</span>
              <span>P</span>
              <span>I</span>
              <span>L</span>
              <span>E</span>
            </>
          )}
        </div>

        {/* Theme-Specific Statement / Tagline */}
        <div className="intro-brand-tagline">
          {activeAddon ? (
            <>
              <Zap size={12} style={{ color: activeAddon.palette?.accent || '#d6ff4b' }} />
              <span>{activeAddon.tagline ? activeAddon.tagline.toUpperCase() : activeAddon.name.toUpperCase()}</span>
              <span className="intro-tagline-dot">·</span>
              <span>{activeAddon.category ? activeAddon.category.toUpperCase() : 'COMMUNITY ADDON'}</span>
            </>
          ) : tKey === 'kinetic' ? (
            <>
              <Activity size={12} style={{ color: '#f97316' }} />
              <span>KINETIC LAUNCH ENGINE</span>
              <span className="intro-tagline-dot">·</span>
              <span>ZERO LATENCY</span>
            </>
          ) : tKey === 'playful' ? (
            <>
              <Gamepad2 size={12} style={{ color: '#d6ff4b' }} />
              <span>YOUR GAME ARCADE</span>
              <span className="intro-tagline-dot">·</span>
              <span>READY TO PLAY</span>
            </>
          ) : tKey === 'atmospheric' ? (
            <>
              <Moon size={12} style={{ color: '#82939A' }} />
              <span>THE SANCTUARY ARCHIVE</span>
              <span className="intro-tagline-dot" style={{ color: '#82939A' }}>·</span>
              <span>100% OFFLINE</span>
            </>
          ) : tKey === 'competitive' ? (
            <>
              <Trophy size={12} style={{ color: '#EF4444' }} />
              <span>COMPETITIVE SANCTUARY</span>
              <span className="intro-tagline-dot" style={{ color: '#EF4444' }}>·</span>
              <span>ESPORTS CALIBRATED</span>
            </>
          ) : (
            <>
              <Film size={12} style={{ color: '#C6A56B' }} />
              <span>OFFLINE GAME SANCTUARY</span>
              <span className="intro-tagline-dot" style={{ color: '#C6A56B' }}>·</span>
              <span>ZERO BLOAT</span>
            </>
          )}
        </div>

        {phase === 'holding' && (
          <div className="intro-loading-line-wrap">
            <div className="intro-loading-line" />
            <span className="intro-loading-text">Preparing your sanctuary…</span>
          </div>
        )}
      </div>

      <div className="intro-controls-footer" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="intro-mute-btn"
          onClick={toggleMute}
          title={isMuted ? 'Unmute intro audio' : 'Mute intro audio'}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          <span>{isMuted ? 'Muted' : 'Sound'}</span>
        </button>

        <div className="intro-skip-badge" onClick={triggerFinish}>
          <kbd>Esc</kbd>
          <span>or</span>
          <kbd>Space</kbd>
          <span>to skip</span>
        </div>
      </div>
    </div>
  )
}

export default IntroSplash
