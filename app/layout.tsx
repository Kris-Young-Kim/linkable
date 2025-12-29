import type React from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AnalyticsEventListener } from "@/components/analytics-event-listener";
import { AccessibilityControls } from "@/components/accessibility-controls";
import { LanguageProvider } from "@/components/language-provider";
import { RoleGuard } from "@/components/role-guard";
import { SWRProvider } from "@/lib/swr-provider";
import { SkipToMain } from "@/components/skip-to-main";
import { WebVitalsTracker } from "@/components/performance/web-vitals-tracker";
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
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
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
      <html lang="ko" data-scroll-behavior="smooth">
        <head>
          {/* 이미지 프리로딩 - LCP 개선 (메인 페이지 Hero 섹션) */}
          <link
            rel="preload"
            as="image"
            href="https://images.unsplash.com/photo-1762264643661-d889726815cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4MTYyMzB8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwY2l0eSUyMGFic3RyYWN0JTIwYnJpZ2h0fGVufDB8MHx8fDE3NjUxNTkwMzN8MA&ixlib=rb-4.1.0&q=80&w=1920"
            fetchPriority="high"
          />
          <link
            rel="preload"
            as="image"
            href="https://images.unsplash.com/photo-1723433892471-62f113c8c9a0?auto=format&fit=crop&w=600&q=80"
            fetchPriority="high"
          />
          <link
            rel="preload"
            as="image"
            href="https://images.unsplash.com/photo-1585244129648-5dc1f9cd9d7a?auto=format&fit=crop&w=600&q=80"
            fetchPriority="low"
          />
          <link
            rel="preload"
            as="image"
            href="https://images.unsplash.com/photo-1651326659270-59bbb788199a?auto=format&fit=crop&w=600&q=80"
            fetchPriority="low"
          />
          {/* Hero 섹션 첫 3개 이미지 프리로딩 (Above the fold) */}
          <link
            rel="preload"
            as="image"
            href="https://images.unsplash.com/photo-1576864333223-db90dadfb975?auto=format&fit=crop&w=600&q=80"
            fetchPriority="high"
          />
          <link
            rel="preload"
            as="image"
            href="https://images.unsplash.com/photo-1668983396705-3aa5deed5569?auto=format&fit=crop&w=600&q=80"
            fetchPriority="high"
          />
          <link
            rel="preload"
            as="image"
            href="https://images.unsplash.com/photo-1695654402339-050e6aee866b?auto=format&fit=crop&w=600&q=80"
            fetchPriority="high"
          />
          {/* DNS 프리페치 (Unsplash 도메인) */}
          <link rel="dns-prefetch" href="https://images.unsplash.com" />
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
          {/* Meta Pixel (Facebook Pixel) */}
          {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
            <>
              <Script
                id="meta-pixel"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `
                    !function(f,b,e,v,n,t,s)
                    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window, document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                    fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
                    fbq('track', 'PageView');
                  `,
                }}
              />
              <noscript>
                <img
                  height="1"
                  width="1"
                  style={{ display: "none" }}
                  src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_META_PIXEL_ID}&ev=PageView&noscript=1`}
                  alt=""
                />
              </noscript>
            </>
          )}
        </head>
        <body className={`${inter.className} font-sans antialiased`}>
          <SkipToMain />
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=GTM-5JDT98J9"
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
          <LanguageProvider>
            <SWRProvider>
              <RoleGuard>{children}</RoleGuard>
            </SWRProvider>
          </LanguageProvider>
          <AccessibilityControls />
          <AnalyticsEventListener />
          <Analytics />
          <WebVitalsTracker />
        </body>
      </html>
    </ClerkProvider>
  );
}
