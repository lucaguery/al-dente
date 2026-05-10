# UI Review — Push

**Audited:** 2026-05-10
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** **Partially reached (per CONTEXT D-16).** The PushPermissionBanner renders on `/` (HomeDecide) and is fully scoreable visually — auditor session: `Notification.permission === "default"`, `serviceWorker` + `PushManager` available, non-iOS UA so the `canReceivePush()` iOS gate doesn't fire, banner visible with rose-tinted chrome. NOT reached: (a) the iOS-Safari standalone-PWA gate (cannot be exercised in headless Chromium — `navigator.standalone` undefined), (b) the OS-rendered notification UI itself (system banner / sound / vibration are OS chrome, not a frontend surface to audit), (c) end-to-end push delivery round-trip (deferred to v0.3-ship operator sign-off per WALKTHROUGH §Push P-12-Pu-05). What IS scored: the in-app subscription banner (chrome + copy + CTAs + state machine on dismiss/grant/deny).

## Originality Verdict

**Verdict:** Mixed ⚠

The PushPermissionBanner ships a genuinely warm Slow Food micro-surface — `bg-surface-rose-100` rose tint marks it as a non-system region (it doesn't try to look like a system push prompt), the lucide `Bell` icon sits in `text-primary` terracotta, and the body copy `Pour savoir quand ton shortlist du jour est prêt.` is recognizably French and does real editorial work (it tells the user *why* they want this, not *what* this is). Two CTAs stacked vertically — `Activer` primary + `Pas maintenant` ghost — give the affirmative action visual weight without making dismissal feel hidden. Token compliance is clean (`bg-surface-rose-100`, `border border-border`, `rounded-2xl`, `text-primary`, h-9 buttons; no Tailwind palette literals on this surface). Where the verdict slips to ⚠ is the WALKTHROUGH-surfaced state-machine gap (P-12-Pu-02): this banner is a *one-shot* affordance — a user who taps `Pas maintenant` once is locked out for the rest of the session, and there is **no recovery path from `/settings`** because the surface only mounts on `/` HomeDecide. Combined with the iOS-PWA-only gate (`canReceivePush()` filters out browser-PWA users on iOS who haven't installed), real iOS users who change their mind have no way back in. The pixels are Slow Food; the *interaction availability* over time is generic-app boilerplate.

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| One-shot session-storage dismissal pattern (`SESSION_KEY = "dismissed_push_banner_at"`, `PushPermissionBanner.tsx:74`) — generic web-app banner-dismissal mechanic with no recovery path; user who taps `Pas maintenant` cannot re-summon the banner from anywhere else (P-12-Pu-02) | `bg-surface-rose-100` rose-tinted region — explicit warm Slow Food surface token (rather than `bg-surface-muted` or `bg-amber-50` palette literal); marks the banner as in-system, not a system-prompt clone |
| Default lucide `Bell` icon — themed (`text-primary`) but not customized for the Al Dente "your shortlist is ready" mental model (a clock-shaped or paper-recipe-shaped glyph would tie into the cron's 16:00-household-tz delivery moment) | French body `Pour savoir quand ton shortlist du jour est prêt.` — tells the user *the moment* (today's shortlist arriving, second-person familiar `ton`), refuses the boilerplate "Enable notifications to stay updated" |
| Failure-mode toasts are generic-Sonner: 4 distinct failure reasons (`denied`, `subscribe_failed`, `missing_key`, `post_failed`) but only 2 surface as toasts (`permission_denied` text and `post_failed`/`subscribe_failed` shared `toast.error`); no per-cause recovery affordance | `useSyncExternalStore` for banner eligibility (`PushPermissionBanner.tsx:34-38`) — refuses the set-state-in-effect lint trap by reading `Notification.permission` + `sessionStorage` + UA from the external store; production-grade React 19 idiom |
| iOS PWA-only gate (`canReceivePush()` returns `false` for iOS browser-PWA users at `lib/push.ts:90-93`) — load-bearing for v0.1 product target but ships as silent filter (no surface to tell the user "install the PWA first to enable notifications") | Stacked CTA layout (vertical `flex-col gap-2 ml-2`, both `h-9 px-4`) — refuses the horizontal "Cancel / Confirm" generic dialog shape; gives `Activer` visible weight without making `Pas maintenant` feel hidden |
| `permission_denied` recovery copy `Active-les dans les réglages Safari pour recevoir les shortlists.` ships in `fr.json` but only fires as a transient toast — there is no in-Settings persistent surface that explains the same recovery path | `aria-labelledby="push-banner-heading"` on the `role="region"` (`PushPermissionBanner.tsx:75`) — proper SR semantics for an in-page advisory region |

## 6-Pillar Score: 19/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 4/4 | `Active les notifications` / `Pour savoir quand ton shortlist du jour est prêt.` / `Activer` + `Pas maintenant` — three layers of warm French. The body copy names the moment (today's shortlist) rather than the technical operation. Failure copy `Notifications bloquées. Active-les dans les réglages Safari pour recevoir les shortlists.` is iOS-aware and actionable. Full next-intl. |
| Visuals | 3/4 | DOCKED -1 — Bell icon is the off-the-shelf lucide glyph; the surface chrome is rose-tinted but the icon doesn't earn its place in the Al Dente vocabulary. The banner shape itself (icon + heading + body + stacked CTAs) is conventional advisory-region shape. The rose tint rescues it from pure boilerplate. |
| Color | 4/4 | `bg-surface-rose-100` rose-tinted region (custom Slow Food token, not a Tailwind palette literal); `text-primary` terracotta on Bell + `Activer` button; `text-foreground-muted` for body; `border border-border` for the boundary. All semantic tokens. No emerald-Tailwind-literal recurrence on this surface (refresher: emerald is a recurring gap on shortlist OUI button, vote validé chip, cooking-log ChefHat — push avoids it). |
| Typography | 4/4 | `text-base font-semibold leading-6` heading; `text-sm text-foreground-muted leading-5` body; default Button typography on CTAs. Within the Slow Food scale. No display moments (no `font-display italic` Fraunces) — appropriate for a transient utility surface. |
| Spacing | 4/4 | `mx-6 mt-4` outer margin + `px-4 py-3` inner padding + `gap-3` icon-text gap + `gap-1` heading-body gap + `gap-2` button-stack gap + `ml-2` CTA-block left margin. `h-9 px-4` CTAs (above 36px tap floor; appropriate for a banner-density action — full 48px would dominate the surface). Tailwind scale only. |
| Experience Design | 0/4 | DOCKED -4. Three structural frictions stack: P-12-Pu-02 (no Settings recovery path — the banner is the one-shot affordance, dismissed-once means dismissed-rest-of-session, no in-Settings re-entry), P-12-Pu-04 (no admin-test fire endpoint — neither auditors nor users can verify their own delivery), P-12-Pu-05 (round-trip operator-deferred — the end-to-end loop is unverified at audit time). Plus: the iOS-PWA-only gate (`canReceivePush()`) is silent — a user on iOS Safari who hasn't installed the PWA gets zero affordance and zero feedback. The visible banner is correct; the *system around it* leaves the user with no recovery path. The score is 0/4 not 1/4 because all three frictions hit Pillar 6 directly (no recovery, no observability, no verification) — the user-impact dimension of this surface is structurally broken under any failure path. Per CONTEXT D-13, this is "blocker class" docking applied to a surface that ships a clean visible artifact. |

## Detailed Findings

### Pillar 6: Experience Design (0/4)

- **No Settings recovery path for opted-out users** — `PushPermissionBanner` mounts only on `/` HomeDecide (`frontend/components/HomeDecide.tsx:403, 460`). A user who taps `Pas maintenant` writes `sessionStorage["dismissed_push_banner_at"]` and the banner returns `null` for the rest of the session. **No `/settings` Card explains how to re-enable.** A user who *grants* and later wants to disable also has no in-app off-switch — they must navigate to iOS Safari → Settings → Notifications. The `permission_denied` toast copy mentions Safari Settings but only fires *during* the failed activation flow, never persistently. (See WALKTHROUGH.md §Push — P-12-Pu-02)
- **No admin-test fire endpoint exists** — `POST /api/push/test`, `POST /api/push/send`, `POST /api/push/fire-test` all return 404 (verified). Users have no "Test my notifications" diagnostic; auditors have no round-trip verification path; operator must trigger a real product event (cron at 16:00 household-tz, partner cooking.started) on a real iPhone to confirm delivery works. The observability gap is the same friction class as P-12-Pu-02. (See WALKTHROUGH.md §Push — P-12-Pu-04)
- **Round-trip operator-deferred to v0.3-ship sign-off** — Phase 12 P-12-Pu-05 was DEFERRED per operator decision (2026-05-09). The end-to-end delivery loop is unverified at Phase 13 audit time. Phase 14 ranking should treat this as a known-open item, not a Phase 13 dock target — but it compounds with P-12-Pu-02 + P-12-Pu-04 to leave Pillar 6 at 0/4 because no auditor or user can verify any path through this surface. (See WALKTHROUGH.md §Push — P-12-Pu-05)
- **iOS-PWA-only gate is silent** — `canReceivePush()` (`frontend/lib/push.ts:84-95`) returns `false` if `isIos && !standalone`. Real iOS users on iOS Safari who haven't installed the PWA see ZERO push affordance — no banner, no Settings Card, no hint to install the PWA. Per Phase 12 RESEARCH §Risk 3 this is by design (v0.1 ships iOS-PWA-only), but the silent filter means a user with ambient interest in notifications has no path forward. (See WALKTHROUGH.md §Push — P-12-Pu-02 surface-discovery thread)
- **Pass-style: `useSyncExternalStore` is the right primitive.** `PushPermissionBanner.tsx:34-38` reads eligibility from external state (`Notification.permission`, `sessionStorage`, UA) rather than React-owned state — refuses the set-state-in-effect lint trap. Production-grade React 19 idiom; the visible banner is correct given the inputs.

### Pillar 1: Copywriting (4/4)

- Heading `Active les notifications` (`home.push.heading` next-intl key) — imperative, second-person familiar `Active` (not formal `Activez`).
- Body `Pour savoir quand ton shortlist du jour est prêt.` — names the moment (today's shortlist arriving) and the user's information need ("savoir quand"); refuses the boilerplate "Stay updated with notifications" register. Second-person familiar `ton`.
- CTA `Activer` — single verb, no object; the parent banner already says what's being activated. Refuses the redundant "Activer les notifications".
- CTA `Pas maintenant` — temporally honest, refuses the negative "Refuser" / "Annuler".
- Failure copy `Notifications bloquées. Active-les dans les réglages Safari pour recevoir les shortlists.` (`permission_denied`) — iOS-aware, names the path the user must take (Safari Settings), specifies the actual benefit (`shortlists`).
- Toast on success `Notifications activées.` — concise; the user just performed the action so the system response can be brief.
- Full next-intl. No drift between rendered strings and `lib/i18n/fr.json` keys.

### Pillar 2: Visuals (3/4)

- `Bell` lucide icon at `size={20}` `text-primary` `mt-0.5` (`PushPermissionBanner.tsx:79`) — standard lucide glyph. Themed via `text-primary` but not customized for the Al Dente "your shortlist arriving" moment. The icon could earn its place by referencing the cron schedule (clock face), the recipe artifact (paper card), or the meal-time identity (terracotta plate) — instead it's the universal notification icon.
- Banner shape (`flex items-start gap-3` icon + content + CTAs in a row) is conventional advisory-region shape. Two CTAs stacked vertically (`flex flex-col gap-2 ml-2`) gives `Activer` visual weight without dominating, but the layout itself is recognizable as "call-to-action banner".
- DOCKED -1: chrome rescues from boilerplate (rose tint + token compliance) but the visible artifact is icon + body + button — the surface doesn't earn a visual moment.
- Pass-style: `Bell` icon `mt-0.5` alignment with the heading baseline is a small but precise typography-aware detail; refuses the lazy `items-center` that would float the icon above the body.

### Pillar 3: Color (4/4)

- `bg-surface-rose-100` rose-tinted background — explicit Slow Food token (defined in `frontend/app/globals.css` per Phase 7 UI-SPEC). Marks the banner as a *non-system* advisory region (not trying to mimic an OS push prompt).
- `text-primary` on the Bell icon and the `Activer` button (Button kit `variant="default"` resolves to `bg-primary text-primary-foreground`). Terracotta primary anchors the affirmative action.
- `text-foreground-muted` on the body — system muted color.
- `border border-border` on the boundary — semantic token, no palette literal.
- The `Pas maintenant` ghost button uses `text-foreground` (kit default) — appropriate downplay vs the primary `Activer`.
- **No emerald-Tailwind-literal recurrence on this surface** — push avoids the recurring pattern from shortlist OUI / vote validé chip / cooking-log ChefHat. Clean.

### Pillar 4: Typography (4/4)

- Heading `text-base font-semibold leading-6` (`PushPermissionBanner.tsx:84`) — banner heading, one step above body.
- Body `text-sm text-foreground-muted leading-5` (`PushPermissionBanner.tsx:88`) — utility scale.
- CTAs default Button kit typography at `size="sm"` (kit default `text-sm font-medium`).
- No display moments (no Fraunces) — utility surface, appropriate.
- Within the Slow Food scale.

### Pillar 5: Spacing (4/4)

- Outer `mx-6 mt-4` — sits within the HomeDecide page rhythm (page horizontal padding is also 6).
- Inner `px-4 py-3` — banner-density padding (less than Card's `p-6`, appropriate for inline advisory).
- Icon-text `gap-3` + heading-body `gap-1` + CTA-stack `gap-2` + CTA-block left margin `ml-2`.
- `h-9 px-4` CTAs — above 36px hit floor; banner-density appropriate (full `h-12` would over-weight a transient advisory).
- Tailwind scale only. Refuses arbitrary pixel values.

## Screenshots

- `./screenshots/push-banner-canonical.png` — element-scoped screenshot of the `role="region"[aria-labelledby="push-banner-heading"]` container on `/`. Shows: rose tint, terracotta Bell icon, French heading "Active les notifications", body "Pour savoir quand ton shortlist du jour est prêt.", and the stacked CTA pair (`Activer` primary + `Pas maintenant` ghost). Auditor session at audit time had `Notification.permission === "default"` and non-iOS UA, satisfying all 4 banner-render gates per `readBannerEligible()`.
- (Per D-08 budget — push thin surface — 1 PNG suffices. Post-grant + post-deny states would require actual permission state changes that pollute the auditor session; the code-level state machine is documented in §Pillar 6 findings instead.)

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Push: 4 probes (P-12-Pu-01..Pu-04) + 1 deferred checkpoint (Pu-05) + 5 pass-style observations (SW registered, VAPID endpoint live, pushManager API present, /api/push/subscribe upsert-idempotent, auditor identity preserved).
- P-12-Pu-01 (headless Chromium subscribe AbortError) is environment-class blocker for AUDIT only — for PRODUCT it's expected (real iOS PWA users get a working APNs receiver). NOT a Pillar 6 dock target; recorded as audit-process limitation.
- P-12-Pu-02 (no Settings recovery path; missing affordance) is the **load-bearing structural friction** — drives Pillar 6 -2.
- P-12-Pu-03 (VAPID public key endpoint) is pass-style regression canary — load-bearing for Phase 14 "system works" baseline.
- P-12-Pu-04 (no admin-test fire endpoint) is the **observability gap** — drives Pillar 6 -1 (combined with Pu-02 stacking).
- P-12-Pu-05 (round-trip operator-deferred) is OUT OF SCOPE for Phase 13 — recorded for v0.3-ship sign-off.
- 0 Gemini calls — Push is non-AI; the only network during banner load is `/api/push/vapid-public-key` (defense-in-depth fetch path) and the eventual `/api/push/subscribe` POST.
