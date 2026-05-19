---
phase: quick-260519-ucl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - CLAUDE.md
autonomous: true
requirements:
  - QUICK-260519-ucl
must_haves:
  truths:
    - "CLAUDE.md Invariant 5 names `recipe_turns` (not `source_capture`) as the current durable raw-input store"
    - "CLAUDE.md Invariant 5 contains an inline ADR-0001 link"
    - "CLAUDE.md Invariant 5 explicitly records that `recipes.source_capture` was dropped in Alembic migration 0009"
    - "CLAUDE.md snake_case example list no longer uses `source_capture` (uses `extracted_html_path` instead)"
    - "No CLAUDE.md text presents `source_capture` as current/live state — only as legacy that was dropped"
  artifacts:
    - path: "CLAUDE.md"
      provides: "Invariant 5 + snake_case example aligned with ADR-0001"
      contains: "recipe_turns"
  key_links:
    - from: "CLAUDE.md:39"
      to: "docs/adr/0001-recipe-conversation-thread.md"
      via: "inline markdown link `[ADR-0001](docs/adr/0001-recipe-conversation-thread.md)`"
      pattern: "ADR-0001\\]\\(docs/adr/0001"
    - from: "CLAUDE.md:39"
      to: "backend/alembic/versions/0009_add_recipe_turns_and_drop_source_capture.py"
      via: "explicit mention of migration `0009`"
      pattern: "migration .?0009"
---

<objective>
Align CLAUDE.md with ADR-0001 (recipe conversation thread). A `graphify` knowledge-graph
run surfaced that Invariant 5 ("Raw inputs kept forever") still described
`recipes.source_capture` JSONB as the live storage mechanism, even though that column
was dropped in Alembic migration `0009` when `recipe_turns` was introduced (Phase 25
THREAD-01, see ADR-0001 + CONTEXT.md:71-80 deprecation note). The snake_case naming
example on line 193 also listed `source_capture` — a column that no longer exists.

Purpose:
- Stop CLAUDE.md (read into every Claude turn) from teaching a stale architecture
- Make the ADR-0001 ↔ Invariant 5 relationship explicit so the knowledge graph
  promotes the currently INFERRED edges to EXTRACTED on the next `graphify update .`
- Fix the snake_case example so future readers don't grep for a dead column

Output: A single commit aligning CLAUDE.md with ADR-0001 + CONTEXT.md.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
Edits are already applied to the working tree (not yet committed). The executor's job
is to verify the diff matches expectations, run a consistency check, then commit.

@CLAUDE.md
@docs/adr/0001-recipe-conversation-thread.md
@CONTEXT.md

<background>
Graphify surfaced a "surprising connection" between CLAUDE.md Invariant 5 and the
`recipe_turns` table in ADR-0001 — semantically similar, but literally describing
different storage. Investigation showed real drift:

- ADR-0001 §Consequences: "`recipes.source_capture` JSONB column is **dropped** in
  the same Alembic migration that adds `recipe_turns`."
- CONTEXT.md lines 71-80: `source_capture` is explicitly flagged as deprecated by
  ADR-0001 and **removed**.
- Migration file `backend/alembic/versions/0009_add_recipe_turns_and_drop_source_capture.py`
  confirms the drop landed.
- BUT CLAUDE.md Invariant 5 (line 39, pre-edit) said: "`recipes.source_capture`
  JSONB stores original transcript / URL / photo paths" — present tense, stale.
- AND CLAUDE.md line 193 (pre-edit) listed `source_capture` as a snake_case example.

After this commit, `graphify update .` will refresh the AST graph; the explicit
`ADR-0001` link in Invariant 5 should promote two currently-INFERRED edges to
EXTRACTED.
</background>

<expected_diff>
Two-hunk diff against `HEAD`, both in `CLAUDE.md`:

Hunk 1 (line ~39, Invariant 5): pre-edit text starting with
"`recipes.source_capture` JSONB stores original transcript" is replaced with text
that begins "Per [ADR-0001](docs/adr/0001-recipe-conversation-thread.md), the
`recipe_turns` table stores original transcripts" and ends with mention of
"Alembic migration `0009`" + "thread turns are the durable store".

Hunk 2 (line ~193, snake_case example list): `source_capture` token in the
backend-attributes example list is replaced with `extracted_html_path`.

No other lines touched. `git diff --stat` should report `CLAUDE.md | 4 ++--`.
</expected_diff>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify diff, run consistency check, commit CLAUDE.md alignment</name>
  <files>CLAUDE.md</files>
  <action>
The two edits described in `<expected_diff>` above are already staged in the working
tree (uncommitted). Do NOT re-edit CLAUDE.md — verify and commit.

Steps:

1. Confirm the working-tree diff matches `<expected_diff>`:
   - Run `git diff --stat CLAUDE.md` — expect exactly `CLAUDE.md | 4 ++--` (2 insertions, 2 deletions).
   - Run `git diff CLAUDE.md` and visually confirm:
     a) Hunk 1 (around line 39) replaces the old Invariant 5 sentence with the new ADR-0001-linked version that mentions `recipe_turns` and migration `0009`.
     b) Hunk 2 (around line 193) swaps `source_capture` → `extracted_html_path` in the snake_case example list.
   - If the diff differs from `<expected_diff>` in any material way (extra hunks, wrong files, different replacement text), STOP and surface the mismatch rather than committing.

2. Consistency check — verify CLAUDE.md does not still teach `source_capture` as live state.
   Run: `grep -n "source_capture" CLAUDE.md`
   Expected: exactly ONE match, on the new line 39, in the legacy-context phrase
   "The legacy `recipes.source_capture` JSONB column was dropped in Alembic migration `0009`".
   If `grep -c "source_capture" CLAUDE.md` returns anything other than `1`, STOP and report.

3. Sanity-check the ADR-0001 link target exists:
   `test -f docs/adr/0001-recipe-conversation-thread.md` (must succeed).

4. Stage and commit ONLY `CLAUDE.md` (do not stage anything else even if other paths show as dirty in `git status`):

   ```
   git add CLAUDE.md
   ```

   Then commit using the GSD SDK commit handler with this message (use HEREDOC for formatting; the message references the graphify finding as motivation per the planning constraint):

   ```
   docs(claude-md): align Invariant 5 + snake_case example with ADR-0001

   A graphify knowledge-graph run surfaced that CLAUDE.md Invariant 5 still
   described `recipes.source_capture` JSONB as the live raw-input store, even
   though that column was dropped in Alembic migration 0009 when `recipe_turns`
   was introduced (Phase 25 THREAD-01, ADR-0001).

   - Invariant 5 now points at the `recipe_turns` table with an inline ADR-0001
     link and an explicit note that the legacy `source_capture` column was
     dropped in migration 0009.
   - Snake_case naming example: replace `source_capture` (dead column) with
     `extracted_html_path` (current column referenced in Invariant 4).

   CONTEXT.md already flagged `source_capture` as deprecated by ADR-0001
   (lines 71-80); this commit closes the drift in the file Claude reads on
   every turn.
   ```

   Use the SDK commit handler invocation (mirrors planner's `git_commit` step):

   ```
   gsd-sdk query commit "docs(claude-md): align Invariant 5 + snake_case example with ADR-0001" --files CLAUDE.md
   ```

   If the SDK handler doesn't accept the multi-line body via that argv form, fall back to a plain `git commit -F <message-file>` with the body in a tempfile, then delete the tempfile. Do NOT use `--no-verify`. Do NOT amend.

5. Confirm the commit landed: `git log -1 --stat` should show only `CLAUDE.md` modified (4 lines changed: 2+/2-) and the commit subject starting with `docs(claude-md):`.
  </action>
  <verify>
    <automated>git diff HEAD~1 HEAD -- CLAUDE.md | grep -q "recipe_turns" && git diff HEAD~1 HEAD -- CLAUDE.md | grep -q "ADR-0001" && git diff HEAD~1 HEAD -- CLAUDE.md | grep -q "extracted_html_path" && [ "$(git diff HEAD~1 HEAD --stat | grep -c CLAUDE.md)" = "1" ] && [ "$(git diff HEAD~1 HEAD --name-only | wc -l | tr -d ' ')" = "1" ]</automated>
  </verify>
  <done>
    A single new commit on `main` modifies only `CLAUDE.md`, contains both edits (Invariant 5 rewrite + snake_case example swap), and references ADR-0001. `grep -c "source_capture" CLAUDE.md` returns `1` (the legacy-context mention). Working tree is clean afterwards w.r.t. CLAUDE.md.
  </done>
</task>

</tasks>

<verification>
After the commit lands:

1. `git log -1 --oneline` shows the new `docs(claude-md):` commit.
2. `git diff HEAD~1 HEAD --stat` reports exactly `CLAUDE.md | 4 ++--`.
3. `grep -c "source_capture" CLAUDE.md` returns `1` (the legacy-dropped reference).
4. `grep -c "recipe_turns" CLAUDE.md` returns `>= 1` (Invariant 5 now names it).
5. `grep -c "ADR-0001" CLAUDE.md` returns `>= 1` (inline link present).
6. `git status` shows a clean working tree for `CLAUDE.md`.

Out of scope for this quick task (orchestrator handles afterwards): running
`graphify update .` to refresh the knowledge graph so the new explicit ADR-0001
reference promotes the currently-INFERRED Invariant5↔recipe_turns edges to
EXTRACTED.
</verification>

<success_criteria>
- Single commit on `main` aligning CLAUDE.md with ADR-0001 + CONTEXT.md.
- No code or test changes — pure documentation.
- All five `<verification>` checks pass.
- No `source_capture` reference in CLAUDE.md presents it as current state; the
  sole remaining mention is the explicit "legacy ... dropped in migration 0009"
  phrase in Invariant 5.
</success_criteria>

<output>
This is a quick task (not a phase) — no SUMMARY.md required. The commit itself
is the artifact. The orchestrator picks up here to run `graphify update .`.
</output>
