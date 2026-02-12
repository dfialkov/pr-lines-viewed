#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

npx --yes sharp-cli -i icon.svg -o icon16.png resize 16 16
npx --yes sharp-cli -i icon.svg -o icon48.png resize 48 48
npx --yes sharp-cli -i icon.svg -o icon128.png resize 128 128

echo "Generated icon16.png, icon48.png, icon128.png"
