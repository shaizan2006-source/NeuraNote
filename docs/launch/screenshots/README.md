# Screenshots for Product Hunt

5 gallery images (1024×768) + 1 thumbnail (500×500).

---

## Capture (automated)

```bash
# Install puppeteer once
npm install puppeteer

# Run against local dev server
npm run dev &
APP_URL=http://localhost:3000 \
TEST_EMAIL=your@email.com \
TEST_PASSWORD=yourpassword \
node scripts/capture-screenshots.mjs

# Or against production (after domain is live)
APP_URL=https://yourdomain.com \
TEST_EMAIL=your@email.com \
TEST_PASSWORD=yourpassword \
node scripts/capture-screenshots.mjs
```

---

## Expected output files

| File | Size | What to show |
|---|---|---|
| `01_brain_map.png` | 1024×768 | Brain Map with concepts connected, multiple subjects |
| `02_daily_briefing.png` | 1024×768 | Audio player UI, briefing card |
| `03_qa_with_sources.png` | 1024×768 | Q&A answer streaming, source chips visible |
| `04_pyq_practice.png` | 1024×768 | PYQ list, at least one question open |
| `05_progress_dashboard.png` | 1024×768 | Dashboard with stats, progress rings |
| `THUMBNAIL.png` | 500×500 | Hero crop — logo + headline visible |

---

## Manual capture (if puppeteer fails)

1. Open the app in Chrome (signed in to a populated test account)
2. Set zoom to 100% (`Ctrl+0`)
3. Open DevTools → Toggle device toolbar → set 1024×768
4. Navigate to each page, wait for full load
5. Screenshot → crop to 1024×768

For thumbnail:
- Open landing page at 1200px width
- Crop hero section to 500×500
- Centre on the headline + logo

---

## Tips for better screenshots

- Use a test account with 5+ PDFs uploaded and 20+ questions asked
  (Brain Map will show real connections, not empty state)
- Trigger a briefing manually: `POST /api/cron/generate-briefings` (Vercel dashboard)
- For Q&A screenshot: have an answer already rendered, not mid-stream
- Dark mode is the default — screenshots should look dark
- Remove any error toasts before capturing

---

## Product Hunt gallery order

Upload in this order (PH shows first image as hero):
1. `01_brain_map.png` — hero, most visual
2. `03_qa_with_sources.png` — shows core feature
3. `04_pyq_practice.png` — shows differentiation
4. `02_daily_briefing.png` — unique feature
5. `05_progress_dashboard.png` — shows depth
