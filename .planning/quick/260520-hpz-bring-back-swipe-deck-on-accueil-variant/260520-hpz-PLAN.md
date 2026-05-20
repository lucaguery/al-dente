---
quick_id: 260520-hpz
description: Bring back swipe deck on Accueil — Variant A + mono-terracotta palette + feedback layer
status: ready
created: 2026-05-20
mode: quick
tasks: 7
---

# Plan — Bring back swipe deck on Accueil

Reverse the Phase 36 SOBER-09 retire. Restore Variant A (refined classic Tinder)
as the primary Accueil shortlist surface. Migrate the Validé palette off emerald
(Phase 5 lock) onto mono-terracotta per sketch 001 winner. Add the round-2
feedback layer (progress strip, snap-back hint, thumb-button echo, partner ripple,
inline toast) so the swipe pathway feels heard.

**Sketch winner already committed at `f682368`** (sketch 001 + theme variants).
Task numbering below starts at Task 1 = palette token migration.

**Locked source documents (do NOT redesign in-flight):**
- `.planning/sketches/001-shortlist-card-lifecycle/README.md` — full lifecycle + feedback layer spec
- `.planning/sketches/themes/mono-terracotta.css` — palette tokens to migrate
- `frontend/components/ShortlistCard.tsx` — Variant A motion contract already intact

---

## Task 1: Migrate Validé palette tokens from emerald → mono-terracotta

**Files:** `frontend/app/globals.css`
**Type:** style

### Action
Replace four Phase 20 TOK-01 emerald hex tokens AND the `--valide-tint` value
in both the `:root` (light) and `.dark` blocks with mono-terracotta values.
Source the light-mode values verbatim from `.planning/sketches/themes/mono-terracotta.css`
lines 28–30:
- `--color-valide-foreground: #A8412E` (was `#10B981`)
- `--color-valide-emphasis: #8B331F` (was `#047857`)
- `--color-valide-border: #A8412E80` (was `#10B98180`) — alpha-50 of the new foreground
- `--color-valide-border-faint: #A8412E4D` (was `#10B9814D`) — alpha-30 of the new foreground
- `--valide-tint: oklch(0.91 0.045 35)` light-mode wash (replaces `oklch(0.93 0.07 145)`); derive the
  equivalent of `#F2DDD4` in oklch with hue h≈35 to match the existing primary axis
- `--color-cooking-foreground: #8B331F` (was `#047857`) — share the new emphasis hue
  so the cooking-banner icon does not desync from Validé

For the `.dark` block, derive harmonious dark-mode equivalents (lighter,
desaturated terracotta on the dark terracotta-neighborhood surface). Suggested values:
- `--color-valide-foreground: #E9A893` (light terracotta, equivalent role to old `#6EE7B7`)
- `--color-valide-emphasis: #F2C7B6` (lighter still)
- border + faint = `#E9A89380` / `#E9A8934D`
- `--valide-tint: oklch(0.30 0.05 35)` (replaces `oklch(0.30 0.06 145)`)
- `--color-cooking-foreground: #F2C7B6`

Do NOT touch the member-color tokens (`--color-member-emerald-*` is a member-slot
identity, not a Validé semantic) — they keep their emerald hexes. Update the
inline comment header at lines 196–201 to drop the "h≈145" / "emerald-500"
language and reflect "mono-terracotta — Validé differentiates from primary by
saturation+lightness on the terracotta hue alone, see ADR-NNNN."

### Verify
`grep -nE '#10B981|#047857|#10b981|#047857|#6EE7B7|#A7F3D0|0\.07 145|0\.06 145' frontend/app/globals.css`
returns ZERO matches in the Validé / cooking-foreground token blocks (member-color tokens are
allowed to keep their emerald hexes — explicit exception). `cd frontend && npm run lint`
clean.

### Done
Diff is strictly the two blocks plus the inline header comment update. No
component file touched. App still compiles; visual diff is a global "Validé hue
became terracotta" change — that is the point of this isolated commit.

### Commit
`style(palette): shift Validé from emerald to mono-terracotta`

---

## Task 2: Mirror Validé palette shift into the design system reference

**Files:** `docs/design-system.html`
**Type:** docs

### Action
The Locked Vocabularies rule (CLAUDE.md) requires
`frontend/app/globals.css` ↔ `docs/design-system.html` parity. Update every
emerald reference at the 39 grep-hits already surveyed:
- light-mode `:root` block (around lines 45–49 of the HTML): mirror the new
  light-mode hexes + `--valide-tint` from Task 1
- dark-mode `.dark` block (around lines 110–112): mirror the dark-mode hexes
- swatch examples ("Validé / Validated") — update displayed hex codes and any
  inline `style="background: #10B981"` literal usages
- table-à-manger voting scene rows that show the validated seat state
- locked Accueil screen showing the validated row's left-border / wash
- search for `valide` and `emerald` and `#10B981` / `#10b981` / `#6EE7B7` /
  `#A7F3D0` exhaustively — every Validé hit gets the new color; the
  `--color-member-emerald-*` member-slot tokens stay untouched

### Verify
`grep -niE '#10b981|#047857|#6ee7b7|#a7f3d0|0\.07 145|0\.06 145' docs/design-system.html`
returns ZERO Validé-context matches. Visual check: open `docs/design-system.html`
in a browser, locked Accueil row reads as terracotta-on-cream (no green).

### Done
HTML diff confined to color values, hex strings, and inline swatches in the
Validé / cooking-banner contexts. No structural HTML/CSS rule reshuffle.

### Commit
`docs(design-system): mirror Validé color shift to mono-terracotta`

---

## Task 3: ADR — Validated color shift to mono-terracotta

**Files:** `docs/adr/0003-validated-color-mono-terracotta.md` (NEW)
**Type:** docs

### Action
Create the third ADR (sequential after `0001-recipe-conversation-thread.md` and
`0002-httponly-cookie-auth.md`). YAML frontmatter:

```yaml
---
status: accepted
date: 2026-05-20
supersedes: "Phase 5 emerald Validé token lock (see .planning/phases/05-*/05-UI-SPEC.md §Color)"
---
```

Sections:
1. **Context** — Phase 5 locked emerald h≈145 as the Validé semantic hue. Phase 23
   round-3 sketch surfaced that emerald reads "traffic light" against the warm Sober
   Kitchen register (terracotta primary, cream surface, Cormorant + Caveat).
   Sketch 001 (`.planning/sketches/001-shortlist-card-lifecycle/`) compared three
   alternative palettes; mono-terracotta won.
2. **Decision** — Migrate `--color-valide-foreground / -emphasis / -border /
   -border-faint`, `--valide-tint`, and `--color-cooking-foreground` to the
   mono-terracotta values from `.planning/sketches/themes/mono-terracotta.css`.
   Member-color tokens (`--color-member-emerald-*`) keep their independent slot
   identity — they are not a Validé semantic.
3. **Considered Alternatives**
   - **Keep emerald (Phase 5 lock)** — preserved cross-version stability but kept the
     "traffic light against warm cream" mismatch the sketch round-3 exposed.
   - **Olive sage (kitchen-herb)** — closer to the Sober Kitchen register than
     emerald but introduced a second hue axis competing with primary.
   - **Patine verdigris (aged copper)** — period-correct for the patine cards
     register but reads as oxidation, not approval.
   - **Mono-terracotta (winner)** — one hue, played at different saturations.
     Validé = saturated terracotta; Pressenti = brand primary; Contesté = dusty;
     Rejeté = paper-tone. Most opinionated take on Sober Kitchen.
4. **Consequences**
   - Phase 5 emerald lock superseded; future plans referencing "the locked
     emerald Validé token" must redirect here.
   - Threshold ring on `ShortlistCard.tsx` (`ring-[var(--color-valide-foreground)]`)
     automatically flows through — no component change needed.
   - Thumb-button Heart on the deck shifts hue without code change.
   - Cooking banner icon hue shifts (sibling token migrated for visual cohesion).
   - Sketch 001 (`.planning/sketches/001-shortlist-card-lifecycle/`) is the
     visual reference for downstream verification.
   - Pressenti / Contesté / Rejeté tokens are NOT introduced here — out of scope;
     they remain at their existing values until a separate decision lands.

### Verify
File exists at `docs/adr/0003-validated-color-mono-terracotta.md`. YAML
frontmatter parses (status, date, supersedes). All four Considered Alternatives
listed with their tradeoff. ADR 0003 is the next sequential number — `ls
docs/adr/` shows `0001`, `0002`, `0003`.

### Done
Single markdown file. No other docs touched.

### Commit
`docs(adr): 0003 — mono-terracotta Validé color (supersedes Phase 5 lock)`

---

## Task 4: i18n strings for swipe-deck feedback layer

**Files:** `frontend/lib/i18n/fr.json`
**Type:** i18n

### Action
Add new keys under `home.shortlist`. The existing `toast_validé` key (line 43,
`"Validé : « {title} »"`) is for the partner-vote celebration after both members
agree — KEEP IT. The new keys below are for the per-vote inline toast that fires
on swipe/tap commit (no Pressenti→Validé requirement).

New keys (insert alongside existing `home.shortlist.*` keys; preserve alphabetical
order if the file uses one, otherwise append at the bottom of the block):

- `progress_remaining`: `"{count, plural, =1 {1 restante} other {# restantes}}"`
- `progress_initial`: `"cinq propositions, à départager"`
- `progress_complete`: `"{yes, plural, =1 {1 validé} other {# validés}} sur {total} — c'est dit."`
- `progress_partial`: `"{remaining, plural, =1 {1 restante} other {# restantes}} · {yes, plural, =0 {aucun oui} =1 {1 oui} other {# oui}} jusqu'ici"`
- `snapback_hint`: `"encore un peu — glissez plus loin"`
- `toast_yes`: `"Validé · {title}"`
- `toast_no`: `"Non merci · {title}"`

Do NOT rename or delete existing keys. Do NOT touch any other locale block (there
is no `en.json` in scope but the file is locale-isolated regardless).

### Verify
`cd frontend && node -e "JSON.parse(require('fs').readFileSync('lib/i18n/fr.json','utf8'))"`
exits 0 (JSON valid). `grep -E '"(progress_remaining|progress_initial|progress_complete|progress_partial|snapback_hint|toast_yes|toast_no)"' frontend/lib/i18n/fr.json`
returns 7 matches. `grep '"toast_validé"' frontend/lib/i18n/fr.json` returns 1 match
(unchanged from before).

### Done
JSON diff is exactly 7 added keys under `home.shortlist`. No keys removed,
renamed, or reordered.

### Commit
`i18n(fr): swipe-deck feedback strings`

---

## Task 5: Restore ShortlistDeck container; re-wire HomeDecide

**Files:** `frontend/components/ShortlistDeck.tsx` (NEW — recreated; the old one was deleted at commit `67132373` per `feedback_executor_scope_creep`-style MVP no-shim cleanup), `frontend/components/HomeDecide.tsx`
**Type:** feat

### Action
Recreate the deck container. Two-card stack (front + 1 peek per Variant A —
NOT 3-deep), `AnimatePresence` keyed on the front recipe ID drives the advance.
The internal index is derived from `unvotedByMe` ordering (parent computes it
exactly as today; deck just consumes the array).

**Contract:**

```ts
// frontend/components/ShortlistDeck.tsx — exported component signature
export type ShortlistDeckProps = {
  shortlistId: string;
  unvotedByMe: Recipe[];          // ordered queue; head = front card
  votes: ShortlistVote[];          // for partner-vote-dot lookup on each card
  me: Member;
  partner: Member;
  onVoteApplied: (vote: ShortlistVote) => void;  // optimistic propagation up
};
```

Internal:
- `index` state (number, default 0) — points into `unvotedByMe`
- `committedDirection` state (`"left" | "right" | null`) — drives `ShortlistCard`'s
  `exit` transform (already supported by the existing prop)
- `front = unvotedByMe[index]`, `peek = unvotedByMe[index + 1]` — both may be undefined
- POST the vote via the existing `postShortlistVote` helper (look it up in
  `frontend/lib/votes.ts`); on resolve, call `onVoteApplied({...})` and bump `index`
- Reset `index` to 0 if the `unvotedByMe.length` shrinks below current `index`
  (e.g. partner's vote rejected the front card before we voted)

Render the existing `<ShortlistCard>` for front (`isFront={true}`) and peek
(`isFront={false}, peekDepth={1}`). Render `<ShortlistThumbButtons>` below the
stack, wired to the same vote handler. Use `AnimatePresence mode="popLayout"`
keyed on `front.id` so the exit + spring-snap entry combine cleanly.

**Wire into HomeDecide.tsx:**

Replace the `<VoteSummary ...>` JSX block (lines ~599–611) with conditional
render logic:
- If `unvotedByMe.length === 0` → keep mounting `<VoteSummary ...>` (now the
  all-voted terminal panel) with the same props it has today
- Else → mount `<ShortlistDeck shortlistId={...} unvotedByMe={unvotedByMe}
  votes={shortlist.votes} me={me} partner={partner} onVoteApplied={handleVoteApplied} />`

DO NOT touch:
- the cookingBanner block
- the empty-state block (`shortlistIsEmpty`)
- the `<header>` (date row + H1 + Marginalia)
- `<PushPermissionBanner />` placement
- `<RegenerateSheet>` mount
- the existing `VOTE_CREATED_DOM_EVENT` listener wiring (Task 7 augments it,
  not this task)

`ShortlistCard.tsx` should require zero edits in this task — audit only. If
edits ARE needed (e.g. the `committedDirection` prop wiring needs an export
adjustment for the new deck consumer), keep them minimal and confined to that
prop's plumbing.

### Verify
`grep -n "ShortlistDeck" frontend/components/HomeDecide.tsx` returns at least one
import match plus the JSX mount. `cd frontend && npx tsc --noEmit` clean.
`cd frontend && npm run lint` clean. Manual: `npm run dev` then visit `/`; the
deck should render with the front card swipe-able and peek visible behind it.

### Done
ShortlistDeck.tsx exists (~150–180 LOC), HomeDecide.tsx imports it and mounts
it for the non-empty + non-all-voted state. VoteSummary remains in scope as
the all-voted terminal panel. No other component file edited.

### Commit
`feat(shortlist): re-wire swipe deck as primary Accueil surface`

---

## Task 6: Feedback layer — progress strip, snap-back hint, thumb-button echo

**Files:** `frontend/components/ShortlistProgress.tsx` (NEW), `frontend/components/ShortlistCard.tsx`, `frontend/components/ShortlistDeck.tsx`
**Type:** feat

### Action

**`ShortlistProgress.tsx` (NEW):**

Tiny stateless component. Props: `{ total: number; index: number; yesCount: number; }`.
Renders five (or `total`) dots in a horizontal flex row, plus a marginalia
caption below using `<Marginalia size="sm">`. Dot states:
- Voted-yes (index < current AND was a yes) → solid `var(--color-valide)`
  background (the new mono-terracotta saturated)
- Voted-no (index < current AND was a no) → solid `var(--color-rejete)`
  background OR `bg-foreground-muted/40` — pick the muted token already in scope
  (rejete tokens are NOT introduced by this plan; use `bg-foreground-muted/40`
  which mirrors the existing partner-unvoted dot)
- Current (index === current) → pill (wider, rounded-full, `bg-primary`)
- Future (index > current) → empty ring (`border border-border`)

Caption: use `tShortlist("progress_initial")` when index===0 AND yesCount===0;
`tShortlist("progress_partial", {remaining, yes})` while mid-flight; never
shows the `progress_complete` variant here (terminal state is VoteSummary).

**`ShortlistCard.tsx` snap-back shake (modify):**

In `handleDragEnd`, when `!swiped` (the `return` branch at line ~124), animate
the card with a 3-keyframe x shake: `[0, -6, 6, -3, 0]` over 300ms via
`useAnimationControls` or by setting `x.set(...)` in sequence. Also emit a
DOM CustomEvent `shortlist:snapback` so the deck can flash the snap-back hint
caption below the stack. Reduced-motion path: emit the event but skip the shake.

Add the ring-flash class for the thumb-tap pathway: when the thumb button
fires `onVote`, dispatch a `shortlist:thumb-vote` CustomEvent with `{value:
"yes"|"no"}` (this is consumed by the card to flash the matching ring before
the exit transform). Implement by adding a `useEffect` on `isFront` that
listens for the event and momentarily sets a class on the matching ring
motion.div (or sets the `yesOpacity`/`noOpacity` MotionValue directly with
`.set(1)` then `.set(0)` via a 200ms timer).

**`ShortlistDeck.tsx` (extend):**

- Mount `<ShortlistProgress total={dealableLen} index={index} yesCount={...} />`
  above the deck — `dealableLen` and `yesCount` come from the parent OR are
  recomputed here (cheap; pass them in via props if the parent already has them).
  Add two optional props if cleaner: `total?: number` (default `unvotedByMe.length
  + index`) and `yesSoFar?: number`.
- Mount a transient marginalia caption below the deck that listens for
  `shortlist:snapback` and shows `tShortlist("snapback_hint")` for 1.4s via a
  state flag + setTimeout (clear on unmount).
- Add the thumb-button echo: wrap `<ShortlistThumbButtons>` to also dispatch the
  `shortlist:thumb-vote` CustomEvent before calling the parent's `onVote`.

Use only the existing `framer-motion` and `sonner` imports — no new packages.

### Verify
`cd frontend && npx tsc --noEmit` clean. `cd frontend && npm run lint` clean.
Manual: drag a card right ~50px and release → card shakes back, "encore un peu —
glissez plus loin" caption appears below for ~1.4s. Tap the yes thumb → see the
terracotta ring flash on the card before fly-off.

### Done
Three files modified. The deck now has a progress strip above + snap-back caption
below + thumb-button ring flash on the card. No backend touched.

### Commit
`feat(shortlist): progress strip, snap-back hint, thumb-button echo`

---

## Task 7: Inline commit toast + partner ripple; lint pass

**Files:** `frontend/components/ShortlistCard.tsx`, `frontend/components/HomeDecide.tsx`
**Type:** feat

### Action

**Inline commit toast (in `ShortlistCard.tsx`):**

In `handleDragEnd`, on the `swiped` branch (after the threshold passes), call
`toast(...)` from `sonner` with:
- if `info.offset.x > 0`: `tShortlist("toast_yes", { title: recipe.title })`
- else: `tShortlist("toast_no", { title: recipe.title })`
Use `position: "bottom-center"` and `duration: 1400` to match the lifecycle
sketch. Reuse the existing `import { toast } from "sonner"` if present, else
add one — `sonner` is already a project dep.

ALSO fire the toast from the thumb-button pathway. The cleanest hook is in the
`onVote` handler ShortlistDeck passes down, but since the card owns the
`recipe.title` reference, fire it inline in the `useEffect` that listens for
`shortlist:thumb-vote` (added in Task 6) when the event fires for this card.

DO NOT toast on snap-back (Task 6's hint caption covers that signal).
DO NOT toast on Pressenti→Validé (HomeDecide already does that at line 204 with
the existing `toast_validé` key — leave that path alone).

**Partner ripple (in `ShortlistCard.tsx`):**

The partner-vote dot footer at line ~345 renders for the current front card.
When the partner votes on the *current front card*, ripple the chip — momentary
class on the wrapper. Add:
- A new `partner-chip-ripple` utility class — either inline via Tailwind
  `animate-pulse` + a one-shot, or as a small `@keyframes` block at the bottom
  of the same file (component-scoped via `<style jsx>` is NOT used in this
  project; if a one-shot is needed, add a tiny rule to `frontend/app/globals.css`
  — but PREFER reusing existing `transitions.springSnap` via Framer Motion
  `animate` prop on the chip wrapper).
- The chip is `motion.div` (currently plain `<div>`). Convert to `motion.div`
  and on partner-vote events for the current recipe, run a `controls.start({
  scale: [1, 1.15, 1] })` ripple. Use `useAnimationControls` from framer-motion.

**Trigger from `HomeDecide.tsx`:**

The existing `VOTE_CREATED_DOM_EVENT` listener at lines 133–213 already
processes partner votes. After the `setShortlist(...)` reconciliation, forward
a follow-up DOM CustomEvent `shortlist:partner-vote-on-card` with
`{recipe_id, member_id, vote}` so the card (which doesn't subscribe to the raw
VOTE_CREATED_DOM_EVENT) can react. The card listens for this event in a
`useEffect`, checks if `recipe_id === recipe.id` AND `member_id === partner.id`,
and triggers the chip ripple.

**Lint pass:**

`cd frontend && npm run lint`. Fix any new warnings introduced across Tasks 1–7
(unused imports, missing dep arrays, `any` types). Do NOT run backend pytest —
out of scope.

### Verify
`cd frontend && npx tsc --noEmit` clean. `cd frontend && npm run lint` clean.
Manual smoke walk on `localhost:3000` (375px viewport):
1. Deal-in renders → two cards visible (front + peek)
2. Drag right past 140px → ring fills terracotta → release → fly-off → toast
   `"Validé · {title}"` appears bottom-center → next card promotes via spring → progress strip advances
3. Tap yes thumb → ring flashes → fly-off → toast appears → next card promotes
4. Drag right ~50px and release → card shakes, "encore un peu" caption appears
5. (Simulate partner) Trigger a VOTE_CREATED_DOM_EVENT via devtools or a second session
   → partner chip on current front card ripples

### Done
Two files modified. Every commit pathway (swipe + thumb) emits the inline toast.
The partner chip ripples on partner votes. Lint clean. Backend unchanged.

### Commit
`feat(shortlist): commit toast + partner ripple`

---

## End-of-plan verification (NOT a commit — for SUMMARY)

Manual smoke test the user can run after Task 7:

```bash
cd frontend && npm run dev
# Open http://localhost:3000 on a 375px viewport (DevTools mobile sim)
```

Walk:
1. Deal-in animation → front + peek visible
2. Drag right (see terracotta ring fill, NOT emerald)
3. Release short → shake + "encore un peu — glissez plus loin"
4. Drag right past threshold → commit → toast `"Validé · {title}"` appears
5. Next card promotes (spring entry from peek slot)
6. Tap thumb → ring flash + button echo + toast
7. Vote on all 5 → terminal `<VoteSummary>` panel renders
8. Visually confirm: zero emerald hue anywhere on Accueil (header, deck, thumb
   button, ring, progress strip)

---

## Hard scope rules — files NOT to touch

- `backend/**` — zero changes. The votes table is computed-not-stored (invariant #2);
  no backend wiring needs to move. Skip pytest.
- `frontend/components/{any not listed above}` — do NOT refactor `VoteSummary.tsx`
  (it stays as the all-voted terminal panel, props unchanged), `CookingBanner.tsx`,
  `RegenerateSheet.tsx`, `EmptyState.tsx`, `BrandLoader.tsx`, `Marginalia.tsx`,
  `RealtimeProvider.tsx`, `SessionProvider.tsx`, `PushPermissionBanner.tsx`,
  `BottomNav.tsx`, or any other component.
- `frontend/lib/**` except `i18n/fr.json` (Task 4) — do NOT refactor `swipe-tokens.ts`,
  `motion.ts`, `votes.ts`, `shortlist.ts`, `cooking.ts`, `api.ts`, `enum-labels.ts`,
  `enums.ts`, `recipes.ts`, hooks, or any other lib file.
- `.planning/**` — orchestrator handles status/STATE.md updates.
- `docs/**` except `design-system.html` (Task 2) and `adr/0003-validated-color-mono-terracotta.md`
  (Task 3) — do NOT touch SPEC.md, CONTEXT.md, RUNBOOK.md, TESTING.md, README.md,
  or other ADRs.
- `frontend/tests/e2e/**` — out of scope. Re-recording specs after the deck swap
  is a separate quick task.
- `package.json` / `package-lock.json` — do NOT add new dependencies. `sonner` and
  `framer-motion` are already installed.

### Scope-creep guardrails (executor must obey)

1. If a file is not in this plan's `Files:` list for the current task, do NOT
   edit it — even if it looks like a "quick fix" along the way. Surface it as
   a follow-up note in SUMMARY.md instead.
2. If you find yourself needing to refactor a function in `frontend/lib/` to
   make a task work, STOP and reconsider — the contracts in this plan are
   designed to require zero `lib/` changes outside `fr.json`.
3. Commit AFTER EACH TASK. Do not batch. The commit messages are pre-written
   above; use them verbatim.
4. If `npm run lint` fails on something pre-existing (not caused by your diff),
   note it in SUMMARY.md and skip — do not fix unrelated lint debt in this
   quick.
