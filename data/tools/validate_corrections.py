"""Sanity checks for corrections.json, run in CI."""
import json, re, sys

VERDICTS = {"halal", "haram", "mushbooh"}
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ISSUE = re.compile(r"^https://github\.com/Slackpartistic/Halal-O/issues/\d+$")

data = json.load(open(sys.argv[1], encoding="utf-8"))
errors = []

if data.get("schema_version") != 1:
    errors.append("schema_version must be 1")
if not DATE.match(str(data.get("version", ""))):
    errors.append("version must be a YYYY-MM-DD date; bump it with every change")

for code, c in data.get("corrections", {}).items():
    if not re.fullmatch(r"\d{8}|\d{12,14}", code):
        errors.append(f"{code}: barcode must be 8 or 12-14 digits")
    if c.get("verdict") not in VERDICTS:
        errors.append(f"{code}: bad verdict {c.get('verdict')!r}")
    if not str(c.get("note", "")).strip():
        errors.append(f"{code}: missing note")
    if not DATE.match(str(c.get("reviewed", ""))):
        errors.append(f"{code}: reviewed must be YYYY-MM-DD")
    if "certified" in c and not isinstance(c["certified"], bool):
        errors.append(f"{code}: certified must be true or false")
    if "issue" in c and not ISSUE.match(str(c["issue"])):
        errors.append(f"{code}: issue must link to a Halal-O GitHub issue")
    extra = set(c) - {"verdict", "certified", "note", "reviewed", "issue"}
    if extra:
        errors.append(f"{code}: unknown fields {sorted(extra)}")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"ok: {len(data.get('corrections', {}))} corrections")
