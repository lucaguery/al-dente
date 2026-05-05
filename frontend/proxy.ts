import { NextResponse } from "next/server";

// Single-locale (fr) PWA in v0.1 — next-intl middleware would normally
// handle locale-prefixed routing, but we keep one global locale and let
// next-intl source the locale from `i18n.ts` directly. This proxy is a
// no-op pass-through; it exists so future locales can slot in here
// without restructuring routes (productize-later when EN/ES land).
//
// Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts` (same
// function, renamed convention). Plan 01-02 listed the file as
// `frontend/middleware.ts`; we use the post-deprecation name to avoid
// build warnings.
//
// `// TODO(productize)`: swap for `createIntlMiddleware` from next-intl
// when adding more than one locale.
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
