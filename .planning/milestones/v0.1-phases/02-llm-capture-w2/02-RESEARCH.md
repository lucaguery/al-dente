# Phase 2: LLM Capture (W2) — Research

**Researched:** 2026-05-07
**Domain:** LLM-assisted recipe capture (voice / photo / URL) + voice modification + WebSocket promotion broadcast
**Confidence:** MEDIUM-HIGH (one BLOCKING risk: Web Speech API in iOS PWA standalone mode)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Capture entry point**
- **D-01:** `/recipes/new` extends from 2 tabs to **5 tabs**: Rapide | Complète | Voix | Photo | URL.
- **D-02:** Quick (Rapide) tab keeps optional photo input unchanged. Quick-tab photo = attach without Gemini extraction. Photo tab = photo IS the recipe source, Gemini extracts.
- **D-03:** URL tab shows helper notice: _"L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception."_ Submission creates a draft immediately with the URL in `source_capture`. No extraction in v0.1.

**Voice recording UX**
- **D-04:** Voice = tap-to-start, tap-to-stop. No hold-to-record.
- **D-05:** Live rolling transcript while recording — interim results in grey, final results in solid text. `interimResults: true`.
- **D-06:** Review step after stop — transcript in scrollable read-only box + "Envoyer" / "Recommencer" buttons.

**Promotion feedback**
- **D-07:** Drafts inbox shows spinner + "Extraction en cours…" while a non-manual draft is promoting. `RecipeDraftCard` extended.
- **D-08:** `recipe.promoted` WS event → Sonner toast _"Ta recette « [titre] » est prête !"_. Both phones receive. No forced navigation.

**Gemini failure handling**
- **D-09:** New columns `promotion_error TEXT` + `promotion_attempts INT DEFAULT 0`. Drafts inbox shows red "Échec" badge + ghost "Réessayer" button. Retry sends `POST /recipes/{id}/retry-promotion` (or re-invokes BackgroundTask path — planner decides).

**Voice modification UX**
- **D-10:** Mic icon in recipe detail page header → opens voice recording sheet. On "Envoyer" sends transcript to `POST /recipes/{id}/voice-modify`. Frontend navigates to edit form pre-filled.
- **D-11:** No visual diff — fields simply pre-filled with Gemini's output.

### Claude's Discretion

- Gemini structured output schema: extract all `recipes` table fields (`title`, `ingredients` JSONB array, `steps`, `prep_time_minutes`, `servings`, `cuisine` enum-constrained, `mood` array, `main_protein` enum-constrained, `seasonality` array). Null when unable to extract. Promotion succeeds if at least `title` is present.
- Web Speech API language: `lang: "fr-FR"`.
- Photo capture: same 1–4 photo limit + multipart pattern as Phase 1. Reuse `PhotoUploader.tsx`.
- BackgroundTask error handling: try/except around Gemini. On exception → write `promotion_error = str(e)`, increment `promotion_attempts`. On success → set `status='structured'`, clear `promotion_error`, broadcast `recipe.promoted`.
- `POST /recipes/url` shape: `{ url: str }`. `source_capture = { type: 'url', payload: { url } }`. No LLM call.
- `POST /recipes/voice` shape: `{ transcript: str }`.
- `POST /recipes/{id}/retry-promotion`: re-reads `source_capture`, re-runs BackgroundTask, resets `promotion_error = null` first.
- CORS / auth: existing `Depends(current_member)` cookie auth (Phase 01.1 D-03).
- Alembic migration: add `promotion_error TEXT` and `promotion_attempts INTEGER NOT NULL DEFAULT 0` to `recipes`.
- CAPTURE-07: Web Speech API directly into cooking-log notes textarea via reusable `<VoiceInput>` wrapper. Phase 4 wires it into the finalization screen.

### Deferred Ideas (OUT OF SCOPE)

- Gemini extraction for URL pastes — productize-later (CAPTURE-03).
- Visual diff on voice-modify (D-11 deferred).
- `promotion_attempts` retry cap (e.g. lock after 3) — not v0.1.
- Gemini prompt versioning / re-promotion on model upgrade — preserved via `source_capture` but not exercised.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAPTURE-01 | Voice capture — Web Speech API → `POST /recipes/voice` → BackgroundTask → Gemini 2.5 Flash promotes to structured | Web Speech API limitation surfaced (§Open Questions Q-01); Gemini structured output via `google-genai` SDK; BackgroundTask + new SessionLocal pattern (§Architecture Pattern 2) |
| CAPTURE-02 | Photo capture — `POST /recipes/photo` (multipart, 1–4 images) → BackgroundTask Gemini multimodal extraction | Gemini Python SDK accepts inline image bytes (≤20 MB total request); reuse `PhotoUploader.tsx` + `services/storage.py` for upload (§Architecture Pattern 3) |
| CAPTURE-03 | URL paste — `POST /recipes/url` stores URL in `source_capture`. No LLM call in v0.1. | Trivial endpoint; no Gemini; helper notice in tab. |
| CAPTURE-04 | `recipe.promoted` WebSocket broadcast on status flip | Existing `broadcast_to_household` accepts arbitrary event types — see §Code Examples §"Broadcasting recipe.promoted" |
| CAPTURE-05 | Voice-modify — `POST /recipes/{id}/voice-modify` → Gemini returns modified fields → edit form pre-filled | Same Gemini SDK call shape as CAPTURE-01 with original recipe + transcript as input; navigate with prefill payload |
| CAPTURE-06 | Raw inputs persist in `source_capture` JSONB forever | Existing pattern at `recipes.py` already enforces; never overwritten by PUT |
| CAPTURE-07 | Voice notes on cooking-log — Web Speech directly into `notes` field | Same `useVoiceRecorder` hook reused as `<VoiceInput>` wrapper. Cooking-log finalization screen is Phase 4. Same iOS PWA limitation applies (Q-01). |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Directive | Source |
|-----------|--------|
| **SPEC.md is source of truth** — read before designing any feature | CLAUDE.md §"Source of truth" |
| **Drift between `frontend/lib/enums.ts` and `backend/app/models/enums.py` is a bug to avoid** | CLAUDE.md §"Repo layout" |
| **Five capture surfaces, one shape** — all `POST /recipes/<surface>`, return draft, promotion server-side via BackgroundTask. Server is single source of truth. | CLAUDE.md invariant 1 |
| **Voting state computed, not stored** | invariant 2 (not relevant to Phase 2 but documents pattern) |
| **Denormalized fields updated in same transaction as source** | invariant 3 (not relevant to Phase 2) |
| **Realtime contract** — household-syncing mutations broadcast via realtime helper. `recipe.promoted` is in the locked event vocabulary. | invariant 4 |
| **Raw inputs are kept forever** in `source_capture` JSONB | invariant 5 |
| **Localization from day one** — all user-facing strings via `next-intl`; hardcoded strings = productize-later debt | invariant 6 |
| **`# TODO(productize)` for v0.2 work; `# TODO` for intra-v0.1 work** | CLAUDE.md §"Productize-later TODOs" |
| **Auto-deploy on push to `main`** — never run `vercel --prod` or restart Railway manually | CLAUDE.md §"Constraints > Deployment" |
| **Backend uses `uv`** for dependency management | CLAUDE.md §"Backend" |
| **Next.js 16+ may have breaking changes not in training data** — consult `frontend/node_modules/next/dist/docs/` | CLAUDE.md, frontend/AGENTS.md |
| **GSD Workflow Enforcement** — file edits must go through a GSD command | CLAUDE.md §"GSD Workflow Enforcement" |

## Summary

Phase 2 layers three new LLM-assisted capture surfaces (voice, photo, URL) and a voice-modify path onto the existing recipe table. The backend lift is moderate: one new service module (`services/llm.py`), four new endpoints on the existing `recipes` router, two new columns via Alembic migration, and one new event type (`recipe.promoted`) on the already-built `broadcast_to_household` spine. The frontend lift is larger: 5-tab capture page, voice state machine hook, voice-modify sheet, draft-card variants, and Realtime handler.

**One BLOCKING risk dominates this phase:** `webkitSpeechRecognition` does not work in iOS Safari standalone PWA mode (Add to Home Screen). It works in Safari browser tab but fails silently when launched from the home-screen icon. This affects CAPTURE-01, CAPTURE-05, CAPTURE-07 — all three voice surfaces. Multiple independent sources confirm this limitation persists through iOS 18 / Safari 26.x. SPEC.md §"Risks budgeted" anticipated this with the fallback "send audio file to Gemini (multimodal supports audio) and skip Web Speech API" — but that fallback requires audio capture via `MediaRecorder` API, not `SpeechRecognition`, plus a Gemini audio-processing path the rest of the spec does not cover. **The user must decide between (a) accepting voice capture only works in Safari browser tab — degrading the v0.1 dogfood gate from "PWA fully self-contained" to "voice features require opening Safari", or (b) implementing the MediaRecorder + Gemini audio fallback (adds ~1 plan worth of work and a different UX), or (c) deferring voice surfaces to a Phase 2.x.**

**Primary recommendation:** Use the unified Google Gen AI SDK (`google-genai` 1.75.0, not the deprecated `google-generativeai`). Use `response_mime_type='application/json'` + `response_schema` keyed off Pydantic models for structured extraction. Spawn a fresh `SessionLocal()` inside each BackgroundTask function — never pass the request's session. Broadcast `recipe.promoted` on success; persist `promotion_error` on exception. Confirm Web Speech API decision with user before planning Voice tab work.

## Standard Stack

### Core (backend additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `google-genai` | **1.75.0** (verified PyPI 2026-05-04) | Gemini 2.5 Flash structured output + multimodal | Official unified SDK. Replaces deprecated `google-generativeai` (legacy SDK; Gemini API deprecation date 2025-08-31 per Google migration docs — already past). [VERIFIED: pypi.org/pypi/google-genai/json] |

[VERIFIED via WebSearch 2026-05-07: Google Gemini API docs, python-genai GitHub README, google-gemini/deprecated-generative-ai-python repo]

**Important:** SPEC.md §Stack and `.planning/codebase/STACK.md` both still say `google-generativeai`. **The planner MUST use `google-genai` instead** — the legacy package is officially deprecated and will not receive updates.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pydantic` | 2.x (already pinned `>=2`) | Define `GeminiExtractedRecipe` schema for `response_schema` | Always — the SDK accepts Pydantic models directly via `response_json_schema` or `response_schema`. [CITED: ai.pydantic.dev/api/models/google] |
| FastAPI `BackgroundTasks` | bundled with FastAPI 0.136 | Promotion task queue | Already used in pattern; CLAUDE.md invariant 1 names it explicitly. |
| `python-multipart` | already pinned `>=0.0.27` | Photo multipart upload | Already used by photos router; reuse. |

### Frontend additions

**No new npm dependencies required.** Phase 2 composes existing primitives:
- `lucide-react` 1.14 — `Mic`, `MicOff`, `Image`, `Link2`, `Info`, `RefreshCw`, `Sparkles` icons (UI-SPEC §Iconography)
- `sonner` 2.0.7 — already used for toasts
- shadcn `Sheet` primitive — already in `components/ui/sheet.tsx`
- shadcn `Tabs` primitive — already used (extending from 2 to 5 tabs)
- Native browser `SpeechRecognition` / `webkitSpeechRecognition` — see §Open Questions Q-01 about iOS PWA support

[VERIFIED: frontend/package.json read 2026-05-07]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `google-genai` SDK | Direct REST calls via `httpx` | More portable but loses Pydantic schema integration, retry handling, and the file-upload helper. Skip. |
| FastAPI `BackgroundTasks` | Celery + Redis | Celery gives persistent retries + horizontal scaling. Overkill for couple-scale; would mean adding Redis to Railway. SPEC.md explicitly picks BackgroundTasks. v0.2 candidate if persistence becomes an issue. [CITED: fastapi.tiangolo.com/tutorial/background-tasks] |
| Web Speech API for voice | `MediaRecorder` API + Gemini audio multimodal | If Q-01 forces the fallback path: capture audio with `MediaRecorder`, POST `audio/webm` blob to backend, Gemini `genai.upload_file` then `generate_content` on audio. Different UX (no live transcript) and ~1 extra plan of work. SPEC.md §"Risks budgeted" anticipated this. |
| `webkitSpeechRecognition` only | `react-speech-recognition` (npm) | Same underlying API + same iOS PWA limitation. Doesn't help. Skip. |
| Pydantic schema | Hand-rolled JSON Schema dict | Pydantic preserves type safety + reuses existing validation surface. Use Pydantic. [CITED: ai.google.dev/gemini-api/docs/structured-output] |

**Installation:**
```bash
cd backend && uv add "google-genai>=1.75"
```

[ASSUMED] No backend test framework exists yet (`backend/tests/` does not exist; nothing in pyproject.toml). Phase 2 may be the natural moment to add `pytest` per CONCERNS.md §"Missing Test Infrastructure" — but `.planning/config.json` has `"nyquist_validation": false` so this research does not include a Validation Architecture section.

**Version verification:**
```bash
# google-genai latest 1.75.0 published 2026-05-04 (verified)
curl -s https://pypi.org/pypi/google-genai/json | jq -r '.info.version'
# google-generativeai (legacy) 0.8.6 last published 2025-12-16, DEPRECATED
```

## Architecture Patterns

### Recommended Layout

```
backend/app/
├── routers/
│   ├── recipes.py            # extend: add /voice, /photo, /url, /{id}/voice-modify, /{id}/retry-promotion
│   └── ... (unchanged)
├── services/
│   ├── llm.py                # NEW — Gemini client + extract/modify functions + BackgroundTask wrappers
│   ├── realtime.py           # extend doc: add 'recipe.promoted' to event vocabulary list
│   └── storage.py            # reuse for photo capture (already validates magic bytes)
├── schemas/
│   └── recipe.py             # extend: add VoiceCaptureRequest, UrlCaptureRequest, VoiceModifyRequest, GeminiExtractedRecipe
├── models/
│   └── recipe.py             # extend: add promotion_error, promotion_attempts columns
└── alembic/versions/
    └── 0003_promotion_columns.py  # NEW migration

frontend/
├── app/recipes/new/page.tsx              # extend: 2 → 5 tabs (D-01)
├── app/recipes/[id]/page.tsx             # extend: add Mic icon in header (D-10)
├── components/
│   ├── VoiceCaptureTab.tsx               # NEW
│   ├── PhotoCaptureTab.tsx               # NEW
│   ├── UrlCaptureTab.tsx                 # NEW
│   ├── VoiceModifySheet.tsx              # NEW
│   ├── VoiceInput.tsx                    # NEW (Phase 4 will use)
│   ├── RecipeDraftCard.tsx               # extend: spinner + Échec variants (D-07, D-09)
│   └── RealtimeProvider.tsx              # extend: handle 'recipe.promoted'
├── lib/
│   ├── voice.ts                          # NEW — useVoiceRecorder hook
│   └── recipes.ts                        # extend: postVoiceCapture, postPhotoCapture, postUrlCapture, postVoiceModify, postRetryPromotion
└── lib/i18n/fr.json                      # extend: recipes.voice.*, recipes.photo.*, recipes.url.*, recipes.promotion.*, recipes.voice_modify.*, common.sending
```

### Pattern 1: Gemini structured output via Pydantic schema

**What:** Use `google-genai` SDK with `response_mime_type='application/json'` and `response_schema` set to a Pydantic model whose fields mirror the `recipes` table's structured columns.

**When to use:** Both `POST /recipes/voice` (transcript → fields) and `POST /recipes/photo` (images → fields) use the same schema. Voice-modify uses a similar schema with the original recipe as additional context.

**Example:**
```python
# backend/app/services/llm.py
# Source: https://ai.google.dev/gemini-api/docs/structured-output (verified 2026-05-07)
from typing import Optional, Literal
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from app.models.enums import Cuisine, Mood, Protein, Season

CuisineLiteral = Literal[
    "italian", "french", "asian", "mediterranean", "middleEastern",
    "indian", "mexican", "northAfrican", "american", "other",
]
ProteinLiteral = Literal[
    "poultry", "redMeat", "fish", "seafood", "egg", "legume", "none",
]
MoodLiteral = Literal[
    "comfort", "light", "quick", "celebratory", "adventurous",
]
SeasonLiteral = Literal["spring", "summer", "autumn", "winter"]


class GeminiIngredient(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None


class GeminiExtractedRecipe(BaseModel):
    """Schema constraining Gemini's structured output.

    Fields mirror the recipes table; null on missing data, never invented.
    Promotion succeeds if at least ``title`` is non-empty.
    """
    title: str
    ingredients: Optional[list[GeminiIngredient]] = None
    steps: Optional[list[str]] = None
    prep_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
    servings: Optional[int] = Field(default=None, ge=1, le=99)
    cuisine: Optional[CuisineLiteral] = None
    mood: list[MoodLiteral] = Field(default_factory=list)
    main_protein: Optional[ProteinLiteral] = None
    seasonality: list[SeasonLiteral] = Field(default_factory=list)


_client: genai.Client | None = None

def _gemini() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def extract_from_transcript(transcript: str) -> GeminiExtractedRecipe:
    """Voice → structured. Raises on Gemini error or invalid JSON."""
    response = _gemini().models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            "Extrais les champs structurés de cette recette dictée en français. "
            "Renvoie null pour les champs absents — n'invente rien.",
            transcript,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiExtractedRecipe,
        ),
    )
    # SDK auto-parses .parsed when response_schema is a Pydantic model
    return response.parsed
```

### Pattern 2: BackgroundTask with fresh SessionLocal

**What:** FastAPI `BackgroundTasks` runs the task **after the response is sent** in the same process — but the request's DB session has already been closed by `Depends(get_db)`'s context manager. The task MUST open its own session.

**When to use:** Every promotion path — `POST /recipes/voice`, `POST /recipes/photo`, `POST /recipes/{id}/retry-promotion`.

**Example:**
```python
# backend/app/services/llm.py (continued)
# Source: SQLAlchemy + FastAPI patterns; multiple corroborating sources via WebSearch 2026-05-07
import asyncio
import logging
from uuid import UUID
from sqlalchemy import select
from app.db import SessionLocal
from app.models.recipe import Recipe
from app.services.realtime import broadcast_to_household
from app.schemas.recipe import RecipeResponse

log = logging.getLogger(__name__)


def promote_voice_draft(recipe_id: UUID, transcript: str) -> None:
    """BackgroundTask body. New session per task. Never share request's session."""
    db = SessionLocal()
    try:
        recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
        if recipe is None:
            log.warning("promote_voice: recipe %s vanished", recipe_id)
            return
        try:
            extracted = extract_from_transcript(transcript)
            # Apply extracted fields. Promotion succeeds if title is present.
            if not extracted.title or not extracted.title.strip():
                raise ValueError("Gemini returned empty title")
            recipe.title = extracted.title
            recipe.ingredients = (
                [i.model_dump() for i in extracted.ingredients]
                if extracted.ingredients else None
            )
            recipe.steps = extracted.steps
            recipe.prep_time_minutes = extracted.prep_time_minutes
            recipe.servings = extracted.servings
            recipe.cuisine = extracted.cuisine
            recipe.mood = extracted.mood or []
            recipe.main_protein = extracted.main_protein
            recipe.seasonality = extracted.seasonality or [
                "spring", "summer", "autumn", "winter",
            ]
            recipe.status = "structured"
            recipe.promotion_error = None
            recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
            db.commit()
            db.refresh(recipe)
            payload = RecipeResponse.model_validate(recipe).model_dump(mode="json")
            # broadcast_to_household is async — run in event loop
            asyncio.run(broadcast_to_household(
                recipe.household_id, "recipe.promoted", payload,
            ))
        except Exception as exc:  # noqa: BLE001 — broad catch is intentional
            log.exception("promote_voice failed recipe=%s", recipe_id)
            recipe.promotion_error = str(exc)[:500]
            recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
            db.commit()
            # No "recipe.promote_failed" event in v0.1 — frontend polls/refetches.
    finally:
        db.close()
```

**Async/sync subtlety:** `broadcast_to_household` is `async`. In a sync BackgroundTask body, use `asyncio.run(...)`. Alternative: declare the BackgroundTask function `async def` — FastAPI handles both. **Decision for planner:** sync function + `asyncio.run` is simpler since the rest of the function is sync DB I/O via psycopg2 (no async DB).

[VERIFIED: dev.to/derricktab/safe-threading-with-sqlalchemy-in-fastapi, fastapi.tiangolo.com/tutorial/background-tasks, multiple WebSearch corroborations 2026-05-07]

### Pattern 3: Photo multipart capture for Gemini multimodal

**What:** `POST /recipes/photo` accepts 1–4 multipart `UploadFile` entries. Backend creates the draft, uploads each photo to Supabase Storage (reusing `services/storage.py`), persists paths in `recipe.photo_paths`, queues BackgroundTask that reads photos back as bytes (or directly from in-memory buffer) and calls Gemini multimodal.

**When to use:** CAPTURE-02 only.

**Two acceptable photo paths to Gemini:**
1. **Inline bytes** (recommended for v0.1): `Part.from_bytes(data=photo_bytes, mime_type="image/jpeg")`. Total request size limit **20 MB** including the prompt — fine for ≤4 photos at 8 MB cap each (existing `MAX_BYTES`). Caveat: at 4×8MB = 32MB this exceeds 20MB inline limit. Resize/compress server-side before sending OR upload via File API.
2. **File API** (`client.files.upload`): for total >20MB. Returns a `File` reference passed to `generate_content`. Files persist 48h. Slightly more code but no size cap.

**Recommendation:** v0.1 ships with inline-bytes path + a defensive total-size check that rejects >18 MB combined and surfaces an error toast. If that bites in dogfood, upgrade to File API (~10 lines change).

```python
# backend/app/services/llm.py (continued)
# Source: ai.google.dev/gemini-api/docs/image-understanding (verified 2026-05-07)
def extract_from_photos(photo_bytes_list: list[bytes]) -> GeminiExtractedRecipe:
    """1–4 photos → structured. Inline bytes path; <20 MB total."""
    parts = [
        types.Part.from_bytes(data=b, mime_type="image/jpeg")  # mime sniffed earlier
        for b in photo_bytes_list
    ]
    response = _gemini().models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            "Voici une recette photographiée (1 à 4 images). Extrais les "
            "champs structurés en français. Renvoie null pour les champs absents.",
            *parts,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiExtractedRecipe,
        ),
    )
    return response.parsed
```

[VERIFIED: ai.google.dev image-understanding docs via WebSearch; 20MB inline limit confirmed 2026-05-07]

### Pattern 4: Web Speech API state machine (frontend)

**What:** A `useVoiceRecorder` hook that wraps `webkitSpeechRecognition` / `SpeechRecognition`. Exposes `{ status, interimTranscript, finalTranscript, start, stop, reset }`. Idle → recording → review state machine matches D-04..D-06.

**When to use:** `VoiceCaptureTab`, `VoiceModifySheet`, `VoiceInput` — all share the hook.

**Example:**
```tsx
// frontend/lib/voice.ts (new)
// Source: MDN SpeechRecognition + webkitSpeechRecognition (verified 2026-05-07)
"use client";
import { useEffect, useRef, useState } from "react";

type RecognitionAPI = typeof window extends { SpeechRecognition: infer T }
  ? T
  : typeof window extends { webkitSpeechRecognition: infer T }
  ? T
  : never;

export type VoiceStatus = "unsupported" | "idle" | "recording" | "review" | "denied";

export function useVoiceRecorder(lang = "fr-FR") {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [interim, setInterim] = useState("");
  const [final, setFinal] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const Ctor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (ev: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      if (finalText) setFinal((prev) => prev + finalText);
      setInterim(interimText);
    };
    r.onend = () => {
      // Browser auto-stop or user stop → review
      setStatus((s) => (s === "recording" ? "review" : s));
    };
    r.onerror = (ev: any) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        setStatus("denied");
      } else {
        // network / no-speech / etc — stay in idle, surface via toast in caller
        setStatus("idle");
      }
    };
    recognitionRef.current = r;
    return () => {
      try { r.abort(); } catch {}
    };
  }, [lang]);

  return {
    status,
    interimTranscript: interim,
    finalTranscript: final,
    start: () => {
      setFinal("");
      setInterim("");
      try {
        recognitionRef.current?.start();
        setStatus("recording");
      } catch {
        // already started — ignore
      }
    },
    stop: () => {
      try { recognitionRef.current?.stop(); } catch {}
      setStatus("review");
    },
    reset: () => {
      setFinal("");
      setInterim("");
      setStatus("idle");
    },
  };
}
```

### Anti-Patterns to Avoid

- **DON'T pass the request's `db` session to the BackgroundTask.** Session is closed before the task runs → `DetachedInstanceError` or "operating on closed session". Always `SessionLocal()` inside the task.
- **DON'T call Gemini from the request handler.** Holds the HTTP socket open; defeats the whole BackgroundTask design. The handler returns the draft immediately; promotion is asynchronous.
- **DON'T set `interimResults: false`.** D-05 requires the rolling-transcript UX. False would only show after browser auto-stop.
- **DON'T forget to clear `promotion_error` before retrying.** D-09: "Resets `promotion_error = null` before re-queuing." Otherwise the row stays Échec until success commits.
- **DON'T overwrite `source_capture` during promotion.** Invariant 5: raw inputs forever. The promotion writes structured fields only.
- **DON'T broadcast `recipe.promoted` on failure.** Frontend toast says "ta recette est prête" — wrong signal on failure. Failure path is silent; Échec badge appears on next refetch (D-09).
- **DON'T ship voice features without resolving Q-01.** iOS PWA standalone mode silently drops `webkitSpeechRecognition` calls. Build will pass; voice features will look working in dev (Mac Safari) and in mobile Safari **as a tab** but fail in installed PWA mode.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON-mode LLM extraction | Custom prompt + regex parsing of free-text response | `response_mime_type='application/json' + response_schema` | SDK + Gemini guarantee schema conformance; hand-rolled parsers fail on locale-specific quote chars, partial JSON, hallucinated keys. [CITED: blog.google/.../gemini-api-structured-outputs] |
| Background promotion queue | DIY `asyncio.create_task(...)` from request handler | FastAPI `BackgroundTasks` | Already wired; integrates with response lifecycle; no custom error catch needed. CLAUDE.md invariant 1 names it. |
| WebSocket fan-out | Per-endpoint manual loop over connections | Existing `broadcast_to_household` | Already handles disconnect cleanup, per-socket error isolation, household-keyed routing. See `services/realtime.py`. |
| Multipart photo upload | Hand-rolled `aiofiles` + `aiohttp` | Reuse `services/storage.py::upload_recipe_photo` | Already does magic-byte MIME sniff (T-01-09-01), 8MB cap, server-generated paths (T-01-09-02), Supabase auth. |
| Voice recognition state machine | Multiple `useState` calls scattered across `VoiceCaptureTab` and `VoiceModifySheet` | Single `useVoiceRecorder` hook in `lib/voice.ts` | Three callsites (capture tab, modify sheet, future cooking-log notes) need identical machine. UI-SPEC §"Component Inventory" already names the hook. |
| Reconnecting WebSocket | New `ReconnectingWebSocket` instance | Already in `frontend/lib/ws.ts` via `partysocket` | Reuse `RealtimeProvider`. Phase 2 only needs `client.onEvent("recipe.promoted", handler)`. |
| Pydantic / TS enum mirroring | Manual sync | Existing `app/models/enums.py` ↔ `lib/enums.ts` | CLAUDE.md flags enum drift as a bug category. The `Literal[...]` types in `GeminiExtractedRecipe` should be derived from the existing enum lists, not duplicated. |

**Key insight:** Most of the hard parts of this phase are already built — household-scoped WS spine, photo multipart pipeline, Sonner toast pattern, Tabs primitive, draft inbox. The phase is mostly composition + adding the LLM service. The novel tech surface is `services/llm.py` (Gemini), `lib/voice.ts` (Web Speech), and the Alembic migration.

## Common Pitfalls

### Pitfall 1: Web Speech API silently fails in iOS PWA standalone mode

**What goes wrong:** User installs PWA via Safari → Add to Home Screen, opens it from the home screen icon (standalone mode), taps the mic — feature-detect succeeds (`webkitSpeechRecognition` constructor exists), `start()` is called, no error fires, but no `result` event ever arrives. Looks broken. Same code works perfectly in Safari browser tab.

**Why it happens:** WebKit's `SpeechRecognition` implementation does not deliver results when the page is launched in standalone display mode (`display: standalone` in manifest, or "Add to Home Screen"). This is a long-standing Apple bug going back to iOS 14.x and persisting through iOS 18 / Safari 26.x.

**How to avoid:**
1. Add a feature detect at the top of `useVoiceRecorder` for standalone mode: `window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone`.
2. If standalone + iOS user-agent detected, set `status: "unsupported"` and surface inline copy `"La dictée n'est pas disponible sur ce navigateur. Utilise un autre onglet pour ajouter la recette."` (UI-SPEC `recipes.voice.unsupported`).
3. **Or** implement the SPEC.md fallback: `MediaRecorder` capture → POST audio blob → Gemini audio multimodal → backend transcribes server-side. Different UX, different code path.

**Warning signs:** Voice tab works on desktop, on Mac Safari, on iOS Safari opened as a tab — fails ONLY when launched from the home-screen icon.

[VERIFIED via 4 independent WebSearch sources 2026-05-07: webreflection medium article, Apple Developer Forums thread 748048, magicbell.com PWA limitations 2026 guide, Apple Discussions thread 255492924]

**This is the BLOCKING risk for the phase. See §Open Questions Q-01.**

### Pitfall 2: BackgroundTask uses request's closed session

**What goes wrong:** `Depends(get_db)` yields a session; the route handler enqueues `background_tasks.add_task(promote, db, recipe_id)`; the response sends; the dependency teardown closes the session; the BackgroundTask runs and tries to `db.commit()` → "session is closed" or `DetachedInstanceError` on `recipe`.

**Why it happens:** FastAPI's request-scoped dependencies are torn down when the response is committed, BEFORE BackgroundTasks run. BackgroundTasks run on the same event loop after response — but the cleanup has already happened.

**How to avoid:** Open a fresh session inside the BackgroundTask body via `db = SessionLocal()` (importing from `app.db`). Never accept `db: Session` as an argument to a BackgroundTask function.

**Warning signs:** Promotion works in unit tests (sync, single-session) but fails in production with intermittent "InvalidRequestError: instance is not bound to a session".

### Pitfall 3: Inline image payload exceeds 20 MB

**What goes wrong:** User uploads 4 photos at the existing 8 MB cap = 32 MB. Inline-bytes Gemini call rejects request as "request size exceeded".

**Why it happens:** Gemini API total inline request limit is 20 MB (prompt + all image bytes). Existing `MAX_BYTES = 8 MiB` per photo on the upload side allows total >20 MB.

**How to avoid:**
1. Total-size guard in `extract_from_photos`: sum the bytes, if >18 MB, error out OR fall back to File API path.
2. Tighter per-photo cap for the photo-capture surface specifically (e.g. 4 MB) — but this differs from the existing `RECIPE-07` photo-attach flow's 8 MB cap. Plan should clarify.
3. v0.1 ships the inline-bytes path with an 18 MB total guard + clear error toast. Productize-later: switch to File API.

**Warning signs:** Promotion fails with HTTP 400 "request payload too large"; affects only multi-photo captures.

### Pitfall 4: `asyncio.run` from BackgroundTask collides with running loop

**What goes wrong:** If FastAPI's BackgroundTask runs in the event loop thread (which it does for `async def` BackgroundTasks), calling `asyncio.run(broadcast_to_household(...))` raises `RuntimeError: asyncio.run() cannot be called from a running event loop`.

**Why it happens:** `asyncio.run` creates a new loop; can't nest.

**How to avoid:** Two clean options:
- **Option A (recommended):** Make the BackgroundTask function `async def` and `await broadcast_to_household(...)` directly. FastAPI will run it in the running loop. Sync DB calls inside an async function are fine for couple-scale.
- **Option B:** Run the task in a thread executor: `await asyncio.get_event_loop().run_in_executor(None, sync_promote_fn, ...)` — but this complicates the pattern.

**Warning signs:** Promotion writes to DB but `recipe.promoted` event never fires; logs show RuntimeError.

### Pitfall 5: Retry endpoint re-uses BackgroundTasks param outside its request

**What goes wrong:** `POST /recipes/{id}/retry-promotion` needs to enqueue a new BackgroundTask. If the planner tries to call `promote_voice_draft` directly from the handler synchronously, the response blocks ~3-5s on Gemini. If they try to use a stored `BackgroundTasks` from another request, that's a misuse — `BackgroundTasks` is request-scoped.

**Why it happens:** Confusion about BackgroundTasks lifecycle.

**How to avoid:** The retry endpoint takes its own `background_tasks: BackgroundTasks` parameter (FastAPI injects a fresh one). Reads `recipe.source_capture`, dispatches to the correct promotion function based on `source_capture.type` (`voice` → `promote_voice_draft`, `photo` → `promote_photo_draft`), then `background_tasks.add_task(...)`. Returns the cleared draft (status='draft', `promotion_error=None`) immediately.

```python
@router.post("/{recipe_id}/retry-promotion", response_model=RecipeResponse)
async def retry_promotion(
    recipe_id: UUID,
    background_tasks: BackgroundTasks,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    recipe = db.scalar(select(Recipe).where(
        Recipe.id == recipe_id,
        Recipe.household_id == member.household_id,
    ))
    if recipe is None:
        raise HTTPException(404, "recipe not found")
    recipe.promotion_error = None
    db.commit()
    db.refresh(recipe)

    src_type = (recipe.source_capture or {}).get("type")
    payload = (recipe.source_capture or {}).get("payload") or {}
    if src_type == "voice":
        background_tasks.add_task(promote_voice_draft, recipe.id, payload.get("transcript", ""))
    elif src_type == "photo":
        # photo paths persisted; promote function re-fetches bytes from Supabase
        background_tasks.add_task(promote_photo_draft, recipe.id, recipe.photo_paths)
    else:
        raise HTTPException(400, "this draft type cannot be retried")
    return RecipeResponse.model_validate(recipe)
```

**Warning signs:** Retry button "spinner forever" — task never enqueued; or retry endpoint returns 200 but DB still shows `promotion_error` not cleared.

### Pitfall 6: Forgetting next-intl keys in `fr.json`

**What goes wrong:** Component renders `t('recipes.voice.idle_label')` but `fr.json` doesn't have it → next-intl logs warning, renders the key string literally on screen (`"recipes.voice.idle_label"` as visible text).

**Why it happens:** Many new keys (UI-SPEC §Copywriting Contract lists 20+) easy to miss.

**How to avoid:** Add all keys listed in UI-SPEC §"Copywriting Contract" to `fr.json` in one task BEFORE building any voice/photo/url tab UI. Acceptance test: grep components for `t('recipes.voice'` etc. and assert every match has a key in `fr.json`.

### Pitfall 7: Using deprecated `google-generativeai` import

**What goes wrong:** Following SPEC.md/STACK.md verbatim leads to `import google.generativeai as genai` — the legacy SDK, deprecated 2025-08-31 per Google.

**Why it happens:** Spec and codebase docs were written before the migration.

**How to avoid:** Use `from google import genai` (the unified `google-genai` package). Update SPEC.md / STACK.md docs as part of plan-1 of this phase OR add a `# TODO(productize)` note linking to the migration doc.

[VERIFIED: github.com/google-gemini/deprecated-generative-ai-python (repo named "deprecated"); ai.google.dev/gemini-api/docs/migrate]

## Code Examples

### Endpoint: `POST /recipes/voice`

```python
# backend/app/routers/recipes.py (extend)
# Source: existing recipes.py patterns + SPEC.md §"Capture pipeline"
from fastapi import BackgroundTasks
from app.services.llm import promote_voice_draft

class VoiceCaptureRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=20_000)


@router.post("/voice", response_model=RecipeResponse, status_code=201)
async def create_voice(
    body: VoiceCaptureRequest,
    background_tasks: BackgroundTasks,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """CAPTURE-01 — voice → draft → BackgroundTask Gemini promotion."""
    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title="(en cours d'analyse)",  # placeholder until promotion
        source_capture={"type": "voice", "payload": {"transcript": body.transcript}},
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
        promotion_attempts=0,
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    payload = RecipeResponse.model_validate(recipe).model_dump(mode="json")
    await broadcast_to_household(member.household_id, "recipe.created", payload)

    # Promotion runs after response — uses its own SessionLocal.
    background_tasks.add_task(promote_voice_draft, recipe.id, body.transcript)
    return RecipeResponse.model_validate(recipe)
```

### Broadcasting `recipe.promoted`

```python
# backend/app/services/realtime.py — NO CODE CHANGE NEEDED.
# The function accepts arbitrary event_type strings:
#     await broadcast_to_household(household_id, "recipe.promoted", payload)
# Just update the module docstring to add 'recipe.promoted' to the locked list.
```

### Frontend: handle `recipe.promoted` in RealtimeProvider

```tsx
// frontend/components/RealtimeProvider.tsx (extend)
// Source: existing onEvent pattern + Sonner toast pattern
import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

// inside RealtimeProvider, after `useEffect` for status handling:
useEffect(() => {
  if (!client) return;
  const off = client.onEvent<{ id: string; title: string }>(
    "recipe.promoted",
    (payload) => {
      toast.success(t("promotion.success_toast", { title: payload.title }));
      // Trigger refetch of the drafts inbox + recipe list. Pattern depends
      // on what state lib the app uses — for now, dispatch a custom DOM event
      // listened to by the inbox + list pages.
      window.dispatchEvent(new CustomEvent("aldente:recipe-promoted", { detail: payload }));
    },
  );
  return off;
}, [client, t]);
```

### Frontend: Voice tab idle/recording/review states

```tsx
// frontend/components/VoiceCaptureTab.tsx (new)
// Source: UI-SPEC §"Voice tab — surface pinning"
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useVoiceRecorder } from "@/lib/voice";
import type { Recipe } from "@/lib/recipes";

export function VoiceCaptureTab() {
  const router = useRouter();
  const t = useTranslations("recipes.voice");
  const tErr = useTranslations("onboarding.errors");
  const tCommon = useTranslations("common");
  const v = useVoiceRecorder("fr-FR");
  const [submitting, setSubmitting] = useState(false);
  const transcript = (v.finalTranscript + " " + v.interimTranscript).trim();

  if (v.status === "unsupported") {
    return <p className="px-6 pt-12 text-sm text-foreground-muted">{t("unsupported")}</p>;
  }
  if (v.status === "denied") {
    return <p className="px-6 pt-12 text-sm text-destructive">{t("permission_denied")}</p>;
  }

  async function send() {
    if (!v.finalTranscript.trim()) {
      toast.error(t("empty_transcript"));
      return;
    }
    setSubmitting(true);
    try {
      await api<Recipe>("/api/recipes/voice", {
        method: "POST",
        body: JSON.stringify({ transcript: v.finalTranscript.trim() }),
      });
      toast.success(t("submitted_toast"));
      router.replace("/inbox");
    } catch {
      toast.error(tErr("network"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-12 px-6">
      {(v.status === "idle" || v.status === "recording") && (
        <>
          <p className="text-sm text-foreground-muted text-center max-w-xs">
            {t("idle_helper")}
          </p>
          <button
            onClick={v.status === "recording" ? v.stop : v.start}
            aria-label={t(v.status === "recording" ? "stop_aria" : "start_aria")}
            className={
              v.status === "recording"
                ? "h-20 w-20 rounded-full bg-destructive text-background flex items-center justify-center motion-safe:animate-pulse"
                : "h-20 w-20 rounded-full bg-surface-muted text-foreground flex items-center justify-center"
            }
          >
            {v.status === "recording" ? <MicOff size={36} /> : <Mic size={36} />}
          </button>
          <p className="text-base font-medium">
            {t(v.status === "recording" ? "recording_label" : "idle_label")}
          </p>
        </>
      )}
      {(v.status === "recording" || v.status === "review") && (
        <div
          aria-live="polite"
          className="w-full min-h-32 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-muted p-4 text-base leading-6"
        >
          <span className="text-foreground">{v.finalTranscript}</span>
          <span className="text-foreground-muted italic">{v.interimTranscript}</span>
        </div>
      )}
      {v.status === "review" && (
        <div className="flex w-full gap-3">
          <Button
            variant="default"
            className="flex-1 h-11"
            disabled={submitting || !v.finalTranscript.trim()}
            onClick={send}
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tCommon("sending")}</>
            ) : t("send")}
          </Button>
          <Button variant="ghost" className="flex-1 h-11" onClick={v.reset}>
            {t("restart")}
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Alembic migration for `promotion_error` + `promotion_attempts`

```python
# backend/alembic/versions/0003_promotion_columns.py (new)
# Source: existing 0001_baseline.py / 0002_drop_pings.py patterns
"""promotion_error + promotion_attempts on recipes (CAPTURE-04 D-09)

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-XX
"""
from __future__ import annotations
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, Sequence[str], None] = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "recipes",
        sa.Column("promotion_error", sa.Text(), nullable=True),
    )
    op.add_column(
        "recipes",
        sa.Column(
            "promotion_attempts",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("recipes", "promotion_attempts")
    op.drop_column("recipes", "promotion_error")
```

**Migration runs automatically on Railway deploy** — `alembic upgrade head` is invoked before uvicorn restart per CLAUDE.md §"Deployment". No manual step required.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `google-generativeai` Python SDK (`import google.generativeai as genai`) | `google-genai` unified SDK (`from google import genai`) | Late 2024 with Gemini 2.0; deprecation date for Gemini API: 2025-08-31 | SPEC.md and STACK.md still reference the legacy name. Use the new SDK. [CITED: ai.google.dev/gemini-api/docs/migrate] |
| Free-text JSON parsing of LLM output | `response_mime_type='application/json'` + `response_schema=PydanticModel` | All Gemini 2.5 models support this with key-order preservation | Schema is enforced server-side; SDK auto-parses to `response.parsed`. [CITED: blog.google/.../gemini-api-structured-outputs] |
| Hold-to-record voice UX | Tap-to-start, tap-to-stop with live interim transcript | Modern voice UX (WhatsApp, iOS Voice Memos) | Locked by D-04..D-06; conventional now. |
| Web Speech API in PWA | Same — but iOS PWA standalone gap unresolved | Persistent since iOS 14.x | See Q-01. SPEC.md anticipated fallback. |

**Deprecated/outdated:**
- `google-generativeai` 0.8.6 (last release 2025-12-16) — legacy. Do not use.
- Pre-Gemini-2.5 structured output via tool/function calling — superseded by JSON Schema mode.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `gemini-2.5-flash` model name remains stable through Phase 2 dogfood window | Standard Stack | Low — Google has held the name across 2.5.x dot releases. If renamed, update one constant in `services/llm.py`. |
| A2 | The existing 8 MB photo cap × 4 photos may exceed Gemini's 20 MB inline limit | Pitfall 3 | Medium — math says yes (32 MB > 20 MB) but real-world iPhone photos compressed before upload may fall under. Plan should add a server-side total-size guard regardless. |
| A3 | A French-language Gemini prompt with French recipe transcripts will reliably extract the locked-vocabulary cuisine/protein values (e.g. `"middleEastern"`, not `"moyen-oriental"`) | Pattern 1 | Medium — Gemini is multilingual but enum values are camelCase English. The prompt must be explicit: "Use these exact values for cuisine: italian, french, asian, mediterranean, middleEastern, indian, mexican, northAfrican, american, other." Add this to the prompt template. SPEC.md §"Risks budgeted" already budgeted ~1.5x for prompt fragility. |
| A4 | The Bearer-fallback auth path (D-03 from Phase 01.1) does not need extension for the new endpoints — the existing `Depends(current_member)` covers them | Code Examples | Low — verified by reading `auth.py` 2026-05-07. |
| A5 | Frontend `VoiceCaptureTab` and `VoiceModifySheet` can both consume `useVoiceRecorder` without conflict (single SpeechRecognition instance per page is fine since only one is mounted at a time — capture tab is on `/recipes/new`, modify sheet is on `/recipes/[id]`) | Pattern 4 | Low — the `useEffect` cleanup aborts on unmount; module-level singleton not needed. |
| A6 | iOS Safari PWA standalone-mode SpeechRecognition limitation persists in iOS 26.x (current at research date 2026-05-07) | Pitfall 1 / Q-01 | **HIGH** — entire phase voice surface depends on this. WebSearch evidence is consistent but I could not directly verify against an iOS 26 device today. The SPEC.md fallback path (MediaRecorder + Gemini audio) was anticipated. |
| A7 | The unmodified existing `frontend/lib/ws.ts` `partysocket` client correctly delivers a new event type (`recipe.promoted`) without any changes — only the new `onEvent` registration in `RealtimeProvider` | Code Examples | Low — verified by reading `ws.ts` 2026-05-07: `onEvent` accepts arbitrary type strings via `Map<string, Set<handler>>`. |
| A8 | The promotion `BackgroundTask` should call `broadcast_to_household` AFTER the DB commit (not before) — otherwise the partner phone refetches and sees the still-`draft` row | Pattern 2 | Low — order in the example is correct (commit → refresh → broadcast). Plan task should explicitly call this out. |
| A9 | Voice-modify navigates with prefill via search-params (`?prefill=<base64>`) rather than a server-side prefill cache | UI-SPEC §"Voice-modify lifecycle" / Code Examples | Medium — search-params payload size limit (~2KB on iOS Safari) might be hit by ingredient/step lists. Alternative: short-lived in-memory store keyed by recipe-id, or session-storage. Plan should pick one. |

**This list is non-empty — confirm with discuss-phase or treat the locked decisions in CONTEXT.md as validation:** A2, A3, A6, A9 are the four with non-trivial planning impact. A6 is the BLOCKING one.

## Open Questions

### Q-01 (BLOCKING): Web Speech API in iOS PWA standalone mode

**What we know:**
- Multiple independent sources (4 confirmed via WebSearch 2026-05-07) state that `webkitSpeechRecognition` does NOT work in iOS Safari when launched from "Add to Home Screen" (standalone display mode). Works fine in Safari browser tab.
- Issue persists from iOS 14.x through iOS 18.x; no public Apple commitment to fix.
- SPEC.md §"Risks budgeted" anticipates: _"Web Speech API French quality — tested in browser before W2 starts. If unusable, fallback: send audio file to Gemini (multimodal supports audio) and skip Web Speech API."_ — This anticipates quality issues, but the standalone-mode silent failure is a different (and more severe) bug.

**What's unclear:**
- Has Apple shipped a fix in any iOS version that the user (Luca + partner) might be on? — needs an iOS 18+ device test, **today**.
- Does the user accept a degraded UX where voice surfaces require opening the app in Safari (not from home screen)?
- Is the fallback (MediaRecorder + Gemini audio multimodal) within Phase 2 scope, or does it become Phase 2.x?

**Recommendation:**
1. **Before any Phase 2 plan is drafted:** Run a 5-minute test on Luca's iPhone — open the deployed Phase 1 app in Safari, install to home screen, launch from icon, hit a `<button onClick={() => new webkitSpeechRecognition().start()}>` test page. Confirm whether `result` events fire.
2. **If test confirms breakage:** Bring the fallback decision to discuss-phase before plans are written. The choice is:
   - (a) Accept "voice features only in Safari tab" — Voice tab includes a `<p>` reminder to open in Safari if standalone. Cheap, ugly UX.
   - (b) MediaRecorder + Gemini audio fallback — adds 1 plan (`services/llm.py` audio path + `MediaRecorder` hook) but matches the rest of the PWA UX. Loses live-transcript (no interim results — server-side speech-to-text returns a single result).
   - (c) Defer voice surfaces to Phase 2.5 / productize-later — ship Photo + URL only this phase.
3. **If test passes** (Apple silently fixed it on the user's iOS version): proceed with current spec but add a runtime feature-detect that gracefully degrades to "open in Safari" copy on devices where it fails.

### Q-02: Voice-modify prefill payload — search-params or server-side cache?

**What we know:** UI-SPEC §"Voice-modify lifecycle" specifies `router.push(/recipes/{id}/edit?prefill=<encoded>)`. Edit form reads search-params and pre-fills.

**What's unclear:** Encoded payload size for a recipe with full ingredients + steps could exceed ~2KB iOS Safari URL limit.

**Recommendation:** Server-side return the modified recipe in the voice-modify response, store it in `sessionStorage` keyed by `voiceModify:${recipeId}`, navigate to `/recipes/{id}/edit?prefill=session`, and the edit page reads from sessionStorage on mount. Cleaner than URL-encoding 4KB of JSON. Planner makes the call.

### Q-03: Voice-modify endpoint — does it persist anything?

**What we know:** D-10..D-11 say "Backend calls Gemini with original recipe + voice instruction, returns the modified recipe" — does NOT say "persists." The user reviews in the edit form and saves manually.

**What's unclear:** Does the voice-modify endpoint return the modified-but-unsaved fields in the response body (and not write to DB), OR does it write a temporary draft, OR is the user's `PUT /recipes/{id}` the only persistence?

**Recommendation:** Voice-modify is **read-only** — it does NOT mutate the DB. Returns the Gemini-modified `RecipeResponse` shape (with the new fields) and the frontend uses the existing `PUT /recipes/{id}` (RECIPE-05) to persist via the edit form. This keeps the modify path simple and matches the UI-SPEC's "user reviews and saves" flow. Code:

```python
@router.post("/{recipe_id}/voice-modify", response_model=RecipeResponse)
async def voice_modify(
    recipe_id: UUID,
    body: VoiceModifyRequest,  # { transcript: str }
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    recipe = db.scalar(select(Recipe).where(
        Recipe.id == recipe_id, Recipe.household_id == member.household_id,
    ))
    if recipe is None:
        raise HTTPException(404)
    modified = apply_voice_modification(
        original=RecipeResponse.model_validate(recipe).model_dump(mode="json"),
        transcript=body.transcript,
    )
    # DO NOT save. Return the modified shape; FE persists via PUT.
    return RecipeResponse(
        **{**RecipeResponse.model_validate(recipe).model_dump(), **modified.model_dump()}
    )
```

### Q-04: Should the retry endpoint be rate-limited?

**What we know:** D-09 mentions `promotion_attempts` "for observability." Deferred section says retry cap is "not specified for v0.1; planner can add a simple guard but no hard requirement."

**What's unclear:** No hard requirement, but unbounded retries with a buggy prompt could burn API quota.

**Recommendation:** No rate limit in v0.1; log `promotion_attempts > 5` as a warning. Productize-later: lock the row at >3 attempts.

### Q-05: French prompt template lives where?

**What we know:** Multiple French strings are needed for Gemini prompts (extract from transcript, extract from photos, apply voice modification). They are not user-facing.

**What's unclear:** Should they live in `services/llm.py` as Python string constants, or in a separate `prompts/` directory for easier iteration?

**Recommendation:** Inline string constants at the top of `services/llm.py` for v0.1. Productize-later: extract to `services/prompts/{voice,photo,modify}.py` if prompt iteration becomes frequent. Keep them OUT of `frontend/lib/i18n/fr.json` — they are server-side prompts, not user copy.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `google-genai` Python SDK | All Gemini calls | ✗ (not yet in `backend/pyproject.toml`) | needs `>=1.75` | — install via `uv add google-genai>=1.75` |
| Gemini API key (`GEMINI_API_KEY` env var) | All Gemini calls | [ASSUMED] not yet set on Railway | n/a | User obtains free-tier API key from aistudio.google.com; sets in Railway dashboard |
| Supabase Storage `recipe-photos` bucket | Photo capture upload | ✓ — exists from Phase 1 | n/a | reuse existing |
| Web Speech API (`webkitSpeechRecognition`) | Voice tab + voice-modify + voice-input | ⚠ — see Q-01 | n/a in iOS PWA standalone | (a) "open in Safari" message; (b) MediaRecorder + Gemini audio; (c) defer voice |
| Browser microphone permission | Voice tab | ⚠ — user-grant required on first start | n/a | Inline "Microphone bloqué…" copy if denied (UI-SPEC) |
| Existing `partysocket` WS client | `recipe.promoted` event handling | ✓ — already in `frontend/lib/ws.ts` | partysocket 1.1.18 | reuse |
| Alembic | Migration | ✓ — already configured | 1.13+ | reuse pattern from 0001/0002 |

**Missing dependencies with no fallback:** None — all blockers have at least one workable path.

**Missing dependencies with fallback:**
- Web Speech API in standalone PWA mode → MediaRecorder + Gemini audio (SPEC.md anticipated). See Q-01.

**Missing dependencies needing install/config:**
- `google-genai` package — add to backend pyproject
- `GEMINI_API_KEY` env var on Railway — manual user action; document in plan-1 task acceptance

## Sources

### Primary (HIGH confidence)

- `SPEC.md` §"Capture pipeline" (read 2026-05-07) — five-surface contract, BackgroundTask pattern, voice-modify option A, voice-notes option C
- `SPEC.md` §"Stack" — `google-generativeai` (legacy — see migration); Web Speech API; FastAPI BackgroundTasks
- `SPEC.md` §"Risks budgeted" — anticipated Web Speech fallback to Gemini audio multimodal
- `SPEC.md` §"Data model" — recipes table schema (`source_capture` JSONB, `status` enum)
- `.planning/REQUIREMENTS.md` §"LLM-Assisted Capture (CAPTURE)" — CAPTURE-01..07 atomic acceptance
- `.planning/phases/02-llm-capture-w2/02-CONTEXT.md` — D-01..D-11 locked decisions
- `.planning/phases/02-llm-capture-w2/02-UI-SPEC.md` — exact CSS classes, component names, French strings
- `.planning/phases/01-foundations-w1/01-CONTEXT.md` — D-02 photo pipeline, D-04 colors, established patterns
- `.planning/phases/01.1-cookie-auth-and-recovery/01.1-CONTEXT.md` — D-03 dual-mode auth, D-04 `credentials: "include"`, `/api/...` paths
- `backend/app/routers/recipes.py` (read 2026-05-07) — POST/GET/PUT patterns to extend
- `backend/app/routers/photos.py` (read 2026-05-07) — multipart pattern + magic-byte sniff
- `backend/app/services/realtime.py` (read 2026-05-07) — `broadcast_to_household` accepts arbitrary event_type
- `backend/app/services/storage.py` (read 2026-05-07) — `upload_recipe_photo`, MAX_BYTES, mime detection
- `backend/app/auth.py` (read 2026-05-07) — `current_member` dual-mode (cookie + bearer)
- `backend/app/db.py` (read 2026-05-07) — `SessionLocal` factory for BackgroundTask sessions
- `backend/app/models/recipe.py` (read 2026-05-07) — column additions land here
- `backend/alembic/versions/0001_baseline.py` (read 2026-05-07) — migration style
- `frontend/components/RecipeDraftCard.tsx` (read 2026-05-07) — variants to extend
- `frontend/components/RealtimeProvider.tsx` (read 2026-05-07) — onEvent pattern
- `frontend/components/PhotoUploader.tsx` (read 2026-05-07) — reuse on Photo tab
- `frontend/app/recipes/new/page.tsx` (read 2026-05-07) — 2-tab structure to extend to 5
- `frontend/lib/ws.ts` (read 2026-05-07) — onEvent accepts arbitrary type strings
- `frontend/lib/api.ts` (read 2026-05-07) — `credentials: "include"` cookie auth wrapper
- `frontend/package.json` (read 2026-05-07) — Next.js 16.2.4, React 19.2.4, partysocket, sonner
- `backend/pyproject.toml` (read 2026-05-07) — uv-style dependencies
- `.planning/config.json` (read 2026-05-07) — `nyquist_validation: false`

### Secondary (MEDIUM confidence — official docs via WebSearch verification)

- [Google Gemini API — Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output) — `response_mime_type` + `response_schema` pattern
- [Google Gemini API — Migrate to the new SDK](https://ai.google.dev/gemini-api/docs/migrate) — `google-generativeai` deprecation 2025-08-31
- [Google Gemini API — Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding) — inline image bytes, 20 MB total request limit
- [Google announces JSON Schema support in Gemini API](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-structured-outputs/) — Pydantic / Zod integration, key-order preservation
- [google-genai PyPI](https://pypi.org/project/google-genai/) — version 1.75.0 verified 2026-05-04
- [google-generativeai PyPI](https://pypi.org/project/google-generativeai/) — legacy SDK, last release 0.8.6 on 2025-12-16
- [google-gemini/deprecated-generative-ai-python](https://github.com/google-gemini/deprecated-generative-ai-python) — repo renamed "deprecated"
- [FastAPI — Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/) — official docs on lifecycle
- [Pydantic Docs — Google models](https://ai.pydantic.dev/api/models/google/) — Pydantic+Gemini integration

### Tertiary (LOWER confidence — community sources, cross-verified)

- [PWA iOS Limitations and Safari Support 2026 — magicbell.com](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — confirms Web Speech API standalone-mode failure
- [Apple Developer Forums thread 748048](https://developer.apple.com/forums/thread/748048) — `webkitSpeechRecognition` PWA failure (could not directly fetch but referenced via WebSearch)
- [Taming the Web Speech API — Andrea Giammarchi (Medium)](https://webreflection.medium.com/taming-the-web-speech-api-ef64f5a245e1) — confirms PWA limitation
- [Apple Discussions thread 255492924](https://discussions.apple.com/thread/255492924) — Safari 17.1 SpeechRecognition issues
- [PWA on iOS — Brainhub library 2025](https://brainhub.eu/library/pwa-on-ios) — current iOS PWA status
- [Safe Threading with SQLAlchemy in FastAPI — dev.to](https://dev.to/derricktab/safe-threading-with-sqlalchemy-in-fastapi-4e9e) — `SessionLocal()` per task pattern
- [FastAPI sqlalchemy session per request handling — GitHub Discussion #10622](https://github.com/fastapi/fastapi/discussions/10622) — session lifecycle clarification
- [What PWA Can Do Today — Speech Recognition](https://whatpwacando.today/speech-recognition/) — feature-test page

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `google-genai` 1.75.0 verified PyPI 2026-05-04; legacy SDK deprecated; FastAPI BackgroundTasks documented in core docs.
- Architecture (BackgroundTask + SessionLocal pattern): HIGH — corroborated across multiple FastAPI/SQLAlchemy sources.
- Architecture (Gemini structured output): HIGH — official Google docs, Pydantic integration verified.
- Pitfalls: MEDIUM-HIGH — Pitfall 1 (iOS PWA Web Speech) confirmed by 4 independent sources but not directly tested on the user's iOS device today.
- Photo inline-bytes 20 MB limit: HIGH — official Gemini docs.
- Web Speech API in iOS PWA standalone (Q-01): MEDIUM — multiple consistent reports but no Apple official statement, and behavior could vary by iOS version.

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (30 days for stable areas: Gemini SDK, FastAPI patterns). Web Speech / iOS findings should be re-tested whenever iOS receives a major update.

---

*Phase: 02-llm-capture-w2*
*Research drafted: 2026-05-07*
*nyquist_validation: false in config.json — Validation Architecture section omitted per researcher protocol*
