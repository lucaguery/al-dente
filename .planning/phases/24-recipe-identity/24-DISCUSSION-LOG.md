# Phase 24: Recipe identity — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 24-recipe-identity
**Areas discussed:** Plan slicing & wave order, Title rewrite mechanics (RID-04), Completeness fields & focus UX (RID-03), SVG illustration generation & sanitizer (RID-05)

---

## Plan slicing & wave order

### Q1: REQUIREMENTS.md says Phase 24 is serial because RID-02/RID-04/RID-05 share `services/llm.py` and `_apply_extracted`. But RID-01 (BrandIcon, pure frontend) and RID-03 (CompletenessCard, pure frontend, only depends on RID-02's columns existing) don't touch the LLM service. How should we slice plans?

| Option | Description | Selected |
|--------|-------------|----------|
| 5 plans, 1 wave = serial | One plan per req (RID-01..05), all serial single executor. Most conservative, matches REQ wording literally. | |
| 5 plans, parallel-where-safe | RID-01 (BrandIcon) ships in Wave 1 parallel with RID-02 (data model). Wave 2 serial: RID-03 → RID-04 → RID-05. Saves one executor cycle. Requires worktree isolation for RID-01. | ✓ |
| 3 plans, bundled by file-shape | Bundle (a) RID-01 + RID-02, (b) RID-03 standalone, (c) RID-04 + RID-05 bundled. Fewer commits, larger diffs. | |

**User's choice:** 5 plans, parallel-where-safe
**Notes:** Wave 1 = RID-01 ∥ RID-02; Wave 2 serial = RID-03 → RID-04 → RID-05. Captured as D-01.

### Q2: RID-02 adds 3 columns. RID-05 adds 1 column. Two separate Alembic migrations or one consolidated migration?

| Option | Description | Selected |
|--------|-------------|----------|
| Two separate migrations | 0007 (RID-02 columns) and 0008 (RID-05 column), each commits with its own plan. | ✓ |
| Single consolidated migration | All 4 columns in one migration that lands with RID-02. | |

**User's choice:** Two separate migrations
**Notes:** Atomic revert per req. Captured as D-03.

### Q3: RID-04 ships the title rewrite AND updates `CLAUDE.md` invariant #1 wording. Should the docs update be inside RID-04's atomic commit, or a separate trailing commit?

| Option | Description | Selected |
|--------|-------------|----------|
| Same atomic commit | Code change + CLAUDE.md update + REQUIREMENTS.md history-note ship in one commit. | ✓ |
| Separate trailing commit | Code change first commit, docs second commit, both inside the same plan. | |

**User's choice:** Same atomic commit
**Notes:** Mirrors Phase 23's D-01 pattern. Captured as D-04.

### Q4: Worktree isolation strategy for the 5 plans?

| Option | Description | Selected |
|--------|-------------|----------|
| Worktree per plan | Each plan executes in its own worktree (existing project pattern). | ✓ |
| Single shared workspace | All 5 plans execute in the main checkout. | |

**User's choice:** Worktree per plan
**Notes:** Captured as D-02.

---

## Title rewrite mechanics (RID-04)

### Q1: Voice/photo today fail the whole promotion with `status='failed'` + `promotion_error` if Gemini errors. After RID-04, quick + full-form become async too. For quick/full-form, if the dedicated `rewrite_title()` Gemini call fails, what status should the recipe land in?

| Option | Description | Selected |
|--------|-------------|----------|
| status='structured' + error | Recipe lands in the library with the user's original title; `promotion_error` is set; retry endpoint can re-attempt. | ✓ |
| status='failed' (mirror voice/photo) | Recipe lands in the failed inbox; user must click Réessayer. | |

**User's choice:** status='structured' + error
**Notes:** Matches REQ-04 wording. Asymmetry with voice/photo is intentional — voice/photo extract failure leaves the user with nothing; quick/full-form rewrite failure leaves them with a complete recipe minus a catchy title. Captured as D-26.

### Q2: Voice/photo today call Gemini once. RID-04 wants them to also rewrite the title 'catchy' in the same call. How should that work?

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing prompt | Add a sentence to `_EXTRACT_PROMPT_VOICE` / `_EXTRACT_PROMPT_PHOTOS`. No extra round-trip. | ✓ |
| Separate rewrite_title() call after extract | First call extracts fields, second call rewrites the title. Two Gemini round-trips. | |

**User's choice:** Extend existing prompt
**Notes:** Matches REQ-04 'no extra round-trip' constraint. Captured as D-27.

### Q3: After initial promotion lands a catchy title, the user can edit the title via `PUT /recipes/{id}`. Should a future re-promote re-rewrite the user's edit?

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite only on first promotion | Title rewrite runs once during draft→structured. Retry endpoint is the only path that can re-trigger. | ✓ |
| Retry endpoint always re-rewrites | Retry always re-runs `rewrite_title()` against whatever the current title is. | |

**User's choice:** Rewrite only on first promotion
**Notes:** Captured as D-28.

### Q4: Race: user does full-form, navigates to the edit screen, and changes the title BEFORE the BackgroundTask finishes. Whose title wins?

| Option | Description | Selected |
|--------|-------------|----------|
| BackgroundTask checks updated_at first | Re-read row before applying rewrite; if `updated_at > created_at + 2s`, skip title field. | |
| BackgroundTask always wins | Rewrite always overwrites whatever title is in the row. Simpler. | ✓ |
| Disable edit-title input until status='structured' | Frontend keeps the title readonly while draft. UI-layer race fix. | |

**User's choice:** BackgroundTask always wins
**Notes:** Decisive call matching the milestone-level "silent overwrite" decision. If real-device testing surfaces a UX regression, a follow-up phase can add `updated_at` change-detection. Captured as D-29.

---

## Completeness fields & focus UX (RID-03)

### Q1: Which set of 11 fields should `computeCompleteness()` score?

| Option | Description | Selected |
|--------|-------------|----------|
| Canonical 11 | title, description, ingredients, steps, prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine, mood, main_protein. | ✓ |
| Canonical 10 + tags | Drop main_protein, add tags. | |
| Let me describe the list | Free text. | |

**User's choice:** Canonical 11
**Notes:** Captured as D-17. Tags/seasonality/photo_paths/source_capture explicitly excluded.

### Q2: What counts as 'filled' for nullable / list fields?

| Option | Description | Selected |
|--------|-------------|----------|
| Strict non-empty rule | Strings: not null AND `.trim() !== ""`. Numbers: not null. Arrays: `.length > 0`. | ✓ |
| Just non-null | Any non-null value counts. | |

**User's choice:** Strict non-empty rule
**Notes:** Captured as D-18.

### Q3: URL shape and how does the edit page consume `?focus=`?

| Option | Description | Selected |
|--------|-------------|----------|
| `?focus=<field_key>`, ref-based focus | `useSearchParams()` + `Record<FieldKey, RefObject<HTMLElement>>` map; useEffect calls scrollIntoView + .focus(). | ✓ |
| `?focus=<field_key>`, querySelector-based focus | `data-focus-key` attrs, `document.querySelector(...)`. | |
| Hash anchor (#field-ingredients) | Native browser scroll only, no focus(). | |

**User's choice:** `?focus=<field_key>`, ref-based focus
**Notes:** Captured as D-22. Once fired, `router.replace(pathnameWithoutQuery)` strips the param.

### Q4: CompletenessCard placement and chip language?

| Option | Description | Selected |
|--------|-------------|----------|
| Above body, soft surface, French chips | `paper-grain shadow-card` div above body content; header `À compléter — {N}/11`; chips as outline `<Badge>`s. | ✓ |
| Inline pill row, no card chrome | Single horizontal pill row at top of body. | |

**User's choice:** Above body, soft surface, French chips
**Notes:** Captured as D-20, D-21.

---

## SVG illustration generation & sanitizer (RID-05)

### Q1: What direction should the prompt push Gemini toward?

| Option | Description | Selected |
|--------|-------------|----------|
| Single-color line-art (matches BrandIcon) | Monochrome stroke, fill=none, viewBox 0 0 160 160, 1-3 paths max. | ✓ |
| Filled flat-color illustrations | Allow fills. More variety. | |
| Cuisine-themed | Glyph matching the cuisine field. | |

**User's choice:** Single-color line-art (matches BrandIcon)
**Notes:** Captured as D-32. Blends with BrandIcon fallback; trivially satisfies sanitizer allowlist.

### Q2: Sanitizer behavior when LLM output contains a disallowed node?

| Option | Description | Selected |
|--------|-------------|----------|
| Reject entirely, fallback to BrandIcon | If ANY disallowed node/attr is found, drop the whole SVG, set `illustration_svg=NULL`. | ✓ |
| Strip disallowed nodes, keep allowed remainder | Walk the SVG tree, drop disallowed nodes/attrs in place. | |

**User's choice:** Reject entirely, fallback to BrandIcon
**Notes:** Smallest attack surface; binary decision is easy to unit-test. Captured as D-33.

### Q3: Storage / size constraints for the `illustration_svg TEXT` column?

| Option | Description | Selected |
|--------|-------------|----------|
| 4 KB cap + viewBox normalization | Hard cap at 4096 bytes; force viewBox to `0 0 160 160`. | ✓ |
| 16 KB cap, accept Gemini's viewBox | Larger cap, no viewBox rewrite. | |
| No cap | Trust the sanitizer + Gemini. | |

**User's choice:** 4 KB cap + viewBox normalization
**Notes:** viewBox normalization makes BrandIcon fallback visually consistent. Captured as D-34.

### Q4: Where does the BrandIcon fallback decision happen?

| Option | Description | Selected |
|--------|-------------|----------|
| RecipeIllustration component | New `<RecipeIllustration recipe size={40} />` component internally renders sanitized SVG or BrandIcon. | ✓ |
| Each list-row component decides | Inbox row and recipes row each branch inline. | |

**User's choice:** RecipeIllustration component
**Notes:** Single component, single fallback path, no drift. Captured as D-37.

---

## Claude's Discretion

- BrandIcon `aria-label` default behavior (aria-hidden when omitted) — call sites may pass an explicit `aria-label` if context warrants.
- Whether `RecipeForm` constructs its own ref map or accepts one as a prop (D-23) — planner picks.
- Exact location of completeness chip rendering when 10/11 fields are missing — flex-wrap is fine.
- Whether to use `lxml` or `xml.etree.ElementTree` for the SVG sanitizer (D-33) — depends on existing deps.
- Whether `_record_rewrite_failure()` is a public helper or inline — minor structural call.
- Exact French wording of the CompletenessCard header — `À compléter` is the working text.

## Deferred Ideas

- Native PostgreSQL `difficulty` ENUM (kept TEXT+CHECK for consistency).
- `updated_at`-based edit race detection in RID-04 (decided "BackgroundTask always wins").
- Strip-and-keep SVG sanitizer mode.
- Per-household / per-user CompletenessCard field weights.
- Detail page and shortlist deck illustration placements.
- Cuisine-themed illustration variants.
- SVG illustration animation.
- Retry-with-backoff for title rewrite Gemini calls.
- Client-side illustration generation.
- gh#20 unified capture surface (v0.6).
