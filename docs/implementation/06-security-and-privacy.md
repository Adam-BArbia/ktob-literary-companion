# Security and privacy implementation checklist

## Boundary diagram in words

Untrusted Angular browser → **verified Supabase Auth user JWT** → Spring Boot authentication filter/security context → owner-scoped application services → private non-exposed `app` schema → PostgreSQL. No direct business-table writes from the browser, no browser-held database credentials or AI keys. Open Library sees book-search metadata only. Selected AI provider (later) sees only explicitly authorized prompt/context.

## Auth implementation acceptance

1. Choose the actual project's Supabase signing mode before configuration. For asymmetric signing, verify access tokens against that project's JWKS (key rotation, `kid`, accepted algorithm). For legacy symmetric signing, use a reviewed server-only verification approach; never accept unsigned/HS tokens on an assumed JWKS path.
2. Spring Security Resource Server validates signature, exact issuer, audience, `exp`, `nbf` as applicable and subject `sub`. Treat `sub` UUID as `readerId` only after verification. Reject expired/wrong-project/invalid JWT.
3. Never authorize based on user-editable `user_metadata`. Backend uses JWT identity, not `readerId` supplied in URL/body. For sensitive operations, account for live session revocation (JWT validity alone is insufficient for immediate logout effects).
4. Reader A may not fetch/update/archive any reader B library, private manual work, collection, reading, journal, memory, offer, acquisition or export; return 404 to avoid existence leaks. Check nested relation ownership and edition-to-work references.
5. Owner-scoped archive checks: ownership first (404 if not owner), then `archivedAt` (409 `LIBRARY_ENTRY_ARCHIVED` for any descendant write). Historical owned reads allowed.
6. Use HTTPS, strict CORS for known Angular origins, secure cookies/storage strategy appropriate to Supabase Auth SPA, CSRF analysis for chosen token transport, rate limits, bounded payload sizes and safe exceptions.

## PostgreSQL and RLS defense in depth

Do not expose `app` schema through Supabase Data API; configure allowed schemas and grants explicitly. Use a role with minimum required privileges, distinct migration admin credentials, and avoid `service_role` as browser or normal database connection. RLS on exposed tables is mandatory; for private `app` schema, review defense-in-depth RLS without incorrectly assuming the backend service role supplies a user's `auth.uid()` automatically. Do not add unreviewed `SECURITY DEFINER` functions or public views that bypass RLS. Verify actual access using a browser publishable key and an unauthenticated JWT.

## Data-handling matrix

| Data | At rest | External disclosure |
|---|---|---|
| Library/work ownership | Private `app` schema | Open Library receives only book search terms |
| Journal body, quotes, emotions | Private owner-scoped rows | Only eligible entries when processing and personalization + journal entry permission all active |
| Conversations | Own messages retained as specified in policy | Only user-requested prompt, and allowed history; NO_SPOILERS turns redact prior FULL_BOOK_SPOILERS turns |
| Approved memory | Stored only after explicit reader approval | Only when processing/personalization and memory scope enabled |
| Raw memory proposal | PENDING, editable/dismissable | Not reusable as approved memory |
| Privacy flags | False by default with non-sensitive audit | Provider receives no copy of all settings; only necessary derived policy |
| Seller offer snapshot | Historical observedAt/currency/source | No verified seller lookup until a source is selected |
| Export | On-demand owner-only response; avoid permanent cloud file unless approved | Browser download initiated by owner; no public link |

### AI dispatch procedure (mandatory ordering)

Authenticate and authorize → validate request/explicit spoiler confirmation → load effective privacy settings → restrict by firm boundaries and per-note exclusion → select **minimal** allowed context → redact previous full-spoiler turns for a NO_SPOILERS request → **recheck `aiProcessingOptIn` immediately before dispatch** → call verified external provider if selected → validate/sanitize response → persist only allowed output. If consent missing, 403 `AI_PROCESSING_CONSENT_REQUIRED`; if spoiler confirmation missing, 422 `SPOILER_CONFIRMATION_REQUIRED`; if provider unconfigured, 503. A revoke after already sending data cannot undo provider processing; disclose that limitation.

### Spoiler and content-boundary caution

`FULL_BOOK_SPOILERS` grants permission to discuss full-book spoilers for one request; it never overrides firm disallowed content boundaries or AI-processing consent. `NO_SPOILERS` is best effort, not a guarantee. Avoid adding spoilers to debug logs or errors.

## Logs, secrets, backups, export/deletion

Never log JWTs, database URLs, raw journal bodies, full prompts, full AI response, or user export. Generate safe correlation IDs and structured logs; redact auth headers. Keep API/DB/provider secrets in Render and CI secret stores, not committed .env. Export R1 is partial (five arrays); **full user deletion is not designed/activated**, because retention, session invalidation, backup purge and provider data contracts are unresolved. Do not claim compliance with privacy laws based only on having a delete button.

## Verification

- 2-user IDOR/BOLA tests for **every** private root and nested resource.
- Distinct tests for expired/wrong-issuer/wrong-audience JWTs and malicious UUID substitution.
- Check browser cannot query `app` schema with publishable key.
- Tests proving AI is not called without consent and excluded journal isn't included even with global context on.
- 422 no-spoiler pair tests, replay-history spoiler-filter tests and non-sticky full-spoiler consent.
- Logs and exported content audited with fake secret canaries.
- Archive test: owner historical GET succeeds, all descendant mutations 409, cross-owner 404.
- Full account deletion remains disabled; do not run speculative SQL against real data.

Supabase documentation checked during handoff:
- https://supabase.com/docs/guides/database/secure-data
- https://supabase.com/docs/guides/auth/jwts
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/connecting-to-postgres
