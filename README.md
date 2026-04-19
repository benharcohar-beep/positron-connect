# Positron Connect

A drop-in replacement for the Positron Capital Management contact page. Built as a self-contained static site — no build step, no backend.

## What it does

- Polished light/minimalist contact page matching the Positron site aesthetic
- **Live priority preview** as the user types (High / Medium / Low) with matched-keyword chips
- 3 numbered form sections, floating-label inputs, animated success state with AI summary
- **Internal Admin Console** (`/admin/`) — passcode-gated, separate dark theme, with:
  - Inbox: sortable submissions, priority badges, 14-day bar chart, breakdown by reason
  - Settings: HR notification email + admin passcode
- Submissions stored in `localStorage` for the demo (so the dashboard shows real data without a backend)

## Files

```
positron-connect/
├── index.html              — PUBLIC contact form (what customers/candidates see)
├── admin/
│   ├── index.html          — INTERNAL inbox (HR sees triaged submissions)
│   └── settings.html       — INTERNAL settings (HR email + admin passcode)
├── styles.css              — all styling (light public theme + dark admin theme)
├── app.js                  — priority heuristics, form, dashboard, gate
└── README.md
```

**Front-end / back-end separation:**
- The public site (`/`) has no link to the admin console — visitors only see the contact form.
- The admin console (`/admin/`) has its own dark internal-looking nav, requires a passcode, and is marked `noindex` so search engines won't surface it.
- Default admin passcode: **`positron2026`** — change it from the admin Settings page on first login.

## Run locally

Just open `index.html` in a browser. No server needed.

```sh
open index.html
```

## Deploy free

**Netlify Drop** (fastest):
1. Go to https://app.netlify.com/drop
2. Drag the `positron-connect` folder onto the page
3. Done — you get a public URL like `https://something.netlify.app`

**Vercel / GitHub Pages** also work — it's just static files.

## Going to production (notes for Positron)

**Storage:** the demo uses `localStorage` so submissions live in the browser. To wire it up for real, replace the `form.addEventListener("submit", ...)` block in `app.js` with a POST to either:

- **Formspree** (https://formspree.io) — free tier, just point the form `action` at a Formspree endpoint
- **Web3Forms** (https://web3forms.com) — similar, no backend needed
- A custom endpoint on your existing infrastructure

**Auth:** the admin passcode gate is client-side only — fine for a demo or low-stakes internal tool, but not real security. For production, put `/admin/` behind:
- A reverse-proxy with HTTP basic auth (Cloudflare Access, Netlify password protection, nginx), or
- Real session-based auth with a backend

The priority classifier (`classify()` in `app.js`) and summariser (`summarise()`) are pure functions — they can be reused on the server side to enrich the email subject line.

## Customise

- **Brand colours**: edit the `:root` block in `styles.css` (`--gold`, `--ink`, etc.)
- **Priority keywords**: edit the `HIGH` and `MED` arrays in `app.js`
- **Form fields**: edit the `<section class="step">` blocks in `index.html`
