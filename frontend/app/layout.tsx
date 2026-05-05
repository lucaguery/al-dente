import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/BottomNav";
import { LocaleProvider } from "@/components/LocaleProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  themeColor: "#0A0A0A",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <LocaleProvider messages={messages}>
          <main className="flex flex-col flex-1 pb-16">{children}</main>
          <BottomNav />
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
