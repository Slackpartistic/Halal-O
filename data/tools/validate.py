"""Sanity checks for ingredients.json, run in CI."""
import json, sys
from collections import defaultdict

VERDICTS = {"halal", "haram", "mushbooh"}

data = json.load(open(sys.argv[1], encoding="utf-8"))
refs = data["references"]
errors = []
ids = set()
alias_owner = defaultdict(set)

for e in data["entries"]:
    eid = e["id"]
    if eid in ids:
        errors.append(f"duplicate id: {eid}")
    ids.add(eid)
    if e["default_verdict"] not in VERDICTS:
        errors.append(f"{eid}: bad default_verdict {e['default_verdict']!r}")
    for origin, v in e["verdict_by_origin"].items():
        if v not in VERDICTS:
            errors.append(f"{eid}: bad verdict {v!r} for origin {origin}")
    for r in e["references"]:
        if r not in refs:
            errors.append(f"{eid}: unknown reference {r!r}")
    if not e["rationale"]:
        errors.append(f"{eid}: missing rationale")
    for alias in e["aliases"].get("en", []):
        alias_owner[alias.strip().lower()].add(e["default_verdict"])

# The same English alias on entries with different verdicts would make matching ambiguous.
for alias, verdicts in alias_owner.items():
    if len(verdicts) > 1:
        errors.append(f"alias {alias!r} maps to conflicting verdicts {sorted(verdicts)}")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"ok: {len(data['entries'])} entries")
