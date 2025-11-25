# +14일 리마인더 트리거 설계

**목적**: 추천 생성 후 14일 경과 시 사용자에게 K-IPPA 평가를 요청하는 리마인더 시스템

**작성일**: 2025.11.25  
**상태**: 설계 단계 (MVP에서는 수동 트리거, 향후 자동화)

---

## 1. 요구사항

### 1.1 기능 요구사항

- **트리거 조건**: `recommendations` 테이블의 `created_at` 기준 +14일 경과
- **대상**: `is_clicked = true`인 추천만 대상 (실제 구매한 사용자)
- **알림 방식**: 이메일 또는 인앱 알림 (MVP에서는 인앱 알림 우선)
- **중복 방지**: 이미 평가를 제출한 추천은 제외

### 1.2 비기능 요구사항

- **성능**: 대량 사용자 처리 가능
- **확장성**: 향후 이메일, SMS 등 추가 채널 지원 가능
- **안정성**: 실패 시 재시도 메커니즘

---

## 2. 구현 옵션

### 옵션 1: Vercel Cron Jobs (권장)

**장점:**
- Vercel에 통합되어 있어 설정이 간단
- 무료 플랜에서도 사용 가능
- 서버리스 환경에서 안정적

**구현 방법:**

```typescript
// app/api/cron/reminder-ippa/route.ts
import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  // Vercel Cron에서 자동 호출
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const supabase = getSupabaseServerClient()
  
  // 14일 전에 생성된 추천 중 클릭된 것 찾기
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  
  const { data: recommendations } = await supabase
    .from("recommendations")
    .select(`
      id,
      consultation_id,
      product_id,
      user_id:consultations!inner(user_id)
    `)
    .eq("is_clicked", true)
    .lt("created_at", fourteenDaysAgo.toISOString())
    .is("ippa_evaluations.recommendation_id", null) // 평가 미제출만

  // 알림 생성 로직
  // ...
  
  return NextResponse.json({ processed: recommendations?.length ?? 0 })
}
```

**Vercel 설정 (`vercel.json`):**
```json
{
  "crons": [{
    "path": "/api/cron/reminder-ippa",
    "schedule": "0 10 * * *"
  }]
}
```

### 옵션 2: Supabase Edge Functions + pg_cron

**장점:**
- 데이터베이스 레벨에서 직접 처리
- 더 세밀한 제어 가능

**단점:**
- Supabase 설정 복잡도 증가
- pg_cron 확장 필요

### 옵션 3: 외부 서비스 (Inngest, Trigger.dev 등)

**장점:**
- 강력한 워크플로우 관리
- 재시도, 스케줄링 등 고급 기능

**단점:**
- 추가 비용
- 외부 의존성

---

## 3. MVP 구현 전략

### 3.1 단계별 구현

**Phase 1 (현재)**: 수동 트리거
- Dashboard에서 "평가 요청" 버튼 제공
- 사용자가 직접 평가 제출

**Phase 2**: Vercel Cron Jobs
- 일일 1회 실행 (매일 오전 10시)
- 대상 사용자 식별 및 알림 생성

**Phase 3**: 인앱 알림 시스템
- 알림 테이블 생성
- Dashboard에서 알림 표시

**Phase 4**: 이메일 알림
- 이메일 템플릿 작성
- 이메일 발송 서비스 연동 (Resend, SendGrid 등)

### 3.2 데이터베이스 스키마 확장

```sql
-- 알림 테이블 (향후 추가)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'ippa_reminder', 'recommendation_ready', etc.
  title VARCHAR(200) NOT NULL,
  message TEXT,
  link_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
```

---

## 4. 알림 메시지 템플릿

### 4.1 인앱 알림

**제목**: "보조기기 사용 후 평가를 진행해 주세요"  
**내용**: "{product_name}을(를) 사용하신 지 2주가 지났습니다. 사용 경험을 공유해 주시면 더 나은 추천을 제공하는 데 도움이 됩니다."  
**액션**: "평가하기" 버튼 → `/dashboard?evaluate={recommendation_id}`

### 4.2 이메일 알림 (향후)

**제목**: "[LinkAble] 보조기기 사용 후 평가 요청"  
**본문**: HTML 템플릿 (다국어 지원)

---

## 5. 실행 계획

### 5.1 즉시 구현 가능 (MVP)

1. ✅ Dashboard에 K-IPPA 폼 통합
2. ✅ 수동 평가 제출 기능
3. ⏳ 평가 대상 추천 표시 (Dashboard에서)

### 5.2 향후 구현 (Post-MVP)

1. Vercel Cron Jobs 설정
2. 알림 테이블 생성
3. 인앱 알림 시스템
4. 이메일 알림 연동

---

## 6. 참고 자료

- [Vercel Cron Jobs 문서](https://vercel.com/docs/cron-jobs)
- [Supabase pg_cron 확장](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Inngest 문서](https://www.inngest.com/docs)

---

**현재 상태**: MVP에서는 수동 평가 제출만 지원. 자동 리마인더는 Post-MVP에서 구현 예정.

