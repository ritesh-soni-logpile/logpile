const VOICE_SETTINGS_KEY = 'logpile_voice_settings_v1'

const DEFAULT_SETTINGS = {
  ttsEnabled: true,
  wakeWordEnabled: false,
  gamepadPtt: true,
}

export function getVoiceSettings() {
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULT_SETTINGS }
}

export function saveVoiceSettings(updates) {
  try {
    const current = getVoiceSettings()
    const next = { ...current, ...updates }
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(next))
    return next
  } catch {
    return DEFAULT_SETTINGS
  }
}

/**
 * Clean text for natural speech synthesis (strips emojis, markdown, and JSON actions)
 */
function sanitizeForSpeech(raw) {
  if (!raw || typeof raw !== 'string') return ''
  return raw
    .replace(/\{[\s\S]*?\}/g, '') // strip JSON blocks
    .replace(/[*_#`~[\]()<>]/g, '') // strip markdown
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // strip emojis
    .replace(/\s+/g, ' ')
    .trim()
}

export function speakConfirmation(text, options = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  const settings = getVoiceSettings()
  if (!settings.ttsEnabled && !options.force) return

  const clean = sanitizeForSpeech(text)
  if (!clean) return

  try {
    window.speechSynthesis.cancel() // Stop prior utterance

    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.rate = options.rate || 1.05
    utterance.pitch = options.pitch || 1.0
    utterance.volume = options.volume ?? 1.0

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Zira') || v.name.includes('George'))
    )
    if (preferredVoice) utterance.voice = preferredVoice

    window.speechSynthesis.speak(utterance)
  } catch (err) {
    console.warn('[Voice] Speech synthesis failed:', err)
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel()
    } catch {}
  }
}
