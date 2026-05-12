---
phase: 24
plan: 05
type: execute
wave: 2
depends_on: [24-04]
files_modified:
  - backend/alembic/versions/0008_add_recipe_illustration_svg.py
  - backend/app/models/recipe.py
  - backend/app/schemas/recipe.py
  - backend/app/services/svg_sanitizer.py
  - backend/app/services/svg_sanitizer_test.py
  - backend/app/services/llm.py
  - backend/app/services/llm_fixtures.py
  - backend/app/cli/seed.py
  - frontend/lib/recipes.ts
  - frontend/components/RecipeIllustration.tsx
  - frontend/components/RecipeDraftCard.tsx
  - frontend/components/RecipeCard.tsx
autonomous: true
requirements: [RID-05]
requirements_addressed: [RID-05]
tags: [backend, alembic, llm, svg, sanitizer, security, frontend, dangerously-set-inner-html]

must_haves:
  truths:
    - "Alembic migration 0008 adds recipes.illustration_svg TEXT NULL column; revision=0008, down_revision=0007"
    - "Recipe SQLAlchemy model has the new illustration_svg mapped column"
    - "RecipeResponse Pydantic schema exposes illustration_svg; _to_response_payload (and therefore recipe.promoted broadcasts) include it"
    - "backend/app/services/svg_sanitizer.py implements sanitize_recipe_svg(raw) -> Optional[str] using stdlib xml.etree.ElementTree with strict allowlist (D-33)"
    - "Sanitizer rejects (returns None) for: oversized >4KB, malformed XML, disallowed tags (script/foreignObject/text/image/use/a/style), on*= event handler attrs, style= attr, xlink:href / *href* attrs, CDATA / comments / processing instructions; preserves only {svg, path} elements with whitelisted attrs"
    - "Sanitizer normalizes viewBox to 0 0 160 160 + ensures stroke=currentColor + fill=none on the root svg"
    - "Unit tests in backend/app/services/svg_sanitizer_test.py cover all 12 rejection cases from D-33 (the central RID-05 security exit criterion) plus the happy-path acceptance"
    - "services/llm.py exports generate_recipe_illustration(recipe_title, recipe_context) that calls Gemini in plain-text mode and returns the raw SVG string (caller applies sanitizer)"
    - "All four BackgroundTask bodies (promote_voice_draft, promote_photo_draft, promote_quick_draft, promote_full_draft) call generate_recipe_illustration + sanitize_recipe_svg and write recipe.illustration_svg (or NULL on failure)"
    - "Illustration failure NEVER affects recipe status (D-36) — the task continues with the rest of promotion"
    - "Frontend Recipe type includes illustration_svg?: string | null"
    - "RecipeIllustration component renders the sanitized SVG via dangerouslySetInnerHTML when non-empty, else falls back to BrandIcon (from RID-01) — with a code comment justifying the dangerouslySetInnerHTML use per D-38"
    - "RecipeDraftCard (inbox row) and RecipeCard (library row) replace their leading icon slot with <RecipeIllustration recipe size={40} />"
    - "Seed script populates illustration_svg with the canned SVG on the same 3+ recipes that got RID-02 fields, so Playwright fixtures can assert rendering"
  artifacts:
    - path: "backend/alembic/versions/0008_add_recipe_illustration_svg.py"
      provides: "Migration 0008 adding illustration_svg TEXT NULL column"
      contains: "illustration_svg"
    - path: "backend/app/models/recipe.py"
      provides: "Recipe model with illustration_svg mapped column"
      contains: "illustration_svg"
    - path: "backend/app/schemas/recipe.py"
      provides: "RecipeResponse exposes illustration_svg"
      contains: "illustration_svg"
    - path: "backend/app/services/svg_sanitizer.py"
      provides: "sanitize_recipe_svg(raw: str) -> Optional[str] with allowlist + normalization"
      contains: "sanitize_recipe_svg"
    - path: "backend/app/services/svg_sanitizer_test.py"
      provides: "Unit tests covering 12 rejection cases + happy path"
      contains: "sanitize_recipe_svg"
    - path: "backend/app/services/llm.py"
      provides: "generate_recipe_illustration() + all four BackgroundTask bodies extended to generate+sanitize+persist"
      contains: "generate_recipe_illustration"
    - path: "frontend/components/RecipeIllustration.tsx"
      provides: "Component rendering sanitized SVG via dangerouslySetInnerHTML; BrandIcon fallback"
      contains: "dangerouslySetInnerHTML"
    - path: "frontend/components/RecipeDraftCard.tsx"
      provides: "Inbox row uses RecipeIllustration in leading slot"
      contains: "<RecipeIllustration"
    - path: "frontend/components/RecipeCard.tsx"
      provides: "Library row uses RecipeIllustration as overlay or accent"
      contains: "<RecipeIllustration"
  key_links:
    - from: "backend/app/services/llm.py BackgroundTask bodies"
      to: "backend/app/services/svg_sanitizer.py sanitize_recipe_svg"
      via: "sanitize_recipe_svg(raw_svg) called BEFORE persisting recipe.illustration_svg"
      pattern: "sanitize_recipe_svg\\("
    - from: "frontend/components/RecipeIllustration.tsx"
      to: "frontend/components/BrandIcon.tsx (RID-01 fallback)"
      via: "if recipe.illustration_svg is non-empty render via dangerouslySetInnerHTML else <BrandIcon>"
      pattern: "BrandIcon"
    - from: "backend/app/schemas/recipe.py RecipeResponse"
      to: "frontend/lib/recipes.ts Recipe type"
      via: "illustration_svg field flows from backend to frontend via the existing /api/recipes/* endpoints"
      pattern: "illustration_svg"
---

<objective>
Phase 24 / RID-05 — Per-recipe SVG illustration. Add the `recipes.illustration_svg TEXT` column, build a server-side allowlist SVG sanitizer (reject-and-fallback), add the `generate_recipe_illustration()` Gemini helper, extend all four BackgroundTask bodies to generate + sanitize + persist illustrations, build the frontend `RecipeIllustration` component (with `BrandIcon` fallback from RID-01), and mount it on the inbox + library list-row components.

Purpose: Give every captured recipe a small monochrome line-art illustration in list views so the inbox and recipes library feel visually distinct per item. The sanitizer is the central security surface of Phase 24 — its allowlist enforces that no `<script>`, `<foreignObject>`, `<text>`, `<image>`, `<use>`, `<a>`, `<style>`, `on*=`, `style=`, or `xlink:href` content ever reaches the client `dangerouslySetInnerHTML` boundary. Closes gh#12.

Output: 1 new Alembic migration (0008), 1 new sanitizer module + tests, 1 new frontend component, plus modifications to the Recipe model, Pydantic schema, llm.py (illustration helper + 4 BackgroundTask extensions), seed script, frontend Recipe type, RecipeDraftCard, and RecipeCard. All in one atomic commit.
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
@backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py
@backend/app/models/recipe.py
@backend/app/schemas/recipe.py
@backend/app/services/llm.py
@backend/app/services/llm_fixtures.py
@backend/app/cli/seed.py
@frontend/lib/recipes.ts
@frontend/components/RecipeDraftCard.tsx
@frontend/components/RecipeCard.tsx
@frontend/components/BrandIcon.tsx
</context>

<interfaces>
<!-- Key types and primitives the executor needs. Extracted from codebase. No exploration required. -->

Alembic next free revision: **0008** (24-02 Task 1 shipped 0007). down_revision = "0007".

Sanitizer allowlist (D-33 — STRICT, do not improvise):
```
ALLOWED_TAGS         = {"svg", "path"}
ALLOWED_SVG_ATTRS    = {"viewBox", "xmlns", "fill", "stroke", "stroke-linecap", "width", "height"}
ALLOWED_PATH_ATTRS   = {"d", "stroke", "fill", "stroke-width", "stroke-linecap", "stroke-linejoin"}
MAX_BYTES            = 4096
```

Rejection criteria (each MUST be a test case):
1. Oversized SVG (>4096 bytes) → reject before parse
2. Malformed XML (ParseError) → reject
3. Disallowed tag — script, foreignObject, text, image, use, a, style, defs, g — reject
4. Event handler attribute (starts with "on") — onclick, onload, onerror, onmouseover — reject
5. style= attribute (CSS injection vector) — reject
6. xlink:href or any "href"-containing attribute (data: URI vector) — reject
7. CDATA section — reject (CDATA inside element content arrives via ET as text; the safer posture is to reject elements that contain CDATA markers; check raw input for "<![CDATA[" substring before parsing)
8. XML comments — reject (similarly, check raw for "<!--" before parsing, OR use ET's iter_events to detect comments)
9. Processing instructions — reject (similarly, check raw for "<?" or use iter to detect PI nodes)
10. XML entity expansion (XXE) — stdlib ET in Python 3.12 already raises ParseError on undefined entity expansion (RESEARCH.md §Target 1 verified empirically). Test asserts this.

Sanitizer normalization (D-34, on success):
- viewBox attribute REWRITTEN to "0 0 160 160"
- If root svg has no stroke attr → set stroke="currentColor"
- If root svg has no fill attr → set fill="none"

`generate_recipe_illustration` Gemini call shape (RESEARCH.md §Target 1, D-32):
- Plain-text mode (no response_schema), same shape as `rewrite_title()` from 24-04.
- Prompt: a verbatim French instruction asking Gemini to emit a monochrome line-art SVG with the constraints stroke=currentColor / fill=none / viewBox=0 0 160 160 / 1-3 paths max / no text.
- Returns the raw response.text; caller passes it through `sanitize_recipe_svg`.

Frontend Recipe type (extend `frontend/lib/recipes.ts`): add `illustration_svg?: string | null`. The existing list rows (RecipeDraftCard, RecipeCard) currently render a fixed-color leading slot (e.g., `<div className="h-16 w-16 ... bg-surface-muted" />` in RecipeDraftCard line 106-107). RID-05 replaces that with `<RecipeIllustration recipe size={...} />`.

The four BackgroundTask bodies to extend:
- `promote_voice_draft(recipe_id, transcript)` — services/llm.py:368-393
- `promote_photo_draft(recipe_id, photo_bytes_list)` — services/llm.py:395-418
- `promote_quick_draft(recipe_id)` — services/llm.py from 24-04 Task 3
- `promote_full_draft(recipe_id)` — services/llm.py from 24-04 Task 3

Each gets a try/except wrapper that calls `generate_recipe_illustration` + `sanitize_recipe_svg` and writes the result to `recipe.illustration_svg` (or leaves NULL on failure). Failure NEVER affects `recipe.status` per D-36.
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Alembic migration 0008 — add recipes.illustration_svg TEXT column (RID-05 / D-35)</name>
  <files>backend/alembic/versions/0008_add_recipe_illustration_svg.py</files>
  <read_first>
    - backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py (from 24-02 — revision 0007 is the new down_revision)
    - backend/alembic/versions/0003_promotion_columns.py (nullable single-column template)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-35
  </read_first>
  <action>
    Create NEW file `backend/alembic/versions/0008_add_recipe_illustration_svg.py` with EXACTLY this content:

    ```python
    """Phase 24 RID-05 — add illustration_svg column.

    recipes.illustration_svg TEXT NULL — sanitized server-side LLM-generated SVG
    rendered on inbox + library list rows via dangerouslySetInnerHTML. NULL
    means "not yet generated" OR "rejected by sanitizer" — the frontend treats
    both identically (BrandIcon fallback per D-37).
    """

    from __future__ import annotations

    from typing import Sequence, Union

    import sqlalchemy as sa
    from alembic import op


    revision: str = "0008"
    down_revision: Union[str, None] = "0007"
    branch_labels: Union[str, Sequence[str], None] = None
    depends_on: Union[str, Sequence[str], None] = None


    def upgrade() -> None:
        op.add_column(
            "recipes",
            sa.Column("illustration_svg", sa.Text(), nullable=True),
        )


    def downgrade() -> None:
        op.drop_column("recipes", "illustration_svg")
    ```

    Specifically:
    - `revision = "0008"` and `down_revision = "0007"`.
    - Single nullable column add — no CHECK constraint (the application-layer sanitizer is the only gate; the DB stores arbitrary TEXT).
    - Mirrors the 0003 promotion_columns.py shape (additive nullable).
    - Trailing newline at end of file.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -c "revision: str = \"0008\"" alembic/versions/0008_add_recipe_illustration_svg.py</automated>
  </verify>
  <acceptance_criteria>
    - `test -f /Users/gulu3001/dev/al-dente/backend/alembic/versions/0008_add_recipe_illustration_svg.py && echo OK` prints OK.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "revision: str = \"0008\"" alembic/versions/0008_add_recipe_illustration_svg.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "down_revision: Union\\[str, None\\] = \"0007\"" alembic/versions/0008_add_recipe_illustration_svg.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "op.add_column" alembic/versions/0008_add_recipe_illustration_svg.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "op.drop_column" alembic/versions/0008_add_recipe_illustration_svg.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "illustration_svg" alembic/versions/0008_add_recipe_illustration_svg.py` returns at least `2`.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run alembic upgrade head` exits 0; `uv run alembic current` reports 0008 (head).
  </acceptance_criteria>
  <done>
    Migration 0008 exists, declares revision 0008 / down_revision 0007, adds a single nullable TEXT column for illustration_svg, downgrades cleanly. Local `alembic upgrade head` applies successfully.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add illustration_svg column to Recipe model + RecipeResponse schema (RID-05 / D-35, D-39)</name>
  <files>backend/app/models/recipe.py, backend/app/schemas/recipe.py</files>
  <read_first>
    - backend/app/models/recipe.py (current state — Recipe class, after 24-02 already has cook_time/difficulty/description)
    - backend/app/schemas/recipe.py (current state — RecipeResponse, after 24-02 already has cook_time/difficulty/description)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-35, §D-39
  </read_first>
  <action>
    Two sub-edits.

    SUB-EDIT 2A — Add `illustration_svg` to `backend/app/models/recipe.py` Recipe class. Place IMMEDIATELY AFTER the `description` mapped column added by 24-02 Task 2:

    ```python
        description: Mapped[str | None] = mapped_column(Text, nullable=True)
        # Phase 24 RID-05 (migration 0008) — per-recipe LLM-generated SVG
        # illustration. Server-side sanitized via services/svg_sanitizer.py
        # before storage; NULL means "not yet generated" OR "rejected by
        # sanitizer". Frontend falls back to BrandIcon (RID-01) for either case.
        illustration_svg: Mapped[str | None] = mapped_column(Text, nullable=True)
    ```

    Do NOT add a CheckConstraint — the sanitizer is the gate; DB stores arbitrary TEXT.

    SUB-EDIT 2B — Add `illustration_svg` to `backend/app/schemas/recipe.py` `RecipeResponse`. Place IMMEDIATELY AFTER the `description` field added by 24-02 Task 4. The response uses plain `Optional[str]` (matches `cuisine` / `main_protein` response-side style):

    ```python
        # Phase 24 RID-02 — three optional recipe-identity fields.
        cook_time_minutes: Optional[int] = None
        difficulty: Optional[str] = None
        description: Optional[str] = None
        # Phase 24 RID-05 D-39 — sanitized SVG illustration. NULL when not
        # yet generated or rejected by the sanitizer. Frontend renders via
        # dangerouslySetInnerHTML with the trust boundary documented at the
        # call site (per D-38).
        illustration_svg: Optional[str] = None
    ```

    Do NOT add to `RecipeFullCreate` / `RecipeUpdate` — illustration is server-generated, not user-supplied. The only write path is the BackgroundTask bodies in Task 6.

    Verify the existing `_to_response_payload` in `backend/app/routers/recipes.py` uses `RecipeResponse.model_validate(recipe).model_dump(mode="json")` — since RecipeResponse now has illustration_svg, the field flows automatically through all read endpoints AND through `_broadcast_promoted` (which uses the same shape). No router changes needed for read-path exposure.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -cE "illustration_svg" app/models/recipe.py app/schemas/recipe.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "illustration_svg: Mapped\\[str | None\\] = mapped_column(Text, nullable=True)" app/models/recipe.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "illustration_svg: Optional\\[str\\] = None" app/schemas/recipe.py` returns `1`.
    - `RecipeFullCreate` / `RecipeUpdate` do NOT mention `illustration_svg`: `cd /Users/gulu3001/dev/al-dente/backend && grep -A 30 "class RecipeFullCreate" app/schemas/recipe.py | grep -c "illustration_svg"` returns `0` AND `grep -A 30 "class RecipeUpdate" app/schemas/recipe.py | grep -c "illustration_svg"` returns `0`.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.models.recipe import Recipe; assert 'illustration_svg' in Recipe.__table__.columns"` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.schemas.recipe import RecipeResponse; r = RecipeResponse.model_construct(id='0'*32, household_id='0'*32, created_by_member_id='0'*32, status='structured', title='x', source_capture={'type': 'manual'}, photo_paths=[], mood=[], seasonality=[], tags=[], cook_count=0, created_at='2026-05-13T00:00:00Z', updated_at='2026-05-13T00:00:00Z', illustration_svg='<svg/>'); assert r.illustration_svg == '<svg/>'"` exits 0.
  </acceptance_criteria>
  <done>
    Recipe model and RecipeResponse both expose `illustration_svg`. Write schemas (RecipeFullCreate / RecipeUpdate) do NOT — illustration is server-generated only.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Build server-side SVG sanitizer (RID-05 / D-33, D-34) — THE CENTRAL SECURITY SURFACE</name>
  <files>backend/app/services/svg_sanitizer.py</files>
  <read_first>
    - backend/pyproject.toml (verify lxml is NOT installed per RESEARCH.md §Target 1; stdlib ET is the correct choice)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-33, §D-34
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Pattern 5: SVG sanitizer (stdlib ElementTree, reject-and-fallback)"
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Target 1: SVG Sanitizer Implementation"
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Pitfall 2: ElementTree namespace in SVG tag names"
  </read_first>
  <action>
    Create NEW file `backend/app/services/svg_sanitizer.py`. Implement strict allowlist-only sanitization with reject-and-fallback (D-33) using stdlib `xml.etree.ElementTree` (lxml NOT in deps per RESEARCH §Target 1; stdlib ET in Python 3.12 is safe against XXE — verified empirically).

    Create the file with the following EXACT content (this is the verified shape from RESEARCH.md §Pattern 5 adapted with the additional CDATA/comments/PI checks from D-33):

    ```python
    """Phase 24 RID-05 — SVG sanitizer for LLM-generated recipe illustrations.

    D-33: reject-and-fallback. Allowlist-only. Strict.

      Allowed tags:        {svg, path}
      Allowed <svg> attrs: {viewBox, xmlns, fill, stroke, stroke-linecap, width, height}
      Allowed <path> attrs: {d, stroke, fill, stroke-width, stroke-linecap, stroke-linejoin}

    Rejected (entire input → None, frontend falls back to BrandIcon per D-37):
      - any tag NOT in allowed set (script, foreignObject, text, image, use, a,
        style, defs, g, ...)
      - any attribute name starting with "on" (event handlers — onclick/load/error)
      - style= attribute (CSS injection)
      - href or xlink:href attribute (data: URI / link injection)
      - oversized input (>4096 bytes per D-34)
      - malformed XML
      - CDATA sections
      - XML comments
      - XML processing instructions

    D-34: on accept, normalize viewBox to "0 0 160 160" and ensure stroke=currentColor
    + fill=none on the root <svg> (so the icon tints with parent text color and
    doesn't paint solid).

    Why stdlib xml.etree.ElementTree (not defusedxml or lxml):
      - lxml is absent from pyproject.toml (verified 2026-05-13).
      - stdlib ET in Python 3.12 raises ET.ParseError on undefined entity expansion
        attempts — NOT vulnerable to XXE via DTD entity injection (RESEARCH §Target 1
        verified empirically: parsing '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>...'
        raises ParseError, does not resolve the entity).
      - defusedxml adds belt-and-suspenders protection but is redundant here.

    Namespace handling: Gemini returns <svg xmlns="http://www.w3.org/2000/svg">.
    ET parses the root tag as "{http://www.w3.org/2000/svg}svg" by default. We
    strip the namespace prefix before allowlist comparison (RESEARCH §Pitfall 2).
    """

    from __future__ import annotations

    import logging
    import xml.etree.ElementTree as ET
    from typing import Optional

    log = logging.getLogger(__name__)

    _ALLOWED_TAGS = frozenset({"svg", "path"})
    _ALLOWED_SVG_ATTRS = frozenset({
        "viewBox", "xmlns", "fill", "stroke", "stroke-linecap", "width", "height",
    })
    _ALLOWED_PATH_ATTRS = frozenset({
        "d", "stroke", "fill", "stroke-width", "stroke-linecap", "stroke-linejoin",
    })
    _MAX_BYTES = 4096

    # Pre-parse rejection markers — these characters/sequences in the raw text
    # are not safe to feed to ET (CDATA / comments / PIs are valid XML but the
    # allowlist disallows them on the output side; rejecting them pre-parse is
    # simpler than walking the ET tree's iter_events).
    _FORBIDDEN_SUBSTRINGS = ("<![CDATA[", "<!--", "<?")


    def _strip_namespace(tag: str) -> str:
        """ET prefixes tags with '{namespace}'; strip for allowlist comparison."""
        if tag.startswith("{"):
            return tag.split("}", 1)[1]
        return tag


    def sanitize_recipe_svg(raw: str) -> Optional[str]:
        """Return a sanitized SVG string, or None if ANY allowlist violation found.

        The returned string is safe to render via dangerouslySetInnerHTML AT THE
        TRUST BOUNDARY ESTABLISHED BY THIS FUNCTION. The frontend's RecipeIllustration
        component carries a code comment documenting that boundary per D-38.
        """
        # 1. Size cap (D-34). Reject before parse — saves ET work on oversized input.
        if len(raw.encode("utf-8")) > _MAX_BYTES:
            log.warning("svg_sanitizer: rejected oversized SVG (%d bytes)", len(raw.encode("utf-8")))
            return None

        # 2. Pre-parse rejection of CDATA / comments / PIs (D-33).
        # ET's default parser silently drops comments and PIs from the element
        # tree, so we cannot detect them by walking the result. Reject at the
        # raw-string layer instead.
        for marker in _FORBIDDEN_SUBSTRINGS:
            if marker in raw:
                log.warning("svg_sanitizer: rejected forbidden marker %r", marker)
                return None

        # 3. Parse. ET raises ParseError on malformed XML AND on undefined entity
        # expansion (XXE safety in Python 3.12 stdlib per RESEARCH §Target 1).
        try:
            root = ET.fromstring(raw)
        except ET.ParseError as exc:
            log.warning("svg_sanitizer: XML parse error: %s", exc)
            return None

        # 4. Allowlist walk. Iterate every element (root + descendants). Reject
        # on ANY disallowed tag or attribute.
        for elem in root.iter():
            tag = _strip_namespace(elem.tag)

            if tag not in _ALLOWED_TAGS:
                log.warning("svg_sanitizer: rejected disallowed tag <%s>", tag)
                return None

            allowed = _ALLOWED_SVG_ATTRS if tag == "svg" else _ALLOWED_PATH_ATTRS

            for attr_name in list(elem.attrib.keys()):
                # Strip namespace on attribute names too (xlink:href arrives as
                # "{http://www.w3.org/1999/xlink}href").
                clean_attr = _strip_namespace(attr_name)

                # Reject event handlers (on*=).
                if clean_attr.startswith("on"):
                    log.warning("svg_sanitizer: rejected event handler attr %r", attr_name)
                    return None
                # Reject style= (CSS injection).
                if clean_attr == "style":
                    log.warning("svg_sanitizer: rejected style= attr")
                    return None
                # Reject any href-like attribute (data: URI / link injection).
                if "href" in clean_attr.lower():
                    log.warning("svg_sanitizer: rejected href-like attr %r", attr_name)
                    return None
                # Reject explicit xlink namespace.
                if attr_name.startswith("{") and "xlink" in attr_name.lower():
                    log.warning("svg_sanitizer: rejected xlink namespace attr %r", attr_name)
                    return None

                if clean_attr not in allowed:
                    log.warning("svg_sanitizer: rejected disallowed attr %r on <%s>", attr_name, tag)
                    return None

        # 5. Normalization on accept (D-34).
        root.attrib["viewBox"] = "0 0 160 160"
        # Re-key to clean attribute names (strip any remaining namespace prefix
        # on the root). For attrs not currently set, supply sane defaults so
        # the rendered SVG inherits text color and doesn't fill solid.
        existing_stroke = root.attrib.get("stroke")
        if not existing_stroke:
            root.attrib["stroke"] = "currentColor"
        existing_fill = root.attrib.get("fill")
        if not existing_fill:
            root.attrib["fill"] = "none"

        # 6. Serialize. ET.tostring with encoding="unicode" returns a str
        # (vs bytes); we strip any xmlns="..." default-namespace attribute ET
        # added back during the round-trip — the frontend doesn't need it for
        # inline SVG rendering.
        serialized = ET.tostring(root, encoding="unicode")

        # 7. Final size sanity check on the SERIALIZED form (in case normalization
        # somehow inflated past the cap).
        if len(serialized.encode("utf-8")) > _MAX_BYTES:
            log.warning("svg_sanitizer: serialized SVG exceeded cap (%d bytes)", len(serialized.encode("utf-8")))
            return None

        return serialized
    ```

    Specifically:
    - Use stdlib ET — `lxml` is NOT in `pyproject.toml`, confirmed via RESEARCH.md §Target 1.
    - The pre-parse forbidden-substring check is the simplest way to reject CDATA / comments / PIs because ET silently drops them in the default parser; checking the raw text avoids the need for an event-driven parser.
    - The namespace-strip helper handles both element tags AND attribute names (xlink:href arrives as a namespaced attribute name).
    - The `href in clean_attr.lower()` check catches both `href` (HTML-style) and any other href-bearing variant. Combined with the explicit xlink-namespace check, both common data-URI attack vectors are blocked.
    - The viewBox normalization REWRITES (not appends) so even if Gemini returns a different viewBox, the rendered icon stays in the 0 0 160 160 coordinate system at 40x40 list-row scale.
    - Do NOT add a `strip_and_keep` mode (deferred per D-33 / Deferred Ideas — reject-and-fallback only).
    - Trailing newline at end of file.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -c "def sanitize_recipe_svg" app/services/svg_sanitizer.py</automated>
  </verify>
  <acceptance_criteria>
    - `test -f /Users/gulu3001/dev/al-dente/backend/app/services/svg_sanitizer.py && echo OK` prints OK.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "def sanitize_recipe_svg(raw: str) -> Optional\\[str\\]:" app/services/svg_sanitizer.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "_ALLOWED_TAGS = frozenset({\"svg\", \"path\"})" app/services/svg_sanitizer.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "_MAX_BYTES = 4096" app/services/svg_sanitizer.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "import xml.etree.ElementTree as ET" app/services/svg_sanitizer.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "lxml\\|defusedxml" app/services/svg_sanitizer.py` returns `0` (stdlib only).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "0 0 160 160" app/services/svg_sanitizer.py` returns `1` (viewBox normalization).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "currentColor" app/services/svg_sanitizer.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "_FORBIDDEN_SUBSTRINGS" app/services/svg_sanitizer.py` returns at least `2` (defn + usage).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "_strip_namespace" app/services/svg_sanitizer.py` returns at least `3` (defn + 2 usages).
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.services.svg_sanitizer import sanitize_recipe_svg; result = sanitize_recipe_svg('<svg viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M10 10 L 90 90\"/></svg>'); assert result is not None and '0 0 160 160' in result"` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.services.svg_sanitizer import sanitize_recipe_svg; assert sanitize_recipe_svg('<svg><script>alert(1)</script></svg>') is None"` exits 0.
  </acceptance_criteria>
  <done>
    `services/svg_sanitizer.py` exists with strict allowlist sanitization. Stdlib ET only. CDATA/comments/PIs rejected pre-parse. Namespaces stripped before allowlist check. viewBox normalized to 0 0 160 160. currentColor/fill=none defaults set. Reject-and-fallback (returns None on ANY violation).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Unit tests covering all 12 sanitizer rejection cases + happy path (RID-05 / D-33 — central security exit criterion)</name>
  <files>backend/app/services/svg_sanitizer_test.py</files>
  <read_first>
    - backend/app/services/svg_sanitizer.py (from Task 3 — the contract)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-33 (the explicit rejection-case list)
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Security Domain" → "Required rejection test cases"
    - backend/pyproject.toml (verify pytest is available; tests run via `uv run pytest backend/app/services/svg_sanitizer_test.py`)
  </read_first>
  <behavior>
    Tests MUST cover all 12 cases from D-33 / RESEARCH §Security:
    1. Clean line-art SVG (1 path, valid attrs) — ACCEPTS; returns sanitized SVG containing `viewBox="0 0 160 160"`.
    2. `<script>` inside `<svg>` — REJECTS (returns None).
    3. `<foreignObject>` — REJECTS.
    4. `<text>` — REJECTS.
    5. `<image>` — REJECTS.
    6. `<use>` — REJECTS.
    7. `<a>` (link injection) — REJECTS.
    8. `<style>` (CSS injection) — REJECTS.
    9. `onclick="..."` attribute — REJECTS.
    10. Any `on*=` event handler — REJECTS (test `onload`, `onerror`, `onmouseover`).
    11. `style="..."` attribute — REJECTS.
    12. `xlink:href` and `href` attribute (data: URI vector) — REJECTS.
    13. CDATA section — REJECTS.
    14. XML comment `<!-- -->` — REJECTS.
    15. XML processing instruction `<?xml-stylesheet ...?>` — REJECTS.
    16. XXE entity expansion `<!DOCTYPE ... <!ENTITY xxe SYSTEM ...>>` — REJECTS (via stdlib ET ParseError).
    17. Oversized SVG (>4096 bytes) — REJECTS.
    18. Malformed XML — REJECTS.
    19. Namespace handling: SVG with `xmlns="http://www.w3.org/2000/svg"` — still ACCEPTS (tag namespace is stripped before allowlist check).
    20. viewBox normalization: input with viewBox="50 50 100 100" is rewritten to "0 0 160 160" on accept.
    21. Default attribute injection: SVG without `stroke=` gets `stroke="currentColor"`; without `fill=` gets `fill="none"`.
  </behavior>
  <action>
    Create NEW file `backend/app/services/svg_sanitizer_test.py` with pytest-style tests covering ALL the cases above. Use plain pytest assertions (the project uses `uv run pytest` per backend/pyproject.toml — verify pytest is in dependencies).

    Use the following content as the basis (the executor adapts test names if pytest collection has constraints):

    ```python
    """Phase 24 RID-05 — unit tests for the SVG sanitizer.

    The sanitizer is the central security surface of Phase 24 — these tests are
    a NON-NEGOTIABLE exit criterion for the plan (per RESEARCH §Security Domain).
    Every D-33 rejection case has an explicit test below.

    Run: cd backend && uv run pytest app/services/svg_sanitizer_test.py -v
    """

    from __future__ import annotations

    import pytest

    from app.services.svg_sanitizer import sanitize_recipe_svg


    # --- Happy path -----------------------------------------------------------

    CLEAN_SVG = (
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" '
        'fill="none" stroke="currentColor">'
        '<path d="M10 10 L 90 90" stroke-width="2"/>'
        '</svg>'
    )


    def test_accepts_clean_line_art_svg():
        result = sanitize_recipe_svg(CLEAN_SVG)
        assert result is not None
        assert '<path' in result
        # viewBox normalization (D-34).
        assert '0 0 160 160' in result


    def test_normalizes_viewBox_on_accept():
        raw = '<svg viewBox="50 50 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10"/></svg>'
        result = sanitize_recipe_svg(raw)
        assert result is not None
        assert '0 0 160 160' in result
        assert '50 50 100 100' not in result


    def test_injects_default_stroke_and_fill_when_missing():
        raw = '<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg"><path d="M10 10 L 90 90"/></svg>'
        result = sanitize_recipe_svg(raw)
        assert result is not None
        assert 'stroke="currentColor"' in result
        assert 'fill="none"' in result


    def test_accepts_svg_with_explicit_namespace():
        # Even with xmlns set, the tag-namespace strip must work.
        raw = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path d="M0 0"/></svg>'
        assert sanitize_recipe_svg(raw) is not None


    # --- Disallowed tags (D-33) -----------------------------------------------

    @pytest.mark.parametrize("malicious", [
        '<svg><script>alert(1)</script></svg>',
        '<svg><foreignObject><div>hack</div></foreignObject></svg>',
        '<svg><text x="0" y="20">leak</text></svg>',
        '<svg><image href="data:image/png;base64,AAAA"/></svg>',
        '<svg><use href="#x"/></svg>',
        '<svg><a href="javascript:alert(1)"><path d="M0 0"/></a></svg>',
        '<svg><style>.x { background: url(javascript:alert(1)); }</style></svg>',
        '<svg><defs><filter id="f"/></defs></svg>',
        '<svg><g><path d="M0 0"/></g></svg>',
    ])
    def test_rejects_disallowed_tag(malicious):
        assert sanitize_recipe_svg(malicious) is None


    # --- Disallowed attributes (D-33) -----------------------------------------

    @pytest.mark.parametrize("malicious", [
        '<svg onclick="alert(1)"><path d="M0 0"/></svg>',
        '<svg onload="alert(1)"><path d="M0 0"/></svg>',
        '<svg><path d="M0 0" onerror="alert(1)"/></svg>',
        '<svg><path d="M0 0" onmouseover="alert(1)"/></svg>',
    ])
    def test_rejects_event_handler_attribute(malicious):
        assert sanitize_recipe_svg(malicious) is None


    def test_rejects_style_attribute():
        raw = '<svg style="display: none"><path d="M0 0"/></svg>'
        assert sanitize_recipe_svg(raw) is None


    def test_rejects_path_style_attribute():
        raw = '<svg><path d="M0 0" style="fill: red"/></svg>'
        assert sanitize_recipe_svg(raw) is None


    @pytest.mark.parametrize("malicious", [
        '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M0 0" xlink:href="data:image/png;base64,AAAA"/></svg>',
        '<svg><path d="M0 0" href="javascript:alert(1)"/></svg>',
    ])
    def test_rejects_href_attribute(malicious):
        assert sanitize_recipe_svg(malicious) is None


    # --- Structural rejections (CDATA / comments / PIs / XXE) -----------------

    def test_rejects_cdata_section():
        raw = '<svg><![CDATA[<script>alert(1)</script>]]><path d="M0 0"/></svg>'
        assert sanitize_recipe_svg(raw) is None


    def test_rejects_xml_comment():
        raw = '<svg><!-- malicious comment --><path d="M0 0"/></svg>'
        assert sanitize_recipe_svg(raw) is None


    def test_rejects_processing_instruction():
        raw = '<?xml-stylesheet href="malicious.xsl"?><svg><path d="M0 0"/></svg>'
        assert sanitize_recipe_svg(raw) is None


    def test_rejects_xxe_entity_expansion():
        # stdlib ET in Python 3.12 raises ParseError on undefined entity expansion.
        # RESEARCH §Target 1 confirmed empirically.
        raw = (
            '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'
            '<svg><path d="&xxe;"/></svg>'
        )
        assert sanitize_recipe_svg(raw) is None


    # --- Size + malformed -----------------------------------------------------

    def test_rejects_oversized_svg():
        # 4097 bytes — one over the cap.
        big_d = "L 1 1 " * 800  # ~6400 chars; well over 4096 bytes
        raw = f'<svg viewBox="0 0 160 160"><path d="M0 0 {big_d}"/></svg>'
        assert len(raw.encode("utf-8")) > 4096
        assert sanitize_recipe_svg(raw) is None


    def test_rejects_malformed_xml():
        assert sanitize_recipe_svg('<svg><path d="M0 0"></svg>') is None  # missing close
        assert sanitize_recipe_svg('not xml at all') is None
        assert sanitize_recipe_svg('') is None


    # --- Negative cases that look like positives but aren't --------------------

    def test_rejects_when_root_is_not_svg():
        raw = '<div><svg><path d="M0 0"/></svg></div>'
        # ET treats <div> as the root; "div" not in {svg, path} → reject.
        assert sanitize_recipe_svg(raw) is None
    ```

    Specifically:
    - All 21 behaviors from the `<behavior>` block must have at least one test case.
    - Pytest parametrize is used for multi-case coverage (disallowed tags / event handlers / href).
    - Tests assert ON the SANITIZER CONTRACT — `None` on reject, non-None string on accept (with the expected normalizations).
    - Do NOT mock the sanitizer; tests run against the real implementation.
    - File location: `backend/app/services/svg_sanitizer_test.py` (sibling of `svg_sanitizer.py`).
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente && uv run pytest backend/app/services/svg_sanitizer_test.py -v 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `test -f /Users/gulu3001/dev/al-dente/backend/app/services/svg_sanitizer_test.py && echo OK` prints OK.
    - `cd /Users/gulu3001/dev/al-dente && uv run pytest backend/app/services/svg_sanitizer_test.py -v` exits 0.
    - The pytest output reports at least 15 distinct test items (parametrized cases count individually).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "def test_" app/services/svg_sanitizer_test.py` returns at least `12`.
    - All four "script / foreignObject / text / image / use / a / style" rejection cases are covered (test_rejects_disallowed_tag parametrize matrix).
    - The XXE test case exists and passes: `cd /Users/gulu3001/dev/al-dente && uv run pytest backend/app/services/svg_sanitizer_test.py::test_rejects_xxe_entity_expansion -v` exits 0.
    - The 4 KB oversize test exists: `cd /Users/gulu3001/dev/al-dente && uv run pytest backend/app/services/svg_sanitizer_test.py::test_rejects_oversized_svg -v` exits 0.
    - Happy path test confirms normalization: `cd /Users/gulu3001/dev/al-dente && uv run pytest backend/app/services/svg_sanitizer_test.py::test_normalizes_viewBox_on_accept -v` exits 0.
  </acceptance_criteria>
  <done>
    `svg_sanitizer_test.py` exists with at least 12 distinct test functions (counting parametrized cases at least 15 total). All 21 behaviors from the `<behavior>` block have explicit coverage. `uv run pytest backend/app/services/svg_sanitizer_test.py` exits 0.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Add generate_recipe_illustration() helper + canned fixture (RID-05 / D-32)</name>
  <files>backend/app/services/llm.py, backend/app/services/llm_fixtures.py</files>
  <read_first>
    - backend/app/services/llm.py (rewrite_title from 24-04 Task 1 is the structural template)
    - backend/app/services/svg_sanitizer.py (from Task 3 — the consumer of the helper's output)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-32
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Pattern 2: rewrite_title()" (same plain-text Gemini call shape)
  </read_first>
  <action>
    Two sub-edits.

    SUB-EDIT 5A — Add `generate_recipe_illustration()` to `backend/app/services/llm.py`. Place it IMMEDIATELY AFTER `rewrite_title()` (from 24-04 Task 1) and BEFORE the "Helpers used by the BackgroundTask bodies" section header.

    Concrete shape (mirrors `rewrite_title()` structurally; the prompt differs):

    ```python
    # ---------------------------------------------------------------------------
    # Phase 24 RID-05 — per-recipe SVG illustration generation (D-32)
    # ---------------------------------------------------------------------------

    # Plain-text prompt — Gemini returns raw XML text. Caller passes through
    # services/svg_sanitizer.sanitize_recipe_svg before persisting.
    _ILLUSTRATION_PROMPT = (
        "Crée un pictogramme SVG simple représentant cette recette. "
        "Trait fin, monochrome. Utilise stroke='currentColor', fill='none', "
        "viewBox='0 0 160 160'. 1 à 3 paths maximum, pas de texte, pas de "
        "remplissage de couleur. Renvoie UNIQUEMENT le XML SVG, sans Markdown, "
        "sans préfixe."
    )


    def generate_recipe_illustration(recipe_title: str, recipe_context: dict[str, Any]) -> str:
        """Phase 24 RID-05 — generate a monochrome line-art SVG pictogram for a recipe.

        Returns the RAW Gemini output (unstripped, unsanitized). The caller MUST
        pass the result through services/svg_sanitizer.sanitize_recipe_svg before
        persisting. Returning the raw string keeps the trust boundary explicit:
        this function is the LLM call; the sanitizer is the security gate.

        recipe_context reserved for future enrichment (cuisine/main_protein could
        hint Gemini toward style choices). v1: title alone.
        """

        # D-04 test-mode shortcut: deterministic canned SVG for Playwright fixtures.
        if settings.environment == "test":
            from app.services.llm_fixtures import canned_recipe_illustration
            return canned_recipe_illustration(recipe_title)

        response = _gemini().models.generate_content(
            model=_GEMINI_MODEL,
            contents=[_ILLUSTRATION_PROMPT, recipe_title],
        )
        result = (response.text or "").strip()
        if not result:
            raise ValueError("Gemini returned empty illustration")
        return result
    ```

    Specifically:
    - Test-mode shortcut runs FIRST.
    - The Gemini call uses NO `config` argument (plain-text mode per RESEARCH §Pattern 2).
    - Returns the RAW Gemini output. Sanitization is the caller's responsibility (Task 6 BackgroundTask bodies).
    - Raises `ValueError` on empty response; raises whatever google-genai raises on API errors. Callers wrap in try/except (Task 6).
    - No length cap or output mutation here — the sanitizer is the gate.

    SUB-EDIT 5B — Add `canned_recipe_illustration()` to `backend/app/services/llm_fixtures.py`. Append after the existing canned functions:

    ```python
    # Phase 24 RID-05 D-32 — deterministic SVG for test mode. Passes the
    # sanitizer (uses only <svg> + <path> with allowed attrs). The returned
    # string is intentionally minimal so Playwright assertions on illustration
    # rendering can target a known shape.
    def canned_recipe_illustration(recipe_title: str) -> str:
        """Deterministic monochrome SVG pictogram for test mode (RID-05).

        Same __TEST_FORCE_FAIL__ convention as canned_voice_recipe: a title
        prefixed with the sentinel raises so the BackgroundTask hits the
        illustration-failure branch (which leaves illustration_svg=NULL per D-36
        but does NOT affect recipe.status).
        """
        if recipe_title.startswith("__TEST_FORCE_FAIL_ILLUSTRATION__"):
            raise RuntimeError(
                "Illustration forcée à échouer pour les tests (RID-05 D-36)."
            )
        return (
            '<svg viewBox="0 0 160 160" fill="none" stroke="currentColor" '
            'xmlns="http://www.w3.org/2000/svg">'
            '<path d="M 40 80 C 40 50, 70 30, 100 40 S 130 80, 100 100 S 50 110, 40 80 Z"/>'
            '</svg>'
        )
    ```

    Specifically:
    - The canned SVG uses ONLY allowed tags + attrs so it passes the sanitizer cleanly. The path is the BrandIcon's outer pasta-strand shape (so test renders look brand-coherent).
    - The force-failure sentinel `__TEST_FORCE_FAIL_ILLUSTRATION__` is distinct from `__TEST_FORCE_FAIL__` (used by `canned_voice_recipe` + `canned_rewritten_title`) so tests can independently force the illustration-failure path without affecting other steps.
    - Do NOT modify any existing canned_* function.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -cE "generate_recipe_illustration|canned_recipe_illustration" app/services/llm.py app/services/llm_fixtures.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "def generate_recipe_illustration(recipe_title: str, recipe_context: dict\\[str, Any\\]) -> str" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "_ILLUSTRATION_PROMPT" app/services/llm.py` returns at least `2` (defn + usage).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "Crée un pictogramme SVG simple" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "def canned_recipe_illustration" app/services/llm_fixtures.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "__TEST_FORCE_FAIL_ILLUSTRATION__" app/services/llm_fixtures.py` returns at least `1`.
    - The canned SVG is sanitizer-passing: `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "import os; os.environ['ENVIRONMENT']='test'; from app.services.llm import generate_recipe_illustration; from app.services.svg_sanitizer import sanitize_recipe_svg; raw = generate_recipe_illustration('Risotto', {}); assert sanitize_recipe_svg(raw) is not None"` exits 0.
    - The force-failure path raises: `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "import os; os.environ['ENVIRONMENT']='test'; from app.services.llm import generate_recipe_illustration; import pytest; pytest.raises(RuntimeError, lambda: generate_recipe_illustration('__TEST_FORCE_FAIL_ILLUSTRATION__ x', {}))" exits 0.
  </acceptance_criteria>
  <done>
    `services/llm.py` exports `generate_recipe_illustration()` + `_ILLUSTRATION_PROMPT`. `llm_fixtures.py` exports `canned_recipe_illustration` (deterministic + force-fail prefix). Test-mode roundtrip passes through the sanitizer cleanly.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 6: Extend all four BackgroundTask bodies to generate + sanitize + persist illustration (RID-05 / D-36)</name>
  <files>backend/app/services/llm.py</files>
  <read_first>
    - backend/app/services/llm.py (the four BackgroundTask bodies: promote_voice_draft, promote_photo_draft, promote_quick_draft, promote_full_draft)
    - backend/app/services/svg_sanitizer.py (from Task 3 — sanitize_recipe_svg)
    - backend/app/services/llm.py from Task 5 (generate_recipe_illustration)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-36 (failure NEVER affects status)
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Pattern 1: BackgroundTask body" (the illustration-call placement)
  </read_first>
  <action>
    Extend ALL FOUR BackgroundTask bodies in `backend/app/services/llm.py` to call `generate_recipe_illustration` + `sanitize_recipe_svg` and write `recipe.illustration_svg`. Per D-36, illustration failure must NEVER affect `recipe.status` — the illustration step is fire-and-forget within the broader promotion.

    Add this import at the top of `services/llm.py` (alongside the existing imports):
    ```python
    from app.services.svg_sanitizer import sanitize_recipe_svg
    ```

    Then for EACH of the four bodies, insert a `try/except` block that runs the illustration step ALONGSIDE the existing rewrite/extract logic. The illustration block sits INSIDE the outer `try` (so it shares the DB session) but in its own INNER `try/except` so a failure doesn't propagate out.

    The exact insertion pattern. For each BackgroundTask, find the SUCCESS branch — the code path between `_apply_extracted` (or `rewrite_title` for quick/full) and the `db.commit()` — and insert the illustration call there.

    Concrete pattern for `promote_voice_draft` (apply same pattern to promote_photo_draft / promote_quick_draft / promote_full_draft):

    Current (post-24-04):
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
            except Exception as exc:
                _record_failure(db, recipe, exc)
        finally:
            db.close()
    ```

    New (RID-05 — insert illustration step between `_apply_extracted` and `db.commit`):
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
                # Phase 24 RID-05 D-36 — illustration generation runs in same
                # BackgroundTask as the extract. Failure NEVER affects recipe.status;
                # we leave illustration_svg=NULL and continue with the rest of
                # promotion. The frontend falls back to BrandIcon for NULL svg.
                recipe.illustration_svg = _generate_and_sanitize_illustration(recipe.title)
                recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
                db.commit()
                db.refresh(recipe)
                _broadcast_promoted(recipe)
            except Exception as exc:
                _record_failure(db, recipe, exc)
        finally:
            db.close()
    ```

    Apply the SAME `recipe.illustration_svg = _generate_and_sanitize_illustration(recipe.title)` line to all four bodies, placed immediately after the success-side mutation (after `_apply_extracted` for voice/photo; after `recipe.title = new_title` for quick/full).

    Then add a NEW SHARED HELPER at the top of the BackgroundTask section (just before `promote_voice_draft`):

    ```python
    def _generate_and_sanitize_illustration(recipe_title: str) -> str | None:
        """Phase 24 RID-05 D-36 — generate + sanitize the per-recipe SVG illustration.

        Returns the sanitized SVG string on success, or None if either Gemini fails
        OR the sanitizer rejects the output. NEVER raises — the caller's broader
        try/except catches the catastrophic promotion-failure path; illustration
        failure is logged and silently downgrades to NULL (frontend BrandIcon fallback).
        """
        try:
            raw_svg = generate_recipe_illustration(recipe_title, {})
        except Exception as exc:  # noqa: BLE001
            log.warning("illustration generation failed for %r: %s", recipe_title, exc)
            return None
        sanitized = sanitize_recipe_svg(raw_svg)
        if sanitized is None:
            log.warning("illustration rejected by sanitizer for %r (raw=%r)", recipe_title, raw_svg[:200])
            return None
        return sanitized
    ```

    Specifically:
    - The helper takes ONLY `recipe_title` (the only piece the prompt uses); future enrichment passes `recipe_context` from the caller.
    - The helper NEVER raises — it returns None on either failure path. The caller assigns `recipe.illustration_svg = <result>`; the column accepts NULL.
    - The illustration step is wrapped in `_generate_and_sanitize_illustration` (NOT inline in each BackgroundTask) for DRY — four call sites otherwise become four maintenance burdens.
    - The placement INSIDE the outer try (with `_apply_extracted` / `rewrite_title`) means an illustration failure DOES NOT trigger `_record_failure` / `_record_rewrite_failure` — the helper's inner try/except contains the failure.
    - Apply the SAME edit pattern to all FOUR bodies:
      - `promote_voice_draft` (line ~368): insert after `_apply_extracted(recipe, extracted)`
      - `promote_photo_draft` (line ~395): insert after `_apply_extracted(recipe, extracted)`
      - `promote_quick_draft` (from 24-04 Task 3): insert after `recipe.title = new_title`
      - `promote_full_draft` (from 24-04 Task 3): insert after `recipe.title = new_title`
    - Do NOT modify `_apply_extracted`, `_record_failure`, `_record_rewrite_failure`, `_broadcast_promoted`, or `retry_promotion`. Only the four BackgroundTask bodies + the new helper.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -c "_generate_and_sanitize_illustration" app/services/llm.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "from app.services.svg_sanitizer import sanitize_recipe_svg" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "def _generate_and_sanitize_illustration" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "recipe.illustration_svg = _generate_and_sanitize_illustration" app/services/llm.py` returns `4` (one per BackgroundTask body).
    - The helper NEVER raises — verifiable by inspection: `cd /Users/gulu3001/dev/al-dente/backend && grep -A 15 "def _generate_and_sanitize_illustration" app/services/llm.py | grep -c "return None"` returns at least `2` (one per failure path).
    - The illustration write happens INSIDE the inner try block of each BackgroundTask (not in the except path): `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.services.llm import promote_voice_draft, promote_photo_draft, promote_quick_draft, promote_full_draft; print('OK')"` exits 0.
    - End-to-end test (operator runs in ENVIRONMENT=test): POSTing /recipes/quick → after BackgroundTask, the recipe's illustration_svg is the canned SVG: `cd /Users/gulu3001/dev/al-dente/backend && ENVIRONMENT=test uv run python -c "from app.services.llm import promote_quick_draft; from app.db.session import SessionLocal; from app.models.recipe import Recipe; # ... (operator constructs a test recipe row) — assert recipe.illustration_svg is not None"`.
  </acceptance_criteria>
  <done>
    All four BackgroundTask bodies generate + sanitize + persist illustration. The `_generate_and_sanitize_illustration` helper never raises. Illustration failure leaves the column NULL but does NOT affect recipe.status. The sanitizer is invoked on every Gemini-generated SVG before persistence.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 7: Extend seed script with canned illustration on representative recipes (RID-05 / D-42)</name>
  <files>backend/app/cli/seed.py</files>
  <read_first>
    - backend/app/cli/seed.py (from 24-02 Task 8 — 3+ recipes already have RID-02 fields; add illustration_svg to those same rows)
    - backend/app/services/llm_fixtures.py (canned_recipe_illustration from Task 5)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-42
  </read_first>
  <action>
    Add `illustration_svg` to the same 3+ recipe dicts that got RID-02 seed values in 24-02 Task 8. The value is the canned SVG string (Brand-coherent pasta-strand path).

    Two sub-edits:

    SUB-EDIT 7A — Define a module-level constant at the top of `seed.py` for the canned illustration string. Place it near the existing module-level constants (or right after imports):

    ```python
    # Phase 24 RID-05 — seed canned illustration. Brand-coherent pasta-strand
    # path; passes the sanitizer cleanly. Seed-only — production illustrations
    # come from generate_recipe_illustration.
    _SEED_ILLUSTRATION_SVG = (
        '<svg viewBox="0 0 160 160" fill="none" stroke="currentColor" '
        'xmlns="http://www.w3.org/2000/svg">'
        '<path d="M 40 80 C 40 50, 70 30, 100 40 S 130 80, 100 100 S 50 110, 40 80 Z"/>'
        '</svg>'
    )
    ```

    SUB-EDIT 7B — Add `"illustration_svg": _SEED_ILLUSTRATION_SVG` to the same 3+ recipe dicts that got RID-02 fields in 24-02 Task 8. The remaining seeded recipes get NO illustration_svg key (their row's column stays NULL → BrandIcon fallback renders) — this gives the inbox/library a mixed dataset of "has illustration" vs "BrandIcon fallback" so manual smoke and Playwright fixtures see both paths.

    Specifically:
    - The 3+ recipes that got RID-02 fields now ALSO get the illustration_svg key.
    - The other seeded recipes are explicitly NOT extended — their illustration_svg is NULL by default.
    - Do NOT modify the idempotency logic (uuid5 + merge), other tables, or the file header.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -c "_SEED_ILLUSTRATION_SVG" app/cli/seed.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "_SEED_ILLUSTRATION_SVG =" app/cli/seed.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "\"illustration_svg\": _SEED_ILLUSTRATION_SVG" app/cli/seed.py` returns at least `3`.
    - The seeded canned SVG is sanitizer-passing: `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.cli.seed import _SEED_ILLUSTRATION_SVG; from app.services.svg_sanitizer import sanitize_recipe_svg; assert sanitize_recipe_svg(_SEED_ILLUSTRATION_SVG) is not None"` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run seed` exits 0; rows that received the illustration_svg key have non-NULL values after the seed runs (operator can verify with `psql -c "SELECT title, length(illustration_svg) FROM recipes WHERE illustration_svg IS NOT NULL"`).
  </acceptance_criteria>
  <done>
    Seed script defines a brand-coherent canned SVG and sets it on the same 3+ recipes that got RID-02 fields. Other seeded recipes have NULL illustration_svg → BrandIcon fallback. Mixed dataset enables both render paths in dev/test.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 8: Add illustration_svg to frontend Recipe type (RID-05)</name>
  <files>frontend/lib/recipes.ts</files>
  <read_first>
    - frontend/lib/recipes.ts (the Recipe TypeScript type; should have RID-02 fields from 24-02; add illustration_svg here)
    - backend/app/schemas/recipe.py (the matching server-side RecipeResponse field — wire-format contract)
  </read_first>
  <action>
    Add `illustration_svg?: string | null` to the `Recipe` TypeScript type. The type lives in `frontend/lib/recipes.ts` (verify path via `grep -n "type Recipe" frontend/lib/recipes.ts` — the type may be named `Recipe` or `RecipeRow`; use the exact identifier).

    Insert AFTER the existing optional fields (`description`, `cook_time_minutes`, `difficulty` should already be there from 24-02; if not, this task adds them too):

    ```typescript
    export type Recipe = {
      id: string;
      // ... existing fields ...
      cook_time_minutes?: number | null;        // From 24-02
      difficulty?: string | null;                // From 24-02
      description?: string | null;               // From 24-02
      // Phase 24 RID-05 — server-side-sanitized SVG illustration. NULL means
      // not yet generated OR rejected by the sanitizer. The frontend treats
      // both identically (BrandIcon fallback via RecipeIllustration).
      illustration_svg?: string | null;
      // ... other existing fields ...
    };
    ```

    Specifically:
    - Use the OPTIONAL + nullable `?: string | null` shape to match server-side `Optional[str] = None` (Pydantic). Both undefined (field absent in serialized response — old clients) and null (field present but unset) are handled by the frontend's CompletenessCard / RecipeIllustration consumers.
    - Do NOT modify other Recipe fields or related types in the file.
    - If `lib/recipes.ts` does NOT have a top-level Recipe type (maybe it's `RecipeRow` or in another file), search via `grep -rn "type Recipe\|interface Recipe" frontend/lib/` to locate it. The principle remains: add `illustration_svg?: string | null` to the canonical Recipe type definition.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -c "illustration_svg" lib/recipes.ts</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "illustration_svg?: string | null" lib/recipes.ts` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
  </acceptance_criteria>
  <done>
    Frontend Recipe type exposes `illustration_svg?: string | null`. TypeScript compiles cleanly.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 9: Create RecipeIllustration component (RID-05 / D-37, D-38)</name>
  <files>frontend/components/RecipeIllustration.tsx</files>
  <read_first>
    - frontend/components/BrandIcon.tsx (from 24-01 — the fallback component)
    - frontend/lib/recipes.ts (Recipe type with illustration_svg from Task 8)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-37, §D-38
  </read_first>
  <action>
    Create NEW file `frontend/components/RecipeIllustration.tsx` with EXACTLY this content:

    ```tsx
    // RID-05 — Per-recipe illustration component.
    //
    // Renders the server-side-sanitized SVG via dangerouslySetInnerHTML when
    // recipe.illustration_svg is non-empty; falls back to BrandIcon (RID-01)
    // otherwise. Used by inbox list rows (RecipeDraftCard) and recipes library
    // list rows (RecipeCard) at ~40x40 leading-slot size.
    //
    // SECURITY TRUST BOUNDARY (D-38):
    //
    // dangerouslySetInnerHTML is acceptable here BECAUSE the SVG string passed
    // server-side allowlist sanitization via backend/app/services/svg_sanitizer.py.
    // The sanitizer enforces:
    //   - strict tag allowlist ({svg, path} only)
    //   - strict attribute allowlist on each tag
    //   - rejection of all event handlers (on*=), style=, href / xlink:href
    //   - rejection of CDATA, XML comments, processing instructions, XXE entities
    //   - 4 KB size cap
    // Any disallowed input returns None at the server, which lands here as
    // null/empty illustration_svg → BrandIcon fallback. By construction, only
    // sanitized markup reaches this dangerouslySetInnerHTML call.
    //
    // If the sanitizer is ever weakened, this component becomes an XSS surface.
    // DO NOT modify this component to bypass the recipe.illustration_svg check
    // or to render unsanitized user input.

    import { BrandIcon } from "@/components/BrandIcon";
    import type { Recipe } from "@/lib/recipes";

    export function RecipeIllustration({
      recipe,
      size = 40,
      className,
    }: {
      recipe: Pick<Recipe, "illustration_svg">;
      size?: number;
      className?: string;
    }) {
      const svg = recipe.illustration_svg;

      if (svg && svg.trim() !== "") {
        // Sanitized server-side — see D-38 comment above. The wrapping div sets
        // the rendered size; the inner SVG inherits currentColor from text-foreground.
        return (
          <div
            aria-hidden
            style={{ width: size, height: size }}
            className={className}
            // eslint-disable-next-line react/no-danger -- SVG is server-sanitized per D-38
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        );
      }

      // Fallback: brand mark (RID-01). Same size, currentColor stroke — visually
      // coherent with the per-recipe path.
      return <BrandIcon size={size} className={className} />;
    }
    ```

    Specifically:
    - `"use client"` is NOT needed — `dangerouslySetInnerHTML` works in Server Components when the markup is static (which this is — `svg` comes from the already-fetched Recipe object). However, since the consumers (RecipeDraftCard, RecipeCard) are already "use client" components, this component will render in the client tree naturally. If TypeScript / Next.js complains about the React 19 client/server boundary, add `"use client"` to the top.
    - The wrapping `<div>` enforces the size via inline style — the inner SVG's `width`/`height` attributes are honored by the sanitizer (they're allowed), but a parent-driven size ensures consistency at the 40x40 list-row slot.
    - The `aria-hidden` on the div hides the illustration from screen readers (it's decorative; the recipe title is the accessible label).
    - The ESLint comment `react/no-danger` is the standard suppression for legitimate dangerouslySetInnerHTML uses; the D-38 comment block above documents why.
    - The fallback `<BrandIcon size={size} className={className} />` — no `aria-label` (decorative; the recipe title carries the meaning).
    - Trailing newline at end of file.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && test -f components/RecipeIllustration.tsx && grep -c "dangerouslySetInnerHTML" components/RecipeIllustration.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `test -f /Users/gulu3001/dev/al-dente/frontend/components/RecipeIllustration.tsx && echo OK` prints OK.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "export function RecipeIllustration" components/RecipeIllustration.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "dangerouslySetInnerHTML" components/RecipeIllustration.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "BrandIcon" components/RecipeIllustration.tsx` returns at least `2` (import + usage).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "SECURITY TRUST BOUNDARY" components/RecipeIllustration.tsx` returns `1` (D-38 comment present).
    - The fallback path is reached when illustration_svg is null/empty: `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "svg && svg.trim() !== \"\"" components/RecipeIllustration.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint components/RecipeIllustration.tsx` exits 0.
  </acceptance_criteria>
  <done>
    `RecipeIllustration.tsx` exists. Renders sanitized SVG via dangerouslySetInnerHTML when present; falls back to BrandIcon. The D-38 trust-boundary justification is prominent in a code comment. ESLint `react/no-danger` is explicitly suppressed with rationale.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 10: Mount RecipeIllustration on RecipeDraftCard (inbox row) and RecipeCard (library row) (RID-05 / D-37)</name>
  <files>frontend/components/RecipeDraftCard.tsx, frontend/components/RecipeCard.tsx</files>
  <read_first>
    - frontend/components/RecipeDraftCard.tsx (current state — focus on the leading icon slot at lines 104-107: `<div aria-hidden className="h-16 w-16 rounded-lg bg-surface-muted flex-shrink-0" />`)
    - frontend/components/RecipeCard.tsx (current state — focus on the photo block at lines 88-123)
    - frontend/components/RecipeIllustration.tsx (from Task 9)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-37
  </read_first>
  <action>
    Two sub-edits.

    SUB-EDIT 10A — In `frontend/components/RecipeDraftCard.tsx`, replace the leading placeholder `<div className="h-16 w-16 rounded-lg bg-surface-muted flex-shrink-0" />` (currently at lines 104-107) with the new `RecipeIllustration` component. The slot is 64x64 here (h-16 w-16 = 4rem = 64px) — pass `size={64}` for consistent rendering and add the same flex-shrink-0 + rounded chrome via the className prop.

    Add the import among the existing component imports:
    ```tsx
    import { RecipeIllustration } from "@/components/RecipeIllustration";
    ```

    Replace the leading div block:

    Current (lines 102-107):
    ```tsx
    const inner = (
      <>
        <div
          aria-hidden
          className="h-16 w-16 rounded-lg bg-surface-muted flex-shrink-0"
        />
    ```

    New:
    ```tsx
    const inner = (
      <>
        <div className="h-16 w-16 rounded-lg bg-surface-muted flex-shrink-0 flex items-center justify-center text-foreground-muted">
          <RecipeIllustration recipe={recipe} size={48} />
        </div>
    ```

    Specifically:
    - The wrapping `<div>` retains the 64x64 slot AND adds flex centering so the 48x48 illustration sits centered in the muted-background container.
    - `size={48}` (not 64) gives ~8px of breathing room inside the 64x64 box — visually quieter than filling the entire slot.
    - `text-foreground-muted` on the wrapper sets the currentColor for the inner SVG (so the illustration tints muted-grey for the inbox row's aesthetic).
    - The wrapping div's `aria-hidden` is dropped — the inner illustration component handles aria-hidden itself.

    SUB-EDIT 10B — In `frontend/components/RecipeCard.tsx` (the library card with the photo), the row already has a photo on top with a fallback to `bg-surface-muted`. Per D-37 ("inbox + recipes library list rows at ~40x40"), the library card's PHOTO is the primary visual; RID-05's illustration is meant for the list-row slot. Since RecipeCard already shows a photo-or-fallback, we add the RecipeIllustration as an OVERLAY badge in the bottom-right of the photo region — a small (~40x40) brand-coherent identity mark when no photo is present, OR a subtle pictogram badge when a photo IS present.

    However, re-reading D-37: "The inbox row component (...) The recipes library row component (likely a list row inside frontend/app/recipes/page.tsx)". The library page uses a grid of `RecipeCard` items (per the existing code). The simpler interpretation: RID-05 mounts RecipeIllustration in the fallback `<div>` branch when there's no photo, replacing or augmenting the bare surface-muted div.

    Refactor `RecipeCard.tsx` lines 117-123 (the fallback branch):

    Current:
    ```tsx
    {src ? (
      // eslint-disable-next-line @next/next/no-img-element -- signed URL is short-lived; <Image> with custom loader is overkill
      <img
        src={src}
        alt=""
        className="w-full aspect-[4/3] object-cover bg-surface-muted"
        onError={(e) => { /* ... existing fallback ... */ }}
      />
    ) : (
      <div
        aria-hidden
        className="w-full aspect-[4/3] bg-surface-muted"
      />
    )}
    ```

    New (replace ONLY the fallback `<div>` branch — keep the `<img>` branch byte-identical):
    ```tsx
    {src ? (
      // eslint-disable-next-line @next/next/no-img-element -- signed URL is short-lived; <Image> with custom loader is overkill
      <img
        src={src}
        alt=""
        className="w-full aspect-[4/3] object-cover bg-surface-muted"
        onError={(e) => { /* ... existing fallback ... */ }}
      />
    ) : (
      <div
        aria-hidden
        className="w-full aspect-[4/3] bg-surface-muted flex items-center justify-center text-foreground-muted"
      >
        <RecipeIllustration recipe={recipe} size={64} />
      </div>
    )}
    ```

    Add the import:
    ```tsx
    import { RecipeIllustration } from "@/components/RecipeIllustration";
    ```

    Specifically:
    - The `<img>` photo branch is COMPLETELY UNCHANGED — when a recipe has a photo, it's shown verbatim (no illustration overlay; the photo wins).
    - The fallback branch gets the illustration centered in the 4:3 surface-muted container at size 64 — visually anchored on the empty photo slot.
    - `text-foreground-muted` propagates currentColor to the inner SVG.
    - The `aria-hidden` on the wrapping `<div>` covers the fact that RecipeIllustration is decorative.

    Do NOT modify the photo signed-URL fetching logic, the dev fixture fallback, the title rendering, the cuisine badge, or the last-cooked relative-date — all of those are existing patterns from prior phases.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -c "<RecipeIllustration" components/RecipeDraftCard.tsx components/RecipeCard.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "import { RecipeIllustration } from \"@/components/RecipeIllustration\";" components/RecipeDraftCard.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "import { RecipeIllustration } from \"@/components/RecipeIllustration\";" components/RecipeCard.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "<RecipeIllustration" components/RecipeDraftCard.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "<RecipeIllustration" components/RecipeCard.tsx` returns `1`.
    - The img branch in RecipeCard.tsx is unchanged: `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "@next/next/no-img-element" components/RecipeCard.tsx` returns `1` (the eslint-disable comment for the img branch survives).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "h-16 w-16 rounded-lg bg-surface-muted" components/RecipeDraftCard.tsx` returns `1` (the 64x64 slot survives as the wrapper).
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint components/RecipeDraftCard.tsx components/RecipeCard.tsx` exits 0.
  </acceptance_criteria>
  <done>
    `RecipeDraftCard.tsx` replaces its leading muted-square with `<RecipeIllustration recipe={recipe} size={48} />` inside the existing 64x64 wrapper. `RecipeCard.tsx` adds `<RecipeIllustration recipe={recipe} size={64} />` in the photo-fallback branch only (the photo `<img>` branch is unchanged). Both files compile and lint cleanly.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

**RID-05 is the central security surface of Phase 24.** The trust boundary is the SVG sanitizer at `backend/app/services/svg_sanitizer.py`. Markup arriving from Gemini is UNTRUSTED; markup leaving the sanitizer is TRUSTED. The frontend's `dangerouslySetInnerHTML` boundary in `RecipeIllustration` is acceptable ONLY because the sanitizer enforces the strict allowlist.

| Boundary | Description |
|----------|-------------|
| Gemini API → `generate_recipe_illustration()` raw output | Untrusted. Gemini can be coerced into emitting arbitrary markup via prompt injection. The function returns raw text with no transformation. |
| `generate_recipe_illustration()` → `sanitize_recipe_svg()` | THE CENTRAL TRUST BOUNDARY. The sanitizer enforces a strict allowlist and rejects with `None` on ANY violation. The caller treats `None` as "no illustration". |
| `sanitize_recipe_svg()` → `recipe.illustration_svg` column | Sanitized; safe to store. |
| `recipe.illustration_svg` → `RecipeResponse` → frontend `Recipe.illustration_svg` | Sanitized; safe to transit. |
| `RecipeIllustration` component → `dangerouslySetInnerHTML` | Acceptable BECAUSE the sanitizer is the trust gate. D-38 comment documents the boundary at the call site. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-24-05-01 | Tampering (XSS via `<script>`) | LLM-generated SVG → dangerouslySetInnerHTML | mitigate | Sanitizer rejects ANY tag not in {svg, path}. `<script>` triggers the disallowed-tag branch → returns `None` → frontend shows BrandIcon fallback. Unit test: `test_rejects_disallowed_tag[<svg><script>...]`. |
| T-24-05-02 | Tampering (XSS via event handler) | `onclick=`, `onload=`, `onerror=`, `onmouseover=` attrs | mitigate | Sanitizer rejects ANY attr starting with `"on"`. Unit test: `test_rejects_event_handler_attribute` (parametrized over 4 handlers). |
| T-24-05-03 | Tampering (CSS injection via style=) | `style="..."` attr on svg or path | mitigate | Sanitizer rejects `style=` attr at element AND attribute walk. Unit tests: `test_rejects_style_attribute` + `test_rejects_path_style_attribute`. |
| T-24-05-04 | Tampering (data: URI / link injection) | `href`, `xlink:href`, `xmlns:xlink` | mitigate | Sanitizer rejects any attr containing `"href"` (case-insensitive) AND any xlink namespace. Unit test: `test_rejects_href_attribute` (parametrized over xlink + plain href). |
| T-24-05-05 | Tampering (CSS injection via `<style>` element) | `<style>...</style>` inside svg | mitigate | Sanitizer rejects `<style>` as a disallowed tag (not in {svg, path}). Unit test: `test_rejects_disallowed_tag[<svg><style>...]`. |
| T-24-05-06 | Tampering (HTML injection via `<foreignObject>`) | `<foreignObject><div>...` | mitigate | Sanitizer rejects `<foreignObject>` as a disallowed tag. Unit test: `test_rejects_disallowed_tag[<svg><foreignObject>...]`. |
| T-24-05-07 | Information Disclosure (XXE via DTD entity) | `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>` | mitigate | Stdlib `xml.etree.ElementTree` in Python 3.12 raises `ParseError` on undefined entity expansion (RESEARCH §Target 1, verified empirically). Unit test: `test_rejects_xxe_entity_expansion`. Stdlib's posture is "safe by default" for this attack vector; no defusedxml needed. |
| T-24-05-08 | Tampering (CDATA bypass) | `<![CDATA[<script>...]]>` | mitigate | Sanitizer's pre-parse forbidden-substring check rejects any input containing `<![CDATA[`. Unit test: `test_rejects_cdata_section`. |
| T-24-05-09 | Tampering (XML comment exfiltration) | `<!-- payload -->` | mitigate | Pre-parse rejection of `<!--`. Unit test: `test_rejects_xml_comment`. |
| T-24-05-10 | Tampering (PI exfiltration) | `<?xml-stylesheet href="malicious.xsl"?>` | mitigate | Pre-parse rejection of `<?`. Unit test: `test_rejects_processing_instruction`. |
| T-24-05-11 | Denial of Service (oversized SVG) | Multi-MB SVG payload | mitigate | 4 KB byte cap BEFORE parse (D-34). Unit test: `test_rejects_oversized_svg`. Prevents memory exhaustion via ET parser on adversarial input. |
| T-24-05-12 | Denial of Service (malformed input loops) | Unclosed tags, recursive entity refs | mitigate | ET raises ParseError on malformed input → sanitizer returns None. Stdlib ET does NOT attempt recovery; failed parse is terminal. |
| T-24-05-13 | Tampering (namespace evasion) | `<svg xmlns="http://attacker.example.com">` | mitigate | Sanitizer strips namespace prefix before allowlist comparison. `<svg>` tag is allowed regardless of namespace URI; non-svg tags rejected regardless of namespace. Tag-shadowing attacks (e.g., `<{ns}script>`) fail the allowlist check. |
| T-24-05-14 | Information Disclosure (prompt injection in illustration prompt) | Malicious recipe title coerces Gemini to emit attacker-controlled SVG | accept-with-mitigation | The illustration_prompt is a CLOSED instruction. User input arrives as the SECOND content position. Even if Gemini emits attacker-influenced SVG, the sanitizer is the gate — only allowlist-conforming markup survives. Blast radius: at most 4 KB of path data drawn with currentColor. No data exfiltration path. |
| T-24-05-15 | Denial of Service (Gemini rate exhaustion) | Repeated captures saturate Gemini API quota | accept | Couple-scale (~5-10 captures/week). Each capture makes 2 Gemini calls (rewrite + illustration). Self-throttling on Gemini's side. No rate-limiting middleware needed at v0.5. |
| T-24-05-16 | Elevation of Privilege | BackgroundTask runs in worker context | accept | Identical to RID-04's posture — task receives only `recipe_id`; recipe access is the row created by the originating POST (already auth-checked). No new authorization surface. |

**Summary:** RID-05 is the HIGH-SEVERITY plan of Phase 24. The 16-threat register is the most detailed of the five plans. Every disposition is `mitigate` except for residual prompt-injection (T-24-05-14, accepted-with-mitigation via sanitizer trust gate) and resource-limit threats (T-24-05-15/16, accepted at couple-scale). The unit-test suite (Task 4) is a NON-NEGOTIABLE exit criterion — every `mitigate` row maps to at least one passing test case. The `dangerouslySetInnerHTML` boundary in `RecipeIllustration` is justified ONLY by the sanitizer's correctness; weakening the sanitizer is forbidden without revisiting this threat model.
</threat_model>

<verification>
## Phase 24 / RID-05 Verification — grep gates + unit-test gate + manual UI smoke + Playwright fixture compat

Per D-40 / D-41 / D-42. The unit-test gate (Task 4) is NON-NEGOTIABLE.

### Grep gates

```bash
# 1. Migration 0008
test -f backend/alembic/versions/0008_add_recipe_illustration_svg.py
grep -c "revision: str = \"0008\"" backend/alembic/versions/0008_add_recipe_illustration_svg.py    # Expected: 1
grep -c "down_revision.*= \"0007\"" backend/alembic/versions/0008_add_recipe_illustration_svg.py   # Expected: 1

# 2. Model + schema expose illustration_svg
grep -c "illustration_svg" backend/app/models/recipe.py                                            # Expected: at least 1
grep -c "illustration_svg" backend/app/schemas/recipe.py                                           # Expected: at least 1
# RecipeFullCreate / RecipeUpdate do NOT include illustration_svg
grep -A 30 "class RecipeFullCreate" backend/app/schemas/recipe.py | grep -c "illustration_svg"     # Expected: 0
grep -A 30 "class RecipeUpdate" backend/app/schemas/recipe.py | grep -c "illustration_svg"         # Expected: 0

# 3. Sanitizer + tests
test -f backend/app/services/svg_sanitizer.py
test -f backend/app/services/svg_sanitizer_test.py
grep -c "def sanitize_recipe_svg" backend/app/services/svg_sanitizer.py                            # Expected: 1
grep -c "_MAX_BYTES = 4096" backend/app/services/svg_sanitizer.py                                  # Expected: 1
grep -c "lxml\|defusedxml" backend/app/services/svg_sanitizer.py                                   # Expected: 0
grep -c "def test_" backend/app/services/svg_sanitizer_test.py                                     # Expected: at least 12

# 4. Illustration helper + 4 BackgroundTask extensions
grep -c "def generate_recipe_illustration" backend/app/services/llm.py                             # Expected: 1
grep -c "def _generate_and_sanitize_illustration" backend/app/services/llm.py                      # Expected: 1
grep -c "recipe.illustration_svg = _generate_and_sanitize_illustration" backend/app/services/llm.py # Expected: 4
grep -c "from app.services.svg_sanitizer import sanitize_recipe_svg" backend/app/services/llm.py   # Expected: 1
grep -c "def canned_recipe_illustration" backend/app/services/llm_fixtures.py                      # Expected: 1

# 5. Seed extension
grep -c "_SEED_ILLUSTRATION_SVG" backend/app/cli/seed.py                                            # Expected: at least 1 (defn) + 3 (usages)

# 6. Frontend type + component + mount points
grep -c "illustration_svg" frontend/lib/recipes.ts                                                  # Expected: 1
test -f frontend/components/RecipeIllustration.tsx
grep -c "dangerouslySetInnerHTML" frontend/components/RecipeIllustration.tsx                       # Expected: 1
grep -c "SECURITY TRUST BOUNDARY" frontend/components/RecipeIllustration.tsx                       # Expected: 1
grep -c "<RecipeIllustration" frontend/components/RecipeDraftCard.tsx                              # Expected: 1
grep -c "<RecipeIllustration" frontend/components/RecipeCard.tsx                                   # Expected: 1
```

### Test + build + migrate gates

```bash
# THE CENTRAL SECURITY GATE — must exit 0
cd /Users/gulu3001/dev/al-dente && uv run pytest backend/app/services/svg_sanitizer_test.py -v
# Expected: all tests pass (at least 12 distinct items)

cd backend && uv run alembic upgrade head    # Expected: applies 0008; alembic current shows 0008 (head)
cd backend && uv run seed                     # Expected: exits 0; 3+ recipes have non-NULL illustration_svg
cd backend && uv run python -c "from app.services.llm import generate_recipe_illustration, _generate_and_sanitize_illustration, promote_voice_draft, promote_photo_draft, promote_quick_draft, promote_full_draft; from app.services.svg_sanitizer import sanitize_recipe_svg; print('OK')"   # Expected: prints OK

cd frontend && npx tsc --noEmit -p tsconfig.json   # Expected: exit 0
cd frontend && npx eslint components/RecipeIllustration.tsx components/RecipeDraftCard.tsx components/RecipeCard.tsx   # Expected: exit 0
cd frontend && npx next build --webpack             # Expected: clean build
```

### Manual UI smoke (D-41 — operator runs against seeded fixture)

1. **Inbox row with illustration**: `/inbox` shows seeded draft recipes — at least one row displays the canned pasta-strand pictogram in its 64x64 leading slot. Verify the SVG renders monochrome (currentColor) and respects the 0 0 160 160 viewBox at 48x48.
2. **Inbox row WITHOUT illustration**: Another seeded row (where seed didn't populate illustration_svg) shows the BrandIcon fallback in the same slot.
3. **Library row with photo + illustration**: `/recipes` shows seeded recipes — recipes with photos display the photo (illustration NOT shown). Recipes without photos display the illustration in the 4:3 fallback container at size 64.
4. **Library row without photo, without illustration**: Recipes with neither photo nor illustration show the BrandIcon fallback in the 4:3 surface-muted container.
5. **End-to-end capture** (with real Gemini key OR test mode): POST a new quick capture → after ~3s the BackgroundTask completes; refresh `/inbox` and the new row shows EITHER the Gemini-generated illustration (real mode) OR the canned pasta-strand (test mode) in its leading slot.
6. **Sanitizer-rejection observability**: Inspect server logs after a few real-mode captures — if Gemini occasionally emits non-allowlist SVG, `log.warning("svg_sanitizer: rejected ...")` lines should appear and those recipes show the BrandIcon fallback (NOT a broken/empty box).

### Playwright fixture compatibility

- Existing specs that target `/inbox` or `/recipes` will see the new 64x64 leading slot rendered. Specs targeting the recipe ROW itself should not break (the row container's dimensions are unchanged). If any spec asserts on the legacy bare `bg-surface-muted` square, update the assertion to target the wrapping div (still has `h-16 w-16 rounded-lg bg-surface-muted`) and ignore the inner SVG.
- The canned SVG in seed.py ensures Playwright sees a deterministic illustration on at least 3 seeded recipes.
- No NEW Playwright specs added (D-42).
</verification>

<success_criteria>
The plan is complete when:

1. ALL grep gates from §Verification pass.
2. `cd backend && uv run pytest app/services/svg_sanitizer_test.py -v` exits 0 with at least 12 distinct test items passing — THIS IS THE CENTRAL NON-NEGOTIABLE GATE.
3. `cd backend && uv run alembic upgrade head` applies 0008 cleanly.
4. `cd backend && uv run seed` exits 0; at least 3 seeded recipes have non-NULL illustration_svg.
5. `cd frontend && npx tsc --noEmit && npx eslint <touched files> && npx next build --webpack` exits 0.
6. Manual UI smoke (6 steps) passes against the seeded fixture.
7. RID-05 success criterion from ROADMAP (`Recipe list rows in the inbox and recipes library show a small (~40x40) per-recipe SVG illustration; missing or failed illustrations fall back to the BrandIcon; no <script>, <foreignObject>, <text>, <image>, <use>, <a>, <style>, or on*= content survives the server-side sanitizer (unit tests confirm)`) is satisfied — explicitly verified by the unit-test suite.
8. All tasks merged in ONE atomic commit. Suggested commit message: `feat(24-05): per-recipe illustration — sanitizer + Gemini gen + RecipeIllustration component (RID-05, gh#12)`.
</success_criteria>

<output>
After completion, create `.planning/phases/24-recipe-identity/24-05-illustration-SUMMARY.md` documenting:

- RID-05 closed; gh#12 closeable on merge to main.
- Phase 24 fully complete after this plan ships: RID-01..05 all delivered; gh#10, gh#11, gh#12, gh#22 all closeable.
- Files created: 4 (Alembic 0008, svg_sanitizer.py, svg_sanitizer_test.py, RecipeIllustration.tsx).
- Files modified: 8 (recipe.py model, recipe.py schema, llm.py + llm_fixtures.py, seed.py, recipes.ts type, RecipeDraftCard.tsx, RecipeCard.tsx).
- Security: stdlib xml.etree.ElementTree sanitizer with strict {svg, path} allowlist + reject-and-fallback. 12+ unit tests covering all D-33 rejection cases. The dangerouslySetInnerHTML boundary in RecipeIllustration is justified ONLY by the sanitizer's correctness (documented in code via the D-38 comment).
- Failure isolation: illustration failure NEVER affects recipe.status (D-36). The `_generate_and_sanitize_illustration` helper never raises — returns None on any failure path → BrandIcon fallback.
- Coverage:
  - All four BackgroundTask bodies (voice, photo, quick, full) generate + sanitize + persist.
  - Both list-row components (inbox + library) mount RecipeIllustration with BrandIcon fallback (RID-01 dependency satisfied).
  - Seed script populates 3+ recipes with canned illustrations for deterministic Playwright fixtures.
- Provides for future phases:
  - Detail-page and shortlist illustration placements are explicitly deferred per REQ — sanitizer + helper + component are already in place if a future phase wants to add them.
  - Strip-and-keep sanitizer mode is deferred (D-33) — could be added later if reject-rate proves high.
  - SVG animation is explicitly deferred (REQ) — could be revisited in v0.6+.
  - Illustration regenerate-on-demand UI is deferred (gh#12) — the retry-promotion endpoint already re-runs the BackgroundTask which would re-generate the illustration.
- Verification: grep gates + unit tests (NON-NEGOTIABLE) + manual UI smoke + seed-driven Playwright fixture compatibility.
</output>
