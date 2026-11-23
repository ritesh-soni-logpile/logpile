import React, { useState, useEffect } from 'react'
import {
  Folder,
  HardDrive,
  CheckCircle2,
  Gauge,
  Palette,
  ShieldCheck,
  X,
  Minus,
  AlertCircle
} from 'lucide-react'
import logoImg from '../assets/logo.png'
import logoCinematic from '../assets/themes/logo-cinematic.png'
import logoKinetic from '../assets/themes/logo-kinetic.png'
import logoPlayful from '../assets/themes/logo-playful.png'
import logoAtmospheric from '../assets/themes/logo-atmospheric.png'
import logoCompetitive from '../assets/themes/logo-competitive.png'

const THEME_LOGOS = {
  cinematic: logoCinematic,
  kinetic: logoKinetic,
  playful: logoPlayful,
  atmospheric: logoAtmospheric,
  competitive: logoCompetitive,
}

const THEME_PRESETS = {
  cinematic: {
    name: 'Cinematic',
    accent: '#C6A56B',
    accentLight: '#E1C38B',
    accentGlow: 'rgba(198, 165, 107, 0.35)',
    accentText: '#0B0B0A',
    btnRadius: '9999px',
    btnGradient: 'linear-gradient(135deg, #E1C38B 0%, #C6A56B 100%)',
    progressGradient: 'linear-gradient(90deg, #A88647 0%, #C6A56B 50%, #E1C38B 100%)',
    cardBorder: 'rgba(198, 165, 107, 0.18)',
  },
  kinetic: {
    name: 'Kinetic',
    accent: '#F97316',
    accentLight: '#FF9B54',
    accentGlow: 'rgba(249, 115, 22, 0.38)',
    accentText: '#0B0907',
    btnRadius: '4px',
    btnGradient: 'linear-gradient(135deg, #FB923C 0%, #F97316 100%)',
    progressGradient: 'linear-gradient(90deg, #EA580C 0%, #F97316 100%)',
    cardBorder: 'rgba(249, 115, 22, 0.22)',
  },
  atmospheric: {
    name: 'Atmospheric',
    accent: '#82939A',
    accentLight: '#9AB0B9',
    accentGlow: 'rgba(130, 147, 154, 0.32)',
    accentText: '#090B0D',
    btnRadius: '8px',
    btnGradient: 'linear-gradient(135deg, #9AB0B9 0%, #82939A 100%)',
    progressGradient: 'linear-gradient(90deg, #59666C 0%, #82939A 100%)',
    cardBorder: 'rgba(130, 147, 154, 0.20)',
  },
  competitive: {
    name: 'Competitive',
    accent: '#EF4444',
    accentLight: '#FF6B6B',
    accentGlow: 'rgba(239, 68, 68, 0.38)',
    accentText: '#ffffff',
    btnRadius: '4px',
    btnGradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    progressGradient: 'linear-gradient(90deg, #991B1B 0%, #EF4444 100%)',
    cardBorder: 'rgba(239, 68, 68, 0.24)',
  },
  playful: {
    name: 'Playful',
    accent: '#D6FF4B',
    accentLight: '#E3FF8C',
    accentGlow: 'rgba(214, 255, 75, 0.32)',
    accentText: '#121703',
    btnRadius: '12px',
    btnGradient: 'linear-gradient(135deg, #E3FF8C 0%, #D6FF4B 100%)',
    progressGradient: 'linear-gradient(90deg, #A3E635 0%, #D6FF4B 100%)',
    cardBorder: 'rgba(214, 255, 75, 0.22)',
  },
}

const CAROUSEL_SLIDES = [
  {
    icon: Gauge,
    tag: 'NEW IN V1.3.7',
    title: 'Real-Time In-Game HUD',
    desc: 'Measure live FPS, 1% frame drops, GPU/CPU thermals, and memory without third-party overlays.',
    accent: '#F97316'
  },
  {
    icon: Palette,
    tag: 'THEATRICAL THEMES',
    title: '5 Dynamic Layout Presets',
    desc: 'Experience your library in Cinematic, Kinetic, Playful, Atmospheric, or Competitive styles.',
    accent: '#C6A56B'
  },
  {
    icon: ShieldCheck,
    tag: 'ZERO BLOAT',
    title: '100% Offline & Private',
    desc: 'No mandatory logins, no tracking telemetry, and zero online store ads eating background RAM.',
    accent: '#82939A'
  }
]

export function InstallerApp() {
  const [stage, setStage] = useState('setup') // 'setup' | 'installing' | 'complete'
  const [isUpdate, setIsUpdate] = useState(false)
  const [installPath, setInstallPath] = useState('')
  const [freeSpace, setFreeSpace] = useState('Calculating...')
  const [createDesktopShortcut, setCreateDesktopShortcut] = useState(true)
  const [createStartMenuShortcut, setCreateStartMenuShortcut] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('Preparing setup environment...')
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [launchOnFinish, setLaunchOnFinish] = useState(true)
  const [theme, setTheme] = useState('cinematic')

  const activeTheme = THEME_PRESETS[theme] || THEME_PRESETS.cinematic
  const activeLogo = THEME_LOGOS[theme] || logoImg

  // Auto-detect existing install, drive space, and saved user theme
  useEffect(() => {
    async function init() {
      try {
        if (window.api?.installer?.detect) {
          const res = await window.api.installer.detect()
          if (res?.theme && THEME_PRESETS[res.theme]) {
            setTheme(res.theme)
          }
          if (res?.isInstalled && res.installPath) {
            setIsUpdate(true)
            setInstallPath(res.installPath)
            checkSpace(res.installPath)
          } else {
            setIsUpdate(false)
            const defPath = res?.defaultPath || 'D:\\Games\\Logpile'
            setInstallPath(defPath)
            checkSpace(defPath)
          }
        } else {
          // Fallback in dev/standalone browser test
          setInstallPath('D:\\Games\\Logpile')
          setFreeSpace('124.5 GB')
        }
      } catch (err) {
        console.error('Failed to initialize installer detection:', err)
        setInstallPath('D:\\Games\\Logpile')
      }
    }
    init()
  }, [])

  // Auto-rotate feature slides during installation
  useEffect(() => {
    if (stage !== 'installing') return
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % CAROUSEL_SLIDES.length)
    }, 3200)
    return () => clearInterval(interval)
  }, [stage])

  // Progress listener from IPC
  useEffect(() => {
    if (!window.api?.installer?.onProgress) return
    const unbind = window.api.installer.onProgress((data) => {
      if (typeof data.progress === 'number') setProgress(data.progress)
      if (data.status) setCurrentStep(data.status)
      if (data.done) {
        setStage('complete')
      }
      if (data.error) {
        setErrorMsg(data.error)
        setStage('setup')
      }
    })
    return () => unbind()
  }, [])

  const checkSpace = async (pathToCheck) => {
    try {
      if (window.api?.installer?.getDriveSpace) {
        const space = await window.api.installer.getDriveSpace(pathToCheck)
        setFreeSpace(space?.freeGb ? `${space.freeGb} GB` : 'Available')
      }
    } catch {
      setFreeSpace('Available')
    }
  }

  const handleBrowse = async () => {
    try {
      if (window.api?.installer?.browse) {
        const chosen = await window.api.installer.browse()
        if (chosen) {
          setInstallPath(chosen)
          checkSpace(chosen)
          setErrorMsg('')
        }
      }
    } catch (err) {
      console.warn('Browse cancelled or failed:', err)
    }
  }

  const handleStartInstall = async () => {
    if (!installPath || installPath.trim() === '') {
      setErrorMsg('Please specify a valid installation folder.')
      return
    }
    setErrorMsg('')
    setStage('installing')
    setProgress(5)
    setCurrentStep('Verifying directory permissions...')

    try {
      if (window.api?.installer?.install) {
        await window.api.installer.install({
          targetPath: installPath,
          createDesktopShortcut,
          createStartMenuShortcut,
          isUpdate
        })
      } else {
        // Simulated progress for dev preview
        let p = 10
        const sim = setInterval(() => {
          p += 15
          if (p >= 100) {
            clearInterval(sim)
            setProgress(100)
            setCurrentStep('Complete!')
            setTimeout(() => setStage('complete'), 400)
          } else {
            setProgress(p)
            if (p > 75) setCurrentStep('Configuring performance telemetry...')
            else if (p > 45) setCurrentStep('Extracting application binaries...')
            else if (p > 20) setCurrentStep('Preserving local game library...')
          }
        }, 500)
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Installation encountered an issue.')
      setStage('setup')
    }
  }

  const handleFinish = async () => {
    try {
      if (launchOnFinish && window.api?.installer?.launch) {
        await window.api.installer.launch(installPath)
      } else if (window.api?.installer?.close) {
        await window.api.installer.close()
      }
    } catch (err) {
      console.error('Launch failed:', err)
      if (window.api?.installer?.close) window.api.installer.close()
    }
  }

  const handleClose = () => {
    if (window.api?.installer?.close) window.api.installer.close()
  }

  const handleMinimize = () => {
    if (window.api?.installer?.minimize) window.api.installer.minimize()
  }

  const ActiveSlideIcon = CAROUSEL_SLIDES[carouselIndex].icon

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        maxWidth: '640px',
        maxHeight: '440px',
        background: '#08090d',
        color: '#f8fafc',
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: `0 24px 64px rgba(0, 0, 0, 0.95), 0 0 40px ${activeTheme.accentGlow}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Background ambient theme glow */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '420px',
          height: '240px',
          background: `radial-gradient(circle, ${activeTheme.accentGlow} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Draggable Titlebar Header */}
      <div
        style={{
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px 0 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(10, 11, 16, 0.7)',
          backdropFilter: 'blur(12px)',
          WebkitAppRegion: 'drag',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={activeLogo} alt="Logpile" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8' }}>
            LOGPILE SETUP
          </span>
          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>v1.3.7</span>
          <span
            style={{
              fontSize: '8.5px',
              padding: '1px 6px',
              borderRadius: '4px',
              border: `1px solid ${activeTheme.accent}44`,
              background: `color-mix(in srgb, ${activeTheme.accent} 12%, transparent)`,
              color: activeTheme.accent,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}
          >
            {activeTheme.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', WebkitAppRegion: 'no-drag' }}>
          <button
            type="button"
            onClick={handleMinimize}
            style={{
              width: '28px',
              height: '24px',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={handleClose}
            style={{
              width: '28px',
              height: '24px',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#94a3b8'
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column', zIndex: 1 }}>
        {stage === 'setup' && (
          <>
            {/* Top Brand Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(17, 19, 28, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(16px)'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '14px',
                  background: 'rgba(8, 10, 15, 0.9)',
                  border: `1px solid ${activeTheme.cardBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 24px rgba(0, 0, 0, 0.5), 0 0 24px ${activeTheme.accentGlow}`
                }}
              >
                <img src={activeLogo} alt="Logpile" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>LOGPILE</h1>
                  {isUpdate ? (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: `color-mix(in srgb, ${activeTheme.accent} 15%, transparent)`,
                        border: `1px solid ${activeTheme.accent}66`,
                        color: activeTheme.accent,
                        fontSize: '9.5px',
                        fontWeight: 700,
                        letterSpacing: '0.04em'
                      }}
                    >
                      UPDATE DETECTED ({activeTheme.name.toUpperCase()})
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: `color-mix(in srgb, ${activeTheme.accent} 15%, transparent)`,
                        border: `1px solid ${activeTheme.accent}66`,
                        color: activeTheme.accent,
                        fontSize: '9.5px',
                        fontWeight: 700,
                        letterSpacing: '0.04em'
                      }}
                    >
                      FRESH INSTALL
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                  {isUpdate
                    ? `Existing Logpile installation detected with ${activeTheme.name} theme. We will upgrade the binaries while keeping all your game saves, library data, and artwork 100% intact.`
                    : 'The offline-first game launcher. Consolidate your Steam, Epic, GOG, and custom titles with real-time FPS telemetry.'}
                </p>
              </div>
            </div>

            {/* Folder Selection & Options */}
            <div style={{ marginTop: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#94a3b8',
                    marginBottom: '6px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}
                >
                  {isUpdate ? 'Target Installation Directory' : 'Install Location (Pick Any Drive)'}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0 12px',
                      height: '38px',
                      borderRadius: '8px',
                      background: 'rgba(15, 17, 24, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  >
                    <Folder size={15} color={activeTheme.accent} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {installPath}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBrowse}
                    style={{
                      padding: '0 16px',
                      height: '38px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                  >
                    Browse...
                  </button>
                </div>

                {/* Drive Space Telemetry */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '6px',
                    fontSize: '11px',
                    color: '#64748b'
                  }}
                >
                  <HardDrive size={13} />
                  <span>Required: ~380 MB</span>
                  <span>•</span>
                  <span>Free Space on Drive: <strong style={{ color: '#94a3b8' }}>{freeSpace}</strong></span>
                </div>
              </div>

              {/* Shortcuts Selection */}
              <div style={{ display: 'flex', gap: '20px', marginTop: '2px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={createDesktopShortcut}
                    onChange={(e) => setCreateDesktopShortcut(e.target.checked)}
                    style={{ accentColor: activeTheme.accent, width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  <span>Create Desktop Shortcut</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={createStartMenuShortcut}
                    onChange={(e) => setCreateStartMenuShortcut(e.target.checked)}
                    style={{ accentColor: activeTheme.accent, width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  <span>Add to Start Menu</span>
                </label>
              </div>

              {errorMsg && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#f87171',
                    fontSize: '11px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '6px 10px',
                    borderRadius: '6px'
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Open-Source MIT License • Zero Accounts Required
              </div>

              <button
                type="button"
                onClick={handleStartInstall}
                style={{
                  height: '42px',
                  padding: '0 28px',
                  borderRadius: activeTheme.btnRadius,
                  background: activeTheme.btnGradient,
                  color: activeTheme.accentText,
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: `0 4px 20px ${activeTheme.accentGlow}, inset 0 1px 1px rgba(255, 255, 255, 0.5)`,
                  transition: 'all 0.18s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)'
                  e.currentTarget.style.boxShadow = `0 6px 26px ${activeTheme.accentGlow}, inset 0 1px 1px rgba(255, 255, 255, 0.6)`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = `0 4px 20px ${activeTheme.accentGlow}, inset 0 1px 1px rgba(255, 255, 255, 0.5)`
                }}
              >
                {isUpdate ? 'UPDATE LOGPILE NOW' : 'INSTALL LOGPILE'}
              </button>
            </div>
          </>
        )}

        {stage === 'installing' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '12px 0 6px'
            }}
          >
            {/* Feature Slide Carousel */}
            <div
              style={{
                flex: 1,
                borderRadius: '14px',
                background: 'rgba(15, 17, 24, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '16px',
                  background: 'rgba(8, 10, 15, 0.8)',
                  border: `1px solid ${CAROUSEL_SLIDES[carouselIndex].accent}44`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 28px rgba(0, 0, 0, 0.6), 0 0 20px ${CAROUSEL_SLIDES[carouselIndex].accent}33`
                }}
              >
                <ActiveSlideIcon size={36} color={CAROUSEL_SLIDES[carouselIndex].accent} />
              </div>

              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    color: CAROUSEL_SLIDES[carouselIndex].accent
                  }}
                >
                  {CAROUSEL_SLIDES[carouselIndex].tag}
                </span>
                <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '4px 0 6px', color: '#f8fafc' }}>
                  {CAROUSEL_SLIDES[carouselIndex].title}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.45, maxWidth: '380px' }}>
                  {CAROUSEL_SLIDES[carouselIndex].desc}
                </p>
              </div>

              {/* Dot Indicators */}
              <div style={{ position: 'absolute', bottom: '12px', right: '16px', display: 'flex', gap: '5px' }}>
                {CAROUSEL_SLIDES.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: idx === carouselIndex ? '16px' : '6px',
                      height: '6px',
                      borderRadius: '9999px',
                      background: idx === carouselIndex ? activeTheme.accent : 'rgba(255, 255, 255, 0.2)',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Progress Bar & Status */}
            <div style={{ marginTop: '22px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '8px'
                }}
              >
                <span style={{ color: '#cbd5e1' }}>{currentStep}</span>
                <span style={{ color: activeTheme.accent, fontWeight: 800 }}>{progress}%</span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: activeTheme.progressGradient,
                    borderRadius: '9999px',
                    boxShadow: `0 0 14px ${activeTheme.accentGlow}`,
                    transition: 'width 0.25s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Preserving user configurations, database indexes, and custom artwork
                </span>
              </div>
            </div>
          </div>
        )}

        {stage === 'complete' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '16px 20px'
            }}
          >
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: `color-mix(in srgb, ${activeTheme.accent} 15%, transparent)`,
                border: `2px solid ${activeTheme.accent}66`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: `0 0 35px ${activeTheme.accentGlow}`
              }}
            >
              <CheckCircle2 size={44} color={activeTheme.accent} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px', color: '#f8fafc' }}>
              Logpile is Ready to Play!
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#94a3b8', maxWidth: '420px', lineHeight: 1.4 }}>
              {isUpdate
                ? `Upgrade to v1.3.7 completed successfully. All your games, settings, and ${activeTheme.name} theme are intact.`
                : 'Installation completed successfully. Your desktop shortcut and performance monitors are configured.'}
            </p>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                color: '#cbd5e1',
                cursor: 'pointer',
                marginBottom: '24px'
              }}
            >
              <input
                type="checkbox"
                checked={launchOnFinish}
                onChange={(e) => setLaunchOnFinish(e.target.checked)}
                style={{ accentColor: activeTheme.accent, width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <span>Launch Logpile now</span>
            </label>

            <button
              type="button"
              onClick={handleFinish}
              style={{
                height: '46px',
                padding: '0 36px',
                borderRadius: activeTheme.btnRadius,
                background: activeTheme.btnGradient,
                color: activeTheme.accentText,
                fontSize: '13.5px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 6px 26px ${activeTheme.accentGlow}, inset 0 1px 1px rgba(255, 255, 255, 0.5)`,
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)'
                e.currentTarget.style.boxShadow = `0 8px 32px ${activeTheme.accentGlow}, inset 0 1px 1px rgba(255, 255, 255, 0.6)`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = `0 6px 26px ${activeTheme.accentGlow}, inset 0 1px 1px rgba(255, 255, 255, 0.5)`
              }}
            >
              LAUNCH LOGPILE
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
