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


# Five final targeted contract regressions.
u01 = (ROOT / "docs/uml/01-use-cases.puml").read_text(encoding="utf-8")
u02 = (ROOT / "docs/uml/02-domain-library.puml").read_text(encoding="utf-8")
u06 = (ROOT / "docs/uml/06-packages.puml").read_text(encoding="utf-8")
u08 = (ROOT / "docs/uml/08-sequence-reading-journal.puml").read_text(encoding="utf-8")
u11 = (ROOT / "docs/uml/11-sequence-acquisition.puml").read_text(encoding="utf-8")
check('ReaderProfile "0..1" -- "0..*" BookWork' in u02,
      "BookWork optional owner multiplicity missing")
check("OPEN_LIBRARY work has zero" in u02 and "MANUAL work has exactly one" in u02,
      "conditional work ownership note missing")
check("Api ..> Export" in u06 and "Export ..> Api" not in u06,
      "API export dependency absent or circular")
check("UContext ..> UChat" in u01 and "UContext ..> URecommend" in u01,
      "optional conversation and recommendation context extensions missing")
check("AI processing consent gates every provider call" in u01,
      "processing opt-in must be independent of personalization")
money_pattern = r"^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$"
for name in ("Acquisition", "AcquisitionWrite", "AcquisitionPatch"):
    x = SCHEMAS[name]
    check(x["properties"]["paidPrice"].get("pattern") == money_pattern,
          f"{name} amount is not a nonnegative decimal string")
    cc = x["properties"]["currency"]
    check(cc.get("pattern") == r"^[A-Z]{3}$" and "TND" in cc.get("enum", [])
          and "ZZZ" not in cc.get("enum", []),
          f"{name} currency code not restricted")
check(len(SCHEMAS["Acquisition"]["allOf"]) == 2 and
      len(SCHEMAS["AcquisitionWrite"]["allOf"]) == 2,
      "full Acquisition/Write pairing validation absent")
check(SCHEMAS["AcquisitionPatch"].get("minProperties") == 1 and
      len(SCHEMAS["AcquisitionPatch"].get("allOf", [])) == 2 and
      "merged" in SCHEMAS["AcquisitionPatch"].get("description", "").lower(),
      "AcquisitionPatch partial / merged validation missing")
offers = PATHS["/catalog/works/{workId}/offers"]["get"]
check({"currency", "maxPrice"}.issubset({p["name"] for p in offers["parameters"]})
      and "400" in offers["responses"]
      and offers.get("x-ktob-parameter-dependency") == {"maxPrice": ["currency"]},
      "currency-scoped offer price filter missing")
archived_writes = [
    ("/library/{entryId}", "patch"),
    ("/library/{entryId}/experiences", "post"),
    ("/experiences/{experienceId}", "patch"),
    ("/experiences/{experienceId}/journal", "post"),
    ("/journal/{journalId}", "patch"), ("/journal/{journalId}", "delete"),
    ("/collections/{collectionId}/entries/{entryId}", "put"),
    ("/collections/{collectionId}/entries/{entryId}", "delete"),
    ("/library/{entryId}/saved-offers", "post"),
    ("/saved-offers/{offerId}", "delete"),
    ("/library/{entryId}/acquisitions", "post"),
    ("/acquisitions/{acquisitionId}", "patch"),
    ("/acquisitions/{acquisitionId}", "delete")
]
for path, verb in archived_writes:
    op = PATHS[path][verb]
    check("409" in op["responses"] and
          "LIBRARY_ENTRY_ARCHIVED" in op.get("description", ""),
          f"archived entry write not guarded: {verb} {path}")
check("LIBRARY_ENTRY_ARCHIVED" in u08 and "LIBRARY_ENTRY_ARCHIVED" in u11,
      "archived mutation missing in sequence diagrams")
check("restore" in PATHS["/library/{entryId}"] or
      "/library/{entryId}/restore" in PATHS,
      "restore endpoint missing")


# JSON Schema example-level regression tests, not just static string assertions.
try:
    from jsonschema import Draft202012Validator
except ImportError:
    fail("jsonschema 4.23.0 not installed")
else:
    for name in ("Acquisition", "AcquisitionWrite", "AcquisitionPatch"):
        Draft202012Validator.check_schema(SCHEMAS[name])
    def accepts(name, data):
        return Draft202012Validator(SCHEMAS[name]).is_valid(data)
    good = {"accessType": "OWNED", "paidPrice": "20.00", "currency": "TND"}
    check(accepts("AcquisitionWrite", good), "valid currency pair rejected")
    check(accepts("AcquisitionWrite", {"accessType": "OWNED"}),
          "optional monetary pair rejected")
    check(accepts("AcquisitionWrite", {"accessType": "OWNED", "paidPrice": None, "currency": None}),
          "null monetary pair rejected")
    for bad in (
        {"accessType": "OWNED", "paidPrice": "-1.00", "currency": "TND"},
        {"accessType": "OWNED", "paidPrice": "10.00"},
        {"accessType": "OWNED", "currency": "TND"},
        {"accessType": "OWNED", "paidPrice": "10.00", "currency": "ZZZ"},
        {"accessType": "OWNED", "paidPrice": "10.00", "currency": "tnd"},
        {"accessType": "OWNED", "paidPrice": "10.00", "currency": None},
        {"accessType": "OWNED", "paidPrice": None, "currency": "TND"},
    ):
        check(not accepts("AcquisitionWrite", bad), f"invalid monetary pair accepted: {bad}")
    check(accepts("AcquisitionPatch", {"paidPrice": "20.00"})
          and accepts("AcquisitionPatch", {"currency": "TND"}),
          "legitimate single-field PATCH rejected")
    check(not accepts("AcquisitionPatch", {"paidPrice": "-1.00"}),
          "negative PATCH amount accepted")
    check(not accepts("AcquisitionPatch", {"paidPrice": "10.00", "currency": None}),
          "contradictory PATCH fields accepted")
    check(not accepts("AcquisitionPatch", {"paidPrice": None, "currency": "TND"}),
          "contradictory null PATCH fields accepted")
    stored = {"accessType": "OWNED", "paidPrice": "12.00", "currency": "TND"}
    check(accepts("AcquisitionWrite", {**stored, "paidPrice": "15.00"}),
          "merged valid price-only PATCH rejected")
    check(not accepts("AcquisitionWrite", {**stored, "paidPrice": None}),
          "merged invalid single-field PATCH accepted")


# User-approved R1 product defaults: schema and cross-document regression.
reader_rating = SCHEMAS["ReadingExperience"]["properties"]["rating"]
reader_progress = SCHEMAS["ReadingExperience"]["properties"]["progressPercent"]
for name in ("ReadingExperience", "ExperienceWrite", "ExperiencePatch"):
    dto = SCHEMAS[name]
    check("progress" not in dto["properties"],
          f"retired untyped progress field still present in {name}")
    rating = dto["properties"]["rating"]
    percent = dto["properties"]["progressPercent"]
    check(rating.get("minimum") == 1 and rating.get("maximum") == 5 and
          rating.get("multipleOf") == 0.5 and "null" in rating.get("type", []),
          f"{name}.rating is not optional half-stars")
    check(percent.get("minimum") == 0 and percent.get("maximum") == 100 and
          "integer" in percent.get("type", []) and "null" in percent.get("type", []),
          f"{name}.progressPercent is not optional 0..100 integer")
check(SCHEMAS["ReaderProfile"]["properties"]["displayName"]["minLength"] == 1
      and SCHEMAS["ReaderProfile"]["properties"]["displayName"]["maxLength"] == 100,
      "minimal editable displayName is missing bounds")
check(set(SCHEMAS["ProfilePatch"]["properties"]) == {"displayName"},
      "public profile or mandatory onboarding fields unexpectedly introduced")

for name in ("MessageWrite", "RecommendationRequest"):
    dto = SCHEMAS[name]
    check("spoilerLevel" in dto["properties"] and
          "fullBookSpoilersConfirmed" in dto["properties"] and
          len(dto.get("allOf", [])) == 2,
          f"{name} must represent explicit per-request spoiler confirmation")
check(SCHEMAS["SpoilerLevel"]["enum"] == ["NO_SPOILERS", "FULL_BOOK_SPOILERS"] and
      SCHEMAS["SpoilerLevel"].get("default") == "NO_SPOILERS",
      "spoiler policy must default NO_SPOILERS")
for path, verb in (("/recommendations", "post"),
                   ("/conversations/{conversationId}/messages", "post")):
    op = PATHS[path][verb]
    check("422" in op["responses"] and
          "SPOILER_CONFIRMATION_REQUIRED" in op.get("description", ""),
          f"{path} must reject unconfirmed spoilers before dispatch")
check("spoilerLevel" in SCHEMAS["ConversationTurn"]["required"] and
      "spoilerLevel" in SCHEMAS["RecommendationResult"]["required"],
      "AI turn and recommendations must report effective spoiler level")

u02 = (ROOT / "docs/uml/02-domain-library.puml").read_text(encoding="utf-8")
u03 = (ROOT / "docs/uml/03-domain-advisor.puml").read_text(encoding="utf-8")
u09 = (ROOT / "docs/uml/09-sequence-recommendation.puml").read_text(encoding="utf-8")
u10 = (ROOT / "docs/uml/10-sequence-memory.puml").read_text(encoding="utf-8")
check("progressPercent" in u02 and "Optional rating: 1.0..5.0" in u02,
      "reading UML not aligned with approved rating/progress")
check("SpoilerLevel" in u03 and "fullBookSpoilersConfirmed" in u03,
      "advisor UML missing spoiler policy")
check("SPOILER_CONFIRMATION_REQUIRED" in u09 and
      "SPOILER_CONFIRMATION_REQUIRED" in u10,
      "chat and recommendation sequences must reject missing spoiler acknowledgement")

gate = (ROOT / "docs/architecture/06-review-gates.md").read_text(encoding="utf-8")
check("ready for local Sprint 0" in gate and
      all(token in gate for token in ("B13", "B15", "B16")) and
      "Independent feature gates remain CLOSED" in gate,
      "local implementation is allowed only with B13/B15/B16 feature gates closed")
review = (ROOT / "docs/architecture/08-gate-b-decision-review.md").read_text(encoding="utf-8")
check("APPROVED by the reader" in review and "B13" in review and "BLOCKED" in review,
      "review register must distinguish approved R1 defaults from provider/deletion blockers")

if 'Draft202012Validator' in globals():
    for name in ("ReadingExperience", "ExperienceWrite", "ExperiencePatch",
                 "MessageWrite", "RecommendationRequest"):
        Draft202012Validator.check_schema(SCHEMAS[name])
    # Examples must test real 2020-12 conditional JSON Schema behavior.
    experience_base = {"status": "CURRENTLY_READING"}
    good_experiences = [
        experience_base,
        {**experience_base, "rating": None, "progressPercent": None},
        {**experience_base, "rating": 1, "progressPercent": 0},
        {**experience_base, "rating": 3.5, "progressPercent": 72},
        {**experience_base, "rating": 5, "progressPercent": 100},
    ]
    for item in good_experiences:
        check(accepts("ExperienceWrite", item),
              f"valid reading values were rejected: {item}")
    bad_experiences = [
        {**experience_base, "rating": 0.5},
        {**experience_base, "rating": 5.5},
        {**experience_base, "rating": 4.2},
        {**experience_base, "progressPercent": -1},
        {**experience_base, "progressPercent": 101},
        {**experience_base, "progressPercent": 50.5},
        {**experience_base, "progress": "halfway"},
    ]
    for item in bad_experiences:
        check(not accepts("ExperienceWrite", item),
              f"invalid reading values were accepted: {item}")
    for name, base in (("MessageWrite", {"body": "Discuss this work"}),
                       ("RecommendationRequest",
                        {"mode": "BALANCED", "usePersonalContext": False})):
        for good in (
            base,
            {**base, "spoilerLevel": "NO_SPOILERS"},
            {**base, "spoilerLevel": "NO_SPOILERS",
             "fullBookSpoilersConfirmed": False},
            {**base, "spoilerLevel": "FULL_BOOK_SPOILERS",
             "fullBookSpoilersConfirmed": True},
        ):
            check(accepts(name, good),
                  f"valid spoiler policy rejected: {name} {good}")
        for bad in (
            {**base, "spoilerLevel": "FULL_BOOK_SPOILERS"},
            {**base, "spoilerLevel": "FULL_BOOK_SPOILERS",
             "fullBookSpoilersConfirmed": False},
            {**base, "spoilerLevel": "NO_SPOILERS",
             "fullBookSpoilersConfirmed": True},
            {**base, "fullBookSpoilersConfirmed": True},
            {**base, "spoilerLevel": "UNKNOWN"},
        ):
            check(not accepts(name, bad),
                  f"unconfirmed or invalid spoiler policy accepted: {name} {bad}")

print(f"Checked {len(diagrams)} named UML diagrams, {operations} OpenAPI operations, "
      f"{len(SCHEMAS)} schemas, {list_count} cursor-paginated GET routes.")
if ERRORS:
    for e in ERRORS:
        print("ERROR:", e, file=sys.stderr)
    sys.exit(1)
print("KTOB documentation consistency checks passed.")
