import { useEffect, useState } from "react";

// Suppresses a flag for `delayMs` after mount. Used to skip spinner renders
// when data resolves from cache before the user would notice a missing UI —
// avoids visible spinner flashes on warm-cache navigations.
export function useDelayedFlag(delayMs = 250): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return shown;
}
