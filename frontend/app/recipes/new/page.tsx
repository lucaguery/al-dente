"use client";

// Phase 27 CAPTURE-01..03 — conversational capture screen.
//
// Mounts <RecipeThread mode="capture" /> from Plan 27-02. Owns the pending-
// bubbles state, the photo-bytes running total, the saving flag, and the
// Enregistrer save-flow choreography per CONTEXT.md D-12 + D-13b:
//
//   1. createBlankRecipe()                       -> draft row, no promote_draft scheduled yet
//   2. for each bubble in entry order:
//        - text/voice/url: POST /api/recipes/{id}/turns (JSON)
//        - photo:           POST /api/recipes/{id}/turns/photo (multipart, single file)
//   3. promoteDraft(recipe.id)                   -> schedules the ONE Gemini run
//   4. router.replace(`/recipes/${recipe.id}`)   -> conversation continues on /recipes/[id]
//
// Back-with-pending-bubbles guard: window.confirm(t("discard_confirm")) per
// UI-SPEC Claude's Discretion resolution. PWA force-quit drops pending state
// (no localStorage persistence — TODO(productize) inline).
//
// The five tabbed capture surfaces from v0.5 are gone (CONTEXT.md D-09 + D-11).
// This file is now the only entry point for capture.

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { createBlankRecipe, promoteDraft } from "@/lib/recipes";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import RecipeThread from "@/components/RecipeThread";
import type { PendingBubble } from "@/components/RecipeThread/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function RecipeNewPage() {
  return (
    <OnboardingGuard>
      <Inner />
    </OnboardingGuard>
  );
}

function Inner() {
  const router = useRouter();
  // recipes.new.tab_title = "Nouvelle recette" — kept in fr.json (only tab_quick/tab_full were pruned)
  const tNew = useTranslations("recipes.new");
  const t = useTranslations("recipes.thread");
  const tCommon = useTranslations("common");

  // TODO(productize) — pending bubbles are ephemeral (in React state only).
  // If the user closes the page or force-quits the PWA, pending state is lost.
  // Pre-save persistence could be wired via IndexedDB in a future milestone.
  const [pendingBubbles, setPendingBubbles] = useState<PendingBubble[]>([]);
  const [saving, setSaving] = useState(false);

  // Photo cap state (D-03 + UI-SPEC §"Photo-bytes cap surfacing").
  const photoTotalBytes = pendingBubbles.reduce(
    (acc, b) => (b.kind === "photo" ? acc + b.sizeBytes : acc),
    0,
  );
  const photoCount = pendingBubbles.filter((b) => b.kind === "photo").length;

  // Object-URL cleanup: when a photo bubble is removed or the component
  // unmounts, revoke the local preview URL to avoid memory leaks
  // (T-02-04-01 carried forward from PhotoCaptureTab).
  useEffect(() => {
    return () => {
      for (const b of pendingBubbles) {
        if (b.kind === "photo") {
          try {
            URL.revokeObjectURL(b.previewUrl);
          } catch {
            /* noop */
          }
        }
      }
    };
    // Intentionally empty dep array — we only revoke on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addPendingBubble = useCallback(
    (b: PendingBubble) => {
      // Photo cap enforcement (one source of truth — RecipeThread/index.tsx
      // also checks, but the page owns the canonical state).
      if (b.kind === "photo") {
        const TOTAL_CAP = 18 * 1024 * 1024; // 18 MB, matches backend GEMINI_PHOTO_TOTAL_BYTES_CAP
        const MAX_PHOTOS = 4;
        if (photoCount >= MAX_PHOTOS) {
          toast.error(t("photo_cap_exceeded"));
          try {
            URL.revokeObjectURL(b.previewUrl);
          } catch {
            /* noop */
          }
          return;
        }
        if (photoTotalBytes + b.sizeBytes > TOTAL_CAP) {
          toast.error(t("photo_cap_exceeded"));
          try {
            URL.revokeObjectURL(b.previewUrl);
          } catch {
            /* noop */
          }
          return;
        }
      }
      setPendingBubbles((prev) => [...prev, b]);
    },
    [photoTotalBytes, photoCount, t],
  );

  const dismissPendingBubble = useCallback((id: string) => {
    setPendingBubbles((prev) => {
      const removed = prev.find((b) => b.id === id);
      if (removed && removed.kind === "photo") {
        try {
          URL.revokeObjectURL(removed.previewUrl);
        } catch {
          /* noop */
        }
      }
      return prev.filter((b) => b.id !== id);
    });
  }, []);

  const onSave = useCallback(async () => {
    if (pendingBubbles.length === 0 || saving) return;
    setSaving(true);
    try {
      // Step 1 — create blank draft (no title field, no bubbles yet).
      const recipe = await createBlankRecipe();

      // Step 2 — POST each pending bubble as a turn, in entry order.
      // Sequential awaits keep position order deterministic (Phase 26 D-18
      // serializes positions server-side too, but sequential POSTs make
      // the order predictable client-side without relying on the lock).
      for (const b of pendingBubbles) {
        if (b.kind === "text") {
          await api(`/api/recipes/${recipe.id}/turns`, {
            method: "POST",
            body: JSON.stringify({ kind: "text", text: b.text }),
          });
        } else if (b.kind === "voice") {
          await api(`/api/recipes/${recipe.id}/turns`, {
            method: "POST",
            body: JSON.stringify({ kind: "voice", transcript: b.transcript }),
          });
        } else if (b.kind === "url") {
          await api(`/api/recipes/${recipe.id}/turns`, {
            method: "POST",
            body: JSON.stringify({ kind: "url", url: b.url }),
          });
        } else if (b.kind === "photo") {
          // Multipart — bypass api() helper because it default-sets
          // Content-Type: application/json (Phase 26 D-01 precedent).
          const fd = new FormData();
          fd.append("files", b.file);
          const res = await fetch(
            `${API_BASE}/api/recipes/${recipe.id}/turns/photo`,
            {
              method: "POST",
              body: fd,
              credentials: "include",
            },
          );
          if (!res.ok) throw new Error(`photo turn ${res.status}`);
        }
      }

      // Step 3 — coalesced promote (D-13b).
      await promoteDraft(recipe.id);

      // Step 4 — land on the detail page where the thread continues.
      router.replace(`/recipes/${recipe.id}`);
    } catch (err) {
      console.error("save flow failed", err);
      toast.error(t("turn_failed"));
      setSaving(false);
    }
  }, [pendingBubbles, saving, router, t]);

  const onBackArrow = useCallback(() => {
    if (pendingBubbles.length === 0) {
      router.back();
      return;
    }
    // UI-SPEC Claude's Discretion: window.confirm for low-frequency destructive action.
    if (window.confirm(t("discard_confirm"))) {
      // Revoke object URLs before unmount.
      for (const b of pendingBubbles) {
        if (b.kind === "photo") {
          try {
            URL.revokeObjectURL(b.previewUrl);
          } catch {
            /* noop */
          }
        }
      }
      router.back();
    }
  }, [pendingBubbles, router, t]);

  return (
    <section className="flex flex-col h-[100dvh]">
      <header className="sticky top-0 z-10 h-12 px-(--spacing-page-x) flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border">
        <Button
          size="icon"
          variant="ghost"
          aria-label={tCommon("back")}
          onClick={onBackArrow}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-page-header">{tNew("tab_title")}</span>
        <span className="w-10" aria-hidden />
      </header>
      <RecipeThread
        mode="capture"
        pendingBubbles={pendingBubbles}
        onAddPendingBubble={addPendingBubble}
        onDismissPendingBubble={dismissPendingBubble}
        photoTotalBytes={photoTotalBytes}
        saving={saving}
        onSave={onSave}
        recipeId={null}
      />
    </section>
  );
}
