/**
 * consoleAudio.js
 * Zero-dependency Web Audio API synthesizer for Logpile Big Picture Console Mode.
 * Specification Profile:
 * - Move Tick: Gentle 440Hz -> 220Hz micro-sweep (12ms), mimicking high-end haptic clicks.
 * - Select Chime: Soft dual-frequency ascending chime (520Hz + 660Hz) on confirm / A / Enter.
 * - Back Bump: Low-frequency dampened click (180Hz) on cancel / B / Esc.
 * Muted by default to respect quiet late-night sessions.
 */

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function isConsoleAudioEnabled() {
  try {
    return localStorage.getItem('logpile-console-audio') === 'true'
  } catch {
    return false
  }
}

export function setConsoleAudioEnabled(enabled) {
  try {
    localStorage.setItem('logpile-console-audio', String(enabled))
  } catch {}
}

export function playNavTick() {
  if (!isConsoleAudioEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    osc.type = 'sine'
    // 440Hz -> 220Hz micro-sweep (12ms)
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.012)

    gain.gain.setValueAtTime(0.06, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.014)
  } catch {}
}

export function playSelectChime() {
  if (!isConsoleAudioEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime

    // Dual-frequency ascending chime (520Hz + 660Hz)
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc2.type = 'triangle'

    osc1.frequency.setValueAtTime(520, now)
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.08)

    osc2.frequency.setValueAtTime(660, now + 0.02)
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.1)

    gain.gain.setValueAtTime(0.07, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now + 0.02)
    osc1.stop(now + 0.12)
    osc2.stop(now + 0.12)
  } catch {}
}

export function playBackClick() {
  if (!isConsoleAudioEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    osc.type = 'sine'
    // 180Hz dampened click
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.025)

    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.028)
  } catch {}
}
