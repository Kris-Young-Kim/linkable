/// <reference lib="webworker" />

const CACHE_NAME = 'linkable-v1'
const RUNTIME_CACHE = 'linkable-runtime'

// 캐시할 정적 리소스
const STATIC_ASSETS = [
  '/',
  '/icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
]

// 네트워크 우선, 캐시 폴백 전략을 사용할 경로
const NETWORK_FIRST_PATTERNS = [
  /^https:\/\/api\./,
  /^https:\/\/.*\.supabase\.co/,
]

// 캐시 우선 전략을 사용할 경로
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/,
]

// 설치 이벤트: 정적 리소스 캐시
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets')
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] Failed to cache some assets:', err)
      })
    })
  )
  // 새 서비스 워커가 즉시 활성화되도록 함
  ;(self as ServiceWorkerGlobalScope).skipWaiting()
})

// 활성화 이벤트: 오래된 캐시 정리
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  // 모든 클라이언트에 즉시 제어권 부여
  return (self as ServiceWorkerGlobalScope).clients.claim()
})

// fetch 이벤트: 요청 인터셉트 및 캐싱 전략 적용
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)

  // 같은 출처 요청만 처리
  if (url.origin !== location.origin && !url.href.startsWith('https://')) {
    return
  }

  // GET 요청만 캐시
  if (request.method !== 'GET') {
    return
  }

  // 네트워크 우선 전략 (API 요청)
  if (NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(url.href))) {
    event.respondWith(networkFirst(request))
    return
  }

  // 캐시 우선 전략 (이미지, 폰트 등)
  if (CACHE_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(cacheFirst(request))
    return
  }

  // 기본: 네트워크 우선, 실패 시 캐시
  event.respondWith(networkFirst(request))
})

// 네트워크 우선 전략
async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(RUNTIME_CACHE)
  try {
    const response = await fetch(request)
    // 성공 시 캐시에 저장 (캐시 가능한 응답만)
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    // 네트워크 실패 시 캐시에서 반환
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// 캐시 우선 전략
async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(RUNTIME_CACHE)
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  try {
    const response = await fetch(request)
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    // 오프라인 상태일 때 기본 응답 반환
    if (request.destination === 'image') {
      return new Response('', { status: 404 })
    }
    throw error
  }
}
