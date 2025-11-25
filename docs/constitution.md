# LinkAble 개발 헌장 (Development Constitution)

**프로젝트명**: LinkAble (링케이블)  
**버전**: v1.0  
**작성일**: 2025.11.25  
**목적**: 코드 품질, 테스트 기준, 사용자 경험 일관성 및 성능 요구사항 원칙 수립

---

## 1. 코드 품질 원칙 (Code Quality Principles)

### 1.1 타입 안정성 (Type Safety)

- **TypeScript Strict Mode 필수**: 모든 코드는 TypeScript strict mode로 작성
- **명시적 타입 정의**: `any` 타입 사용 금지, 필요한 경우 `unknown` 사용 후 타입 가드 적용
- **타입 추론 활용**: 불필요한 타입 어노테이션 지양, 컴파일러 추론 신뢰
- **Zod 스키마 검증**: 런타임 데이터 검증은 Zod 스키마 사용 (예: `core/assessment/parser.ts`)

```typescript
// ✅ 좋은 예
interface ProductInput {
  name: string
  iso_code: string
  price?: number | null
}

// ❌ 나쁜 예
const product: any = { name: "상품명" }
```

### 1.2 코드 구조 및 가독성

- **기능 단위 모듈화**: `core/`, `lib/`, `components/` 디렉터리 구조 준수
- **단일 책임 원칙**: 각 함수/컴포넌트는 하나의 명확한 책임만 가짐
- **명확한 네이밍**: 변수/함수명은 의도를 명확히 표현 (약어 지양)
- **주석 최소화**: 코드 자체가 설명이 되도록 작성, 필요한 경우에만 주석 추가

```typescript
// ✅ 좋은 예
const calculateMatchScore = (icfCodes: string[], isoCode: string): number => {
  // 명확한 함수명과 타입
}

// ❌ 나쁜 예
const calc = (codes: string[], iso: string) => {
  // 모호한 네이밍
}
```

### 1.3 에러 처리

- **명시적 에러 처리**: 모든 비동기 작업은 try-catch로 에러 처리
- **에러 로깅**: `lib/logging.ts`의 `logEvent` 함수 사용
- **사용자 친화적 메시지**: 기술적 에러는 로그에만 기록, 사용자에게는 일반적 메시지 제공
- **타입 안전한 에러**: `Error` 타입 체크 후 처리

```typescript
// ✅ 좋은 예
try {
  const result = await callGemini(prompt)
} catch (error) {
  logEvent({
    category: "consultation",
    action: "gemini_error",
    payload: { error: error instanceof Error ? error.message : String(error) },
    level: "error",
  })
  return NextResponse.json(
    { error: "Failed to process request. 잠시 후 다시 시도해 주세요." },
    { status: 500 },
  )
}
```

### 1.4 보안 원칙

- **환경 변수 관리**: 모든 API 키는 `.env.local`에 저장, 절대 코드에 하드코딩 금지
- **인증 필수**: 모든 API 라우트는 Clerk 인증 확인 (`auth()`)
- **입력 검증**: 사용자 입력은 서버 사이드에서 검증 (Zod 스키마)
- **SQL Injection 방지**: Supabase 클라이언트 사용 (파라미터화된 쿼리)

---

## 2. 테스트 기준 (Testing Standards)

### 2.1 테스트 전략

- **단위 테스트**: 핵심 비즈니스 로직 (`core/` 디렉터리)
  - ICF 코드 매핑 (`core/assessment/icf-codes.ts`)
  - ISO 매칭 로직 (`core/matching/iso-mapping.ts`)
  - K-IPPA 계산 (`core/validation/ippa-calculator.ts`)

- **통합 테스트**: API 라우트 및 데이터베이스 연동
  - `/api/chat` 엔드포인트
  - `/api/products` 엔드포인트
  - Supabase 연동

- **E2E 테스트**: 주요 사용자 플로우 (선택적, MVP 이후)
  - 상담 시작 → ICF 추출 → 추천 생성 → 클릭

### 2.2 테스트 작성 원칙

- **테스트 커버리지 목표**: 핵심 로직 80% 이상
- **테스트 격리**: 각 테스트는 독립적으로 실행 가능해야 함
- **명확한 테스트명**: `describe`와 `it` 블록은 의도를 명확히 표현

```typescript
// ✅ 좋은 예
describe("getIsoMatches", () => {
  it("should return empty array when no ICF codes provided", () => {
    const result = getIsoMatches([])
    expect(result).toEqual([])
  })

  it("should match ISO code for d450 and e120", () => {
    const result = getIsoMatches(["d450", "e120"])
    expect(result[0].isoCode).toBe("18 12 10")
  })
})
```

### 2.3 테스트 실행

- **로컬 개발**: `pnpm test` 또는 `pnpm test:watch`
- **CI/CD**: Vercel 배포 전 자동 테스트 실행
- **테스트 실패 시**: 배포 차단

---

## 3. 사용자 경험 일관성 (UX Consistency)

### 3.1 디자인 시스템

- **Shadcn UI 컴포넌트**: 모든 UI 컴포넌트는 Shadcn UI 기반
- **Tailwind CSS**: 스타일링은 Tailwind 유틸리티 클래스 사용
- **컬러 팔레트**: `tailwind.config.ts`에 정의된 색상만 사용
  - Primary: Deep Teal (#0F766E)
  - Secondary: Soft Coral (#FB7185)
  - Background: Off-White (#F8FAFC)

### 3.2 다국어 지원

- **중앙화된 번역**: 모든 텍스트는 `lib/translations.ts`에 정의
- **동적 언어 전환**: `useLanguage` 훅 사용, `localStorage`에 언어 설정 저장
- **기본 언어**: 한국어 (`ko`)

```typescript
// ✅ 좋은 예
const { t } = useLanguage()
return <h1>{t("hero.title")}</h1>

// ❌ 나쁜 예
return <h1>LinkAble에 오신 것을 환영합니다</h1>
```

### 3.3 접근성 (A11y) 필수 준수

- **WCAG 2.1 AA 준수**: 모든 페이지와 컴포넌트는 WCAG 2.1 AA 기준 충족
- **키보드 네비게이션**: 모든 인터랙션 요소는 Tab 키로 접근 가능
- **스크린 리더 지원**: `aria-label`, `aria-describedby` 적절히 사용
- **색상 대비**: 텍스트와 배경 색상 대비비 4.5:1 이상
- **포커스 링**: 모든 포커스 가능 요소는 명확한 포커스 링 표시

```typescript
// ✅ 좋은 예
<button
  onClick={handleClick}
  aria-label={t("chat.sendMessage")}
  className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
>
  <Send />
</button>
```

### 3.4 반응형 디자인

- **Mobile First**: 모바일 화면을 우선 설계
- **Breakpoint**: Tailwind 기본 breakpoint 사용 (sm, md, lg, xl)
- **터치 친화적**: 버튼 최소 크기 44x44px (고령자 타겟 고려)

### 3.5 로딩 상태 및 피드백

- **스켈레톤 UI**: 데이터 로딩 중 스켈레톤 UI 표시
- **에러 메시지**: 사용자 친화적 에러 메시지 제공
- **성공 피드백**: 중요한 액션 완료 시 피드백 제공 (예: 토스트)

---

## 4. 성능 요구사항 (Performance Requirements)

### 4.1 Core Web Vitals 목표

- **LCP (Largest Contentful Paint)**: < 2.5초
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### 4.2 Next.js 최적화

- **Server Components**: 기본적으로 Server Component 사용
- **Client Components**: 인터랙션이 필요한 경우에만 `"use client"` 사용
- **이미지 최적화**: `next/image` 컴포넌트 사용
- **코드 스플리팅**: 동적 import로 번들 크기 최적화

```typescript
// ✅ 좋은 예
import dynamic from "next/dynamic"
const ChatInterface = dynamic(() => import("@/components/chat-interface"), {
  loading: () => <Skeleton />,
})

// ❌ 나쁜 예
import ChatInterface from "@/components/chat-interface" // 항상 번들에 포함
```

### 4.3 API 응답 시간

- **AI 응답**: Gemini API 호출 타임아웃 30초
- **데이터베이스 쿼리**: Supabase 쿼리 최적화, 인덱스 활용
- **캐싱 전략**: 정적 데이터는 적절히 캐싱 (Next.js `cache` 옵션)

### 4.4 번들 크기 관리

- **번들 분석**: `@next/bundle-analyzer`로 정기적 분석
- **트리 쉐이킹**: 사용하지 않는 코드 제거
- **외부 라이브러리**: 필요한 기능만 import

### 4.5 모니터링 및 로깅

- **핵심 이벤트 로깅**: `lib/logging.ts` 사용
  - 상담 시작/완료
  - 추천 생성/클릭
  - 에러 발생
- **성능 메트릭**: Vercel Analytics 활용
- **에러 추적**: 프로덕션 환경에서 에러 상세 로깅

---

## 5. 코드 리뷰 기준 (Code Review Criteria)

### 5.1 필수 체크리스트

- [ ] TypeScript 타입 오류 없음
- [ ] 린터 오류 없음 (`pnpm lint` 통과)
- [ ] 접근성 속성 포함 (필요한 경우)
- [ ] 에러 처리 구현
- [ ] 로깅 추가 (핵심 이벤트)
- [ ] 다국어 지원 (하드코딩된 텍스트 없음)
- [ ] 환경 변수 사용 (하드코딩된 키 없음)

### 5.2 리뷰 포인트

- **가독성**: 코드가 이해하기 쉬운가?
- **유지보수성**: 나중에 수정하기 쉬운가?
- **확장성**: 새로운 기능 추가가 쉬운가?
- **성능**: 불필요한 리렌더링이나 API 호출이 없는가?

---

## 6. 배포 전 체크리스트 (Pre-Deployment Checklist)

### 6.1 코드 품질

- [ ] 모든 테스트 통과
- [ ] 린터 오류 없음
- [ ] 타입 체크 통과 (`pnpm type-check`)
- [ ] 빌드 성공 (`pnpm build`)

### 6.2 기능 검증

- [ ] 주요 사용자 플로우 테스트
- [ ] 접근성 검증 (키보드 네비게이션, 스크린 리더)
- [ ] 다국어 전환 테스트
- [ ] 모바일 반응형 테스트

### 6.3 성능 검증

- [ ] Lighthouse 점수 확인 (목표: 90점 이상)
- [ ] Core Web Vitals 확인
- [ ] 번들 크기 확인

### 6.4 보안 검증

- [ ] 환경 변수 설정 확인
- [ ] API 인증 확인
- [ ] 입력 검증 확인

---

## 7. 예외 및 유연성 (Exceptions and Flexibility)

### 7.1 MVP 우선순위

- **MVP 단계**: 일부 원칙은 완벽하게 준수하지 않아도 됨 (예: 테스트 커버리지)
- **프로덕션 전**: 모든 원칙 준수 필수

### 7.2 기술 부채 관리

- **기술 부채 기록**: `docs/TODO.md` 또는 별도 이슈에 기록
- **리팩토링 계획**: 정기적으로 기술 부채 해소 계획 수립
- **우선순위**: 사용자 영향도가 높은 부분부터 해결

---

## 8. 문서화 원칙 (Documentation Principles)

### 8.1 코드 문서화

- **JSDoc 주석**: 복잡한 함수는 JSDoc 주석 추가
- **README 업데이트**: 주요 기능 추가 시 README 업데이트
- **타입 정의**: 모든 공개 API는 타입 정의 포함

### 8.2 프로젝트 문서

- **설계 문서**: `docs/` 디렉터리에 설계 의도 기록
- **변경 이력**: 주요 변경사항은 문서에 기록
- **의사결정 기록**: 중요한 기술 선택의 이유 기록

---

## 9. 팀 협업 원칙 (Team Collaboration)

### 9.1 커밋 메시지

- **명확한 제목**: 변경 사항을 명확히 표현
- **상세한 본문**: 필요시 본문에 변경 이유 및 영향 설명

```
feat: 상품 데이터 동기화 API 추가

- lib/integrations/ 디렉터리 구조 생성
- 샘플 상품 데이터 30개 추가
- 링크 검증 로직 구현
```

### 9.2 브랜치 전략

- **main**: 프로덕션 배포용
- **develop**: 개발 통합 브랜치
- **feature/**: 기능 개발 브랜치

### 9.3 코드 소유권

- **공동 소유**: 모든 코드는 팀의 공동 소유
- **리뷰 필수**: 모든 PR은 최소 1명의 리뷰 필요
- **지식 공유**: 복잡한 로직은 팀 내 공유

---

## 10. 지속적 개선 (Continuous Improvement)

### 10.1 정기 검토

- **주간 회고**: 매주 개발 원칙 준수 여부 검토
- **분기별 개선**: 분기마다 원칙 개선 및 업데이트
- **피드백 수용**: 팀원 피드백을 반영하여 원칙 개선

### 10.2 학습 및 성장

- **기술 공유**: 새로운 기술이나 패턴 발견 시 팀 내 공유
- **베스트 프랙티스**: 업계 베스트 프랙티스 지속적 학습
- **도구 개선**: 개발 생산성 향상을 위한 도구 도입 검토

---

## 부록: 참고 자료

- [Next.js 공식 문서](https://nextjs.org/docs)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [WCAG 2.1 가이드라인](https://www.w3.org/WAI/WCAG21/quickref/)
- [Shadcn UI 문서](https://ui.shadcn.com/)
- [Vercel 성능 가이드](https://vercel.com/docs/concepts/analytics)

---

**이 헌장은 살아있는 문서입니다. 프로젝트 진행에 따라 지속적으로 업데이트됩니다.**

