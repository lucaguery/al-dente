"use client";

// CAPTURE-02 — Photo tab body for /recipes/new.
//
// Distinct from PhotoUploader.tsx (UI-SPEC §10): that component takes a
// recipeId and refreshes signed URLs for already-uploaded photos. THIS
// component is the "photo IS the recipe source" entry point — the user
// has nothing yet, snaps up to 4 photos, and POSTs the bytes themselves
// to /api/recipes/photo (Plan 02 backend). The backend creates the draft
// AND uploads the files in a single round-trip and queues Gemini
// extraction in a BackgroundTask. The user is then routed to /inbox so
// they see the spinner card flip to `structured`.
//
// Threat mitigations:
//   - T-02-04-01: object URLs revoked on cleanup to avoid memory leaks
//     (preview blobs would otherwise accumulate per remount).
//   - T-02-04-02: client-side 18 MB total cap matches the backend's
//     GEMINI_PHOTO_TOTAL_BYTES_CAP, so an oversized batch never reaches
//     Gemini (cost amplification mitigation). Backend is the
//     authoritative gate.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, ImageIcon, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { postPhotoCapture } from "@/lib/recipes";

const MAX_PHOTOS = 4;
// Matches backend GEMINI_PHOTO_TOTAL_BYTES_CAP (Plan 02 Task 2).
const TOTAL_BYTES_CAP = 18 * 1024 * 1024;

export function PhotoCaptureTab() {
  const router = useRouter();
  const t = useTranslations("recipes.photo");
  const tUploader = useTranslations("photo_uploader");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("onboarding.errors");

  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fileCameraRef = useRef<HTMLInputElement | null>(null);
  const fileLibraryRef = useRef<HTMLInputElement | null>(null);

  // Derive object URLs from files via useMemo (React 19's
  // `react-hooks/set-state-in-effect` rule rejects useState+useEffect
  // here). Revoke each URL when files change or component unmounts to
  // prevent the blob backing store from leaking (T-02-04-01).
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files],
  );
  useEffect(() => {
    return () => {
      for (const u of previews) {
        URL.revokeObjectURL(u);
      }
    };
  }, [previews]);

  function addFile(f: File) {
    if (files.length >= MAX_PHOTOS) {
      toast.error(tUploader("error_limit"));
      return;
    }
    const totalAfter = files.reduce((acc, x) => acc + x.size, 0) + f.size;
    if (totalAfter > TOTAL_BYTES_CAP) {
      toast.error(t("error_size_total"));
      return;
    }
    setFiles((prev) => [...prev, f]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (files.length === 0) return;
    setSubmitting(true);
    try {
      await postPhotoCapture(files);
      toast.success(t("submitted_toast"));
      router.replace("/inbox");
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "413") {
        toast.error(t("error_size_total"));
      } else {
        toast.error(tErr("network"));
      }
      setSubmitting(false);
    }
  }

  // Build the slot list: 1 tile per file, then exactly one "+" tile if
  // room, then locked-empty tiles to keep the 2x2 grid stable.
  const slots: ({ kind: "filled"; idx: number } | { kind: "add" } | { kind: "locked" })[] = [
    ...files.map((_, idx) => ({ kind: "filled" as const, idx })),
  ];
  if (files.length < MAX_PHOTOS) slots.push({ kind: "add" });
  while (slots.length < MAX_PHOTOS) slots.push({ kind: "locked" });

  return (
    <div className="px-6 pt-6 pb-32 flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold">{t("empty_heading")}</h2>
        <p className="text-sm text-muted-foreground">{t("empty_body")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot, i) => {
          if (slot.kind === "filled") {
            const url = previews[slot.idx];
            return (
              <div
                key={`f-${slot.idx}`}
                className="relative h-24 w-24 rounded-lg overflow-hidden"
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL; next/Image with custom loader is overkill
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
                <button
                  type="button"
                  aria-label={tUploader("remove_label")}
                  onClick={() => removeFile(slot.idx)}
                  className="absolute top-1 right-1 h-7 w-7 rounded-full bg-foreground/80 text-background flex items-center justify-center before:absolute before:-inset-2.5 before:content-['']"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          }
          if (slot.kind === "add") {
            return (
              <Sheet key={`add-${i}`}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    disabled={submitting}
                    aria-label={tUploader("add_label")}
                    className="paper-grain h-24 w-24 rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center disabled:opacity-50"
                  >
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom">
                  <SheetHeader>
                    <SheetTitle>{tUploader("sheet_title")}</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2 p-4 pt-0">
                    <Button
                      variant="secondary"
                      className="h-12"
                      onClick={() => fileCameraRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {tUploader("sheet_camera")}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-12"
                      onClick={() => fileLibraryRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {tUploader("sheet_library")}
                    </Button>
                  </div>
                  {/* iOS Safari: capture="environment" biases to the back
                      camera; without capture, the picker offers camera-roll
                      plus optional camera (the "Photothèque" affordance). */}
                  <input
                    ref={fileCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) addFile(f);
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
                      if (f) addFile(f);
                      e.target.value = "";
                    }}
                  />
                </SheetContent>
              </Sheet>
            );
          }
          return <div key={`locked-${i}`} aria-hidden className="h-24 w-24" />;
        })}
      </div>

      <Button
        type="button"
        className="h-12 w-full"
        disabled={files.length === 0 || submitting}
        onClick={submit}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {tCommon("sending")}
          </>
        ) : (
          t("capture")
        )}
      </Button>
    </div>
  );
}
