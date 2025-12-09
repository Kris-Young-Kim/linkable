-- 장애 유형/정도 저장용 컬럼 추가 (옵셔널)
alter table consultations
  add column if not exists disability_type text,
  add column if not exists disability_severity text;

