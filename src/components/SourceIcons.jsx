import React from 'react'
import {
  SiSteam,
  SiEpicgames,
  SiGogdotcom,
  SiEa,
  SiUbisoft,
  SiOrigin,
  SiLegacygames,
  SiBattledotnet,
  SiItchdotio,
} from 'react-icons/si'
import { FaXbox, FaAmazon } from 'react-icons/fa6'
import { LuPackage, LuGamepad2 } from 'react-icons/lu'

export function SourceIcon({ source, size = 15, className = '' }) {
  const s = String(source || '').toLowerCase().trim()

  // Steam
  if (s.includes('steam')) {
    return <SiSteam size={size} className={className} />
  }

  // Epic Games
  if (s.includes('epic')) {
    return <SiEpicgames size={size} className={className} />
  }

  // GOG Galaxy
  if (s.includes('gog')) {
    return <SiGogdotcom size={size} className={className} />
  }

  // EA Games / Origin
  if (s.includes('origin')) {
    return <SiOrigin size={size} className={className} />
  }
  if (s.includes('ea') || s.includes('electronic arts')) {
    return <SiEa size={size} className={className} />
  }

  // Ubisoft / Uplay
  if (s.includes('ubisoft') || s.includes('uplay')) {
    return <SiUbisoft size={size} className={className} />
  }

  // Xbox / Microsoft Store
  if (s.includes('xbox') || s.includes('microsoft') || s.includes('xbl')) {
    return <FaXbox size={size} className={className} />
  }

  // Amazon Games / Luna
  if (s.includes('amazon') || s.includes('luna')) {
    return <FaAmazon size={size} className={className} />
  }

  // Legacy Games
  if (s.includes('legacy')) {
    return <SiLegacygames size={size} className={className} />
  }

  // Battle.net / Blizzard
  if (s.includes('battle') || s.includes('blizzard')) {
    return <SiBattledotnet size={size} className={className} />
  }

  // itch.io
  if (s.includes('itch')) {
    return <SiItchdotio size={size} className={className} />
  }

  // Standalone / Custom installer
  if (s.includes('repack') || s.includes('fitgirl') || s.includes('dodi') || s.includes('custom') || s.includes('standalone')) {
    return <LuPackage size={size} className={className} />
  }

  // All sources / Unknown / Generic Fallback
  return <LuGamepad2 size={size} className={className} />
}

export default SourceIcon
