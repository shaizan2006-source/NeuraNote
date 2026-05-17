# General Sans Fonts

This directory should contain the following woff2 font files:

- `GeneralSans-Regular.woff2` (weight: 400)
- `GeneralSans-Medium.woff2` (weight: 500)
- `GeneralSans-Semibold.woff2` (weight: 600)

## Setup Instructions

1. Download General Sans from your font provider
2. Convert the fonts to woff2 format (if needed) using a tool like Google's woff2 converter
3. Place the three woff2 files in this directory

The Next.js app is configured to load these fonts via `localFont` in `src/app/layout.js` and expose them as CSS variables:
- `--font-sans` (defaults to 400/Regular)

These variables are used in `src/app/globals.css` and available via Tailwind's `@theme` block.
