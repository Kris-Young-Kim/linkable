import type React from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { LanguageProvider } from "@/components/language-provider";
import { RoleGuard } from "@/components/role-guard";
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
        <head>
          {/* Google Tag Manager */}
          <Script
            id="gtm-base"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5JDT98J9');`,
            }}
          />
          {/* Google Analytics 4 (gtag.js) */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-EV15PW3ERH'}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-EV15PW3ERH'}');
              `,
            }}
          />
        </head>
        <body className={`${inter.className} font-sans antialiased`}>
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=GTM-5JDT98J9"
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
          <LanguageProvider>
            <RoleGuard>{children}</RoleGuard>
          </LanguageProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
