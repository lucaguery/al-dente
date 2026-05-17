---
phase: 26-thread-api-realtime
reviewed: 2026-05-13T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - backend/app/main.py
  - backend/app/routers/recipes.py
  - backend/app/schemas/recipe_turn.py
  - backend/app/services/llm.py
  - backend/app/services/llm_fixtures.py
  - backend/app/services/realtime.py
  - backend/app/services/storage.py
  - backend/app/services/thread.py
  - backend/tests/test_turns.py
  - CLAUDE.md
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-05-13
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 26 wires three new thread endpoints (`POST /recipes/{id}/turns`, `POST /recipes/{id}/turns/photo`, `GET /recipes/{id}/turns`) into `routers/recipes.py`, ships a per-recipe `asyncio.Lock` registry + SSRF helper in `services/thread.py`, the URL-extraction BackgroundTask in `services/llm.py`, and a pytest suite in `tests/test_turns.py`. Schema validation in `schemas/recipe_turn.py` is thorough and Pydantic-correct. The realtime ordering (commit → broadcast) is honored throughout.

Overall quality is high — invariants #4, #5, #7 are respected, the SSRF helper passes the 11-case grid documented in research, and the JSONB full-reassignment idiom is applied consistently. However, one **CRITICAL** finding (URL-extraction failure demotes already-structured recipes to `status='failed'`), six warnings around test coverage gaps and subtle correctness issues, and four info items round out the report.

The pytest coverage is the most material gap: the suite under-tests the negative paths called out in the threat register (SSRF blocked URLs, malformed advisory payloads, position-lock contention, invalid UUIDs).

## Critical Issues

### CR-01: URL-turn extraction failure demotes structured recipes to `status='failed'`

**File:** `backend/app/services/llm.py:849-855`
**Issue:** `extract_and_process_url_turn` catches every exception and calls `_record_failure(db, recipe, exc)`, which unconditionally sets `recipe.status = "failed"` (services/llm.py:482). For an **initial** url-capture this is correct (the recipe was a `draft`). But Phase 26 makes URL turns available as **follow-ups** on already-structured recipes (`POST /recipes/{id}/turns` with `kind="url"` against an existing recipe — exercised by the canonical thread API). When such a follow-up URL fails extraction (trafilatura returns None on a JS-rendered page — a 10-20% rate per RESEARCH §Area 1 / R-2), the entire recipe row is demoted from `structured` to `failed`. The user loses access to the recipe's library view, the inbox/failed-state UI takes over, and the only recovery is `retry-promotion` — which then re-runs `promote_draft` against the **position=0** turn, ignoring the new url turn entirely. Data is not lost but state is corrupted.

This is the inverse of the `_record_rewrite_failure` pattern (llm.py:488-515), which deliberately keeps `status='structured'` when only an enrichment step failed. URL-turn extraction is conceptually equivalent: the recipe body is unaffected; only an optional augmentation failed.

**Fix:**
```python
# services/llm.py — add a new helper for thread-turn enrichment failures.
def _record_turn_enrichment_failure(
    db: Session, recipe: Recipe, turn: RecipeTurn, exc: Exception
) -> None:
    """Phase 26 — record a turn-side enrichment failure WITHOUT mutating recipe.status.

    Used by extract_and_process_url_turn when the recipe is already past
    initial promotion (e.g. follow-up url turn on a structured recipe). The
    recipe is unchanged; the failure surfaces on the turn payload so the FE
    can render a 'Lien non extrait — réessayer' chip on the url bubble.
    """
    log.warning("turn enrichment failed recipe=%s turn=%s: %s", recipe.id, turn.id, exc)
    turn.payload = {**(turn.payload or {}), "extraction_error": str(exc)[:500]}
    flag_modified(turn, "payload")
    db.commit()

# Then in extract_and_process_url_turn's except clause:
except Exception as exc:  # noqa: BLE001
    db.rollback()
    if recipe is not None and turn is not None:
        # Only flip recipe.status when the recipe was a draft (initial url capture
        # via legacy POST /recipes/url → first user turn is kind='url'). Otherwise
        # this is a follow-up url turn on a structured recipe — record on the turn.
        if recipe.status == "draft":
            _record_failure(db, recipe, exc)
        else:
            _record_turn_enrichment_failure(db, recipe, turn, exc)
    else:
        log.exception("extract_and_process_url_turn: pre-recipe failure recipe=%s turn=%s", recipe_id, turn_id)
```

A simpler interim fix is to only call `_record_failure` when `recipe.status == "draft"` and log+swallow otherwise; the structured fix above preserves the failure trace on the turn so the FE can surface it.

---

## Warnings

### WR-01: `extract_and_process_url_turn` references `turn` in except block but `turn` may be unbound

**File:** `backend/app/services/llm.py:758-857`
**Issue:** `turn` is assigned at line 764 (`turn = db.scalar(...)`) but the `except Exception` block at line 849 doesn't reference it directly today. The fix above (CR-01) needs `turn` in the except scope — but more pressingly, if any exception fires **between** `recipe = db.scalar(...)` (line 760) and the `turn` assignment (line 764), the except handler can still call `_record_failure(db, recipe, exc)` even though no turn lookup ran. That's fine for `_record_failure`, but a subsequent fix that uses `turn` in the except block (as CR-01 proposes) will trip on `NameError: name 'turn' is not defined` because `turn` was never assigned in the local frame at that point. Defensive initialization (`turn: Optional[RecipeTurn] = None`) before the lookup avoids this trap.

**Fix:** Add `turn: Optional[RecipeTurn] = None` immediately after the existing `recipe: Optional[Recipe] = None` at llm.py:758, so any future except-side use of `turn` is safe.

### WR-02: `_record_failure` in async BackgroundTask uses sync `_broadcast_promoted` path indirectly

**File:** `backend/app/services/llm.py:849-855` (interaction with `_record_rewrite_failure`)
**Issue:** Not directly triggered by the diff, but worth noting: `_record_failure` is fine in `extract_and_process_url_turn` because it doesn't broadcast. However the symmetric helper `_record_rewrite_failure` (called nowhere new in this phase) **does** call `_broadcast_promoted` (llm.py:515), which calls `asyncio.run(...)`. If a future hand were to call `_record_rewrite_failure` from inside `extract_and_process_url_turn` (which is `async def`), `asyncio.run` would raise `RuntimeError: asyncio.run() cannot be called from a running event loop`. RESEARCH §Area 8 / R-7 calls out the sync-vs-async mix as a documented risk. Worth adding a header docstring on `_record_rewrite_failure` flagging it as **sync-context only**, and an assertion at the top of `_broadcast_promoted` to fail loudly if it ever runs inside a live loop.

**Fix:**
```python
# llm.py _broadcast_promoted — add defense:
def _broadcast_promoted(recipe: Recipe) -> None:
    # Defensive: asyncio.run() forbids reentrant calls. Callers in async
    # contexts must await broadcast_to_household directly.
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        pass  # No loop — safe to asyncio.run()
    else:
        raise RuntimeError(
            "_broadcast_promoted called from within a running event loop; "
            "await broadcast_to_household() directly instead."
        )
    payload = RecipeResponse.model_validate(recipe).model_dump(mode="json")
    asyncio.run(broadcast_to_household(recipe.household_id, "recipe.promoted", payload))
```

### WR-03: `_apply_proposal_accepted` does not pin `proposal_accepted.field` via Pydantic — silent type coercion possible

**File:** `backend/app/routers/recipes.py:858-898`
**Issue:** `AdvisoryTurnPayload.model_validate({"kind": "advisory", **(referenced.payload or {})})` validates the **shape**, but `proposed_value: Any` is not validated against the **field**. A maliciously crafted advisory (or buggy Phase 29 emitter) could ship `{field: "difficulty", proposed_value: ["this", "is", "a", "list"]}` and the handler would `setattr(recipe, "difficulty", ["this", "is", "a", "list"])`. SQLAlchemy will only catch this if `recipes.difficulty` has a CHECK constraint or NOT NULL TEXT column will accept any string repr. The `AnswerTurnPayload` validator is rigorous about per-field types — the proposal-accepted path skips that gate entirely.

Since advisory turns are emitted by Phase 29 (an LLM-driven path), trust-boundary discipline says we should still validate the LLM output before writing to a recipe column. Reuse the existing per-field validation by running the proposed_value through the same `AnswerTurnPayload._validate_value_for_field` path.

**Fix:** After constructing `advisory_payload`, run the equivalent per-field check before the `setattr`:
```python
# Reuse AnswerTurnPayload's per-field value validation by constructing a transient instance.
try:
    AnswerTurnPayload(
        kind="answer",
        in_reply_to_turn_id=payload.in_reply_to_turn_id,
        field=advisory_payload.field,
        value=advisory_payload.proposed_value,
    )
except Exception as exc:
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f"advisory proposed_value fails per-field validation: {exc!s}",
    ) from exc
```
(The transient instance is constructed only for its `@model_validator` side effect — `in_reply_to_turn_id` is reused as a syntactically-valid UUID; nothing is persisted.)

### WR-04: Position lock is acquired per-recipe but **not** per-process — `recipes.py:1129` photo endpoint creates a *second* lock window after long Storage upload

**File:** `backend/app/routers/recipes.py:1101-1147` (`create_turn_photo`)
**Issue:** In `create_turn_photo`, the lock is acquired (line 1129) **after** the Supabase Storage uploads (lines 1102-1126). For a 4-photo upload of ~5 MB each on a slow connection, the upload loop can run for several seconds. During that window, two concurrent photo POSTs against the same recipe both finish uploading, then both contend for the lock, and both compute `next_position = max+1` correctly under the lock — so the position-lock contract is technically honored. But the lock is **only** doing duty for the position read; the *real* shared resource is the storage-paths-list-on-recipe vs the position counter. Compare to `create_turn` (JSON), where the lock encompasses the only DB read+write.

Minor concern: this is **not** a position-collision bug (the lock + DB UNIQUE constraint defend that), but it does mean photo uploads on the same recipe can interleave in their Storage-write phase. At couple-scale this is fine (two phones rarely upload to the same recipe simultaneously); flagging only because the comment at line 1128 says "serialize position + insert" which understates the asymmetry with the JSON endpoint.

**Fix:** No code change required for couple-scale. Update the comment at recipes.py:1128 to be honest: `# D-18 — serialize position + insert under per-recipe lock. Storage uploads above happen outside the lock (couple-scale ok; two phones rarely upload to the same recipe in the same second).`

### WR-05: Test suite under-covers negative paths called out in the threat register

**File:** `backend/tests/test_turns.py` (entire file)
**Issue:** 8 tests cover the happy paths and a few validation paths, but the threat register in 26-03-PLAN lists 14 STRIDE entries (T-26-01..T-26-14). The pytest suite covers approximately 4 of them. Specific gaps:

1. **No test for SSRF-blocked URLs** — `_is_safe_url` has 11 verified test cases in RESEARCH but zero integration tests confirm the route from `POST /turns kind=url` through to `_record_failure` when the URL hits an RFC1918 / metadata FQDN. T-26-02 is the highest-priority security control in the phase.
2. **No test for `AnswerTurnPayload` per-field value validation** — the suite tests `field='photo_paths'` (T-26-10, Literal-level rejection) but not `field='difficulty', value='extreme'` (model_validator-level rejection) or `field='servings', value=-1` (range rejection). RESEARCH §Area 6 verified all 13 fields manually but there is no regression net.
3. **No test for malformed advisory payload in `proposal_accepted`** — the advisory turn could ship `{field: "tags", proposed_value: 12345}` (a tags-must-be-list violation per `_validate_value_for_field`). Currently this would be silently written to `recipes.tags` (also WR-03).
4. **No test for `in_reply_to_turn_id` pointing at a question turn in a DIFFERENT recipe** — `_apply_answer_turn` scopes the lookup to the same recipe, but the test at test_turns.py:265 only covers "ref points to a text turn" (wrong kind). Cross-recipe reference is T-26-12's primary attack surface.
5. **No test for position-lock contention** — RESEARCH §Area 3 verified the lock pattern; the suite has zero concurrency tests. At minimum, a pytest-asyncio test that fires two concurrent `POST /turns` against the same recipe and asserts both succeed with distinct positions would close the loop.
6. **No test for malformed `in_reply_to_turn_id` UUID** — the body schema types it as `UUID`, so Pydantic returns 422 on a bad string, but a test that confirms the 422 (rather than a 500 from a downstream DB lookup) would lock the contract.

**Fix:** Add the following test cases to `test_turns.py`. Each one is a 10-20 line addition; concrete templates:

```python
def test_url_turn_ssrf_blocked_records_failure(client, db_session, monkeypatch):
    """T-26-02: posting a url turn pointing at 169.254.169.254 must NOT fetch;
    the BackgroundTask records the failure via _record_failure.
    """
    from app.services import llm as llm_service
    monkeypatch.setattr(llm_service, "SessionLocal", lambda: db_session)
    # Override test-mode bypass so SSRF path runs
    monkeypatch.setattr("app.config.settings.environment", "production")
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    db_session.commit()
    resp = client.post(
        f"/recipes/{recipe.id}/turns",
        headers=AUTH_HEADERS,
        json={"kind": "url", "url": "http://169.254.169.254/latest/meta-data"},
    )
    assert resp.status_code == 201
    db_session.expire_all()
    refreshed = db_session.scalar(select(Recipe).where(Recipe.id == recipe.id))
    assert refreshed.status == "failed"  # OR per CR-01 fix, check turn.payload.extraction_error
    assert "SSRF" in (refreshed.promotion_error or "")


def test_answer_turn_rejects_out_of_range_value(client, db_session):
    """T-26-10 negative path: model_validator catches range violation (servings > 99)."""
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    q = _make_turn(db_session, recipe.id, 0, "question", sender="system", payload={"field": "servings"})
    db_session.commit()
    resp = client.post(
        f"/recipes/{recipe.id}/turns",
        headers=AUTH_HEADERS,
        json={"kind": "answer", "in_reply_to_turn_id": str(q.id), "field": "servings", "value": 100},
    )
    assert resp.status_code == 422


def test_answer_cross_recipe_question_ref_returns_422(client, db_session):
    """T-26-12: an answer in recipe A cannot reference a question turn in recipe B."""
    member = _seeded_member(db_session)
    recipe_a = _make_recipe(db_session, member.household_id, member.id)
    recipe_b = _make_recipe(db_session, member.household_id, member.id)
    q_in_b = _make_turn(db_session, recipe_b.id, 0, "question", sender="system",
                        payload={"field": "difficulty"})
    db_session.commit()
    resp = client.post(
        f"/recipes/{recipe_a.id}/turns",
        headers=AUTH_HEADERS,
        json={"kind": "answer", "in_reply_to_turn_id": str(q_in_b.id),
              "field": "difficulty", "value": "easy"},
    )
    assert resp.status_code == 422


def test_answer_turn_malformed_uuid_returns_422(client, db_session):
    member = _seeded_member(db_session)
    recipe = _make_recipe(db_session, member.household_id, member.id)
    db_session.commit()
    resp = client.post(
        f"/recipes/{recipe.id}/turns",
        headers=AUTH_HEADERS,
        json={"kind": "answer", "in_reply_to_turn_id": "not-a-uuid",
              "field": "difficulty", "value": "easy"},
    )
    assert resp.status_code == 422
```

### WR-06: Legacy `# TODO(productize)` marker in `recipes.py:635` was not removed

**File:** `backend/app/routers/recipes.py:635`
**Issue:** Plan 26-03 Sub-step 4 explicitly says: "Delete that line. Leave the rest of the handler unchanged ... Replace the deleted line with a one-line comment explaining the new flow." The TODO marker is still present at line 635. ROADMAP SC-3 states "the long-standing TODO(productize) at recipes.py:481-490 is closed" — but `grep "# TODO(productize): URL fetch"` still matches.

This is a small docs-vs-code drift, but it's the explicit Plan 26-03 acceptance criterion ("`grep '# TODO(productize): URL fetch + Gemini extraction' backend/app/routers/recipes.py` returns 0 matches"). The acceptance criterion was not met.

**Fix:** Open `recipes.py`, replace line 635 with the planned forward-pointer comment:
```python
# Phase 26: URL extraction now runs as a BackgroundTask on POST /recipes/{id}/turns
# (kind='url') via extract_and_process_url_turn. The legacy /recipes/url endpoint
# below stays put until Phase 27 retires the five-surface UI.
```

---

## Info

### IN-01: `_is_safe_url` does not handle IPv6 representations of private space

**File:** `backend/app/services/thread.py:65-111`
**Issue:** The user prompt asks specifically about "IPv6 representations of private space." Python's `ipaddress.ip_address("::1").is_loopback` is `True`, and `::ffff:127.0.0.1` (IPv4-mapped IPv6) is correctly detected by `is_loopback` because `ipaddress` treats it as the embedded IPv4. However, IPv6 ULA (`fc00::/7`) is detected via `is_private` per Python 3.12 `ipaddress` semantics. The implementation handles these cases correctly **for IP literals**.

The gap is hostname literals: if a URL is `http://[::ffff:10.0.0.1]/`, `urlparse` parses the hostname as `::ffff:10.0.0.1` (without brackets), which `ipaddress.ip_address` parses as the IPv4-mapped form and `is_private` returns True. Confirmed safe.

However, the `2002:` 6to4 transitional space and `fec0::/10` (deprecated site-local) are NOT explicitly blocked — they're "global" in Python's classification. At couple-scale this is fine. No action needed for v1, but worth a comment.

**Fix:** Add a one-line comment after `if not _is_safe_url(url):` in llm.py explaining the IPv6 coverage:
```python
# _is_safe_url covers IPv4 (RFC1918 + 127/8 + 169.254/16 + 0.0.0.0)
# and IPv6 ULA (fc00::/7) + loopback (::1) + IPv4-mapped IPv6 (::ffff:10.x).
# 6to4 (2002::/16) and deprecated site-local (fec0::/10) are not blocked;
# treated as global per ipaddress. Couple-scale risk accepted.
```

### IN-02: `_is_safe_url` `localhost` literal check is case-sensitive on the parsed hostname

**File:** `backend/app/services/thread.py:107-110`
**Issue:** `lower = host.lower()` correctly handles `LOCALHOST`, `LocalHost`, etc. But `urlparse("http://localhost/")` returns a hostname that's already lowercase per the URL spec, so this is more belt-and-suspenders than a real defense. The check correctly handles `http://LOCALHOST/` because Python's `urlparse.hostname` lowercases automatically. So the `lower()` call is a no-op here. Minor — no fix needed.

### IN-03: `AdvisoryTurnPayload.model_validate({"kind": "advisory", **(referenced.payload or {})})` shadows the persisted payload's `kind` if it had one

**File:** `backend/app/routers/recipes.py:885-887`
**Issue:** Order of dict spread: `{"kind": "advisory", **payload}` — if `payload` happens to contain a `kind` key (it shouldn't, because `body.model_dump(mode="json", exclude={"kind"})` strips it at write-time — recipes.py:989), the spread **would override** the leading "advisory" value. Since the write path strips `kind`, this is defensive correctness rather than an active bug. But the order is wrong if the goal is "force kind to advisory regardless of payload contents." Reverse the spread to lock the discriminator:

**Fix:**
```python
advisory_payload = AdvisoryTurnPayload.model_validate(
    {**(referenced.payload or {}), "kind": "advisory"}
)
```

### IN-04: `extract_and_process_url_turn` uses `turn.payload.get("url", "")` without re-validating against schema

**File:** `backend/app/services/llm.py:772-776`
**Issue:** The url-turn payload was validated by `UrlTurnPayload` at POST time (kind=url, url=str, extracted_html_path=None). The BackgroundTask re-reads `turn.payload.get("url", "")` and uses an empty-string fallback to trigger `ValueError("url turn has no url in payload")`. This is fine but doesn't catch the case where the payload was somehow stored as `{"url": null}` (would coerce through `.get("url", "")` to `None`, then `None.startswith(...)` later in `_is_safe_url` is None-safe). Minor: just confirms the defensive coding works.

No fix needed. Worth a one-line comment:
```python
url = turn.payload.get("url") or ""  # empty-string fallback for backfilled/malformed payloads
```

(Switching `.get("url", "")` → `.get("url") or ""` makes the None-vs-empty conflation explicit and is a one-character edit.)

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
