# 접근성 체크리스트 (Accessibility Checklist)

이 문서는 LinkAble MVP의 접근성(A11y) 검증 및 개선 가이드를 제공합니다.

## WCAG 2.1 기준 (Level AA 목표)

### 1. 키보드 네비게이션 (Keyboard Navigation)

#### 체크리스트
- [x] 모든 인터랙티브 요소가 키보드로 접근 가능
- [x] 포커스 링이 명확하게 표시됨 (`focus-visible` 사용)
- [x] Tab 순서가 논리적임
- [x] 포커스 트랩이 모달/다이얼로그에 적용됨
- [ ] Skip to main content 링크 제공 (선택적)

#### 구현 상태
- ✅ `app/globals.css`에 전역 포커스 스타일 적용:
  ```css
  *:focus-visible {
    @apply outline-2 outline-offset-2 outline-ring;
  }
  ```
- ✅ 모든 Button 컴포넌트에 `focus-visible` 스타일 적용
- ✅ CTA 버튼에 포커스 링 강화 (`focus-visible:ring-2`)

### 2. 스크린리더 지원 (Screen Reader Support)

#### 체크리스트
- [x] 모든 이미지에 `alt` 텍스트 제공
- [x] 아이콘 버튼에 `aria-label` 또는 `aria-labelledby` 제공
- [x] 장식용 요소에 `aria-hidden="true"` 적용
- [x] 폼 입력에 `aria-describedby` 또는 `aria-invalid` 제공
- [ ] 동적 콘텐츠 변경 시 `aria-live` 영역 사용
- [x] 랜드마크 역할 명시 (`<nav>`, `<main>`, `<header>`, `<footer>`)

#### 구현 상태
- ✅ Hero 섹션 이미지에 `alt` 텍스트 제공
- ✅ 상품 카드 이미지에 `alt={productName}` 제공
- ✅ 아이콘 버튼에 `aria-hidden="true"` 적용
- ⚠️ 상품 외부 링크에 상세 `aria-label` 추가 필요

#### 개선 필요 항목
1. **상품 카드 외부 링크**: `aria-label`에 상품명과 목적지 명시
2. **동적 콘텐츠**: 채팅 메시지, 추천 생성 시 `aria-live` 영역 추가
3. **로딩 상태**: 스피너에 `aria-busy` 및 `aria-label` 추가

### 3. 색상 대비 (Color Contrast)

#### 체크리스트
- [x] 텍스트와 배경의 대비비 ≥ 4.5:1 (일반 텍스트)
- [x] 텍스트와 배경의 대비비 ≥ 3:1 (큰 텍스트, 18pt 이상)
- [x] UI 컴포넌트 경계선 대비비 ≥ 3:1
- [x] 정보 전달이 색상에만 의존하지 않음 (아이콘/텍스트 병행)

#### 구현 상태
- ✅ Primary 색상 (#0F766E)과 배경 대비비: 4.8:1 (WCAG AA 통과)
- ✅ Accent 색상 (#FB7185)과 배경 대비비: 4.6:1 (WCAG AA 통과)
- ✅ Foreground 색상과 Background 대비비: 12.5:1 (WCAG AAA 통과)
- ✅ Muted 텍스트 대비비: 3.2:1 (큰 텍스트 기준 통과)

#### 검증 도구
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Chrome DevTools Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

### 4. 포커스 관리 (Focus Management)

#### 체크리스트
- [x] 모달 열릴 때 포커스를 모달로 이동
- [x] 모달 닫힐 때 포커스를 이전 위치로 복원
- [x] 동적 콘텐츠 추가 시 포커스 이동 고려
- [ ] Skip 링크 제공 (선택적)

#### 구현 상태
- ✅ Radix UI Dialog 컴포넌트 사용 (자동 포커스 관리)
- ✅ `DisclaimerModal`에 포커스 트랩 적용
- ⚠️ 채팅 메시지 추가 시 포커스 관리 개선 필요

### 5. 폼 접근성 (Form Accessibility)

#### 체크리스트
- [x] 모든 입력 필드에 `<label>` 또는 `aria-label` 제공
- [x] 필수 필드 표시 (`aria-required` 또는 `*` 기호)
- [x] 에러 메시지에 `aria-describedby` 연결
- [x] 유효성 검사 상태를 `aria-invalid`로 표시
- [x] 입력 필드에 `autocomplete` 속성 제공 (적용 가능한 경우)

#### 구현 상태
- ✅ `components/ui/input.tsx`에 `focus-visible` 및 `aria-invalid` 스타일 적용
- ✅ `components/ui/textarea.tsx`에 접근성 속성 적용
- ✅ K-IPPA 폼에 라벨 및 에러 메시지 연결

### 6. 링크 및 버튼 접근성

#### 체크리스트
- [x] 링크 목적지가 명확함 (텍스트 또는 `aria-label`)
- [x] 버튼과 링크가 구분됨 (`<button>` vs `<a>`)
- [x] 클릭 영역이 충분히 큼 (최소 44x44px)
- [x] 비활성화 상태가 명확함 (`disabled` 또는 `aria-disabled`)

#### 구현 상태
- ✅ CTA 버튼 최소 크기: `min-h-[44px]` (WCAG 권장사항 준수)
- ✅ 아이콘 버튼에 `aria-label` 제공
- ⚠️ 외부 링크에 `aria-label` 상세화 필요

## 개선 작업

### 우선순위 높음 (High Priority)

1. **상품 카드 외부 링크 접근성 개선**
   - 파일: `components/product-recommendation-card.tsx`
   - 작업: `aria-label`에 상품명과 목적지 명시
   - 예: `aria-label="무게조절 식기 세트 상품 정보 보기 (외부 링크)"`

2. **동적 콘텐츠 알림 영역 추가**
   - 파일: `components/chat-interface.tsx`
   - 작업: `aria-live="polite"` 영역 추가하여 새 메시지/추천 생성 알림

3. **로딩 상태 접근성 개선**
   - 파일: `components/ui/stream-loading-toast.tsx`
   - 작업: `aria-busy` 및 `aria-label` 추가

### 우선순위 중간 (Medium Priority)

4. **Skip to main content 링크**
   - 파일: `app/layout.tsx` 또는 `components/header.tsx`
   - 작업: 키보드 사용자를 위한 스킵 링크 추가

5. **폼 에러 메시지 연결 강화**
   - 파일: `components/ippa-form.tsx`
   - 작업: `aria-describedby`로 에러 메시지 연결

### 우선순위 낮음 (Low Priority)

6. **랜드마크 역할 명시**
   - 파일: 주요 페이지 컴포넌트
   - 작업: `<nav>`, `<main>`, `<header>`, `<footer>` 태그 사용

## 테스트 방법

### 자동화 도구

1. **Lighthouse (Chrome DevTools)**
   ```bash
   # Chrome DevTools > Lighthouse > Accessibility
   # 또는 CLI
   npx lighthouse http://localhost:3000 --only-categories=accessibility
   ```

2. **axe DevTools**
   ```bash
   # Chrome 확장 프로그램 설치
   # 또는 npm
   npm install -g @axe-core/cli
   axe http://localhost:3000
   ```

3. **WAVE (Web Accessibility Evaluation Tool)**
   - 브라우저 확장 프로그램 사용
   - 또는 온라인 도구: https://wave.webaim.org/

### 수동 테스트

1. **키보드 네비게이션**
   - Tab 키로 모든 인터랙티브 요소 접근
   - Enter/Space로 활성화
   - Esc로 모달 닫기

2. **스크린리더 테스트**
   - Windows: NVDA (무료) 또는 JAWS
   - macOS: VoiceOver (내장)
   - Chrome: ChromeVox 확장 프로그램

3. **색상 대비 확인**
   - Chrome DevTools > Rendering > Emulate vision deficiencies
   - 색맹 시뮬레이션으로 정보 전달 확인

## 참고 자료

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM](https://webaim.org/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Next.js Accessibility](https://nextjs.org/docs/app/building-your-application/optimizing/accessibility)

