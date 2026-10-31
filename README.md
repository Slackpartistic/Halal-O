# Halal-O
Mobile app utilizing the camera to scan the status from a database based on religious rulings.

Scan a food or drink barcode (or type the ingredients) and get **Halal**, **Haram** or **Mushbooh**, with the ingredients behind the verdict and the source of each ruling. Rulings follow the Hanafi school and Mustakshif's method; see [`data/METHODOLOGY.md`](data/METHODOLOGY.md).

## Layout

| Path | What's there |
|---|---|
| `apps/mobile/` | Expo (React Native, TypeScript) app for iOS and Android |
| `packages/` | Shared packages (the verdict engine and Open Food Facts client arrive in later PRs) |
| `data/` | The ingredient reference (`ingredients.json`/`.csv`), its methodology, and the tools that build it |
| `docs/SPEC.md` | Product spec, architecture and the MVP plan |

## Getting started

```bash
npm install
npm run typecheck
cd apps/mobile && npx expo start
```

Rebuild the ingredient reference from the latest Open Food Facts data (needs Python 3):

```bash
data/tools/update.sh
```

## Data licence

The ingredient reference is derived from the [Open Food Facts](https://world.openfoodfacts.org) additives taxonomy and is available under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/). Open Food Facts must be credited wherever it is used.
