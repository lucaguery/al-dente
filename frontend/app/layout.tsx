import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans, Geist_Mono } from "next/font/google";
import { getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/BottomNav";
import { LocaleProvider } from "@/components/LocaleProvider";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
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

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
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
  themeColor: "#C8553D",
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
      className={`${fraunces.variable} ${ibmPlexSans.variable} ${geistMono.variable} h-full antialiased`}
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
              <main className="flex flex-col flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</main>
              <BottomNav />
              <Toaster />
            </RealtimeProvider>
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
