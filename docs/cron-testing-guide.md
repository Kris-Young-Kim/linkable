# 자동 알림 스케줄러 테스트 가이드

## 개요

이 문서는 `app/api/cron/reminder-ippa/route.ts`의 자동 알림 스케줄러를 테스트하고 검증하는 방법을 설명합니다.

## 기능 설명

자동 알림 스케줄러는 다음 조건을 만족하는 추천에 대해 K-IPPA 평가 요청 알림을 자동으로 생성합니다:

- `recommendations.created_at` 기준 +14일 경과
- `is_clicked = true` (실제 구매한 사용자)
- `ippa_evaluations`에 해당 `recommendation_id`가 없음 (평가 미제출)
- 이미 알림이 생성되지 않음 (중복 방지)

## 테스트 방법

### 1. 자동 테스트 스크립트 사용

가장 간단한 방법은 제공된 테스트 스크립트를 사용하는 것입니다:

```bash
# 테스트 실행
tsx scripts/test-cron-reminder.ts
```

이 스크립트는 다음을 수행합니다:

1. 테스트 데이터 생성 (사용자, 상담, 상품, 추천)
2. 14일 전 추천 데이터 생성 (`is_clicked = true`)
3. Cron API 직접 호출
4. 알림 생성 여부 확인
5. 결과 출력

### 2. 수동 테스트

#### 2.1 테스트 데이터 준비

Supabase 대시보드 또는 SQL 쿼리를 사용하여 다음 데이터를 준비합니다:

```sql
-- 1. 테스트 사용자 생성
INSERT INTO users (clerk_id, email, name, role, points)
VALUES ('test-cron-user', 'test-cron@example.com', '테스트 사용자', 'user', 0)
RETURNING id;

-- 2. 테스트 상품 생성
INSERT INTO products (name, iso_code, manufacturer, price, purchase_link, is_active)
VALUES ('테스트 보조기기', '15 09', '테스트 제조사', 25000, 'https://example.com', true)
RETURNING id;

-- 3. 테스트 상담 생성
INSERT INTO consultations (user_id, title, status)
VALUES ('<user_id>', '테스트 상담', 'completed')
RETURNING id;

-- 4. 14일 전 추천 생성 (중요: created_at을 14일 전으로 설정)
INSERT INTO recommendations (consultation_id, product_id, match_reason, rank, is_clicked, created_at)
VALUES (
  '<consultation_id>',
  '<product_id>',
  '테스트용 추천',
  1,
  true,  -- is_clicked = true 필수
  NOW() - INTERVAL '14 days'  -- 14일 전
)
RETURNING id;
```

#### 2.2 API 직접 호출

로컬 개발 환경에서:

```bash
# CRON_SECRET이 설정되어 있는 경우
curl -X GET "http://localhost:3000/api/cron/reminder-ippa" \
  -H "Authorization: Bearer $CRON_SECRET"

# CRON_SECRET이 없는 경우 (개발 환경)
curl -X GET "http://localhost:3000/api/cron/reminder-ippa"
```

프로덕션 환경에서:

```bash
# Vercel Cron은 자동으로 인증 헤더를 추가합니다
curl -X GET "https://your-domain.vercel.app/api/cron/reminder-ippa" \
  -H "Authorization: Bearer $CRON_SECRET"
```

#### 2.3 알림 확인

```sql
-- 생성된 알림 확인
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  link_url,
  is_read,
  created_at,
  metadata
FROM notifications
WHERE type = 'ippa_reminder'
  AND user_id = '<user_id>'
ORDER BY created_at DESC;
```

### 3. Vercel Cron 실행 로그 확인

Vercel 대시보드에서 Cron Job 실행 로그를 확인할 수 있습니다:

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. "Cron Jobs" 탭 클릭
4. `/api/cron/reminder-ippa` 실행 내역 확인
5. 각 실행의 로그 확인

또는 Vercel CLI 사용:

```bash
vercel logs --follow
```

## 환경 변수 설정

테스트를 위해 다음 환경 변수가 필요합니다:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cron 인증 (선택적, 프로덕션 권장)
CRON_SECRET=your-secret-key

# 앱 URL (테스트 스크립트용)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # 또는 프로덕션 URL
```

## 예상 결과

### 성공 케이스

API 응답:

```json
{
  "processed": 1,
  "created": 1,
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

알림 테이블에 다음 형식의 알림이 생성됩니다:

- `type`: `"ippa_reminder"`
- `title`: `"보조기기 사용 후 평가를 진행해 주세요"`
- `message`: `"{상품명}을(를) 사용하신 지 2주가 지났습니다..."`
- `link_url`: `/dashboard?evaluate={recommendation_id}`
- `metadata`: `{ recommendation_id, consultation_id, product_id }`

### 실패 케이스

#### 1. 조건을 만족하는 추천이 없는 경우

```json
{
  "processed": 0,
  "created": 0
}
```

#### 2. 이미 알림이 생성된 경우

```json
{
  "processed": 1,
  "created": 0
}
```

#### 3. 이미 평가가 제출된 경우

평가가 제출된 추천은 자동으로 제외되므로 알림이 생성되지 않습니다.

## 문제 해결

### 알림이 생성되지 않는 경우

1. **추천 데이터 확인**
   - `created_at`이 14일 전인지 확인
   - `is_clicked = true`인지 확인
   - `ippa_evaluations`에 해당 추천의 평가가 없는지 확인

2. **알림 테이블 확인**
   - `notifications` 테이블이 존재하는지 확인
   - 이미 알림이 생성되었는지 확인 (중복 방지)

3. **API 로그 확인**
   - 콘솔 로그에서 에러 메시지 확인
   - Supabase 쿼리 에러 확인

### 인증 오류

`CRON_SECRET`이 설정되어 있는 경우, API 호출 시 인증 헤더가 필요합니다:

```bash
Authorization: Bearer $CRON_SECRET
```

Vercel Cron은 자동으로 인증 헤더를 추가하지만, 수동 테스트 시에는 직접 추가해야 합니다.

### 데이터베이스 연결 오류

- Supabase URL과 Service Role Key가 올바른지 확인
- 네트워크 연결 확인
- Supabase 프로젝트 상태 확인

## 프로덕션 배포 전 체크리스트

- [ ] `CRON_SECRET` 환경 변수 설정
- [ ] `vercel.json`에 Cron 스케줄 설정 확인
- [ ] 알림 테이블 마이그레이션 적용 확인
- [ ] 테스트 스크립트로 동작 검증
- [ ] Vercel Cron 실행 로그 확인
- [ ] 실제 데이터로 통합 테스트

## 참고 자료

- `app/api/cron/reminder-ippa/route.ts` - Cron Job 구현
- `docs/reminder-trigger-design.md` - 리마인더 설계 문서
- `vercel.json` - Vercel Cron 설정
- [Vercel Cron Jobs 문서](https://vercel.com/docs/cron-jobs)

