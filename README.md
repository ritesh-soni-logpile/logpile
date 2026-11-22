# Logpile — Best Free Offline PC Game Launcher & Library Manager (Playnite Alternative)
> **The lightweight, open-source PC game launcher, library manager, and game saver for Windows. Built as an offline alternative to Playnite and GOG Galaxy. Unify games across Steam, Epic, GOG, and portable SSDs with automatic save backups, HowLongToBeat backlog tracking, 50+ custom HUD overlays, and zero cloud tracking.**

[![Release](https://img.shields.io/github/v/release/ritesh-soni-logpile/logpile?style=for-the-badge&color=22c55e)](../../releases/latest)
[![Platform](https://img.shields.io/badge/Platform-Windows-blue?style=for-the-badge&logo=windows)](../../releases/latest)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)
[![Zero Cloud](https://img.shields.io/badge/Telemetry-0%25%20Offline-emerald?style=for-the-badge)](#)
[![Website](https://img.shields.io/badge/Website-Live%20Site-00ad9f?style=for-the-badge&logo=netlify)](https://logpilegamelauncher.netlify.app)
[![itch.io](https://img.shields.io/badge/itch.io-Play%20Store-fa5c5c?style=for-the-badge&logo=itchdotio)](https://logpile.itch.io/logpile)
[![AlternativeTo](https://img.shields.io/badge/AlternativeTo-Listed-267ecb?style=for-the-badge)](https://alternativeto.net/software/logpile-desktop/about/)

<p align="center">
  <a href="https://github.com/ritesh-soni-logpile/logpile/releases/download/v1.3.7/Logpile.Setup.1.3.7.exe">
    <img src="https://img.shields.io/badge/Download-Installer%20(.exe)%20--%20v1.3.7-2ea44f?style=for-the-badge&logo=windows" alt="Download Installer" />
  </a>
  &nbsp;&nbsp;
  <a href="https://github.com/ritesh-soni-logpile/logpile/releases/download/v1.3.7/Logpile-v1.3.7-Portable.zip">
    <img src="https://img.shields.io/badge/Download-Portable%20(.zip)%20--%20v1.3.7-0969da?style=for-the-badge&logo=zip" alt="Download Portable" />
  </a>
</p>

<!-- Hero Demonstration -->
<p align="center">
  <img src="docs/assets/Install%20Library%2016-9.png" alt="Logpile Fast UI Demo" width="100%" />
</p>

## Why Gamers Choose Logpile (Playnite & GOG Galaxy Alternative)
Most PC game launchers and library managers are storefronts first. They run heavy web browsers in the background, demand account logins just to view games on your own drives, and break when Windows shifts an external SSD from `D:` to `E:`. They also leave you guessing whether a shared Steam Family title is actually free to play before you launch it.

Logpile is built for gamers who want the best offline PC game launcher, library manager, and game saver:
- **Playnite & GOG Galaxy Alternative:** Discovers and launches your games directly from disk without store logins, third-party sync plugins, or memory bloat.
- **Automated Game Saver:** Automatically monitors local game save folders and creates rolling timestamped ZIP backups before every session.
- **Portable SSD Path Healing:** Uses `{{PORTABLE_ROOT}}` variables to self-heal broken game paths when drive letters change.
- **50+ Themed Performance HUDs:** Custom in-game FPS and hardware telemetry overlays that pull 0.0% idle GPU power when minimized.
- **HowLongToBeat Backlog Tracker:** Built-in Excel and CSV backlog import with campaign debt calculation.
- **100% Offline & Private:** Open-source MIT license, zero network telemetry, and zero background services.

---

## At a Glance: Feature Comparison

<p align="center">
  <img src="docs/assets/comparison-table-v1.3.5.png" alt="Logpile v1.3.5 vs Competitors Comparison Matrix" width="100%" />
</p>

| Feature | Logpile v1.3.7 | Steam | Playnite | GOG Galaxy | LaunchBox |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Local Game Detection** | **Zero logins:** Scans drives & folders directly | Store account login required | Account logins required for library sync | GOG account login required | Account logins or store tokens required |
| **Bulk Backlog Import** | **Built-in:** Import entire uninstalled library via Excel / CSV | No (Single manual shortcut only) | Plugin required | No | Plugin required |
| **Portable Drive Path Healing** | **Built-in:** Auto-adapts when drive letters change (`D:` to `E:`) | Breaks on drive letter change | Breaks on drive letter change | Breaks on drive letter change | Breaks on drive letter change |
| **Live Steam Family Status** | **Yes:** Checks if shared game is free to play before launch | In-app store client only | No live check | No live check | No live check |
| **Automated Save Backups** | **Built-in:** Automatic rolling local ZIP archives | Cloud only (for supported games) | Plugin required (e.g. Ludusavi) | Cloud only (for supported games) | Plugin required |
| **Offline Strategy Guides** | **Built-in:** Offline guide, map & tip viewer | Community web browser tabs only | External browser links only | External browser links only | External browser links only |
| **Themed Performance HUD** | **50+ Custom Styles:** Themed in-game overlays (0% idle GPU) | Basic plain text FPS counter | Third-party tools needed (RTSS) | Basic plain text FPS counter | Third-party tools needed |
| **Theme Studio & Custom CSS** | **Built-in:** Live CSS injector, natural language synthesis, 8 community themes | No | Third-party skin plugins | No | Themes via community themes |
| **Full Page & 4K Brag Snaps** | **Built-in:** Continuous vertical settings capture & 4K UHD gallery posters | Basic desktop screenshot | Screenshot plugins | Basic screenshot | Basic screenshot |
| **Controller Auto-Detect** | **Yes:** Instant Windows plug-and-play detection | Big Picture mode or manual setup | Wake-up button press required | Manual setup / limited | Wake-up button press required |
| **Privacy & Offline First** | **100% Offline:** MIT open source, zero logins, zero tracking | Closed source, store accounts & tracking | Open source, relies on store logins | Closed source, accounts & telemetry | Closed source, logins for metadata |

---

## What's New in v1.3.7

### 1. Live Custom CSS Theme Studio & Synthesizer
Fine-tune your sanctuary aesthetics down to the exact CSS selector. Features a real-time `<style>` injector, a natural-language theme synthesizer with instant 0ms offline keyword fallback, 8 inspiration presets (Gothic Obsidian, Cyber 2077, Nordic Frost, Synthwave Outrun, Emerald Temple, OLED Noir, Imperial Gold, Matrix Operator), monospace live editor, and 1-click `.css` file import and export.

### 2. 8 Bundled Community Themes
Eight production-grade community themes ready to activate in one click:
- **Cyberpunk 2077:** Night City canary yellow, high-tech cyan, and dark carbon cards.
- **8-Bit Game Boy:** 1989 dot-matrix spinach LCD green with retro arcade framing.
- **Matrix Digital Rain:** Terminal phosphor green over pitch-black OLED background.
- **Nord Arctic Frost:** Arctic deep slate and frosted polar blue styling.
- **Pure OLED Stealth:** True #000000 pitch-black cards with razor-sharp white accents.
- **Pip-Boy 3000 Terminal:** Fallout wasteland amber and green scanline styling.
- **Steam 2004 Nostalgia:** Half-Life 2 launch valve olive khaki and brushed steel.
- **Synthwave 80s:** Outrun hot neon magenta and cyan grid aesthetic.

### 3. Continuous Full-Page Settings Snapshot
Capture the entire scrollable Settings modal from top to bottom into a single high-resolution vertical PNG. Programmatically scrolls and stitches cards with 1:1 native pixel alignment, zero horizontal seams, zero drop-shadow bleed, and preserves the full left sidebar navigation (all 12 tabs and version tag) with automatic clipboard copy.

### 4. 4K Ultra-Wide Brag Showcase Collage Engine
Export your game sanctuary into balanced 4K widescreen gallery posters (3840 × 6172). Features multi-line title wrapping to prevent name cutoffs, dynamic 10–14 column scaling, high-DPI aspect-fill poster rendering, and full theme-variable color resolution across all 5 core sanctuary themes (Cinematic, Atmospheric, Competitive, Kinetic, Playful) and 7 accent palettes.

### 5. In-Game Performance HUD & Telemetry Polish
Real-time Intel PresentMon graphics telemetry overlay with true 1% lows, frame times, CPU-bound bottleneck indicators (`CPU-LIM`), and full GPU/CPU thermal and clock monitoring across DirectX 11/12 and Vulkan titles with 0% idle desktop GPU draw.

### 6. Modern Setup & In-Place Upgrade Experience
Upgrading or installing Logpile is effortless: the custom setup wizard automatically detects existing installations, upgrading binaries in-place while keeping your game saves, library databases, and artwork caches 100% intact. Supports any custom internal drive or external SSD path without registry lock-in.

---

## What's New in v1.3.5

### 1. Themed In-Game Performance HUDs
Most performance overlays give you generic green numbers or force you to install third-party software like RivaTuner. Logpile includes over 50 custom HUD overlay styles that match what you're playing—including MI6 007 Covert, Cyberpunk Netrunner, Witcher Wolf, Doom, GameBoy 8-Bit, and retro Winamp 1999.

<p align="center">
  <img src="docs/assets/hud-theme-styles-stack.jpg" alt="Logpile Themed Performance HUD Styles" width="90%" />
</p>

### 2. Custom HUD Theme Studio
Build, modify, and save custom in-game performance HUDs directly inside the launcher. You can dial in themes manually or generate them from aesthetic prompts using local models or offline presets. Unmatched searches automatically fall back to clean neutral slate designs without breaking.

<p align="center">
  <img src="docs/assets/hud-theme-studio.jpg" alt="Logpile HUD Theme Studio" width="85%" />
</p>

### 3. Zero Desktop Idle GPU Drain & Hardware Guard
Running modern launchers on laptops or gaming handhelds often drains battery life due to constant desktop animation loops. Logpile completely kills background animation loops while sitting idle or minimized, pulling 0% idle GPU power. You can also configure dynamic VRAM caps and automatically purge AI models from RAM the moment a game launches.

<p align="center">
  <img src="docs/assets/settings-ai-hardware-guard.jpg" alt="Logpile AI Hardware Guard and Memory Purge" width="85%" />
</p>

### 4. Automatic Theme Transformation Splash
Switching themes now greets you with that theme's visual branding, spatial Web Audio, and logo animation. A single toggle in General Preferences lets you choose between cinematic transformations or instant theme switching.

<p align="center">
  <img src="docs/assets/settings-general-splash.jpg" alt="Logpile Transformation Splash Settings" width="85%" />
</p>

### 5. Customizable Global Shortcuts
Assign your own key combinations for library search, the in-game overlay, and the performance HUD toggle with built-in Excel conflict safety.

<p align="center">
  <img src="docs/assets/settings-custom-shortcuts.jpg" alt="Logpile Customizable Key Combinations" width="85%" />
</p>

---

## Visual Showcase & Architecture

### Dynamic Game Dossier Themes
Adapts visually per game with 5 hardware-accelerated aesthetic profiles: Cinematic, Atmospheric, Competitive, Kinetic, and Playful.

<p align="center">
  <img src="docs/assets/cinematic.png" width="48%" />
  <img src="docs/assets/atmosphere.png" width="48%" />
</p>
<p align="center">
  <img src="docs/assets/compitetive.png" width="48%" />
  <img src="docs/assets/kinetic.png" width="48%" />
</p>

### Backlog Intelligence & Sanctuary Analytics
Tracks your true gaming journey: backlog campaign debt (HLTB synced), source distribution, playtime curves, and local strategy guide indexing.

<p align="center">
  <img src="docs/assets/Sancutry%20Dashboard.png" alt="Sanctuary Dashboard" width="85%" />
</p>

---

## Architecture & Tech Stack
- **Shell:** Electron 34 with strict `contextIsolation: true`, zero raw IPC leaks, and sandbox-isolated window navigation.
- **Frontend:** React 18, Vite, Tailwind CSS, virtualized catalog grid, and native 60fps Gamepad API polling that auto-pauses during gameplay.
- **In-Game Telemetry:** Integrated Intel PresentMon (MIT License) for real-time DirectX 11/12 and Vulkan frame time velocity, true 1% lows, GPU/VRAM load, and hardware engine bottleneck detection without game DLL injection.
- **Local Database:** SQLite with FTS5 full-text indexing via `better-sqlite3`.
- **Offline Intelligence:** Embedded `node-llama-cpp` for local quantized GGUF inference + offline speech recognition (STT) and Windows native SAPI (TTS).

---

## Quickstart

### For Gamers
1. Grab the latest installer or portable archive from [Releases](../../releases/latest):
   - **Installer:** [`Logpile.Setup.1.3.7.exe`](https://github.com/ritesh-soni-logpile/logpile/releases/download/v1.3.7/Logpile.Setup.1.3.7.exe)
   - **Portable (.zip):** [`Logpile-v1.3.7-Portable.zip`](https://github.com/ritesh-soni-logpile/logpile/releases/download/v1.3.7/Logpile-v1.3.7-Portable.zip)
2. Extract or install to any internal drive or portable SSD (`logpile_data/` stores all assets self-contained).
3. *(Optional)* Drop any quantized `.gguf` model into the `/models` directory to enable offline conversational backlog guidance.

#### Recommended Offline AI Models (Optional)
To enable offline natural-language backlog search and theme suggestions, place any compatible quantized `.gguf` model into your local `/models` directory:

<!-- PASTE YOUR HUGGING FACE MODEL LIST AND LINKS HERE -->
{{PASTE YOUR HUGGING FACE MODEL LIST AND LINKS HERE}}

### For Developers
```bash
git clone https://github.com/ritesh-soni-logpile/logpile.git
cd logpile
npm install
npm run electron:dev
```

---

## Author & License

Logpile is designed, architected, and tested by **Corporate Introvert Gamer (Ritesh Soni)**.

This project is licensed under the [MIT License](LICENSE).

```
Copyright (c) 2026 Corporate Introvert Gamer (Ritesh Soni)
```

### Third-Party Software & Acknowledgments
- **Intel PresentMon:** In-game graphics telemetry powered by Intel PresentMon (MIT License). Copyright (c) Intel Corporation.
