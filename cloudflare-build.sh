#!/usr/bin/env bash
set -euo pipefail

# Cloudflare Pages build: publish only the public frontend entrypoint.
# Never copy backend source, tests, or repository metadata into the Pages output.
rm -rf dist
mkdir -p dist
cp index.html dist/index.html

cat > dist/_headers <<'HEADERS'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
HEADERS

echo "Cloudflare Pages build complete: dist contains the frontend only."
