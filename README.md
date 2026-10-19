<img width="1024" height="571" alt="social-preview" src="https://github.com/user-attachments/assets/5eb6f884-294d-4e16-bb28-f05a37eea270" />

# Logpile Desktop (v1.2.0)

A fast, offline Windows game launcher that brings your games from Steam, Epic, GOG, Amazon, and standalone installs into one clean place. No accounts, no background tracking, and no store bloat.

---

## Why Logpile?

I built this because I got tired of opening five different launchers just to figure out what to play. At first, I tracked my installed games in an Excel sheet and used a roulette wheel when I couldn't pick something from my backlog. But updating spreadsheets by hand every time a game installed or uninstalled got painful quickly.

So I built Logpile to solve that: scan your drives automatically, pull high-res artwork, keep all your data on your own PC in an SQLite database, and let you launch your games without corporate storefronts getting in the way.

### How it was built
I don't write code. I designed the features, layout, and workflow, and I tested every single build. AI coding tools wrote the code. Logpile is 100% free and open source under the MIT license.

---

### In-App Screenshots

#### 🌟 Home View: Spotlight & "Jump Back In" Shelf
<img width="1920" height="1032" alt="Home Page - Spotlight & Jump Back In Shelf" src="https://github.com/user-attachments/assets/9937b518-281c-4e19-8629-532f66ebc12f" />

#### 🎮 5 Visual Themes

**Cinematic Theme**
<img width="1920" height="1032" alt="Cinematic Theme" src="https://github.com/user-attachments/assets/3a94313c-b00a-47e5-8d34-c7907c9db9bf" />

**Kinetic Theme**
<img width="1920" height="1032" alt="Kinetic Theme" src="https://github.com/user-attachments/assets/7e516793-df30-4df6-aa4b-cd8c8cd0c033" />

**Atmospheric Theme**
<img width="1920" height="1032" alt="Atmospheric Theme" src="https://github.com/user-attachments/assets/566a1521-c630-405b-9fb5-f52bdf5726ad" />

**Playful Theme**
<img width="1920" height="1032" alt="Playful Theme" src="https://github.com/user-attachments/assets/6b3660eb-6e82-4773-8d1d-2bfb5aa93d12" />

**Competitive Theme**
<img width="1920" height="1032" alt="Competitive Theme" src="https://github.com/user-attachments/assets/e3d21c93-aa33-4e15-a7ff-f5a448d10a5a" />

#### 🎲 Game Roulette
[roulette-demo.webm](https://github.com/user-attachments/assets/a3610ff5-2637-41a3-a1ab-769caaf4997c)

#### 📊 Library Health & Diagnostics
<img width="1577" height="196" alt="Library Health" src="https://github.com/user-attachments/assets/0bc1dbdf-af68-4a1e-ab5b-dd1666bdd238" />
<img width="1603" height="350" alt="Library Overview" src="https://github.com/user-attachments/assets/70f1d5aa-fd55-4355-9999-767f3f374dc4" />

---

### What Logpile does

- **Works 100% offline**: All your data stays on your PC in a local SQLite database. It doesn't phone home, doesn't run background telemetry, and never asks you to log into an account.
- **Auto-scans your drives**: Finds games installed from Steam, Epic Games, GOG, and Amazon Games without manual folder browsing.
- **Supports standalone & DRM-free games**: You can add any executable directly, with custom launch parameters.
- **5 visual themes**: Switch between Cinematic, Kinetic, Atmospheric, Playful, and Competitive layouts whenever you want.
- **Spotlight & Jump Back In**: Fast hero banner showing your recent game, paired with a quick-access shelf for installed titles and a `Ctrl+H` compact shortcut.
- **Today's Pick roulette**: A built-in wheel that picks a random game from your installed backlog when you can't decide what to play.
- **Official box art & covers**: Pulls official vertical box art, heroes, and logos via SteamGridDB and IGDB.
- **Status tracking**: Tag games as Playing, On Pause, Completed, or Unplayed so you always know where you left off.
- **Self-contained data folder (`logpile_data`)**: Stores your databases, backups, logs, and artwork cache alongside the app so it doesn't clutter your C: drive AppData.
- **Backup & export**: One-click SQLite backups and CSV/JSON exports so you own your catalog data.

---

## Download & Install

Grab the latest build from the [Releases](https://github.com/ritesh-soni-logpile/logpile/releases) page:

1. **Installer**: Download `Logpile Setup 1.2.0.exe` and run the setup wizard.
2. **Portable**: Download `Logpile-v1.2.0-Portable.zip`, unzip it anywhere, and launch `Logpile.exe`.

### Windows SmartScreen Note
> *Because Logpile is a free, independent open-source project and does not have an expensive corporate signing certificate, Windows SmartScreen will show an "Unknown Publisher" prompt on first launch. Click **More info** and then **Run anyway** to open it.*

### Recommended Install Path
We recommend installing to your dedicated games drive (like `D:\Logpile` or `D:\Games\Logpile`). Logpile keeps your database, backups, and artwork cache inside a self-contained `logpile_data` folder in that directory.

### Updating & Uninstalling
- **Updating**: Download the newest installer from Releases and select your existing install folder. Your library and settings in `logpile_data` stay untouched.
- **Uninstalling**: The uninstaller asks whether you want to keep or delete your `logpile_data` folder.

---

## Artwork & Metadata Setup (Optional API Keys)

Logpile works offline immediately. If you want it to fetch official covers, backdrops, and descriptions automatically, you can add your free personal API keys in **Settings**:

### 1. SteamGridDB (Covers, Heroes & Logos)
1. Sign up for a free account at [steamgriddb.com](https://www.steamgriddb.com).
2. Open your profile &rarr; **Preferences** &rarr; **API**.
3. Click **Generate API Key**, copy it, and paste it into Logpile's **Settings**.

### 2. IGDB (Game Summaries, Genres & Release Dates)
1. Log into the [Twitch Developer Console](https://dev.twitch.tv/console) with your Twitch account.
2. Under **Applications**, click **Register Your Application**.
3. Set Name to `Logpile`, Category to `Application Integration`, and OAuth Redirect URL to `http://localhost`.
4. Copy your **Client ID** and generate a **Client Secret**, then paste both into Logpile's **Settings**.

---

## Support the Project

Logpile is completely free and open-source software (MIT) created by **Corporate Introvert Gamer (Ritesh Soni)**. If it makes managing your game backlog easier, you can support future development here:

- **Ko-fi**: [ko-fi.com/corporateintrovertgamer](https://ko-fi.com/corporateintrovertgamer)
- **Buy Me a Coffee**: [buymeacoffee.com/Corporateintrovertgamer](https://buymeacoffee.com/Corporateintrovertgamer)
- **GitHub**: [github.com/ritesh-soni-logpile](https://github.com/ritesh-soni-logpile)

---

## Known Limits

- Windows only (Windows 10 / 11 64-bit).
- Unsigned installer, so Windows SmartScreen displays a warning on first launch.
- Your SteamGridDB and IGDB keys are stored locally in your SQLite database. Do not share your database or backup files publicly.
- Runs on Electron 34 with local SQLite database storage.

---

## Credits & License

- Artwork provided by [SteamGridDB](https://www.steamgriddb.com).
- Metadata provided by [IGDB](https://www.igdb.com).

All game titles, storefront names, and logos belong to their respective owners. Logpile is an independent open-source project and is not affiliated with, sponsored by, or endorsed by Valve, Epic Games, CD Projekt, Amazon, Electronic Arts, or Ubisoft.

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2026 Corporate Introvert Gamer (Ritesh Soni)
```
