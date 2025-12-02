# 추천 생성 → +14일 K-IPPA 알림 트리거 연동 테스트 가이드

## 개요

이 문서는 추천 생성부터 14일 후 알림 생성까지의 전체 플로우를 검증하는 통합 테스트 가이드입니다.

## 테스트 플로우

```
추천 생성 (is_clicked = true)
    ↓
시간 경과 시뮬레이션 (14일 전으로 설정)
    ↓
Cron API 호출
    ↓
알림 생성 확인
    ↓
사용자 대시보드에서 확인 가능한지 검증
```

## 자동 테스트 스크립트 사용

가장 간단한 방법은 제공된 통합 테스트 스크립트를 사용하는 것입니다:

```bash
# 통합 테스트 실행
tsx scripts/test-reminder-flow.ts
```

이 스크립트는 다음을 수행합니다:

1. **1단계**: 추천 생성 시뮬레이션
   - 테스트 사용자, 상담, 상품 생성
   - 추천 생성 (`is_clicked = true`)

2. **2단계**: 시간 경과 시뮬레이션
   - 추천의 `created_at`을 14일 전으로 업데이트

3. **3단계**: Cron API 호출
   - `/api/cron/reminder-ippa` 직접 호출

4. **4단계**: 알림 확인
   - 생성된 알림 검증

5. **5단계**: 대시보드 검증
   - 사용자가 알림을 조회할 수 있는지 확인

## 수동 테스트 절차

### 1. 추천 생성

상담 완료 후 추천이 생성되면 `recommendations` 테이블에 다음 데이터가 저장됩니다:

```sql
-- 추천 생성 확인
SELECT 
  r.id,
  r.consultation_id,
  r.product_id,
  r.is_clicked,
  r.created_at,
  c.user_id,
  p.name as product_name
FROM recommendations r
JOIN consultations c ON r.consultation_id = c.id
JOIN products p ON r.product_id = p.id
WHERE r.created_at >= NOW() - INTERVAL '1 day'
ORDER BY r.created_at DESC;
```

**중요**: 알림을 받으려면 `is_clicked = true`여야 합니다.

### 2. 추천 클릭 처리

사용자가 추천을 클릭하면 `is_clicked`가 `true`로 설정됩니다:

```sql
-- 추천 클릭 처리 (예시)
UPDATE recommendations
SET is_clicked = true
WHERE id = '<recommendation_id>';
```

### 3. 시간 경과 시뮬레이션

테스트를 위해 추천의 `created_at`을 14일 전으로 설정:

```sql
-- 14일 전으로 설정
UPDATE recommendations
SET created_at = NOW() - INTERVAL '14 days'
WHERE id = '<recommendation_id>';
```

### 4. Cron API 호출

로컬 개발 환경:

```bash
# CRON_SECRET이 설정되어 있는 경우
curl -X GET "http://localhost:3000/api/cron/reminder-ippa" \
  -H "Authorization: Bearer $CRON_SECRET"
```

프로덕션 환경:

Vercel Cron이 자동으로 실행하거나, 수동으로 호출:

```bash
curl -X GET "https://your-domain.vercel.app/api/cron/reminder-ippa" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 5. 알림 확인

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

### 6. 사용자 대시보드에서 확인

1. 사용자로 로그인
2. 헤더의 알림 벨 아이콘 클릭
3. "보조기기 사용 후 평가를 진행해 주세요" 알림 확인
4. "보기" 링크 클릭하여 평가 페이지로 이동

## 로그 확인

### 추천 생성 로그

`app/api/products/route.ts`에서 추천 생성 시 다음 로그가 출력됩니다:

```
[Products API] 추천 생성 완료: consultationId=<id>, count=<count>
[Products API] 생성된 추천 ID: <id1>, <id2>, ...
```

### Cron 실행 로그

`app/api/cron/reminder-ippa/route.ts`에서 다음 로그가 출력됩니다:

```
[Cron] Processing reminders for recommendations created before <date>
[Cron] Found <count> recommendations eligible for reminders
[Cron] Created <count> notifications
```

## 예상 결과

### 성공 케이스

1. **추천 생성**: `recommendations` 테이블에 데이터 저장
2. **시간 경과**: `created_at`이 14일 전으로 설정됨
3. **Cron 실행**: API 응답 `{ processed: 1, created: 1 }`
4. **알림 생성**: `notifications` 테이블에 알림 저장
5. **대시보드 확인**: 사용자가 알림을 볼 수 있음

### 실패 케이스

#### 1. 추천이 클릭되지 않은 경우

`is_clicked = false`인 추천은 알림 대상이 아닙니다.

#### 2. 14일이 지나지 않은 경우

`created_at`이 14일 전보다 최근이면 알림이 생성되지 않습니다.

#### 3. 이미 평가가 제출된 경우

`ippa_evaluations`에 해당 추천의 평가가 있으면 알림이 생성되지 않습니다.

#### 4. 이미 알림이 생성된 경우

중복 방지 로직으로 인해 알림이 생성되지 않습니다.

## 문제 해결

### 알림이 생성되지 않는 경우

1. **추천 데이터 확인**
   ```sql
   SELECT 
     id,
     is_clicked,
     created_at,
     NOW() - created_at as days_ago
   FROM recommendations
   WHERE id = '<recommendation_id>';
   ```

2. **평가 제출 여부 확인**
   ```sql
   SELECT id
   FROM ippa_evaluations
   WHERE recommendation_id = '<recommendation_id>';
   ```

3. **기존 알림 확인**
   ```sql
   SELECT id
   FROM notifications
   WHERE type = 'ippa_reminder'
     AND metadata->>'recommendation_id' = '<recommendation_id>';
   ```

### 대시보드에서 알림이 보이지 않는 경우

1. **알림 API 확인**
   ```bash
   curl "http://localhost:3000/api/notifications?unreadOnly=false&limit=10" \
     -H "Cookie: <session-cookie>"
   ```

2. **브라우저 콘솔 확인**
   - `components/notifications-bell.tsx`의 에러 로그 확인
   - 네트워크 탭에서 API 응답 확인

3. **알림 테이블 확인**
   - `notifications` 테이블이 존재하는지 확인
   - 사용자 ID가 올바른지 확인

## 프로덕션 배포 전 체크리스트

- [ ] 통합 테스트 스크립트 실행 및 통과 확인
- [ ] 실제 사용자 플로우로 수동 테스트
- [ ] 알림 벨 컴포넌트 동작 확인
- [ ] 링크 클릭 시 평가 페이지 이동 확인
- [ ] Vercel Cron 스케줄 확인 (`vercel.json`)
- [ ] 알림 메시지 다국어 지원 확인 (필요시)

## 참고 자료

- `scripts/test-reminder-flow.ts` - 통합 테스트 스크립트
- `app/api/cron/reminder-ippa/route.ts` - Cron Job 구현
- `app/api/products/route.ts` - 추천 생성 API
- `components/notifications-bell.tsx` - 알림 UI 컴포넌트
- `docs/cron-testing-guide.md` - Cron 테스트 가이드

