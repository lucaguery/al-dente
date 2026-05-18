"use client";

// Phase 30 BUG-01 D-03 / D-04 / D-05 — single hook consumed by all four
// photo-rendering surfaces (RecipeCard, ShortlistCard, PhotoUploader,
// /recipes/[id]/page.tsx). One source of truth for fetch + cache + retry.
//
// Contract:
//   - Returns { src, onError }. `src` is null until the first fetch
//     resolves; consumers gate their <img> render on `src != null`.
//   - On <img onError>, the hook runs the cache-invalidate + refetch path
//     EXACTLY ONCE per mount (D-04). The retry counter lives on per-mount
//     state — a remount (key change, route change) gets a fresh budget.
//     The cache entry is NOT flagged as "tried" so other consumers don't
//     inherit the back-off.
//   - Silent swap (D-05) — no skeleton, no spinner, no flicker. If the
//     refetched URL also errors, the hook stops; the component's existing
//     placeholder branch takes over.
//   - Dev-only 3-stage fallback (per CONTEXT.md "Pitfalls to avoid") stays
//     in the consumer component, gated on `process.env.NODE_ENV !== "production"`.
//     This hook covers the production self-heal path only.

import { useCallback, useEffect, useRef, useState } from "react";
import { getSignedPhotoUrl, invalidateSignedPhotoUrl } from "@/lib/recipes";

export function useSignedPhotoUrl(
  recipeId: string,
  path: string | null | undefined,
): { src: string | null; onError: () => void } {
  const [src, setSrc] = useState<string | null>(null);
  // Per-mount retry budget — one attempt total (D-04).
  const retriedRef = useRef(false);

  useEffect(() => {
    // No path → nothing to fetch; let the consumer's empty-state render.
    if (!path) {
      setSrc(null);
      retriedRef.current = false;
      return;
    }
    let alive = true;
    retriedRef.current = false;
    setSrc(null);
    getSignedPhotoUrl(recipeId, path)
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        // Fetch itself failed (network / 404). The consumer's onError will
        // never fire because no <img> was rendered. Surface the failure by
        // leaving src null — consumer falls through to placeholder.
        if (alive) setSrc(null);
      });
    return () => {
      alive = false;
    };
  }, [recipeId, path]);

  const onError = useCallback(() => {
    if (!path) return;
    if (retriedRef.current) return;
    retriedRef.current = true;
    // One-shot self-heal: drop the stale cache entry, refetch the URL,
    // swap <img src>. Silent — no loading state. If THIS URL also errors,
    // we don't retry again (D-04); the consumer's placeholder path wins.
    invalidateSignedPhotoUrl(recipeId, path);
    getSignedPhotoUrl(recipeId, path)
      .then((url) => setSrc(url))
      .catch(() => {
        // Second failure — stop retrying AND drop the now-broken URL.
        // Phase 34 LIVE-02: with the backend now returning 404 on a
        // missing storage object (B-02), the second attempt for a
        // permanently-gone path will reject again. Setting src to null
        // surfaces the consumer's placeholder branch instead of leaving
        // the broken <img src> visible, which would otherwise paint the
        // browser's default broken-image icon over the patine gradient.
        setSrc(null);
      });
  }, [recipeId, path]);

  return { src, onError };
}
