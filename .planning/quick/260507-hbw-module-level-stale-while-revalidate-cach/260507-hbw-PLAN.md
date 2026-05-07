---
phase: 260507-hbw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/app/recipes/page.tsx
  - frontend/app/inbox/page.tsx
autonomous: true
requirements:
  - QUICK-260507-hbw
must_haves:
  truths:
    - "Returning to /recipes after first visit shows the cached list instantly with no blank-list flash"
    - "Returning to /inbox after first visit shows cached drafts instantly with no blank-list flash"
    - "Background refetch still runs on every mount and updates the list when new server data arrives"
    - "Realtime recipe.created and recipe.updated events update both component state AND module cache so subsequent navigations stay fresh"
    - "Search results (non-empty query) on /recipes do NOT pollute the cache — only the unfiltered list is cached"
    - "Inbox cache correctly drops a recipe when its status flips out of 'draft' via realtime update"
  artifacts:
    - path: "frontend/app/recipes/page.tsx"
      provides: "Module-level recipesCache + cache-seeded initial state + cache-updating realtime handlers"
      contains: "let recipesCache"
    - path: "frontend/app/inbox/page.tsx"
      provides: "Module-level draftsCache + cache-seeded initial state + cache-updating realtime handlers"
      contains: "let draftsCache"
  key_links:
    - from: "frontend/app/recipes/page.tsx (handleSearch)"
      to: "module-level recipesCache"
      via: "assignment in success branch when query.trim() === ''"
      pattern: "recipesCache = "
    - from: "frontend/app/inbox/page.tsx (fetch effect)"
      to: "module-level draftsCache"
      via: "assignment in .then() success branch"
      pattern: "draftsCache = "
    - from: "realtime onEvent handlers (both files)"
      to: "module-level cache variables"
      via: "setState updater computes next value, assigns to cache, returns it"
      pattern: "Cache = next"
---

<objective>
Eliminate the blank → list flash that appears every time the user navigates to /recipes or /inbox by introducing module-level stale-while-revalidate caches that survive client-side navigations.

Purpose: Next.js App Router keeps client modules alive in memory between navigations, so a `let cache: T | null = null` at module scope persists across mount/unmount cycles. Seeding `useState` from the cache means the first paint shows the previous list instantly; the existing fetch still runs and silently overwrites with fresh data; realtime mutations keep the cache itself fresh so the next navigation is also instant.

Output: Both `/recipes` and `/inbox` open instantly on second-and-later navigations, with no perceived loading state, while preserving every existing fetch / realtime / search invariant.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@frontend/app/recipes/page.tsx
@frontend/app/inbox/page.tsx

<interfaces>
<!-- Key types and contracts the executor needs. Extracted from codebase. -->
<!-- Executor should use these directly — no codebase exploration needed. -->

From frontend/lib/recipes.ts (already imported in both files):
```ts
export type Recipe = { id: string; status: "draft" | "structured" | "verified"; /* ...other fields... */ };
```

From frontend/lib/api.ts (already imported):
```ts
export function api<T>(path: string, init?: RequestInit): Promise<T>;
```

From frontend/components/RealtimeProvider.tsx (already imported):
```ts
useRealtime(): { onEvent<T>(event: string, handler: (payload: T) => void): () => void } | null;
```

Existing helpers in the two files (already defined, do not duplicate):
- `dedupeReplace(prev: Recipe[], next: Recipe): Recipe[]` — in `recipes/page.tsx` (replace by id, else prepend)
- `dedupePrepend(prev: Recipe[], next: Recipe): Recipe[]` — in `inbox/page.tsx` (skip if id exists, else prepend)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add module-level cache to /recipes</name>
  <files>frontend/app/recipes/page.tsx</files>
  <action>
Add a module-scope cache variable just below the existing `dedupeReplace` helper (still outside the component):

```ts
// Module-level cache — survives client-side navigations because Next.js App
// Router keeps JS modules alive in memory. Stale-while-revalidate: seed
// initial state from this cache so the second visit paints instantly, then
// the existing fetch silently overwrites with fresh data.
// IMPORTANT: only the unfiltered full list is cached (query === ""); search
// results never touch this variable.
let recipesCache: Recipe[] | null = null;
```

Then update the component body:

1. Seed initial state from cache:
```ts
const [recipes, setRecipes] = useState<Recipe[]>(recipesCache ?? []);
const [loading, setLoading] = useState(recipesCache === null);
```

2. In `handleSearch`, after `const rows = await api<Recipe[]>(path);` and `setRecipes(rows);`, add a guarded cache write:
```ts
if (q.trim() === "") {
  recipesCache = rows;
}
```
Place this BEFORE `setRecipes(rows)` is fine, or right after — order does not matter as long as it is inside the try and only runs on success. Do NOT cache when `q.trim().length > 0` (search results must not pollute the full-list cache, per the locked invariant).

3. In the realtime `recipe.created` handler, mirror state into cache:
```ts
const offCreated = realtime.onEvent<Recipe>("recipe.created", (payload) => {
  setRecipes((prev) => {
    const next = dedupeReplace(prev, payload);
    recipesCache = next;
    return next;
  });
});
```

4. In the realtime `recipe.updated` handler, mirror state into cache:
```ts
const offUpdated = realtime.onEvent<Recipe>("recipe.updated", (payload) => {
  setRecipes((prev) => {
    const next = prev.map((p) => (p.id === payload.id ? payload : p));
    recipesCache = next;
    return next;
  });
});
```

Do NOT change anything else: keep the `SearchInput onQueryChange` wiring, keep the `setLoading(false)` in the finally block (it's a no-op when cache already seeded `loading=false`), keep the empty-state branching logic, keep the `tErr` toast on failure. Do NOT add any new imports. Do NOT touch the JSX.

Why this exact shape: per the locked design in the planning context, the cache must (a) seed initial state to avoid the blank frame, (b) only mirror the unfiltered list, (c) be updated by realtime so the next navigation also benefits, (d) leave the existing `alive`/loading/finally pattern alone so nothing else regresses. Note that `handleSearch` does not currently use an `alive` flag — leave it as-is; the existing implementation accepts that the latest setState wins.
  </action>
  <verify>
    <automated>cd frontend && npm run lint && npx tsc --noEmit</automated>
  </verify>
  <done>
- `let recipesCache: Recipe[] | null = null;` exists at module scope in `frontend/app/recipes/page.tsx`
- `useState` for `recipes` is seeded from `recipesCache ?? []`
- `useState` for `loading` is seeded from `recipesCache === null`
- `handleSearch` writes `recipesCache = rows` only when `q.trim() === ""`
- Both realtime handlers (`recipe.created`, `recipe.updated`) update `recipesCache` via the setState updater pattern
- `npm run lint` and `npx tsc --noEmit` pass
- Manual smoke (run by user after deploy): visit /recipes, navigate away to /inbox, navigate back to /recipes — list shows instantly with no blank frame
  </done>
</task>

<task type="auto">
  <name>Task 2: Add module-level cache to /inbox</name>
  <files>frontend/app/inbox/page.tsx</files>
  <action>
Add a module-scope cache variable just below the existing `dedupePrepend` helper (still outside the component):

```ts
// Module-level cache — survives client-side navigations because Next.js App
// Router keeps JS modules alive in memory. Stale-while-revalidate: seed
// initial state from this cache so the second visit paints instantly, then
// the existing fetch silently overwrites with fresh data. Realtime updates
// must keep this cache in sync, including dropping recipes whose status
// flips out of 'draft'.
let draftsCache: Recipe[] | null = null;
```

Then update the component body:

1. Seed initial state from cache:
```ts
const [drafts, setDrafts] = useState<Recipe[]>(draftsCache ?? []);
const [loading, setLoading] = useState(draftsCache === null);
```

2. In the existing fetch effect, write the cache inside the `.then()` success branch — but ONLY if `alive` (so a stale request from an unmounted component cannot poison the cache with old data):
```ts
.then((rows) => {
  if (alive) {
    draftsCache = rows;
    setDrafts(rows);
  }
})
```

3. In the realtime `recipe.created` handler, mirror state into cache:
```ts
const offCreated = realtime.onEvent<Recipe>("recipe.created", (payload) => {
  if (payload.status !== "draft") return;
  setDrafts((prev) => {
    const next = dedupePrepend(prev, payload);
    draftsCache = next;
    return next;
  });
});
```

4. In the realtime `recipe.updated` handler, mirror state into cache (preserving the existing drop-on-status-flip logic):
```ts
const offUpdated = realtime.onEvent<Recipe>("recipe.updated", (payload) => {
  setDrafts((prev) => {
    const exists = prev.some((p) => p.id === payload.id);
    let next: Recipe[];
    if (payload.status !== "draft") {
      // Flipped to structured/verified → drop from drafts inbox.
      next = exists ? prev.filter((p) => p.id !== payload.id) : prev;
    } else {
      // Still draft: in-place replace, or insert if we hadn't seen it.
      next = exists
        ? prev.map((p) => (p.id === payload.id ? payload : p))
        : dedupePrepend(prev, payload);
    }
    draftsCache = next;
    return next;
  });
});
```

Do NOT change anything else: keep the `alive` guard pattern, keep the `tErr` toast in `.catch()`, keep `setLoading(false)` in `.finally()`, keep the `[tErr]` dependency. Do NOT add any new imports. Do NOT touch the JSX.

Why this exact shape: the locked design requires the cache to mirror every realtime mutation including the drop-on-status-flip case (otherwise a recipe that flipped to `structured` while the user was on /recipes would still appear in the inbox cache when they navigate back). Computing `next` once and assigning to both cache and setState return preserves the exact existing behavior and adds nothing else.
  </action>
  <verify>
    <automated>cd frontend && npm run lint && npx tsc --noEmit</automated>
  </verify>
  <done>
- `let draftsCache: Recipe[] | null = null;` exists at module scope in `frontend/app/inbox/page.tsx`
- `useState` for `drafts` is seeded from `draftsCache ?? []`
- `useState` for `loading` is seeded from `draftsCache === null`
- The fetch effect writes `draftsCache = rows` inside the `if (alive)` branch
- Both realtime handlers (`recipe.created`, `recipe.updated`) update `draftsCache` via the setState updater pattern, including the status-flip drop case
- `npm run lint` and `npx tsc --noEmit` pass
- Manual smoke (run by user after deploy): visit /inbox, navigate away, navigate back — drafts show instantly; trigger a draft → structured promotion from another phone, verify the row disappears from the cached inbox view on next navigation
  </done>
</task>

</tasks>

<verification>
- `cd frontend && npm run lint` passes with no new warnings
- `cd frontend && npx tsc --noEmit` passes with no errors
- Manual smoke after auto-deploy:
  1. Open /recipes → list loads (first visit, cache empty, ~1s fetch).
  2. Navigate to /inbox → drafts load (first visit).
  3. Navigate back to /recipes → list appears INSTANTLY, no blank frame.
  4. Navigate back to /inbox → drafts appear INSTANTLY.
  5. From the partner's phone, create a new recipe → both phones show the new row immediately via realtime; navigate away and back on this phone → row is still there (cache picked up the realtime update).
  6. On /recipes, type a search query → cached list is replaced with search results; clear the query → full list returns.
</verification>

<success_criteria>
- No blank-list flash on second-and-later navigations to /recipes or /inbox in this session
- Background refetch still runs on every mount (network tab confirms request fires)
- Realtime mutations update both visible state and underlying cache (verified by navigating away and back after a partner-side mutation)
- Search results on /recipes do not pollute the cache (verified by searching, then clearing query, then navigating away and back — the unfiltered list is what shows on return)
- Lint + typecheck clean
</success_criteria>

<output>
After completion, create `.planning/quick/260507-hbw-module-level-stale-while-revalidate-cach/260507-hbw-SUMMARY.md`
</output>
