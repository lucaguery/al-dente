# Phase 3: Decide (W3) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 3-decide-w3
**Areas discussed:** Shortlist nav placement, Swipe deck interaction, Rejeté visibility, Web Push timing

---

## Shortlist nav placement

| Option | Description | Selected |
|--------|-------------|----------|
| Home IS the shortlist | Home tab becomes today's shortlist — swipe deck replaces hero + CTAs. 4 tabs unchanged. | ✓ |
| 5th tab 'Décider' | Add a 5th tab to BottomNav. Home stays as-is. | |
| Home links to /shortlist | Keep home hero, add prominent card linking to /shortlist. | |

**User's choice:** Home IS the shortlist
**Notes:** 4-tab BottomNav unchanged; home content replaced by swipe deck.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Empty state with CTA to add recipes | "Ton shortlist du jour n'est pas encore prêt." + "Ajouter une recette" button. | ✓ |
| Previous day's shortlist (greyed out) | Muted previous shortlist with "mis à jour hier" label. | |
| Loading skeleton until generated | Spinner/skeleton cards. | |

**User's choice:** Empty state with CTA to add recipes

---

## Swipe deck interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Swipe left/right + thumb buttons below | Gesture + two large buttons (❌/❤️). Both cast the same vote. | ✓ |
| Thumb buttons only | No swipe gesture. | |
| Swipe gesture only | No buttons. | |

**User's choice:** Swipe + thumb buttons

---

| Option | Description | Selected |
|--------|-------------|----------|
| One card at a time, peek at card behind | Front card full-width, next card peeking scaled/faded behind. | ✓ |
| One card at a time, no peek | Only front card visible. | |
| Scrollable list with vote buttons per row | All recipes in a vertical scroll. No animation. | |

**User's choice:** One card at a time with peek

---

| Option | Description | Selected |
|--------|-------------|----------|
| 'Tout vu' state with Voté summary | Empty deck shows all recipes + vote states + "Tu décides" / "Je commence" CTA. | ✓ |
| Return to full list view | Deck collapses to list after all swiped. | |
| Just show empty deck state | Simple "Tu as voté sur toutes les recettes." | |

**User's choice:** "Tout vu" summary state

---

## Rejeté visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Never appear in the deck, always hidden | Rejeté cards skipped entirely. Never shown anywhere in shortlist view. | ✓ |
| In deck but visually muted | Rejeté cards faded with badge; can un-reject. | |
| Collapsed section below the deck | "Rejeté (N)" expandable section. | |

**User's choice:** Hidden entirely

---

| Option | Description | Selected |
|--------|-------------|----------|
| Recipe info + partner's vote dot | Card shows recipe + a colored dot (green/red/grey) for partner. | ✓ |
| Recipe info only | No partner vote visible until both voted. | |
| Both members' vote states always visible | Both dots visible at all times. | |

**User's choice:** Recipe info + partner's vote dot

---

## Web Push timing

| Option | Description | Selected |
|--------|-------------|----------|
| First shortlist notification, inline prompt | In-app banner on first shortlist: "Activer les notifications..." → browser permission. | ✓ |
| Settings toggle | Notifications toggle in /settings. | |
| On first install (during onboarding) | Permission asked during onboarding flow. | |

**User's choice:** Inline prompt on first shortlist

---

| Option | Description | Selected |
|--------|-------------|----------|
| 'Ton shortlist du jour est prêt !' → opens Home | Simple, clear, tap goes to Home (= shortlist). | ✓ |
| Notification lists recipe titles | Body includes first 2 recipe names. | |
| No recipe spoilers | "C'est l'heure de décider !" body. | |

**User's choice:** Simple "Ton shortlist du jour est prêt !" → Home

---

| Option | Description | Selected |
|--------|-------------|----------|
| Backend handles VAPID + subscription storage | VAPID keys in Railway env vars, POST /push/subscribe, pywebpush library. | ✓ |
| Use a push service (ntfy/OneSignal) | Third-party push broker. | |
| Claude's discretion | Let planner decide. | |

**User's choice:** Backend handles VAPID

---

## Claude's Discretion

- Tab label for Home (stays "Accueil" or becomes "Aujourd'hui") — planner decides
- Vote deduplication approach (upsert vs latest-wins) — planner picks simpler
- GET /shortlists/today response shape details — planner decides
- APScheduler setup pattern — planner decides
- Household timezone default (Europe/Paris) — noted in decisions
- framer-motion swipe implementation details
- push_subscriptions schema details

## Deferred Ideas

- Rejeté accessible view (past-rejected history) — Phase 4 candidate
- Cooking log finalization UI — Phase 4 scope
- Per-recipe vote history across shortlists — Phase 4 or productize-later
- Wildcard slot — productize-later
- Time-of-day awareness — productize-later
- Push notification customization — productize-later
