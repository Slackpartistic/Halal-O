# Halal ingredient reference: methodology

Version 1, 31 October 2026. Files in this folder:

| File | What it is |
|---|---|
| `ingredients.json` | The full reference: 761 entries, with aliases in every language Open Food Facts has, the verdict for each possible origin, sources, and the rules below. This is what the app will load. |
| `ingredients.csv` | The same entries with English aliases only, so they're easy to review in a spreadsheet. |
| `tools/update.sh` | Downloads the latest Open Food Facts additives taxonomy and rebuilds both files (runs `parse.py`, `build.py` and `validate.py`). |
| `tools/build.py` | Holds the hand-reviewed rulings (`OVR` for E-numbers, `HIDDEN` for other ingredients). Edit rulings here, never in the JSON. |
| `tools/validate.py` | Checks run in CI: valid verdicts, known references, unique ids and no conflicting aliases. |

## 1. Approach (following Mustakshif)

[Mustakshif](https://www.mustakshif.com/how-mustakshif-work) uses three verdicts (Halal, Haram, Mushbooh). It matches ingredients against a list verified by its scholars, and then its Shariah board reviews each product. We copy that structure:

1. **Ingredient list.** This reference is the list, with Hanafi defaults. Its main scholarly anchor is the E-code list by Mufti Abdullah Patel ([Muftisays / Darul Uloom London](https://islamqa.org/hanafi/muftisays/9412/can-you-provide-a-list-of-halal-doubtful-and-haram-e-codes-for-food-ingredients/)), who also chairs Mustakshif's Shariah board. Every additive on his exception list is Mushbooh or Haram here, and additives not on it are Halal, unless a specific fatwa says otherwise.
2. **Human review.** For now that's you (the owner). Contested entries are listed in section 5 for you to rule on.
3. **Product verdict.** The app combines the ingredient verdicts using the rules in section 3.

## 2. How each entry was decided

- **Origin first.** [Open Food Facts](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/taxonomies/additives.txt) records whether each additive is vegan, vegetarian or "maybe". That tells us which origins are possible:

| Open Food Facts flags | Possible origins | Default verdict |
|---|---|---|
| vegan: yes | plant, mineral, synthetic, microbial | Halal |
| vegan: no or maybe, vegetarian: yes | plant, synthetic, dairy, egg or bee | Halal |
| vegan: maybe, vegetarian: maybe | plant, synthetic or animal | Mushbooh |
| vegetarian: no | animal or insect | Reviewed by hand (see below) |

- **Sub-entries inherit.** For example, E331(i) takes the verdict of E331.
- **22 E-numbers reviewed by hand.** Each one's `rationale` and `references` fields say why. Examples are carmine, shellac, gelatine, L-cysteine, ethanol, inosinates and guanylates, lecithin and calcium carbonate.
- **36 hidden ingredients** that aren't E-numbers were added by hand. These cover pork and meat terms, animal fat, rennet, pepsin, enzymes, whey, cheese, collagen, insects, seafood, alcoholic drinks, extracts, flavourings, vinegars and catch-all labels such as "emulsifier".
- **Verdicts per origin.** Every entry has a `verdict_by_origin`, so if a label or manufacturer tells us the origin, the app can give a definite answer instead of the default.

**Result:** 658 Halal, 79 Mushbooh, 24 Haram.

## 3. Rules (agreed with you on 31 Oct)

1. A halal certification on the product overrides every ingredient verdict.
2. Any Haram ingredient makes the product Haram.
3. Otherwise, any Mushbooh ingredient makes the product Mushbooh.
4. Anything from an animal is Haram unless the product is halal-certified. Chemical transformation (istihala) does not make it halal. That covers animal rennet, animal glycerol and animal-derived E471.
5. An ingredient whose origin is unknown is Mushbooh.
6. A **vegan** label upgrades Mushbooh ingredients to Halal, except anything alcohol-related or insect-derived. The `vegan_label_upgrades` field marks which ingredients qualify.
7. A **vegetarian** label upgrades nothing.
8. Default school: Hanafi. Every entry records `madhab`, so the school can be changed later.

## 4. Things the app's matcher must handle

- **Prefer the longest match.** For example, "spirit vinegar" must match before "spirit" (ethanol), and "fish gelatin" before "gelatin".
- **Short aliases need whole-word matching.** Examples are "gin", "port", "ale" and "ham". Otherwise "ham" would match inside "graham" and "ale" inside "kale".
- **Labels write E-numbers many ways.** For example, "E 471", "E-471", "471" and "emulsifier (471)".
- **Many products will come out Mushbooh** because they contain "flavouring". That's deliberate (ruling 3 below).

## 5. Contested rulings (decided by you on 31 Oct)

| # | Ingredient | Your ruling | Other views |
|---|---|---|---|
| 1 | Wine, cider, malt and balsamic vinegar | Mushbooh | Hanafi fiqh widely accepts wine that has turned into vinegar as pure. Spirit and plain vinegar stay Halal. |
| 2 | Ethanol (E1510) and alcohol-based extracts such as vanilla | Haram (buy alcohol-free versions) | [Darul Ifta Birmingham](https://daruliftabirmingham.co.uk/does-alcohol-in-food-flavouring-or-extracts-need-to-be-of-a-certain-percentage-to-be-consumable/) permits non-khamr alcohol in amounts too small to intoxicate. |
| 3 | "Flavouring" / "natural flavouring" | Mushbooh | Could be treated as Halal unless other signals point the other way. |
| 4 | Rennet, cheese and whey | Haram unless the rennet is microbial or vegetable, or the pack has a halal stamp | [Council of Ulama](https://islamqa.org/hanafi/councilofulama/242308/whey-in-cheese/): the fatwa position (Imam Abu Hanifah) permits such cheese, while piety favours avoiding it. |
| 5 | Shellac (E904) | Haram | Mufti Abdullah Patel's list marks it "under investigation", and some scholars permit it. |
| 6 | Prawns and shrimp | Halal (treated as fish) | Some Hanafi scholars call them makruh. Crab, lobster, mussels and squid stay Haram. |
| 7 | Carmine (E120) | Haram | Only some Maliki scholars allow it. |

**Lactose and tagatose (E963):** Halal (your ruling, 31 Oct), even though lactose is usually extracted from cheese whey.

## 6. Keeping it up to date

- **Monthly, automatic.** A GitHub Action (`.github/workflows/update-reference.yml`) rebuilds the reference from Open Food Facts on the 1st of each month and opens a PR if anything changed. The hand-reviewed rulings are never changed by it.
- **As reports come in.** Product-specific fixes go in a corrections list (planned for PR 8), and ingredient-level fixes go in `tools/build.py`.
- **Quarterly.** Re-check the contested rulings and the certifier lists (HFA, HMC, Mufti Abdullah Patel's list), then bump `REVIEWED` in `tools/build.py`.
- **No app update needed.** The app will download the latest reference at launch, so data fixes don't wait for a store release.

## 7. Known limitations

- Open Food Facts' origin flags are community-maintained. The hand-reviewed entries are the most reliable. The rest are generally sound but haven't each been checked by a scholar.
- I haven't found a published Mustakshif ingredient list (it's proprietary), so "same as Mustakshif" means the same method and the same chairman's E-code list, not an identical dataset.
- This is not a fatwa. The app should tell users to check with a certifier or scholar when a product comes out Mushbooh.
- **Next improvement:** cross-check more certifier lists (HFA, HMC, IFANCA, JAKIM) and add a `certifier_views` field to each entry.
- **Licence:** the Open Food Facts taxonomy is under the Open Database License (ODbL). If we publish or ship this dataset, we have to credit Open Food Facts and release the derived dataset under ODbL too. Our app code can use any licence.
