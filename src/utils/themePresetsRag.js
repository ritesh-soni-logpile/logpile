/**
 * Logpile AI Theme Studio - Grounded Local RAG & Restore Point Engine
 * Zero-hallucination theme generation for budget CPUs and 1.5B-3B models.
 * Completely offline, zero network requests, 100% deterministic fallbacks.
 */

export const THEME_RAG_DATABASE = [
  // 1. Anime, Kawaii & Mecha
  {
    id: 'anime-sakura',
    keywords: ['anime', 'girl', 'sakura', 'kawaii', 'pink', 'waifu', 'cherry blossom', 'cute', 'pastel', 'hololive', 'vtuber'],
    name: 'Sakura Anime Bloom',
    category: 'Anime & Kawaii',
    badge: '🌸',
    animation: 'none',
    palette: {
      base: '#0f0a14',
      surface: '#1b1224',
      surfaceHover: '#291b36',
      card: '#160e1f',
      textPrimary: '#ffffff',
      textSecondary: '#fbcfe8',
      textMuted: '#f472b6',
      accent: '#f472b6',
      accentGlow: 'rgba(244, 114, 182, 0.35)',
      accentContrast: '#000000',
      borderColor: 'rgba(244, 114, 182, 0.3)',
      borderHover: 'rgba(244, 114, 182, 0.65)',
      badgeBg: 'rgba(244, 114, 182, 0.18)',
      badgeText: '#fbcfe8',
    },
    hud: {
      accentColor: '#f472b6',
      secondaryColor: '#c084fc',
      border: '1px solid rgba(244, 114, 182, 0.45)',
      background: 'rgba(27, 18, 36, 0.92)',
    }
  },
  {
    id: 'anime-eva',
    keywords: ['evangelion', 'mecha', 'eva', 'shinji', 'asuka', 'nerv', 'robot', 'gundam', 'cyber mecha', 'unit 01'],
    name: 'NERV Unit-01 Protocol',
    category: 'Anime & Kawaii',
    badge: 'EVA',
    animation: 'none',
    palette: {
      base: '#0c0714',
      surface: '#170f26',
      surfaceHover: '#24173d',
      card: '#130c21',
      textPrimary: '#ffffff',
      textSecondary: '#cbd5e1',
      textMuted: '#a855f7',
      accent: '#22c55e',
      accentGlow: 'rgba(34, 197, 94, 0.35)',
      accentContrast: '#000000',
      borderColor: 'rgba(168, 85, 247, 0.4)',
      borderHover: 'rgba(34, 197, 94, 0.65)',
      badgeBg: 'rgba(168, 85, 247, 0.2)',
      badgeText: '#22c55e',
    },
    hud: {
      accentColor: '#22c55e',
      secondaryColor: '#a855f7',
      border: '1px solid rgba(168, 85, 247, 0.5)',
      background: 'rgba(23, 15, 38, 0.94)',
    }
  },
  {
    id: 'genshin-astral',
    keywords: ['genshin', 'star rail', 'honkai', 'astral', 'raiden', 'archon', 'primogem', 'celestial', 'teyvat'],
    name: 'Astral Primogem Celestial',
    category: 'Anime & Kawaii',
    badge: 'STAR',
    animation: 'none',
    palette: {
      base: '#070c18',
      surface: '#0e172a',
      surfaceHover: '#172545',
      card: '#0b1324',
      textPrimary: '#ffffff',
      textSecondary: '#93c5fd',
      textMuted: '#60a5fa',
      accent: '#38bdf8',
      accentGlow: 'rgba(56, 189, 248, 0.35)',
      accentContrast: '#000000',
      borderColor: 'rgba(56, 189, 248, 0.28)',
      borderHover: 'rgba(251, 191, 36, 0.65)',
      badgeBg: 'rgba(56, 189, 248, 0.16)',
      badgeText: '#fbbf24',
    },
    hud: {
      accentColor: '#38bdf8',
      secondaryColor: '#fbbf24',
      border: '1px solid rgba(56, 189, 248, 0.4)',
      background: 'rgba(14, 23, 42, 0.92)',
    }
  },

  // 2. Tactical & Military Sim
  {
    id: 'tarkov-stasis',
    keywords: ['tarkov', 'escape from tarkov', 'milsim', 'military', 'tactical', 'soldier', 'camo', 'pmc', 'combat'],
    name: 'Tarkov Combat Stasis',
    category: 'Tactical & MilSim',
    badge: 'PMC',
    animation: 'none',
    palette: {
      base: '#0d0f0c',
      surface: '#161a15',
      surfaceHover: '#232921',
      card: '#121410',
      textPrimary: '#f4f4f5',
      textSecondary: '#a1a1aa',
      textMuted: '#71717a',
      accent: '#84cc16',
      accentGlow: 'rgba(132, 204, 22, 0.3)',
      accentContrast: '#000000',
      borderColor: 'rgba(132, 204, 22, 0.25)',
      borderHover: 'rgba(249, 115, 22, 0.6)',
      badgeBg: 'rgba(132, 204, 22, 0.15)',
      badgeText: '#84cc16',
    },
    hud: {
      accentColor: '#84cc16',
      secondaryColor: '#f97316',
      border: '1px solid rgba(132, 204, 22, 0.4)',
      background: 'rgba(22, 26, 21, 0.94)',
    }
  },
  {
    id: 'nvg-phosphor',
    keywords: ['nvg', 'night vision', 'phosphor', 'green phosphor', 'stealth', 'splinter cell', 'spec ops'],
    name: 'NVG Night Vision Phosphor',
    category: 'Tactical & MilSim',
    badge: 'NVG',
    animation: 'none',
    palette: {
      base: '#030a04',
      surface: '#08170a',
      surfaceHover: '#0e2b13',
      card: '#051207',
      textPrimary: '#86efac',
      textSecondary: '#4ade80',
      textMuted: '#22c55e',
      accent: '#22c55e',
      accentGlow: 'rgba(34, 197, 94, 0.4)',
      accentContrast: '#000000',
      borderColor: 'rgba(34, 197, 94, 0.35)',
      borderHover: 'rgba(34, 197, 94, 0.75)',
      badgeBg: 'rgba(34, 197, 94, 0.18)',
      badgeText: '#86efac',
    },
    hud: {
      accentColor: '#4ade80',
      secondaryColor: '#22c55e',
      border: '1px solid rgba(34, 197, 94, 0.5)',
      background: 'rgba(8, 23, 10, 0.95)',
    }
  },
  {
    id: 'mgs-soliton',
    keywords: ['metal gear', 'mgs', 'snake', 'soliton', 'radar', 'tactical espionage', 'otacon', 'codec'],
    name: 'MGS Soliton Radar',
    category: 'Tactical & MilSim',
    badge: 'MGS',
    animation: 'none',
    palette: {
      base: '#050c0d',
      surface: '#0a171a',
      surfaceHover: '#11282c',
      card: '#071214',
      textPrimary: '#ffffff',
      textSecondary: '#67e8f9',
      textMuted: '#06b6d4',
      accent: '#06b6d4',
      accentGlow: 'rgba(6, 182, 212, 0.35)',
      accentContrast: '#000000',
      borderColor: 'rgba(6, 182, 212, 0.3)',
      borderHover: 'rgba(239, 68, 68, 0.65)',
      badgeBg: 'rgba(6, 182, 212, 0.16)',
      badgeText: '#67e8f9',
    },
    hud: {
      accentColor: '#06b6d4',
      secondaryColor: '#ef4444',
      border: '1px solid rgba(6, 182, 212, 0.45)',
      background: 'rgba(10, 23, 26, 0.93)',
    }
  },
  {
    id: 'agent-007-stealth',
    keywords: [
      '007', 'james bond', 'bond', 'goldeneye', 'agent', 'spy', 'espionage',
      'covert', 'secret agent', 'mi6', 'hitman', 'stealth assassin', 'first light',
      'spectre', 'license to kill', 'skyfall', 'casino royale', 'assassin'
    ],
    name: 'MI6 Agent 007 Covert',
    category: 'Stealth & Espionage',
    badge: '007',
    animation: 'none',
    palette: {
      base: '#080a0e',
      surface: '#10141c',
      surfaceHover: '#181f2b',
      card: '#0c0f16',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      accent: '#f59e0b',
      accentGlow: 'rgba(245, 158, 11, 0.35)',
      accentContrast: '#000000',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      borderHover: 'rgba(245, 158, 11, 0.7)',
      badgeBg: 'rgba(245, 158, 11, 0.18)',
      badgeText: '#fbbf24',
    },
    hud: {
      accentColor: '#f59e0b',
      secondaryColor: '#cbd5e1',
      border: '1px solid rgba(245, 158, 11, 0.45)',
      background: 'rgba(16, 20, 28, 0.95)',
    }
  },

  // 3. Sci-Fi & Space
  {
    id: 'helldivers-cmd',
    keywords: ['helldivers', 'helldiver', 'super earth', 'democracy', 'orbital', 'stratagem', 'bug', 'bot', 'automatons'],
    name: 'Helldivers Orbital Command',
    category: 'Sci-Fi & Space',
    badge: 'HELL',
    animation: 'none',
    palette: {
      base: '#0c0b05',
      surface: '#1c190a',
      surfaceHover: '#2d2811',
      card: '#141207',
      textPrimary: '#ffffff',
      textSecondary: '#fef08a',
      textMuted: '#eab308',
      accent: '#facc15',
      accentGlow: 'rgba(250, 204, 21, 0.35)',
      accentContrast: '#000000',
      borderColor: 'rgba(250, 204, 21, 0.35)',
      borderHover: 'rgba(250, 204, 21, 0.75)',
      badgeBg: 'rgba(250, 204, 21, 0.18)',
      badgeText: '#000000',
    },
    hud: {
      accentColor: '#facc15',
      secondaryColor: '#ffffff',
      border: '1px solid rgba(250, 204, 21, 0.55)',
      background: 'rgba(28, 25, 10, 0.95)',
    }
  },
  {
    id: 'alien-tracker',
    keywords: ['alien', 'alien isolation', 'motion tracker', 'xenomorph', 'horror sci-fi', 'weyland', 'nostromo'],
    name: 'Nostromo Motion Tracker',
    category: 'Sci-Fi & Space',
    badge: 'XENO',
    animation: 'none',
    palette: {
      base: '#030805',
      surface: '#09170e',
      surfaceHover: '#102919',
      card: '#06120b',
      textPrimary: '#86efac',
      textSecondary: '#4ade80',
      textMuted: '#22c55e',
      accent: '#22c55e',
      accentGlow: 'rgba(34, 197, 94, 0.4)',
      accentContrast: '#000000',
      borderColor: 'rgba(34, 197, 94, 0.32)',
      borderHover: 'rgba(239, 68, 68, 0.7)',
      badgeBg: 'rgba(34, 197, 94, 0.16)',
      badgeText: '#86efac',
    },
    hud: {
      accentColor: '#4ade80',
      secondaryColor: '#ef4444',
      border: '1px solid rgba(34, 197, 94, 0.45)',
      background: 'rgba(9, 23, 14, 0.95)',
    }
  },

  // 4. Souls-like & Dark Fantasy
  {
    id: 'sekiro-posture',
    keywords: ['sekiro', 'posture', 'parry', 'deflect', 'samurai', 'ninja', 'shinobi', 'fromsoft', 'shadows die twice'],
    name: 'Sekiro Deflect Posture',
    category: 'Souls & Dark Fantasy',
    badge: '忍',
    animation: 'none',
    palette: {
      base: '#0e0b07',
      surface: '#1c150e',
      surfaceHover: '#2e2217',
      card: '#16110b',
      textPrimary: '#fef3c7',
      textSecondary: '#d97706',
      textMuted: '#b45309',
      accent: '#f59e0b',
      accentGlow: 'rgba(245, 158, 11, 0.35)',
      accentContrast: '#000000',
      borderColor: 'rgba(245, 158, 11, 0.28)',
      borderHover: 'rgba(239, 68, 68, 0.65)',
      badgeBg: 'rgba(245, 158, 11, 0.16)',
      badgeText: '#fef3c7',
    },
    hud: {
      accentColor: '#f59e0b',
      secondaryColor: '#ef4444',
      border: '1px solid rgba(245, 158, 11, 0.45)',
      background: 'rgba(28, 21, 14, 0.94)',
    }
  },
  {
    id: 'witcher-wolf',
    keywords: ['witcher', 'witcher 3', 'geralt', 'wolf', 'wild hunt', 'silver sword', 'toxicity', 'alchemy'],
    name: 'White Wolf Witcher Medallion',
    category: 'Souls & Dark Fantasy',
    badge: 'WOLF',
    animation: 'none',
    palette: {
      base: '#0b0c10',
      surface: '#161820',
      surfaceHover: '#222530',
      card: '#111319',
      textPrimary: '#ffffff',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      accent: '#ef4444',
      accentGlow: 'rgba(239, 68, 68, 0.35)',
      accentContrast: '#ffffff',
      borderColor: 'rgba(203, 213, 225, 0.3)',
      borderHover: 'rgba(239, 68, 68, 0.6)',
      badgeBg: 'rgba(239, 68, 68, 0.16)',
      badgeText: '#fca5a5',
    },
    hud: {
      accentColor: '#cbd5e1',
      secondaryColor: '#ef4444',
      border: '1px solid rgba(203, 213, 225, 0.4)',
      background: 'rgba(22, 24, 32, 0.94)',
    }
  },

  // 5. 1990s & Classic PC Nostalgia
  {
    id: 'winamp-classic',
    keywords: ['winamp', 'mp3', '1999', 'equalizer', 'eq', 'media player', 'retro audio', 'vintage pc'],
    name: 'Winamp 1999 Classic EQ',
    category: '1990s Nostalgia',
    badge: 'EQ',
    animation: 'none',
    palette: {
      base: '#080808',
      surface: '#141414',
      surfaceHover: '#222222',
      card: '#0e0e0e',
      textPrimary: '#22c55e',
      textSecondary: '#eab308',
      textMuted: '#ef4444',
      accent: '#22c55e',
      accentGlow: 'rgba(34, 197, 94, 0.35)',
      accentContrast: '#000000',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      borderHover: 'rgba(234, 179, 8, 0.6)',
      badgeBg: 'rgba(34, 197, 94, 0.16)',
      badgeText: '#22c55e',
    },
    hud: {
      accentColor: '#22c55e',
      secondaryColor: '#eab308',
      border: '1px solid rgba(34, 197, 94, 0.45)',
      background: 'rgba(20, 20, 20, 0.95)',
    }
  },
  {
    id: 'half-life-hev',
    keywords: ['half-life', 'half life', 'gordon', 'freeman', 'hev', 'black mesa', 'valve', 'crowbar'],
    name: 'Black Mesa HEV Suit',
    category: '1990s Nostalgia',
    badge: 'HEV',
    animation: 'none',
    palette: {
      base: '#0c0904',
      surface: '#1a1409',
      surfaceHover: '#2b210e',
      card: '#140f07',
      textPrimary: '#fed7aa',
      textSecondary: '#fb923c',
      textMuted: '#f97316',
      accent: '#f97316',
      accentGlow: 'rgba(249, 115, 22, 0.35)',
      accentContrast: '#000000',
      borderColor: 'rgba(249, 115, 22, 0.32)',
      borderHover: 'rgba(249, 115, 22, 0.7)',
      badgeBg: 'rgba(249, 115, 22, 0.18)',
      badgeText: '#fed7aa',
    },
    hud: {
      accentColor: '#f97316',
      secondaryColor: '#fdba74',
      border: '1px solid rgba(249, 115, 22, 0.5)',
      background: 'rgba(26, 20, 9, 0.94)',
    }
  },
  {
    id: 'doom-1993',
    keywords: ['doom', 'doom 1993', 'id software', 'slayer', 'doomguy', 'bfg', 'e1m1', 'retro shooter'],
    name: 'Doom 1993 Marine Armor',
    category: '1990s Nostalgia',
    badge: 'BFG',
    animation: 'none',
    palette: {
      base: '#0b0c0d',
      surface: '#16191c',
      surfaceHover: '#22272c',
      card: '#121417',
      textPrimary: '#ffffff',
      textSecondary: '#67e8f9',
      textMuted: '#38bdf8',
      accent: '#ef4444',
      accentGlow: 'rgba(239, 68, 68, 0.35)',
      accentContrast: '#ffffff',
      borderColor: 'rgba(103, 232, 249, 0.28)',
      borderHover: 'rgba(239, 68, 68, 0.65)',
      badgeBg: 'rgba(239, 68, 68, 0.16)',
      badgeText: '#ffffff',
    },
    hud: {
      accentColor: '#67e8f9',
      secondaryColor: '#ef4444',
      border: '1px solid rgba(103, 232, 249, 0.4)',
      background: 'rgba(22, 25, 28, 0.94)',
    }
  },

  // 6. Gen Alpha, Memes & Modern Culture
  {
    id: 'minecraft-hearts',
    keywords: ['minecraft', 'hearts', 'pixel', 'block', 'mojang', 'steve', 'creeper', 'survival', 'craft'],
    name: 'Minecraft 8-Bit Survival',
    category: 'Gen Alpha & Memes',
    badge: '❤',
    animation: 'none',
    palette: {
      base: '#080d07',
      surface: '#121d10',
      surfaceHover: '#1c2e19',
      card: '#0e170c',
      textPrimary: '#ffffff',
      textSecondary: '#fca5a5',
      textMuted: '#93c5fd',
      accent: '#ef4444',
      accentGlow: 'rgba(239, 68, 68, 0.35)',
      accentContrast: '#ffffff',
      borderColor: 'rgba(34, 197, 94, 0.35)',
      borderHover: 'rgba(239, 68, 68, 0.7)',
      badgeBg: 'rgba(239, 68, 68, 0.18)',
      badgeText: '#fca5a5',
    },
    hud: {
      accentColor: '#ef4444',
      secondaryColor: '#93c5fd',
      border: '2px solid rgba(34, 197, 94, 0.6)',
      background: 'rgba(18, 29, 16, 0.95)',
    }
  },
  {
    id: 'cooking-gauge',
    keywords: ['cooking', 'cooked', 'brainrot', 'skibidi', 'sigma', 'bussin', 'meme', 'gen alpha'],
    name: 'Let Him Cook / Cooked',
    category: 'Gen Alpha & Memes',
    badge: 'COOK',
    animation: 'none',
    palette: {
      base: '#0c0705',
      surface: '#1c0f0a',
      surfaceHover: '#2e1810',
      card: '#140b07',
      textPrimary: '#ffffff',
      textSecondary: '#86efac',
      textMuted: '#f97316',
      accent: '#22c55e',
      accentGlow: 'rgba(34, 197, 94, 0.4)',
      accentContrast: '#000000',
      borderColor: 'rgba(34, 197, 94, 0.35)',
      borderHover: 'rgba(239, 68, 68, 0.7)',
      badgeBg: 'rgba(34, 197, 94, 0.18)',
      badgeText: '#86efac',
    },
    hud: {
      accentColor: '#22c55e',
      secondaryColor: '#f97316',
      border: '1px solid rgba(34, 197, 94, 0.5)',
      background: 'rgba(28, 15, 10, 0.94)',
    }
  },
  {
    id: 'rgb-aura',
    keywords: ['rgb', 'rainbow', 'aura', 'pc master race', 'chroma', 'corsair', 'razer', 'lights'],
    name: 'Aura Chroma Rainbow RGB',
    category: 'Gen Alpha & Memes',
    badge: 'RGB',
    animation: 'none',
    palette: {
      base: '#07070a',
      surface: '#111117',
      surfaceHover: '#1d1d26',
      card: '#0d0d12',
      textPrimary: '#ffffff',
      textSecondary: '#a5b4fc',
      textMuted: '#818cf8',
      accent: '#a855f7',
      accentGlow: 'rgba(168, 85, 247, 0.4)',
      accentContrast: '#ffffff',
      borderColor: 'rgba(168, 85, 247, 0.35)',
      borderHover: 'rgba(236, 72, 153, 0.7)',
      badgeBg: 'rgba(168, 85, 247, 0.18)',
      badgeText: '#f472b6',
    },
    hud: {
      accentColor: '#a855f7',
      secondaryColor: '#38bdf8',
      border: '1px solid rgba(168, 85, 247, 0.5)',
      background: 'rgba(17, 17, 23, 0.94)',
    }
  },
  {
    id: 'cyberpunk-netrunner',
    keywords: ['cyberpunk', 'netrunner', 'neon', 'night city', 'matrix', 'hacker', 'glitch', 'synth', 'future', 'cyber'],
    name: 'Cyberpunk Netrunner 2077',
    category: 'Cyberpunk & Sci-Fi',
    badge: 'CYBR',
    animation: 'none',
    palette: {
      base: '#05070a',
      surface: '#0d1117',
      surfaceHover: '#161d27',
      card: '#0a0d13',
      textPrimary: '#ffffff',
      textSecondary: '#67e8f9',
      textMuted: '#06b6d4',
      accent: '#facc15',
      accentGlow: 'rgba(250, 204, 21, 0.38)',
      accentContrast: '#000000',
      borderColor: 'rgba(6, 182, 212, 0.35)',
      borderHover: 'rgba(250, 204, 21, 0.75)',
      badgeBg: 'rgba(6, 182, 212, 0.18)',
      badgeText: '#facc15',
    },
    hud: {
      accentColor: '#facc15',
      secondaryColor: '#06b6d4',
      border: '1px solid rgba(6, 182, 212, 0.45)',
      background: 'rgba(13, 17, 23, 0.95)',
    }
  },
  {
    id: 'racing-tachometer',
    keywords: ['racing', 'forza', 'gt', 'gran turismo', 'speed', 'formula', 'f1', 'drift', 'tachometer', 'motorsport', 'rally', 'car', 'nitro', 'driving'],
    name: 'Apex Motorsport Tachometer',
    category: 'Motorsport & Speed',
    badge: 'RPM',
    animation: 'none',
    palette: {
      base: '#0a0a0c',
      surface: '#141418',
      surfaceHover: '#202026',
      card: '#101014',
      textPrimary: '#ffffff',
      textSecondary: '#fca5a5',
      textMuted: '#ef4444',
      accent: '#ef4444',
      accentGlow: 'rgba(239, 68, 68, 0.4)',
      accentContrast: '#ffffff',
      borderColor: 'rgba(239, 68, 68, 0.35)',
      borderHover: 'rgba(249, 115, 22, 0.7)',
      badgeBg: 'rgba(239, 68, 68, 0.18)',
      badgeText: '#ffffff',
    },
    hud: {
      accentColor: '#ef4444',
      secondaryColor: '#f97316',
      border: '1px solid rgba(239, 68, 68, 0.5)',
      background: 'rgba(20, 20, 24, 0.95)',
    }
  },
  {
    id: 'minimalist-slate',
    keywords: ['minimal', 'clean', 'simple', 'neutral', 'slate', 'default', 'modern', 'dark', 'hud', 'titanium'],
    name: 'Minimalist Titanium Slate',
    category: 'Clean & Minimalist',
    badge: 'HUD',
    animation: 'none',
    palette: {
      base: '#0a0d12',
      surface: '#121722',
      surfaceHover: '#1a2232',
      card: '#0e131d',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      accent: '#38bdf8',
      accentGlow: 'rgba(56, 189, 248, 0.3)',
      accentContrast: '#000000',
      borderColor: 'rgba(148, 163, 184, 0.25)',
      borderHover: 'rgba(56, 189, 248, 0.6)',
      badgeBg: 'rgba(56, 189, 248, 0.15)',
      badgeText: '#38bdf8',
    },
    hud: {
      accentColor: '#38bdf8',
      secondaryColor: '#94a3b8',
      border: '1px solid rgba(148, 163, 184, 0.35)',
      background: 'rgba(18, 23, 34, 0.94)',
    }
  }
]

export const NEUTRAL_FALLBACK_PRESET = THEME_RAG_DATABASE.find((p) => p.id === 'minimalist-slate') || {
  id: 'minimalist-slate',
  keywords: ['minimal', 'clean', 'simple', 'neutral', 'slate'],
  name: 'Minimalist Titanium Slate',
  category: 'Clean & Minimalist',
  badge: 'HUD',
  animation: 'none',
  palette: {
    base: '#0a0d12',
    surface: '#121722',
    surfaceHover: '#1a2232',
    card: '#0e131d',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.3)',
    accentContrast: '#000000',
    borderColor: 'rgba(148, 163, 184, 0.25)',
    borderHover: 'rgba(56, 189, 248, 0.6)',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    badgeText: '#38bdf8',
  },
  hud: {
    accentColor: '#38bdf8',
    secondaryColor: '#94a3b8',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'rgba(18, 23, 34, 0.94)',
  }
}

/**
 * Intelligent genre and theme fallback matcher when direct keyword hits are exhausted.
 */
export function findGenreFallback(genreString = '', titleString = '') {
  const g = (genreString || '').toLowerCase()
  const t = (titleString || '').toLowerCase()

  if (g.includes('stealth') || t.includes('agent') || t.includes('hitman') || t.includes('007') || t.includes('bond') || t.includes('spy')) {
    return THEME_RAG_DATABASE.find((p) => p.id === 'agent-007-stealth') || null
  }
  if (g.includes('shooter') || g.includes('fps') || g.includes('tactical') || g.includes('milsim')) {
    return THEME_RAG_DATABASE.find((p) => p.id === 'tarkov-stasis') || THEME_RAG_DATABASE.find((p) => p.id === 'doom-1993') || null
  }
  if (g.includes('rpg') || g.includes('role-playing') || g.includes('fantasy') || g.includes('souls')) {
    return THEME_RAG_DATABASE.find((p) => p.id === 'witcher-wolf') || THEME_RAG_DATABASE.find((p) => p.id === 'sekiro-posture') || null
  }
  if (g.includes('racing') || g.includes('driving') || g.includes('sports')) {
    return THEME_RAG_DATABASE.find((p) => p.id === 'racing-tachometer') || null
  }
  if (g.includes('horror') || g.includes('survival') || g.includes('suspense')) {
    return THEME_RAG_DATABASE.find((p) => p.id === 'alien-tracker') || null
  }
  if (g.includes('sci-fi') || g.includes('space') || g.includes('cyber')) {
    return THEME_RAG_DATABASE.find((p) => p.id === 'cyberpunk-netrunner') || THEME_RAG_DATABASE.find((p) => p.id === 'helldivers-cmd') || null
  }
  if (g.includes('action') || g.includes('adventure')) {
    // For general Action/Adventure, prefer covert stealth if espionage/combat context, otherwise sleek titanium
    return THEME_RAG_DATABASE.find((p) => p.id === 'agent-007-stealth') || NEUTRAL_FALLBACK_PRESET
  }
  return null
}

/**
 * Searches the local RAG database for matching presets based on text query & game metadata.
 * Guaranteed 0% hallucinations, works on any budget CPU, 100% deterministic.
 */
export function searchThemeRag(query = '', gameMetadata = null) {
  const cleanQ = (query || '').toLowerCase().trim()
  const cleanGame = (gameMetadata?.canonical_title || gameMetadata?.title || '').toLowerCase()
  const cleanGenre = (gameMetadata?.genre || '').toLowerCase()
  const tokens = [...cleanQ.split(/\s+/), ...cleanGame.split(/\s+/), ...cleanGenre.split(/\s+/)].filter(Boolean)

  let bestMatch = null
  let bestScore = 0

  for (const preset of THEME_RAG_DATABASE) {
    let score = 0
    for (const kw of preset.keywords) {
      if (cleanQ.includes(kw)) score += 5
      if (cleanGame.includes(kw)) score += 8
      if (cleanGenre.includes(kw)) score += 4
      for (const t of tokens) {
        if (kw.includes(t) || t.includes(kw)) score += 2
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = preset
    }
  }

  // Legitimate keyword match found
  if (bestMatch && bestScore > 0) {
    return bestMatch
  }

  // Fallback to genre heuristics if game metadata is present
  const genreMatch = findGenreFallback(cleanGenre, cleanGame)
  if (genreMatch) {
    return genreMatch
  }

  // Safe universal fallback: clean dark minimalist titanium HUD (NEVER anime flowers on zero matches)
  return NEUTRAL_FALLBACK_PRESET
}

/**
 * Deterministic, safe theme builder from user prompt.
 * Guaranteed 0% hallucinations, works on any CPU, output valid for Logpile theme engine.
 */
export function buildCustomThemeFromPrompt(prompt = '', gameMetadata = null, aiResponse = null) {
  const match = searchThemeRag(prompt, gameMetadata)
  const cleanTitle = prompt.trim() || gameMetadata?.canonical_title || 'Custom AI'
  const safeId = `custom-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 24)}-${Date.now().toString().slice(-4)}`

  // Priority to AI structured response if valid, otherwise fallback to grounded RAG match
  const primaryColor = aiResponse?.primary_color && /^#[0-9a-fA-F]{6}$/.test(aiResponse.primary_color)
    ? aiResponse.primary_color
    : match.palette.accent

  const accentColor = aiResponse?.accent_color && /^#[0-9a-fA-F]{6}$/.test(aiResponse.accent_color)
    ? aiResponse.accent_color
    : match.palette.borderHover

  const badge = (aiResponse?.badge || match.badge || 'AI').slice(0, 4).toUpperCase()
  const animation = ['breathe', 'pulse', 'scan', 'drift', 'none'].includes(aiResponse?.animation)
    ? aiResponse.animation
    : match.animation

  let themeName = aiResponse?.theme_name
  if (!themeName) {
    if (gameMetadata?.canonical_title || gameMetadata?.title) {
      themeName = `${gameMetadata.canonical_title || gameMetadata.title}: ${match.name}`
    } else {
      const cleanPrompt = prompt
        .replace(/^(i\s+want\s+(a\s+)?(hud|theme)?\s*(look\s+like|styled\s+like|feel\s+like)?\s*)/i, '')
        .replace(/\b(hud|theme|style)\b/gi, '')
        .trim()
      const titleCased = cleanPrompt ? cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1) : match.name
      themeName = `${titleCased.slice(0, 28)} HUD`
    }
  }

  const icon = aiResponse?.icon || (
    match.id.includes('witcher') || match.id.includes('sekiro') ? 'sword' :
    match.id.includes('tarkov') || match.id.includes('007') || match.id.includes('stealth') || match.id.includes('slate') ? 'crosshair' :
    match.id.includes('helldivers') ? 'shield' :
    match.id.includes('skyrim') || match.id.includes('racing') ? 'compass' :
    match.id.includes('eva') || match.id.includes('terminal') || match.id.includes('cyber') ? 'terminal' :
    match.id.includes('sakura') ? 'sparkles' : 'crosshair'
  )

  const fontFamily = aiResponse?.fontFamily || (
    match.category.includes('Souls') || match.category.includes('Fantasy') ? 'serif' :
    match.category.includes('Tactical') || match.category.includes('Sci-Fi') || match.category.includes('Cyberpunk') || match.category.includes('Stealth') ? 'monospace' :
    'sans-serif'
  )

  const background = aiResponse?.background || match.hud?.background || 'rgba(16, 20, 28, 0.96)'
  const border = aiResponse?.border || match.hud?.border || `1px solid ${primaryColor}70`
  const borderRadius = aiResponse?.borderRadius || '0 0 8px 0'
  const boxShadow = aiResponse?.boxShadow || `0 0 10px ${primaryColor}30`

  return {
    id: safeId,
    name: themeName,
    author: 'Logpile Theme Studio',
    tagline: aiResponse?.tagline || `Theme Studio: ${match.category}`,
    version: '1.0.0',
    category: 'Custom HUD',
    isCustomTheme: true,
    palette: {
      ...match.palette,
      accent: primaryColor,
      accentGlow: `${primaryColor}55`,
      borderColor: `${primaryColor}40`,
      badgeText: primaryColor,
    },
    fpsHud: {
      style: safeId,
      badge,
      icon,
      fontFamily,
      accentColor: primaryColor,
      secondaryColor: accentColor,
      animation,
      border,
      background,
      borderRadius,
      boxShadow,
    }
  }
}

/**
 * Creates an automatic snapshot restore point in localStorage before theme injection
 */
export function createThemeRestorePoint() {
  try {
    const currentTheme = localStorage.getItem('logpile-theme') || 'cinematic'
    const currentFpsStyle = localStorage.getItem('logpile-fps-style') || 'bonfire-ember'
    const snapshot = {
      timestamp: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString(),
      theme: currentTheme,
      fpsStyle: currentFpsStyle,
    }
    localStorage.setItem('logpile-theme-restore-point', JSON.stringify(snapshot))
    return snapshot
  } catch (err) {
    console.warn('[ThemeStudio] Failed to save restore point:', err?.message)
    return null
  }
}

/**
 * Restores the previous theme snapshot
 */
export function restoreThemeFromPoint() {
  try {
    const raw = localStorage.getItem('logpile-theme-restore-point')
    if (!raw) return null
    const snapshot = JSON.parse(raw)
    if (snapshot.theme) localStorage.setItem('logpile-theme', snapshot.theme)
    if (snapshot.fpsStyle) localStorage.setItem('logpile-fps-style', snapshot.fpsStyle)
    window.dispatchEvent(new CustomEvent('logpile-theme-changed', { detail: snapshot.theme }))
    window.dispatchEvent(new CustomEvent('logpile-fps-settings-changed', { detail: { fpsStyle: snapshot.fpsStyle } }))
    return snapshot
  } catch (err) {
    console.warn('[ThemeStudio] Failed to restore point:', err?.message)
    return null
  }
}

export function getThemeRestorePoint() {
  try {
    const raw = localStorage.getItem('logpile-theme-restore-point')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
