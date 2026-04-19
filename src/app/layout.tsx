import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Project Grail",
  description: "Track your Holy Grail challenge progress in Project Diablo 2. Find one of every item.",
  openGraph: {
    siteName: "Project Grail",
    title: "Project Grail",
    description: "Track your Holy Grail challenge progress in Project Diablo 2. Find one of every item.",
    url: "https://pd2grail.com",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Project Grail",
    description: "Track your Holy Grail challenge progress in Project Diablo 2. Find one of every item.",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
