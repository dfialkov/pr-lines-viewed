#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Generate icons if missing
if [ ! -f icon16.png ] || [ ! -f icon48.png ] || [ ! -f icon128.png ]; then
  bash scripts/generate-icons.sh
fi

rm -f extension.zip
zip extension.zip manifest.json content.js icon16.png icon48.png icon128.png

echo "Packed extension.zip"
