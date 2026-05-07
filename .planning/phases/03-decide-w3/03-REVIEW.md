---
phase: 03-decide-w3
reviewed: 2026-05-07T00:00:00Z
depth: standard
files_reviewed: 43
files_reviewed_list:
  - backend/alembic/versions/0004_phase3_tables.py
  - backend/app/config.py
  - backend/app/main.py
  - backend/app/models/__init__.py
  - backend/app/models/household.py
  - backend/app/models/push_subscription.py
  - backend/app/models/recipe.py
  - backend/app/routers/__init__.py
  - backend/app/routers/cooking_logs.py
  - backend/app/routers/push.py
  - backend/app/routers/shortlist.py
  - backend/app/routers/votes.py
  - backend/app/schemas/__init__.py
  - backend/app/schemas/cooking_log.py
  - backend/app/schemas/push.py
  - backend/app/schemas/shortlist.py
  - backend/app/schemas/vote.py
  - backend/app/services/algorithm.py
  - backend/app/services/push.py
  - backend/app/services/realtime.py
  - backend/app/services/shortlist.py
  - backend/app/services/voting.py
  - backend/pyproject.toml
  - frontend/app/cooking-logs/[id]/finalize/page.tsx
  - frontend/app/globals.css
  - frontend/app/page.tsx
  - frontend/components/ColdStartChip.tsx
  - frontend/components/CookingBanner.tsx
  - frontend/components/HomeDecide.tsx
  - frontend/components/PushPermissionBanner.tsx
  - frontend/components/RealtimeProvider.tsx
  - frontend/components/RegenerateSheet.tsx
  - frontend/components/ShortlistCard.tsx
  - frontend/components/ShortlistDeck.tsx
  - frontend/components/VoteSummary.tsx
  - frontend/lib/cooking.ts
  - frontend/lib/push.ts
  - frontend/lib/shortlist.ts
  - frontend/lib/swipe-tokens.ts
  - frontend/lib/votes.ts
  - frontend/next.config.ts
  - frontend/package.json
  - frontend/worker/index.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-07
**Depth:** standard
**Files Reviewed:** 43
**Status:** issues_found

## Summary

Phase 3 (Decide W3) implements the core voting loop, daily shortlist generation, push notifications, and the swipe-deck UI. The implementation is architecturally sound across all the primary concerns: voting state is correctly computed (never stored), VAPID credentials are always loaded from environment variables, push subscription endpoints are never logged, cross-household isolation is enforced on every query, the Alembic migration chain is correct, and APScheduler uses `ZoneInfo` (not `pytz`). The frontend–backend `computeVoteState` mirror has identical branch order and a self-check.

The issues found fall into two categories: (1) a timezone mismatch in the cooking-log "active today" query that will misfire across midnight, and (2) three quality gaps — a `select_top5_soft_diversity` that doesn't implement the tie-break its docstring promises, hardcoded French strings in the service worker and the swipe-card overlays, and an `unused_cuisines`/`unused_proteins` variable set in `select_top5_soft_diversity`.

---

## Warnings

### WR-01: `func.date(cooked_at)` vs `DateType.today()` — UTC/local-time mismatch in "active session" guard

**File:** `backend/app/routers/cooking_logs.py:55-67` (and line 100-110)

**Issue:** `cooked_at` is stored as UTC (`datetime.now(timezone.utc)`). `func.date(CookingLog.cooked_at)` extracts the date part **in the database server's timezone** (Supabase defaults to UTC). `DateType.today()` returns the **application server's local system date** (Railway's container, also likely UTC, but not guaranteed). If the two servers ever disagree on timezone — or when the household clock crosses midnight while the backend runs in a different zone — the "already cooking today" guard fires against the wrong calendar day, either blocking a new session that should be allowed or allowing a duplicate that should be blocked.

**Fix:** Cast to a known timezone at the SQL level using `AT TIME ZONE` or compare against a UTC-aware datetime range instead of relying on `func.date()`:

```python
from datetime import datetime, timezone, timedelta

# Start and end of today in UTC
now_utc = datetime.now(timezone.utc)
start_of_today_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
end_of_today_utc = start_of_today_utc + timedelta(days=1)

existing = db.scalar(
    select(CookingLog).where(
        CookingLog.household_id == member.household_id,
        CookingLog.cooked_at >= start_of_today_utc,
        CookingLog.cooked_at < end_of_today_utc,
        CookingLog.rating.is_(None),
    )
)
```

The same fix applies to both the 409-guard (line 55) and the `get_active_cooking_log` query (line 100). The same pattern applies to `date.today()` in `services/shortlist.py:145` (used to set `DailyShortlist.date`); for the shortlist row itself the household timezone (`hh.timezone`) is the semantically correct reference, since the cron fires at 16:00 household-tz.

---

### WR-02: `select_top5_soft_diversity` does not implement its documented tie-break

**File:** `backend/app/services/algorithm.py:107-124`

**Issue:** The docstring states "if there's a tie (score within 0.001), prefer the one that adds diversity." The implementation does nothing of the sort — it just picks `ranked[:5]` in sorted order, identical to the `<10` path (`return [r for r, _ in candidates[:5]]`). This means the 10–29 recipe path has dead code (`used_cuisines`, `used_proteins` are built but never consulted) and the `SPEC.md` "tie-break diversification" guarantee is unmet. For v0.1 with two users this is unlikely to cause a dogfood failure, but it is a correctness gap relative to the spec and the comment documentation.

**Fix:** Either implement the tie-break or simplify the function to honestly reflect what it does:

```python
def select_top5_soft_diversity(
    ranked: list[tuple[Recipe, float]],
) -> list[Recipe]:
    """10–29 recipes: tie-break diversity. Within score tolerance 0.001,
    prefer a recipe that introduces a new (cuisine, protein) pair.
    """
    picks: list[Recipe] = []
    used_cuisines: set[str] = set()
    used_proteins: set[str] = set()
    i = 0
    while len(picks) < 5 and i < len(ranked):
        r, s = ranked[i]
        c = r.cuisine or "other"
        p = r.main_protein or "none"
        # Check if the next candidate (same score band) offers more diversity
        if picks:
            prev_r, prev_s = ranked[i - 1] if i > 0 else (r, s)
            if abs(s - prev_s) < 0.001:
                if c in used_cuisines and p in used_proteins:
                    i += 1
                    continue
        picks.append(r)
        used_cuisines.add(c)
        used_proteins.add(p)
        i += 1
    # top-up without diversity constraint
    for r, _ in ranked:
        if len(picks) >= 5:
            break
        if r not in picks:
            picks.append(r)
    return picks
```

Alternatively, simplify with a clear comment that the 10–29 path is deliberately identical to the `<10` path in v0.1, and remove the dead `used_*` sets.

---

### WR-03: Hardcoded French strings in service worker (not translatable via `next-intl`)

**File:** `frontend/worker/index.ts:30-31`

**Issue:** The push notification fallback title and body are hardcoded French strings that bypass `next-intl`:

```typescript
const title = data.title || "Al Dente";
const body = data.body || "Ton shortlist du jour est prêt !";
```

Service workers cannot import `next-intl` (no React, no module system in the push handler). However the current design already passes `title` and `body` from the backend's `send_push_to_household` call, so these are only fallbacks for a missing payload. The v0.1 scope covers French-only, so there is no immediate UX regression, but this conflicts with the project rule "all user-facing strings go through `next-intl` from day 1" and will block any future locale expansion.

**Fix:** Move the French strings to the backend `send_push_to_household` call (where they already live as the primary source) and change the service worker fallbacks to locale-neutral defaults, or accept these as a `// TODO(productize)` exception (service workers are a known `next-intl` boundary). At minimum, annotate them:

```typescript
// TODO(productize): SW cannot use next-intl; these fallbacks are FR-only.
// Update send_push_to_household to always provide title/body in the payload.
const title = data.title || "Al Dente";
const body = data.body || "";
```

---

### WR-04: Hardcoded French strings "OUI" / "NON" and "min" in `ShortlistCard`

**File:** `frontend/components/ShortlistCard.tsx:159, 166, 189`

**Issue:** The swipe overlay labels and the prep-time unit are hardcoded English/French and not translated through `next-intl`:

- Line 159: `OUI` (swipe-right label)
- Line 166: `NON` (swipe-left label)
- Line 189: `{prepTime} min` (prep time unit)

These are visible text on the primary voting surface. The `ShortlistCard` already imports and uses `useTranslations("home.shortlist")`, so translation keys are available.

**Fix:**

```tsx
// In the translation file, add:
// "swipe_yes": "OUI"
// "swipe_no": "NON"
// "prep_time": "{minutes} min"

<motion.div ...>
  {t("swipe_yes")}
</motion.div>
<motion.div ...>
  {t("swipe_no")}
</motion.div>
// and:
<span className="text-sm font-medium text-foreground-muted">
  {t("prep_time", { minutes: prepTime })}
</span>
```

---

## Info

### IN-01: Dead code — `used_cuisines` / `used_proteins` in `select_top5_soft_diversity`

**File:** `backend/app/services/algorithm.py:115-116, 121-122`

**Issue:** Variables `used_cuisines` and `used_proteins` are assigned but never read. They are a residual scaffold from the intended tie-break that was not completed (see WR-02). This will trigger a linting warning in strict configs.

**Fix:** Remove or implement (see WR-02 fix suggestion).

---

### IN-02: `console.error` in `lib/push.ts` logs the raw exception object

**File:** `frontend/lib/push.ts:66`

**Issue:**

```typescript
console.error("push subscribe failed", err);
```

This logs the full error object, which in some browser environments may include URLs or device metadata. The function already returns `{ ok: false, reason: "subscribe_failed" }` to the caller. For a couple-scale app this is low risk, but the CLAUDE.md convention is to explain "why" rather than emit production noise.

**Fix:** Either suppress the log entirely (the caller surfaces the reason to the user) or scope it to development only:

```typescript
if (process.env.NODE_ENV !== "production") {
  console.error("push subscribe failed", err);
}
return { ok: false, reason: "subscribe_failed" };
```

---

### IN-03: `vapid_public_key` endpoint returns empty string when unconfigured

**File:** `backend/app/routers/push.py:79`

**Issue:**

```python
return {"public_key": settings.vapid_public_key or ""}
```

The frontend uses this endpoint as a fallback verification path. Returning `""` silently rather than a `503` or `424` means callers cannot distinguish "not configured" from a network failure — both produce a falsy value. The frontend `registerPushSubscription` already returns `{ ok: false, reason: "missing_key" }` when the public key is absent, so the behavior is handled, but returning an empty string from an authenticated endpoint is a misleading contract.

**Fix:**

```python
@router.get("/vapid-public-key")
def vapid_public_key(_member: Member = Depends(current_member)):
    if not settings.vapid_public_key:
        raise HTTPException(503, "VAPID not configured")
    return {"public_key": settings.vapid_public_key}
```

---

### IN-04: `ShortlistDeck` optimistic rollback leaves stale vote in parent state

**File:** `frontend/components/ShortlistDeck.tsx:98-103`

**Issue:** On `postVote` failure, the deck index is rolled back (line 103), but the optimistic `ShortlistVote` row that was already appended to the parent's `votes[]` via `onVoteApplied` (line 93) is not removed. The comment acknowledges this ("will linger until the user retries"), but the consequence is that the partner-vote dot on the card will still show the user's own optimistic vote after rollback, which is visually confusing (the card reappears but shows the user's vote dot as if it was already cast). The `vote.created` echo from a later successful vote will correct it.

**Fix:** Either pass a rollback callback to the parent, or return a boolean from `onVoteApplied` and call a `onVoteRolledBack` prop on failure. For v0.1 this is acceptable UX since the deck correctly reverts and the stale dot is a soft indicator — annotate as a known limitation:

```typescript
// TODO: on rollback, the optimistic vote dot remains in parent votes[] until
// the user retries and a vote.created echo arrives. Known v0.1 limitation.
```

---

### IN-05: `select_top5_soft_diversity` `used_*` variables tracked but never consulted as guard

**File:** `backend/app/services/algorithm.py:117-123`

**Issue:** Already covered in IN-01. Note also that the `while` loop will silently return fewer than 5 picks if `ranked` has fewer than 5 elements — this is correct behavior, but there is no comment clarifying that the function does not guarantee exactly 5 results. The caller `select_top_n_with_cold_start` does not check for this either. For a cold-start corpus of 10–29 this should never produce fewer than 5 candidates (the corpus is ≥10 and the hard-filter pass has already run), so this is low risk.

**Fix:** Add a brief comment:

```python
# ranked may have fewer than 5 entries after hard-filter — return what we have.
```

---

_Reviewed: 2026-05-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
