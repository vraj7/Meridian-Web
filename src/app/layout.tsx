import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Disclaimer } from "@/components/shared/disclaimer";
import { BRAND } from "@/config/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${BRAND.fullName} | Market intelligence`,
  description: BRAND.description,
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: BRAND.name },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <AppProviders>
          <div className="flex min-h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
              <Header />
              <main className="flex-1 p-4 lg:p-8 overflow-auto max-w-[1400px] w-full mx-auto">
                {children}
              </main>
              <footer className="px-4 lg:px-8 py-4 border-t border-border">
                <Disclaimer />
              </footer>
            </div>
          </div>
          <MobileNav />
        </AppProviders>
      </body>
    </html>
  );
}
