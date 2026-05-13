# Phase 27: Conversational capture screen - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 27-conversational-capture-screen
**Areas discussed:** Composer affordances, Title field shape, Draft state + inbox fate, /recipes/[id] scope in P27

---

## Composer affordances

### Q1: What does the mic button do, given D-Voice?

| Option | Description | Selected |
|--------|-------------|----------|
| Opens a voice-note sheet with textarea | Reuses D-Voice helper card + textarea; OS-keyboard-mic dictation; emits a `voice` pending bubble | ✓ |
| Mic is a hint; text input is the voice path | Mic icon is visual hint only; dictated text → `text` turn | |
| Open a MediaRecorder audio sheet | New audio API, new perms, new failure modes; violates D-Voice MVP budget | |

**User's choice:** Opens a voice-note sheet with textarea (Recommended)
**Notes:** Honors D-Voice constraint from Phase 2; reuses VoiceCaptureTab's existing pattern.

### Q2: How does the user emit a URL bubble?

| Option | Description | Selected |
|--------|-------------|----------|
| + menu → « Coller un lien » option | Explicit menu entry; reuses UrlCaptureTab's `new URL(...)` validation | ✓ |
| Paste-detection on the text input | Auto-convert pasted `http(s)://` into a `url` bubble | |
| Dedicated 4th button in the composer | Chain/link icon next to mic; visual noise; not in mockup | |

**User's choice:** + menu → « Coller un lien » option (Recommended)
**Notes:** Discoverable + explicit; rejects magic paste detection.

### Q3: How are photos represented in the thread?

| Option | Description | Selected |
|--------|-------------|----------|
| One bubble per photo | Each photo = one `photo` turn; matches mockup Frame A rhythm | ✓ |
| Grouped photo bubble (multi-image carousel) | One bubble holding N photos; cheaper round-trip; less chat-like | |
| Mix — burst-add stays grouped | Camera-roll multi-select → grouped; single shots → per-bubble | |

**User's choice:** One bubble per photo (Recommended)
**Notes:** Preserves the kitchen-counter mental model — each photo is a discrete capture moment.

### Q4: How does the user send a text bubble?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated send button replaces mic when input has content | iMessage / WhatsApp pattern; one slot, two functions | ✓ |
| Always-visible send button next to mic | Two trailing buttons; visual noise | |
| Enter key submits, no visible send button | Cleanest; iOS soft-keyboard newline risk | |

**User's choice:** Dedicated send button replaces mic when input has content (Recommended)
**Notes:** Matches mockup's single trailing button position.

---

## Title field shape

### Q1: How is the title captured at /recipes/new?

| Option | Description | Selected |
|--------|-------------|----------|
| First text bubble IS the title | Frontend lifts first text bubble's content → `recipes.title` on save | |
| Separate sticky title input above the thread | Dedicated `<Input>`; deviation from mockup | |
| Title is purely server-derived from the first text/voice bubble | Gemini generates title; frontend never sends `title` | ✓ |
| First bubble = title + small « Modifier le titre » affordance | Hybrid; two surfaces for same data | |

**User's choice:** Title is purely server-derived and the LLM generates it
**Notes:** Most server-side option. Unifies all 5 capture paths around "title is a Gemini output". Removes the v0.1 quick-flow's user-typed title affordance.

### Q2: What if the user has no text bubble — photo/voice/url only — at Enregistrer?

| Option | Description | Selected |
|--------|-------------|----------|
| Save anyway with placeholder; Gemini renames on promotion | Backend assigns « Extraction en cours… »; rewrite_title() finalizes | ✓ |
| Block save with inline hint « Donne un titre ou ajoute une note » | Forces a title moment; breaks photo-only/voice-only flows | |
| Inline title prompt at save time | Modal asks for title; adds one tap to title-less flows | |

**User's choice:** Save anyway with placeholder; Gemini renames on promotion (Recommended)
**Notes:** Mirrors voice/photo/url flows today; zero pre-save friction.

### Q3: What shows on /recipes/[id] header before promote_draft completes?

| Option | Description | Selected |
|--------|-------------|----------|
| « Extraction en cours… » in italic | Italic placeholder until `summary` turn or `recipe.promoted` flips it | ✓ |
| Header empty until title exists | Layout shift on promotion | |
| « Nouvelle recette » (generic placeholder) | Neutral; persists if extraction fails | |

**User's choice:** « Extraction en cours… » in italic (Recommended)
**Notes:** Matches existing extraction-in-progress idiom.

### Q4: What gates « Enregistrer », given title is server-derived?

| Option | Description | Selected |
|--------|-------------|----------|
| ≥1 pending bubble of any kind | Rewrites ROADMAP success-criterion 3 wording in the same change | ✓ |
| ≥1 text or voice bubble (LLM-actionable only) | Photo-only/URL-only blocked until extraction; voids v0.1 flows | |

**User's choice:** ≥1 pending bubble of any kind (Recommended)
**Notes:** Photo-only/voice-only/URL-only all save with a single bubble.

---

## Draft state + inbox fate

### Q1: What happens to status='draft' as a recipe lifecycle state?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `draft` as the pre-promotion buffer | Transient state visible briefly on /recipes/[id]; failed terminal preserved | ✓ |
| Drop `draft` entirely — land directly as `structured` | Aggressive cleanup; loses "this hasn't been LLM-processed yet" semantic | |
| Rename `draft` to `extracting` (or similar) | Semantic rename only; high cost / low value | |

**User's choice:** Keep `draft` as the pre-promotion buffer (Recommended)
**Notes:** Minimal status-machine churn.

### Q2: What happens to the /inbox surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete /inbox entirely, drop the BottomNav slot | Inbox page deleted; RecipeDraftCard deleted; BottomNav slot removed | ✓ |
| Keep /inbox but rewire content | Only failed recipes; rename slot to « Échec » | |
| Keep /inbox as-is | No changes; misses Phase 26 D-05 forward note | |

**User's choice:** Delete /inbox entirely, drop the BottomNav slot (Recommended)
**Notes:** Closes Phase 26 D-05's forward note ("Phase 27 lands [draft-removal] in one clean pass").

### Q3: How do `failed`-status recipes surface to the user?

| Option | Description | Selected |
|--------|-------------|----------|
| On the main /recipes list with a destructive state pill | Small « Échec » pill on RecipeCard; tap opens detail with Réessayer | ✓ |
| Dedicated /errors or /failed page | Mini-inbox replacement; doubles UI surfaces | |
| Defer — leave failed-handling unchanged | Tighter P27 scope; regression risk | |

**User's choice:** On the main /recipes list with a destructive state pill (Recommended)
**Notes:** One surface for everything; no separate inbox.

---

## /recipes/[id] scope in P27

### Q1: What does Phase 27 ship for /recipes/[id]?

| Option | Description | Selected |
|--------|-------------|----------|
| Full chat component, all turn kinds rendered, refinement composer wired | Phase 28 only wires 4 handlers to existing UI; maximally reusable | ✓ |
| Read-only chat + composer (text/voice/photo/url only) | `question`/`advisory` get generic rendering; Phase 28 extends component | |
| Minimal detail-page touch — chat renders, no composer yet | Loses CAPTURE-04 "conversation continues there" beat | |

**User's choice:** Full chat component, all turn kinds rendered, refinement composer wired (Recommended)
**Notes:** Maximally reusable component; Phase 28's diff stays small.

### Q2: What about the existing recipe form on /recipes/[id]?

| Option | Description | Selected |
|--------|-------------|----------|
| Leave the existing form rendering untouched | Chat mounts alongside; Phase 28 wires pin signals + manually_edited_fields | ✓ |
| Refactor the detail page layout fully in P27 | Larger UI surface; higher regression risk | |
| Hide form behind a toggle, chat is primary | Closer to mockup intent; bigger UX shift | |

**User's choice:** Leave the existing form rendering untouched (Recommended)
**Notes:** Lowest-risk continuity; preserves v0.5 design polish.

### Q3: Does the shared chat component live in /components or a new module structure?

| Option | Description | Selected |
|--------|-------------|----------|
| frontend/components/RecipeThread/* with sub-files | Directory with index/Bubble/SystemBubble/Composer/VoiceSheet/UrlSheet/PhotoMenu | ✓ |
| Single flat file frontend/components/RecipeThread.tsx | All rendering + composer in one 400+ LOC file | |
| Inside frontend/app/recipes/new (co-located) | Cross-route import awkwardness | |

**User's choice:** frontend/components/RecipeThread/* with sub-files (Recommended)
**Notes:** Clean separation; reusable from both /recipes/new and /recipes/[id].

---

## Claude's Discretion

The following implementation choices were explicitly handed off to the researcher/planner with recommended defaults:
- Pre-save bubble mutability (recommend deletable, not reorderable, not editable in-place)
- Pre-save persistence (recommend ephemeral; productize-later)
- Cancel / back behavior with pending bubbles (recommend confirmation)
- Loader / extraction-in-progress UX in the thread (recommend italic « Extraction en cours… » row)
- `POST /recipes` body shape post-rewrite (recommend strict `{}`)
- `promote_draft` coalescing implementation (D-13a coalescing window vs D-13b explicit `/promote` endpoint)
- `RecipeListPage` filter behavior post-/inbox deletion (recommend structured+failed)
- i18n keys for new chat copy (planner adds under `recipes.thread.*` namespace)
- Photo-bubble total-bytes cap enforcement (preserve 18 MB total via T-02-04-02)
- Bottom-bar slot redistribution (planner decides visual rebalance for 3 slots)

## Deferred Ideas

- Pre-save bubble persistence (localStorage / IndexedDB)
- Pre-save bubble reorder / edit-in-place
- Paste-detection for URL strings in the text input
- MediaRecorder in-app audio recording
- « Save as draft » affordance pre-promotion
- Per-member turn attribution
- Push notifications for post-promotion advisories
- Chip / stepper interactive handlers on `question` turns (Phase 28)
- Advisory accept/dismiss CTAs wiring (Phase 28)
- `manually_edited_fields` write path + per-field pin signal (Phase 28)
- LLM emission of `summary`/`question`/`advisory` system turns (Phase 29)
- Server-side `recipe-completeness` parallel for question-turn generation (Phase 29)
- `/recipes` list redesign for the failed-pill addition (beyond minimum viable pill)
