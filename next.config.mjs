/** @type {import('next').NextConfig} */
const SYSTEM_FILES_TO_IGNORE = [
  // Windows 시스템 파일 (glob 패턴)
  "**/DumpStack.log.tmp",
  "**/hiberfil.sys",
  "**/pagefile.sys",
  "**/swapfile.sys",
  // Windows 시스템 파일 (절대 경로 - glob 패턴으로 표현)
  "C:/DumpStack.log.tmp",
  "C:/hiberfil.sys",
  "C:/pagefile.sys",
  "C:/swapfile.sys",
  "c:/DumpStack.log.tmp",
  "c:/hiberfil.sys",
  "c:/pagefile.sys",
  "c:/swapfile.sys",
]

const nextConfig = {
  // Next.js 16에서 Turbopack이 기본 활성화되어 있으므로 설정 추가
  turbopack: {},
  images: {
    // 이미지 최적화 활성화 (성능 개선)
    unoptimized: false,
    // 외부 이미지 도메인 허용
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      // 크롤링된 상품 이미지 도메인들
      {
        protocol: "https",
        hostname: "**.ablelife.co.kr",
      },
      {
        protocol: "https",
        hostname: "**.carelifemall.co.kr",
      },
      {
        protocol: "https",
        hostname: "**.willbe.kr",
      },
      {
        protocol: "https",
        hostname: "**.11st.co.kr",
      },
      {
        protocol: "https",
        hostname: "**.wheelopia.co.kr",
      },
      {
        protocol: "https",
        hostname: "**.sk-easymove.co.kr",
      },
      // 플러스에젤 이미지 도메인
      {
        protocol: "https",
        hostname: "plusagel.co.kr",
      },
      {
        protocol: "https",
        hostname: "**.plusagel.co.kr",
      },
      {
        protocol: "https",
        hostname: "plusezer.com",
      },
      {
        protocol: "https",
        hostname: "**.plusezer.com",
      },
      // 쿠팡 이미지 도메인
      {
        protocol: "https",
        hostname: "thumbnail.coupang.com",
      },
      {
        protocol: "https",
        hostname: "thumbnail.coupangcdn.com",
      },
      {
        protocol: "https",
        hostname: "**.coupang.com",
      },
      {
        protocol: "https",
        hostname: "**.coupangcdn.com",
      },
      // 네이버 쇼핑 이미지 도메인
      {
        protocol: "https",
        hostname: "shopping-phinf.pstatic.net",
      },
      {
        protocol: "https",
        hostname: "**.pstatic.net",
      },
      {
        protocol: "https",
        hostname: "**.naver.com",
      },
      {
        protocol: "https",
        hostname: "**.navercorp.com",
      },
      // 일반 CDN 및 예제 도메인
      {
        protocol: "https",
        hostname: "cdn.example.com",
      },
      {
        protocol: "https",
        hostname: "**.example.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.imgur.com",
      },
      {
        protocol: "https",
        hostname: "**.githubusercontent.com",
      },
      // 기타 쇼핑몰 이미지 도메인
      {
        protocol: "https",
        hostname: "**.gmarket.co.kr",
      },
      {
        protocol: "https",
        hostname: "**.auction.co.kr",
      },
      {
        protocol: "https",
        hostname: "**.interpark.com",
      },
      {
        protocol: "https",
        hostname: "**.lotteon.com",
      },
      {
        protocol: "https",
        hostname: "**.ssg.com",
      },
      // 예제 이미지 도메인
      {
        protocol: "https",
        hostname: "thumbnail.image.com",
      },
      {
        protocol: "https",
        hostname: "**.image.com",
      },
    ],
    // 이미지 최적화 품질 설정
    formats: ["image/avif", "image/webp"],
    // 디바이스별 이미지 크기 최적화
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      const currentWatchOptions = config.watchOptions || {}
      const ignored = currentWatchOptions.ignored

      // 기존 ignored가 RegExp인 경우 문자열로 변환 불가하므로 새 배열 생성
      const ignoredList = Array.isArray(ignored)
        ? ignored.filter((pattern) => typeof pattern === "string" && pattern.length > 0)
        : typeof ignored === "string" && ignored.length > 0
          ? [ignored]
          : []

      config.watchOptions = {
        ...currentWatchOptions,
        ignored: [
          ...ignoredList,
          ...SYSTEM_FILES_TO_IGNORE,
          // node_modules와 .next는 기본적으로 무시되지만 명시적으로 추가
          "**/node_modules/**",
          "**/.next/**",
        ],
        // Windows에서 파일 시스템 감시 최적화
        followSymlinks: false,
        // 폴링 대신 네이티브 파일 시스템 이벤트 사용
        poll: false,
      }
    }

    return config
  },
}

export default nextConfig
