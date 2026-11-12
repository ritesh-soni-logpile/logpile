import { useEffect, useRef, useState } from 'react'

/**
 * 100% Offline Gamepad Controller Hook for Logpile
 * Reads directly from Chromium's local OS HID drivers via standard navigator.getGamepads().
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

  const lastNavTimeRef = useRef(0)
  const lastButtonStatesRef = useRef({})
  const animFrameRef = useRef(null)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !navigator.getGamepads) {
      return
    }

    const handleConnected = (e) => {
      const gp = e.gamepad
      const cleanName = gp.id.replace(/\([^)]*\)/g, '').replace(/vendor.*product.*/i, '').trim() || 'Gamepad'
      setConnectedGamepad(cleanName)
      setIsGamepadMode(true)
      callbacksRef.current.onStatusChange?.(`🎮 ${cleanName} connected`)
    }

    const handleDisconnected = () => {
      setConnectedGamepad(null)
      callbacksRef.current.onStatusChange?.('🎮 Gamepad disconnected')
    }

    const handleMouseMove = () => {
      if (isGamepadMode) {
        setIsGamepadMode(false)
        document.body.classList.remove('user-is-gamepad')
      }
    }

    window.addEventListener('gamepadconnected', handleConnected)
    window.addEventListener('gamepaddisconnected', handleDisconnected)
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current)
          animFrameRef.current = null
        }
      } else if (!animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(pollLoop)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Check if a gamepad was already plugged in before mount
    const existing = navigator.getGamepads()
    if (existing && existing[0]) {
      const cleanName = existing[0].id.replace(/\([^)]*\)/g, '').replace(/vendor.*product.*/i, '').trim() || 'Gamepad'
      setConnectedGamepad(cleanName)
    }

    const DEADZONE = 0.4
    const REPEAT_DELAY_MS = 180

    const pollLoop = (timestamp) => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
      const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3]

      if (gp && gp.connected) {
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
          if (!isGamepadMode) {
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

        BUTTON_MAP.forEach(({ index, code }) => {
          const isPressed = Boolean(gp.buttons[index]?.pressed)
          const wasPressed = Boolean(lastButtonStatesRef.current[index])

          if (isPressed && !wasPressed) {
            if (!isGamepadMode) {
              setIsGamepadMode(true)
              document.body.classList.add('user-is-gamepad')
            }
            callbacksRef.current.onAction?.(code)
          }
          lastButtonStatesRef.current[index] = isPressed
        })
      }

      animFrameRef.current = requestAnimationFrame(pollLoop)
    }

    animFrameRef.current = requestAnimationFrame(pollLoop)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('gamepadconnected', handleConnected)
      window.removeEventListener('gamepaddisconnected', handleDisconnected)
      window.removeEventListener('mousemove', handleMouseMove)
      document.body.classList.remove('user-is-gamepad')
    }
  }, [enabled, isGamepadMode])

  return { connectedGamepad, isGamepadMode }
}
