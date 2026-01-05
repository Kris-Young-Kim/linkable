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

const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const naverSiteVerification = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION;

// Clerk 프록시 도메인 비활성화
// 프록시 도메인 사용 시 CORS 오류가 발생할 수 있으므로 기본 Clerk 도메인을 사용합니다.
// 프록시 도메인을 사용하려면 Clerk 대시보드에서 올바르게 설정해야 합니다.
// 환경변수로 Frontend API를 명시적으로 설정할 수 있습니다.
// 환경변수 예시: NEXT_PUBLIC_CLERK_FRONTEND_API=your-app.clerk.accounts.dev
const clerkFrontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;

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
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: "/icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  ...(googleSiteVerification || naverSiteVerification
    ? {
        verification: {
          ...(googleSiteVerification ? { google: googleSiteVerification } : {}),
          ...(naverSiteVerification
            ? { other: { "naver-site-verification": naverSiteVerification } }
            : {}),
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      {...(clerkFrontendApi ? { frontendApi: clerkFrontendApi } : {})}
      domain={undefined}
      proxyUrl={undefined}
    >
      <html lang="ko" data-scroll-behavior="smooth">
        <head>
          {/* DNS 프리페치 (Unsplash 도메인) - 메인 페이지에서만 사용되지만 DNS 조회는 전역적으로 유용 */}
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
            src={`https://www.googletagmanager.com/gtag/js?id=${
              process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-EV15PW3ERH"
            }`}
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
                gtag('config', '${
                  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-EV15PW3ERH"
                }', {
                  page_location: 'https://www.linkable.life' + window.location.pathname + window.location.search,
                  page_title: document.title,
                });
              `,
            }}
          />
          {/* Meta Pixel (Facebook Pixel) */}
          {process.env.NEXT_PUBLIC_META_PIXEL_ID &&
            process.env.NEXT_PUBLIC_META_PIXEL_ID !== "null" && (
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
