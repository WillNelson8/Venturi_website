# Venturi Website

Marketing site for the Venturi iPad app — aircraft cost management for co-owners and private pilots.

## Stack

Pure static HTML/CSS/JS. No build step, no dependencies. Deployed via GitHub Pages.

## Files

```
├── index.html      # Landing page
├── styles.css      # All styles for index.html
├── signup.js       # Supabase early-access email capture
├── support.html    # Support & FAQ
├── privacy.html    # Privacy Policy
├── terms.html      # Terms of Service
└── CLAUDE.md       # Full design system + editing guide for Claude Code
```

## Local dev

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Push to `main` — GitHub Pages deploys automatically.

```bash
git add .
git commit -m "your message"
git push origin main
```

## Editing with Claude Code

Open `CLAUDE.md` for the full design system reference, section map, color palette, and notes on what to change when the app launches.

## Design

- **Theme**: Midnight Navy dark (`#071524`) with Inter typeface
- **Primary accent**: Amber `#F59E0B` — all CTAs and signup elements
- **Secondary accent**: Blue `#3B82F6` — features and informational elements
- **Textures**: CSS-only (dot grids, crosshatch, diagonal stripes, grain overlay)

## App Store requirements

- ✅ Support URL → `support.html`
- ✅ Privacy Policy URL → `privacy.html`
- ✅ Marketing URL → `index.html`

© 2025 Venturi Aviation. All rights reserved.
