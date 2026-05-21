"use client";

// Phase 41 PICK-02 — pre-seeded capture thread, one route per surface.
// /recipes/new/[surface] with surface ∈ {form, voice, photo, url}.
//
// 'quick' is DELIBERATELY EXCLUDED — Note rapide is a modal on /recipes/new,
// not a route (D-02 bypass). An unknown surface (or 'quick' typed directly)
// 404s via next/navigation's notFound().
//
// The prior <RecipeThread mode="capture" /> mount that lived inline on
// /recipes/new (now the picker — Plan 41-03 Task 2A) moves here verbatim.
// All pending-bubble / save / photo-cap logic is identical to the prior
// capture surface; only the host route changed. D-09 + D-11 in-thread
// unification is PRESERVED — once you're inside the thread there are no
// tabs to switch surfaces; the chooser is upstream and one-way per tap.
//
// Surface pre-seeding (D-03) — DEFERRED.
// CONTEXT.md D-03 spec-level: form/voice/photo/url should each enter the
// composer with their relevant input pre-focused (form → text input;
// voice → mic toggle pressed; photo → file picker auto-triggered; url →
// URL input focused). Implementing those requires extending the
// <RecipeThread mode="capture" /> component with an initialSurface prop and
// a mount-time useEffect that dispatches the appropriate composer-state
// action. RecipeThread/index.tsx and RecipeThread/types.ts are NOT listed
// in Plan 41-03's files_modified; per the orchestrator's scope guard, the
// extension is deferred to a follow-up plan. The user still lands on the
// correct entry point per surface (URL routes correctly); they tap the
// composer button themselves. Surface-specific auto-seed is v0.10 polish.

import { use, useCallback, useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { createBlankRecipe, promoteDraft } from "@/lib/recipes";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import RecipeThread from "@/components/RecipeThread";
import { BrandIcon } from "@/components/BrandIcon";
import type { PendingBubble } from "@/components/RecipeThread/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const VALID_SURFACES = ["form", "voice", "photo", "url"] as const;
type ValidSurface = (typeof VALID_SURFACES)[number];

function isValidSurface(s: string): s is ValidSurface {
  return (VALID_SURFACES as readonly string[]).includes(s);
}

export default function CaptureSurfacePage({
  params,
}: {
  // Next 16 — params is async per frontend/CLAUDE.md breaking changes.
  params: Promise<{ surface: string }>;
}) {
  const { surface } = use(params);
  if (!isValidSurface(surface)) {
    notFound();
  }
  return (
    <OnboardingGuard>
      <Inner />
    </OnboardingGuard>
  );
}

function Inner() {
  const router = useRouter();
  const tNew = useTranslations("recipes.new");
  const t = useTranslations("recipes.thread");
  const tCommon = useTranslations("common");

  const [pendingBubbles, setPendingBubbles] = useState<PendingBubble[]>([]);
  const [saving, setSaving] = useState(false);

  const photoTotalBytes = pendingBubbles.reduce(
    (acc, b) => (b.kind === "photo" ? acc + b.sizeBytes : acc),
    0,
  );
  const photoCount = pendingBubbles.filter((b) => b.kind === "photo").length;

  // Object-URL cleanup on unmount — T-02-04-01 carried forward from the
  // prior /recipes/new/page.tsx implementation.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addPendingBubble = useCallback(
    (b: PendingBubble) => {
      if (b.kind === "photo") {
        const TOTAL_CAP = 18 * 1024 * 1024;
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
      const recipe = await createBlankRecipe();
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
      await promoteDraft(recipe.id);
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
    if (window.confirm(t("discard_confirm"))) {
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

  const showWatermark = pendingBubbles.length === 0;

  return (
    <section className="relative flex flex-col flex-1 min-h-0">
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
      {showWatermark ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-foreground-muted opacity-[0.08]"
        >
          <BrandIcon size={280} strokeWidth={4} />
        </div>
      ) : null}
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
