#!/usr/bin/env python3
"""Read-only KTOB architecture-contract checks. Not application code."""
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
SPEC = json.loads((ROOT / "docs/architecture/openapi.json").read_text(encoding="utf-8"))
SCHEMAS = SPEC["components"]["schemas"]
PATHS = SPEC["paths"]
ERRORS = []

def fail(message):
    ERRORS.append(message)

def check(condition, message):
    if not condition:
        fail(message)

def walk(value):
    if isinstance(value, dict):
        if "$ref" in value:
            ref = value["$ref"]
            if not ref.startswith("#/components/schemas/") or ref.split("/")[-1] not in SCHEMAS:
                fail(f"unresolved JSON reference: {ref}")
        for v in value.values():
            walk(v)
    elif isinstance(value, list):
        for v in value:
            walk(v)

def response_model(path, verb="get", status="200"):
    return PATHS[path][verb]["responses"][status]["content"]["application/json"]["schema"]

check(SPEC["openapi"].startswith("3.1."), "OpenAPI must be 3.1")
walk(SPEC)
ids = set()
list_count = 0
operations = 0
for path, methods in PATHS.items():
    for verb, operation in methods.items():
        operations += 1
        oid = operation.get("operationId")
        check(bool(oid) and oid not in ids, f"duplicate or missing operationId: {path} {verb}")
        ids.add(oid)
        params = operation.get("parameters", [])
        for name in re.findall(r"\{([^}]+)\}", path):
            check(any(x["name"] == name and x["in"] == "path" and x["required"] for x in params),
                  f"missing required path parameter: {path} {name}")
        if verb == "get":
            r200 = operation.get("responses", {}).get("200", {})
            payload = r200.get("content", {}).get("application/json", {}).get("schema", {})
            meta = payload.get("properties", {}).get("meta", {})
            if "nextCursor" in meta.get("properties", {}):
                list_count += 1
                check(all(any(p.get("name") == name and p.get("in") == "query" for p in params)
                          for name in ("limit", "cursor")), f"pagination input missing: {path}")
        if verb == "patch" and operation.get("requestBody"):
            schema = operation["requestBody"]["content"]["application/json"]["schema"]
            if "$ref" in schema:
                definition = SCHEMAS[schema["$ref"].split("/")[-1]]
                check(definition.get("minProperties") == 1 and not definition.get("required"),
                      f"PATCH body must be partial and nonempty: {path}")

diagrams = sorted((ROOT / "docs/uml").glob("[0-9][0-9]-*.puml"))
check(len(diagrams) == 16, f"16 UML diagrams required, got {len(diagrams)}")
for path in diagrams:
    source = path.read_text(encoding="utf-8")
    check(re.search(r"^@startuml KTOB_", source) is not None and source.rstrip().endswith("@enduml"),
          f"missing named diagram wrapper: {path.name}")

u03 = (ROOT / "docs/uml/03-domain-advisor.puml").read_text()
u09 = (ROOT / "docs/uml/09-sequence-recommendation.puml").read_text()
u14 = (ROOT / "docs/uml/14-state-reading.puml").read_text()
u15 = (ROOT / "docs/uml/15-state-memory.puml").read_text()
u16 = (ROOT / "docs/uml/16-state-offer.puml").read_text()
check("aiProcessingOptIn" in u03 and "AI processing NOT authorized" in u09,
      "AI processing gate missing from UML")
check("WANT_TO_READ" not in SCHEMAS["ExperienceWrite"]["properties"]["status"]["enum"]
      and "[*] --> WANT_TO_READ" not in u14, "WANT_TO_READ must not be a reading experience state")
check("RECHECKED" not in u16, "R1 offers must not claim automatic rechecking")
check("APPROVED --> REVOKED" in u15, "terminal memory revocation missing")
check("active" not in SCHEMAS["MemoryPatch"]["properties"], "memory PATCH may reactivate")
check("aiProcessingOptIn" in SCHEMAS["PrivacySettings"]["properties"], "AI processing opt-in missing")
check("RecommendationResult" in SCHEMAS, "recommendation batch schema missing")
check(response_model("/recommendations", "post")["properties"]["data"]["$ref"].endswith("RecommendationResult"),
      "recommendations must return a batch, not one Recommendation")
check("403" in PATHS["/recommendations"]["post"]["responses"], "missing consent-required response")
check("403" in PATHS["/conversations/{conversationId}/messages"]["post"]["responses"],
      "chat missing consent-required response")
check("ConversationTurn" in SCHEMAS and
      response_model("/conversations/{conversationId}/messages", "post", "201")["properties"]["data"]["$ref"].endswith("ConversationTurn"),
      "chat must return a conversation turn")
check("/collections/{collectionId}/entries" in PATHS, "collection entries cannot be read")
check(PATHS["/collections/{collectionId}/entries/{entryId}"]["put"]["responses"].get("204") is not None,
      "collection membership PUT must return 204")
check("OfferLookupMeta" in SCHEMAS and
      SCHEMAS["OfferLookupMeta"]["properties"]["providerStatus"]["$ref"].endswith("ProviderStatus"),
      "offer providerStatus metadata missing")
check(SCHEMAS["BookEdition"]["properties"]["format"]["type"] == ["string", "null"],
      "edition format must permit unknown/null")
check("restoreMyLibraryEntry" == PATHS["/library/{entryId}/restore"]["post"]["operationId"],
      "library restore endpoint missing")
check("archive" in PATHS["/library/{entryId}"]["delete"].get("description", "").lower(),
      "library entry deletion must be archival")
check("OfferWrite" in SCHEMAS and "allOf" in SCHEMAS["OfferWrite"],
      "price/currency pairing enforcement missing")
check(len(SCHEMAS["Export"]["properties"]["library"]) > 0, "R1 export missing")
check("07-consistency-matrix.md" in
      [p.name for p in (ROOT / "docs/architecture").iterdir()],
      "traceability matrix missing")
check("/me" in PATHS and "delete" not in PATHS["/me"],
      "full account deletion must remain BLOCKED")
check(operations == 57, f"expected 57 deliberately reviewed operations, found {operations}")

print(f"Checked {len(diagrams)} named UML diagrams, {operations} OpenAPI operations, "
      f"{len(SCHEMAS)} schemas, {list_count} cursor-paginated GET routes.")
if ERRORS:
    for e in ERRORS:
        print("ERROR:", e, file=sys.stderr)
    sys.exit(1)
print("KTOB documentation consistency checks passed.")
