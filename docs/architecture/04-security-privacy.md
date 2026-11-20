# Authentication, privacy and AI safety — design draft v0.2

## Trust boundaries

Angular is an untrusted browser client. It uses Supabase Auth for sign-in and sends an access-token bearer header to Spring Boot, the **only** business-data API. Backend verifies the exact project's accepted JWT algorithm/signature (project signing key or JWKS where applicable), issuer, audience, expiry, subject and session policy; derives `reader_id` from verified `sub`, never a client-supplied field. Avoid user-editable JWT metadata as authorization input.

All private resources must be fetched and updated through reader-scoped queries; hidden/private manual works never reveal existence. Use `404` for absent or other-reader UUIDs. Nested references (collection–entry, experience–entry, memory–message/proposal, edition–work) require *both* same-owner and relational validation. Test with two separate authenticated reader identities.

Proposed `app` PostgreSQL schema is not exposed to Supabase Data API. Use dedicated least-privilege DB credentials; recognize that service/admin roles can bypass RLS. Every exposed schema requires appropriate RLS policies; defense in depth does not replace Java checks.

## Separate consent controls (both default OFF)

| Control | Meaning | Enforcement |
|---|---|---|
| `aiProcessingOptIn` | permission to submit **any** data to external AI | Required and rechecked immediately before **every** AI provider dispatch |
| `personalizationOptIn` | permission to use stored reader context | Also requires the specific request's `usePersonalContext` and each relevant scope flag |
| `useReadingHistory` | include allowed reading history | only if personalization authorized |
| `useAllowedJournal` | include eligible journal entries | additionally filter `allowForPersonalization=true` for each entry |
| `useExplicitPreferences` | include reader-entered preferences | only when authorized |
| `useApprovedMemories` | include approved active memories | never include pending/dismissed/revoked memory |
| Firm content boundary | explicit reader restriction | always enforce, regardless of SURPRISE mode or personalization |
| Request-scoped exception | explicit temporary exception ID | only one recommendation request, never persistent rule mutation |

**Missing processing consent:** recommendation/message POST returns `403` RFC 9457 problem with `code=AI_PROCESSING_CONSENT_REQUIRED` and **does not call AI**. No generic prompt is exempt. Provider unavailable yields `503`; no silent invented AI output. Rechecking just before dispatch reduces race windows, but cannot recall already transmitted data if consent changes after dispatch; provider retention is subject to its verified terms.

Conversations are not journal entries. An AI-generated candidate becomes only `PENDING`; a reader's explicit approval creates an `ApprovedMemory` tied to the source proposal. No implicit learning across chats; revoking a memory is terminal. `PATCH /memories/{id}` edits text of an active approved memory only, without status/active fields.

## Boundary and provenance safeguards

A model's claim about book plot, edition, content warning, or seller price is *not verification*. Apply hard restrictions to recommendations **after generation**; if warning coverage is partial or unknown, don't certify that the work is safe against a firm boundary. Explicit one-request exceptions cannot be guessed from chat text alone. Only documented validated providers supply `VERIFIED_PROVIDER` offers; users may keep separately marked `USER_SUPPLIED` historical observations.

## HTTP, keys and operational controls

- Only `GET /health` is public, exposing `{"status":"ok"}` without private infrastructure details.
- Use CORS for exact approved Vercel origins; preview URLs require deliberate policy, not wildcard credentialed origins.
- Never expose database password, service-role or AI-provider key in Angular or GitHub commits. A frontend Supabase publishable key can be public.
- Validate all request bodies and URLs, clamp pagination sizes, sanitize display, avoid private prompt/journal logging, apply per-reader search and AI rate limits.
- `Idempotency-Key` is reader+method+path scoped; identical retries return the original response and changed payload returns `409`. Storage/expiry policy minimum 24 hours is a **proposal**.
- Full account deletion is **BLOCKED** pending recent reauthentication, retention, Supabase session revocation and dependent record/third-party data handling. JWT expiry alone does not immediately revoke tokens.
- Use TLS for APIs/DB and safe bounded upstream timeouts. Passwords remain managed by Supabase Auth.

References: https://supabase.com/docs/guides/auth/jwts ; https://supabase.com/docs/guides/database/postgres/row-level-security .
