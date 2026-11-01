# Handling a report

Reports arrive as GitHub issues labelled `report` (from the in-app "Report on GitHub" button) or as emails to halalo.support@gmail.com.

1. **Check the evidence.** Look at the photos of the ingredient list and any halal logo. If something is unclear, ask the reporter or the manufacturer.
2. **Decide where the fix belongs.**
   - The ruling for an *ingredient* is wrong, or an alias is missing: change `tools/build.py` (or `HAND` overrides), run `tools/update.sh`, and the change reaches every product.
   - Only *this product* is wrong (the manufacturer confirmed a source, the pack has a trusted halal logo, or Open Food Facts has stale data): add an entry to `corrections.json`.
   - Stale ingredients on Open Food Facts: also fix them on openfoodfacts.org so everyone benefits.
3. **Add the correction** (barcode as the key) and bump `version` to today's date:

   ```json
   "5000159407236": {
     "verdict": "halal",
     "certified": true,
     "note": "HMC-certified logo on pack (photo in report).",
     "reviewed": "2026-11-01",
     "issue": "https://github.com/Slackpartistic/Halal-O/issues/12"
   }
   ```

   `verdict` is halal, haram or mushbooh. `certified` is only shown for a halal verdict. `note` is shown to users, so write it for them.
4. **Open a PR.** CI runs `tools/validate_corrections.py`. After merge, the next app release includes it; scans already in someone's History are re-checked and get a "verdict changed" badge if the verdict moved.
5. **Close the issue** with a short reply saying what changed.
