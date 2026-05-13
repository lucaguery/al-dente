---
phase: 24
plan: 04
type: execute
wave: 2
depends_on: [24-03]
files_modified:
  - backend/app/services/llm.py
  - backend/app/services/llm_fixtures.py
  - backend/app/routers/recipes.py
  - CLAUDE.md
autonomous: true
requirements: [RID-04]
requirements_addressed: [RID-04]
tags: [backend, llm, background-task, gemini, fastapi, invariants, claude-md]

must_haves:
  truths:
    - "services/llm.py exports a new rewrite_title(original_title, recipe_context) -> str helper that calls Gemini in plain-text mode (response.text, no schema)"
    - "services/llm.py exports new promote_quick_draft(recipe_id) and promote_full_draft(recipe_id) BackgroundTask bodies mirroring the promote_voice_draft template"
    - "services/llm.py exports a new _record_rewrite_failure(db, recipe, exc) helper that sets status='structured' (NOT 'failed'), sets promotion_error, and broadcasts recipe.promoted"
    - "POST /recipes (create_full) stamps status='draft', queues promote_full_draft via BackgroundTasks, and still broadcasts recipe.created synchronously at the router"
    - "POST /recipes/quick (create_quick) was already status='draft' — it now ALSO queues promote_quick_draft via BackgroundTasks"
    - "Voice/photo extract prompts (_EXTRACT_PROMPT_VOICE, _EXTRACT_PROMPT_PHOTOS) gain a catchy-title clause; voice/photo failure path stays status='failed' (whole extract failed, not just rewrite)"
    - "Rewrite runs ONCE on first promotion only; subsequent PUT /recipes/{id} writes the user title verbatim; only the retry endpoint re-runs rewrite (D-28)"
    - "services/llm.py rewrite_title respects the test-mode shortcut via canned_rewritten_title fixture so Playwright suites remain deterministic"
    - "CLAUDE.md invariant #1 wording gains a parenthetical clarification noting quick/full-form were synchronous pre-Phase-24 and became BackgroundTask-based in v0.5 RID-04 (D-30) — ships in the SAME atomic commit per D-04"
    - "Architecture invariant #4 holds — recipe.created still broadcasts sync at the router; recipe.promoted broadcasts from the BackgroundTask on success (D-31)"
    - "source_capture.payload.title preserves the user's original title forever per invariant #5 — only recipe.title is overwritten by rewrite"
  artifacts:
    - path: "backend/app/services/llm.py"
      provides: "rewrite_title() + promote_quick_draft() + promote_full_draft() + _record_rewrite_failure(); voice/photo extract prompts extended with catchy-title clause"
      contains: "def rewrite_title"
    - path: "backend/app/services/llm_fixtures.py"
      provides: "canned_rewritten_title(original_title) for test-mode determinism"
      contains: "canned_rewritten_title"
    - path: "backend/app/routers/recipes.py"
      provides: "create_full and create_quick gain BackgroundTasks dependency + queue the new tasks; create_full now stamps status='draft' instead of 'structured'"
      contains: "promote_full_draft"
    - path: "CLAUDE.md"
      provides: "Invariant #1 parenthetical clarification documenting the v0.5 RID-04 shift"
      contains: "Phase 24"
  key_links:
    - from: "backend/app/routers/recipes.py create_full / create_quick"
      to: "backend/app/services/llm.py promote_full_draft / promote_quick_draft"
      via: "background_tasks.add_task(promote_*_draft, recipe.id)"
      pattern: "background_tasks\\.add_task\\(promote_(full|quick)_draft, recipe\\.id\\)"
    - from: "backend/app/services/llm.py promote_quick_draft / promote_full_draft"
      to: "rewrite_title() + _broadcast_promoted() + _record_rewrite_failure()"
      via: "BackgroundTask body opens SessionLocal, calls rewrite_title, sets status='structured', broadcasts recipe.promoted"
      pattern: "rewrite_title|_broadcast_promoted|_record_rewrite_failure"
    - from: "CLAUDE.md invariant #1"
      to: "this RID-04 plan"
      via: "parenthetical clarification ships in same atomic commit"
      pattern: "Phase 24|RID-04"
---

<objective>
Phase 24 / RID-04 — LLM title rewrite + invariant #1 shift. Add `rewrite_title()` helper in `services/llm.py`, move `POST /recipes` (full-form) AND `POST /recipes/quick` (quick) into async BackgroundTask shape, define new `promote_quick_draft` / `promote_full_draft` BackgroundTask bodies that call `rewrite_title()` + flip `status='structured'` + broadcast `recipe.promoted`, define `_record_rewrite_failure` helper that preserves `status='structured'` on rewrite failure (NOT `'failed'`), and extend voice/photo extract prompts with a catchy-title clause. Update `CLAUDE.md` invariant #1 in the SAME atomic commit per D-04.

Purpose: Give every captured recipe a catchy French title regardless of capture surface (quick / full-form / voice / photo). The shift completes the v0.5 milestone-locked decision: quick/full-form move from sync `structured`-on-return to async BackgroundTask rewrite. Closes gh#10.

Output: 3 modified Python files (llm.py + llm_fixtures.py + recipes.py router) + 1 docs file (CLAUDE.md), all in one atomic commit.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/24-recipe-identity/24-CONTEXT.md
@.planning/phases/24-recipe-identity/24-RESEARCH.md
@CLAUDE.md
@backend/app/services/llm.py
@backend/app/services/llm_fixtures.py
@backend/app/routers/recipes.py
@backend/app/schemas/recipe.py
@backend/app/services/realtime.py
</context>

<interfaces>
<!-- Key types and primitives the executor needs. Extracted from codebase. No exploration required. -->

From `backend/app/services/llm.py:368-393` (promote_voice_draft — STRUCTURAL TEMPLATE for the two new tasks):
```python
def promote_voice_draft(recipe_id: UUID, transcript: str) -> None:
    db = SessionLocal()
    try:
        recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
        if recipe is None:
            log.warning("promote_voice: recipe %s vanished", recipe_id)
            return
        try:
            extracted = extract_from_transcript(transcript)
            _apply_extracted(recipe, extracted)
            recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
            db.commit()
            db.refresh(recipe)
            _broadcast_promoted(recipe)
        except Exception as exc:  # noqa: BLE001 — must never raise out of task
            _record_failure(db, recipe, exc)
    finally:
        db.close()
```

From `backend/app/services/llm.py:340-360` (_record_failure — TEMPLATE for `_record_rewrite_failure` but the new helper sets status='structured' not 'failed'):
```python
def _record_failure(db: Session, recipe: Recipe, exc: Exception) -> None:
    log.exception("promotion failed recipe=%s", recipe.id)
    recipe.status = "failed"                            # <-- the difference: 'structured' in _record_rewrite_failure
    recipe.promotion_error = str(exc)[:500]
    recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
    db.commit()
```

From `backend/app/services/llm.py:200-203` (test-mode shortcut pattern):
```python
if settings.environment == "test":
    from app.services.llm_fixtures import canned_voice_recipe
    return canned_voice_recipe(transcript)
```

From `backend/app/services/llm.py:328-337` (_broadcast_promoted — reusable):
```python
def _broadcast_promoted(recipe: Recipe) -> None:
    payload = RecipeResponse.model_validate(recipe).model_dump(mode="json")
    asyncio.run(broadcast_to_household(recipe.household_id, "recipe.promoted", payload))
```

From `backend/app/routers/recipes.py:130-200` — create_full + create_quick:

```python
@router.post("", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
async def create_full(
    body: RecipeFullCreate,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    recipe = Recipe(
        household_id=member.household_id,
        # ...
        status="structured",   # <-- CHANGE TO "draft" + queue BackgroundTask
        title=body.title,
        source_capture={"type": "manual", "payload": body.model_dump(mode="json")},
        # ...
    )
    db.add(recipe); db.commit(); db.refresh(recipe)
    payload = _to_response_payload(recipe)
    await broadcast_to_household(member.household_id, "recipe.created", payload)
    return RecipeResponse.model_validate(recipe)


@router.post("/quick", ...)
async def create_quick(
    body: RecipeQuickCreate,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    recipe = Recipe(
        household_id=member.household_id,
        # ...
        status="draft",     # <-- ALREADY DRAFT; just add BackgroundTask queue
        title=body.title,
        source_capture={"type": "manual", "payload": body.model_dump()},
        # ...
    )
    # ...
```

From `backend/app/services/llm.py:167-177` (extract prompts — extended in 24-02 Task 5; this plan APPENDS a catchy-title clause):
```python
# After 24-02 Task 5:
_EXTRACT_PROMPT_VOICE = (
    "Extrais les champs structurés de cette recette dictée en français. "
    "Renvoie null pour les champs absents — n'invente rien. Ne mets que des "
    "valeurs des vocabulaires verrouillés pour cuisine, mood, main_protein, "
    "seasonality. Extrais aussi cook_time_minutes (en minutes), difficulty "
    "('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette)."
)
```

After RID-04 Task 4 below, each prompt gains the catchy-title sentence:
```python
# Phase 24 RID-04 D-27 — catchy-title clause appended to extract prompts.
_EXTRACT_PROMPT_VOICE = (
    "..."  # existing 24-02 content
    " Le champ title doit être une formule courte et accrocheuse en français "
    "(max 60 caractères, sans guillemets, sans liste d'ingrédients)."
)
```

CLAUDE.md current invariant #1 wording (the parenthetical clarification target):
```
**Five capture surfaces, one shape.** `quick`, full-form, `voice`, `photo`, `url` all `POST /recipes/<surface>`, all return a `draft` immediately, all promotion runs **server-side** in a FastAPI `BackgroundTask`. Never promote drafts client-side. WebSocket broadcasts when status flips to `structured`.
```

After RID-04 (D-30 — adds a parenthetical clarification noting the v0.5 shift):
```
**Five capture surfaces, one shape.** `quick`, full-form, `voice`, `photo`, `url` all `POST /recipes/<surface>`, all return a `draft` immediately, all promotion runs **server-side** in a FastAPI `BackgroundTask` (quick and full-form moved from sync to BackgroundTask in v0.5 RID-04 — see Phase 24). Never promote drafts client-side. WebSocket broadcasts when status flips to `structured`.
```

**Wave 2 ordering note:** This plan depends on 24-03 (no functional dep; 24-03 finishes Wave 2 plan 1 before this Wave 2 plan 2). The serial order is load-bearing because BOTH plans touch `services/llm.py` and `_apply_extracted`. RID-04 ships AFTER RID-03 so the conflict surface stays minimal.

The retry endpoint (`POST /recipes/{id}/retry-promotion` at `recipes.py:568-626`) currently calls `retry_promotion(recipe_id)` in services/llm.py, which dispatches based on `source_capture.type` ∈ {voice, photo} and falls through with `_record_failure` for `manual` / `url` / unknown. **RID-04 must extend `retry_promotion` to dispatch `manual` → `promote_quick_draft` or `promote_full_draft`** so users can retry a failed catchy-title rewrite (per D-28 — the retry endpoint is the only way to re-run rewrite after the first promotion).
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add rewrite_title() helper + canned_rewritten_title fixture (RID-04 / D-25)</name>
  <files>backend/app/services/llm.py, backend/app/services/llm_fixtures.py</files>
  <read_first>
    - backend/app/services/llm.py lines 100-300 (imports, GenerateContentConfig usage, _GEMINI_MODEL, test-mode shortcut pattern)
    - backend/app/services/llm_fixtures.py (current shape — verify canned_voice_recipe / canned_photo_recipe pattern)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-25
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Pattern 2: rewrite_title() — plain-text Gemini call"
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Pitfall 4: response.parsed on plain-text Gemini call"
  </read_first>
  <action>
    Two sub-edits.

    SUB-EDIT 1A — Add `rewrite_title()` helper in `backend/app/services/llm.py`. Place it AFTER `apply_voice_modification()` (which ends around line 289) and BEFORE the "Helpers used by the BackgroundTask bodies" section header (around line 291-294). The helper is a standalone Gemini call function (no DB, no broadcast) following the same shape as `extract_from_transcript` / `extract_from_photos` / `apply_voice_modification`.

    Concrete shape:

    ```python
    # ---------------------------------------------------------------------------
    # Phase 24 RID-04 — title rewrite (D-25)
    # ---------------------------------------------------------------------------

    # Plain-text prompt — no JSON schema. Gemini returns the rewritten title
    # as bare text via response.text. Prompt verbatim from gh#10 / D-25.
    _REWRITE_TITLE_PROMPT = (
        "Réécris ce titre de recette pour qu'il soit court et accrocheur en "
        "français. Pas plus de 60 caractères. Ne mets pas la liste des ingrédients "
        "dans le titre. Renvoie UNIQUEMENT le nouveau titre, sans guillemets, "
        "sans préfixe."
    )


    def rewrite_title(original_title: str, recipe_context: dict[str, Any]) -> str:
        """Phase 24 RID-04 — rewrite a recipe title into a catchy French phrasing.

        Returns a stripped, length-capped (≤60 char) plain-text string.
        Raises ValueError on empty Gemini output; raises whatever google-genai
        raises on API errors. Callers (promote_quick_draft / promote_full_draft)
        wrap this in try/except and route failures through _record_rewrite_failure.

        recipe_context is reserved for future enrichment (e.g., passing
        cuisine/main_protein so Gemini can tailor the rewrite). v1: not used
        in the prompt — the title alone suffices.
        """

        # D-04 test-mode shortcut: deterministic output for Playwright fixtures.
        if settings.environment == "test":
            from app.services.llm_fixtures import canned_rewritten_title
            return canned_rewritten_title(original_title)

        # Plain-text call — no response_schema, no response_mime_type.
        # response.text is the bare-text accessor (RESEARCH.md §Pattern 2 +
        # google-genai SDK models.py:6258-6263). Do NOT use response.parsed —
        # it's None for plain-text calls (RESEARCH.md §Pitfall 4).
        response = _gemini().models.generate_content(
            model=_GEMINI_MODEL,
            contents=[_REWRITE_TITLE_PROMPT, original_title],
        )
        result = (response.text or "").strip()
        if not result:
            raise ValueError("Gemini returned empty title rewrite")
        # Strip newlines defensively in case Gemini violates "sans préfixe" with
        # a multi-line response. Length cap matches the prompt instruction (60).
        result = result.replace("\n", " ").strip()
        return result[:60]
    ```

    Specifically:
    - `Any` is needed for `recipe_context: dict[str, Any]` — verify it's already imported at the top of the file (the `apply_voice_modification` function uses `dict[str, Any]` so the import should already exist; otherwise add `from typing import Any` to the import block).
    - The function signature exactly matches D-25.
    - Test-mode shortcut runs FIRST so test fixtures bypass the real Gemini call entirely.
    - The Gemini call uses NO `config` argument — bare-text mode (RESEARCH.md §Pattern 2; verified against google-genai SDK source).
    - Output is `.strip()`ed, newline-replaced, and `[:60]`-capped (mitigates prompt-injection blast-radius per threat model T-24-04-04).
    - The function does NOT touch the DB — pure Gemini call. Callers persist the result.

    SUB-EDIT 1B — Add `canned_rewritten_title` to `backend/app/services/llm_fixtures.py`. Append after the existing canned functions:

    ```python
    # Phase 24 RID-04 D-25 — deterministic catchy-title rewrite for test mode.
    # Returned by services/llm.rewrite_title when settings.environment == "test".
    # Suffixed "(test)" so Playwright assertions can target the rewritten value
    # explicitly (and so a missed test-mode switch is visible in logs).
    def canned_rewritten_title(original_title: str) -> str:
        """Deterministic rewrite for test mode (RID-04).

        Returns a fixed catchy phrasing suffixed '(test)'. We deliberately don't
        derive from the input so the assertion targets are stable.
        """
        # Phase 16 D-16-13 echo: support __TEST_FORCE_FAIL__ prefix on the
        # original title to force a rewrite failure path (matches the voice
        # fixture's force-fail behavior at canned_voice_recipe).
        if original_title.startswith("__TEST_FORCE_FAIL__"):
            raise RuntimeError(
                "Rewrite forcée à échouer pour les tests (RID-04 D-26). "
                "Le préfixe __TEST_FORCE_FAIL__ active ce chemin."
            )
        return "Délices maison (test)"
    ```

    Specifically:
    - The function lives in `llm_fixtures.py` alongside the existing canned functions.
    - The forced-failure path uses the SAME `__TEST_FORCE_FAIL__` prefix as `canned_voice_recipe` (consistency with the existing test pattern).
    - The returned string is intentionally short (~20 chars), well within the 60-char cap.
    - Do NOT change any existing canned_* function in the file.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -c "def rewrite_title" app/services/llm.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "def rewrite_title(original_title: str, recipe_context: dict\\[str, Any\\]) -> str" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "_REWRITE_TITLE_PROMPT" app/services/llm.py` returns at least `2` (defn + usage).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "Réécris ce titre de recette" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "response.text" app/services/llm.py` returns at least `1` (the new helper uses it).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "response.parsed" app/services/llm.py | xargs -I {} test {} -ge 3 && echo OK` prints OK (existing 3 uses preserved — the new function does NOT use response.parsed; RESEARCH §Pitfall 4).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "result\\[:60\\]" app/services/llm.py` returns `1` (length cap).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "def canned_rewritten_title" app/services/llm_fixtures.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "Délices maison (test)" app/services/llm_fixtures.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "__TEST_FORCE_FAIL__" app/services/llm_fixtures.py` returns at least `2` (existing voice + new rewrite).
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "import os; os.environ['ENVIRONMENT']='test'; from app.services.llm import rewrite_title; assert rewrite_title('Risotto', {}) == 'Délices maison (test)'"` exits 0 (deterministic test output).
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "import os; os.environ['ENVIRONMENT']='test'; from app.services.llm import rewrite_title; import pytest; pytest.raises(RuntimeError, lambda: rewrite_title('__TEST_FORCE_FAIL__ x', {}))" exits 0 (force-fail path works).
  </acceptance_criteria>
  <done>
    `services/llm.py` exports `rewrite_title()` (plain-text Gemini call, test-mode shortcut, length-capped output) and `_REWRITE_TITLE_PROMPT`. `llm_fixtures.py` exports `canned_rewritten_title` (deterministic + force-fail prefix). Test-mode roundtrip works.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add _record_rewrite_failure helper (RID-04 / D-26)</name>
  <files>backend/app/services/llm.py</files>
  <read_first>
    - backend/app/services/llm.py lines 340-360 (_record_failure — TEMPLATE)
    - backend/app/services/llm.py lines 328-337 (_broadcast_promoted — referenced by the new helper)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-26
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Example 1: _record_rewrite_failure"
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Pitfall 6: status='failed' in _record_rewrite_failure"
  </read_first>
  <action>
    Add `_record_rewrite_failure` helper to `backend/app/services/llm.py`. Place it IMMEDIATELY AFTER `_record_failure` (around line 360) and BEFORE the `# BackgroundTask bodies` section header (around line 362). The helper differs from `_record_failure` in two load-bearing ways:
    1. Sets `status='structured'` (NOT `'failed'`) — the recipe has all its content; only the title rewrite step failed.
    2. Broadcasts `recipe.promoted` (because the recipe IS promoted; only the rewrite polish step failed).

    Concrete shape (RESEARCH.md §Example 1):

    ```python
    def _record_rewrite_failure(db: Session, recipe: Recipe, exc: Exception) -> None:
        """Phase 24 RID-04 / D-26 — record a title-rewrite failure WITHOUT failing the row.

        Unlike _record_failure (which sets status='failed' for voice/photo extract
        failures), this sets status='structured' because quick/full-form captures
        have all their content — only the LLM title polish step failed. The
        promotion_error column carries context so the retry endpoint can re-run
        rewrite if the user wants a fresh attempt (D-28).

        The recipe IS promoted (the user has a usable, structured recipe), so we
        still broadcast recipe.promoted. The frontend's RecipeDraftCard / inbox
        treats status='structured' rows as done; promotion_error appears as
        Échec context only when status='failed'.
        """

        log.warning("rewrite failed recipe=%s: %s", recipe.id, exc)
        recipe.status = "structured"  # KEY DIFFERENCE from _record_failure
        recipe.promotion_error = str(exc)[:500]
        recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
        db.commit()
        # Still broadcast recipe.promoted — the recipe IS promoted, just without a catchy title.
        db.refresh(recipe)
        _broadcast_promoted(recipe)
    ```

    Specifically:
    - The function lives ADJACENT to `_record_failure` for proximity (reviewers can compare side-by-side).
    - The 500-char truncation matches `_record_failure`'s existing PII-redaction posture (T-02-01-02 mitigation preserved per CONTEXT.md threat-model entry).
    - The `_broadcast_promoted(recipe)` call MUST come AFTER `db.refresh(recipe)` so the payload reflects the just-committed state.
    - The function uses `log.warning` (NOT `log.exception`) — rewrite failures are expected occasionally (Gemini API hiccups) and don't need stacktrace noise. _record_failure uses `log.exception` for voice/photo because those failures are catastrophic (the user loses the recipe entirely without retry).
    - Do NOT modify `_record_failure` or `_broadcast_promoted`. They're shared by voice/photo (which keep the old failure semantics) and the new helper.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -c "def _record_rewrite_failure" app/services/llm.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "def _record_rewrite_failure(db: Session, recipe: Recipe, exc: Exception) -> None:" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "recipe.status = \"structured\"" app/services/llm.py` returns at least `2` (existing _apply_extracted + new _record_rewrite_failure).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "_broadcast_promoted(recipe)" app/services/llm.py` returns at least `2` (existing voice/photo promote BackgroundTasks already broadcast).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "log.warning(\"rewrite failed" app/services/llm.py` returns `1`.
    - `_record_failure` is BYTE-IDENTICAL to before — verifiable via `cd /Users/gulu3001/dev/al-dente/backend && grep -A 6 "def _record_failure" app/services/llm.py | grep -c "recipe.status = \"failed\""` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.services.llm import _record_rewrite_failure; print('OK')"` exits 0.
  </acceptance_criteria>
  <done>
    `services/llm.py` exports `_record_rewrite_failure(db, recipe, exc)` — sets status='structured', sets promotion_error, increments attempts, commits, refreshes, broadcasts recipe.promoted. `_record_failure` is unchanged.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Add promote_quick_draft and promote_full_draft BackgroundTask bodies (RID-04 / D-24, D-29)</name>
  <files>backend/app/services/llm.py</files>
  <read_first>
    - backend/app/services/llm.py lines 368-418 (promote_voice_draft + promote_photo_draft — STRUCTURAL TEMPLATE)
    - backend/app/services/llm.py from Task 1+2 (rewrite_title, _record_rewrite_failure, _broadcast_promoted — the dependencies for the new tasks)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-24, §D-26, §D-29, §D-31
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Pattern 1: BackgroundTask body" (the canonical shape)
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Pitfall 3: Using request session in BackgroundTask"
  </read_first>
  <action>
    Add TWO new BackgroundTask bodies in `backend/app/services/llm.py`: `promote_quick_draft(recipe_id)` and `promote_full_draft(recipe_id)`. Place them IMMEDIATELY AFTER `promote_photo_draft` (which ends around line 418) and BEFORE `retry_promotion` (around line 421).

    The two new bodies are STRUCTURALLY IDENTICAL — both wrap a `rewrite_title()` call in the standard BackgroundTask shape. They differ only in name (so the retry endpoint can dispatch based on source_capture.type). The body shape:

    ```python
    def promote_quick_draft(recipe_id: UUID) -> None:
        """Phase 24 RID-04 — BackgroundTask body for POST /recipes/quick.

        Opens its own SessionLocal() (RESEARCH §Pitfall 3 — the request session
        is closed by the time this runs). NEVER raises — exceptions route through
        _record_rewrite_failure which preserves status='structured' (D-26).

        D-31: recipe.created was ALREADY broadcast by the router synchronously
        before this task ran; we broadcast recipe.promoted on success (and on
        the rewrite-only-failure path too, since the recipe IS structured).
        D-29: race policy — if the user edits the title between draft response
        and this task's commit, the BackgroundTask wins (silent overwrite).
        """

        db = SessionLocal()
        try:
            recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
            if recipe is None:
                log.warning("promote_quick: recipe %s vanished", recipe_id)
                return
            try:
                # rewrite_title takes original title + future recipe context.
                # source_capture.payload.title preserves the user's input forever
                # (invariant #5); we only overwrite recipe.title.
                new_title = rewrite_title(recipe.title, {})
                recipe.title = new_title  # rewrite_title already caps at 60 chars.
                recipe.status = "structured"
                recipe.promotion_error = None
                recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
                db.commit()
                db.refresh(recipe)
                _broadcast_promoted(recipe)
            except Exception as exc:  # noqa: BLE001 — must never raise out of task
                # D-26: rewrite-only failure keeps status='structured' (the user
                # has a usable recipe; only the polish step failed). Retry
                # endpoint can re-run rewrite via promotion_error.
                _record_rewrite_failure(db, recipe, exc)
        finally:
            db.close()


    def promote_full_draft(recipe_id: UUID) -> None:
        """Phase 24 RID-04 — BackgroundTask body for POST /recipes (full-form).

        Structurally identical to promote_quick_draft. Separated by name so
        retry_promotion can dispatch based on source_capture.type and route the
        retry into the appropriate BackgroundTask. In v0.5 RID-04 the two bodies
        do the same work; future phases may differentiate (e.g., a full-form
        recipe with ingredients/steps could feed richer context to rewrite_title).
        """

        db = SessionLocal()
        try:
            recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
            if recipe is None:
                log.warning("promote_full: recipe %s vanished", recipe_id)
                return
            try:
                new_title = rewrite_title(recipe.title, {})
                recipe.title = new_title
                recipe.status = "structured"
                recipe.promotion_error = None
                recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
                db.commit()
                db.refresh(recipe)
                _broadcast_promoted(recipe)
            except Exception as exc:  # noqa: BLE001
                _record_rewrite_failure(db, recipe, exc)
        finally:
            db.close()
    ```

    Specifically:
    - Both functions take ONLY `recipe_id: UUID` — they re-read the recipe from the DB (the row already has all user-entered fields populated by the router; the BackgroundTask only needs the id).
    - Both functions wrap `rewrite_title()` in try/except. Success → status='structured' + recipe.promoted broadcast. Failure → `_record_rewrite_failure` (which itself broadcasts recipe.promoted because the recipe IS structured per D-26).
    - The `recipe.promotion_error = None` line on the success branch ensures any prior failed-rewrite error is cleared on a successful retry.
    - The `promotion_attempts` increment happens on BOTH success and failure paths (`_record_rewrite_failure` also increments it).
    - Do NOT modify `promote_voice_draft`, `promote_photo_draft`, `retry_promotion`, or the helpers from Tasks 1-2.
    - Critical: do NOT call `extract_from_transcript` or `extract_from_photos` from these bodies — they're for voice/photo only. Quick and full-form already have structured data; they just need the title rewrite.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -cE "def promote_quick_draft|def promote_full_draft" app/services/llm.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "def promote_quick_draft(recipe_id: UUID) -> None:" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "def promote_full_draft(recipe_id: UUID) -> None:" app/services/llm.py` returns `1`.
    - Both functions open their own SessionLocal: `cd /Users/gulu3001/dev/al-dente/backend && grep -c "db = SessionLocal()" app/services/llm.py` returns at least `5` (existing 3 promote_* + retry_promotion + 2 new).
    - Both functions call `rewrite_title(recipe.title, {})`: `cd /Users/gulu3001/dev/al-dente/backend && grep -c "rewrite_title(recipe.title, {})" app/services/llm.py` returns `2`.
    - Both functions route failures to `_record_rewrite_failure`: `cd /Users/gulu3001/dev/al-dente/backend && grep -c "_record_rewrite_failure(db, recipe, exc)" app/services/llm.py` returns `2`.
    - Both functions broadcast `recipe.promoted` on success via `_broadcast_promoted`: `cd /Users/gulu3001/dev/al-dente/backend && grep -c "_broadcast_promoted(recipe)" app/services/llm.py` returns at least `4` (voice + photo + 2 new — note: the `_record_rewrite_failure` helper also calls it, so total can be 5+).
    - Existing `promote_voice_draft` and `promote_photo_draft` are unchanged: `cd /Users/gulu3001/dev/al-dente/backend && grep -c "extract_from_transcript\\|extract_from_photos" app/services/llm.py` returns the same count as before the edit (no new callers of the extract functions).
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.services.llm import promote_quick_draft, promote_full_draft; print('OK')"` exits 0.
  </acceptance_criteria>
  <done>
    `services/llm.py` exports `promote_quick_draft(recipe_id)` and `promote_full_draft(recipe_id)`. Both call `rewrite_title()`, set status='structured' on success, route rewrite failures to `_record_rewrite_failure`, and broadcast `recipe.promoted` (on both success and rewrite-failure paths). Voice/photo BackgroundTasks unchanged.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Extend voice/photo extract prompts with catchy-title clause + extend retry_promotion to dispatch manual sources (RID-04 / D-27, D-28)</name>
  <files>backend/app/services/llm.py</files>
  <read_first>
    - backend/app/services/llm.py lines 167-177 (_EXTRACT_PROMPT_VOICE, _EXTRACT_PROMPT_PHOTOS — extended in 24-02 Task 5; this task appends an additional clause)
    - backend/app/services/llm.py lines 421-475 (retry_promotion — currently dispatches voice/photo only; manual/url currently fall through to _record_failure)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-27, §D-28
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Target 4: Gemini Structured-Output Catchy Title"
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Open Question 2: Retry endpoint path"
  </read_first>
  <action>
    Two sub-edits.

    SUB-EDIT 4A — Append the catchy-title clause to `_EXTRACT_PROMPT_VOICE` AND `_EXTRACT_PROMPT_PHOTOS`. Per D-27, no separate `rewrite_title()` round-trip is made for voice/photo — the title clause lives in the existing extract call.

    After 24-02 Task 5, the prompts read (extended with the 24-02 catchy-fields clause). RID-04 appends a TITLE-SPECIFIC clause:

    Current state (post-24-02 Task 5):
    ```python
    _EXTRACT_PROMPT_VOICE = (
        "Extrais les champs structurés de cette recette dictée en français. "
        "Renvoie null pour les champs absents — n'invente rien. Ne mets que des "
        "valeurs des vocabulaires verrouillés pour cuisine, mood, main_protein, "
        "seasonality. Extrais aussi cook_time_minutes (en minutes), difficulty "
        "('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette)."
    )
    ```

    New state (RID-04 appends):
    ```python
    _EXTRACT_PROMPT_VOICE = (
        "Extrais les champs structurés de cette recette dictée en français. "
        "Renvoie null pour les champs absents — n'invente rien. Ne mets que des "
        "valeurs des vocabulaires verrouillés pour cuisine, mood, main_protein, "
        "seasonality. Extrais aussi cook_time_minutes (en minutes), difficulty "
        "('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette). "
        "Le champ title doit être une formule courte et accrocheuse en français "
        "(max 60 caractères, sans guillemets, sans liste d'ingrédients)."
    )
    ```

    Apply the same trailing-sentence append to `_EXTRACT_PROMPT_PHOTOS`:

    New state:
    ```python
    _EXTRACT_PROMPT_PHOTOS = (
        "Voici une recette photographiée (1 à 4 images). Extrais les champs "
        "structurés en français. Renvoie null pour les champs absents — n'invente "
        "rien. Extrais aussi cook_time_minutes (en minutes), difficulty "
        "('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette). "
        "Le champ title doit être une formule courte et accrocheuse en français "
        "(max 60 caractères, sans guillemets, sans liste d'ingrédients)."
    )
    ```

    Do NOT modify `_MODIFY_PROMPT` (voice-modify is a downstream user-driven edit; the user's modification instruction governs the result, not a global "catchy title" rule).

    Voice/photo failure path stays `status='failed'` (D-27 — the whole extract failed for these surfaces, not just the rewrite step). No change to `_record_failure` semantics or to `promote_voice_draft` / `promote_photo_draft`.

    SUB-EDIT 4B — Extend `retry_promotion` at lines 421-475 to dispatch `source_capture.type == "manual"` (quick + full-form both use this type). Currently the function dispatches `voice` and `photo` and falls through `manual` / `url` / unknown to `_record_failure`. After RID-04, `manual` should dispatch to `promote_full_draft` (or `promote_quick_draft` — they're structurally identical, so pick one; pick `promote_full_draft` since it generalizes better to future scope).

    Find the existing dispatch block (around lines 445-473):
    ```python
        if sc_type == "voice":
            transcript = payload.get("transcript") or ""
            if not transcript.strip():
                _record_failure(db, recipe, ValueError("retry: transcript missing"))
                return
            db.close()
            promote_voice_draft(recipe_id, transcript)
            return
        if sc_type == "photo":
            # photo bytes aren't stored in source_capture (only paths); v0.1
            # ...
            return
        # url / manual / unknown — should never reach retry path
        _record_failure(db, recipe, ValueError(f"retry not applicable for type={sc_type!r}"))
    ```

    Insert a new branch BETWEEN the photo branch and the final fallthrough:

    ```python
        if sc_type == "manual":
            # Phase 24 RID-04 / D-28 — quick and full-form retry. Both surfaces
            # land here (source_capture.type == "manual" for both quick and full,
            # per existing router code at recipes.py:144 + 188). Dispatch to the
            # full-draft body since it generalizes; the quick body is structurally
            # identical at v0.5 (Task 3).
            db.close()
            promote_full_draft(recipe_id)
            return
    ```

    Specifically:
    - The `db.close()` before calling the BackgroundTask body is REQUIRED — the body opens its own SessionLocal (RESEARCH §Pitfall 3). Mirrors the existing voice branch's `db.close(); promote_voice_draft(...)` pattern.
    - The `url` fall-through remains pointing to `_record_failure` (URL extraction is `# TODO(productize)` per CLAUDE.md — out of scope for v0.5).
    - Do NOT modify the voice branch, the photo branch, the fall-through line, or the function signature.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -c "Le champ title doit être une formule courte" app/services/llm.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "Le champ title doit être une formule courte et accrocheuse en français" app/services/llm.py` returns `2` (one in each extract prompt).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "max 60 caractères, sans guillemets, sans liste d'ingrédients" app/services/llm.py` returns `2`.
    - `_MODIFY_PROMPT` is unchanged: `cd /Users/gulu3001/dev/al-dente/backend && grep -A 3 "_MODIFY_PROMPT = (" app/services/llm.py | grep -c "Le champ title"` returns `0`.
    - retry_promotion dispatches manual: `cd /Users/gulu3001/dev/al-dente/backend && grep -c "if sc_type == \"manual\":" app/services/llm.py` returns `1`.
    - The manual branch calls promote_full_draft: `cd /Users/gulu3001/dev/al-dente/backend && grep -A 7 "if sc_type == \"manual\":" app/services/llm.py | grep -c "promote_full_draft(recipe_id)"` returns `1`.
    - The voice branch is preserved: `cd /Users/gulu3001/dev/al-dente/backend && grep -c "promote_voice_draft(recipe_id, transcript)" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.services.llm import _EXTRACT_PROMPT_VOICE, _EXTRACT_PROMPT_PHOTOS; assert 'Le champ title' in _EXTRACT_PROMPT_VOICE and 'Le champ title' in _EXTRACT_PROMPT_PHOTOS"` exits 0.
  </acceptance_criteria>
  <done>
    Voice and photo extract prompts gain the catchy-title clause. `_MODIFY_PROMPT` unchanged. `retry_promotion` dispatches `source_capture.type == "manual"` to `promote_full_draft` so failed-rewrite retries work end-to-end. URL still falls through to _record_failure.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Wire BackgroundTasks into POST /recipes (full-form) and POST /recipes/quick (RID-04 / D-24, D-31)</name>
  <files>backend/app/routers/recipes.py</files>
  <read_first>
    - backend/app/routers/recipes.py lines 70-100 (imports — verify BackgroundTasks is imported; the retry endpoint at L575 already uses BackgroundTasks)
    - backend/app/routers/recipes.py lines 125-200 (create_full + create_quick)
    - backend/app/services/llm.py (Task 3 — promote_quick_draft, promote_full_draft are the targets)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-24, §D-31
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Pitfall 7: create_full staying synchronous"
  </read_first>
  <action>
    Three sub-edits in `backend/app/routers/recipes.py`:

    SUB-EDIT 5A — Verify BackgroundTasks is imported. Check `cd /Users/gulu3001/dev/al-dente/backend && grep -n "BackgroundTasks" app/routers/recipes.py`. If imported (it should be — the retry endpoint at line 575 uses it), continue. If NOT imported, add to the existing FastAPI import line.

    Also add the two new BackgroundTask body imports. The file already imports `retry_promotion` from services/llm. Extend:

    Current import (line 78 area):
    ```python
    from app.services.llm import (
        # ... existing imports ...
        retry_promotion,
    )
    ```

    New import:
    ```python
    from app.services.llm import (
        # ... existing imports preserved ...
        promote_full_draft,
        promote_quick_draft,
        retry_promotion,
    )
    ```

    SUB-EDIT 5B — Refactor `create_full` (currently lines 130-164):

    1. Add `background_tasks: BackgroundTasks` to the signature.
    2. Change `status="structured"` → `status="draft"` in the Recipe(...) constructor.
    3. After the existing `await broadcast_to_household(member.household_id, "recipe.created", payload)` line, queue the BackgroundTask.

    Concrete new shape:
    ```python
    @router.post("", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
    async def create_full(
        body: RecipeFullCreate,
        background_tasks: BackgroundTasks,
        member: Member = Depends(current_member),
        db: Session = Depends(get_db),
    ) -> RecipeResponse:
        """RECIPE-01 — full-form create.

        Phase 24 RID-04 D-24: shifted from sync status='structured'-on-return to
        async BackgroundTask. Now stamps status='draft', queues promote_full_draft
        which calls rewrite_title and flips to 'structured' with a catchy title.
        recipe.created still broadcasts sync at the router (D-31); the BackgroundTask
        emits recipe.promoted on success or rewrite-failure (per _record_rewrite_failure).
        CLAUDE.md invariant #1 updates in the same atomic commit as this change.
        """

        recipe = Recipe(
            household_id=member.household_id,
            created_by_member_id=member.id,
            status="draft",  # Phase 24 RID-04 D-24 — was "structured" pre-Phase-24.
            title=body.title,
            # Invariant 5: full payload kept verbatim — source_capture.payload.title
            # preserves the user's original title forever; recipe.title is overwritten
            # by the BackgroundTask's rewrite, but source_capture is never touched.
            source_capture={"type": "manual", "payload": body.model_dump(mode="json")},
            ingredients=[i.model_dump() for i in body.ingredients] or None,
            steps=body.steps or None,
            prep_time_minutes=body.prep_time_minutes,
            servings=body.servings,
            # Phase 24 RID-02 — three new optional fields.
            cook_time_minutes=body.cook_time_minutes,
            difficulty=body.difficulty.value if body.difficulty else None,
            description=body.description,
            cuisine=body.cuisine.value if body.cuisine else None,
            mood=[m.value for m in body.mood] or [],
            main_protein=body.main_protein.value if body.main_protein else None,
            seasonality=[s.value for s in body.seasonality]
            or ["spring", "summer", "autumn", "winter"],
            tags=body.tags or [],
            photo_paths=[],
        )
        db.add(recipe)
        db.commit()
        db.refresh(recipe)

        payload = _to_response_payload(recipe)
        # REALTIME-02: every household-syncing mutation broadcasts. recipe.created
        # broadcasts sync here (D-31); recipe.promoted broadcasts from the BackgroundTask.
        await broadcast_to_household(member.household_id, "recipe.created", payload)

        # Phase 24 RID-04 D-24 — queue rewrite. The task opens its own SessionLocal
        # (RESEARCH §Pitfall 3) and runs AFTER the response is sent.
        background_tasks.add_task(promote_full_draft, recipe.id)

        return RecipeResponse.model_validate(recipe)
    ```

    Specifically:
    - The `difficulty=body.difficulty.value if body.difficulty else None` line writes the Pydantic-validated literal to the column. Since `RecipeFullCreate.difficulty` is `Optional[DifficultyLiteral]` (Task 4 of 24-02), `body.difficulty` is already a plain string `"easy"`/`"medium"`/`"hard"` or None — the `.value` accessor is wrong; use just `body.difficulty` directly. Adjust accordingly: `difficulty=body.difficulty` (the Pydantic Literal type returns the bare string).
    - `cook_time_minutes` and `description` likewise — direct assignment, no `.value` needed.
    - `cuisine.value` / `mood[m].value` / `main_protein.value` / `seasonality[s].value` keep the existing pattern because those use Pydantic Enum types (not Literal) — verify by reading the schema.
    - `body.cook_time_minutes`, `body.difficulty`, `body.description` only land on the row IF 24-02 Task 4 added them to `RecipeFullCreate` — verify the schema before this task runs (24-02 should be complete by Wave 2).
    - `background_tasks.add_task(promote_full_draft, recipe.id)` is the only mutation in the new logic. Place it BEFORE the `return` line.

    SUB-EDIT 5C — Refactor `create_quick` (currently lines 167-200):

    1. Add `background_tasks: BackgroundTasks` to the signature.
    2. `status="draft"` is ALREADY correct (no change).
    3. After the existing `await broadcast_to_household(...)` call, queue the BackgroundTask.

    Concrete new shape:
    ```python
    @router.post("/quick", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
    async def create_quick(
        body: RecipeQuickCreate,
        background_tasks: BackgroundTasks,
        member: Member = Depends(current_member),
        db: Session = Depends(get_db),
    ) -> RecipeResponse:
        """RECIPE-02 — title-only quick add. Server stamps status='draft'.

        Phase 24 RID-04 D-24: rewrite_title runs in a BackgroundTask alongside the
        existing draft creation. The user's quick-typed title is preserved in
        source_capture.payload.title forever (invariant #5); recipe.title is
        overwritten by the catchy rewrite on success (D-29 — BackgroundTask always wins).

        Photo upload remains a separate ``POST /recipes/{id}/photos`` call.
        """

        recipe = Recipe(
            household_id=member.household_id,
            created_by_member_id=member.id,
            status="draft",
            title=body.title,
            source_capture={"type": "manual", "payload": body.model_dump()},
            photo_paths=[],
            mood=[],
            seasonality=["spring", "summer", "autumn", "winter"],
            tags=[],
        )
        db.add(recipe)
        db.commit()
        db.refresh(recipe)

        payload = _to_response_payload(recipe)
        await broadcast_to_household(member.household_id, "recipe.created", payload)

        # Phase 24 RID-04 D-24 — queue rewrite (and downstream illustration in RID-05).
        background_tasks.add_task(promote_quick_draft, recipe.id)

        return RecipeResponse.model_validate(recipe)
    ```

    Specifically:
    - `body` passes its kwargs in the same position as before (no positional argument change).
    - The `background_tasks: BackgroundTasks` parameter is REQUIRED — FastAPI's DI injects it; without the param the new logic has nothing to queue against.
    - The new `background_tasks.add_task(promote_quick_draft, recipe.id)` is the only mutation.
    - The recipe.created broadcast STAYS at the router — D-31 explicitly preserves the existing pattern.
    - Do NOT modify any other endpoint in the router file (voice/photo/url/retry endpoints are untouched).
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -cE "promote_full_draft|promote_quick_draft" app/routers/recipes.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "promote_full_draft" app/routers/recipes.py` returns at least `2` (import + add_task).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "promote_quick_draft" app/routers/recipes.py` returns at least `2` (import + add_task).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "background_tasks: BackgroundTasks" app/routers/recipes.py` returns at least `3` (create_full + create_quick + retry endpoint).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "background_tasks.add_task(promote_full_draft, recipe.id)" app/routers/recipes.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "background_tasks.add_task(promote_quick_draft, recipe.id)" app/routers/recipes.py` returns `1`.
    - create_full now stamps status='draft': `cd /Users/gulu3001/dev/al-dente/backend && grep -A 12 "async def create_full" app/routers/recipes.py | grep -c "status=\"draft\""` returns `1`.
    - create_quick still stamps status='draft': `cd /Users/gulu3001/dev/al-dente/backend && grep -A 12 "async def create_quick" app/routers/recipes.py | grep -c "status=\"draft\""` returns `1`.
    - create_full no longer stamps status='structured' synchronously: `cd /Users/gulu3001/dev/al-dente/backend && grep -A 12 "async def create_full" app/routers/recipes.py | grep -c "status=\"structured\""` returns `0`.
    - The 3 RID-02 fields are written to the row in create_full: `cd /Users/gulu3001/dev/al-dente/backend && grep -A 30 "async def create_full" app/routers/recipes.py | grep -cE "cook_time_minutes=body|difficulty=body|description=body"` returns at least `3`.
    - The recipe.created broadcast survives in BOTH endpoints: `cd /Users/gulu3001/dev/al-dente/backend && grep -c "broadcast_to_household(member.household_id, \"recipe.created\"" app/routers/recipes.py` returns at least `2`.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.routers.recipes import router; print('OK')"` exits 0.
    - End-to-end smoke (operator runs against local stack): `curl -X POST http://localhost:8000/recipes/quick -H "Cookie: aldente_auth=..." -H "Content-Type: application/json" -d '{"title":"Test risotto"}'` returns `201` with `status: "draft"`; within ~3 seconds a WebSocket `recipe.promoted` event arrives carrying `status: "structured"` and `title: "Délices maison (test)"` (test-mode fixture).
  </acceptance_criteria>
  <done>
    Both create_full and create_quick stamp status='draft', broadcast recipe.created sync, and queue their respective BackgroundTask (promote_full_draft / promote_quick_draft). All other endpoints are unchanged. The 3 RID-02 fields are written into the Recipe row from the validated Pydantic body.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 6: Update CLAUDE.md invariant #1 wording (RID-04 / D-04, D-30)</name>
  <files>CLAUDE.md</files>
  <read_first>
    - CLAUDE.md (full file — focus on the "Architecture invariants" §1 line)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-04, §D-30
  </read_first>
  <action>
    Update CLAUDE.md's "Architecture invariants" #1 wording to add a parenthetical clarification noting that quick and full-form moved from synchronous to BackgroundTask-based promotion in v0.5 RID-04. Per D-04, this change SHIPS IN THE SAME ATOMIC COMMIT as Tasks 1-5.

    Find the current line in CLAUDE.md (under `## Architecture invariants` → numbered list item #1):

    Current:
    ```
    1. **Five capture surfaces, one shape.** `quick`, full-form, `voice`, `photo`, `url` all `POST /recipes/<surface>`, all return a `draft` immediately, all promotion runs **server-side** in a FastAPI `BackgroundTask`. Never promote drafts client-side. WebSocket broadcasts when status flips to `structured`.
    ```

    New:
    ```
    1. **Five capture surfaces, one shape.** `quick`, full-form, `voice`, `photo`, `url` all `POST /recipes/<surface>`, all return a `draft` immediately, all promotion runs **server-side** in a FastAPI `BackgroundTask` (quick and full-form moved from sync `structured`-on-return to BackgroundTask-based rewrite in v0.5 RID-04 — see `.planning/phases/24-recipe-identity/`). Never promote drafts client-side. WebSocket broadcasts when status flips to `structured`.
    ```

    Specifically:
    - The change is a single sentence INSERTED inside the existing parenthetical-friendly position right after "FastAPI `BackgroundTask`" and BEFORE the period.
    - The reference to `.planning/phases/24-recipe-identity/` gives future maintainers a breadcrumb to the load-bearing decisions (D-04, D-24, D-29, D-30).
    - Do NOT modify invariants #2, #3, #4, #5, #6, #7, or #8. Do NOT modify any other section of CLAUDE.md (project context, repo layout, tests, deployment, etc.).
    - This edit is small but LOAD-BEARING — it's the docs side of the milestone-locked v0.5 decision; reviewers comparing the code diff against the invariant must see both shift in the same diff.
  </action>
  <verify>
    <automated>grep -c "moved from sync.*structured.*to BackgroundTask-based rewrite in v0.5 RID-04" /Users/gulu3001/dev/al-dente/CLAUDE.md    <automated>grep -c "BackgroundTask-based rewrite in v0.5 RID-04" /Users/gulu3001/dev/al-dente/CLAUDE.md</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "BackgroundTask-based rewrite in v0.5 RID-04" /Users/gulu3001/dev/al-dente/CLAUDE.md` returns `1`.
    - `grep -c "quick and full-form moved from sync" /Users/gulu3001/dev/al-dente/CLAUDE.md` returns `1`.
    - `grep -c "\\.planning/phases/24-recipe-identity/" /Users/gulu3001/dev/al-dente/CLAUDE.md` returns `1`.
    - Invariant numbering is preserved: `grep -cE "^[0-9]+\\. \\*\\*" /Users/gulu3001/dev/al-dente/CLAUDE.md` returns the same count as before the edit (8 invariants, unchanged).
    - Other invariants untouched: `grep -c "Voting state is computed, not stored" /Users/gulu3001/dev/al-dente/CLAUDE.md` returns `1` (invariant #2 preserved).
    - `grep -c "HttpOnly cookie auth, not Bearer header" /Users/gulu3001/dev/al-dente/CLAUDE.md` returns `1` (invariant #8 preserved).
  </acceptance_criteria>
  <done>
    CLAUDE.md invariant #1 includes the v0.5 RID-04 parenthetical clarification with a breadcrumb to `.planning/phases/24-recipe-identity/`. All other invariants are byte-identical to pre-edit state. The single edit ships in the same atomic commit as Tasks 1-5.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| User-typed title (quick/full-form body) → backend → Gemini `rewrite_title()` | Prompt-injection risk — a malicious title could try to coerce Gemini into emitting attacker-controlled content. Mitigations: schema-bound prompt structure (`_REWRITE_TITLE_PROMPT` is a closed instruction), 60-char output cap, `.strip()` + newline replacement, output stored as plain text in `recipe.title` (never rendered as HTML on the client). |
| Voice transcript / photo bytes → Gemini extract → `recipe.title` via `_apply_extracted` | Same risk as voice/photo today (pre-Phase-24) — schema-constrained output via `response_schema=GeminiExtractedRecipe` keeps the shape intact; the new catchy-title clause changes the prompt but not the constraint surface. |
| BackgroundTask body → DB | Standard SQLAlchemy parametrization (no SQL injection surface). The task runs as a service-level process (no per-user identity); recipe access is gated by the original POST endpoint's auth check. |
| BackgroundTask broadcast → WebSocket → both household members | The payload is the existing `RecipeResponse` shape; no new fields exposed beyond what RID-02 already added. Realtime auth is unchanged. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-24-04-01 | Tampering (Prompt Injection) | rewrite_title() | mitigate | The prompt is a CLOSED instruction (`Réécris ce titre... Renvoie UNIQUEMENT le nouveau titre, sans guillemets, sans préfixe.`). User-supplied content arrives as the SECOND content position. Output is stripped, newline-replaced, length-capped at 60 chars. Stored as plain text in `recipe.title`; React renders as text (no HTML interpretation). Blast radius: limited to 60 chars of attacker-influenced title text. Acceptable for couple-scale; no privilege escalation surface. |
| T-24-04-02 | Tampering (Prompt Injection) | voice/photo extract prompt with catchy-title clause | mitigate | Output is constrained by `response_schema=GeminiExtractedRecipe` — injected content cannot reshape the data model. `title` is a `str` field in the schema; the catchy-title clause is an instruction to Gemini about HOW to populate it but cannot bypass the schema's structural constraints. Same React-text-rendering mitigation applies to the final stored title. |
| T-24-04-03 | Information Disclosure | promotion_error column | mitigate | `_record_rewrite_failure` truncates exception text to 500 chars (mirrors existing `_record_failure` posture, T-02-01-02). PII in Gemini error messages is limited; the truncation is the documented mitigation. Acceptable. |
| T-24-04-04 | Denial of Service | BackgroundTask + Gemini rate limits | accept | Couple-scale workload (~5-10 captures/week per household). Gemini API has per-minute quotas; abuse would self-throttle. Single uvicorn worker (invariant #7) prevents in-process amplification. No rate-limiting middleware needed at v0.5 scale. |
| T-24-04-05 | Repudiation | source_capture preservation | accept | Invariant #5 holds — `source_capture.payload.title` preserves the user's original input forever even after `recipe.title` is silently overwritten by rewrite. Audit trail intact. |
| T-24-04-06 | Elevation of Privilege | BackgroundTask runs in process context | accept | No new auth surface; the task only touches the recipe row identified by the recipe_id parameter. The original POST endpoint already validated `member.household_id` ownership; the BackgroundTask reads the row by id only (NOT by household — but the row was just created in that household, so cross-household contamination is structurally impossible). |
| T-24-04-07 | Tampering | Edit-race (user PUT vs BackgroundTask write) | accept | D-29 documents the silent-overwrite policy. The BackgroundTask wins the race deterministically (it commits last). User can re-edit via PUT after the rewrite completes; the retry endpoint can re-run rewrite if desired. Documented acceptance, not a defect. |

**Summary:** RID-04 introduces an LLM-driven mutation surface (`rewrite_title`) AND prompt-injection clauses in two existing extract prompts. The central mitigations are (1) closed-prompt structure, (2) schema-constrained extract output, (3) output length cap + sanitization, (4) plain-text rendering on the client (no HTML). The 500-char error truncation mitigates PII leakage in promotion_error. No high-severity findings; six dispositions across categories.
</threat_model>

<verification>
## Phase 24 / RID-04 Verification — grep gates + manual UI smoke + Playwright fixture compatibility

Per D-40 / D-41 / D-42.

### Grep gates (must all pass after Task 1-6 complete)

```bash
# 1. rewrite_title helper exists with correct signature + plain-text shape
grep -c "def rewrite_title(original_title: str, recipe_context: dict\\[str, Any\\]) -> str" backend/app/services/llm.py   # Expected: 1
grep -c "_REWRITE_TITLE_PROMPT" backend/app/services/llm.py                                                                # Expected: at least 2
grep -c "Réécris ce titre de recette" backend/app/services/llm.py                                                          # Expected: 1
grep -c "canned_rewritten_title" backend/app/services/llm_fixtures.py                                                      # Expected: 1
grep -c "Délices maison (test)" backend/app/services/llm_fixtures.py                                                       # Expected: 1

# 2. _record_rewrite_failure exists and sets status='structured' (NOT 'failed')
grep -c "def _record_rewrite_failure" backend/app/services/llm.py                                                          # Expected: 1
grep -A 8 "def _record_rewrite_failure" backend/app/services/llm.py | grep -c "recipe.status = \"structured\""             # Expected: 1
grep -A 8 "def _record_rewrite_failure" backend/app/services/llm.py | grep -c "recipe.status = \"failed\""                 # Expected: 0
grep -A 10 "def _record_rewrite_failure" backend/app/services/llm.py | grep -c "_broadcast_promoted"                       # Expected: 1

# 3. promote_quick_draft + promote_full_draft BackgroundTask bodies exist
grep -c "def promote_quick_draft(recipe_id: UUID) -> None:" backend/app/services/llm.py                                    # Expected: 1
grep -c "def promote_full_draft(recipe_id: UUID) -> None:" backend/app/services/llm.py                                     # Expected: 1
grep -c "rewrite_title(recipe.title, {})" backend/app/services/llm.py                                                      # Expected: 2

# 4. Voice + photo prompts gain catchy-title clause; _MODIFY_PROMPT untouched
grep -c "Le champ title doit être une formule courte et accrocheuse en français" backend/app/services/llm.py               # Expected: 2

# 5. retry_promotion dispatches manual source_capture type
grep -c "if sc_type == \"manual\":" backend/app/services/llm.py                                                            # Expected: 1
grep -A 5 "if sc_type == \"manual\":" backend/app/services/llm.py | grep -c "promote_full_draft(recipe_id)"                # Expected: 1

# 6. Router wires BackgroundTasks into create_full + create_quick
grep -c "promote_full_draft\|promote_quick_draft" backend/app/routers/recipes.py                                           # Expected: at least 4 (2 imports + 2 add_task calls)
grep -c "background_tasks: BackgroundTasks" backend/app/routers/recipes.py                                                 # Expected: at least 3 (create_full + create_quick + retry)
grep -c "background_tasks.add_task(promote_full_draft, recipe.id)" backend/app/routers/recipes.py                          # Expected: 1
grep -c "background_tasks.add_task(promote_quick_draft, recipe.id)" backend/app/routers/recipes.py                         # Expected: 1
grep -A 12 "async def create_full" backend/app/routers/recipes.py | grep -c "status=\"draft\""                            # Expected: 1
grep -A 12 "async def create_full" backend/app/routers/recipes.py | grep -c "status=\"structured\""                       # Expected: 0
# recipe.created broadcast survives in both
grep -c "broadcast_to_household(member.household_id, \"recipe.created\"" backend/app/routers/recipes.py                    # Expected: at least 2

# 7. CLAUDE.md invariant #1 updated
grep -c "BackgroundTask-based rewrite in v0.5 RID-04" CLAUDE.md                                                            # Expected: 1
grep -c "Voting state is computed, not stored" CLAUDE.md                                                                   # Expected: 1 (invariant #2 unchanged)
```

### Build / lint / type gates

```bash
cd backend && uv run python -c "from app.services.llm import rewrite_title, promote_quick_draft, promote_full_draft, _record_rewrite_failure; from app.routers.recipes import router; print('OK')"   # Expected: prints OK
cd frontend && npx tsc --noEmit -p tsconfig.json   # Expected: exit 0 (no frontend changes, but ensure nothing accidentally broke)
```

### Test-mode end-to-end smoke (operator runs against local stack with ENVIRONMENT=test)

```bash
# Start backend with ENVIRONMENT=test (test-mode shortcut activates canned fixtures)
cd backend && ENVIRONMENT=test uv run uvicorn app.main:app --reload &

# Quick capture — expect status='draft' on return, then status='structured' + title rewrite via WebSocket
curl -X POST http://localhost:8000/recipes/quick \
     -H "Cookie: aldente_auth=<seed cookie>" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test risotto"}' | jq '.status, .title'
# Expected initial response: status="draft", title="Test risotto"

# Wait ~1s for BackgroundTask, then GET the recipe
sleep 1
curl http://localhost:8000/recipes/<recipe_id> | jq '.status, .title'
# Expected: status="structured", title="Délices maison (test)"

# Full-form capture — same flow
curl -X POST http://localhost:8000/recipes \
     -H "Cookie: aldente_auth=<seed cookie>" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test pasta","ingredients":[{"name":"spaghetti","quantity":200,"unit":"g"}]}' | jq '.status, .title'
# Expected initial response: status="draft", title="Test pasta"
sleep 1
# After BackgroundTask: status="structured", title="Délices maison (test)"

# Force-failure path: title starting with __TEST_FORCE_FAIL__
curl -X POST http://localhost:8000/recipes/quick \
     -H "Cookie: aldente_auth=<seed cookie>" \
     -H "Content-Type: application/json" \
     -d '{"title":"__TEST_FORCE_FAIL__ broken"}' | jq '.status'
sleep 1
curl http://localhost:8000/recipes/<recipe_id> | jq '.status, .title, .promotion_error'
# Expected: status="structured" (NOT "failed"), title="__TEST_FORCE_FAIL__ broken" (unchanged from user input),
#           promotion_error="Rewrite forcée à échouer pour les tests (RID-04 D-26). ..."
```

### Manual UI smoke (D-41 — operator runs against PRODUCTION-mode local stack with a real GEMINI_API_KEY)

1. **Quick capture** (`/recipes/new` → Quick tab): Type "Risotto aux champignons et au parmesan vieilli 36 mois" → tap save → returns to inbox showing draft → within ~3 seconds the title flips to a catchy version (e.g., "Risotto crémeux aux cèpes") via WebSocket recipe.promoted.
2. **Full-form capture** (`/recipes/new` → Complète tab): Fill in title + ingredients + steps + the RID-02 fields → submit → page returns with `status: "draft"` → within ~3 seconds the inbox/library shows `status: "structured"` with rewritten title.
3. **Edit existing recipe** (`/recipes/<id>/edit`): Change the title → save → the new title is preserved verbatim (no rewrite triggered on PUT per D-28).
4. **Source preserved** (`/recipes/<id>` → inspect `source_capture.payload.title` via DevTools or the response payload): User's original title is preserved forever even after rewrite (invariant #5).
5. **Rewrite failure** (simulate by tightening Gemini quota OR using ENVIRONMENT=test + the force-fail prefix): Recipe lands in `status="structured"` (NOT failed), `promotion_error` is populated. User can still cook the recipe; the failed-rewrite case is transparent.
6. **Retry rewrite** (call `POST /recipes/<id>/retry-promotion` on a `status=structured` recipe with `promotion_error` set): The retry endpoint runs `promote_full_draft` again; on success, the title gets a fresh rewrite.

### Playwright fixture compatibility (D-42)

- The canned fixture (`canned_rewritten_title`) is invoked in test mode. Existing Playwright specs that capture recipes in test mode will see titles end with `(test)` after promotion. If any spec asserts on the EXACT user-typed title surviving promotion, it must update its expectation to `"Délices maison (test)"` (the canned rewrite output).
- The `canned_voice_recipe` / `canned_photo_recipe` fixtures already title-suffix `(test)` — voice/photo extracts continue to use those, NOT `canned_rewritten_title` (voice/photo gets the catchy-title clause inline in the extract prompt, not a separate rewrite call).
- No NEW Playwright specs are added per D-42.
</verification>

<success_criteria>
The plan is complete when:

1. All grep gates from §Verification pass (rewrite_title + _record_rewrite_failure + 2 BackgroundTask bodies + voice/photo prompt extension + retry_promotion manual dispatch + router BackgroundTasks wiring + CLAUDE.md invariant update).
2. `cd backend && uv run python -c "from app.services.llm import rewrite_title, promote_quick_draft, promote_full_draft; print('OK')"` exits 0.
3. Test-mode end-to-end smoke (4 curl-driven scenarios) passes against a local stack with `ENVIRONMENT=test`.
4. Manual UI smoke (6 steps) passes against a local stack with a real Gemini API key.
5. RID-04 success criteria from ROADMAP (catchy titles on all four capture surfaces; source_capture preserves original; rewrite-failure preserves user title + sets promotion_error; CLAUDE.md invariant #1 updated in same plan) are all satisfied.
6. All tasks merged in ONE atomic commit (per D-04). Suggested commit message: `feat(24-04): llm catchy titles + invariant #1 shift — quick/full-form become async BackgroundTask (RID-04, gh#10)`.
</success_criteria>

<output>
After completion, create `.planning/phases/24-recipe-identity/24-04-title-rewrite-SUMMARY.md` documenting:

- RID-04 closed; gh#10 closeable on merge to main.
- Files modified: 4 (`services/llm.py`, `services/llm_fixtures.py`, `routers/recipes.py`, `CLAUDE.md`).
- New symbols in `services/llm.py`: `rewrite_title`, `_REWRITE_TITLE_PROMPT`, `_record_rewrite_failure`, `promote_quick_draft`, `promote_full_draft`. New fixture: `canned_rewritten_title`.
- Voice/photo extract prompts gain a catchy-title clause (no extra Gemini round-trip per D-27).
- retry_promotion now dispatches `source_capture.type == "manual"` to `promote_full_draft` so users can retry a failed rewrite (D-28 retry-endpoint compatibility).
- CLAUDE.md invariant #1: parenthetical clarification documents the v0.5 RID-04 shift (sync → BackgroundTask for quick + full-form).
- Architecture invariants preserved: #4 (recipe.created sync at router + recipe.promoted from BackgroundTask), #5 (source_capture.payload.title kept forever), #7 (single uvicorn worker — BackgroundTask runs in-process).
- Edit-race policy (D-29): BackgroundTask always wins via silent overwrite; retry endpoint is the escape hatch.
- Provides for downstream plans:
  - RID-05 (illustration): the four BackgroundTask bodies (voice, photo, quick, full) are the mount points for the new `generate_recipe_illustration()` call. RID-05 extends all four bodies to also generate + sanitize + persist the SVG illustration.
- Verification: grep gates + test-mode curl smoke + production-mode manual UI smoke. Playwright fixtures continue to match because test-mode rewrite returns a deterministic canned string.
</output>
