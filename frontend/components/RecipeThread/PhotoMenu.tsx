"use client";

// Phase 27 D-02 + D-03 — + menu sheet listing camera / library / URL.
// Mirrors the Sheet pattern from deleted frontend/components/PhotoCaptureTab.tsx
// (lines 152-211) but trimmed: this menu does NOT manage the bytes cap (the
// composer's parent does that) and emits at most ONE photo per tap (D-03 one
// photo per bubble).

import { useRef } from "react";
import { useTranslations } from "next-intl";
// Alias Image to avoid collision with next/image and the HTML Image element.
// Camera, Image, Link are Lucide icon components — aliased to avoid name clashes.
import { Camera, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PhotoMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPickPhoto: (file: File) => void;
  onPickUrl: () => void;
};

export function PhotoMenu({
  open,
  onOpenChange,
  onPickPhoto,
  onPickUrl,
}: PhotoMenuProps) {
  const t = useTranslations("recipes.thread");

  // Two hidden file inputs — one with capture="environment" for back camera (iOS)
  const fileCameraRef = useRef<HTMLInputElement | null>(null);
  const fileLibraryRef = useRef<HTMLInputElement | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-base font-medium">
            {t("plus_menu_title")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-2 p-4 pt-0">
          {/* Camera — back-camera bias via capture="environment" (iOS Safari) */}
          <Button
            variant="secondary"
            className="h-12"
            onClick={() => fileCameraRef.current?.click()}
          >
            <Camera size={18} className="mr-2" aria-hidden />
            {t("plus_camera")}
          </Button>

          {/* Photo library */}
          <Button
            variant="secondary"
            className="h-12"
            onClick={() => fileLibraryRef.current?.click()}
          >
            <ImageIcon size={18} className="mr-2" aria-hidden />
            {t("plus_library")}
          </Button>

          {/* URL option — closes menu and opens UrlSheet */}
          <Button
            variant="secondary"
            className="h-12"
            onClick={() => {
              onOpenChange(false);
              onPickUrl();
            }}
          >
            <LinkIcon size={18} className="mr-2" aria-hidden />
            {t("plus_url")}
          </Button>
        </div>

        {/* Hidden file inputs */}
        {/* iOS Safari: capture="environment" biases to the back camera; without
            capture the picker offers camera-roll + optional camera (Photothèque). */}
        <input
          ref={fileCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              onPickPhoto(f);
              onOpenChange(false);
            }
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
            if (f) {
              onPickPhoto(f);
              onOpenChange(false);
            }
            e.target.value = "";
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
