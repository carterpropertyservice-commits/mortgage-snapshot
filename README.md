# Mortgage Snapshot Generator

Automated daily mortgage rate snapshot for Coastal NC.

## Setup

1. Add your logo to `assets/logo.png`
2. Set `FRED_API_KEY` in GitHub Secrets
3. Enable GitHub Pages (Source: GitHub Actions)

## Local Development
```bash
npm install
npx playwright install chromium
FRED_API_KEY=your_key npm run generate
```

## Outputs

- `public/index.html`
- `public/snapshot.pdf`
- `public/social/portrait.png` (1080×1350)
- `public/social/story.png` (1080×1920)
- `public/data/latest.json`

## FRED API Key

Get free: https://fred.stlouisfed.org/docs/api/api_key.html
```

---

**13) .env.example**
```
FRED_API_KEY=your_fred_api_key_here
```

---

**14) .gitignore**
```
node_modules/
.env
public/
!public/.gitkeep
.DS_Store