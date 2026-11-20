#!/usr/bin/env python3
"""Read-only handoff completeness and OpenAPI operation-coverage checks."""
from pathlib import Path
import json
import re
import sys

root = Path(__file__).resolve().parents[2]
docdir = root / "docs/implementation"
required = [f"{i:02d}-" for i in range(1, 14)]
errors = []
files = sorted(docdir.glob("*.md"))
for prefix in required:
    if not any(p.name.startswith(prefix) for p in files):
        errors.append("Missing handoff document prefix: " + prefix)
if not (docdir/"README.md").is_file():
    errors.append("Missing implementation index")
spec = json.loads((root/"docs/architecture/openapi.json").read_text(encoding="utf-8"))
op_ids = [op["operationId"] for group in spec["paths"].values() for op in group.values()]
coverage = (docdir/"13-api-coverage.md").read_text(encoding="utf-8")
rows = re.findall(r'^\| `([^\`]+)` \| `(GET|POST|PUT|PATCH|DELETE) ([^\`]+)` \|', coverage, re.M)
covered_ids = [row[0] for row in rows]
if len(op_ids)!=57 or len(spec["paths"])!=35:
    errors.append(f"OpenAPI operations unexpectedly changed: {len(op_ids)} ops; {len(spec['paths'])} paths")
if len(rows)!=57:
    errors.append(f"Expected 57 operation coverage rows, found {len(rows)}")
if set(covered_ids)!=set(op_ids) or len(covered_ids)!=len(set(covered_ids)):
    errors.append("API operationId coverage mismatch, duplicate, or missing row")
expected = {(op["operationId"],method.upper(),path) for path,group in spec["paths"].items() for method,op in group.items()}
actual = set(rows)
if expected != actual:
    errors.append("Coverage row method/path/operationId differs from OpenAPI")
for path in files + [root/"README.md",root/"docs/architecture/README.md"]:
    txt = path.read_text(encoding="utf-8")
    for match in re.finditer(r'(?<!!)\[[^\]]+\]\(([^\)]+)\)', txt):
        target = match.group(1).split("#",1)[0]
        if not target or target.startswith(("https://","http://","mailto:","/")):
            continue
        if not (path.parent/target).exists():
            errors.append(f"Dead local link {path.relative_to(root)} -> {target}")
gates = (root/"docs/architecture/06-review-gates.md").read_text(encoding="utf-8")
risks = (docdir/"11-risk-and-decision-register.md").read_text(encoding="utf-8")
for token in ("B13","B15","B16","M0","M3","Gate C"):
    if token not in gates+risks:
        errors.append(f"Missing scope/gate token {token}")
for token in ("BLOCKED","DELETE /me","AI","provider"):
    if token not in risks:
        errors.append(f"Missing risk disclosure {token}")
if errors:
    print("\n".join("ERROR: "+x for x in errors),file=sys.stderr)
    sys.exit(1)
print(f"Handoff complete: {len(files)} docs, {len(rows)} OpenAPI operations assigned; local links valid.")
