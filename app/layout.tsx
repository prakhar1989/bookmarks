import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "./stack";
import "@/app/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Newsreader, IBM_Plex_Mono } from "next/font/google";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["200", "300", "400", "600", "700", "800"],
  variable: "--font-newsreader",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stashly - AI-Powered Bookmarking",
  description:
    "Save and organize your bookmarks with AI-powered content extraction, intelligent summaries, and automatic tagging.",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "any", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stashly",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Stashly",
    title: "Stashly - AI-Powered Bookmarking",
    description:
      "Save and organize your bookmarks with AI-powered content extraction, intelligent summaries, and automatic tagging.",
  },
  twitter: {
    card: "summary",
    title: "Stashly - AI-Powered Bookmarking",
    description:
      "Save and organize your bookmarks with AI-powered content extraction, intelligent summaries, and automatic tagging.",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${newsreader.variable} ${ibmPlexMono.variable}`}
    >
      <body className="relative flex min-h-screen flex-col bg-gradient font-sans antialiased text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StackProvider app={stackServerApp}>
            <StackTheme>{children}</StackTheme>
          </StackProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
