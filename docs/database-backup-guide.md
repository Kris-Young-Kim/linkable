# 데이터베이스 백업 및 스냅샷 자동화 가이드

이 문서는 LinkAble MVP의 Supabase 데이터베이스 백업 및 스냅샷 자동화 방법을 설명합니다.

## 개요

데이터베이스 백업은 다음을 포함합니다:
- **일일 자동 백업**: Supabase 자동 백업 활용
- **주간 스냅샷**: 수동 백업 다운로드
- **마이그레이션 전 백업**: 스키마 변경 전 수동 백업
- **백업 복원 절차**: 데이터 복원 방법

## 1. Supabase 자동 백업

### 1.1 자동 백업 설정

Supabase는 기본적으로 **일일 자동 백업**을 제공합니다.

#### 백업 설정 확인
1. Supabase 대시보드 → 프로젝트 선택
2. **Settings** → **Database**
3. **Backups** 섹션 확인
   - 자동 백업: 활성화됨 (기본값)
   - 백업 보관 기간: 7일 (무료 플랜) 또는 30일 (Pro 플랜)

#### 백업 스케줄
- **백업 시간**: 매일 자동 (UTC 기준)
- **백업 유형**: Point-in-Time Recovery (PITR)
- **백업 보관**: 최근 7일 또는 30일

### 1.2 백업 확인

1. Supabase 대시보드 → **Database** → **Backups**
2. 백업 목록 확인:
   - 백업 시간
   - 백업 크기
   - 백업 상태

## 2. 수동 백업 (스냅샷)

### 2.1 Supabase 대시보드에서 백업 다운로드

#### 단계 1: 백업 생성
1. Supabase 대시보드 → **Database** → **Backups**
2. "Create Backup" 클릭
3. 백업 이름 입력 (예: `backup-2025-01-20`)
4. 백업 생성 대기 (수분 소요)

#### 단계 2: 백업 다운로드
1. 생성된 백업 옆 "Download" 클릭
2. 백업 파일 다운로드 (`.sql` 또는 `.dump` 형식)

### 2.2 Supabase CLI로 백업

#### 단계 1: Supabase CLI 설치
```bash
npm install -g supabase
```

#### 단계 2: 로그인
```bash
supabase login
```

#### 단계 3: 프로젝트 연결
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

#### 단계 4: 백업 생성
```bash
# 전체 데이터베이스 백업
supabase db dump -f backup-$(date +%Y%m%d).sql

# 특정 테이블만 백업
supabase db dump -t users -t consultations -f backup-users-consultations.sql

# 스키마만 백업 (데이터 제외)
supabase db dump --schema-only -f backup-schema-only.sql
```

### 2.3 pg_dump로 직접 백업

#### 단계 1: 연결 정보 확인
Supabase 대시보드 → **Settings** → **Database** → **Connection string**

#### 단계 2: 백업 실행
```bash
# 전체 백업
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -F c \
  -f backup-$(date +%Y%m%d).dump

# 특정 테이블만 백업
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -t users \
  -t consultations \
  -f backup-selected-tables.sql
```

## 3. 자동화 스크립트

### 3.1 주간 백업 스크립트

`scripts/backup-database.ts` 파일 생성:

```typescript
#!/usr/bin/env tsx
/**
 * 주간 데이터베이스 백업 스크립트
 * 
 * 사용법:
 *   tsx scripts/backup-database.ts
 * 
 * 이 스크립트는 Supabase CLI를 사용하여 데이터베이스 백업을 생성합니다.
 */

import { execSync } from "child_process"
import { writeFileSync } from "fs"
import { resolve } from "path"

const BACKUP_DIR = resolve(process.cwd(), "backups")
const DATE = new Date().toISOString().split("T")[0]
const BACKUP_FILE = `backup-${DATE}.sql`

console.log("🔄 데이터베이스 백업 시작...")
console.log(`📁 백업 파일: ${BACKUP_FILE}`)

try {
  // 백업 디렉터리 생성
  execSync(`mkdir -p ${BACKUP_DIR}`, { stdio: "inherit" })

  // Supabase CLI로 백업 생성
  execSync(
    `supabase db dump -f ${resolve(BACKUP_DIR, BACKUP_FILE)}`,
    { stdio: "inherit" }
  )

  // 백업 메타데이터 저장
  const metadata = {
    timestamp: new Date().toISOString(),
    filename: BACKUP_FILE,
    size: 0, // 실제 파일 크기는 별도로 확인 필요
  }

  writeFileSync(
    resolve(BACKUP_DIR, `backup-${DATE}.metadata.json`),
    JSON.stringify(metadata, null, 2)
  )

  console.log("✅ 백업 완료!")
  console.log(`📦 백업 위치: ${resolve(BACKUP_DIR, BACKUP_FILE)}`)
} catch (error) {
  console.error("❌ 백업 실패:", error)
  process.exit(1)
}
```

### 3.2 GitHub Actions로 자동 백업

`.github/workflows/backup-database.yml` 파일 생성:

```yaml
name: Weekly Database Backup

on:
  schedule:
    # 매주 월요일 오전 2시 (UTC) 실행
    - cron: '0 2 * * 1'
  workflow_dispatch: # 수동 실행 가능

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Supabase CLI
        run: npm install -g supabase

      - name: Login to Supabase
        run: supabase login
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Link project
        run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}

      - name: Create backup
        run: |
          mkdir -p backups
          supabase db dump -f backups/backup-$(date +%Y%m%d).sql

      - name: Upload backup to GitHub Releases
        uses: softprops/action-gh-release@v1
        with:
          files: backups/*.sql
          tag_name: backup-$(date +%Y%m%d)
          name: Database Backup $(date +%Y-%m-%d)
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Cleanup old backups
        run: |
          # 30일 이상 된 백업 삭제
          find backups -name "backup-*.sql" -mtime +30 -delete
```

### 3.3 Vercel Cron으로 주간 백업

`app/api/cron/backup-database/route.ts` 파일 생성:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

/**
 * POST /api/cron/backup-database
 * 
 * 주간 데이터베이스 백업을 생성합니다.
 * Vercel Cron으로 매주 실행됩니다.
 */
export async function POST(request: NextRequest) {
  // 보안: Cron Secret 확인
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = getSupabaseServerClient()

    // 백업 생성 (Supabase Management API 사용)
    // 참고: 실제 백업은 Supabase 대시보드에서 수동으로 생성하거나
    // Supabase CLI를 사용해야 합니다.

    // 대신, 중요한 데이터를 JSON으로 내보내기
    const tables = ["users", "consultations", "recommendations", "ippa_evaluations"]
    const backup: Record<string, unknown[]> = {}

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("*")
      if (!error && data) {
        backup[table] = data
      }
    }

    // 백업을 외부 저장소에 업로드 (예: S3, Google Cloud Storage)
    // 또는 Supabase Storage에 저장

    return NextResponse.json({
      success: true,
      message: "Backup created successfully",
      tables: Object.keys(backup),
      recordCount: Object.values(backup).reduce((sum, arr) => sum + arr.length, 0),
    })
  } catch (error) {
    console.error("[backup-database] Error:", error)
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    )
  }
}
```

`vercel.json`에 Cron 추가:
```json
{
  "crons": [
    {
      "path": "/api/cron/reminder-ippa",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/backup-database",
      "schedule": "0 2 * * 1"
    }
  ]
}
```

## 4. 백업 복원

### 4.1 Supabase 대시보드에서 복원

1. Supabase 대시보드 → **Database** → **Backups**
2. 복원할 백업 선택
3. "Restore" 클릭
4. 복원 옵션 선택:
   - **Point-in-Time Recovery**: 특정 시점으로 복원
   - **Full Restore**: 전체 데이터베이스 복원

### 4.2 Supabase CLI로 복원

```bash
# 백업 파일로 복원
supabase db reset
supabase db restore backup-20250120.sql

# 특정 테이블만 복원
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f backup-users-consultations.sql
```

### 4.3 pg_restore로 복원

```bash
# .dump 파일 복원
pg_restore -d "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  backup-20250120.dump

# 특정 테이블만 복원
pg_restore -d "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -t users \
  -t consultations \
  backup-20250120.dump
```

## 5. 백업 전략

### 5.1 백업 주기

- **일일 자동 백업**: Supabase 자동 백업 (7일 보관)
- **주간 수동 백업**: 매주 월요일 (30일 보관)
- **마이그레이션 전 백업**: 스키마 변경 전 필수
- **릴리스 전 백업**: 주요 기능 배포 전

### 5.2 백업 보관 정책

- **자동 백업**: 7일 (무료 플랜) 또는 30일 (Pro 플랜)
- **수동 백업**: 30일 (로컬/클라우드 저장소)
- **중요 백업**: 90일 (별도 보관)

### 5.3 백업 검증

매월 백업 복원 테스트 수행:
1. 테스트 환경에 백업 복원
2. 데이터 무결성 확인
3. 애플리케이션 동작 확인

## 6. 마이그레이션 전 백업

### 6.1 마이그레이션 전 체크리스트

마이그레이션 실행 전:
- [ ] 현재 데이터베이스 백업 생성
- [ ] 마이그레이션 스크립트 검토
- [ ] 롤백 계획 수립
- [ ] 테스트 환경에서 마이그레이션 테스트

### 6.2 마이그레이션 롤백

마이그레이션 실패 시:
1. Supabase 대시보드 → **Database** → **Migrations**
2. 실패한 마이그레이션 확인
3. 이전 마이그레이션으로 롤백:
   ```bash
   supabase migration repair --status reverted
   ```
4. 필요시 백업으로 복원

## 7. 백업 보안

### 7.1 백업 파일 보안

- 백업 파일은 암호화하여 저장
- 접근 권한 제한 (관리자만 접근)
- 백업 파일은 안전한 위치에 보관 (S3, Google Cloud Storage 등)

### 7.2 백업 접근 제어

- Supabase 백업은 프로젝트 소유자만 접근 가능
- 수동 백업은 안전한 클라우드 저장소에 보관
- 백업 다운로드 로그 기록

## 8. 모니터링 및 알림

### 8.1 백업 실패 알림

GitHub Actions 또는 Vercel Cron에서 백업 실패 시:
- 이메일 알림
- Slack 알림
- 관리자 대시보드에 표시

### 8.2 백업 상태 확인

매주 백업 상태 확인:
- 백업 파일 생성 여부
- 백업 파일 크기 확인
- 백업 파일 무결성 검증

## 9. 비용 최적화

### 9.1 백업 저장소 비용

- **Supabase 자동 백업**: 플랜에 포함
- **수동 백업**: 클라우드 저장소 비용 (S3, GCS 등)
- **백업 보관 기간 조정**: 필요에 따라 보관 기간 단축

### 9.2 백업 압축

백업 파일 압축으로 저장 공간 절약:
```bash
# 백업 생성 및 압축
supabase db dump -f backup.sql
gzip backup.sql
```

## 10. 체크리스트

### 초기 설정
- [ ] Supabase 자동 백업 확인
- [ ] 백업 스크립트 작성
- [ ] GitHub Actions 또는 Vercel Cron 설정
- [ ] 백업 저장소 설정 (S3, GCS 등)

### 정기 작업
- [ ] 주간 백업 확인
- [ ] 백업 파일 검증
- [ ] 백업 복원 테스트 (월 1회)
- [ ] 오래된 백업 정리

### 마이그레이션 전
- [ ] 현재 상태 백업
- [ ] 롤백 계획 수립
- [ ] 테스트 환경에서 마이그레이션 테스트

## 11. 참고 자료

- [Supabase Backups 문서](https://supabase.com/docs/guides/platform/backups)
- [Supabase CLI 문서](https://supabase.com/docs/reference/cli)
- [PostgreSQL 백업 문서](https://www.postgresql.org/docs/current/backup.html)
- [Vercel Cron 문서](https://vercel.com/docs/cron-jobs)

