import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, IBM_Plex_Sans, Caveat } from "next/font/google";
import { getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/BottomNav";
import { LocaleProvider } from "@/components/LocaleProvider";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-marginalia",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
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
export const viewport: Viewport = {
  themeColor: "#8B4A35",
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
      className={`${cormorantGaramond.variable} ${ibmPlexSans.variable} ${caveat.variable} h-full antialiased`}
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
