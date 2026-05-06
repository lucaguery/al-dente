"use client";

// UI-SPEC §"Interaction Patterns > Search behavior" — 300ms debounce,
// in-input Loader2 spinner while pending, X clear button, full-list on
// empty query (parent handles by re-fetching).
//
// Productize-later TODO: AbortController to cancel in-flight calls when a
// new keystroke arrives. v0.1 uses last-write-wins on Promise resolution
// (T-01-10-06 accepted residual at couple-scale).

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  /** Called with the trimmed-but-not-stripped query string after the 300ms debounce. */
  onQueryChange: (q: string) => Promise<void> | void;
};

const DEBOUNCE_MS = 300;

export function SearchInput({ onQueryChange }: Props) {
  const t = useTranslations("recipes");
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current != null) window.clearTimeout(timer.current);
    setPending(true);
    timer.current = window.setTimeout(async () => {
      try {
        await onQueryChange(value);
      } finally {
        setPending(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, [value, onQueryChange]);

  return (
    <div className="relative">
      <Search
        aria-hidden
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted"
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("search_placeholder")}
        className="pl-10 pr-10 h-10"
        aria-label={t("search_placeholder")}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
        {pending && value.length > 0 ? (
          <Loader2
            aria-hidden
            className="h-4 w-4 animate-spin text-foreground-muted"
          />
        ) : null}
        {value.length > 0 && !pending ? (
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("search_clear")}
            onClick={() => setValue("")}
            className="h-8 w-8"
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
