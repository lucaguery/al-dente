"use client";

// Phase 27 D-02 — URL input sheet (opened from + menu's "Coller un lien").
// Validation pattern mirrors deleted frontend/components/UrlCaptureTab.tsx:
//   new URL(v).protocol === "http:" || "https:" — explicit + discoverable.

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type UrlSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (url: string) => void;
};

export function UrlSheet({ open, onOpenChange, onConfirm }: UrlSheetProps) {
  const t = useTranslations("recipes.thread");

  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = value.trim();

  const isValid = useMemo(() => {
    if (trimmed.length === 0) return false;
    try {
      const p = new URL(trimmed);
      return p.protocol === "http:" || p.protocol === "https:";
    } catch {
      return false;
    }
  }, [trimmed]);

  const showError = touched && trimmed.length > 0 && !isValid;

  function handleConfirm() {
    if (!isValid) return;
    onConfirm(trimmed);
    setValue("");
    setTouched(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-base font-medium">
            {t("url_sheet_title")}
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 mt-2 flex flex-col gap-1">
          <Label>{t("url_sheet_title")}</Label>
          <Input
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            autoFocus
            placeholder={t("url_placeholder")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          {showError && (
            <p className="text-sm text-destructive mt-1">{t("url_invalid")}</p>
          )}
        </div>

        <div className="px-4 py-4">
          <Button
            type="button"
            variant="default"
            className="h-12 w-full"
            disabled={!isValid}
            onClick={handleConfirm}
          >
            {t("url_add")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
