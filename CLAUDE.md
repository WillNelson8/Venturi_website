# Venturi Website — Claude Code Guide

Full context for editing this site in future sessions. Read this before making any changes.

## What this is

Static HTML/CSS marketing site for **Venturi** — an iPad app for aircraft cost management (co-ownership splits, maintenance records, logbook, forecasting). The site is pre-launch, so the primary conversion goal is **email signup for early access**, not App Store downloads.

Hosted on GitHub Pages at `https://willnelson8.github.io/Venturi_website/` (or custom domain if configured).

---

## File structure

```
Venturi_website/
├── index.html        # Main landing page — the only page you'll usually edit
├── styles.css        # All styles for index.html
├── signup.js         # Supabase email capture logic — do not modify unless changing email provider
├── support.html      # Support & FAQ — standalone page, has its own inline styles
├── privacy.html      # Privacy Policy — standalone page, has its own inline styles
├── terms.html        # Terms of Service — standalone page, has its own inline styles
├── README.md         # Basic project overview
└── CLAUDE.md         # This file
```

---

## Design system

### Color palette

| Variable | Value | Used for |
|---|---|---|
| `--bg` | `#071524` | Page background, hero, CTA section |
| `--bg-2` | `#0D1F38` | Stats bar, app preview section, signup bg |
| `--bg-3` | `#0F2645` | iPad frame, hero gradient end |
| `--surface` | `rgba(255,255,255,0.04)` | Feature card backgrounds |
| `--surface-hover` | `rgba(255,255,255,0.07)` | Feature card hover state |
| `--border` | `rgba(255,255,255,0.08)` | Default borders |
| `--border-bright` | `rgba(255,255,255,0.14)` | Highlighted borders |
| `--blue` | `#3B82F6` | Feature icons, stat numbers, preview dots, secondary accents |
| `--amber` | `#F59E0B` | ALL primary CTAs and signup elements — the conversion color |
| `--amber-bright` | `#FCD34D` | Amber hover/emphasis states |
| `--text` | `#FFFFFF` | Primary text |
| `--text-2` | `rgba(255,255,255,0.70)` | Body copy, subtitles |
| `--text-3` | `rgba(255,255,255,0.38)` | Captions, disclaimers, muted labels |

**Design rule:** Blue = informational/features. Amber = action/conversion. Never use amber for non-CTA elements or it loses its signaling power.

### Typography

Font: **Inter** (loaded from Google Fonts). Falls back to `-apple-system, BlinkMacSystemFont`.

| Element | Size | Weight |
|---|---|---|
| Hero H1 | 60px | 800 |
| Section titles | 40–42px | 800 |
| Feature card titles | 18px | 700 |
| Body / subtitle | 17–18px | 400 |
| Small / captions | 13px | 400–500 |
| Eyebrow labels | 11px | 700, uppercase, 0.09em tracking |

### Textures (CSS only — no image files)

Each section has a distinct background texture applied via `::before` pseudo-elements:

- **Hero**: radial dot grid (36px spacing), fades from top via mask
- **Features**: crosshatch line grid (56px spacing), fades at top/bottom edges
- **App Preview**: diagonal stripe pattern (28px spacing, -45deg)
- **Signup**: radial dot grid (28px spacing), radial-masked to center
- **Site-wide grain**: `body::after` — fractal noise SVG at 3.2% opacity, fixed position

To remove any texture, delete the corresponding `::before` block in `styles.css`.

---

## Page sections (in order)

### 1. Nav
- Sticky, glassmorphism blur (`backdrop-filter: blur(24px)`)
- Links: Features → `#features`, Preview → `#app-preview`, Support → `support.html`, Privacy → `privacy.html`
- CTA pill: "Get Early Access" in amber → `#preview` (the signup card)

### 2. Hero (`section.hero`)
- Dot-grid texture + radial blue glow at top
- Two-column grid: left = copy + inline email form, right = iPad SVG mockup
- "Beta launching soon" eyebrow pill with pulsing amber dot
- Primary CTA: inline email form (amber border + amber submit button)
- Secondary: muted App Store link with "Coming Soon" tag — update href and remove tag when app launches

### 3. Stats bar (`.stats-bar`)
- Three stats: 10+ cost categories, 360° visibility, 0 missed due dates
- Update these numbers as the product grows

### 4. Features (`section#features`)
- Crosshatch texture
- 3-column card grid (collapses to 2 on tablet, 1 on mobile)
- 6 feature cards: Cost Splits, Maintenance Records, Logbook, Analytics, Forecasting, Security
- Blue icon badges on each card

### 5. App Preview (`section#app-preview`)
- Diagonal stripe texture
- Two-column: left = iPad SVG showing Logbook + Analytics screens, right = copy with bullet callouts
- Nav "Preview" link lands here

### 6. Email Signup (`section#preview`)
- Amber-bordered card with radial dot texture and amber glow behind it
- "Beta Access" badge with pulsing dot
- **This is the main conversion section** — `id="preview"` matches original site convention
- Hero form submits into this form's logic via JS at bottom of index.html

### 7. CTA (`section.cta`)
- Minimal — just headline, subtext, amber outline button back to `#preview`
- Blue radial glow at bottom

### 8. Footer
- Links: Support, Privacy Policy, Terms of Service (all relative paths)

---

## Community forum (added 2026-06-10)

Public-read forum backed by the SAME Supabase project and auth as the iOS app.

- `forum.html` — thread list + category chips + new-thread composer (auth-gated)
- `thread.html?id=<uuid>` — thread view + replies; reply form requires sign-in
- `login.html` — sign in / create account / password reset; accounts are full
  Venturi app accounts (signUp passes `pilot_name` metadata; the backend
  `handle_new_user` trigger creates the `profiles` row the app uses)
- `forum.css` / `forum.js` — shared styles (glass theme) and logic for all three
  pages; pages declare themselves via `<body data-page="forum|thread|login">`
- Tables: `forum_categories`, `forum_threads`, `forum_posts` (RLS: world read,
  authenticated write own). Migration lives in the app repo:
  `~/Desktop/Venturi/Venturi/supabase/migrations/20260610_forum.sql`
- `index.html` nav has a "Community" link and an auth-aware "Log In" link that
  swaps to the pilot's name by reading the Supabase session from localStorage
- Render user content with textContent only (XSS); never innerHTML

## Email signup (Supabase)

Handled by `signup.js`. The form IDs it expects:
- `#signupForm` — the main signup form in section#preview
- `#signupEmail` — the email input
- `#signupSubmit` — the submit button
- `#signupMessage` — success/error message display

The hero form (`#heroSignupForm`, `#heroEmail`) is wired in a `<script>` block at the bottom of `index.html` — it copies the email into the main form and triggers submit, then smooth-scrolls to `#preview`.

Do not rename these IDs without also updating `signup.js`.

---

## When the app launches

Three things to update in `index.html`:

1. **Hero App Store link** — find `.hero-app-store` and update `href="#"` to the real App Store URL, then remove `<span class="coming-soon-tag">Coming Soon</span>`
2. **Eyebrow pill** — change "Beta launching soon" to something like "Available on iPad"
3. **Signup section** — optionally swap the amber signup card for a download CTA once signups are no longer needed

---

## Deployment

Site deploys via **GitHub Pages** from the `main` branch.

- Repo: `https://github.com/WillNelson8/Venturi_website`
- To deploy: `git add . && git commit -m "message" && git push origin main`
- GitHub Pages picks up the push automatically within ~60 seconds

To enable GitHub Pages (if not yet configured):
1. Go to repo Settings → Pages
2. Source: Deploy from branch → `main` → `/ (root)`
3. Save

---

## Local development

```bash
cd ~/Desktop/Venturi\ Handoff/Venturi_website
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## What NOT to touch

- `signup.js` — Supabase config and form logic. Only edit if changing email provider.
- `support.html`, `privacy.html`, `terms.html` — these have their own inline styles and are legal/support pages. Edit content carefully.
- `.gitattributes` — leave as-is
