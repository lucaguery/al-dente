# Phase 1: Foundations (W1) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 01-foundations-w1
**Areas discussed:** Ping test lifecycle, Photo upload pipeline, Recipe search strategy, Color palette for member attribution

---

## Gray-Area Selection

**Question:** Which areas do you want to discuss for Phase 1?
**Options presented:** Ping test lifecycle, Photo upload pipeline, Recipe search strategy, Color palette for members
**User's choice:** All four selected.

---

## Ping test lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Delete entirely (Recommended) | Remove the endpoint, table, and migration once recipes flow end-to-end. Minimal surface area; SPEC.md's broadcast contract takes over the role. Best matches v0.1 "clean enough to productize later" mindset. | ✓ |
| Keep as health probe | Keep `GET /pings/health` as a tiny readiness check (Railway pings it, Vercel pings the FE). Adds ~30 lines of code; surfaces infra rot before users hit it. | |
| Evolve into recipe.created scaffolding | Reshape the ping handler into the eventual `POST /recipes/quick` skeleton (same auth + WS broadcast wiring). Saves one rewrite; couples the gate to the first feature. | |

**User's choice:** Delete entirely.
**Captured as:** D-01 — Delete the `/pings` endpoint, the `pings` table, and the corresponding Alembic migration as soon as the round-trip gate passes on both phones.
**Notes:** No health-probe carryover; if observability becomes a need later, that's a productize-later decision.

---

## Photo upload pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Multipart through backend (Recommended for v0.1) | FastAPI accepts multipart, streams to Supabase, returns path. ~10 photos/week is trivially within Railway free tier. One auth flow. Easier to debug. Trade: ~500ms added latency per upload over LTE. | ✓ |
| Presigned Supabase URLs | Backend issues short-lived signed upload URLs; browser PUTs directly to Supabase. Saves Railway bandwidth. Trade: Supabase anon key in the bundle; need a small "confirm upload" round-trip; orphaned blobs if confirm step fails. | |
| Multipart in W1, switch to presigned later | Ship multipart now, revisit at W2/W4 if Railway egress shows up in metrics. Kicks the more complex pattern down the road; doesn't lock you in. | |

**User's choice:** Multipart through backend.
**Captured as:** D-02 — Photos travel through the FastAPI backend as multipart form-data; backend streams to Supabase Storage and returns the storage path.
**Notes:** Revisit trigger: if Railway egress shows up in metrics during W2 (CAPTURE-02 multimodal photo capture) or W4 (COOK-03 / Album finalization photo channel), switch to presigned Supabase URLs. `# TODO(productize)` marker on the upload handler.

---

## Recipe search strategy

| Option | Description | Selected |
|--------|-------------|----------|
| ILIKE (Recommended for v0.1) | `title ILIKE '%query%' OR ingredients::text ILIKE '%query%'` — zero setup, fast at <500 rows, exact-substring only (no "raviolis" → "ravioli" matching). Easiest to ship; rewrite later if needed. | ✓ |
| Trigram (pg_trgm + GIN) | Enable `pg_trgm` extension, GIN index on title + JSONB-flattened ingredients, query via `%` operator. Handles fuzzy matches and accents at low cost. Adds one migration. Best ergonomics for French ingredient names. | |
| Postgres FTS (tsvector + GIN) | Full text search with French dictionary, generated tsvector column, GIN index, `to_tsquery` translation. Most "correct" but most setup; overkill for a 200-recipe corpus. Productize-later candidate. | |

**User's choice:** ILIKE.
**Captured as:** D-03 — `RECIPE-03` text search runs as `WHERE title ILIKE :q OR ingredients::text ILIKE :q` against Postgres, with `:q` formatted as `%query%`.
**Notes:** Revisit trigger: if the household ever asks "why doesn't my search work?" twice, switch to `pg_trgm` + GIN. FTS with `tsvector` is productize-later.

---

## Color palette for member attribution

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind 500s (Recommended) | rose-500 / amber-500 / emerald-500 / sky-500 / violet-500. Distinguishable, WCAG-AA against white & dark. Tailwind utilities work out of the box. | ✓ |
| Warmer/French-cosy | Terracotta / mustard / olive / cobalt / plum. More "kitchen" feel; needs custom hex tokens. | |
| I'll pick later | Lock the placeholder set (Tailwind 500s) for v0.1, leave a `# TODO(productize)` to revisit with a real designer. | |
| I'll provide hex values | Skip the palette options and let me type the 5 hex codes I want. | |

**User's choice:** Tailwind 500s.
**Captured as:** D-04 — Five member-color swatches use Tailwind CSS v4's default 500-shade palette: rose-500 (`#F43F5E`), amber-500 (`#F59E0B`), emerald-500 (`#10B981`), sky-500 (`#0EA5E9`), violet-500 (`#8B5CF6`).
**Notes:** Designer-led visual pass is in PROJECT.md V2-UX-02 productize-later list.

---

## Closing prompt

**Question:** Other gray areas to explore before writing CONTEXT.md?
**Options presented:** "I'm ready for context" / "Explore more gray areas (local-dev DB, auth_token format, onboarding flow shape, JSON export shape, branching strategy, search/list pagination)".
**User's choice:** I'm ready for context.

---

## Claude's Discretion

The user did not delegate any specific area to Claude during the questioning. The full list of "Claude decides" specifics (frontend/backend folder structure, migration granularity, auth-token format, invite-code format, CORS, WebSocket auth/channel keying, reconnect-with-backoff, local-dev DB, onboarding routing, drafts inbox UI placement, JSON export shape, service worker cache strategy in W1, branching strategy, test setup) is enumerated in `01-CONTEXT.md` §"Claude's Discretion" and represents inferred-not-asked decisions: the user's "I'm ready for context" closing answer signaled that downstream agents have enough.

## Deferred Ideas

(Listed in `01-CONTEXT.md` §"Deferred Ideas" — items repeated here for log completeness.)

- Trigram or FTS search (revisit per D-03 trigger)
- Presigned Supabase upload URLs (revisit per D-02 trigger)
- Auth-token rotation / refresh (productize-later with Supabase Auth)
- Designer pass on the color palette (PROJECT.md V2-UX-02)
- Vercel preview deploys (branching strategy revisit)
- Test scaffolding (vitest + pytest) — W2 onward
- Web Push notification subscription UI — Phase 3
- Service worker cache tuning — Phase 4
