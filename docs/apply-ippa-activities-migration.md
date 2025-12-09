# ippa_activities 컬럼 추가 가이드

## 문제

채팅 중 K-IPPA 평가 데이터가 저장되지 않습니다. `consultations` 테이블에 `ippa_activities` 컬럼이 없기 때문입니다.

## 해결 방법

### 방법 1: Supabase 대시보드에서 실행 (권장)

1. **Supabase 대시보드 접속**

   - https://supabase.com/dashboard 접속
   - 프로젝트 선택

2. **SQL Editor 열기**

   - 왼쪽 메뉴에서 **SQL Editor** 클릭
   - **New query** 클릭

3. **아래 SQL 복사하여 실행**

```sql
-- consultations 테이블에 ippa_activities JSONB 컬럼 추가
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS ippa_activities JSONB DEFAULT NULL;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN consultations.ippa_activities IS 'K-IPPA 상담 단계에서 선택한 ICF 활동 및 점수 (기초선)';

-- ippa_evaluations 테이블에 activity_scores JSONB 컬럼 추가 (없는 경우)
ALTER TABLE ippa_evaluations
ADD COLUMN IF NOT EXISTS activity_scores JSONB DEFAULT NULL;

COMMENT ON COLUMN ippa_evaluations.activity_scores IS 'K-IPPA 평가에서 각 ICF 활동별 사전/사후 점수 및 개선도';

-- 인덱스 추가 (JSONB 쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_consultations_ippa_activities ON consultations USING GIN (ippa_activities);
CREATE INDEX IF NOT EXISTS idx_ippa_evaluations_activity_scores ON ippa_evaluations USING GIN (activity_scores);
```

4. **실행 버튼 클릭** (또는 Ctrl+Enter)

5. **확인**
   - "Success. No rows returned" 메시지가 표시되면 성공입니다.

### 방법 2: Supabase CLI 사용

터미널에서 다음 명령어 실행:

```bash
# 프로젝트 디렉토리로 이동
cd /path/to/your/project

# Supabase CLI로 마이그레이션 적용
supabase db push
```

또는 특정 마이그레이션만 적용:

```bash
supabase migration up
```

## 확인 방법

SQL Editor에서 다음 쿼리로 확인:

```sql
-- 컬럼이 추가되었는지 확인
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'consultations'
AND column_name = 'ippa_activities';
```

결과에 `ippa_activities` 컬럼이 표시되면 성공입니다.

## 데이터 구조

저장되는 데이터 형식:

```json
{
  "activities": [
    {
      "icfCode": "d410",
      "importance": 3,
      "preDifficulty": 3,
      "collectedAt": "2025-01-22T10:00:00Z"
    }
  ],
  "collectedAt": "2025-01-22T10:00:00Z"
}
```

## 문제 해결

### 에러가 발생하는 경우

1. **"permission denied" 에러**

   - Supabase 대시보드에서 실행하는 경우, 관리자 권한이 필요합니다.
   - 프로젝트 소유자 계정으로 로그인했는지 확인하세요.

2. **"column already exists" 에러**

   - 이미 컬럼이 존재하는 경우입니다. 정상입니다.
   - `IF NOT EXISTS` 구문을 사용했으므로 무시해도 됩니다.

3. **"relation does not exist" 에러**
   - 테이블 이름이 잘못되었을 수 있습니다.
   - Supabase 대시보드에서 테이블 목록을 확인하세요.

## 참고

- 마이그레이션 파일 위치: `supabase/migrations/20250122000000_add_ippa_activities.sql`
- 이 마이그레이션은 안전하게 여러 번 실행할 수 있습니다 (`IF NOT EXISTS` 사용).
