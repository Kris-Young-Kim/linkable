# 프론트엔드 기능 누락 분석 문서

**작성일**: 2025.11.26  
**목적**: 백엔드 구현 대비 프론트엔드 노출 기능 격차 분석 및 개선 계획

---

## 📊 현재 상태 요약

### 구현 완료 ✅
- 기본 채팅 인터페이스 (텍스트 입력/응답)
- 추천 페이지 및 상품 카드 UI
- 대시보드 기본 구조
- K-IPPA 폼 (대시보드 내 인라인)
- Analytics 대시보드
- 알림 시스템 (벨 아이콘)

### 부분 구현 ⚠️
- STT 음성 입력 (버튼만 존재, 기능 미구현)
- 이미지 업로드 (버튼만 존재, 기능 미구현)
- ICF 분석 결과 (백엔드 분석 완료, 프론트엔드 표시 미구현)

### 미구현 ❌
- 스트리밍 응답
- 상담 리포트 페이지
- 상담 상세 페이지
- K-IPPA 전용 페이지
- ICF 분석 결과 시각화
- 상담 이력 상세 보기

---

## 🔍 상세 분석

### 1. 멀티모달 입력 기능

#### 1.1 STT (음성 입력)
**현재 상태**: 
- 위치: `components/chat-interface.tsx:161-169`
- 버튼 UI만 존재, `console.log`만 출력

**필요 구현**:
```typescript
// Web Speech API 활용 예시
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
recognition.lang = 'ko-KR'
recognition.continuous = false
recognition.interimResults = false

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript
  setInput(transcript)
}
```

**고려사항**:
- 브라우저 호환성 (Chrome, Edge 지원, Safari 제한적)
- 폴백: OpenAI Whisper API 또는 서버 사이드 STT
- 접근성: 음성 인식 상태 스크린 리더 안내

#### 1.2 이미지 업로드 (Gemini Vision)
**현재 상태**:
- 위치: `components/chat-interface.tsx:173-174`
- 버튼 UI만 존재

**필요 구현**:
- 파일 업로드 컴포넌트 (`components/features/chat/image-upload.tsx`)
- 이미지 미리보기 및 제거
- `app/api/chat/route.ts`에서 `mediaDescription` 처리
- Gemini Vision API 호출 (이미지 base64 인코딩)

**백엔드 준비 상태**:
- ✅ `mediaDescription` 파라미터 수신 가능
- ⚠️ 실제 이미지 파일 처리 로직 필요

---

### 2. 스트리밍 응답

**현재 상태**:
- 일반 JSON 응답만 처리
- `app/api/chat/route.ts`에서 `NextResponse.json()` 사용

**필요 구현**:
```typescript
// Next.js AI SDK 활용
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

const result = await streamText({
  model: google('gemini-flash-lite-latest'),
  prompt: buildPrompt(...),
})

return result.toDataStreamResponse()
```

**프론트엔드 처리**:
- `components/chat-interface.tsx`에서 스트리밍 응답 파싱
- 실시간 텍스트 업데이트
- 타이핑 인디케이터 개선

---

### 3. 분석 결과 시각화

#### 3.1 ICF 분석 결과 컴포넌트
**필요 컴포넌트**: `components/features/analysis/icf-visualization.tsx`

**기능 요구사항**:
- ICF 코드별 카테고리 표시
  - b (신체기능): 파란색
  - d (활동): 초록색
  - e (환경): 주황색
- 각 코드 클릭 시 설명 툴팁/모달
- 관련 ISO 코드 연결 표시
- 분석 신뢰도 표시 (선택적)

**데이터 구조**:
```typescript
interface ICFAnalysis {
  b: string[] // 신체기능 코드
  d: string[] // 활동 코드
  e: string[] // 환경 코드
  summary?: string
}
```

#### 3.2 분석 결과 카드
**필요 컴포넌트**: `components/features/analysis/analysis-card.tsx`

**기능 요구사항**:
- 분석 요약 표시
- ICF 코드 시각화 통합
- 환경 요소 분석 결과
- "추천 보기" CTA 버튼

---

### 4. 페이지 구조 완성

#### 4.1 상담 리포트 페이지
**경로**: `app/consultation/report/[id]/page.tsx`

**기능 요구사항**:
- 상담 요약 및 ICF 분석 결과 전체 표시
- 환경 요소 분석 결과 시각화
- 생성된 추천 목록 링크
- PDF 다운로드 기능 (선택적)

**API 엔드포인트**:
- `GET /api/consultations/[id]` (상담 상세 조회)
- `GET /api/analysis/[consultationId]` (분석 결과 조회)

#### 4.2 상담 상세 페이지
**경로**: `app/consultation/[id]/page.tsx`

**기능 요구사항**:
- 상담 메시지 전체 히스토리
- 분석 결과 상세 확인
- 생성된 추천 목록 및 상태
- K-IPPA 평가 상태

#### 4.3 K-IPPA 전용 페이지
**경로**: `app/dashboard/ippa/[recommendationId]/page.tsx`

**기능 요구사항**:
- 독립 페이지로 K-IPPA 평가
- 알림 링크에서 직접 접근 가능 (`/dashboard?evaluate={recommendationId}`)
- 평가 히스토리 확인
- 이전 평가와 비교 기능

**현재 상태**:
- 대시보드 내 인라인 폼만 존재
- 알림 링크는 쿼리 파라미터로 처리

#### 4.4 추천 상세 페이지
**경로**: `app/recommendations/[consultationId]/page.tsx`

**현재 상태**:
- 쿼리 파라미터 방식 사용 (`/recommendations?consultationId=...`)
- 동적 라우트 없음

**개선 방안**:
- 동적 라우트로 전환
- 상담 컨텍스트 표시
- 필터링/정렬 옵션 추가

---

### 5. UX 개선 사항

#### 5.1 ICF 코드 상세 설명
**현재 상태**:
- 코드만 표시 (예: `b765`, `d550`)
- 설명 없음

**개선 방안**:
- 코드 클릭 시 설명 툴팁/모달
- 카테고리별 색상 구분
- 관련 ISO 코드 연결 표시

#### 5.2 실시간 피드백 개선
**현재 상태**:
- `isTyping` 상태만 존재
- 기본 로딩 표시

**개선 방안**:
- "링커가 생각 중입니다..." 애니메이션
- 스켈레톤 UI 개선
- 스트리밍 응답 시 실시간 텍스트 업데이트

---

### 6. 상담 완료 → 추천 페이지 연동 플로우

#### 6.1 현재 상태
**구현 완료**:
- ✅ 추천 페이지 (`/recommendations`)
- ✅ 상품 카드 구매 버튼 및 클릭 처리
- ✅ 클릭 로그 기록 API
- ✅ `purchase_link`로 쇼핑몰 연결

**누락된 부분**:
- ❌ 채팅 인터페이스에서 상담 완료 후 추천으로 이어지는 CTA 없음
- ❌ ICF 분석 완료 시 자동 추천 생성/표시 없음
- ❌ 채팅 내 추천 카드 미리보기 없음

#### 6.2 설계 요구사항 (PRD, Mermaid)
- **PRD Activity 3**: "추천 카드를 클릭하면 쿠팡/네이버 최저가 페이지로 이동"
- **Mermaid 다이어그램**: "FE->>U: 채팅 말풍선 + 추천 상품 카드 표시"
- **MRD 4.1**: "AI 추천 결과에서 '구매하기' 클릭 시 쿠팡/네이버/케어라인 등으로 연결"

#### 6.3 필요 구현

**6.3.1 채팅 인터페이스에 추천 CTA 추가**
- 위치: `components/chat-interface.tsx`
- 트리거: `data.icfAnalysis && data.consultationId` 확인 시
- UI: "추천 보기" 버튼 또는 추천 카드 미리보기
- 액션: `/recommendations?consultationId={consultationId}`로 이동

**6.3.2 상담 완료 후 자동 추천 생성**
- 옵션 1: `app/api/chat/route.ts`에서 ICF 분석 완료 시 자동으로 추천 생성
- 옵션 2: 프론트엔드에서 `app/api/products/route.ts` 호출하여 추천 미리 생성
- 추천 생성 완료 후 채팅에 알림 표시

**6.3.3 채팅 내 추천 카드 미리보기** (선택적)
- 상위 2-3개 추천 카드를 채팅 말풍선과 함께 표시
- `ProductRecommendationCard` 컴포넌트 재사용
- "더 보기" 버튼으로 전체 추천 페이지 이동

---

## 📋 구현 우선순위

### 높은 우선순위 (사용자 경험 직접 영향)
1. **상담 완료 → 추천 페이지 연동** - 핵심 비즈니스 플로우 (PRD Activity 3)
   - 채팅 인터페이스에 "추천 보기" CTA 버튼 추가
   - ICF 분석 완료 시 자동으로 추천 페이지로 연결
   - Mermaid 다이어그램 명세 반영 ("채팅 말풍선 + 추천 상품 카드 표시")
2. **STT 음성 입력 구현** - 고령자 타겟 핵심 기능
3. **이미지 업로드 (Gemini Vision)** - 환경 분석 핵심 기능
4. **ICF 분석 결과 시각화** - 분석 결과 가시화
5. **상담 리포트 페이지** - 사용자 만족도 향상

### 중간 우선순위 (기능 완성도)
5. **스트리밍 응답** - 실시간 상담 경험
6. **상담 상세 페이지** - 이력 관리
7. **K-IPPA 전용 페이지** - 평가 편의성
8. **상담 이력 상세 보기** - 대시보드 개선

### 낮은 우선순위 (UX 개선)
9. **ICF 코드 상세 설명 툴팁** - 정보 접근성
10. **실시간 타이핑 인디케이터 개선** - 시각적 피드백

---

## 🔗 관련 문서

- [TODO.md](./TODO.md) - Phase 5 섹션 참고
- [PRD.md](./PRD.md) - 기능 요구사항 상세
- [DIR.md](./DIR.md) - 디렉터리 구조
- [TRD.md](./TRD.md) - 기술 구현 사항

---

**다음 단계**: Phase 5 구현 시작 시 이 문서를 참고하여 우선순위에 따라 순차적으로 구현 진행.

