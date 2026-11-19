# 🎨 Logpile Daily Themes & Addons

Welcome to the official Logpile community theme repository!
A brand-new, production-ready theme addon is released here daily to keep the Logpile sanctuary evolving.

---

## 🚀 How to Install a Theme in Logpile

1. Click on any theme `.json` file below (e.g. `cyberpunk-2077.json`) and click **Download Raw**.
2. Open **Logpile** → Open **Settings (gear icon)** → Navigate to the **Themes & Addons** tab.
3. Click **Import Theme (.json)** and select your downloaded file.
4. That's it! The theme is installed instantly, added to your Sanctuary dropdown, and ready to play.

---

## 📦 Available Daily Themes

| Day | Theme Name | Aesthetic & Vibe | Author |
| :--- | :--- | :--- | :--- |
| **Day 1** | `cyberpunk-2077.json` | Night City Canary Yellow & High-Tech Cyan | Logpile Official |
| **Day 2** | `synthwave-80s.json` | Outrun Hot Neon Magenta & Cyan Grid | Logpile Official |
| **Day 3** | `oled-noir.json` | True #000000 Pitch Black & Razor White Accent | Logpile Official |
| **Day 4** | `gameboy-8bit.json` | 1989 Dot-Matrix Spinach LCD Green | Logpile Official |
| **Day 5** | `pipboy-terminal.json` | Fallout Amber/Green CRT Phosphor Scanlines | Logpile Official |
| **Day 6** | `steam-2004.json` | Nostalgic Half-Life 2 Valve Olive Khaki & Steel | Logpile Official |
| **Day 7** | `matrix-digital-rain.json` | Terminal Black & Phosphor Matrix Cascade | Logpile Official |
| **Day 8** | `nord-frost.json` | Arctic Deep Slate & Frosted Polar Blue | Logpile Official |

---

## 🛠️ How to Create Your Own Theme

Logpile themes are 100% offline JSON files with zero external dependencies. You can export any theme directly from **Settings > Themes & Addons > Export Current Theme**, or construct one using this schema:

```json
{
  "id": "my-custom-theme",
  "name": "My Custom Theme",
  "author": "Your Name",
  "tagline": "Brief description of the aesthetic",
  "version": "1.0.0",
  "category": "Sci-Fi / Retro / Minimalist / Fantasy",
  "palette": {
    "base": "#0a0a0f",
    "surface": "#12121a",
    "surfaceHover": "#1c1c28",
    "card": "#0f0f16",
    "textPrimary": "#ffffff",
    "textSecondary": "#94a3b8",
    "textMuted": "#64748b",
    "accent": "#fcee0a",
    "accentGlow": "rgba(252, 238, 10, 0.32)",
    "accentContrast": "#111000",
    "borderColor": "rgba(252, 238, 10, 0.18)",
    "borderHover": "rgba(0, 240, 255, 0.55)",
    "badgeBg": "rgba(252, 238, 10, 0.15)",
    "badgeText": "#fef08a"
  }
}
```

Submit a Pull Request with your `.json` file to be featured in the daily drops!
