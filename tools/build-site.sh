#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

stage="$(mktemp -d "$PWD/.site-build.XXXXXX")"
trap 'rm -rf -- "$stage"' EXIT
cp ./*.html robots.txt sitemap.xml "$stage/"
cp -R assets "$stage/"

if [[ -n "${JACKCITY_ARCWARE_SHARE_ID:-}" || "${CONTEXT:-}" == deploy-preview ]]; then
    if [[ -n "${JACKCITY_ARCWARE_SHARE_ID:-}" ]]; then
        player_options=(--arcware-share-id "$JACKCITY_ARCWARE_SHARE_ID")
    else
        player_options=(--arcware-preview)
    fi
    python3 tools/stage-netlify-home.py "$stage" jackcity "${player_options[@]}"
    npx --no-install esbuild jackcity/arcware-player.js --bundle --minify --format=esm \
        --outfile="$stage/jackcity-assets/arcware-player.js"
elif [[ -n "${JACKCITY_STREAM_PLAYER_URL:-}" ]]; then
    python3 tools/stage-netlify-home.py "$stage" jackcity "$JACKCITY_STREAM_PLAYER_URL"
fi

rm -rf -- dist
mv "$stage" dist
