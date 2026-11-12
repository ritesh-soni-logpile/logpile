const { spawn } = require('node:child_process')
const path = require('node:path')
const EventEmitter = require('node:events')

class VoiceService extends EventEmitter {
  constructor() {
    super()
    this.process = null
    this.isListening = false
    this.wakeWordEnabled = false
    this.silenceTimer = null
  }

  start(options = {}) {
    if (this.process) {
      this.isListening = true
      this.emit('stateChange', { isListening: true })
      return { success: true }
    }

    const wakeWord = Boolean(options.wakeWord || this.wakeWordEnabled)
    const psScript = `
Add-Type -AssemblyName System.Speech
try {
  $rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
  $rec.InitialSilenceTimeout = [TimeSpan]::FromSeconds(6)
  $rec.EndSilenceTimeout = [TimeSpan]::FromSeconds(1.8)
  $rec.EndSilenceTimeoutAmbiguous = [TimeSpan]::FromSeconds(1.5)
  
  $choices = New-Object System.Speech.Recognition.Choices
  $choices.Add([string[]]@(
    "hey logpile", "logpile",
    "launch", "play", "start", "run", "boot up",
    "open settings", "settings",
    "open dashboard", "dashboard",
    "open library", "library",
    "scan library",
    "show unplayed", "filter unplayed",
    "show installed", "filter installed",
    "show rpg", "show action", "show strategy", "show adventure", "show horror",
    "khelna hai", "chalao"
  ))
  $gb = New-Object System.Speech.Recognition.GrammarBuilder($choices)
  $cmdGrammar = New-Object System.Speech.Recognition.Grammar($gb)
  $rec.LoadGrammar($cmdGrammar)

  $dict = New-Object System.Speech.Recognition.DictationGrammar
  $rec.LoadGrammar($dict)

  Register-ObjectEvent -InputObject $rec -EventName "SpeechRecognized" -Action {
    $res = $Event.SourceEventArgs.Result
    if ($res -and $res.Confidence -ge 0.20) {
      $safeText = $res.Text -replace '"', '\\"'
      [Console]::WriteLine("RECOGNIZED:" + $safeText + ":" + [math]::Round($res.Confidence, 2))
    }
  } | Out-Null

  $rec.SetInputToDefaultAudioDevice()
  $rec.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
  [Console]::WriteLine("STATUS:READY")

  while ($true) {
    $line = [Console]::ReadLine()
    if ($line -eq "QUIT" -or $null -eq $line) { break }
  }
  $rec.RecognizeAsyncStop()
} catch {
  [Console]::WriteLine("ERROR:" + $_.Exception.Message)
}
`

    try {
      this.process = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-Command', psScript,
      ], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      this.isListening = true
      this.emit('stateChange', { isListening: true })

      let buffer = ''
      this.process.stdout.on('data', (chunk) => {
        buffer += chunk.toString()
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() // keep incomplete last line in buffer

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('RECOGNIZED:')) {
            const parts = trimmed.substring('RECOGNIZED:'.length).split(':')
            const text = parts[0]?.trim()
            const conf = parseFloat(parts[1] || '0.5')

            if (text) {
              const isWake = /^(hey logpile|logpile)$/i.test(text)
              this.emit('recognized', { text, confidence: conf, isWakeWord: isWake })
            }
          } else if (trimmed === 'STATUS:READY') {
            this.emit('ready')
          } else if (trimmed.startsWith('ERROR:')) {
            this.emit('error', trimmed)
          }
        }
      })

      this.process.stderr.on('data', () => {})

      this.process.on('close', () => {
        this.process = null
        this.isListening = false
        this.emit('stateChange', { isListening: false })
      })

      return { success: true }
    } catch (err) {
      this.isListening = false
      return { success: false, error: err.message }
    }
  }

  stop() {
    if (this.process) {
      try {
        this.process.stdin.write('QUIT\n')
      } catch {}
      setTimeout(() => {
        if (this.process) {
          try { this.process.kill() } catch {}
          this.process = null
        }
      }, 800)
    }
    this.isListening = false
    this.emit('stateChange', { isListening: false })
    return { success: true }
  }

  setWakeWord(enabled) {
    this.wakeWordEnabled = Boolean(enabled)
    if (this.wakeWordEnabled && !this.process) {
      this.start({ wakeWord: true })
    } else if (!this.wakeWordEnabled && this.process && !this.isListening) {
      this.stop()
    }
    return { wakeWordEnabled: this.wakeWordEnabled }
  }

  getStatus() {
    return {
      isListening: this.isListening,
      wakeWordEnabled: this.wakeWordEnabled,
      available: true,
    }
  }
}

module.exports = new VoiceService()
