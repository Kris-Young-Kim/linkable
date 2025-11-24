import type React from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { LanguageProvider } from "@/components/language-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LinkAble - AI 기반 보조기기 매칭",
  description:
    "ICF·ISO 표준을 기반으로 한 AI 상담과 추천, K-IPPA 검증까지 제공하는 디지털 보조공학 코디네이터.",
  keywords: [
    "assistive technology",
    "ICF",
    "ISO",
    "AI 추천",
    "K-IPPA",
    "LinkAble",
  ],
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="ko">
        <body className={`${inter.className} font-sans antialiased`}>
          <LanguageProvider>{children}</LanguageProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
