# Phase 26: Thread API & realtime - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 26-thread-api-realtime
**Areas discussed:** Endpoint shape & broadcast contract, Position concurrency & BackgroundTask trigger, Answer + proposal turn write contracts, URL extraction strategy

---

## Endpoint shape & broadcast contract

### Q1: POST /recipes/{id}/turns topology (JSON vs multipart, given photo kind)

| Option | Description | Selected |
|--------|-------------|----------|
| Split: JSON endpoint + /turns/photo multipart | JSON for 6 non-photo kinds via TurnPayload discriminated union; separate multipart sub-path for photo. Mirrors POST /recipes/photo. | ✓ |
| Single multipart, payload-as-JSON-field | One multipart endpoint with `kind` form field + JSON `payload` string + optional `files[]`. Loses union ergonomics. | |
| Defer photo follow-up turns entirely | Drop photo from /turns kinds; only initial photo via POST /recipes/photo. | |

**User's choice:** Split — JSON endpoint + /turns/photo multipart (Recommended)
**Notes:** Lands as D-01.

### Q2: GET /recipes/{id}/turns response shape

| Option | Description | Selected |
|--------|-------------|----------|
| Flat list ordered by position | list[TurnResponse] sorted by position ASC; no pagination at couple-scale. | ✓ |
| Wrapper {recipe_id, turns[], next_cursor?} | Future-proofs pagination even if always null. | |
| Embed turns in GET /recipes/{id} | One round-trip; heavier list-endpoint payloads. | |

**User's choice:** Flat list ordered by position (Recommended)
**Notes:** Lands as D-02.

### Q3: turn.created WebSocket frame payload

| Option | Description | Selected |
|--------|-------------|----------|
| Full TurnResponse | Complete turn JSON in WS frame; frontend appends without refetch. | ✓ |
| Minimal {recipe_id, turn_id, position, kind} | Smaller frame; one extra HTTP round-trip per turn. | |

**User's choice:** Full TurnResponse (Recommended)
**Notes:** Lands as D-03. Meets ~200ms sync goal without extra round-trip.

### Q4: HTTP status code on POST /turns

| Option | Description | Selected |
|--------|-------------|----------|
| 201 Created for all kinds | Uniform; consistent with POST /recipes. | ✓ |
| 201 non-LLM / 202 LLM-triggering | More HTTP-correct; adds frontend dispatch complexity. | |

**User's choice:** 201 Created for all kinds (Recommended)
**Notes:** Lands as D-04.

### Q5: Draft-state guard on POST /turns

| Option | Description | Selected |
|--------|-------------|----------|
| Allow turns on draft | No status check; supports follow-up bubbles during initial promotion. | ✓ |
| Reject 409 if status='draft' | Forces wait for spinner; UX friction. | |
| Allow except for status='failed' | Forces /retry-promotion before continuing. | |

**User's choice:** Allow turns on draft (Recommended)
**Notes:** Lands as D-05. Forward-compat with Phase 27 draft removal.

### Q6: turn.created broadcasts for system turns too?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — turn.created fires for both senders | Generic broadcast; Phase 29 system turns ride the same wire. | ✓ |
| No — only user-emitted turns broadcast | Smaller WS surface; adds refetch round-trip. | |

**User's choice:** Yes — turn.created fires for both senders (Recommended)
**Notes:** Lands as D-06. Phase 25 migration-backfilled turns DO NOT broadcast (D-07).

---

## Position concurrency & BackgroundTask trigger

### Q1: Position assignment race-safety

| Option | Description | Selected |
|--------|-------------|----------|
| App-level asyncio Lock per recipe | Dict[UUID, Lock]; safe under invariant #7 single worker; zero DB round-trips. | ✓ |
| pg_advisory_xact_lock(hashtext(recipe_id)) | DB-side serialization; scales out; adds DB round-trip. | |
| SELECT FOR UPDATE on recipes row | Pessimistic; over-broad lock scope blocks PUT /recipes. | |
| Retry on UNIQUE violation | Optimistic; lock-free; complex with batch inserts. | |

**User's choice:** App-level asyncio Lock per recipe (Recommended)
**Notes:** Lands as D-18. Productize-later swap to pg_advisory_xact_lock is documented inline.

### Q2: BackgroundTask scheduling for follow-up text/voice/photo turns

| Option | Description | Selected |
|--------|-------------|----------|
| Wire scheduling, stub the body | Phase 26 schedules process_thread_turn; body is no-op log. Phase 29 fills body. URL is the only kind with real BG body. | ✓ |
| Skip scheduling, wire it all in Phase 29 | Phase 26 only schedules URL extraction. Phase 29 adds scheduling AND body. | |
| Wire scheduling + minimal pass-through | Phase 26 calls existing promote_draft which short-circuits for position>0. Tightly coupled to Phase 29. | |

**User's choice:** Wire scheduling, stub the body (Recommended)
**Notes:** Lands as D-21 / D-22.

### Q3: process_thread_turn stub location

| Option | Description | Selected |
|--------|-------------|----------|
| services/llm.py alongside promote_draft | Same module as all BG-task bodies; consistent with v0.5. | ✓ |
| New services/thread.py module | Dedicated home for thread-turn processing. | |

**User's choice:** services/llm.py alongside promote_draft (Recommended)
**Notes:** Lands as D-21.

### Q4: Lock dict cleanup strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Pop on release if no waiters | Tiny per-recipe memory; correct under contention. | ✓ |
| Leave it — couple-scale memory is fine | Each Lock ~200 bytes; 1000 recipes = 200KB. | |
| LRU eviction (cachetools.LRUCache) | Bounded by config; adds dep. | |

**User's choice:** Pop on release if no waiters (Recommended)
**Notes:** Lands as D-19.

### Q5: Phase 27 CAPTURE-03 batch persistence API

| Option | Description | Selected |
|--------|-------------|----------|
| N sequential POSTs after recipe creation | Frontend creates draft, then sequentially POSTs each bubble. Lock serializes server-side. | |
| POST /recipes/{id}/turns/batch with array body | One endpoint takes list[TurnCreate]; atomic transaction. | |
| Embed batch in POST /recipes/quick (or new POST /recipes) | Phase 27 carries consolidation; /turns stays single-shot. | |
| **Other (user-supplied)** | "we are gonna remove the draft logic" | ✓ |

**User's choice:** Custom — remove draft logic entirely
**Notes:** Triggered a follow-up direction-clarifying exchange. User confirmed Option 1 (below).

### Q5-followup: Draft removal interpretation

| Option | Description | Selected |
|--------|-------------|----------|
| No more status='draft' state at all | Recipes created directly in steady state; chat composer accumulates bubbles client-side; on Enregistrer backend creates row + all turns + LLM. Kills drafts inbox. | ✓ |
| Keep status='draft' but drop multi-step create | Single creation endpoint POST /recipes with {title, turns[]}; inbox UI stays. | |
| Something else | — | |

**User's choice:** No more status='draft' state at all
**Notes:** Significant scope decision. Direction confirmed as Phase 27 territory.

### Q5-followup-2: Where does draft removal ship?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 27 lands the removal | Phase 27 introduces new creation endpoint + drops draft state + migrates draft rows + removes inbox UI. Phase 26 stays draft-agnostic. | ✓ |
| Phase 26 lands the removal too | Wider Phase 26 scope; touches 5 capture POST handlers. | |
| Split: Phase 26 deprecates, Phase 27 removes | Two-phase migration; more in-flight state. | |

**User's choice:** Phase 27 lands the removal (Recommended)
**Notes:** Locked. Phase 26 endpoint contract is draft-agnostic by design (D-05).

### Q5-followup-3: Phase 26 forward-compat hooks for draft removal

| Option | Description | Selected |
|--------|-------------|----------|
| Stay tight on TURN-01..04 | No status changes; no inbox UI changes; no new creation endpoint. Endpoint is naturally draft-agnostic. | ✓ |
| Add status='processing' renaming pre-emptively | Productive scope creep; pulls inbox UI into Phase 26 blast radius. | |
| Add feature flag for old-vs-new creation flow | Conflicts with MVP no-compat-shim posture. | |

**User's choice:** Stay tight on TURN-01..04 (Recommended)
**Notes:** Phase 26 scope is preserved.

---

## Answer + proposal turn write contracts

### Q1: Answer turn `field` policy

| Option | Description | Selected |
|--------|-------------|----------|
| Whitelist: completeness-relevant fields only | 13 fields matching recipe-completeness.ts (plus tags). Out-of-whitelist → 422. | ✓ |
| Allow any recipes column except system fields | Looser; matches PUT /recipes behavior. | |
| Accept anything — frontend validates | Trust-the-client; wrong for wire payloads. | |

**User's choice:** Whitelist: completeness-relevant fields only (Recommended)
**Notes:** Lands as D-08.

### Q2: Answer turn `value` validation

| Option | Description | Selected |
|--------|-------------|----------|
| Per-field Pydantic union, validated server-side | Typed value per field via discriminated union; reuses existing Literal types from llm.py. | ✓ |
| Raw JSON value, applied via setattr | Less validation surface; invalid values produce 500s. | |
| Apply via existing RecipeUpdate schema validation | Reuses PUT validation; chip-answer and form-PUT pin through same validator. | |

**User's choice:** Per-field Pydantic union, validated server-side (Recommended)
**Notes:** Lands as D-09.

### Q3: proposal_accepted / proposal_dismissed scope in Phase 26

| Option | Description | Selected |
|--------|-------------|----------|
| Full handler for both, dead until Phase 29 | Phase 26 implements both; tests use synthetic advisory turns. AdvisoryTurnPayload graduates from stub. | ✓ |
| Ship dismissed-only, defer accepted to Phase 29 | Tighter scope; one less dead-code path. | |
| Both ship as 422-stubs | Smallest Phase 26 scope; conflicts with ROADMAP success criterion 4. | |

**User's choice:** Full handler for both, dead until Phase 29 emits advisories (Recommended)
**Notes:** Lands as D-14 / D-15 / D-16 / D-17.

### Q4: More questions or move on?

| Option | Description | Selected |
|--------|-------------|----------|
| More questions | Idempotency + atomicity. | |
| Next area | Defaults: idempotency = allow; atomicity = single DB transaction. | ✓ |

**User's choice:** Next area
**Notes:** Defaults landed as D-10 (atomicity) and D-13 (idempotency).

---

## URL extraction strategy (TURN-04)

### Q1: Extraction library

| Option | Description | Selected |
|--------|-------------|----------|
| trafilatura | Purpose-built article/recipe extractor; cleaned markdown output. | ✓ |
| recipe-scrapers | Recipe-specific structured extractor; brittle on French food blogs. | |
| Gemini native URL grounding | Opaque fetch; conflicts with invariant #5 traceability. | |
| readability-lxml | Less recipe-aware than trafilatura in 2025+. | |

**User's choice:** trafilatura (Recommended)
**Notes:** Lands as D-23.

### Q2: Extracted content storage

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Storage path in payload | Mirrors D-08 photo pattern; storage cost negligible. | ✓ |
| Inline text in payload (cap-bounded) | Makes turn payload heavy on every thread read. | |
| Inline AND Storage (belt-and-suspenders) | Overkill at couple-scale. | |

**User's choice:** Supabase Storage path in payload (Recommended)
**Notes:** Lands as D-25 / D-26.

### Q3: URL extraction failure mode

| Option | Description | Selected |
|--------|-------------|----------|
| status='failed' + promotion_error | Matches voice/photo extract-failure; consistent UX. | ✓ |
| Degrade to URL-only (asymmetric like text rewrite-fail D-26) | Permissive; productize-later mindset. | |
| Silently store url turn, no LLM run | No user feedback on failure. | |

**User's choice:** status='failed' + promotion_error (Recommended)
**Notes:** Lands as D-27.

### Q4: Fetch policy (timeout, size, redirects)

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative defaults | httpx 10s timeout, 5 redirects, 5MB cap, content-type filter, custom User-Agent. | ✓ |
| Add robots.txt respect | More polite; extra round-trip + dep. | |
| Use Gemini's URL grounding for fetch | Conflicts with trafilatura choice. | |

**User's choice:** Conservative defaults (Recommended)
**Notes:** Lands as D-24.

---

## Claude's Discretion

The following areas were explicitly deferred to the planner:
- Endpoint URL details (`recipe_id` vs `id` path param naming; router file split)
- Lock module location (`services/thread.py` recommended)
- Pydantic union ordering
- `turn.updated` payload shape (full TurnResponse recommended)
- Migration shape for the new Storage bucket
- Logging policy on URL extraction (match `_record_failure` precedent)
- Rate-limit policy on POST /turns (none in Phase 26)
- SSRF defense on URL fetch (recommended to add)
- Exact SQLAlchemy idiom for JSONB mutation

## Deferred Ideas

Ideas mentioned during discussion that were noted for future phases:
- `status='draft'` removal + drafts inbox UI drop + single creation endpoint with embedded turns → Phase 27
- Full-thread Gemini call from `process_thread_turn` → Phase 29
- `question` / `summary` / `advisory` system turn emission → Phase 29
- Per-member turn attribution → productize-later
- Rate-limiting on POST /turns → productize-later
- App-level asyncio Lock → `pg_advisory_xact_lock` swap → productize-later (when Railway scales out)
- Robots.txt respect → productize-later
- Push notifications for advisories → productize-later (WS-only in v0.6 per REQUIREMENTS.md §Out of Scope)
- Re-extraction of legacy Phase 25 backfilled url turns → future productize pass
