# Halal-O: product spec and architecture

Version 1, 31 October 2026. This builds on the ingredient reference in `data/` (see `data/METHODOLOGY.md` for the rulings).

## 1. What the app does

You scan a food or drink barcode (or type the ingredients in) and get one of three verdicts, **Halal**, **Haram** or **Mushbooh**, together with the ingredients behind it. The method follows Mustakshif: ingredients are matched automatically against a reviewed list, and a person (for now, you) reviews any verdict that users report as wrong.

**In the MVP:** iOS and Android, barcode scanning, typing or pasting an ingredient list, an explained verdict, scan history, and reporting a wrong or missing product.

**Later:** reading ingredient labels with the camera (OCR), QR codes, recognising halal certification logos, suggesting halal alternatives, a shared review queue, and support for other schools of thought.

**Not in scope:** restaurants, cosmetics, medicine, and any user accounts in the MVP.

## 2. User flows

### 2.1 Scan a barcode (main flow)
1. You open the app and land straight on the camera, which reads EAN-13, EAN-8, UPC-A and UPC-E barcodes.
2. The barcode is looked up in this order:
   1. our own corrections list
   2. the local cache
   3. Open Food Facts
3. The result screen shows:
   - the product's name and photo
   - a large verdict badge (green Halal, red Haram, amber Mushbooh)
   - **"Why"**: each Haram or Mushbooh ingredient, its reason in one line, and a link to the ruling's source
   - **"Assumed halal"**: a collapsible list of everything else
   - which label signals were used, such as "Halal label reported on pack" or "Vegan label"
   - the buttons "Report a problem" and "Scan next"
4. **No product found, or no ingredients listed:** the app shows "We don't have this product's ingredients" and offers to type them in. Later it will offer to photograph the label. The barcode is saved so that you can submit the product.

### 2.2 Type or paste the ingredients
You paste or type an ingredient list, and the app runs the same engine and shows the same result screen without a product photo.

### 2.3 History
Your last 100 scans are kept on the phone with their verdicts, and you can search them. If the ingredient reference or our corrections list later changes a past product's verdict, the history shows it with a "verdict changed" badge, which is our version of Mustakshif's status-change alerts.

### 2.4 Report a problem
On any result you can choose "Verdict looks wrong", "Halal logo on pack" or "Ingredients are out of date", add a photo and a note, and submit. Reports go to a queue that you review (section 5.4). For the MVP, a report can simply open a prefilled email or GitHub issue, so there's no backend to build yet.

## 3. Verdict engine

The verdict engine is a pure TypeScript package with no app code in it. That way you and Codex can review and test it in isolation.

### 3.1 Inputs
- **Ingredient text**, from Open Food Facts `ingredients_text` (we prefer the English text when there's a choice) or from what you typed.
- **The additive list** from Open Food Facts (`additives_tags`, e.g. `en:e471`), which is cross-checked against the text.
- **Label signals** from Open Food Facts `labels_tags`: `en:halal` (and certifier-specific tags), `en:vegan` and `en:vegetarian`. These labels are entered by the community, so the app phrases them as "reported" rather than "certified".
- **Open Food Facts' own ingredient analysis**, used as a fallback for ingredients we don't recognise: each parsed ingredient has `vegan`/`vegetarian` values (yes/no/maybe), and there's a summary in `ingredients_analysis_tags`. *To verify in PR 4: from this environment I couldn't call the live API to confirm these field names.*

### 3.2 Steps
1. **Normalise the text:** lower-case it, strip accents for matching, and unify how E-numbers are written ("E 471", "E-471", "e471" and "emulsifier (471)" all become `E471`). Percentages and "contains", "may contain" and allergen notes are removed.
2. **Split it into ingredients:** split on commas and semicolons, while keeping the contents of brackets as sub-ingredients of their parent, e.g. "emulsifier (soya lecithin, E471)".
3. **Match each ingredient against the reference**, longest alias first, using whole words only (so "ham" doesn't match inside "graham", and "spirit vinegar" wins over "spirit"). The aliases cover every language in the reference.
4. **Adjust for origin wording.** If the text says where the ingredient comes from, that origin's verdict is used instead of the default. For example, "E471 (vegetable)" or "plant-based glycerol" gives plant (Halal), "pork gelatine" gives pork (Haram), "microbial rennet" gives microbial (Halal) and "fish gelatin" gives fish (Halal). Origins are recognised through a small list of keywords such as vegetable, plant, palm, soya, sunflower, pork, porcine, beef, bovine, fish, marine, microbial, bacterial and fungal.
5. **Fallback for ingredients we don't recognise** (like "wheat flour"): use Open Food Facts' vegan/vegetarian value for that ingredient.
   - vegan yes: assumed Halal.
   - vegan maybe: Mushbooh.
   - vegetarian no: Mushbooh, marked "unrecognised animal ingredient".
   - no value at all: assumed Halal but listed as "not checked". Plain foods dominate this case, and marking all of them Mushbooh would make the app useless.
6. **Apply the product-level rules** in this order (the rules come from METHODOLOGY.md section 3):
   1. A halal label on the pack makes the product **Halal (certified)**. This overrides everything else, but the app still lists the Haram/Mushbooh ingredients as "would otherwise be flagged".
   2. Any Haram ingredient makes it **Haram**.
   3. With a vegan label, every Mushbooh ingredient whose `vegan_label_upgrades` is true becomes Halal. The vegetarian label upgrades nothing.
   4. Any Mushbooh ingredient still left makes it **Mushbooh**.
   5. Otherwise it's **Halal**.
7. **Confidence:** high, medium or low. It's the lowest confidence of any ingredient that decided the verdict, and it drops to low when more than 30% of the ingredients were "not checked". Low confidence shows as "Likely halal: check the label".

### 3.3 Output
```ts
type Verdict = 'halal' | 'haram' | 'mushbooh' | 'unknown';   // unknown = no ingredient data
interface Result {
  verdict: Verdict;
  certified: boolean;            // halal label reported
  confidence: 'high' | 'medium' | 'low';
  reasons: { ingredientText: string; entryId: string; verdict: Verdict; rationale: string; refs: string[] }[];
  assumedHalal: string[];
  notChecked: string[];
  signalsUsed: ('halal_label' | 'vegan_label')[];
  referenceVersion: string;
}
```

## 4. Data sources

| Source | Used for | Notes |
|---|---|---|
| Ingredient reference (ours) | The rulings | Bundled with the app, so it works offline. The app checks for a newer version at launch. |
| [Open Food Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/) | Barcode lookup: name, photo, ingredients, labels, additives | Free, about 3M products, UK coverage is good. **15 product reads per minute per IP**, which is fine since each phone calls the API itself. A custom User-Agent `Halal-O/<version> (halalo.support@gmail.com)` is required. Licence is ODbL, so we must credit it. |
| Corrections list (ours) | A verdict per barcode after a reviewed report | A small JSON file published with the reference. Its verdicts beat the engine's. |

**Fallbacks considered and left out of the MVP:** UPCitemdb and GS1 lookups. They have poor ingredient data and cost money.

## 5. Architecture

### 5.1 Stack: React Native with Expo (TypeScript)
- **One codebase for iOS and Android.** The camera includes barcode scanning (`expo-camera`), local storage uses `expo-sqlite`, and builds run in the cloud with EAS, so you don't need a Mac for iOS builds.
- **The engine and the app share one language**, which keeps reviews simple for you and Codex.
- **OCR later:** react-native-vision-camera with ML Kit text recognition, which runs on the device.
- **Flutter** would work just as well. I lean towards Expo because the engine is pure TypeScript and can also run in a web demo or in a backend later.

### 5.2 Repository layout
```
halal-o/
  apps/mobile/            Expo app (screens: Scan, Result, Manual, History, Report)
  packages/engine/        verdict engine (pure TS, no React), unit tests
  packages/off-client/    Open Food Facts client + response mapping
  data/                   ingredients.json, corrections.json, build tools (Python), METHODOLOGY.md
  docs/                   this spec, decisions log
  .github/workflows/      CI: lint, typecheck, unit tests, data validation
```

### 5.3 On the device
- The ingredient reference is bundled. At build time it's trimmed to the languages we support, which takes it from about 2 MB to roughly 400 KB.
- Products are cached in SQLite for 30 days. Scan history is kept locally.
- Without a connection, the app still works for products already scanned and for typed ingredients.

### 5.4 The review loop (our version of Mustakshif's Shariah board)
**MVP**
- A report opens a GitHub issue using a template, either through a web form or by email.
- You review it and edit `data/corrections.json`, or the ingredient reference, in a PR.
- CI validates the data, and once the PR is merged the new version is published as a static file.

**Later**
- A small backend (Supabase or similar) holding a report queue and a review screen.
- Each product gets a "reviewed by" note.

### 5.5 Privacy
- The camera is only used for scanning.
- There's no account and no analytics in the MVP.
- The only network calls go to Open Food Facts and to our static data host.

## 6. Quality and testing
- **Engine unit tests:** the parser, alias matching (including the false positives "graham" and "kale"), the origin wording, and every rule in section 3.2.
- **Golden products:** about 30 real UK products saved as recorded Open Food Facts responses, each with the verdict we expect. Examples include Haribo (gelatine), Mars (whey and vegetarian), a halal-certified sausage, a vegan biscuit containing E471, and a plain crisp. Any change to the engine or the data has to keep these passing.
- **Data validation in CI:** every entry has a verdict, references that resolve, unique ids, and no alias matching two different entries.
- **Review:** every PR is small, and you and Codex review it before merge.

## 7. MVP plan as pull requests

| PR | What it does |
|---|---|
| 1 | Repo scaffold (monorepo, Expo app shell, CI), data folder with the reference and the build tools |
| 2 | Engine: normaliser, splitter, alias matcher, with tests |
| 3 | Engine: origin keywords, fallback, rules and confidence, plus golden-product tests |
| 4 | Open Food Facts client, response mapping and caching |
| 5 | App: scan screen and lookup |
| 6 | App: result screen with explanations, and typed ingredients |
| 7 | App: history and the "verdict changed" badge |
| 8 | Report flow (GitHub issue template) and corrections file |
| 9 | Store readiness: icon, disclaimer screen, privacy policy, Open Food Facts credit, TestFlight and Play internal testing |

After the MVP:
- OCR of ingredient labels.
- QR codes. Many new packs carry GS1 Digital Link QR codes that contain the barcode number, so they can reuse the same lookup.
- Recognising halal logos.
- Halal alternatives.
- The backend review queue.

## 8. Disclaimer
This shows on first launch and at the bottom of every result:

> "This app checks ingredients against a reference list following Hanafi rulings. It is not a fatwa or certification. When a product is Mushbooh or you are unsure, check with the manufacturer, a recognised halal certifier, or a scholar."

## 9. Decisions made (31 Oct)
- App name: **Halal-O**. Contact email for Open Food Facts: halalo.support@gmail.com (to be created before launch).
- Stack: Expo.
- Repo: github.com/Slackpartistic/Halal-O.
