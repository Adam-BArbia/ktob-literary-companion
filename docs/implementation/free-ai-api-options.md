# Free AI API options for KTOB

**Research refreshed:** 24 November 2026 UTC. This comparison uses current primary documentation and supersedes earlier free-tier suggestions. The owner has selected Groq, created an account/key and reported Global ZDR enabled. Actual KTOB qualification and live inference evidence are recorded separately in the [V3 release record](v3-release-demo.md). No alternative provider or automatic fallback is enabled by this document.

**Recommendation for this use case:** keep **GroqCloud with GPT-OSS 120B** as KTOB's selected provider and **Cloudflare Workers AI with Mistral Small 3.1** as the next provider to evaluate if needed. Their documented privacy controls fit a private literary companion better than unpaid services that may use conversation content for model improvement. Actual Groq replies in English, French and Arabic passed controlled KTOB preview checks and persisted after reload; book/spoiler/consent acceptance and a real production French reply also passed. The release record preserves the evidence and a questionable incidental plot detail observed in one reply. This ranking is engineering judgment, not a comparative literary benchmark.

Gemini Free is suitable only for a limited prototype using public, nonpersonal material under its applicable terms. The named OpenRouter/NVIDIA free endpoint is restricted to **public or synthetic experiments** because its endpoint notice excludes personal/confidential data and describes logging for security and product improvement. **Mistral's direct API and Cerebras do not currently meet the requested recurring-free, no-payment-method requirement.** A Cloudflare-hosted Mistral model is a different service from Mistral's direct API.

## Decision overview

| Option | Free / no-card evidence | Candidate | KTOB assessment |
|---|---|---|---|
| **1. GroqCloud** | Recurring Free plan; payment method required when upgrading. No-card access follows the documented Free/upgrade flow; not a universal account-eligibility promise. | `openai/gpt-oss-120b` | Selected KTOB provider; keep global ZDR and bounded context. |
| **2. Cloudflare Workers AI** | Explicit no-card Workers signup; AI allowance included in Free. | `@cf/mistralai/mistral-small-3.1-24b-instruct` | Strong alternative, including documented French/Arabic support. |
| **3. Gemini Developer API** | New accounts start Free; billing is a separate upgrade. | `gemini-3.8-flash` | Public, nonpersonal discussion only under applicable terms. |
| **4. OpenRouter** | `:free` variants explicitly need no credit purchase. | `nvidia/nemotron-3-ultra-550b-a55b:free` | Public/synthetic experiments only; this endpoint excludes personal/confidential data and logs use for security/product improvement. |
| **Exclude: Mistral direct API** | Free Vibe/Studio mode excludes API access; keys and API use require billing activation. | Direct Mistral API | Older “Experiment API is free without a card” advice is obsolete. |
| **Exclude: Cerebras** | Payment method required; $5 trial expires after 30 days. | Time-limited API trial | Does not meet the requested recurring free, no-card requirement. |

## 1. GroqCloud

[Groq's billing FAQ](https://console.groq.com/docs/billing-faqs) distinguishes Free from Developer and requires a valid payment method **to upgrade**. This supports using the Free plan without activating billing; public documentation is not a guarantee that every new account or region will pass verification. KTOB's owner reports an existing account/key and model visibility. Those reports establish more than an untested signup recommendation, but do not by themselves establish live inference, actual account quotas or payment settings.

Separately, the [V3 acceptance record](v3-release-demo.md) records seven successful real replies across preview and production, including English/French/Arabic checks, reload persistence and consent revocation. This is useful evidence for the selected integration, while account billing status and published quota ceilings remain distinct facts.

The [current Free quota table](https://console.groq.com/docs/rate-limits) lists, for both GPT-OSS 120B and 20B: **30 requests/minute, 1,000 requests/day, 8,000 tokens/minute and 200,000 tokens/day**. Limits apply at organization level, and the account console is authoritative. Every limit matters: 200,000 tokens would cover roughly 83 turns at an assumed 2,000 input plus 400 output tokens, before reasoning or other overhead. This is arithmetic, not measured capacity.

The [model page](https://console.groq.com/docs/model/openai/gpt-oss-120b) confirms the exact GPT-OSS 120B identifier and text-generation support. KTOB already implements this provider through its Java adapter. Its [reasoning guide](https://console.groq.com/docs/reasoning) supports low effort and `include_reasoning=false`; GPT-OSS does not accept `reasoning_format`. Model knowledge and multilingual capability still do not prove reliable quotations, Tunisian dialect or spoiler avoidance.

[Data controls](https://console.groq.com/docs/your-data) allow **all customers** to enable ZDR. The setting stops customer-content retention for reliability/abuse monitoring and disables features that need retained application state. Operational metadata remains separate from conversation content. Keep direct inference, global ZDR and no optional persistence; do not describe ZDR as eliminating all processing or KTOB's own saved chat history.

## 2. Cloudflare Workers AI

[Workers signup](https://www.cloudflare.com/products/workers/) explicitly advertises no credit card. [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) includes **10,000 Neurons/day** on Workers Free, resetting at **00:00 UTC**. Free-limit exhaustion causes errors; additional capacity requires upgrading. Several frontier models require a paid billing method, so the free offer does not cover the entire catalog. Tunisia account activation remains **unverified**.

The proposed [Mistral Small 3.1 endpoint](https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/) is Cloudflare-hosted, marked ZDR, and has a 128,000-token context. [Mistral's own model card](https://huggingface.co/mistralai/Mistral-Small-3.1-24B-Instruct-2503) explicitly includes **French and Arabic**, conversation and system instructions. Those capabilities justify evaluation; they do not prove Tunisian-dialect quality or spoiler reliability.

Current pricing is 31,876 Neurons per million input tokens and 50,488 per million output tokens. An illustrative 2,000-input/400-output turn consumes about 84 Neurons: approximately **119 turns/day**, with less capacity as history grows. This is an estimate from published unit prices, not measured KTOB throughput; the daily compute budget and any model/account rate limits both apply.

This is a candidate for the existing Java provider port, not a reason to move KTOB's backend or create another service. The model page documents direct REST and OpenAI-compatible access. Any provider change would still require explicit qualification and accurate consent copy; no silent fallback is configured.

[Workers AI data policy](https://developers.cloudflare.com/workers-ai/platform/data-usage/) states **no training on customer content** and no retention after standard stateless processing/delivery, subject to limited security/legal exceptions. Operational metadata remains. Logging, caching, batch/stateful features and third-party AI Gateway routing can change that treatment. Use a direct Cloudflare-hosted endpoint with no prompt logging or optional persistence.

## 3. Gemini Developer API

[Gemini 3.8 Flash pricing](https://aistudio.google.com/docs/pricing#gemini-3.8-flash) includes free standard input/output. [Billing documentation](https://aistudio.google.com/docs/billing) says new accounts begin Free; active billing is a separate upgrade, and some projects require verification. **Tunisia is explicitly supported** in the [available-regions list](https://aistudio.google.com/docs/available-regions). A Google account and account/project verification may still be necessary.

The current model/account allowance must be checked in AI Studio. Do not promise historical fixed request quotas or assume that every model on the pricing page is included in Free.

The decisive restriction is the [unpaid-service terms](https://aistudio.google.com/docs/terms): content and responses may improve Google products/models, human reviewers may process them, and personal, confidential or sensitive information must not be submitted. The terms require **Paid Services when an API client is made available to EEA, Swiss or UK users**. Hosting a Tunisian account's backend in Europe does not establish the European account exception. Gemini Free is therefore unsuitable for automatic private-journal personalization or as a silent fallback for personal conversations.

## 4. OpenRouter Free

[Official free-model guidance](https://openrouter.ai/collections/free-models) says `:free` variants require **no credit purchase**, with **20 requests/minute and 50 requests/day**. Failed attempts count toward the daily limit. The higher daily allowance requires purchasing credits. Other $0 models can require a funded account. The current catalog includes [Nemotron 3 Ultra Free](https://openrouter.ai/nvidia/nemotron-3-ultra-550b-a55b:free); availability can change and popularity is not a quality benchmark.

The [named NVIDIA free endpoint's notice](https://openrouter.ai/nvidia/nemotron-3-ultra-550b-a55b:free), rechecked on 24 November, explicitly says not to submit confidential information or personal data. It says usage is logged for security and improving NVIDIA products/services; improvement session data is described as unlinked to identity or a persistent identifier. That does not make it suitable for private KTOB conversations. Restrict this candidate to public/synthetic experiments and keep it unconfigured in KTOB.

[Underlying providers](https://openrouter.ai/docs/guides/privacy/provider-logging) have their own training and retention policies. OpenRouter documents separate training controls for paid and free models, but those controls do not replace endpoint-specific restrictions. Any different endpoint would require its own review; automatic free-model routing can change the processing party. This comparison does not establish a KTOB-approved confidential route or country-specific account access.

## Exclusions

[Mistral's current usage and limits documentation](https://docs.mistral.ai/admin/billing-usage/usage-limits) says Free mode covers a monthly Vibe/Studio trial budget but excludes API access. Creating API keys and using the API require billing activation and pay-as-you-go. Do not recommend the old direct “Experiment” API tier as meeting the owner's no-card/free requirement. This does not invalidate Cloudflare's separate free allowance for hosting an open Mistral model.

The [Cerebras trial FAQ](https://inference-docs.cerebras.ai/support/rate-limits) requires a **verified payment method** before API/Playground activation and provides **$5 expiring after 30 days**. Its payment requirement and time-limited credits exclude it from this shortlist.

## KTOB qualification before activation

This ranking is **product judgment from documentation, not a literary benchmark**. Compare the two leading candidates with identical French/Arabic questions: book identity, uncertain facts, fabricated quotations, partial reading progress, spoiler-inducing requests and appropriate refusal. No provider evidence reviewed establishes guaranteed spoiler avoidance.

Preserve [KTOB's consent rules](../architecture/01-architecture-decisions.md): AI processing opt-in is separate from personalization, and both default off. **V3 uses no stored personalization at all** and accepts no message-level `usePersonalContext` field. Its context contains only the submitted question, minimal selected-book metadata and bounded eligible conversation history. The broader future personalization design remains unimplemented. Selecting a provider does not authorize automatic journal transfer, whole-library upload or memory creation; consent alone does not override unsuitable provider terms.

Keep provider dispatch unavailable until account/model availability, retention settings, consent enforcement and bounded behavior are verified. The current V3 controls are documented in the provider guide; the older `AI_ENABLED` suggestion is superseded. Spoiler permission is per request; a new no-spoiler turn must exclude earlier full-spoiler history. Bound input/output, handle quota exhaustion truthfully, and keep reading/journal functions usable. These recurring free offers support a prototype; none promises indefinite free capacity or production availability.
