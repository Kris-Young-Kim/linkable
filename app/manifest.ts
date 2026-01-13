import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LinkAble - AI 기반 보조기기 매칭',
    short_name: 'LinkAble',
    description: 'ICF·ISO 표준을 기반으로 한 AI 상담과 추천, K-IPPA 검증까지 제공하는 디지털 보조공학 코디네이터.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0F766E',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'ko',
    dir: 'ltr',
    categories: ['health', 'medical', 'lifestyle'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: '새 상담 시작',
        short_name: '상담',
        description: 'AI 상담을 시작합니다',
        url: '/chat',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: '대시보드',
        short_name: '대시보드',
        description: '상담 히스토리를 확인합니다',
        url: '/dashboard',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
