#!/bin/bash
# ─────────────────────────────────────────────────────────────
# push-env-to-vercel.sh
# Reads .env.local and pushes every variable to Vercel via CLI.
# Run this ONCE after `vercel link` to avoid touching the dashboard.
#
# Usage:
#   bash scripts/push-env-to-vercel.sh
# ─────────────────────────────────────────────────────────────

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found"
  exit 1
fi

echo "Pushing env vars from $ENV_FILE to Vercel..."
echo "Environments: production, preview, development"
echo ""

while IFS= read -r line || [ -n "$line" ]; do
  # Skip blank lines and comments
  [[ -z "$line" || "$line" =~ ^# ]] && continue

  KEY="${line%%=*}"
  VALUE="${line#*=}"

  # Skip placeholder values
  if [[ "$VALUE" == *"REPLACE_ME"* || "$VALUE" == "your-"* || "$VALUE" == "rzp_test_REPLACE"* ]]; then
    echo "  SKIP  $KEY (placeholder — fill in real value first)"
    continue
  fi

  echo "  PUSH  $KEY"
  echo "$VALUE" | vercel env add "$KEY" production  --force 2>/dev/null
  echo "$VALUE" | vercel env add "$KEY" preview     --force 2>/dev/null
  echo "$VALUE" | vercel env add "$KEY" development --force 2>/dev/null

done < "$ENV_FILE"

echo ""
echo "Done. Verify at: https://vercel.com/dashboard → your project → Settings → Environment Variables"
