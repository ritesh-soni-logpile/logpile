import React from 'react'
import {
  SiSteam,
  SiEpicgames,
  SiGogdotcom,
  SiEa,
  SiUbisoft,
  SiLegacygames,
  SiBattledotnet,
  SiItchdotio,
  SiRiotgames,
  SiRockstargames,
  SiCdprojekt,
  SiMihoyo,
  SiHumblebundle,
  SiNexon,
  SiRoblox,
  SiSquareenix,
} from 'react-icons/si'
import { FaXbox, FaAmazon } from 'react-icons/fa6'
import { LuPackage, LuGamepad2, LuShield, LuCrosshair, LuSwords, LuFlame, LuLayers } from 'react-icons/lu'

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

  // EA Games / Origin (merged)
  if (s === 'ea' || s.includes('ea games') || s.includes('electronic arts') || s.includes('origin')) {
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

  // Riot Games
  if (s.includes('riot')) {
    return <SiRiotgames size={size} className={className} />
  }

  // Rockstar Games
  if (s.includes('rockstar')) {
    return <SiRockstargames size={size} className={className} />
  }

  // CD Projekt / REDlauncher
  if (s.includes('cd projekt') || s.includes('cdprojekt') || s.includes('redlauncher')) {
    return <SiCdprojekt size={size} className={className} />
  }

  // HoYoPlay / HoYoverse / miHoYo
  if (s.includes('hoyo') || s.includes('mihoyo')) {
    return <SiMihoyo size={size} className={className} />
  }

  // Humble App / Humble Games
  if (s.includes('humble')) {
    return <SiHumblebundle size={size} className={className} />
  }

  // Nexon
  if (s.includes('nexon')) {
    return <SiNexon size={size} className={className} />
  }

  // Roblox
  if (s.includes('roblox')) {
    return <SiRoblox size={size} className={className} />
  }

  // Square Enix / FFXIV
  if (s.includes('square')) {
    return <SiSquareenix size={size} className={className} />
  }

  // Wargaming
  if (s.includes('wargaming') || s === 'wgc') {
    return <LuShield size={size} className={className} />
  }

  // Gaijin
  if (s.includes('gaijin')) {
    return <LuCrosshair size={size} className={className} />
  }

  // Kuro Games
  if (s.includes('kuro')) {
    return <LuSwords size={size} className={className} />
  }

  // Netmarble
  if (s.includes('netmarble')) {
    return <LuLayers size={size} className={className} />
  }

  // NetEase
  if (s.includes('netease') || s.includes('loading bay')) {
    return <LuFlame size={size} className={className} />
  }

  // Standalone / Custom folder / Repack
  if (s.includes('repack') || s.includes('fitgirl') || s.includes('dodi') || s.includes('custom') || s.includes('standalone')) {
    return <LuPackage size={size} className={className} />
  }

  // All sources / Unknown / Generic Fallback
  return <LuGamepad2 size={size} className={className} />
}

export default SourceIcon
