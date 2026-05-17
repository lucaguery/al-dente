"use client";

// UI-SPEC §"Component Inventory > PhotoUploader.tsx" — 2x2 grid of 96x96 photo
// slots; Plus icon on empty slot opens a Sheet with Camera/Library options;
// X overlay on filled slot removes (with undo toast).
//
// Auth model — Phase 01.1 cookie-auth: API calls go through `/api/...` paths
// which Vercel rewrites to Railway. The aldente_auth HttpOnly cookie is auto-
// attached by the browser on same-origin requests; we set
// `credentials: "include"` on fetch so it travels in local-dev cross-origin
// too. There is no Bearer token to inject — JS literally cannot see the
// cookie (T-01-02-03 mitigated by HttpOnly).

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X, Camera, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  uploadCookingLogPhoto,
  getCookingLogSignedPhotoUrl,
} from "@/lib/cooking";
import { useSignedPhotoUrl } from "@/lib/hooks/useSignedPhotoUrl";

const MAX_PHOTOS = 4;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

type Props = {
  /** If recipeId is null, photos cannot be uploaded yet (mid-form before save).
   *  In that case the empty slot is disabled — the new-recipe full-form
   *  flow handles photo upload AFTER first save (the user can edit-add later)
   *  and the quick-add flow uses a simpler picker on /recipes/new.
   *
   *  Phase 4 (04-02): when `cookingLogId` is set, the uploader targets the
   *  cooking-log endpoints (/api/cooking-logs/{id}/photos and
   *  /api/cooking-logs/{id}/photo-url) instead of the recipe endpoints.
   *  Both modes share the same UI; only the network call differs. */
  recipeId: string | null;
  cookingLogId?: string | null;
  paths: string[];
  onChange: (paths: string[]) => void;
};

// Phase 30 BUG-01 — per-tile component so each slot can call useSignedPhotoUrl
// independently. The hook is single-path; a sub-component is the right shape
// when rendering a variable-length list.
function FilledPhotoTile({
  recipeId,
  cookingLogId,
  path,
  onRemove,
  removeLabel,
}: {
  recipeId: string | null;
  cookingLogId: string | null | undefined;
  path: string;
  onRemove: () => void;
  removeLabel: string;
}) {
  // Recipe photos go through the shared hook for one-shot self-heal.
  // Cooking-log photos keep the existing per-tile fetch (out of scope).
  const hook = useSignedPhotoUrl(recipeId ?? "", cookingLogId ? null : path);
  const [cookingLogUrl, setCookingLogUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!cookingLogId) return;
    let alive = true;
    getCookingLogSignedPhotoUrl(cookingLogId, path)
      .then((u) => { if (alive) setCookingLogUrl(u); })
      .catch(() => {});
    return () => { alive = false; };
  }, [cookingLogId, path]);
  const url = cookingLogId ? cookingLogUrl : hook.src;
  return (
    <div className="relative h-24 w-24 rounded-lg overflow-hidden">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          onError={() => { if (!cookingLogId) hook.onError(); }}
        />
      ) : (
        <div className="h-full w-full bg-muted" />
      )}
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="absolute top-1 right-1 h-7 w-7 rounded-full bg-foreground/80 text-background flex items-center justify-center before:absolute before:-inset-2.5 before:content-['']"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function PhotoUploader({ recipeId, cookingLogId, paths, onChange }: Props) {
  const t = useTranslations("photo_uploader");
  const fileCameraRef = useRef<HTMLInputElement | null>(null);
  const fileLibraryRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFile(f: File) {
    const haveTarget = Boolean(recipeId || cookingLogId);
    if (!haveTarget) return;
    if (paths.length >= MAX_PHOTOS) {
      toast.error(t("error_limit"));
      return;
    }
    setUploading(true);
    try {
      if (cookingLogId) {
        try {
          const log = await uploadCookingLogPhoto(cookingLogId, f);
          onChange(log.photo_paths);
        } catch (e) {
          const status = (e as Error & { status?: number }).status;
          if (status === 413) toast.error(t("error_size"));
          else if (status === 415) toast.error(t("error_type"));
          else if (status === 409) toast.error(t("error_limit"));
          else toast.error(t("error_network"));
        }
      } else {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch(
          `${API_BASE}/api/recipes/${recipeId}/photos`,
          {
            method: "POST",
            body: fd,
            credentials: "include",
          },
        );
        if (res.status === 413) {
          toast.error(t("error_size"));
          return;
        }
        if (res.status === 415) {
          toast.error(t("error_type"));
          return;
        }
        if (res.status === 409) {
          toast.error(t("error_limit"));
          return;
        }
        if (!res.ok) {
          toast.error(t("error_network"));
          return;
        }
        const recipe = (await res.json()) as { photo_paths: string[] };
        onChange(recipe.photo_paths);
      }
    } catch {
      toast.error(t("error_network"));
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(path: string) {
    // TODO(productize): W1 has no DELETE /recipes/{id}/photos/{path} endpoint.
    // Removal here only drops the path from local form state; the bytes stay
    // in Supabase Storage until a productize-later cleanup pass when storage
    // limits become real. Documented in 01-11-PLAN as accepted disposition
    // T-01-11-02.
    const idx = paths.indexOf(path);
    if (idx === -1) return;
    const next = paths.filter((p) => p !== path);
    onChange(next);
    toast(t("removed_toast"), {
      action: {
        label: t("undo_cta"),
        onClick: () => {
          const restored = [...next];
          restored.splice(idx, 0, path);
          onChange(restored);
        },
      },
      duration: 5000,
    });
  }

  // Build the slot list: 1 tile per existing path, then exactly one "+" tile
  // (if room), then locked-empty tiles to keep the 2x2 grid stable. Per
  // UI-SPEC §10: "Disabled when 4 photos present (no add-slot rendered)".
  const slots: ({ kind: "filled"; path: string } | { kind: "add" } | { kind: "locked" })[] = [
    ...paths.map((p) => ({ kind: "filled" as const, path: p })),
  ];
  if (paths.length < MAX_PHOTOS) slots.push({ kind: "add" });
  while (slots.length < MAX_PHOTOS) slots.push({ kind: "locked" });

  return (
    <div className="grid grid-cols-2 gap-3">
      {slots.map((slot, i) => {
        if (slot.kind === "filled") {
          return (
            <FilledPhotoTile
              key={slot.path}
              recipeId={recipeId}
              cookingLogId={cookingLogId}
              path={slot.path}
              onRemove={() => removePhoto(slot.path)}
              removeLabel={t("remove_label")}
            />
          );
        }
        if (slot.kind === "add") {
          return (
            <Sheet key={`add-${i}`}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  disabled={(!recipeId && !cookingLogId) || uploading}
                  aria-label={t("add_label")}
                  className="paper-grain h-24 w-24 rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center disabled:opacity-50"
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>{t("sheet_title")}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 p-4 pt-0">
                  <Button
                    variant="secondary"
                    className="h-12"
                    onClick={() => fileCameraRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {t("sheet_camera")}
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-12"
                    onClick={() => fileLibraryRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {t("sheet_library")}
                  </Button>
                </div>
                {/* iOS Safari: `capture="environment"` biases to back-camera live
                    capture. Without `capture`, the picker offers camera-roll +
                    optional camera (the "Photothèque" affordance). */}
                <input
                  ref={fileCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadFile(f);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={fileLibraryRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadFile(f);
                    e.target.value = "";
                  }}
                />
              </SheetContent>
            </Sheet>
          );
        }
        // locked-empty (cap reached / placeholder)
        return (
          <div key={`locked-${i}`} aria-hidden className="h-24 w-24" />
        );
      })}
    </div>
  );
}
