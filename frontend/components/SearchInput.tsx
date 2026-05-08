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
  // Stash the latest onQueryChange so we don't re-arm the debounce when the
  // parent re-creates the callback on every render.
  const callbackRef = useRef(onQueryChange);
  useEffect(() => {
    callbackRef.current = onQueryChange;
  }, [onQueryChange]);

  // Schedule a debounced fetch on every keystroke. We INTENTIONALLY drive
  // this from the input's onChange handler (not a useEffect on `value`) to
  // satisfy React 19's `react-hooks/set-state-in-effect` rule — setPending
  // is event-driven, not effect-driven.
  const scheduleSearch = (next: string) => {
    if (timer.current != null) window.clearTimeout(timer.current);
    setPending(true);
    timer.current = window.setTimeout(async () => {
      try {
        await callbackRef.current(next);
      } finally {
        setPending(false);
      }
    }, DEBOUNCE_MS);
  };

  // Fire an initial empty-query fetch on mount so the parent gets its first
  // page of results. We do this via a setTimeout (not a state set) inside
  // the effect to avoid the cascading-render lint rule.
  useEffect(() => {
    const id = window.setTimeout(() => {
      void callbackRef.current("");
    }, 0);
    return () => {
      window.clearTimeout(id);
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);
    scheduleSearch(next);
  };

  const onClear = () => {
    setValue("");
    scheduleSearch("");
  };

  // NOTE: paper-grain is applied as a SIBLING absolute layer, NOT a parent
  // class. globals.css `.paper-grain > * { position: relative }` would
  // override the absolute Search icon + right-side controls. Putting the
  // paper-grain on a sibling div (not a parent of the icons) keeps the
  // texture while preserving the layout. The Input gets `bg-card relative`
  // to layer above the paper-grain layer.
  return (
    <div className="relative rounded-xl">
      <div
        aria-hidden
        className="absolute inset-0 paper-grain rounded-xl pointer-events-none"
      />
      <Search
        aria-hidden
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted z-10 pointer-events-none"
      />
      <Input
        value={value}
        onChange={onChange}
        placeholder={t("search_placeholder")}
        className="pl-10 pr-12 h-12 rounded-xl bg-card relative focus:ring-2 focus:ring-primary/30"
        aria-label={t("search_placeholder")}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-10">
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
            onClick={onClear}
            className="h-10 w-10"
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
