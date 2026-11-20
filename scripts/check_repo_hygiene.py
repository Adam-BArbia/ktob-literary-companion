#!/usr/bin/env python3
"""Read-only CI check: secrets must not appear as committed runtime files."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
tracked = subprocess.check_output(["git", "ls-files"], cwd=ROOT, text=True).splitlines()
problems: list[str] = []

for name in tracked:
    p = Path(name)
    parts = p.parts
    if any(part in ("node_modules", "target", "dist", "coverage", "secrets") for part in parts):
        problems.append("Tracked generated/sensitive path: " + name)
    if p.name == ".env" or (p.name.startswith(".env.") and p.name != ".env.example"):
        problems.append("Tracked runtime environment file: " + name)
    if p.suffix.lower() in (".pem", ".p12", ".pfx"):
        problems.append("Tracked private key/certificate container: " + name)

for path in ("README.md", ".gitignore", ".env.example", "apps/api/.env.example",
             "apps/web/.env.example"):
    if not (ROOT / path).is_file():
        problems.append("Missing workspace hygiene file: " + path)

web_source = ROOT / "apps/web"
for p in list((web_source / "src").rglob("*.ts")) + list((web_source / "public").rglob("*.json")):
    c = p.read_text(encoding="utf-8")
    for forbidden in ("SUPABASE_SERVICE_ROLE", "SERVICE_ROLE_KEY", "DATABASE_PASSWORD",
                      "AI_PROVIDER_KEY", "SUPABASE_SECRET_KEY"):
        if forbidden in c:
            problems.append("Forbidden server-secret variable reference in browser source: " +
                            str(p.relative_to(ROOT)) + " (" + forbidden + ")")

if problems:
    print("\n".join("ERROR: " + p for p in problems), file=sys.stderr)
    sys.exit(1)
print(f"Repository hygiene OK: {len(tracked)} tracked files; no committed .env or browser server-secret references.")
