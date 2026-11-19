import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * 100% Offline Gamepad Controller Hook for Logpile
 * Dual-tier detection:
 * 1. Native Windows OS PnP Hardware Engine (via Electron IPC system:getConnectedGamepads)
 *    Detects controllers immediately upon physical USB connection or Bluetooth pairing
 *    WITHOUT waiting for a button press or user gesture (matching Steam behavior).
 * 2. Chromium / Web Gamepad API (navigator.getGamepads)
 *    Reads real-time axes, D-Pad, and button triggers with zero latency.
 * Zero network requests. Zero telemetry. Zero external packages.
 */
export function useGamepad({
  enabled = true,
  onNavigate,
  onAction,
  onStatusChange,
}) {
  const [connectedGamepad, setConnectedGamepad] = useState(null)
  const [isGamepadMode, setIsGamepadMode] = useState(false)

  const callbacksRef = useRef({ onNavigate, onAction, onStatusChange })
  callbacksRef.current = { onNavigate, onAction, onStatusChange }

  const connectedGamepadRef = useRef(null)
  const isGamepadModeRef = useRef(false)
  const lastReportedRef = useRef(null)

  const lastNavTimeRef = useRef(0)
  const lastButtonStatesRef = useRef({})
  const animFrameRef = useRef(null)

  const checkNativeGamepads = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.api?.system?.getConnectedGamepads) {
        const res = await window.api.system.getConnectedGamepads()
        if (res && res.connected && res.name) {
          if (connectedGamepadRef.current !== res.name) {
            connectedGamepadRef.current = res.name
            setConnectedGamepad(res.name)
            if (lastReportedRef.current !== res.name) {
              lastReportedRef.current = res.name
              callbacksRef.current.onStatusChange?.(`🎮 ${res.name} connected`)
            }
          }
          return true
        } else if (res && !res.connected) {
          // Verify if Web Gamepad API also has no active gamepads before clearing
          const webGps = navigator.getGamepads ? navigator.getGamepads() : []
          const hasActiveWeb = Boolean(webGps[0] || webGps[1] || webGps[2] || webGps[3])
          if (!hasActiveWeb && connectedGamepadRef.current) {
            connectedGamepadRef.current = null
            setConnectedGamepad(null)
            if (lastReportedRef.current) {
              lastReportedRef.current = null
              callbacksRef.current.onStatusChange?.('🎮 Gamepad disconnected')
            }
          }
          return false
        }
      }
    } catch {
      // Gracefully ignore in non-Electron environments
    }
    return false
  }, [])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    // 1. Immediate Native OS query on mount (instant detection like Steam)
    checkNativeGamepads()

    // 2. Check if Chromium Web Gamepad API already has an active controller
    if (navigator.getGamepads) {
      try {
        const existing = navigator.getGamepads()
        const gp0 = existing[0] || existing[1] || existing[2] || existing[3]
        if (gp0 && gp0.connected) {
          const cleanName = gp0.id.replace(/\([^)]*\)/g, '').replace(/vendor.*product.*/i, '').trim() || 'Gamepad'
          connectedGamepadRef.current = cleanName
          setConnectedGamepad(cleanName)
        }
      } catch {}
    }

    let isPolling = false
    const startPolling = () => {
      if (isPolling) return
      isPolling = true
      if (!animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(pollLoop)
      }
    }

    const stopPolling = () => {
      isPolling = false
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }

    const handleConnected = (e) => {
      const gp = e.gamepad
      const cleanName = gp.id.replace(/\([^)]*\)/g, '').replace(/vendor.*product.*/i, '').trim() || 'Gamepad'
      connectedGamepadRef.current = cleanName
      setConnectedGamepad(cleanName)
      if (!isGamepadModeRef.current) {
        isGamepadModeRef.current = true
        setIsGamepadMode(true)
      }
      if (lastReportedRef.current !== cleanName) {
        lastReportedRef.current = cleanName
        callbacksRef.current.onStatusChange?.(`🎮 ${cleanName} connected`)
      }
      startPolling()
    }

    const handleDisconnected = () => {
      checkNativeGamepads().then((stillConnected) => {
        if (!stillConnected) {
          connectedGamepadRef.current = null
          setConnectedGamepad(null)
          stopPolling()
          if (lastReportedRef.current) {
            lastReportedRef.current = null
            callbacksRef.current.onStatusChange?.('🎮 Gamepad disconnected')
          }
        }
      })
    }

    const handleMouseMove = () => {
      if (isGamepadModeRef.current) {
        isGamepadModeRef.current = false
        setIsGamepadMode(false)
        document.body.classList.remove('user-is-gamepad')
      }
    }

    const handleWindowFocus = () => {
      checkNativeGamepads().then((hasGamepad) => {
        if (hasGamepad) startPolling()
      })
    }

    window.addEventListener('gamepadconnected', handleConnected)
    window.addEventListener('gamepaddisconnected', handleDisconnected)
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('focus', handleWindowFocus)

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        if (connectedGamepadRef.current) {
          startPolling()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const DEADZONE = 0.4
    const REPEAT_DELAY_MS = 180

    const BUTTON_MAP = [
      { index: 0, code: 'A' },     // A / Cross
      { index: 1, code: 'B' },     // B / Circle
      { index: 2, code: 'X' },     // X / Square
      { index: 3, code: 'Y' },     // Y / Triangle
      { index: 4, code: 'LB' },    // Left Bumper
      { index: 5, code: 'RB' },    // Right Bumper
      { index: 8, code: 'SELECT' },// Select / View
      { index: 9, code: 'START' }, // Start / Menu
      { index: 10, code: 'L3' },   // Left Stick Click
      { index: 11, code: 'R3' },   // Right Stick Click / Push-to-Talk
      { index: 16, code: 'GUIDE' },// Home / Xbox / PS button
    ]

    const pollLoop = (timestamp) => {
      if (!isPolling) return
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
      const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3]

      if (gp && gp.connected) {
        // Ensure connectedGamepad is set if Web API just woke up
        if (!connectedGamepadRef.current) {
          const cleanName = gp.id.replace(/\([^)]*\)/g, '').replace(/vendor.*product.*/i, '').trim() || 'Gamepad'
          connectedGamepadRef.current = cleanName
          setConnectedGamepad(cleanName)
          if (lastReportedRef.current !== cleanName) {
            lastReportedRef.current = cleanName
            callbacksRef.current.onStatusChange?.(`🎮 ${cleanName} connected`)
          }
        }

        // 1. Check directional input (D-Pad buttons or Left Analog Stick)
        const dpadUp = gp.buttons[12]?.pressed
        const dpadDown = gp.buttons[13]?.pressed
        const dpadLeft = gp.buttons[14]?.pressed
        const dpadRight = gp.buttons[15]?.pressed

        const stickX = gp.axes[0] || 0
        const stickY = gp.axes[1] || 0

        const isUp = dpadUp || stickY < -DEADZONE
        const isDown = dpadDown || stickY > DEADZONE
        const isLeft = dpadLeft || stickX < -DEADZONE
        const isRight = dpadRight || stickX > DEADZONE

        if (isUp || isDown || isLeft || isRight) {
          if (!isGamepadModeRef.current) {
            isGamepadModeRef.current = true
            setIsGamepadMode(true)
            document.body.classList.add('user-is-gamepad')
          }

          if (timestamp - lastNavTimeRef.current > REPEAT_DELAY_MS) {
            lastNavTimeRef.current = timestamp
            if (isUp) callbacksRef.current.onNavigate?.('up')
            else if (isDown) callbacksRef.current.onNavigate?.('down')
            else if (isLeft) callbacksRef.current.onNavigate?.('left')
            else if (isRight) callbacksRef.current.onNavigate?.('right')
          }
        }

        // 2. Button checks with single-trigger edge detection
        BUTTON_MAP.forEach(({ index, code }) => {
          const isPressed = Boolean(gp.buttons[index]?.pressed)
          const wasPressed = Boolean(lastButtonStatesRef.current[index])

          if (isPressed && !wasPressed) {
            if (!isGamepadModeRef.current) {
              isGamepadModeRef.current = true
              setIsGamepadMode(true)
              document.body.classList.add('user-is-gamepad')
            }
            callbacksRef.current.onAction?.(code)
          }
          lastButtonStatesRef.current[index] = isPressed
        })

        // Continue loop while gamepad is connected
        animFrameRef.current = requestAnimationFrame(pollLoop)
      } else {
        // No connected gamepad found, stop polling until next connection event
        stopPolling()
      }
    }

    // Only start polling if an active gamepad was already detected
    if (connectedGamepadRef.current) {
      startPolling()
    }

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('gamepadconnected', handleConnected)
      window.removeEventListener('gamepaddisconnected', handleDisconnected)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('focus', handleWindowFocus)
      document.body.classList.remove('user-is-gamepad')
    }
  }, [enabled, checkNativeGamepads])

  return {
    connectedGamepad,
    isGamepadMode,
    refreshGamepads: checkNativeGamepads,
  }
}
