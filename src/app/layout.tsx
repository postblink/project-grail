import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
  metadataBase: new URL("https://pd2grail.com"),
  title: "Project Grail",
  description: "A living record of the hunt. Track every unique, set item, runeword, and rune in Project Diablo 2.",
  openGraph: {
    siteName: "Project Grail",
    title: "Project Grail",
    description: "Every relic. Every rune. One ledger.",
    url: "https://pd2grail.com",
    type: "website",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Project Grail — Every relic. Every rune. One ledger." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Project Grail",
    description: "Every relic. Every rune. One ledger.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
