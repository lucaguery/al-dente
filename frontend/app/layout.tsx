import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/BottomNav";
import { LocaleProvider } from "@/components/LocaleProvider";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

// ADR-0004 §Type stack — Geist 400/500 for display + body, Geist Mono 400
// for indices/dates/metadata. The old serif + handwriting + body fonts are
// dropped per the La Grille · Soft warmth register.
const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Al Dente",
  description: "Décide ce qu'on mange ensemble.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Al Dente",
  },
};

// Next.js 16: themeColor moved from `metadata` to the `viewport` export.
// ADR-0004 §Logo — refined terracotta `#A8523C` is the brand atom.
export const viewport: Viewport = {
  themeColor: "#A8523C",
  width: "device-width",
  initialScale: 1,
  // viewportFit=cover lets us paint into the iOS notch / home-indicator
  // safe areas; pair with env(safe-area-inset-*) below.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  return (
    <html
      lang="fr"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-dvh flex flex-col bg-background text-foreground"
        style={{
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <LocaleProvider messages={messages}>
          <SessionProvider>
            <RealtimeProvider>
              <main className="flex flex-col flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
              <BottomNav />
              <Toaster />
            </RealtimeProvider>
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
