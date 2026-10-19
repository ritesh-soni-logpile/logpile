# Logpile v1.2.0 UI Modernization — Handoff Document

> **Branch:** `feat/v1.2.0-modernization`  
> **Directory:** `d:\Gemini Project\Logpile_clean`  
> **Status:** Production build verified (`bun run build` passing cleanly in ~3.2s).  
> **Target Release:** Logpile v1.2.0 (Offline Windows Game Launcher)

---

## 1. Project & Architecture Context

- **What Logpile is:** Free, open-source (MIT) offline Windows game launcher.
- **Tech Stack:** Electron, React, Vite, Bun, Vanilla CSS (custom design system across 5 themes: Cinematic, Kinetic, Playful, Atmospheric, Competitive).
- **Core Principle:** Ritesh decides features, UX, branding, and testing. AI writes the code. Never claim Ritesh wrote code. No fake metrics, no buzzwords.

---

## 2. Completed Features & Resolved Issues

### Issue 1: Detail View Left Edge Alignment
- **Problem:** Game title, developer name, and "Play Now" action buttons in the detail view were crammed right against the left window border with zero breathing room.
- **Solution:** 
  - Updated `.detail-pane-content` and `.detail-hero-content` with adequate safe horizontal padding (`padding-left: 28px` minimum across all responsive breakpoints).
  - Ensures clean visual hierarchy and prevents any clipping on window resize.

### Issue 2: Page 1 Exact Viewport Docking & Cinematic Theme Footer Fix (Image 2)
- **Problem:** In Cinematic theme, the statusbar is hidden (`display: none !important`), but the hero container height formula subtracted 34px for a statusbar that did not exist. As a result, the container was 34px too short, leaving a 34px gap at the bottom where cards from the lower grid peeked through.
- **Solution:**
  - Defined CSS variable `--statusbar-height: 34px;` on `.app-shell`, and `--statusbar-height: 0px !important;` on `.app-shell.layout-cinematic`.
  - Updated `.home-hero-container:not(.is-collapsed)`:
    ```css
    height: calc(100vh - 42px - var(--statusbar-height, 34px) - 54px);
    min-height: 400px;
    margin-bottom: 0;
    ```
  - In Cinematic theme, the container now expands by exactly 34px, perfectly docking the toolbar as the footer and completely eliminating the grid cards peeking out at the bottom.

### Issue 3: Virtual Grid Header Bleed & Upward Shift Fix (Image 1)
- **Problem:** When scrolling down into the game grid, cards bled through above the sticky header `.library-top-bar` with a visible gap.
- **Root Cause:** In `src/App.jsx`, `scrollMargin` in `VirtualGrid` was reading `gridRef.current.offsetTop`. Because `.main-scroll` lacked `position: relative`, its `offsetParent` resolved to `.app-shell`, adding the 42px titlebar height to `scrollMargin`. This caused TanStack Virtual to translate every row 42px too high, pushing the first row directly into and above the sticky header.
- **Solution:**
  - Made `.main-scroll` `position: relative;` in `src/styles.css`.
  - In `src/App.jsx`, calculated `scrollMargin` accurately relative to the actual scroll element:
    ```javascript
    const scrollEl = scrollElementRef?.current
    if (gridRef.current && scrollEl) {
      const gridRect = gridRef.current.getBoundingClientRect()
      const scrollRect = scrollEl.getBoundingClientRect()
      const margin = Math.round(gridRect.top - scrollRect.top + scrollEl.scrollTop)
      setScrollMargin(Math.max(0, margin))
    }
    ```
  - Raised `.library-top-bar` `z-index` to 50 so grid rows pass cleanly behind it and are clipped at `top: 0` by `.main-scroll`.

### Issue 4: "Jump Back In" Cards Cut-Off Fix
- **Problem:** The game title, hours played, and store badge on the shelf cards were getting clipped horizontally and vertically.
- **Solution:**
  - Removed old `.library-top-bar::before` ceiling shield that had previously been masking the cards.
  - Re-architected `.shelf-card-info`:
    ```css
    .shelf-card-info {
      padding: 8px 10px 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      box-sizing: border-box;
      flex: 0 0 auto;
    }
    ```
  - Added line-height constraints (`line-height: 1.25` on name, `line-height: 1` on meta) and styled `.shelf-card-platform` as a clean, rounded pill badge (`padding: 1.5px 6px; border-radius: 4px; background: rgba(255, 255, 255, 0.07)`).

### Issue 5: Seamless Color Merging in Atmospheric and Playful Themes (Image 4)
- **Problem:** In Atmospheric and Playful themes, `.library-top-bar` rendered an opaque dark box that cut across the subtle green atmospheric fog or the playful dot matrix pattern.
- **Solution:**
  - Updated Atmospheric top bar to match the translucent obsidian green glass of `.home-spotlight`:
    ```css
    .layout-atmospheric .library-top-bar {
      background: rgba(6, 10, 9, 0.92) !important;
      backdrop-filter: blur(24px) !important;
      border-bottom: 1px solid rgba(16, 185, 129, 0.15) !important;
      margin-bottom: 8px !important;
    }
    ```
  - Updated Playful top bar to match the cozy obsidian glass of `.home-spotlight`:
    ```css
    .layout-playful .library-top-bar {
      background: rgba(14, 16, 26, 0.92) !important;
      backdrop-filter: blur(24px) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
      margin-bottom: 8px !important;
    }
    ```
  - Also aligned Cinematic theme top bar:
    ```css
    .layout-cinematic .library-top-bar {
      background: rgba(8, 11, 18, 0.94) !important;
      backdrop-filter: blur(24px) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
      margin-bottom: 8px !important;
    }
    ```

### Issue 6: Spotlight Hero Right-Side Game Cards Enlargement (Image 3)
- **Problem:** The 5 game cards on the right of the Spotlight Hero banner (`.home-spotlight-switcher`) were too small (24x32px thumbnails and 11px text), looking cramped and difficult to read.
- **Solution:**
  - Expanded rail width from `220px` to `clamp(260px, 22vw, 300px)`.
  - Increased pill padding from `3px 8px` to `6px 12px` with a `10px` gap.
  - Enlarged cover thumbnail from `24x32px` to `36x48px` (`border-radius: 6px`).
  - Increased title font size to `13px` (`font-weight: 700; line-height: 1.25`) with clean truncation.
  - Increased subtitle to `11px` (`font-weight: 500; opacity: 0.6; line-height: 1`).
  - Active pill now glows with enhanced accent ring and subtle shadow.

### Issue 7: Full-Bleed Edge-to-Edge Toolbar & Card Bleed Resolution Across All 5 Themes
- **Problem:** 
  - `.library-top-bar` looked like an isolated floating "weird box" with 32px gaps on the left (sidebar) and right (scrollbar), instead of spanning the full width as an integrated desktop deck.
  - When docked as a footer on Page 1, a `margin-bottom: 8px !important;` in all 5 themes pushed the toolbar down, exposing an orange card sliver from the lower grid.
  - In Kinetic and other themes, when scrolled down into the grid, the transparent titlebar above the sticky toolbar allowed cards or background patterns to bleed through above the header.
- **Solution:**
  - **Full-Bleed Responsive Toolbar:** Applied negative horizontal margins matching `.main-scroll` padding (`margin-left: -32px !important; margin-right: -32px !important; padding: 0 32px !important; width: calc(100% + 64px) !important;` with responsive breakpoints at 1100px, 720px, and 650px). The toolbar now connects flush from the left sidebar to the right edge with zero side gaps.
  - **Zero Bottom Margin & Exact 54px Height:** Eliminated `margin-bottom: 8px !important;` across all themes and enforced `height: 54px !important; min-height: 54px !important; max-height: 54px !important; box-sizing: border-box !important; margin: 0 !important;`.
  - **Zero Footer Card Bleed:** Set `.home-hero-container:not(.is-collapsed)` to `height: calc(100vh - 42px - var(--statusbar-height, 34px) - 54px) !important; max-height: ... !important; overflow: hidden !important;`. On Page 1, the Hero + Toolbar matches exactly 100% of `.main-scroll` visible height with 0px of grid cards peeking out.
  - **Header Ceiling Seal (Kinetic & All Themes):** Configured `.app-shell:not(.is-detail-view) .titlebar` with solid `background: #000000 !important;` (and `#f8fafc` in light mode), keeping `background: transparent !important;` only for `.is-detail-view`. When scrolled down, the 42px titlebar and 54px sticky toolbar form a unified, seamless 96px header deck with zero card bleeding above or behind.

### Issue 8: Header Subpixel Card Bleed Resolution Across All Themes
- **Problem:**
  - In `media_1792311642876_5d361cde.png`, when scrolling down into the game collection grid, a thin 1-2px horizontal sliver of game card artwork was visible right between the bottom of the titlebar and the top of the sticky `.library-top-bar`.
  - Cause: In Chromium rendering, subpixel rounding and fractional scroll positions (`scrollTop` with decimals, display DPI scaling 125%/150%) allow cards travelling upward behind the sticky toolbar to become visible before hitting the container's top boundary.
- **Solution:**
  - **Titlebar Downward Overlap Shield:** Added `.app-shell:not(.is-detail-view) .titlebar::after` extending 4px downward (`bottom: -4px; height: 4px; z-index: 99; pointer-events: none;`) in solid `#000000` (or `#f8fafc` in light mode), with `display: none` in `.is-detail-view`.
  - **Sticky Top Bar Upward Ceiling Shield:** Added `.library-top-bar::before` extending 8px upward (`top: -8px; height: 9px; z-index: 51; pointer-events: none;`) in solid `#000000` (or `#f8fafc` in light mode).
  - **Negative Sticky Anchor & Box-Shadow:** Set `.library-top-bar` to `top: -1px !important;` and added `box-shadow: 0 -4px 0 0 #000000 !important;` (and `0 -4px 0 0 #f8fafc !important;` in light mode) across base and all 5 themes (Kinetic, Atmospheric, Playful, Competitive, Cinematic).

### Issue 9: Jump Back In Shelf Card Artwork Framing
- **Problem:** Game cards in the recent shelf were clipping artwork at the top and bottom when aspect ratios deviated from standard poster dimensions.
- **Solution:**
  - Implemented `ShelfCardArt` with 16:9 responsive aspect ratio.
  - Used centered `object-contain` for primary artwork with an ambient blurred backdrop fallback for non-standard artwork formats, guaranteeing zero top/bottom clipping.

### Issue 10: Complete Neutralization of Blue/Slate Undertones in Settings & System Health
- **Problem:** Settings inputs, panel cards, system overview stat cards, and recent sync activity table lines still showed subtle navy/slate blue tints (`#1a202c`, `#2c323c`, etc.).
- **Solution:**
  - Standardized all Settings input fields (`.provider-input`, `.provider-select`, `.artwork-input`) to `#050505` with `rgba(255, 255, 255, 0.08)` borders.
  - Set all container cards (`.metadata-providers-card`, `.database-management`, `.artwork-manager`, `.advanced-diagnostics-section`, `.hidden-items-panel`) to `#0a0a0a !important`.
  - System health 8 stat cards set to pure neutral `#0a0a0a !important`; disk and spec badges converted to neutral `rgba(255, 255, 255, 0.08)`.
  - Sync activity table dividers and background fills set to pure neutral `rgba(255, 255, 255, 0.06)`.

### Issue 11: Franchise / Series Carousel Scrollbar & Overlap Fix Across All 5 Themes
- **Problem:**
  - In `cinematic`, `kinetic`, and `atmospheric`: The franchise series carousel was clustered against the "MEDIA & CAPTURES - Visual Showcase" header, overlapping the title.
  - In `playful` and `competitive`: Negative margins caused the scrollbar to sit outside the card border ("out of the box cutout").
  - Native browser scrollbar buttons rendered awkward triangular arrow cutouts (`◂` / `▸`).
- **Solution:**
  - Removed negative margins (`margin: -36px -20px`) on `.franchise-scroll-track` and `.cinematic-series-row`.
  - For `cinematic`, `kinetic`, `atmospheric`: Added `margin-bottom: 28px !important` separating the carousel track from the media showcase header.
  - For `playful`, `competitive`: Set margins to `0` and internal padding to `8px 4px 12px 4px`, locking the scrollbar 100% inside the card box.
  - Added strict webkit button suppression (`::-webkit-scrollbar-button`, `:single-button`, `:start`, `:end { display: none !important; }`) and styled custom 4px pill thumbs in neutral translucent white.

### Issue 12: SteamGridDB Artwork Resolution Preference Selector
- **Problem:** No granular control over hero artwork download sizes, leading to unnecessarily large downloads or low-res images.
- **Solution:**
  - Added resolution preferences (`720p`, `1080p`, `2.5k`, `4k`) in `src/main/services/artworkService.cjs` with smart dimension queries and WebP prioritization.

### Issue 13: Amazon Games Scanner Integration
- **Problem:** Amazon Games titles were not detected during local disk scans.
- **Solution:**
  - Created `src/main/services/scanners/amazonScanner.cjs` scanning local SQLite (`GameInstallInfo.sqlite`) and `fuel.json` manifests.
  - Integrated into `scanService.cjs` and mapped launcher protocol (`amazon-games://`) and UI badges.

---

## 3. Visual Experience Map

### Page 1 (At Launch / Initial State)
```text
┌────────────────────────────────────────────────────────────────────────┐
│ [← Back to Library]                    LOGPILE                 [— □ ✕] │ <- Titlebar (42px)
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ★ SPOTLIGHT BANNER (Hero Game Showcase)                               │
│  [Wide Artwork / Ambient Glow]             [Large Switcher Rail]       │
│  Title: A PLAGUE TALE: REQUIEM             - Hogwarts Legacy (155h)    │
│  Status: Installed · 8.2h played           - GTA V (154h)              │
│  [▶ Play Now]  [View Details]              - Red Dead 2 (110h)         │
│                                            - Assassin's Creed (42h)    │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  ⚡ JUMP BACK IN (Recent Games Shelf - 16:9 Unclipped Cards)            │
│  [ Card 1 ]   [ Card 2 ]   [ Card 3 ]   [ Card 4 ]   [ Card 5 ]        │
├────────────────────────────────────────────────────────────────────────┤
│  ▼ ALL GAMES (Filter Toolbar: Title A-Z, Genres, Backlog...)           │ <- Docked Footer
└────────────────────────────────────────────────────────────────────────┘ <- Statusbar (0px in Cine, 34px in others)
   (Zero cards from the lower grid are visible until the user scrolls)
```

### Page 2 (After User Scrolls Down)
```text
┌────────────────────────────────────────────────────────────────────────┐
│ [← Back to Library]                    LOGPILE                 [— □ ✕] │ <- Titlebar (42px)
├────────────────────────────────────────────────────────────────────────┤
│  ▼ ALL GAMES (Filter Toolbar: Title A-Z, Genres, Backlog...)           │ <- STICKY HEADER (z-index: 50)
├────────────────────────────────────────────────────────────────────────┤
│  [Poster 1]      [Poster 2]      [Poster 3]      [Poster 4]            │
│  [Poster 5]      [Poster 6]      [Poster 7]      [Poster 8]            │
│  [Poster 9]      [Poster 10]     [Poster 11]     [Poster 12]           │
└────────────────────────────────────────────────────────────────────────┘
   (Scrolls smoothly with virtualized grid correctly offset behind sticky header)
```

---

## 4. Key Files & Selectors

| File | Key Area | Purpose |
| :--- | :--- | :--- |
| `src/App.jsx` | `HomeHero` / `JumpBackInShelf` | Extracts recently played/installed games (up to 6), renders Spotlight & cards. |
| `src/App.jsx` | `VirtualGrid` | Virtualized grid with accurate `scrollMargin` calculation relative to `scrollEl`. |
| `src/App.jsx` | `LibraryTopBar` | Toolbar with search, filters, sorting, view mode toggles, and compact hero button. |
| `src/styles.css` | `.home-hero-container` | Controls Page 1 full-viewport height calculation via `--statusbar-height`. |
| `src/styles.css` | `.home-spotlight-switcher` | Expanded right-rail carousel with enlarged thumbnails and readable titles. |
| `src/styles.css` | `.jump-shelf`, `.shelf-card` | Horizontal shelf container, cover art aspect ratio, and metadata pill badge. |
| `src/styles.css` | `.library-top-bar` | Sticky positioning, edge padding, and theme backdrop colors across all 5 themes. |
| `src/styles.css` | `.detail-pane-content` | Left safe margin / padding for game title and developer metadata. |
| `src/styles.css` | `.franchise-scroll-track` | Refined scrollbar styling, no overlap, padded within card bounds. |
| `src/main/services/scanners/amazonScanner.cjs` | Amazon Scanner | Auto-detects installed Amazon Games via SQLite and `fuel.json`. |
| `src/main/services/artworkService.cjs` | Artwork Service | SteamGridDB resolution preferences (720p, 1080p, 2.5k, 4k). |

---

## 5. Build & Development Commands

```powershell
# Development server (runs on Vite)
bun run dev

# Production build verification
bun node_modules/vite/bin/vite.js build

# Package Electron release installer
npm run dist
```

---

## 6. Ideas on Deck (User Backlog)

1. **Themed Cinematic Intro Screens (User Concept):**
   - Cinematic: IMAX / Netflix style wide opening bumper.
   - Kinetic: High-speed adrenaline F1 / MotoGP countdown lights.
   - Playful: Retro Atari / arcade boot sequence.
   - Atmospheric: Silent Hill / Resident Evil fog and low-frequency rumble.
   - Competitive: Esports tournament stats HUD sweep.
   *(Note: Concept pitched by user; scheduled for a post-v1.2.0 milestone).*
