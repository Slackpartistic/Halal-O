#!/usr/bin/env bash
# Rebuild ingredients.json and ingredients.csv from the latest Open Food Facts additives taxonomy.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .cache
curl -fsSL -o .cache/additives.txt \
  https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/additives.txt
python3 -I tools/parse.py .cache/additives.txt .cache/off.json
python3 -I tools/build.py .cache/off.json .
python3 -I tools/validate.py ingredients.json
