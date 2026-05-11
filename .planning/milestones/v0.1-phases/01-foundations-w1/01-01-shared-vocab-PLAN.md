---
phase: 01-foundations-w1
plan: 01
plan_number: 1
slug: shared-vocab
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/lib/enums.ts
  - frontend/lib/colors.ts
  - backend/app/__init__.py
  - backend/app/models/__init__.py
  - backend/app/models/enums.py
  - backend/app/colors.py
autonomous: true
requirements: [INFRA-03, RECIPE-01, RECIPE-02, ONBOARD-04, ONBOARD-05]
must_haves:
  truths:
    - "Frontend and backend share identical enum values for Season, Cuisine, Mood, Protein"
    - "Five member colors are defined once on each side with matching hex values"
  artifacts:
    - path: "frontend/lib/enums.ts"
      provides: "TS string enums for Season, Cuisine, Mood, Protein"
    - path: "frontend/lib/colors.ts"
      provides: "MEMBER_COLORS array (5 hex strings)"
    - path: "backend/app/models/enums.py"
      provides: "Python str-Enums mirroring TS"
    - path: "backend/app/colors.py"
      provides: "MEMBER_COLORS list and is_valid_member_color()"
  key_links:
    - from: "backend/app/colors.py"
      to: "frontend/lib/colors.ts"
      via: "identical hex strings — drift = bug"
      pattern: "#F43F5E.*#F59E0B.*#10B981.*#0EA5E9.*#8B5CF6"
---

<objective>
Establish the locked vocabularies (Season / Cuisine / Mood / Protein) and the 5-member color palette (D-04) as the single shared source of truth between frontend and backend. Every downstream plan in this phase imports from these files; no plan re-defines them. This is foundation only — no routes, no UI.

Purpose: Prevent enum drift (CONCERNS.md §"Enum Drift") and avoid magic strings for the 5 member colors. Honors CLAUDE.md invariant "drift between the two is a category of bug to avoid."
Output: 4 small files (2 TS, 2 Python) committed and ready to import.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundations-w1/01-CONTEXT.md
@.planning/phases/01-foundations-w1/01-UI-SPEC.md
@SPEC.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Frontend enums + colors</name>
  <files>frontend/lib/enums.ts, frontend/lib/colors.ts</files>
  <read_first>
    - SPEC.md §"Locked vocabularies" (the 4 Python enums — TS values MUST match the string values verbatim, including camelCase like "middleEastern", "redMeat")
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"Color palette for member attribution" (D-04)
  </read_first>
  <action>
    Create `frontend/lib/enums.ts` exporting four TS string enums named exactly `Season`, `Cuisine`, `Mood`, `Protein` whose **values** match SPEC.md §"Locked vocabularies" verbatim:
      - Season: "spring" | "summer" | "autumn" | "winter"
      - Cuisine: "italian" | "french" | "asian" | "mediterranean" | "middleEastern" | "indian" | "mexican" | "northAfrican" | "american" | "other"
      - Mood: "comfort" | "light" | "quick" | "celebratory" | "adventurous"
      - Protein: "poultry" | "redMeat" | "fish" | "seafood" | "egg" | "legume" | "none"
    Use `export const Cuisine = { italian: "italian", ... } as const` plus `export type Cuisine = typeof Cuisine[keyof typeof Cuisine]` (TS-strict friendly). Add a short doc comment at the top: `// Mirror of backend/app/models/enums.py — drift is a category of bug per CLAUDE.md.`

    Create `frontend/lib/colors.ts` exporting:
      ```ts
      // Mirror of backend/app/colors.py — drift is a category of bug per CLAUDE.md.
      // Per D-04 (CONTEXT.md), Tailwind v4 default 500-shade hex values.
      export const MEMBER_COLORS = [
        { slot: 1, name: "rose",    hex: "#F43F5E", tw: "rose-500" },
        { slot: 2, name: "amber",   hex: "#F59E0B", tw: "amber-500" },
        { slot: 3, name: "emerald", hex: "#10B981", tw: "emerald-500" },
        { slot: 4, name: "sky",     hex: "#0EA5E9", tw: "sky-500" },
        { slot: 5, name: "violet",  hex: "#8B5CF6", tw: "violet-500" },
      ] as const;
      export type MemberColorHex = typeof MEMBER_COLORS[number]["hex"];
      export const isValidMemberColor = (hex: string): hex is MemberColorHex =>
        MEMBER_COLORS.some(c => c.hex === hex);
      ```
  </action>
  <verify>
    <automated>test -f frontend/lib/enums.ts && test -f frontend/lib/colors.ts && grep -q "middleEastern" frontend/lib/enums.ts && grep -q "redMeat" frontend/lib/enums.ts && grep -q "#F43F5E" frontend/lib/colors.ts && grep -q "#8B5CF6" frontend/lib/colors.ts && cd frontend && npx tsc --noEmit</automated>
  </verify>
  <done>Both files exist; TypeScript compiles with --noEmit clean; all enum string values match SPEC.md verbatim; 5 member colors present with correct hex codes.</done>
</task>

<task type="auto">
  <name>Task 2: Backend enums + colors (mirror of TS)</name>
  <files>backend/app/__init__.py, backend/app/models/__init__.py, backend/app/models/enums.py, backend/app/colors.py</files>
  <read_first>
    - SPEC.md §"Locked vocabularies" (the canonical Python enums)
    - frontend/lib/enums.ts (just-created mirror — values must match)
    - frontend/lib/colors.ts (just-created mirror — hex values must match)
  </read_first>
  <action>
    Create empty `backend/app/__init__.py` and `backend/app/models/__init__.py` so they're importable Python packages.

    Create `backend/app/models/enums.py` exactly as SPEC.md §"Locked vocabularies" specifies:
      ```python
      # Mirror of frontend/lib/enums.ts — drift is a category of bug per CLAUDE.md.
      from enum import Enum

      class Season(str, Enum):
          spring = "spring"; summer = "summer"; autumn = "autumn"; winter = "winter"

      class Cuisine(str, Enum):
          italian = "italian"; french = "french"; asian = "asian"
          mediterranean = "mediterranean"; middle_eastern = "middleEastern"
          indian = "indian"; mexican = "mexican"; north_african = "northAfrican"
          american = "american"; other = "other"

      class Mood(str, Enum):
          comfort = "comfort"; light = "light"; quick = "quick"
          celebratory = "celebratory"; adventurous = "adventurous"

      class Protein(str, Enum):
          poultry = "poultry"; red_meat = "redMeat"; fish = "fish"
          seafood = "seafood"; egg = "egg"; legume = "legume"; none = "none"
      ```
    Note the deliberate mismatch between Python member name (`middle_eastern`) and value (`"middleEastern"`) — the value is the wire format and MUST match TS.

    Create `backend/app/colors.py`:
      ```python
      # Mirror of frontend/lib/colors.ts — drift is a category of bug per CLAUDE.md.
      # Per D-04 (CONTEXT.md), Tailwind v4 default 500-shade hex values.
      MEMBER_COLORS: list[str] = [
          "#F43F5E",  # rose-500
          "#F59E0B",  # amber-500
          "#10B981",  # emerald-500
          "#0EA5E9",  # sky-500
          "#8B5CF6",  # violet-500
      ]

      def is_valid_member_color(hex_value: str) -> bool:
          return hex_value in MEMBER_COLORS
      ```
  </action>
  <verify>
    <automated>test -f backend/app/__init__.py && test -f backend/app/models/__init__.py && test -f backend/app/models/enums.py && test -f backend/app/colors.py && grep -q 'middleEastern' backend/app/models/enums.py && grep -q 'redMeat' backend/app/models/enums.py && grep -q '#F43F5E' backend/app/colors.py && grep -q '#8B5CF6' backend/app/colors.py && cd backend && python -c "from app.models.enums import Season, Cuisine, Mood, Protein; from app.colors import MEMBER_COLORS, is_valid_member_color; assert Cuisine.middle_eastern.value == 'middleEastern'; assert Protein.red_meat.value == 'redMeat'; assert is_valid_member_color('#F43F5E'); assert not is_valid_member_color('#000000'); print('OK')"</automated>
  </verify>
  <done>Both Python files exist as importable modules; the smoke-test prints "OK"; wire-format enum values (`middleEastern`, `redMeat`, etc.) round-trip identically to the TS file.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none in this plan) | This plan only writes static constants — no I/O, no auth surface |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-01-01 | Tampering | enum drift between TS/Python | low | mitigate | Smoke-test in Task 2's `<verify>` asserts wire-format strings match SPEC.md verbatim; CLAUDE.md sync rule documented in file headers. |

No `high` threats. This plan is pure static data; security surfaces are in 01-03 (auth/CORS), 01-04 (invite codes), 01-05 (WS auth), 01-09 (photo upload).
</threat_model>

<verification>
Manual check: `grep -c '"' frontend/lib/enums.ts` and the equivalent extraction from `backend/app/models/enums.py` produce the same 26 wire-format strings. Hex set in `colors.ts` and `colors.py` is identical.
</verification>

<success_criteria>
Two TypeScript files and four Python files exist; TS compiles strict; Python smoke-test passes; values match SPEC.md verbatim.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations-w1/01-01-SUMMARY.md` documenting which files were created and the canonical values, so downstream plans (01-04 onboarding, 01-06 recipe-backend, 01-08 recipe-frontend-create) can reference them.
</output>
