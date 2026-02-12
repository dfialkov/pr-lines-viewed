#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

bash scripts/generate-icons.sh

rm -f extension.zip
zip extension.zip manifest.json content.js popup.html popup.js icon16.png icon48.png icon128.png

echo "Packed extension.zip"
