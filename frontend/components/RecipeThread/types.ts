// Phase 27 CAPTURE-01..04 — shared RecipeThread types.
//
// CAPTURE-04 contract: one component, two mount points (capture mode for
// /recipes/new, detail mode for /recipes/[id]). Props are a discriminated
// union on `mode` so capture-only callbacks (onSave, photoTotalBytes) and
// detail-only callbacks (onPostTextTurn etc.) cannot accidentally cross
// wires. Phase 28 will add new detail-mode callbacks for answer + proposal
// turns; do not delete the `?: never` markers — they keep the discriminator
// tight.

import type { TurnKind, TurnSender, AnswerField } from "@/lib/enums";

/**
 * Phase 28 DETAIL-02 — answer-turn payload shape, mirrors backend
 * AnswerTurnPayload in backend/app/schemas/recipe_turn.py.
 * The `value` field is typed as `unknown` here — per-field type
 * discrimination is enforced server-side via the Pydantic value
 * validator (Phase 26 D-09). Frontend trusts the chip/stepper/text
 * UI to emit the right shape per the question turn's payload.field.
 */
export type AnswerTurnSubmission = {
  in_reply_to_turn_id: string;
  field: AnswerField;
  value: unknown;
};

/**
 * A bubble buffered in component state on /recipes/new before the user
 * taps Enregistrer. Each maps 1:1 to a future POST /turns request.
 *
 * Note: `id` is a client-only UUID generated via `crypto.randomUUID()` in
 * callers. It is NOT persisted to the backend and is only used for React
 * key + dismiss matching within the pending bubble list.
 */
export type PendingBubble =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "voice"; transcript: string }
  | { id: string; kind: "photo"; file: File; previewUrl: string; sizeBytes: number }
  | { id: string; kind: "url"; url: string };

/**
 * A persisted turn from the backend's TurnResponse shape (Phase 26).
 * Mirrors backend/app/schemas/recipe_turn.py::TurnResponse byte-for-byte.
 */
export type PersistedTurn = {
  id: string;
  recipe_id: string;
  position: number;
  sender: TurnSender;
  kind: TurnKind;
  payload: Record<string, unknown>;
  created_at: string;
};

export type RecipeStatus = "draft" | "structured" | "verified" | "failed";

export type RecipeThreadProps =
  | {
      mode: "capture";
      pendingBubbles: PendingBubble[];
      onAddPendingBubble: (b: PendingBubble) => void;
      onDismissPendingBubble: (id: string) => void;
      /** Total cumulative photo bytes across pendingBubbles (for the 18MB cap). */
      photoTotalBytes: number;
      /** Saving flag — when true, save bar shows "Enregistrement…" and composer disables. */
      saving: boolean;
      /** Called when « Enregistrer » is tapped. Parent owns the API choreography. */
      onSave: () => void;
      /** Always null in capture mode (no recipe id until save). */
      recipeId: null;
      // detail-mode-only fields are unused here but kept for the union exhaustiveness:
      turns?: never;
      title?: never;
      recipeStatus?: never;
      onPostTextTurn?: never;
      onPostVoiceTurn?: never;
      onPostUrlTurn?: never;
      onPostPhotoTurn?: never;
      onManualEditLinkClick?: never;
      manuallyEditedFields?: never;
      onPostAnswerTurn?: never;
      onPostProposalAccepted?: never;
      onPostProposalDismissed?: never;
      deferred?: never;
      onSummaryComplete?: never;
      onSummaryLater?: never;
    }
  | {
      mode: "detail";
      recipeId: string;
      title: string;
      turns: PersistedTurn[];
      recipeStatus: RecipeStatus;
      /** Parent POSTs the turn via POST /api/recipes/{id}/turns (Phase 26). */
      onPostTextTurn: (text: string) => Promise<void>;
      onPostVoiceTurn: (transcript: string) => Promise<void>;
      onPostUrlTurn: (url: string) => Promise<void>;
      onPostPhotoTurn: (file: File) => Promise<void>;
      /** Tap on « Ou modifier les champs directement… » — Plan 27-05 scrolls to form. */
      onManualEditLinkClick: () => void;
      /** Phase 28 DETAIL-04 — pin set, drives marginalia on form/sections (read-only). */
      manuallyEditedFields: string[];
      /** Phase 28 DETAIL-02 — parent POSTs the answer turn with optimistic state update. */
      onPostAnswerTurn: (submission: AnswerTurnSubmission) => Promise<void>;
      /** Phase 28 DETAIL-03 — parent POSTs proposal_accepted + applies proposed_value optimistically. */
      onPostProposalAccepted: (advisoryTurnId: string) => Promise<void>;
      /** Phase 28 DETAIL-03 — parent POSTs proposal_dismissed (no local state change). */
      onPostProposalDismissed: (advisoryTurnId: string) => Promise<void>;
      /** Phase 29 D-22 — true when recipe.questions_deferred_until > now(). */
      deferred: boolean;
      /** Phase 29 D-22 — POST /api/recipes/{id}/questions/trigger; on 204 parent toasts « Tout est complet. ». */
      onSummaryComplete: (turnId: string) => Promise<void>;
      /** Phase 29 D-22 — POST /api/recipes/{id}/questions/defer; on 204 parent updates recipe via WS. */
      onSummaryLater: (turnId: string) => Promise<void>;
      // capture-mode-only fields are unused here:
      pendingBubbles?: never;
      onAddPendingBubble?: never;
      onDismissPendingBubble?: never;
      photoTotalBytes?: never;
      saving?: never;
      onSave?: never;
    };

export type ComposerProps = {
  mode: "capture" | "detail";
  /** Disabled when saving (capture) or when a network call is in flight (detail). */
  disabled: boolean;
  /** Called when the user emits a text bubble (capture) or text turn (detail). */
  onSubmitText: (text: string) => void;
  /** Called when the user finishes the voice sheet. */
  onSubmitVoice: (transcript: string) => void;
  /** Called when the user picks an image (camera or library). */
  onSubmitPhoto: (file: File) => void;
  /** Called when the user confirms a URL. */
  onSubmitUrl: (url: string) => void;
  /** Photo cap state (capture only — detail mode passes 0 / Infinity for none). */
  photoTotalBytes: number;
  photoCountInThread: number;
};
