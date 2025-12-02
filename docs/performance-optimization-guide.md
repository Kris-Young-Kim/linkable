# 성능 최적화 가이드

이 문서는 LinkAble MVP의 성능 최적화 작업과 측정 방법을 설명합니다.

## 구현된 최적화 항목

### 1. 동적 Import 및 Suspense 적용

**목적**: 초기 번들 크기 감소 및 페이지 로딩 속도 개선

**적용 위치**:
- `app/recommendations/[consultationId]/page.tsx`: `RecommendationsViewWithFilters` 컴포넌트
- `app/dashboard/page.tsx`: `DashboardContent` 컴포넌트

**구현 방법**:
```typescript
import dynamic from "next/dynamic"
import { Suspense } from "react"

const RecommendationsViewWithFilters = dynamic(
  () => import("@/components/recommendations/recommendations-view-with-filters").then(
    (mod) => ({ default: mod.RecommendationsViewWithFilters })
  ),
  {
    loading: () => <LoadingSkeleton />,
    ssr: true,
  }
)
```

**효과**:
- 초기 JavaScript 번들 크기 감소
- 페이지 로딩 시간 단축
- 사용자 경험 개선 (스켈레톤 UI 제공)

### 2. Next.js Image 최적화

**목적**: 이미지 로딩 성능 개선 및 대역폭 절감

**적용 위치**:
- `components/hero-section.tsx`: Hero 섹션의 보조기기 이미지 갤러리
- `components/product-recommendation-card.tsx`: 추천 상품 카드 이미지

**구현 방법**:
```typescript
import Image from "next/image"

<Image
  src={imageUrl}
  alt={productName}
  fill
  className="object-cover rounded-lg"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  loading="lazy"
/>
```

**효과**:
- 자동 이미지 최적화 (WebP 변환, 리사이징)
- Lazy loading으로 초기 로딩 시간 단축
- 반응형 이미지 제공 (sizes 속성)
- LCP (Largest Contentful Paint) 개선

### 3. SSE 스트림 로딩 컴포넌트

**목적**: 실시간 스트리밍 상태 피드백 제공

**구현 위치**:
- `components/ui/stream-loading-toast.tsx`: 스트림 상태 토스트 컴포넌트

**기능**:
- 로딩 상태 표시 (스피너 애니메이션)
- 성공/오류 상태 피드백
- 자동 닫기 기능 (성공 시 3초 후)
- 접근성 지원 (ARIA 레이블)

**사용 예시**:
```typescript
import { StreamLoadingToast, type StreamStatus } from "@/components/ui/stream-loading-toast"

const [streamStatus, setStreamStatus] = useState<StreamStatus>(null)

<StreamLoadingToast
  status={streamStatus}
  message="응답을 생성하고 있습니다..."
  onDismiss={() => setStreamStatus(null)}
/>
```

## 성능 측정 방법

### Lighthouse 측정

**명령어**:
```bash
# Chrome DevTools에서 직접 측정
# 또는 CLI 사용
npx lighthouse http://localhost:3000 --view
```

**측정 지표**:
- **Performance Score**: 목표 90+ (현재 3.0/5 → 목표 4.2/5)
- **LCP (Largest Contentful Paint)**: 목표 ≤ 2.5초
- **TTFB (Time to First Byte)**: 목표 30% 감소
- **FID (First Input Delay)**: 목표 ≤ 100ms
- **CLS (Cumulative Layout Shift)**: 목표 ≤ 0.1

**측정 시나리오**:
1. 홈페이지 (`/`)
2. 채팅 페이지 (`/chat`)
3. 추천 페이지 (`/recommendations/[consultationId]`)
4. 대시보드 (`/dashboard`)

### Next.js Profiler 사용

**설정**:
```typescript
// next.config.mjs
const nextConfig = {
  // 프로덕션 빌드에서 프로파일링 활성화
  experimental: {
    instrumentationHook: true,
  },
}
```

**측정 방법**:
```bash
# 프로덕션 빌드 생성
pnpm build

# 프로파일링 데이터 수집
ANALYZE=true pnpm build

# 또는 Next.js Profiler 확장 프로그램 사용
```

**측정 항목**:
- 컴포넌트 렌더링 시간
- 번들 크기 분석
- 코드 스플리팅 효과
- 이미지 최적화 효과

## 성능 회귀 테스트

### 자동화된 테스트

**CI/CD 파이프라인에 추가** (권장):
```yaml
# .github/workflows/performance.yml
name: Performance Test
on: [push, pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/chat
            http://localhost:3000/dashboard
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### 수동 테스트 체크리스트

**매 배포 전 확인**:
- [ ] Lighthouse Performance Score ≥ 80
- [ ] LCP ≤ 2.5초
- [ ] TTFB ≤ 500ms
- [ ] 번들 크기 증가 없음 (webpack-bundle-analyzer)
- [ ] 이미지 최적화 적용 확인 (Network 탭)
- [ ] 동적 import 작동 확인 (Network 탭)
- [ ] Suspense fallback 표시 확인

### 성능 기준선 (Baseline)

**현재 상태** (2025-01 기준):
- Performance Score: 3.0/5
- LCP: ~4.5초
- TTFB: ~800ms
- 초기 번들 크기: ~500KB

**목표 상태**:
- Performance Score: 4.2/5
- LCP: ≤ 2.5초
- TTFB: ≤ 560ms (30% 감소)
- 초기 번들 크기: ~350KB (30% 감소)

## 추가 최적화 계획

### 단기 (1-2주)
1. ✅ 동적 import 적용
2. ✅ Next.js Image 최적화
3. ✅ SSE 로딩 컴포넌트
4. ⏳ 코드 스플리팅 추가 (라우트 레벨)
5. ⏳ 이미지 프리로딩 (중요 이미지)

### 중기 (1개월)
1. ⏳ 서버 컴포넌트 전환 (가능한 부분)
2. ⏳ React Server Components 최적화
3. ⏳ API 응답 캐싱 (SWR/React Query)
4. ⏳ 정적 생성 (SSG) 확대

### 장기 (3개월)
1. ⏳ Edge Functions 활용
2. ⏳ CDN 최적화
3. ⏳ 서비스 워커 (PWA)
4. ⏳ 부분 하이드레이션

## 모니터링

### 실시간 모니터링 도구
- **Vercel Analytics**: Core Web Vitals 자동 수집
- **Sentry**: 성능 모니터링 및 에러 추적
- **Logflare**: 서버 로그 분석

### 알림 설정
- LCP > 3초 시 알림
- TTFB > 1초 시 알림
- 에러율 > 1% 시 알림

## 참고 자료

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Next.js Image Optimization](https://nextjs.org/docs/app/api-reference/components/image)

