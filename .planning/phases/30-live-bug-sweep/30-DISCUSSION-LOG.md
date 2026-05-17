# Phase 30: Live-bug sweep - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 30-live-bug-sweep
**Areas discussed:** TTL ceiling values, onError retry shape, SVG sanitizer fix strategy, Existing `ns0:` row remediation

---

## TTL ceiling values

### Q1: Backend `SIGNED_URL_TTL_SECONDS` — how high?

| Option | Description | Selected |
|--------|-------------|----------|
| 1 hour (3600s) — floor | Minimum required by REQ. Conservative; covers brief PWA suspension but not overnight backgrounding. | |
| 24 hours (86400s) — recommended | Covers a full sleep cycle. Within Supabase's default capabilities. | ✓ |
| 7 days (604800s) — Supabase cap | Maximum signed URL TTL. Trade-off: revoked photos stay mintable for up to a week. | |

**User's choice:** 24 hours (86400s)
**Notes:** Aligns with realistic iPhone PWA suspension behavior (overnight lock cycle).

### Q2: Frontend `PHOTO_URL_CACHE_TTL_MS` — how high?

| Option | Description | Selected |
|--------|-------------|----------|
| 50 min (3000000ms) — floor | Matches a 1h backend with 10-min safety margin. | |
| 23h (82800000ms) — recommended for 24h backend | 1h safety margin under a 24h backend TTL. | ✓ |
| 6 days (518400000ms) — paired with 7-day backend | 1-day safety margin under a 7d backend. | |

**User's choice:** 23h (82800000ms)
**Notes:** Pairs with the 24h backend TTL chosen in Q1.

---

## onError retry shape

### Q1: Where should the retry logic live?

| Option | Description | Selected |
|--------|-------------|----------|
| Custom hook `useSignedPhotoUrl` — recommended | Extract a hook; refactor 4 surfaces to consume it. | ✓ |
| Inline duplicated across 4 surfaces | Add logic to each existing `onError`. 4 places to keep in sync. | |
| Cache-level only | Track retry budget on `photoUrlCache` Map. Per-mount semantics get fuzzy. | |

**User's choice:** Custom hook `useSignedPhotoUrl`
**Notes:** Keeps invariant #1 ("one shape") spirit intact.

### Q2: Retry budget per `<img>` mount?

| Option | Description | Selected |
|--------|-------------|----------|
| Exactly one retry per mount — recommended | Invalidate cache + refetch once on first onError. Matches REQ-01 "exactly once". | ✓ |
| One retry per cache entry (survives remounts) | Track retry state on cache row. A blip locks the entry into failed state. | |
| Unlimited retries with exponential backoff | Overkill for couple-scale; can hammer backend if URLs are dead. | |

**User's choice:** Exactly one retry per mount

### Q3: Should production show a transient visual signal during the silent retry?

| Option | Description | Selected |
|--------|-------------|----------|
| Silent swap (no signal) — recommended | Match REQ-01 "self-recover within one visible frame". | ✓ |
| Brief skeleton during refetch | Nicer for slow networks but introduces flicker. | |
| Claude's discretion | Pick whichever lands cleanest. | |

**User's choice:** Silent swap (no signal)

---

## SVG sanitizer fix strategy

### Q1: Which fix strategy for the SVG sanitizer output?

| Option | Description | Selected |
|--------|-------------|----------|
| register_namespace + post-process strip — recommended | Module-level `register_namespace` + regex-strip residual `nsN:` prefixes. Belt-and-suspenders. | ✓ |
| register_namespace only | Principled fix only. Silent regression if future ET API drifts. | |
| Post-process strip only | Works but doesn't express WHY. | |

**User's choice:** register_namespace + post-process strip

### Q2: Where to register the namespace?

| Option | Description | Selected |
|--------|-------------|----------|
| Module-level beside the imports — recommended | Runs once at import time. Idempotent. Easy to discover. | ✓ |
| Inside `sanitize_recipe_svg` before serialize | Clearer locality but redundant runtime cost. | |

**User's choice:** Module-level beside the imports

---

## Existing `ns0:` row remediation

### Q1: How to transform existing `ns0:` payloads?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-run through new sanitizer — recommended | Re-run `sanitize_recipe_svg`. None → NULL → BrandIcon fallback. Preserves security contract. | ✓ |
| Regex-strip prefixes in place | Bypasses sanitizer. Fast but loses validation. | |
| NULL all `ns0:` rows; let Gemini regenerate | Costs LLM tokens; loses original art. | |

**User's choice:** Re-run through new sanitizer

### Q2: When does remediation run?

| Option | Description | Selected |
|--------|-------------|----------|
| Alembic data migration — recommended | Auto-runs on next Railway deploy. Atomic with code change. Idempotent. | ✓ |
| Standalone backend script | Easy to forget. Deploy doesn't self-heal data. | |
| Lazy on read | Hot-path overhead. Write-on-read amplification. | |

**User's choice:** Alembic data migration

---

## Claude's Discretion

- Hook file location (`frontend/lib/hooks/` vs. `frontend/hooks/` vs. colocated near `frontend/lib/recipes.ts`).
- Exact hook signature (return shape — `string | null` vs. `{ url, isLoading, hasErrored, retry }`).
- Whether the dev 3-stage fallback stays inline in each component or folds into the hook (must remain non-prod-gated either way).
- Alembic migration filename + revision id.
- Exact regex for the `nsN:` strip.

## Deferred Ideas

None surfaced during discussion — all four selected gray areas stayed within Phase 30 scope.
