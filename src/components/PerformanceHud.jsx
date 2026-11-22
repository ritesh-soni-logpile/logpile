import React, { useRef, useEffect, useState } from 'react'
import {
  Flame, Droplets, HeartPulse, Eye, Skull, Activity, Gauge, Zap,
  Compass, Crosshair, Shield, Battery, Clock, Cpu, HardDrive, Radio,
  Terminal, Award, Waves, Orbit, Sparkles, Sliders, Disc, Sword, Feather
} from 'lucide-react'
import { getCustomThemes } from '../utils/themeAddons'

/* ==========================================================================
   LIVE REAL TELEMETRY HOOK (RAF Framerate, Frametime & Hardware IPC)
   ========================================================================== */

export function formatSystemClock(date, is24Hour) {
  const d = date instanceof Date ? date : new Date(date || Date.now())
  const mins = String(d.getMinutes()).padStart(2, '0')
  if (is24Hour) {
    const hours = String(d.getHours()).padStart(2, '0')
    return `${hours}:${mins}`
  }
  let hours = d.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${mins} ${ampm}`
}

export function useLiveTelemetry(enabled = true) {
  const [telemetry, setTelemetry] = useState({
    fps: 144,
    onePercentLow: 122,
    frametime: 6.9,
    hasGpu: true,
    gpuUsage: null,
    gpuTemp: null,
    gpuClock: null,
    gpuPower: null,
    vramUsedGb: null,
    vramTotalGb: null,
    cpuUsage: 12,
    cpuClock: null,
    cpuTemp: null,
    gpuBusyMs: null,
    isGpuBound: true,
    isEtwActive: false,
    ramUsedGb: 14.1,
    ramTotalGb: 31.8,
    ramPercent: 44,
    hasBattery: false,
    batteryPercent: null,
    batteryCharging: false,
    is24Hour: false,
    clock: formatSystemClock(new Date(), false),
  })

  useEffect(() => {
    if (!enabled) return

    // 1. Fetch initial hardware stats if available
    window.api?.hardware?.getMetrics?.().then((data) => {
      if (data) {
        setTelemetry((prev) => {
          const is24Hour = data.is24Hour !== undefined ? data.is24Hour : prev.is24Hour
          const nextHasBattery = data.hasBattery !== undefined ? Boolean(data.hasBattery) : prev.hasBattery
          const nextHasGpu = data.hasGpu !== undefined ? Boolean(data.hasGpu) : prev.hasGpu
          return {
            ...prev,
            hasGpu: nextHasGpu,
            hasBattery: nextHasBattery,
            cpuUsage: data.cpuUsage ?? prev.cpuUsage,
            cpuClock: data.cpuClock ?? prev.cpuClock,
            cpuTemp: data.cpuTemp ?? prev.cpuTemp,
            ramPercent: data.ramUsage ?? prev.ramPercent,
            ramUsedGb: data.ramUsedGb ?? prev.ramUsedGb,
            ramTotalGb: data.ramTotalGb ?? prev.ramTotalGb,
            gpuUsage: data.gpuUsage ?? prev.gpuUsage,
            gpuTemp: data.gpuTemp ?? prev.gpuTemp,
            gpuClock: data.gpuClock ?? prev.gpuClock,
            gpuPower: data.gpuPower ?? prev.gpuPower,
            vramUsedGb: data.vramUsedGb ?? prev.vramUsedGb,
            vramTotalGb: data.vramTotalGb ?? prev.vramTotalGb,
            gpuBusyMs: data.gpuBusyMs ?? prev.gpuBusyMs,
            isGpuBound: data.isGpuBound !== undefined ? data.isGpuBound : prev.isGpuBound,
            isEtwActive: data.isEtwActive !== undefined ? data.isEtwActive : prev.isEtwActive,
            fps: (data.isEtwActive && data.fps) ? data.fps : prev.fps,
            onePercentLow: (data.isEtwActive && data.onePercentLow) ? data.onePercentLow : prev.onePercentLow,
            frametime: (data.isEtwActive && data.frametime) ? data.frametime : prev.frametime,
            is24Hour,
            clock: formatSystemClock(new Date(), is24Hour),
          }
        })
      }
    }).catch(() => {})

    // 2. Hardware metrics from Electron main thread
    const unsub = window.api?.hardware?.onTelemetry?.((data) => {
      if (data) {
        setTelemetry((prev) => {
          const is24Hour = data.is24Hour !== undefined ? data.is24Hour : prev.is24Hour
          const nextHasBattery = data.hasBattery !== undefined ? Boolean(data.hasBattery) : prev.hasBattery
          const nextHasGpu = data.hasGpu !== undefined ? Boolean(data.hasGpu) : prev.hasGpu
          return {
            ...prev,
            hasGpu: nextHasGpu,
            hasBattery: nextHasBattery,
            cpuUsage: data.cpuUsage ?? prev.cpuUsage,
            cpuClock: data.cpuClock ?? prev.cpuClock,
            cpuTemp: data.cpuTemp ?? prev.cpuTemp,
            ramPercent: data.ramUsage ?? prev.ramPercent,
            ramUsedGb: data.ramUsedGb ?? prev.ramUsedGb,
            ramTotalGb: data.ramTotalGb ?? prev.ramTotalGb,
            gpuUsage: data.gpuUsage ?? prev.gpuUsage,
            gpuTemp: data.gpuTemp ?? prev.gpuTemp,
            gpuClock: data.gpuClock ?? prev.gpuClock,
            gpuPower: data.gpuPower ?? prev.gpuPower,
            vramUsedGb: data.vramUsedGb ?? prev.vramUsedGb,
            vramTotalGb: data.vramTotalGb ?? prev.vramTotalGb,
            gpuBusyMs: data.gpuBusyMs ?? prev.gpuBusyMs,
            isGpuBound: data.isGpuBound !== undefined ? data.isGpuBound : prev.isGpuBound,
            isEtwActive: data.isEtwActive !== undefined ? data.isEtwActive : prev.isEtwActive,
            fps: (data.isEtwActive && data.fps) ? data.fps : prev.fps,
            onePercentLow: (data.isEtwActive && data.onePercentLow) ? data.onePercentLow : prev.onePercentLow,
            frametime: (data.isEtwActive && data.frametime) ? data.frametime : prev.frametime,
            is24Hour,
            clock: formatSystemClock(new Date(), is24Hour),
          }
        })
      }
    })

    // 3. Real system battery status via Web API (only active if physical battery exists)
    if (typeof navigator !== 'undefined' && navigator.getBattery) {
      navigator.getBattery().then((bat) => {
        const updateBat = () => {
          const pct = Math.round(bat.level * 100)
          setTelemetry((prev) => {
            if (!prev.hasBattery) return prev
            return {
              ...prev,
              batteryPercent: pct,
              batteryCharging: Boolean(bat.charging),
            }
          })
        }
        updateBat()
        bat.addEventListener('levelchange', updateBat)
        bat.addEventListener('chargingchange', updateBat)
      }).catch(() => {})
    }

    // 4. Clean 180ms cadence (~5.5 Hz) telemetry loop:
    let frameCount = 0
    let windowStart = performance.now()
    let lastFrameTime = windowStart
    const deltas = []
    let animId = null

    const tick = (now) => {
      const delta = now - lastFrameTime
      lastFrameTime = now
      if (delta > 0 && delta < 500) {
        deltas.push(delta)
      }
      frameCount++

      const elapsed = now - windowStart
      if (elapsed >= 180) {
        const measuredFps = Math.max(1, Math.round((frameCount * 1000) / elapsed))
        const avgFrametime = Number((elapsed / frameCount).toFixed(1))

        let trueOneLow = Math.max(1, Math.round(measuredFps * 0.92))
        if (deltas.length >= 4) {
          const sorted = [...deltas].sort((a, b) => b - a)
          const slowest = sorted[0] || (elapsed / frameCount)
          if (slowest > 0) {
            trueOneLow = Math.max(1, Math.min(measuredFps, Math.round(1000 / slowest)))
          }
        }

        frameCount = 0
        windowStart = now
        deltas.length = 0

        setTelemetry((prev) => {
          const nextClock = formatSystemClock(new Date(), prev.is24Hour)
          // If Intel PresentMon ETW is actively streaming in-game framerate, maintain it
          if (prev.isEtwActive) {
            if (prev.clock === nextClock) return prev
            return { ...prev, clock: nextClock }
          }
          // In live HUD, if ETW is not active, do NOT invent fake 200 FPS from Chromium's internal window RAF!
          if (prev.fps === null && prev.clock === nextClock) return prev
          return {
            ...prev,
            fps: null,
            frametime: null,
            onePercentLow: null,
            clock: nextClock,
          }
        })
      }

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)

    return () => {
      unsub?.()
      if (animId) cancelAnimationFrame(animId)
    }
  }, [enabled])

  return telemetry
}

/* ==========================================================================
   PURE HARDWARE-ACCELERATED CSS MICRO-LAYERS (0.0% CPU, 0.0% GPU CANVAS COST)
   Pure compositor-driven CSS keyframes: Zero requestAnimationFrame, Zero GC,
   Zero 2D Canvas redraws, Zero DWM surface recomp.
   ========================================================================== */

function CssBonfireGlow() {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      borderBottom: '2px solid rgba(249, 115, 22, 0.75)'
    }} />
  )
}

function CssNeonRain() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <span style={{
        position: 'absolute', top: '-10px', left: '25%', width: '1px', height: '12px',
        background: 'linear-gradient(180deg, transparent, rgba(56, 189, 248, 0.45))',
        transform: 'rotate(15deg)'
      }} />
      <span style={{
        position: 'absolute', top: '-10px', left: '60%', width: '1px', height: '14px',
        background: 'linear-gradient(180deg, transparent, rgba(56, 189, 248, 0.5))',
        transform: 'rotate(15deg)'
      }} />
      <span style={{
        position: 'absolute', top: '-10px', left: '85%', width: '1px', height: '10px',
        background: 'linear-gradient(180deg, transparent, rgba(56, 189, 248, 0.4))',
        transform: 'rotate(15deg)'
      }} />
      <span style={{
        position: 'absolute', top: '4px', left: '42%', width: '2px', height: '3px',
        borderRadius: '50%', background: 'rgba(186, 230, 253, 0.65)'
      }} />
      <span style={{
        position: 'absolute', top: '3px', left: '76%', width: '2px', height: '2.5px',
        borderRadius: '50%', background: 'rgba(186, 230, 253, 0.55)'
      }} />
    </div>
  )
}

/* ==========================================================================
   METRIC ROW / PILL ITEM RENDERER (Adaptive Horizontal & Vertical)
   ========================================================================== */

function MetricRow({ label, value, color = '#38bdf8', labelColor, isVertical }) {
  if (isVertical) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        fontSize: '10px',
        whiteSpace: 'nowrap',
        width: '100%',
        lineHeight: 1
      }}>
        {label && <span style={{ opacity: 0.65, fontSize: '9px', fontWeight: 600, color: labelColor || 'inherit', letterSpacing: '0.03em' }}>{label}</span>}
        <strong style={{ color, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '10.5px' }}>{value}</strong>
      </div>
    )
  }

  // Stable horizontal fixed-width metric cell to prevent resizing/jiggling every second:
  const getMinWidth = (lbl) => {
    switch (lbl) {
      case '1%L': return '24px'
      case 'TIME': return '36px'
      case 'GPU-LIM':
      case 'CPU-LIM': return '38px'
      case 'GPU': return '28px'
      case 'G-TEMP': return '32px'
      case 'G-CLK': return '38px'
      case 'VRAM': return '32px'
      case 'CPU': return '28px'
      case 'C-CLK': return '38px'
      case 'C-TEMP': return '32px'
      case 'RAM': return '36px'
      default: return '24px'
    }
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      whiteSpace: 'nowrap',
      lineHeight: 1.15
    }}>
      {label && (
        <span style={{
          opacity: 0.65,
          fontSize: '9px',
          fontWeight: 600,
          color: labelColor || 'inherit',
          letterSpacing: '0.03em',
          lineHeight: 1.15
        }}>
          {label}:
        </span>
      )}
      <strong style={{
        color,
        fontSize: '11px',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        display: 'inline-block',
        minWidth: getMinWidth(label),
        textAlign: 'right',
        lineHeight: 1.15
      }}>
        {value}
      </strong>
    </div>
  )
}

/* ==========================================================================
   MAIN PERFORMANCE HUD COMPONENT - ADAPTIVE HORIZONTAL & VERTICAL
   ========================================================================== */

export function PerformanceHud({ style = 'blood-moon', metrics = {}, orientation = 'horizontal', telemetry = null, customThemeObject = null }) {
  const isVertical = orientation === 'vertical'
  const live = useLiveTelemetry(!telemetry)
  const data = telemetry || live

  const hasFps = metrics.fps !== false
  const has1Percent = Boolean(metrics.onePercentLow) && data.onePercentLow !== null && data.onePercentLow !== undefined
  const hasFrametime = Boolean(metrics.frametime) && data.frametime !== null && data.frametime !== undefined
  const hasBottleneck = Boolean(metrics.bottleneck) && (data.gpuBusyMs !== null && data.gpuBusyMs !== undefined)
  const hasGpu = Boolean(metrics.gpu) && (data.hasGpu !== false) && (data.gpuUsage !== null && data.gpuUsage !== undefined)
  const hasGpuTemp = Boolean(metrics.gpuTemp) && (data.gpuTemp !== null && data.gpuTemp !== undefined)
  const hasGpuClock = Boolean(metrics.gpuClock) && (data.gpuClock !== null && data.gpuClock !== undefined)
  const hasVram = Boolean(metrics.vram) && (data.vramUsedGb !== null && data.vramUsedGb !== undefined)
  const hasCpu = Boolean(metrics.cpu)
  const hasCpuClock = Boolean(metrics.cpuClock) && (data.cpuClock !== null && data.cpuClock !== undefined)
  const hasHwinfoCpuTemp = Boolean(metrics.hwinfoCpuTemp) && (data.cpuTemp !== null && data.cpuTemp !== undefined)
  const hasRam = Boolean(metrics.ram)
  const hasClock = Boolean(metrics.clock)
  const hasBattery = Boolean(metrics.battery) && (data.hasBattery === true) && (data.batteryPercent !== null && data.batteryPercent !== undefined)

  const activeMetricsCount = (has1Percent ? 1 : 0) + (hasFrametime ? 1 : 0) + (hasBottleneck ? 1 : 0) + (hasGpu ? 1 : 0) + (hasGpuTemp ? 1 : 0) + (hasGpuClock ? 1 : 0) + (hasVram ? 1 : 0) + (hasCpu ? 1 : 0) + (hasCpuClock ? 1 : 0) + (hasHwinfoCpuTemp ? 1 : 0) + (hasRam ? 1 : 0) + (hasClock ? 1 : 0) + (hasBattery ? 1 : 0);
  const isMultiRow = !isVertical && activeMetricsCount >= 7;

  // Secondary metrics helper (Adaptive: inline row horizontally, stacked column vertically, dual-row when dense)
  const renderExtraMetrics = (primaryColor = '#38bdf8', labelColor = null, dividerColor = null) => {
    const items = []
    if (has1Percent) items.push(<MetricRow key="1p" label="1%L" value={data.onePercentLow} color={primaryColor} labelColor={labelColor} isVertical={isVertical} />)
    if (hasFrametime) items.push(<MetricRow key="ft" label="TIME" value={`${data.frametime}ms`} color={primaryColor} labelColor={labelColor} isVertical={isVertical} />)
    if (hasBottleneck) items.push(<MetricRow key="bn" label={data.isGpuBound ? "GPU-LIM" : "CPU-LIM"} value={`${data.gpuBusyMs}ms`} color={data.isGpuBound ? primaryColor : '#f59e0b'} labelColor={labelColor} isVertical={isVertical} />)
    if (hasGpu) items.push(<MetricRow key="gpu" label="GPU" value={`${data.gpuUsage}%`} color={primaryColor} labelColor={labelColor} isVertical={isVertical} />)
    if (hasGpuTemp) items.push(<MetricRow key="gt" label="G-TEMP" value={`${data.gpuTemp}°C`} color={primaryColor} labelColor={labelColor} isVertical={isVertical} />)
    if (hasGpuClock) items.push(<MetricRow key="gc" label="G-CLK" value={`${data.gpuClock}M`} color={primaryColor} labelColor={labelColor} isVertical={isVertical} />)
    if (hasVram) items.push(<MetricRow key="vram" label="VRAM" value={`${data.vramUsedGb}G`} color={primaryColor} labelColor={labelColor} isVertical={isVertical} />)
    if (hasCpu) items.push(<MetricRow key="cpu" label="CPU" value={`${data.cpuUsage}%`} color={primaryColor} labelColor={labelColor} isVertical={isVertical} />)
    if (hasCpuClock) items.push(<MetricRow key="cc" label="C-CLK" value={`${data.cpuClock}M`} color={primaryColor} labelColor={labelColor} isVertical={isVertical} />)
    if (hasHwinfoCpuTemp) items.push(<MetricRow key="ct" label="C-TEMP" value={`${data.cpuTemp}°C`} color={primaryColor} labelColor={labelColor} isVertical={isVertical} />)
    if (hasRam) items.push(<MetricRow key="ram" label="RAM" value={`${data.ramUsedGb}G`} color={primaryColor} labelColor={labelColor} isVertical={isVertical} />)
    if (hasClock) {
      if (isVertical) {
        items.push(
          <div key="clk" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '10px', color: labelColor || primaryColor, whiteSpace: 'nowrap', width: '100%', lineHeight: 1 }}>
            <span style={{ opacity: 0.7, fontSize: '9px', fontWeight: 600, letterSpacing: '0.03em' }}>CLK</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '10.5px', fontWeight: 700 }}>{data.clock}</span>
          </div>
        )
      } else {
        items.push(
          <span key="clk" style={{
            opacity: 0.85,
            fontSize: '11px',
            fontWeight: 600,
            color: labelColor || primaryColor,
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
            display: 'inline-flex',
            alignItems: 'center',
            lineHeight: 1,
            minWidth: data.is24Hour ? '38px' : '56px',
            justifyContent: 'center'
          }}>
            {data.clock}
          </span>
        )
      }
    }
    if (hasBattery) {
      if (isVertical) {
        items.push(
          <div key="bat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '10px', color: primaryColor, whiteSpace: 'nowrap', width: '100%', lineHeight: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', lineHeight: 1 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '12px', height: '12px', flexShrink: 0 }}>
                {data.batteryCharging ? (
                  <Zap size={10} style={{ color: primaryColor, fill: primaryColor, flexShrink: 0 }} />
                ) : (
                  <Battery size={11} style={{ color: primaryColor, flexShrink: 0 }} />
                )}
              </span>
              <span style={{ opacity: 0.7, fontSize: '9px', fontWeight: 600, letterSpacing: '0.03em' }}>BAT</span>
            </div>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '10.5px', fontWeight: 700 }}>{data.batteryPercent ?? 100}%</span>
          </div>
        )
      } else {
        items.push(
          <div key="bat" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '10.5px',
            fontWeight: 600,
            color: primaryColor,
            whiteSpace: 'nowrap',
            lineHeight: 1
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '12px',
              height: '12px',
              flexShrink: 0,
              lineHeight: 1
            }}>
              {data.batteryCharging ? (
                <Zap size={10} style={{ color: primaryColor, fill: primaryColor, flexShrink: 0 }} />
              ) : (
                <Battery size={11} style={{ color: primaryColor, flexShrink: 0 }} />
              )}
            </span>
            <strong style={{
              fontSize: '11px',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              display: 'inline-block',
              minWidth: '30px',
              textAlign: 'right',
              lineHeight: 1
            }}>
              {data.batteryPercent ?? 100}%
            </strong>
          </div>
        )
      }
    }
    if (items.length === 0) return null

    const divColor = dividerColor || (labelColor ? labelColor : 'rgba(255, 255, 255, 0.25)')

    if (isVertical) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          width: '100%',
          marginTop: '4px',
          paddingTop: '4px',
          borderTop: `1px solid ${divColor}`
        }}>
          {items}
        </div>
      )
    }

    if (isMultiRow) {
      const splitIdx = Math.ceil(items.length / 2);
      const row1 = items.slice(0, splitIdx);
      const row2 = items.slice(splitIdx);
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          justifyContent: 'center',
          height: '100%',
          lineHeight: 1.2
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', whiteSpace: 'nowrap' }}>
            {row1.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <span style={{
                    width: '1px',
                    height: '9px',
                    background: divColor,
                    opacity: 0.35,
                    display: 'inline-block',
                    flexShrink: 0,
                    margin: '0 1px'
                  }} />
                )}
                {item}
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', whiteSpace: 'nowrap' }}>
            {row2.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <span style={{
                    width: '1px',
                    height: '9px',
                    background: divColor,
                    opacity: 0.35,
                    display: 'inline-block',
                    flexShrink: 0,
                    margin: '0 1px'
                  }} />
                )}
                {item}
              </React.Fragment>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        height: '100%',
        lineHeight: 1,
        position: 'relative',
        zIndex: 1
      }}>
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            <span style={{
              width: '1px',
              height: '10px',
              background: divColor,
              opacity: 0.35,
              display: 'inline-block',
              flexShrink: 0,
              alignSelf: 'center',
              margin: '0 1px'
            }} />
            {item}
          </React.Fragment>
        ))}
      </div>
    )
  }

  // Base container layout:
  // - Horizontal single-line: ~28px height, dynamic width
  // - Horizontal dual-line: ~44px height, compact 2-tier width
  // - Vertical: compact column (~110px wide, items stacked vertically)
  // - Flushed to corner without margin gap
  const baseBox = {
    display: 'inline-flex',
    flexDirection: isVertical ? 'column' : 'row',
    alignItems: isVertical ? 'stretch' : 'center',
    gap: isVertical ? '4px' : (isMultiRow ? '14px' : '10px'),
    padding: isVertical ? '10px 14px' : (isMultiRow ? '8px 16px' : '6px 14px'),
    height: isVertical ? 'auto' : (isMultiRow ? 'auto' : '32px'),
    minHeight: isVertical ? 'auto' : (isMultiRow ? '48px' : '32px'),
    minWidth: isVertical ? '120px' : 'auto',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    width: 'fit-content',
    lineHeight: 1.2,
    userSelect: 'none',
    margin: 0,
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
  }

  // Header helper for FPS + Badge
  const renderHeader = (iconOrBadge, fpsColor = '#ffffff', shadow = null) => {
    return (
      <div style={{
        display: 'inline-flex',
        flexDirection: isMultiRow ? 'column' : 'row',
        alignItems: isMultiRow ? 'flex-start' : (isVertical ? 'stretch' : 'center'),
        justifyContent: isVertical ? 'space-between' : 'center',
        gap: isMultiRow ? '4px' : '6px',
        flexShrink: 0,
        width: isVertical ? '100%' : 'auto',
        height: isVertical ? 'auto' : '100%',
        lineHeight: 1.2,
        position: 'relative',
        zIndex: 1,
        paddingRight: isMultiRow ? '14px' : 0,
        borderRight: isMultiRow ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '14px',
          height: '14px',
          flexShrink: 0,
          lineHeight: 1
        }}>
          {iconOrBadge}
        </span>
        {hasFps && (
          <strong style={{
            fontSize: '12px',
            fontWeight: 800,
            color: fpsColor,
            textShadow: shadow || 'none',
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
            display: 'inline-flex',
            alignItems: 'center',
            minWidth: isVertical ? 'auto' : '58px',
            textAlign: isVertical ? 'right' : 'left',
            lineHeight: 1,
            letterSpacing: '0.02em'
          }}>
            {data.fps ? `${data.fps} FPS` : '-- FPS'}
          </strong>
        )}
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 1. ATMOSPHERIC, HORROR & ELEMENTAL
  // --------------------------------------------------------------------------

  // 1.1 KINDLED BONFIRE
  if (style === 'bonfire-ember') {
    return (
      <div style={{
        ...baseBox, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(35, 14, 6, 0.98) 0%, rgba(18, 8, 4, 0.99) 100%)',
        border: '1px solid rgba(249, 115, 22, 0.75)', borderRadius: '0 0 8px 0',
      }}>
        <CssBonfireGlow />
        {renderHeader(
          <Flame size={14} style={{ color: '#fbbf24', flexShrink: 0, transformOrigin: 'center' }} />,
          '#fbbf24'
        )}
        {renderExtraMetrics('#fbbf24', '#fed7aa', 'rgba(251, 191, 36, 0.3)')}
      </div>
    )
  }

  // 1.2 LOST GRACE & EMBERS
  if (style === 'elden-grace') {
    return (
      <div style={{
        ...baseBox, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(20, 16, 6, 0.98) 0%, rgba(8, 6, 2, 0.99) 100%)',
        border: '1px solid #d4af37', borderRadius: '0 0 8px 0',
      }}>
        {renderHeader(<Sparkles size={14} style={{ color: '#fef08a', flexShrink: 0, transformOrigin: 'center' }} />, '#fef08a')}
        {renderExtraMetrics('#fef08a', '#d4af37', 'rgba(212, 175, 55, 0.35)')}
      </div>
    )
  }

  // 1.3 SILENT FOG EKG
  if (style === 'silent-fog') {
    return (
      <div style={{
        ...baseBox, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(8, 14, 10, 0.98) 0%, rgba(4, 8, 6, 0.99) 100%)',
        border: '1px solid rgba(74, 222, 128, 0.5)', borderRadius: '0 0 6px 0',
        fontFamily: 'monospace',
      }}>
        {renderHeader(<HeartPulse size={14} style={{ color: '#4ade80', flexShrink: 0, transformOrigin: 'center' }} />, '#4ade80')}
        {renderExtraMetrics('#4ade80', '#86efac', 'rgba(74, 222, 128, 0.35)')}
      </div>
    )
  }

  // 1.4 NEON DOWNPOUR
  if (style === 'neon-downpour') {
    return (
      <div style={{
        ...baseBox, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(8, 14, 26, 0.95) 0%, rgba(14, 8, 24, 0.98) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.55)', borderRadius: '0 0 8px 0',
      }}>
        <CssNeonRain />
        {renderHeader(<Droplets size={14} style={{ color: '#38bdf8', flexShrink: 0, transformOrigin: 'center' }} />, '#ffffff')}
        {renderExtraMetrics('#38bdf8', '#bae6fd', 'rgba(56, 189, 248, 0.35)')}
      </div>
    )
  }

  // 1.5 BLOOD MOON FRENZY
  if (style === 'blood-moon') {
    return (
      <div style={{
        ...baseBox, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(45, 10, 10, 0.98) 0%, rgba(15, 6, 8, 0.99) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.65)', borderRadius: '0 0 8px 0',
      }}>
        {renderHeader(<Eye size={14} style={{ color: '#ef4444', flexShrink: 0, transformOrigin: 'center' }} />, '#f87171')}
        {renderExtraMetrics('#f87171', '#fca5a5', 'rgba(239, 68, 68, 0.35)')}
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 2. MOTORSPORT & VELOCITY
  // --------------------------------------------------------------------------

  // 2.1 TACHOMETER GAUGE
  if (style === 'tachometer-gauge') {
    return (
      <div style={{
        ...baseBox,
        background: 'linear-gradient(135deg, rgba(26, 32, 44, 0.98) 0%, rgba(10, 12, 16, 0.99) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '0 0 8px 0',
      }}>
        {renderHeader(<Gauge size={14} style={{ color: '#f43f5e', flexShrink: 0, transformOrigin: 'center' }} />, '#ffffff')}
        {renderExtraMetrics('#ffffff', '#94a3b8', 'rgba(255, 255, 255, 0.2)')}
      </div>
    )
  }

  // 2.2 F1 COCKPIT
  if (style === 'f1-telemetry') {
    const shiftLights = (
      <div style={{ display: 'inline-flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ width: '4px', height: '7px', borderRadius: '1px', background: '#22c55e' }} />
        <span style={{ width: '4px', height: '7px', borderRadius: '1px', background: '#22c55e' }} />
        <span style={{ width: '4px', height: '7px', borderRadius: '1px', background: '#eab308' }} />
        <span style={{ width: '4px', height: '7px', borderRadius: '1px', background: '#ef4444' }} />
        <span style={{ width: '4px', height: '7px', borderRadius: '1px', background: '#a855f7' }} />
      </div>
    )
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(12, 14, 18, 0.98)', border: '1px solid rgba(56, 189, 248, 0.45)',
        borderRadius: '0 0 6px 0', fontFamily: 'monospace'
      }}>
        {renderHeader(shiftLights, '#ffffff')}
        {renderExtraMetrics('#38bdf8', '#94a3b8', 'rgba(255, 255, 255, 0.2)')}
      </div>
    )
  }

  // 2.3 FIGHTER JET HUD
  if (style === 'fighter-jet-hud') {
    const ladderBadge = <span style={{ fontSize: '8px', fontWeight: 900, border: '1px solid #22c55e', padding: '1px 3px', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>[--·--]</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(6, 16, 10, 0.95)', border: '1px solid #22c55e',
        borderRadius: '0 0 4px 0',
        color: '#22c55e', fontFamily: 'monospace',
      }}>
        {renderHeader(ladderBadge, '#22c55e')}
        {renderExtraMetrics('#22c55e', '#86efac', 'rgba(34, 197, 94, 0.35)')}
      </div>
    )
  }

  // 2.4 APEX TOURING RING (gran-turismo)
  if (style === 'gran-turismo') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(10, 12, 18, 0.96)', border: '1px solid rgba(239, 68, 68, 0.55)',
        borderRadius: '0 0 8px 0',
      }}>
        {renderHeader(<Gauge size={14} style={{ color: '#ef4444', flexShrink: 0, transformOrigin: 'center' }} />, '#ffffff')}
        {renderExtraMetrics('#ffffff', '#94a3b8', 'rgba(239, 68, 68, 0.35)')}
      </div>
    )
  }

  // 2.5 MUD & GRAVEL DIGITAL DASH (rally-dash)
  if (style === 'rally-dash') {
    const rallyBadge = <span style={{ fontSize: '8px', background: '#f97316', color: '#000', padding: '1px 4px', borderRadius: '2px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>WRC</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(20, 14, 8, 0.98)', border: '1px solid #f97316',
        borderRadius: '0 0 4px 0', fontFamily: 'monospace',
      }}>
        {renderHeader(rallyBadge, '#f97316')}
        {renderExtraMetrics('#f97316', '#fdba74', 'rgba(249, 115, 22, 0.35)')}
      </div>
    )
  }

  // 2.6 MIDNIGHT DRIFT PURGE (nfs-underground)
  if (style === 'nfs-underground') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(10, 10, 16, 0.96)', border: '1px solid #38bdf8',
        borderRadius: '0 0 6px 0',
      }}>
        {renderHeader(<Zap size={14} style={{ color: '#38bdf8', flexShrink: 0, transformOrigin: 'center' }} />, '#38bdf8')}
        {renderExtraMetrics('#38bdf8', '#c084fc', 'rgba(56, 189, 248, 0.35)')}
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 3. HARDWARE LABS & OVERCLOCKING
  // --------------------------------------------------------------------------

  // 3.1 FRAMETIME OSCILLOSCOPE (frametime-sparkline)
  if (style === 'frametime-sparkline') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(8, 12, 16, 0.96)', border: '1px solid #06b6d4',
        borderRadius: '0 0 6px 0',
      }}>
        {renderHeader(<Activity size={14} style={{ color: '#06b6d4', flexShrink: 0, transformOrigin: 'center' }} />, '#ffffff')}
        <div style={{ width: isVertical ? '100%' : 'auto', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: isVertical ? '2px 0' : '0 2px', flexShrink: 0, alignSelf: 'center' }}>
          <svg width="28" height="12" viewBox="0 0 28 12" style={{ display: 'block' }}>
            <polyline points="0,6 6,4 12,8 18,5 24,7 28,5" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.9" />
          </svg>
        </div>
        {renderExtraMetrics('#06b6d4', '#a5f3fc', 'rgba(6, 182, 212, 0.35)')}
      </div>
    )
  }

  // 3.2 LIQUID COOLING RIG (liquid-cooling-rig)
  if (style === 'liquid-cooling-rig') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(6, 12, 20, 0.98)', border: '1px solid #0284c7',
        borderRadius: '0 0 6px 0',
      }}>
        {renderHeader(<Waves size={14} style={{ color: '#38bdf8', flexShrink: 0, transformOrigin: 'center' }} />, '#38bdf8')}
        {renderExtraMetrics('#38bdf8', '#7dd3fc', 'rgba(56, 189, 248, 0.35)')}
      </div>
    )
  }

  // 3.3 VINTAGE DIAGNOSTIC OSD (rtss-classic)
  if (style === 'rtss-classic') {
    const rtssBadge = <span style={{ fontSize: '9px', fontWeight: 900, background: '#f97316', color: '#000', padding: '1px 3px', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>RTSS</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(0, 0, 0, 0.95)', border: '1px solid #f97316',
        borderRadius: '0 0 3px 0', fontFamily: 'monospace', color: '#f97316', fontSize: '11px',
      }}>
        {renderHeader(rtssBadge, '#fed7aa')}
        {renderExtraMetrics('#f97316', '#fed7aa', 'rgba(249, 115, 22, 0.45)')}
      </div>
    )
  }

  // 3.4 DECKMASTER HANDHELD (steam-deck-os)
  if (style === 'steam-deck-os') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(24, 26, 32, 0.98)', border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '0 0 8px 0',
      }}>
        {renderHeader(<Disc size={14} style={{ color: '#60a5fa', flexShrink: 0, transformOrigin: 'center' }} />, '#ffffff')}
        {renderExtraMetrics('#60a5fa', '#94a3b8', 'rgba(96, 165, 250, 0.35)')}
      </div>
    )
  }

  // 3.5 SENSOR PANEL (sensor-panel)
  if (style === 'sensor-panel') {
    const hwBadge = <span style={{ color: '#38bdf8', fontWeight: 900, fontSize: '9px', border: '1px solid #38bdf8', padding: '1px 3px', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>HW</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(10, 14, 18, 0.98)', border: '1px solid #38bdf8',
        borderRadius: '0 0 4px 0', fontFamily: 'monospace', fontSize: '11px',
      }}>
        {renderHeader(hwBadge, '#ffffff')}
        {renderExtraMetrics('#38bdf8', '#94a3b8', 'rgba(56, 189, 248, 0.35)')}
      </div>
    )
  }

  // 3.6 SUB-ZERO HEXAGON CORE (evga-precision)
  if (style === 'evga-precision') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(8, 14, 24, 0.98)', border: '1px solid #06b6d4',
        borderRadius: '0 0 4px 0',
      }}>
        {renderHeader(<Sliders size={14} style={{ color: '#22d3ee', flexShrink: 0, transformOrigin: 'center' }} />, '#22d3ee')}
        {renderExtraMetrics('#22d3ee', '#67e8f9', 'rgba(6, 182, 212, 0.35)')}
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 4. TACTICAL SHOOTERS & ESPORTS
  // --------------------------------------------------------------------------

  // 4.1 CLUTCH DEFUSAL PRO (cs2-pro)
  if (style === 'cs2-pro') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(14, 18, 22, 0.98)', border: '1px solid #eab308',
        borderRadius: '0 0 4px 0', fontFamily: 'monospace',
      }}>
        {renderHeader(<Award size={14} style={{ color: '#eab308', flexShrink: 0, transformOrigin: 'center' }} />, '#ffffff')}
        {renderExtraMetrics('#eab308', '#fef08a', 'rgba(234, 179, 8, 0.4)')}
      </div>
    )
  }

  // 4.2 DROPZONE JUMP-KIT (apex-jumpkit)
  if (style === 'apex-jumpkit') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(18, 12, 10, 0.98)', border: '1px solid #f97316',
        borderRadius: '0 0 6px 0',
      }}>
        {renderHeader(<Zap size={14} style={{ color: '#f97316', flexShrink: 0, transformOrigin: 'center' }} />, '#ffffff')}
        {renderExtraMetrics('#f97316', '#fdba74', 'rgba(249, 115, 22, 0.4)')}
      </div>
    )
  }

  // 4.3 HYPER-CHARGE PROTOCOL (overwatch-ult)
  if (style === 'overwatch-ult') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(18, 14, 8, 0.96)', border: '1px solid #eab308',
        borderRadius: '0 0 8px 0',
      }}>
        {renderHeader(<Zap size={14} style={{ color: '#eab308', flexShrink: 0, transformOrigin: 'center' }} />, '#fef08a')}
        {renderExtraMetrics('#eab308', '#fef08a', 'rgba(234, 179, 8, 0.4)')}
      </div>
    )
  }

  // 4.4 MJOLNIR TITANIUM SHIELD (halo-spartan)
  if (style === 'halo-spartan') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(8, 20, 28, 0.98)', border: '1px solid #38bdf8',
        borderRadius: '0 0 6px 0',
      }}>
        {renderHeader(<Shield size={14} style={{ color: '#38bdf8', flexShrink: 0, transformOrigin: 'center' }} />, '#ffffff')}
        {renderExtraMetrics('#38bdf8', '#bae6fd', 'rgba(56, 189, 248, 0.35)')}
      </div>
    )
  }

  // 4.5 HELLWALKER BERSERK (doom-slayer)
  if (style === 'doom-slayer') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(28, 6, 6, 0.98)', border: '1px solid #dc2626',
        borderRadius: '0 0 4px 0',
      }}>
        {renderHeader(<Skull size={14} style={{ color: '#ef4444', flexShrink: 0, transformOrigin: 'center' }} />, '#ef4444')}
        {renderExtraMetrics('#ef4444', '#fca5a5', 'rgba(239, 68, 68, 0.35)')}
      </div>
    )
  }

  // 4.6 GHOST WHISPER (subtle-stealth)
  if (style === 'subtle-stealth') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(10, 10, 12, 0.92)', border: '1px solid rgba(255, 255, 255, 0.25)',
        borderRadius: '0 0 4px 0',
      }}>
        {renderHeader(<Crosshair size={14} style={{ color: '#ffffff', opacity: 0.85, flexShrink: 0 }} />, '#ffffff')}
        {renderExtraMetrics('#ffffff', '#94a3b8', 'rgba(255, 255, 255, 0.25)')}
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 5. RPG & LORE-RICH FANTASY
  // --------------------------------------------------------------------------

  // 5.1 NORDIC IRON COMPASS (skyrim-compass)
  if (style === 'skyrim-compass') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(16, 14, 12, 0.98)', border: '1px solid #ca8a04',
        borderRadius: '0 0 4px 0',
      }}>
        {renderHeader(<Compass size={14} style={{ color: '#eab308', flexShrink: 0, transformOrigin: 'center' }} />, '#fef08a')}
        {renderExtraMetrics('#fef08a', '#ca8a04', 'rgba(202, 138, 4, 0.4)')}
      </div>
    )
  }

  // 5.2 SILVER WOLF MEDALLION (witcher-medallion)
  if (style === 'witcher-medallion') {
    return (
      <div style={{
        ...baseBox,
        background: 'linear-gradient(135deg, rgba(30, 32, 38, 0.98), rgba(12, 12, 16, 0.99))',
        border: '1px solid #94a3b8', borderRadius: '0 0 6px 0',
      }}>
        {renderHeader(<Sword size={14} style={{ color: '#cbd5e1', flexShrink: 0, transformOrigin: 'center' }} />, '#ffffff')}
        {renderExtraMetrics('#cbd5e1', '#94a3b8', 'rgba(148, 163, 184, 0.35)')}
      </div>
    )
  }

  // 5.3 CHROME NEURAL OPTICS (cyberpunk-neon)
  if (style === 'cyberpunk-neon' || style === 'cyberpunk-osd') {
    const cpBadge = <span style={{ fontSize: '9px', fontWeight: 900, color: '#fcee0a', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>[CP77]</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(10, 10, 14, 0.98)', border: '1px solid #fcee0a',
        borderRadius: '0 0 4px 0',
        fontFamily: 'monospace',
      }}>
        {renderHeader(cpBadge, '#fcee0a')}
        {renderExtraMetrics('#00f0ff', '#fcee0a', 'rgba(252, 238, 10, 0.4)')}
      </div>
    )
  }

  // 5.4 VAULT WRIST CRT (pipboy-crt)
  if (style === 'pipboy-crt') {
    const pipBadge = <span style={{ fontSize: '9px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>☢ SYS</span>
    return (
      <div style={{
        ...baseBox,
        background: '#041006', border: '1px solid #22c55e', borderRadius: '0 0 4px 0',
        fontFamily: 'monospace', color: '#22c55e',
      }}>
        {renderHeader(pipBadge, '#22c55e')}
        {renderExtraMetrics('#22c55e', '#86efac', 'rgba(34, 197, 94, 0.4)')}
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 6. ARCADE, RETRO & SCI-FI
  // --------------------------------------------------------------------------

  // 6.1 MATRIX DIGITAL STREAM (matrix-cascade)
  if (style === 'matrix-cascade') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(2, 12, 4, 0.98)', border: '1px solid #22c55e',
        borderRadius: '0 0 4px 0', fontFamily: 'monospace', color: '#22c55e',
      }}>
        {renderHeader(<Terminal size={14} style={{ color: '#22c55e', flexShrink: 0 }} />, '#22c55e')}
        {renderExtraMetrics('#22c55e', '#86efac', 'rgba(34, 197, 94, 0.4)')}
      </div>
    )
  }

  // 6.2 SPINAL BIO-RIG (deadspace-rig)
  if (style === 'deadspace-rig') {
    const rigMarker = <div style={{ width: '4px', height: '14px', background: '#00f0ff', borderRadius: '1px', flexShrink: 0, alignSelf: 'center' }} />
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(4, 14, 20, 0.98)', border: '1px solid #00f0ff',
        borderRadius: '0 0 6px 0',
      }}>
        {renderHeader(rigMarker, '#00f0ff')}
        {renderExtraMetrics('#00f0ff', '#bae6fd', 'rgba(0, 240, 255, 0.35)')}
      </div>
    )
  }

  // 6.3 ABYSSAL CRUSH DEPTH (subnautica-depth)
  if (style === 'subnautica-depth') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(4, 18, 28, 0.98)', border: '1px solid #38bdf8',
        borderRadius: '0 0 6px 0',
      }}>
        {renderHeader(<Waves size={14} style={{ color: '#38bdf8', flexShrink: 0, transformOrigin: 'center' }} />, '#38bdf8')}
        {renderExtraMetrics('#38bdf8', '#bae6fd', 'rgba(56, 189, 248, 0.35)')}
      </div>
    )
  }

  // 6.4 ORBITAL CHRONOMARK (starfield-chrono)
  if (style === 'starfield-chrono') {
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(16, 18, 22, 0.98)', border: '1px solid #f97316',
        borderRadius: '0 0 6px 0',
      }}>
        {renderHeader(<Orbit size={14} style={{ color: '#f97316', flexShrink: 0, transformOrigin: 'center' }} />, '#ffffff')}
        {renderExtraMetrics('#f97316', '#fdba74', 'rgba(249, 115, 22, 0.4)')}
      </div>
    )
  }

  // 6.5 HOLO ARC REACTOR (holo-arc-reactor)
  if (style === 'holo-arc-reactor') {
    const reactorCore = (
      <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #38bdf8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transformOrigin: 'center' }}>
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#38bdf8' }} />
      </div>
    )
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(6, 14, 24, 0.98)', border: '1px solid #38bdf8',
        borderRadius: '0 0 6px 0',
      }}>
        {renderHeader(reactorCore, '#ffffff')}
        {renderExtraMetrics('#38bdf8', '#bae6fd', 'rgba(56, 189, 248, 0.35)')}
      </div>
    )
  }

  // 6.6 8-BIT DOT-MATRIX (retro-gameboy)
  // Nintendo Game Boy DMG-01 authentic hardware aesthetic:
  // - Clean single line horizontally, or structured column vertically
  // - Flushed to corner
  // - Pure monochrome olive LCD green (#8bac0f) and dark olive ink (#0f380f)
  // - Zero OS emoji color leaks!
  if (style === 'retro-gameboy') {
    const dmgBadge = <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>[DMG-01]</span>
    return (
      <div style={{
        ...baseBox,
        background: '#8bac0f', border: '1.5px solid #0f380f', borderRadius: '0 0 4px 0',
        fontFamily: 'monospace', color: '#0f380f',
      }}>
        {renderHeader(dmgBadge, '#0f380f')}
        {renderExtraMetrics('#0f380f', '#0f380f', 'rgba(15, 56, 15, 0.45)')}
      </div>
    )
  }

  // 6.7 QUARTER EATER 1984 (arcade-1984)
  if (style === 'arcade-1984') {
    const arcadeBadge = <span style={{ fontSize: '9px', color: '#eab308', fontWeight: 900, display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>1984</span>
    return (
      <div style={{
        ...baseBox,
        background: '#000000', border: '1px solid #ef4444',
        borderRadius: '0 0 4px 0', fontFamily: 'monospace', color: '#ef4444',
      }}>
        {renderHeader(arcadeBadge, '#ffffff')}
        {renderExtraMetrics('#ef4444', '#eab308', 'rgba(239, 68, 68, 0.4)')}
      </div>
    )
  }

  // 6.8 SYNTHWAVE HORIZON (synthwave-neon)
  if (style === 'synthwave-neon') {
    const outrunBadge = <span style={{ fontSize: '9px', color: '#f43f5e', fontWeight: 900, display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>OUTRUN</span>
    return (
      <div style={{
        ...baseBox,
        background: 'linear-gradient(180deg, rgba(20, 4, 30, 0.98), rgba(6, 4, 16, 0.99))',
        border: '1px solid #f43f5e', borderRadius: '0 0 6px 0',
      }}>
        {renderHeader(outrunBadge, '#38bdf8')}
        {renderExtraMetrics('#f43f5e', '#c084fc', 'rgba(244, 63, 94, 0.4)')}
      </div>
    )
  }

  // 6.9 HI-FI VFD TAPE DECK (vfd-tape-deck)
  if (style === 'vfd-tape-deck') {
    const recBadge = <span style={{ fontSize: '8.5px', color: '#f43f5e', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>● REC</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(4, 10, 12, 0.98)', border: '1px solid rgba(45, 212, 191, 0.5)',
        borderRadius: '0 0 4px 0', fontFamily: 'monospace', color: '#2dd4bf',
      }}>
        {renderHeader(recBadge, '#2dd4bf')}
        {renderExtraMetrics('#2dd4bf', '#99f6e4', 'rgba(45, 212, 191, 0.4)')}
      </div>
    )
  }

  // 6.10 VERSUS FIGHTING GAUGE (fighting-game-health)
  if (style === 'fighting-game-health') {
    const koBadge = <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 900, border: '1px solid #ef4444', padding: '1px 3px', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>KO</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(14, 10, 10, 0.98)', border: '1px solid #eab308',
        borderRadius: '0 0 4px 0',
      }}>
        {renderHeader(koBadge, '#ffffff')}
        {renderExtraMetrics('#eab308', '#fca5a5', 'rgba(234, 179, 8, 0.4)')}
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 7. MINIMALIST & MODERN
  // --------------------------------------------------------------------------

  // 7.1 MICRO STATUSBAR 1-LINE TICKER (minimal-ticker)
  if (style === 'minimal-ticker') {
    const dot = <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent, #d6ff4b)', flexShrink: 0, alignSelf: 'center' }} />
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(10, 12, 16, 0.95)', border: '1px solid rgba(255, 255, 255, 0.22)',
        borderRadius: '0 0 4px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(dot, 'var(--accent, #d6ff4b)')}
        {renderExtraMetrics('#ffffff', '#94a3b8', 'rgba(255, 255, 255, 0.25)')}
      </div>
    )
  }

  // 7.2 SWISS LUXURY CHRONOGRAPH (luxury-chronograph)
  if (style === 'luxury-chronograph') {
    return (
      <div style={{
        ...baseBox,
        background: 'linear-gradient(135deg, rgba(24, 26, 32, 0.98), rgba(12, 14, 18, 0.99))',
        border: '1px solid rgba(200, 205, 215, 0.4)', borderRadius: '0 0 8px 0',
      }}>
        {renderHeader(<Clock size={14} style={{ color: '#cbd5e1', flexShrink: 0, transformOrigin: 'center' }} />, '#ffffff')}
        {renderExtraMetrics('#cbd5e1', '#94a3b8', 'rgba(200, 205, 215, 0.35)')}
      </div>
    )
  }

  // 7.3 PURE STATIC PRECISION (Zero animations, raw rock-solid stats only)
  if (style === 'pure-static') {
    const staticDot = <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#38bdf8', flexShrink: 0, alignSelf: 'center' }} />
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(8, 10, 14, 0.98)', border: '1px solid rgba(56, 189, 248, 0.45)',
        borderRadius: '0 0 6px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(staticDot, '#38bdf8')}
        {renderExtraMetrics('#ffffff', '#94a3b8', 'rgba(255, 255, 255, 0.22)')}
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // DYNAMIC CUSTOM THEMES
  // --------------------------------------------------------------------------
  const customTheme = customThemeObject || (style && typeof style === 'object' ? style : (style && (style.startsWith('custom-') || getCustomThemes().some((t) => t.id === style))
    ? getCustomThemes().find((t) => t.id === style)
    : null))

  if (customTheme) {
    const hud = customTheme.fpsHud || {}
    const pal = customTheme.palette || {}
    const accent = hud.accentColor || pal.accent || '#ef4444'
    const secColor = hud.secondaryColor || pal.borderHover || pal.textSecondary || '#cbd5e1'

    let customIcon = null
    const iconKey = String(hud.icon || '').toLowerCase()
    const badgeText = String(hud.badge || '').toUpperCase()

    if (iconKey === 'wolf' || badgeText === 'WOLF') {
      // Geometric Witcher Wolf Medallion SVG
      customIcon = (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M4 4l3 5l5-4l5 4l3-5l-2 10l-6 6l-6-6z" />
          <path d="M9 11l3 2l3-2" />
        </svg>
      )
    } else if (iconKey === 'warrior' || iconKey === 'geralt' || iconKey === 'beard') {
      // Bearded Witcher / Warrior Silhouette SVG
      customIcon = (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" />
          <path d="M8 13c1 3 2.5 5 4 6c1.5-1 3-3 4-6" />
          <path d="M10 16c.5 2 1.2 3.5 2 4.5c.8-1 1.5-2.5 2-4.5" />
        </svg>
      )
    } else if (iconKey === 'swords') {
      // Crossed Swords SVG
      customIcon = (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <line x1="5" y1="19" x2="19" y2="5" />
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="5" y1="15" x2="9" y2="19" />
          <line x1="15" y1="19" x2="19" y2="15" />
        </svg>
      )
    } else if (iconKey === 'crown') {
      customIcon = (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M3 18h18l-2-11l-5 5l-2-8l-2 8l-5-5z" />
        </svg>
      )
    } else if (iconKey === 'potion') {
      customIcon = (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M9 3h6M10 3v5l-4 7a2 2 0 0 0 1.7 3h8.6a2 2 0 0 0 1.7-3l-4-7V3" />
        </svg>
      )
    } else {
      switch (iconKey) {
        case 'sword': customIcon = <Sword size={13} style={{ color: accent, flexShrink: 0 }} />; break
        case 'shield': customIcon = <Shield size={13} style={{ color: accent, flexShrink: 0 }} />; break
        case 'flame': customIcon = <Flame size={13} style={{ color: accent, flexShrink: 0 }} />; break
        case 'skull': customIcon = <Skull size={13} style={{ color: accent, flexShrink: 0 }} />; break
        case 'crosshair':
        case 'target':
        case 'agent':
        case 'spy': customIcon = <Crosshair size={13} style={{ color: accent, flexShrink: 0 }} />; break
        case 'eye': customIcon = <Eye size={13} style={{ color: accent, flexShrink: 0 }} />; break
        case 'terminal': customIcon = <Terminal size={13} style={{ color: accent, flexShrink: 0 }} />; break
        case 'sparkles': customIcon = <Sparkles size={13} style={{ color: accent, flexShrink: 0 }} />; break
        case 'compass': customIcon = <Compass size={13} style={{ color: accent, flexShrink: 0 }} />; break
        case 'feather': customIcon = <Feather size={13} style={{ color: accent, flexShrink: 0 }} />; break
        default: customIcon = null
      }
    }

    const customBadge = (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        {customIcon}
        {hud.badge && (
          <span style={{
            fontSize: '9px', fontWeight: 900, color: accent,
            padding: '1px 3.5px', border: `1px solid ${accent}60`, borderRadius: '2px',
            background: `${accent}15`, letterSpacing: '0.04em'
          }}>
            {hud.badge}
          </span>
        )}
      </div>
    )

    const fontStyle = hud.fontFamily === 'serif'
      ? 'Cinzel, "Times New Roman", Georgia, serif'
      : hud.fontFamily === 'monospace'
      ? '"JetBrains Mono", Consolas, monospace'
      : 'inherit'

    return (
      <div style={{
        ...baseBox,
        fontFamily: fontStyle,
        background: hud.background || 'rgba(14, 16, 22, 0.96)',
        border: hud.border || `1px solid ${accent}70`,
        borderRadius: hud.borderRadius || '0 0 8px 0',
        boxShadow: hud.boxShadow || `0 0 12px ${accent}25`,
        fontSize: '11px', fontWeight: 600, color: '#ffffff',
      }}>
        {renderHeader(customBadge, accent)}
        {renderExtraMetrics('#ffffff', secColor, `${accent}40`)}
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 8. EXPANDED THEMES: ANIME, TACTICAL, SCI-FI, RETRO, MEMES
  // --------------------------------------------------------------------------
  if (style === 'anime-sakura') {
    const sakuraDot = <span style={{ fontSize: '11px' }}>🌸</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(27, 18, 36, 0.94)', border: '1px solid rgba(244, 114, 182, 0.5)',
        borderRadius: '0 0 10px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(sakuraDot, '#f472b6')}
        {renderExtraMetrics('#ffffff', '#fbcfe8', 'rgba(244, 114, 182, 0.35)')}
      </div>
    )
  }

  if (style === 'anime-eva') {
    const evaBadge = <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#22c55e', background: 'rgba(168, 85, 247, 0.25)', padding: '1px 4px', borderRadius: '2px', border: '1px solid #22c55e' }}>EVA-01</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(23, 15, 38, 0.95)', border: '1px solid rgba(168, 85, 247, 0.55)',
        borderRadius: '0 0 4px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(evaBadge, '#22c55e')}
        {renderExtraMetrics('#ffffff', '#c084fc', 'rgba(168, 85, 247, 0.35)')}
      </div>
    )
  }

  if (style === 'genshin-astral') {
    const starBadge = <span style={{ fontSize: '9px', fontWeight: 900, color: '#fbbf24' }}>✦ ASTRAL</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(14, 23, 42, 0.94)', border: '1px solid rgba(56, 189, 248, 0.45)',
        borderRadius: '0 0 8px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(starBadge, '#38bdf8')}
        {renderExtraMetrics('#ffffff', '#93c5fd', 'rgba(56, 189, 248, 0.3)')}
      </div>
    )
  }

  if (style === 'tarkov-stasis') {
    const pmcBadge = <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#84cc16', letterSpacing: '0.05em' }}>[PMC STASIS]</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(22, 26, 21, 0.95)', border: '1px solid rgba(132, 204, 22, 0.45)',
        borderRadius: '0 0 3px 0', fontSize: '11px', color: '#f4f4f5',
      }}>
        {renderHeader(pmcBadge, '#84cc16')}
        {renderExtraMetrics('#f4f4f5', '#a1a1aa', 'rgba(132, 204, 22, 0.3)')}
      </div>
    )
  }

  if (style === 'nvg-phosphor') {
    const nvgBadge = <span style={{ fontSize: '8px', fontWeight: 900, color: '#4ade80', border: '1px solid #22c55e', padding: '0 3px' }}>NVG</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(8, 23, 10, 0.96)', border: '1px solid rgba(34, 197, 94, 0.55)',
        borderRadius: '0 0 4px 0', fontSize: '11px', fontFamily: 'monospace', color: '#86efac',
      }}>
        {renderHeader(nvgBadge, '#4ade80')}
        {renderExtraMetrics('#86efac', '#22c55e', 'rgba(34, 197, 94, 0.35)')}
      </div>
    )
  }

  if (style === 'mgs-soliton') {
    const radarBadge = <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#06b6d4' }}>◎ SOLITON</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(10, 23, 26, 0.94)', border: '1px solid rgba(6, 182, 212, 0.5)',
        borderRadius: '0 0 4px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(radarBadge, '#06b6d4')}
        {renderExtraMetrics('#ffffff', '#67e8f9', 'rgba(6, 182, 212, 0.35)')}
      </div>
    )
  }

  if (style === 'helldivers-cmd') {
    const hellBadge = <span style={{ fontSize: '8px', fontWeight: 900, background: '#facc15', color: '#000', padding: '1px 4px', borderRadius: '2px' }}>SUPER EARTH</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(28, 25, 10, 0.96)', border: '2px solid #facc15',
        borderRadius: '0 0 4px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(hellBadge, '#facc15')}
        {renderExtraMetrics('#ffffff', '#fef08a', 'rgba(250, 204, 21, 0.4)')}
      </div>
    )
  }

  if (style === 'alien-tracker') {
    const trackerBadge = <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#4ade80' }}>TRACK [0.8m]</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(9, 23, 14, 0.96)', border: '1px solid rgba(34, 197, 94, 0.5)',
        borderRadius: '0 0 6px 0', fontSize: '11px', fontFamily: 'monospace', color: '#86efac',
      }}>
        {renderHeader(trackerBadge, '#4ade80')}
        {renderExtraMetrics('#86efac', '#22c55e', 'rgba(34, 197, 94, 0.3)')}
      </div>
    )
  }

  if (style === 'mass-effect-omni') {
    const omniBadge = <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#fb923c', border: '1px solid #f97316', padding: '0 3px' }}>OMNI-TOOL</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(32, 16, 4, 0.92)', border: '1px solid rgba(249, 115, 22, 0.55)',
        borderRadius: '0 0 6px 0', fontSize: '11px', color: '#fed7aa',
      }}>
        {renderHeader(omniBadge, '#f97316')}
        {renderExtraMetrics('#fed7aa', '#fb923c', 'rgba(249, 115, 22, 0.35)')}
      </div>
    )
  }

  if (style === 'sekiro-posture') {
    const sekiroBadge = <span style={{ fontSize: '11px', fontWeight: 900, color: '#f59e0b' }}>忍</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(28, 21, 14, 0.95)', border: '1px solid rgba(245, 158, 11, 0.45)',
        borderRadius: '0 0 6px 0', fontSize: '11px', color: '#fef3c7',
      }}>
        {renderHeader(sekiroBadge, '#f59e0b')}
        {renderExtraMetrics('#fef3c7', '#d97706', 'rgba(245, 158, 11, 0.35)')}
      </div>
    )
  }

  if (style === 'zelda-stamina') {
    const staminaBadge = <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#4ade80' }}>STAMINA 100%</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(12, 24, 16, 0.95)', border: '1px solid rgba(74, 222, 128, 0.45)',
        borderRadius: '0 0 8px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(staminaBadge, '#4ade80')}
        {renderExtraMetrics('#ffffff', '#86efac', 'rgba(74, 222, 128, 0.35)')}
      </div>
    )
  }

  if (style === 'monster-hunter') {
    const mhBadge = <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#a855f7' }}>SHARP [PURPLE]</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(22, 18, 28, 0.95)', border: '1px solid rgba(168, 85, 247, 0.45)',
        borderRadius: '0 0 6px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(mhBadge, '#a855f7')}
        {renderExtraMetrics('#ffffff', '#c084fc', 'rgba(168, 85, 247, 0.35)')}
      </div>
    )
  }

  if (style === 'winamp-classic') {
    const eqBars = (
      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '2px', height: '12px', flexShrink: 0, paddingRight: '2px' }}>
        <span style={{ width: '2px', height: '10px', background: '#22c55e', transformOrigin: 'bottom' }} />
        <span style={{ width: '2px', height: '10px', background: '#eab308', transformOrigin: 'bottom' }} />
        <span style={{ width: '2px', height: '10px', background: '#ef4444', transformOrigin: 'bottom' }} />
      </span>
    )
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(20, 20, 20, 0.96)', border: '1px solid rgba(34, 197, 94, 0.55)',
        borderRadius: '0 0 4px 0', fontSize: '11px', fontFamily: 'monospace', color: '#22c55e',
      }}>
        {renderHeader(eqBars, '#22c55e')}
        {renderExtraMetrics('#22c55e', '#eab308', 'rgba(34, 197, 94, 0.3)')}
      </div>
    )
  }

  if (style === 'ps1-bios') {
    const psBadge = <span style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.4)', padding: '0 3px' }}>15/15 BLOCKS</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(14, 16, 24, 0.96)', border: '1px solid rgba(148, 163, 184, 0.35)',
        borderRadius: '0 0 4px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(psBadge, '#94a3b8')}
        {renderExtraMetrics('#ffffff', '#cbd5e1', 'rgba(148, 163, 184, 0.25)')}
      </div>
    )
  }

  if (style === 'arcade-vector') {
    const vectorBadge = <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#22c55e' }}>VECTOR // 1980</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(0, 0, 0, 0.96)', border: '1px solid #22c55e',
        borderRadius: '0 0 2px 0', fontSize: '11px', fontFamily: 'monospace', color: '#22c55e',
      }}>
        {renderHeader(vectorBadge, '#22c55e')}
        {renderExtraMetrics('#22c55e', '#86efac', 'rgba(34, 197, 94, 0.3)')}
      </div>
    )
  }

  if (style === 'half-life-hev') {
    const hevBadge = <span style={{ fontSize: '9px', fontWeight: 900, color: '#f97316' }}>λ HEV</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(26, 20, 9, 0.95)', border: '1px solid rgba(249, 115, 22, 0.55)',
        borderRadius: '0 0 4px 0', fontSize: '11px', color: '#fed7aa',
      }}>
        {renderHeader(hevBadge, '#f97316')}
        {renderExtraMetrics('#fed7aa', '#fb923c', 'rgba(249, 115, 22, 0.35)')}
      </div>
    )
  }

  if (style === 'doom-1993') {
    const doomBadge = <span style={{ fontSize: '8px', fontWeight: 900, color: '#ef4444', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', padding: '1px 3px' }}>ARMOR 100%</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(22, 25, 28, 0.96)', border: '2px solid rgba(103, 232, 249, 0.45)',
        borderRadius: '0 0 4px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(doomBadge, '#67e8f9')}
        {renderExtraMetrics('#ffffff', '#67e8f9', 'rgba(103, 232, 249, 0.3)')}
      </div>
    )
  }

  if (style === 'win95-osd') {
    const win95Badge = <span style={{ fontSize: '8px', fontWeight: 900, background: '#000080', color: '#ffffff', padding: '1px 4px' }}>PERF.EXE</span>
    return (
      <div style={{
        ...baseBox,
        background: '#c0c0c0', border: '2px outset #ffffff',
        borderRadius: '0 0 2px 0', fontSize: '11px', color: '#000000',
      }}>
        {renderHeader(win95Badge, '#000080')}
        {renderExtraMetrics('#000000', '#000080', 'rgba(0, 0, 0, 0.35)')}
      </div>
    )
  }

  if (style === 'stealth-bracket') {
    const stealthDot = <span style={{ fontSize: '10px', color: '#38bdf8', opacity: 0.85 }}>[ ✛ ]</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(6, 8, 12, 0.85)', border: '1px dashed rgba(56, 189, 248, 0.45)',
        borderRadius: '0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(stealthDot, '#38bdf8')}
        {renderExtraMetrics('#ffffff', '#94a3b8', 'rgba(56, 189, 248, 0.25)')}
      </div>
    )
  }

  if (style === 'terminal-sysmon') {
    const cursor = <span style={{ color: '#22c55e', fontWeight: 900 }}>_</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(5, 10, 5, 0.95)', border: '1px solid rgba(34, 197, 94, 0.4)',
        borderRadius: '0 0 2px 0', fontSize: '10.5px', fontFamily: 'monospace', color: '#86efac',
      }}>
        {renderHeader(cursor, '#22c55e')}
        {renderExtraMetrics('#86efac', '#4ade80', 'rgba(34, 197, 94, 0.25)')}
      </div>
    )
  }

  if (style === 'monolith-dark') {
    const monoDot = <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ffffff', opacity: 0.9 }} />
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(5, 5, 8, 0.98)', border: '1px solid rgba(255, 255, 255, 0.16)',
        borderRadius: '0 0 8px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(monoDot, '#ffffff')}
        {renderExtraMetrics('#ffffff', '#94a3b8', 'rgba(255, 255, 255, 0.18)')}
      </div>
    )
  }

  if (style === 'minecraft-hearts') {
    const hearts = <span style={{ fontSize: '11px', color: '#ef4444' }}>❤❤❤</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(18, 29, 16, 0.96)', border: '2px solid rgba(34, 197, 94, 0.65)',
        borderRadius: '0 0 4px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(hearts, '#ef4444')}
        {renderExtraMetrics('#ffffff', '#93c5fd', 'rgba(34, 197, 94, 0.4)')}
      </div>
    )
  }

  if (style === 'cooking-gauge') {
    const cookBadge = <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#22c55e', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', padding: '1px 3px' }}>COOKING</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(28, 15, 10, 0.95)', border: '1px solid rgba(34, 197, 94, 0.55)',
        borderRadius: '0 0 6px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(cookBadge, '#22c55e')}
        {renderExtraMetrics('#ffffff', '#86efac', 'rgba(34, 197, 94, 0.35)')}
      </div>
    )
  }

  if (style === 'roblox-studs') {
    const studBadge = <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#000000', background: '#eab308', padding: '1px 4px', borderRadius: '2px' }}>STUDS</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(20, 20, 26, 0.96)', border: '2px solid #eab308',
        borderRadius: '0 0 4px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(studBadge, '#eab308')}
        {renderExtraMetrics('#ffffff', '#fef08a', 'rgba(234, 179, 8, 0.4)')}
      </div>
    )
  }

  if (style === 'phonk-drift') {
    const phonkBadge = <span style={{ fontSize: '8px', fontWeight: 900, color: '#06b6d4' }}>PHONK 140BPM</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(20, 10, 30, 0.95)', border: '1px solid #ec4899',
        borderRadius: '0 0 8px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(phonkBadge, '#ec4899')}
        {renderExtraMetrics('#ffffff', '#67e8f9', 'rgba(236, 72, 153, 0.35)')}
      </div>
    )
  }

  if (style === 'rgb-aura') {
    const rgbBadge = <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#a855f7' }}>RGB AURA</span>
    return (
      <div style={{
        ...baseBox,
        background: 'rgba(14, 14, 20, 0.95)', border: '2px solid rgba(168, 85, 247, 0.7)',
        borderRadius: '0 0 8px 0', fontSize: '11px', color: '#ffffff',
      }}>
        {renderHeader(rgbBadge, '#a855f7')}
        {renderExtraMetrics('#ffffff', '#a5b4fc', 'rgba(168, 85, 247, 0.35)')}
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 7.4 MINIMALIST CAPSULE (Default / minimalist-pill)
  // Modern precision capsule, dynamic width, flush corner!
  // --------------------------------------------------------------------------
  const livePillDot = <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent, #d6ff4b)', flexShrink: 0, alignSelf: 'center' }} />
  return (
    <div
      style={{
        ...baseBox, position: 'relative', overflow: 'hidden',
        background: 'rgba(12, 14, 18, 0.95)', border: '1px solid rgba(214, 255, 75, 0.45)',
        borderRadius: '0 0 8px 0',
        fontSize: '11px', fontWeight: 600, color: '#ffffff',
      }}
    >
      {renderHeader(livePillDot, 'var(--accent, #d6ff4b)')}
      {renderExtraMetrics('#ffffff', '#94a3b8', 'rgba(255, 255, 255, 0.25)')}
    </div>
  )
}

/**
 * Convenience helper so callers calling renderHudPreview(...) continue to work identically.
 */
export function renderHudPreview(style, metrics = {}, orientation = 'horizontal', telemetry = null, customThemeObject = null) {
  return <PerformanceHud style={style} metrics={metrics} orientation={orientation} telemetry={telemetry} customThemeObject={customThemeObject} />
}
