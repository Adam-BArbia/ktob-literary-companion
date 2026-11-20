# Security, consent and privacy specification (draft)

## Trust boundaries

1. **Reader's browser:** untrusted. Angular sends short-lived Supabase Auth bearer tokens to Java, not database credentials.
2. **Spring Boot API:** trusted policy-enforcement boundary, but only after validating requests and verifying token issuer, signature, audience, expiry and subject. Validate asymmetric tokens via the project's Supabase JWKS, or use a reviewed verification pathway for legacy symmetric tokens; never assume JWKS exists for all configurations.
3. **Supabase PostgreSQL:** backend stores private data; prefer non-exposed `app` schema. Neither a backend admin connection nor service role should be assumed to obey the same RLS as regular authenticated readers.
4. **External APIs:** Open Library gets book lookup metadata only; AI gets explicitly allowed context; seller providers get only needed query criteria.

## AuthN and AuthZ

- Authenticate with Supabase Auth; backend validates JWT on **every** private request. Use validated `sub` as reader identity. Never trust `readerId` from query/body.
- Access-token verification must check `iss`, expected audience, `exp`, `nbf` where relevant, allowed signing algorithm, `kid` and key rotation. Only accept tokens for KTOB's intended Supabase project. Reject anonymous sign-ins if the product requires a registered account.
- For sensitive destructive operations, require recent reauthentication / session validation; JWT expiry alone does not prove immediate revocation.
- Every lookup, nested entry, journal, collection membership, offer and memory must be owner-scoped. Tests must verify cross-account IDOR/BOLA, including UUID substitution.
- Authentication UI, session refresh and sign-out belong to the frontend/Auth integration; backend never handles user passwords.

## AI and memory — decisions separate from authentication

| Control | Default | Enforcement |
|---|---|---|
| `aiProcessingOptIn` | false | No outbound prompt/message to AI unless enabled and permitted |
| `personalizationOptIn` | false | No history/journal/approved memory supplied unless true |
| `useReadingHistory` | false | Separate history selection |
| `useAllowedJournal` | false | Must also filter per-entry `allowForPersonalization` |
| `useExplicitPreferences` | false | Reader-selected preferences only |
| `useApprovedMemories` | false | Only active approved memories |
| Explicit content boundaries | reader-managed | Enforced in every recommendation request |
| Temporary boundary override | none | Valid only if explicit and bound to single request |

The API must return a meaningful consent-required response if AI was requested without permission, or provide a clearly labeled **non-AI** fallback. A generic AI call is not a zero-data-processing fallback. Avoid storing raw full journal content in logs and error reports.

## Abuse prevention and deployment

- CORS allow only approved Vercel origin(s), account for preview URLs without wildcard credentials.
- Validate and length-limit text and URLs, constrain file imports if added in R2, sanitize displayed content against XSS.
- Rate-limit AI and book search per reader; bound prompt context and request duration. Free Render may sleep; do not expose provider keys in Angular.
- Store DB credentials, provider credentials and signing-related secrets only in Render environment variables/secrets. Supabase public/publishable key may be sent to Angular; never expose secret/service-role keys.
- TLS for all HTTP and PostgreSQL traffic, strict timeouts and safe upstream error handling.
- Audit consent changes and approved memory decisions with limited non-sensitive event details.

## Outstanding policy decisions

Export type, account deletion proof, optional recovery period, handling of third-party AI provider retention, and actual chosen signing method are open. No security claims are production-audited yet.

References:
- https://supabase.com/docs/guides/auth/jwts
- https://supabase.com/docs/guides/auth/signing-keys
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/security/product-security
