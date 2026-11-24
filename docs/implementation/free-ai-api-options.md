# Free AI API options for KTOB

**V3 update:** the owner has since selected Groq, created an account/key and reported Global ZDR enabled. This comparison remains the V2 research snapshot; current qualification, secret-presence checks and real inference evidence belong to the [V3 release record](v3-release-demo.md). V3 uses a deployment-managed qualification setting plus a server-only key, without requiring the owner to add `AI_ENABLED`.

**Research checked:** 23 November 2026 UTC / 24 November 2026 Africa/Tunis. **Status:** recommendation only; B16 remains open. No account signup, API-key configuration, inference request, latency measurement or provider activation was performed. Published limits can change, and account eligibility is distinct from a provider's public offer.

**Recommendation:** evaluate **GroqCloud with GPT-OSS 120B first**, enabling Zero Data Retention (ZDR), then **Cloudflare Workers AI with Mistral Small 3.1**. Gemini Free is restricted to suitable nonpersonal use; OpenRouter Free is experimental. Cerebras currently fails the requirement for recurring free API access without a payment method.

## Decision overview

| Option | Free / no-card evidence | Candidate | KTOB assessment |
|---|---|---|---|
| **1. GroqCloud** | Recurring Free plan; payment method required when upgrading. No-card activation is a documented-flow inference, not a tested signup. | `openai/gpt-oss-120b` | Best first evaluation: production model and configurable ZDR. |
| **2. Cloudflare Workers AI** | Explicit no-card Workers signup; AI allowance included in Free. | `@cf/mistralai/mistral-small-3.1-24b-instruct` | Strong alternative, including documented French/Arabic support. |
| **3. Gemini Developer API** | New accounts start Free; billing is a separate upgrade. | `gemini-3.8-flash` | Public, nonpersonal discussion only under applicable terms. |
| **4. OpenRouter** | `:free` variants explicitly need no credit purchase. | `nvidia/nemotron-3-ultra-550b-a55b:free` | Small experimental allowance; endpoint privacy needs qualification. |
| **Exclude: Cerebras** | Payment method required; $5 trial expires after 30 days. | GPT-OSS 120B / Qwen 3.8 27B | No renewing free tier. |

## 1. GroqCloud

[Groq's billing FAQ](https://console.groq.com/docs/billing-faqs) distinguishes Free from Developer and requires a valid payment method **to upgrade**. [Official signup guidance](https://console.groq.com/landing/hackathon) describes free registration. Together these support no-card Free access, but an explicit universal no-card activation promise was not found. Tunisia signup eligibility remains **unverified**; no country-specific confirmation was found. Account verification and applicable export restrictions still matter.

The [current Free quota table](https://console.groq.com/docs/rate-limits) lists, for both GPT-OSS 120B and 20B: **30 requests/minute, 1,000 requests/day, 8,000 tokens/minute and 200,000 tokens/day**. Limits apply at organization level, and the account console is authoritative. Every limit matters: 200,000 tokens would cover roughly 83 turns at an assumed 2,000 input plus 400 output tokens, before reasoning or other overhead. This is arithmetic, not measured capacity.

The [model catalog](https://console.groq.com/docs/models) explicitly classifies GPT-OSS 120B/20B as **production models**. It currently marks Llama 3.3 70B and Llama 3.1 8B as Enterprise / Contact Sales; older free-model recommendations are unsafe to reuse. Qwen 3.8 27B appears as **Preview**, unsuitable as the stable default.

The [Services Agreement](https://console.groq.com/docs/legal/services-agreement) prohibits training or fine-tuning with inputs/outputs without explicit customer permission. [Data controls](https://console.groq.com/docs/your-data) allow **all customers** to enable ZDR. Without it, reliability/abuse investigations may retain content for up to 30 days, with legal exceptions. Usage metadata remains without prompt/response content. Prefer direct inference with global ZDR and no optional stateful features. Free regional processing guarantees were not established.

## 2. Cloudflare Workers AI

[Workers signup](https://www.cloudflare.com/products/workers/) explicitly advertises no credit card. [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) includes **10,000 Neurons/day** on Workers Free, resetting at **00:00 UTC**. Free-limit exhaustion causes errors; additional capacity requires upgrading. Several frontier models require a paid billing method, so the free offer does not cover the entire catalog. Tunisia account activation remains **unverified**.

The proposed [Mistral Small 3.1 endpoint](https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/) is Cloudflare-hosted, marked ZDR, and has a 128,000-token context. [Mistral's own model card](https://huggingface.co/mistralai/Mistral-Small-3.1-24B-Instruct-2503) explicitly includes **French and Arabic**, conversation and system instructions. Those capabilities justify evaluation; they do not prove Tunisian-dialect quality or spoiler reliability.

Current pricing is 31,876 Neurons per million input tokens and 50,488 per million output tokens. An illustrative 2,000-input/400-output turn consumes about 84 Neurons: approximately **119 turns/day**, with shorter capacity as history grows. [Text generation limits](https://developers.cloudflare.com/workers-ai/platform/limits/) default to 300 requests/minute for models without a paid-plan requirement; the daily compute budget remains the practical constraint.

Other current evaluation candidates are [Qwen 3.8 27B](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/) and [Llama 3.3 70B FP8](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/). Avoid starting with [Qwen3-30B-A3B](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/): its page marks it deprecated on **20 November 2026**.

[Workers AI data policy](https://developers.cloudflare.com/workers-ai/platform/data-usage/) states **no training on customer content** and no retention after standard stateless processing/delivery, subject to limited security/legal exceptions. Operational metadata remains. Logging, caching, batch/stateful features and third-party AI Gateway routing can change that treatment. Use a direct Cloudflare-hosted endpoint with no prompt logging or optional persistence.

## 3. Gemini Developer API

[Gemini 3.8 Flash pricing](https://aistudio.google.com/docs/pricing) includes free standard input/output. [Billing documentation](https://aistudio.google.com/docs/billing) says new accounts begin Free; active billing is a separate upgrade. Some Free projects/accounts require [physical mobile-device verification](https://aistudio.google.com/docs/verification), distinct from card verification. **Tunisia is explicitly supported** in the [available-regions list](https://aistudio.google.com/docs/available-regions).

[Current quotas](https://aistudio.google.com/docs/rate-limits) depend on model, project tier and account state and are shown in AI Studio. Do not promise historical fixed allowances. Limits apply per project; daily request quotas reset at midnight Pacific time.

The decisive restriction is the [unpaid-service terms](https://aistudio.google.com/docs/terms): content and responses may improve Google products/models, human reviewers may process them, and personal, confidential or sensitive information must not be submitted. The terms require **Paid Services when an API client is made available to EEA, Swiss or UK users**. Hosting a Tunisian account's backend in Europe does not establish the European account exception. Gemini Free is therefore unsuitable for automatic private-journal personalization or as a silent fallback for personal conversations.

## 4. OpenRouter Free

[Official free-model guidance](https://openrouter.ai/collections/free-models) says `:free` variants require **no credit purchase**, with **20 requests/minute and 50 requests/day**. Failed attempts count toward the daily limit. The higher daily allowance requires purchasing credits. Other $0 models can require a funded account. The current catalog includes [Nemotron 3 Ultra Free](https://openrouter.ai/nvidia/nemotron-3-ultra-550b-a55b:free); availability can change and popularity is not a quality benchmark.

[OpenRouter itself](https://openrouter.ai/docs/guides/privacy/data-collection) generally avoids content storage unless opted in or a safety/legal exception applies. [Underlying providers](https://openrouter.ai/docs/guides/privacy/provider-logging) have their own training and retention policies. Privacy documentation describes training controls, while the [plan comparison](https://openrouter.ai/pricing) lists policy-based routing as unavailable on Free. Do not promise enforceable no-training/ZDR routing until that ambiguity is resolved for the selected account and endpoint. Avoid automatic model routing for private content. Tunisia access is unverified; [provider country restrictions still apply](https://openrouter.ai/terms).

## Exclusions

The [Cerebras trial FAQ](https://inference-docs.cerebras.ai/support/rate-limits) requires a **verified payment method** before API/Playground activation, provides **$5 for 30 days**, and explicitly denies a permanently free tier. Its [no-training terms](https://www.cerebras.ai/terms-of-service) and [nonretention policy](https://www.cerebras.ai/privacy-policy) are favorable, but the payment requirement disqualifies it here.

[GitHub Models retired on 30 July 2026](https://docs.github.com/en/github-models), including its inference API, so it is not a current alternative.

## KTOB qualification before activation

This ranking is **product judgment from documentation, not a literary benchmark**. Compare the two leading candidates with identical French/Arabic questions: book identity, uncertain facts, fabricated quotations, partial reading progress, spoiler-inducing requests and appropriate refusal. No provider evidence reviewed establishes guaranteed spoiler avoidance.

Preserve [KTOB's consent rules](../architecture/01-architecture-decisions.md): AI processing opt-in is separate from personalization, and both default off. Personal context additionally requires the request's context flag, applicable scope permissions and each journal note's `allowForPersonalization`. No automatic journal transfer, whole-library upload or persistent memory inference follows from selecting a provider. Consent alone does not override unacceptable provider terms.

Keep provider dispatch unavailable until account/model availability, retention settings, consent enforcement and bounded behavior are verified. The current V3 controls are documented in the provider guide; the older `AI_ENABLED` suggestion is superseded. Spoiler permission is per request; a new no-spoiler turn must exclude earlier full-spoiler history. Bound input/output, handle quota exhaustion truthfully, and keep reading/journal functions usable. These recurring free offers support a prototype; none promises indefinite free capacity or production availability.
