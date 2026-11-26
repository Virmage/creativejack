#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

stage="$(mktemp -d "$PWD/.site-build.XXXXXX")"
trap 'rm -rf -- "$stage"' EXIT
cp ./*.html robots.txt sitemap.xml "$stage/"
cp -R assets "$stage/"

if [[ -n "${JACKCITY_STREAM_PLAYER_URL:-}" ]]; then
    python3 tools/stage-netlify-home.py "$stage" jackcity "$JACKCITY_STREAM_PLAYER_URL"
fi

rm -rf -- dist
mv "$stage" dist
