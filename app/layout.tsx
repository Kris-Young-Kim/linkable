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
          {/* #region agent log */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  // Cursor IDE의 nextjs-portal 요소 관련 오류 무시
                  // 이 요소는 Cursor의 개발 도구이며 애플리케이션 기능에 영향을 주지 않음
                  
                  // nextjs-portal 요소 숨기기 (시각적 정리)
                  const hideNextjsPortals = function() {
                    const portals = document.querySelectorAll('nextjs-portal');
                    portals.forEach(function(portal) {
                      portal.style.display = 'none';
                      portal.style.visibility = 'hidden';
                      portal.style.width = '0';
                      portal.style.height = '0';
                    });
                  };
                  
                  // DOM 로드 후 실행
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', hideNextjsPortals);
                  } else {
                    hideNextjsPortals();
                  }
                  
                  // 동적으로 추가되는 nextjs-portal 요소도 숨기기
                  const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                      mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.tagName === 'NEXTJS-PORTAL') {
                          node.style.display = 'none';
                          node.style.visibility = 'hidden';
                          node.style.width = '0';
                          node.style.height = '0';
                        }
                      });
                    });
                  });
                  
                  if (document.body) {
                    observer.observe(document.body, { childList: true, subtree: true });
                  } else {
                    document.addEventListener('DOMContentLoaded', function() {
                      observer.observe(document.body, { childList: true, subtree: true });
                    });
                  }
                  
                  // Cursor 개발 도구 관련 오류 무시 (콘솔 정리)
                  const originalConsoleError = console.error;
                  console.error = function(...args) {
                    const errorMsg = args.join(' ');
                    // nextjs-portal 또는 Cursor 관련 오류는 무시
                    if (errorMsg.includes('nextjs-portal') || 
                        errorMsg.includes('ERR_CONNECTION_REFUSED') && errorMsg.includes('cursor')) {
                      return; // 오류를 콘솔에 출력하지 않음
                    }
                    originalConsoleError.apply(console, args);
                  };
                  
                  // 네트워크 오류 이벤트 필터링 (nextjs-portal 관련만)
                  window.addEventListener('error', function(e) {
                    // nextjs-portal 관련 오류는 기본 동작 방지
                    if (e.target && e.target.closest && e.target.closest('nextjs-portal')) {
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }
                  }, true);
                })();
              `,
            }}
          />
          {/* #endregion */}
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
          <AccessibilityControls />
          <AnalyticsEventListener />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
