# Phase 30: Live-bug sweep - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Two orthogonal production bugs cleared in one phase:

- **BUG-01** — Recipe photo signed URLs self-heal after iPhone PWA backgrounding. Backend TTL raised, frontend cache TTL raised, production `<img onError>` invalidates the cache and refetches exactly once. Applies to `RecipeCard`, `ShortlistCard`, `PhotoUploader`, `frontend/app/recipes/[id]/page.tsx`.
- **BUG-02** — Recipe SVG illustrations render as visible pictograms. Sanitizer no longer emits `ns0:`-prefixed tags; existing `ns0:` payloads in storage are remediated in a single Alembic data migration; new unit tests assert clean output.

No new product capabilities. No nav/design/CLAUDE-split work (Phases 31/32/33).

</domain>

<decisions>
## Implementation Decisions

### TTL ceiling values (BUG-01)
- **D-01:** Backend `SIGNED_URL_TTL_SECONDS` = `86400` (24 hours). Covers a full sleep cycle so an overnight PWA suspend → morning open still has a valid URL. Within Supabase's 7-day cap.
- **D-02:** Frontend `PHOTO_URL_CACHE_TTL_MS` = `82_800_000` (23 hours). 1-hour safety margin under the backend TTL — cached URL never out-survives its signature.

### Photo onError retry shape (BUG-01)
- **D-03:** Extract a `useSignedPhotoUrl(recipeId, path)` hook in `frontend/lib/` (or `frontend/hooks/`). Refactor the four photo surfaces (`RecipeCard`, `ShortlistCard`, `PhotoUploader`, `frontend/app/recipes/[id]/page.tsx`) to consume it. One source of truth for fetch + cache + retry policy across all surfaces — keeps invariant #1 ("one shape") spirit intact.
- **D-04:** Exactly one retry per `<img>` mount. On first `onError`: call `invalidateSignedPhotoUrl(recipeId, path)`, refetch via the hook, swap `src`. If the second URL also errors → fall through to the existing placeholder (dev fixtures in non-prod, broken icon in prod). Retry counter lives on per-mount state inside the hook; cache is not flagged as "tried" so a remount gets a fresh budget.
- **D-05:** Silent swap during retry — no skeleton, no spinner, no flicker. Matches REQ-01 acceptance: "photos render (or self-recover within one visible frame)." If the self-heal is visible, we lost.

### SVG sanitizer fix (BUG-02)
- **D-06:** Two-layer fix in `backend/app/services/svg_sanitizer.py`:
  1. **Primary** — call `ET.register_namespace("", "http://www.w3.org/2000/svg")` so default-namespace SVG round-trips without ET inventing an `ns0` prefix.
  2. **Belt-and-suspenders** — regex-strip any residual `nsN:` prefixes (pattern: `\bns\d+:`) on the serialized string before returning. Hardens against future ET API drift.
  Both land in the same commit.
- **D-07:** `register_namespace` lives at module level next to the imports — idempotent, runs once at import, documented with a comment citing this bug.
- **D-08:** New unit tests in `backend/app/services/svg_sanitizer_test.py`:
  - `test_serialized_svg_has_no_ns0_prefix` — asserts `"ns0:" not in result` for `CLEAN_SVG`.
  - `test_serialized_svg_root_is_bare_svg` — asserts `result.startswith("<svg")` (no prefix on root).
  - `test_serialized_svg_has_no_nsN_prefix` — regex `re.search(r"\bns\d+:", result)` is `None`.
  - The existing comment on `test_accepts_clean_line_art_svg` about "ET may emit namespace-prefixed tags" is removed — the new behavior is the contract.

### Existing `ns0:` row remediation (BUG-02)
- **D-09:** Re-run each existing `illustration_svg` payload (where `illustration_svg IS NOT NULL`) through the new `sanitize_recipe_svg`. If it returns a string → UPDATE to the clean payload. If it returns `None` → SET illustration_svg = NULL. Frontend already falls back to `BrandIcon` per D-37 — the NULL path is a graceful degradation, not a regression.
- **D-10:** Ship as an Alembic data migration (new revision, depends on the latest `0009_*` head). Runs once on the next Railway deploy via the existing `alembic upgrade head` startup step. Idempotent (the WHERE clause filters out rows already clean). No standalone script, no manual trigger.

### Claude's Discretion
- Hook file location (`frontend/lib/hooks/` vs. `frontend/hooks/` vs. colocated near `frontend/lib/recipes.ts`) — pick whatever matches existing pattern.
- Exact hook signature (e.g., return shape `{ url, isLoading, hasErrored, retry }` vs. just `string | null`) — Claude decides during planning based on what the four surfaces actually need.
- Whether to keep the dev 3-stage fallback inline in each component or fold it into the hook — Claude decides, but it must remain `process.env.NODE_ENV !== "production"`-gated.
- Alembic migration filename + revision id — follow existing pattern in `backend/alembic/versions/`.
- Exact regex for the `nsN:` strip (`re.sub(r"\bns\d+:", "", serialized)` is fine).

### Folded Todos
None — no todos matched this phase via `gsd-tools todo match-phase`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/REQUIREMENTS.md` §"Bug sweep" — BUG-01 and BUG-02 acceptance criteria (prescriptive: file lists, grep gates, TTL floors).
- `.planning/ROADMAP.md` §"Phase 30: Live-bug sweep" — success criteria (4 items: photo self-heal, TTL grep gate, fresh-recipe pictogram, sanitizer `ns0:` grep gate).
- `.planning/PROJECT.md` §"Current Milestone" — v0.7 milestone context.

### Architecture invariants (CLAUDE.md)
- `CLAUDE.md` §"Architecture invariants" — invariant #1 (capture surfaces shape), #4 (realtime contract — not exercised here), #7 (single uvicorn worker — relevant for the data migration), and the MVP posture (no back-compat shims).
- `CLAUDE.md` §"MVP phase posture" — clean rewrites; drop old TTL values rather than feature-flag them.

### BUG-01 source files
- `backend/app/services/storage.py` — `SIGNED_URL_TTL_SECONDS` constant (currently `60 * 5`); `create_signed_photo_url(path)` function.
- `frontend/lib/recipes.ts` — `PHOTO_URL_CACHE_TTL_MS`, `photoUrlCache` Map, `getSignedPhotoUrl(recipeId, path)`, `invalidateSignedPhotoUrl(recipeId, path?)`.
- `frontend/components/RecipeCard.tsx` (lines ~85–119) — `<img onError>` with dev 3-stage fallback.
- `frontend/components/ShortlistCard.tsx` (lines ~120–158, ~275–302) — same pattern.
- `frontend/components/PhotoUploader.tsx` — uses GET `/api/recipes/{id}/photo-url` helper.
- `frontend/app/recipes/[id]/page.tsx` (lines ~75, ~650–705) — `photoUrls` state and rendering.

### BUG-02 source files
- `backend/app/services/svg_sanitizer.py` — `sanitize_recipe_svg(raw)`; D-33 (reject-and-fallback), D-34 (viewBox + stroke + fill normalization).
- `backend/app/services/svg_sanitizer_test.py` — existing test suite (28 tests); `CLEAN_SVG` fixture; the namespace-prefix comment to remove.
- `backend/app/services/llm.py` — `_generate_and_sanitize_illustration(title)` and its three call sites (lines ~1056, ~1064, ~1097, ~1116) for context on when illustration_svg is written.
- `backend/app/models/recipe.py` (line ~92) — `illustration_svg: Mapped[str | None]` column.
- `backend/alembic/versions/` — pattern reference for the new data migration.
- `frontend/components/RecipeIllustration.tsx` — D-38 trust boundary comment; BrandIcon fallback when `illustration_svg` is null/empty.

### Phase 24 RID decisions (preserve)
- D-33: reject-and-fallback. D-34: viewBox + stroke/fill normalization. D-37: BrandIcon fallback when illustration_svg is null. D-38: `dangerouslySetInnerHTML` trust boundary.
- `.planning/phases/` does not currently archive Phase 24's CONTEXT/RESEARCH (likely moved during `/gsd-cleanup`); the on-file source of truth for these decisions is the inline comments in `svg_sanitizer.py` and `RecipeIllustration.tsx`.

### Deploy/runtime
- `backend/Dockerfile` / Railway deploy script — confirms `alembic upgrade head` runs before uvicorn restart (CLAUDE.md §Deployment).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `invalidateSignedPhotoUrl(recipeId, path?)` (`frontend/lib/recipes.ts:134`) — already exists; the new hook composes it with `getSignedPhotoUrl`.
- `BrandIcon` (`frontend/components/BrandIcon.tsx`, referenced via `RecipeIllustration`) — fallback for NULL `illustration_svg`. No changes needed here.
- The existing `photoUrlCache` Map and `getSignedPhotoUrl` already wire the cache contract — only the TTL constant and a per-mount retry layer change.
- Existing `_generate_and_sanitize_illustration(title)` in `services/llm.py` is the call site for `sanitize_recipe_svg` — no caller changes needed; the sanitizer's output contract is internal.
- Alembic data migrations have prior art (the codebase already shipped data-mutating migrations during v0.6 — `0009_*` head referenced in the schema). Follow the same shape.

### Established Patterns
- ESLint flat config + TypeScript strict (CLAUDE.md §Conventions) — new hook must type cleanly.
- Path alias `@/*` → `frontend/` (use `@/lib/...` or `@/hooks/...`).
- The four photo surfaces all duplicate the same `onError` block today (round-3 260512-gpl). Consolidating into the hook is a net code reduction.
- Backend uses SQLAlchemy 2.0 typed style; the migration's data step can use either raw SQL or `Session(bind=op.get_bind())` against the typed model.
- `dangerouslySetInnerHTML` is acceptable in `RecipeIllustration` ONLY because of the D-38 trust boundary. The new sanitizer behavior must preserve this — if we somehow weakened the allowlist, the trust boundary breaks.

### Integration Points
- Backend deploy: Railway runs `alembic upgrade head` before uvicorn restart on each push to `main` (CLAUDE.md §Deployment) — the data migration self-heals on next deploy. No manual step.
- Frontend deploy: Vercel auto-deploys on push to `main` (~60s). The TTL constant change and hook refactor land in the same commit/PR.
- Realtime: this phase does NOT touch invariant #4 — no new `broadcast_to_household` calls. Photo URLs are not part of the realtime contract; SVG illustration regeneration is a one-shot data fix.
- APScheduler / single-worker (invariant #7): no scheduled job needed — the migration runs once at startup.

### Pitfalls to avoid
- The current dev 3-stage fallback in `RecipeCard.tsx`/`ShortlistCard.tsx` is gated on `process.env.NODE_ENV === "production" || !devFallbackUrl`. The hook must preserve that production-gating exactly — REQ explicitly: "dev-only 3-stage fallback remains gated to non-prod."
- `ET.register_namespace("", uri)` is GLOBAL state — if other code in the backend also calls `ET.register_namespace` for the same URI with a different prefix, last write wins. Search the backend for other `register_namespace` calls before relying on the module-level placement.
- The Alembic migration must be idempotent — if it runs against an already-clean DB (e.g., dev resets), the WHERE clause `illustration_svg LIKE '%ns0:%'` (or similar) ensures no-op. Don't UPDATE every row blindly.
- `re.sub(r"\bns\d+:", "", serialized)` must not match content INSIDE path `d="..."` attributes (unlikely but possible if a path coordinate happens to look like `ns0:` — but `\b` and `\d+` make this collision astronomically unlikely; document the reasoning in a code comment).

</code_context>

<specifics>
## Specific Ideas

- TTL pair (24h backend / 23h frontend) is anchored on iPhone PWA suspension realism, not arbitrary ceiling. A user locking the phone at 9pm and opening at 8am must see photos with no manual refresh.
- The "silent swap" UX bar is high: REQ-01 says "render (or self-recover within one visible frame)." A skeleton would technically violate that.
- Two-layer SVG fix (`register_namespace` + regex strip) reflects belt-and-suspenders posture: the principled fix expresses intent, the regex strip survives regressions in the principled fix.
- Re-sanitize-through-current-pipeline is the only remediation that preserves the security contract end-to-end. Naive prefix-strip would bypass validation; NULL-and-regenerate would burn LLM tokens for art the user has already seen.

</specifics>

<deferred>
## Deferred Ideas

### From discussion (none surfaced)
No scope-creep ideas raised during the discussion — the four selected gray areas all stayed within the BUG-01 / BUG-02 boundary.

### Already deferred at the milestone level (REQUIREMENTS.md §Out of Scope)
For reference — these are explicitly NOT in Phase 30:
- SW cache tuning for `/api/recipes/*/photo-url` — gh#23 carves out into "Phase 4 owns cache strategy tuning."
- Refetch-on-`visibilitychange` — same reason; reserved for a future cache-strategy phase.
- Test-coverage expansion (gh#28) — v0.8 after visual contract locks.

### Reviewed Todos (not folded)
None — no todos matched this phase.

</deferred>

---

*Phase: 30-live-bug-sweep*
*Context gathered: 2026-05-17*
