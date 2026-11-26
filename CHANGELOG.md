# Logpile — Changelog & Version History

All notable changes to [Logpile](https://github.com/ritesh-soni-logpile/logpile) are documented in this file.

---

## [v1.3.96] — 2026-11-26

### Epic Games v2 Migration, Native Netmarble & LoadingBay Scanners
- **Epic Games Dual-Engine (v1 + v2):** Seamlessly detects games from both legacy Epic manifests (`C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests\*.item`) and modern Epic v2 installations (`%LOCALAPPDATA%\com.epicgames.eglv2\installations.jsonl`), ensuring zero lost games during launcher updates.
- **Native Netmarble Launcher Scanner:** Directly reads Netmarble's launcher configuration (`%APPDATA%\Netmarble Launcher\config.json`) and Windows uninstall entries to discover titles like *Tower of God: NEW WORLD* and *Game of Thrones: Kingsroad*, preserving custom install paths and cover artwork.
- **Native NetEase / LoadingBay Scanner:** Deep registry indexing for LoadingBay games (`HKCU\SOFTWARE\LoadingBay\LoadingBayInstaller\game\*`) such as *Identity V* and *Once Human* with native `loadingbay://` launch URI execution.
- **Exclusion Filter Hardening:** Ignores launcher binaries (`LoadingBay.exe`, `Rockstar Games SDK`, background redistributables) so only real playable games enter the library.
- **Storefront Filter Isolation in Installed View:** Selecting a storefront filter (Steam, Epic, GOG, etc.) in the **Installed** workspace view strictly filters to copies installed on that specific storefront.
- **EA Title Cleaner:** Automatic normalization for EA titles with corrupted trademark characters (e.g. `UNRAVELT two` -> `Unravel Two`).
- **Franchise Stem Matcher Fix:** Resolved ReferenceError in franchise stem extraction during Game Dossier navigation.

---

## [v1.3.95] — 2026-11-25

### Universal PC Storefront & Custom Folder Scanning
- **20+ Supported PC Platforms & Launchers:** Automatic local detection across **Steam**, **Epic Games**, **GOG**, **Xbox / Microsoft Store**, **EA App / Origin**, **Ubisoft Connect**, **Amazon Games**, **itch.io** (`butler.db`), **Battle.net**, **Riot Games**, **Rockstar Games Launcher**, **CD Projekt REDlauncher**, **Netmarble**, **NetEase**, **Legacy Games**, **HoYoPlay (HoYoverse)**, **Humble App**, **Wargaming Game Center**, **Gaijin**, **Nexon**, **Kuro Games**, **Roblox**, and standalone MMO/repack clients.
- **Custom Game Scan Folders:** Add custom library directories (such as `D:\Games` or portable SSD game folders) in **Settings** to automatically detect DRM-free, portable, and standalone titles without adding games one by one.
- **Multi-Store Linking, Icons & Launch Support:** Distinct storefront icons, platform badges, launch argument persistence (for Riot Client & custom launchers), Excel/CSV auto-labeling, and background launcher process protection during playtime tracking.
- **Cross-Store Deduplication & Duplicate Install Advisor:** Unified matching across editions and naming styles (e.g., *GTA V* / *Grand Theft Auto V Legacy* / *Enhanced* / *Premium Edition*, Roman numerals, abbreviations) plus a **Duplicate Installs & Storage Saver** panel in the Dashboard and Game Dossier that highlights games installed on 2+ storefronts, recommends which copy to keep, and shows reclaimable GB with quick Uninstall / Open Folder controls.

---

## [v1.3.9] — 2026-11-20

### 1. Big Picture Console Mode: 5 Distinct Theme Worlds
Press `F11`, `Ctrl+Shift+F`, or click **Console Mode** in the top bar to switch into a 10-foot couch and handheld interface. Every built-in theme swaps to its own dedicated layout and its own **Today's Pick** mechanic:
- **Cinematic:** Full-bleed IMAX screening room hero with lower-left gold marquee, bottom title counter, and a centered Today's Pick card with an internal `16:9` reel.
- **Playful:** 3-slot wrap-around `16:9` landscape tile carousel over a dotted charcoal canvas with unobstructed artwork and a floating Surprise Capsule for Daily Pick.
- **Atmospheric:** Survival-horror save-room view with `16:9` landscape artwork behind drifting mist, a 5-row sliding vertical Case Ledger (`Up`/`Down`), right-side case details, and an Analog Signal Receiver + `16:9` Signal Monitor for Daily Pick.
- **Kinetic:** Dark asphalt motorsport HUD featuring a `-8deg` diagonal artwork split, speed-streak transitions, a 3-cell telemetry strip (`HRS_LOGGED`, `EST_RUN`, `DRIVE_STATE`), bounded 5-slot slanted Track Strip, and a 5-light Starting-Grid Gantry for Daily Pick.
- **Competitive:** 3-zone tactical match lobby with a 6-row left Roster Queue (storefront tags and status LEDs), corner-reticle showcase framing, bottom-right `DEPLOY NOW` / `QUEUE INSTALL` panel, and a Matchmaking Queue Scanner (`MATCH FOUND`) for Daily Pick.

### 2. Full Controller Navigation & Hardware-Adaptive Glyphs
- **End-to-End Gamepad Control:** Navigate the Desktop library, Sanctuary Spotlight, sidebar, top bar, Settings modal, and Game Dossier screens by controller, with wrap-around list stepping in Console Mode and `LT`/`RT` trigger support.
- **Auto-Detected Controller Prompts:** Automatically displays **Xbox**, **PlayStation** (`✕`, `○`, `▢`, `△`, `L1`/`R1`/`L2`/`R2`), or **Nintendo Switch** glyphs based on your connected gamepad, with manual override in Settings.
- **Uninstalled Title Triggers:** In Console Mode, `(A)` and primary action triggers route uninstalled titles directly through `installUri` (`DOWNLOAD NOW`, `DOWNLOAD`, `RETRIEVE`, `PIT INSTALL`, `QUEUE INSTALL`).
- **Multimodal Input:** Switch freely between controller, mouse, keyboard, and touch at any time.

### 3. Console Telemetry Ribbon & On-Screen Couch Keyboard
- **Top Telemetry Ribbon:** Displays category tabs (`Installed`, `Favorites`, `All Games`, `Today's Pick` / `Daily Pick`, `Search`, `AI Assistant`) via `LB`/`RB` or click, active search filter pill with one-click clear, connected controller/PC indicator, smart laptop/handheld battery readout (hidden on AC desktop PCs), 12-hour clock, Settings shortcut (`Start`), and **Return to Desktop**.
- **On-Screen Virtual Keyboard (OSK):** Search games using D-pad, mouse, or touch with live match counts, one-click clear, and simultaneous physical keyboard input.

### 4. Voice-First Console AI Companion & Privacy Controls
- **Push-to-Talk & Spoken Replies:** In Console Mode, press `[R3]` (or click the Voice orb) to dictate prompts, stream recognized speech into chat, hear TTS replies, navigate quick chips with the D-pad, or open the On-Screen Keyboard across theme-matched HUDs.
- **Enable Local Gaming AI Toggle:** Hide all AI Companion tabs and buttons cleanly across Desktop and Console modes when disabled.

---

## [v1.3.7] — 2026-11-15

### 1. Live Custom CSS Theme Studio & Synthesizer
Fine-tune sanctuary aesthetics down to the exact CSS selector. Features a real-time `<style>` injector, a natural-language theme synthesizer with instant 0ms offline keyword fallback, 8 inspiration presets (Gothic Obsidian, Cyber 2077, Nordic Frost, Synthwave Outrun, Emerald Temple, OLED Noir, Imperial Gold, Matrix Operator), monospace live editor, and 1-click `.css` file import and export.

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
Capture the entire scrollable Settings modal from top to bottom into a single high-resolution vertical PNG with 1:1 pixel alignment, zero horizontal seams, zero drop-shadow bleed, and clipboard copy.

### 4. 4K Ultra-Wide Brag Showcase Collage Engine
Export your game sanctuary into balanced 4K widescreen gallery posters (3840 × 6172). Features multi-line title wrapping, dynamic 10–14 column scaling, high-DPI aspect-fill poster rendering, and theme-variable color resolution.

---

## [v1.3.5] — 2026-11-10

### 1. Themed In-Game Performance HUDs
Over 50 custom HUD overlay styles matching your games—including MI6 007 Covert, Cyberpunk Netrunner, Witcher Wolf, Doom, GameBoy 8-Bit, and retro Winamp 1999.

### 2. Custom HUD Theme Studio
Build, modify, and save custom in-game performance HUDs directly inside the launcher with local models or offline presets.

### 3. Zero Desktop Idle GPU Drain & Hardware Guard
Completely halts background animation loops while idle or minimized, pulling 0.0% idle GPU power with dynamic VRAM caps and automatic AI memory purges.
