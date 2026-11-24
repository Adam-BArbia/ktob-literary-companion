#!/usr/bin/env python3
"""Fail closed if real Java API mappings differ from registered OpenAPI operations.

This is deliberately a small source-level guard; the MVC contract integration test
must still verify status/media/response JSON. No planned operation is asserted live.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = json.loads((ROOT / "docs/architecture/openapi.json").read_text(encoding="utf-8"))
REGISTER = json.loads((ROOT / "docs/implementation/implemented-operations.json").read_text(encoding="utf-8"))
ERRORS: list[str] = []
PREFIX = "/api/v1"
ALLOWED = {"GET", "POST", "PUT", "PATCH", "DELETE"}
if len(SPEC["paths"]) != 35 or sum(len(methods) for methods in SPEC["paths"].values()) != 57:
    ERRORS.append("Approved v0.3 API operation inventory changed: review contract first.")

known: dict[str, tuple[str, str]] = {}
# Keep the deliberately frozen R1 contract intact; V4 endpoints are an additive extension.
EXTENSION = json.loads((ROOT / "docs/architecture/openapi-v4-extension.json").read_text(encoding="utf-8")) if (
    ROOT / "docs/architecture/openapi-v4-extension.json").exists() else {"paths": {}}
for path, methods in {**SPEC["paths"], **EXTENSION["paths"]}.items():
    for method, operation in methods.items():
        op_id = operation["operationId"]
        if op_id in known:
            ERRORS.append(f"Duplicate OpenAPI operationId {op_id}")
        known[op_id] = (method.upper(), PREFIX + path)

declared = REGISTER["implemented"]
if not isinstance(declared, list) or len(set(declared)) != len(declared):
    ERRORS.append("Implemented operation register must be a deduplicated list.")
for op_id in declared:
    if op_id not in known:
        ERRORS.append(f"Implemented operationId missing from OpenAPI: {op_id}")

mappings: list[tuple[str, str]] = []
java_dir = ROOT / "apps/api/src/main/java"
for path in java_dir.rglob("*.java"):
    text = path.read_text(encoding="utf-8")
    if re.search(r"@RequestMapping\s*\(", text) or re.search(r"@(?:Get|Post|Put|Patch|Delete)Exchange\s*\(", text):
        ERRORS.append(f"Unsupported composed mapping requires route-check update: {path.relative_to(ROOT)}")
    for method, suffix in [("GET", "Get"), ("POST", "Post"), ("PUT", "Put"),
                           ("PATCH", "Patch"), ("DELETE", "Delete")]:
        pattern = rf'@{suffix}Mapping\s*\(\s*(?:path\s*=\s*|value\s*=\s*)?"([^"]+)"'
        mappings.extend((method, match.group(1)) for match in re.finditer(pattern, text))
        # A bare @GetMapping without explicit path cannot silently bypass this check.
        if re.search(rf'@{suffix}Mapping\s*(?:\(\s*\))?\s*(?:public|private|protected)', text):
            ERRORS.append(f"Untracked bare @{suffix}Mapping in {path.relative_to(ROOT)}")

expected = {known[op_id] for op_id in declared if op_id in known}
actual = set(mappings)
if len(mappings) != len(actual):
    ERRORS.append("Duplicate Java route mappings.")
for mapping in sorted(actual - expected):
    ERRORS.append(f"Java route not registered in implemented operations: {mapping}")
for mapping in sorted(expected - actual):
    ERRORS.append(f"Registered operation missing Java route: {mapping}")
if ERRORS:
    for e in ERRORS:
        print("ERROR:", e, file=sys.stderr)
    raise SystemExit(1)
print(f"OpenAPI synchronization OK: {len(known)} designed operations, "
      f"{len(actual)} implemented mappings registered, {len(known)-len(actual)} planned.")
