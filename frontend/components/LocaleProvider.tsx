"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import type { AbstractIntlMessages } from "next-intl";

// Thin client-boundary wrapper around NextIntlClientProvider so the root
// layout (a Server Component) can pass server-loaded messages into the
// client message context. Locked to fr per CLAUDE.md invariant 6.
export function LocaleProvider({
  messages,
  children,
}: {
  messages: AbstractIntlMessages;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider locale="fr" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
