-- =========================================================
-- [LinkAble] 12 03 03 (지팡이)에 잘못 배정된 모든 제품 수정
-- Database: PostgreSQL (Supabase)
-- Created: 2026-01-13
-- =========================================================
--
-- 문제: ISO 12.03.03 (지팡이)에 총 668개 제품이 배정되어 있으나, 실제 지팡이는 6개뿐
-- 나머지 662개는 휠체어, 쿠션, 리프터, 재활기구, 의자, 스위치 등 잘못 배정됨
-- 해결: 제품 이름 기반으로 올바른 ISO 코드로 재배정
--
-- 중요 원칙:
-- 1. ISO 9999:2022 (KS P ISO 9999:2022) 문서를 근본으로 함
-- 2. 모든 제품은 Division 레벨(6자리 코드, 예: "12 03 03")에 배정되어야 함
-- 3. Subclass 레벨(4자리)이나 Class 레벨(2자리)은 사용하지 않음
-- 4. 각 Division 코드는 ISO 9999:2022 표준에 명시된 정확한 정의를 따름
-- 5. 12 03 03 (지팡이)는 "지팡이", "cane", "stick" 키워드가 있는 제품만 엄격하게 배정
--    시트, 클러치, 다빈치, 뚜버기 등은 지팡이가 아니므로 다른 ISO 코드로 재배정
-- =========================================================

-- =========================================================
-- [0] 지팡이가 아닌 명확한 제품들 우선 처리 (엄격한 필터)
-- =========================================================

-- 0-1. 시트 관련 제품들 (고투시트, 구동형시트, 에이블통풍시트, 이지트래블시트, 판고시트 등)
-- ISO 9999:2022 기준: 18 09 21 특수 좌식 가구 또는 12 12 12 자동차용 시트
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 09 21'  -- 특수 좌식 가구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%시트%' OR
    p.name ILIKE '%seat%' OR
    p.name ILIKE '%고투시트%' OR
    p.name ILIKE '%goto%seat%' OR
    p.name ILIKE '%구동형시트%' OR
    p.name ILIKE '%에이블통풍시트%' OR
    p.name ILIKE '%이지트래블시트%' OR
    p.name ILIKE '%판고시트%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%'
  AND p.name NOT ILIKE '%stick%';

-- 0-2. 클러치 관련 제품들 (독일 엘보클러치, 알루미늄 클러치 등)
-- ISO 9999:2022 기준: 12 03 06 팔꿈치 목발 (클러치는 목발의 일종)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 03 06'  -- 팔꿈치 목발
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%클러치%' OR
    p.name ILIKE '%clutch%' OR
    p.name ILIKE '%엘보클러치%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 0-3. 다빈치 PRO (탁상용 독서확대기)
-- ISO 9999:2022 기준: 22 03 18 이미지 확대 시스템
-- 카메라로 전송, 촬영된 사물의 영상을 확대하여 모니터를 통해 직접 표시하는 장치
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 03 18'  -- 이미지 확대 시스템
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%다빈치%' OR
    p.name ILIKE '%davinci%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 0-4. 뚜버기 (유모차형휠체어)
-- ISO 9999:2022 기준: 12 27 07 유모차 및 사륜차
-- 보조인이 조종하고 제어하도록 설계된 한 명 이상의 사람을 눕거나 앉은 자세로 운반하기 위한 바퀴 달린 장치
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 27 07'  -- 유모차 및 사륜차
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%뚜버기%' OR
    p.name ILIKE '%toobagi%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- =========================================================
-- [1] 휠체어 관련 제품들
-- =========================================================

-- 1-1. 수동 휠체어 (기능형, 활동형 포함)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 22 03'  -- 일수 핸드림 구동 휠체어
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%휠체어%' OR
    p.name ILIKE '%wheelchair%' OR
    p.name ILIKE '%WHEELCHAIR%' OR
    p.name ILIKE '%기능형수동휠체%' OR
    p.name ILIKE '%활동형수동휠체%'
  )
  AND p.name NOT ILIKE '%전동%'
  AND p.name NOT ILIKE '%electric%'
  AND p.name NOT ILIKE '%powered%'
  AND p.name NOT ILIKE '%motorized%';

-- 1-2. 전동 휠체어
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 23 03'  -- 수동 직접 조향 전동 휠체어
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%전동휠체어%' OR
    p.name ILIKE '%전동%휠체어%' OR
    p.name ILIKE '%electric%wheelchair%' OR
    p.name ILIKE '%powered%wheelchair%' OR
    p.name ILIKE '%motorized%wheelchair%'
  );

-- 1-3. 욕창예방 방석 (로호 방석, 컨폼공기방석, 테라플레어 방석, 특마블방석 등)
-- ISO 9999:2022 기준: 04 33 03 조직 무결성을 위한 시트 쿠션 및 밑깔개
-- 둔부에 가해지는 하중의 재분배를 통한 조직 무결성을 위한 장치
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 33 03'  -- 조직 무결성을 위한 시트 쿠션 및 밑깔개
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%방석%' OR
    p.name ILIKE '%로호%방석%' OR
    p.name ILIKE '%roho%cushion%' OR
    p.name ILIKE '%욕창예방%' OR
    p.name ILIKE '%pressure%relief%' OR
    p.name ILIKE '%컨폼%' OR
    p.name ILIKE '%테라플레어%' OR
    p.name ILIKE '%특마블%'
  );

-- 1-4. 휠체어 쿠션 (로호 쿠션, 스타빌로 쿠션, EXGEL 쿠션 등)
-- ISO 9999:2022 기준: 12 25 06 시트 쿠션 및 밑깔개
-- 안정된 앉은 자세를 교정하고 유지하기 위해 좌석에 장착하는 쿠션 및 기타 장치
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 25 06'  -- 시트 쿠션 및 밑깔개
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    (p.name ILIKE '%로호%쿠션%' OR p.name ILIKE '%roho%cushion%') OR
    (p.name ILIKE '%스타빌로%쿠션%' OR p.name ILIKE '%stabilo%cushion%') OR
    (p.name ILIKE '%EXGEL%' OR p.name ILIKE '%moneat%') OR
    (p.name ILIKE '%쿠션%' AND (p.name ILIKE '%휠체어%' OR p.name ILIKE '%wheelchair%' OR p.name ILIKE '%헤드레스트%' OR p.name ILIKE '%headrest%' OR p.name ILIKE '%암레스트%' OR p.name ILIKE '%armrest%'))
  )
  AND p.name NOT ILIKE '%방석%'
  AND p.name NOT ILIKE '%욕창예방%';

-- 1-5. 매트리스 오버레이 (로호 매트리스 오버레이, 스타빌로 쿠션 매트리스 등)
-- ISO 9999:2022 기준: 04 33 06 누워 있을 때 조직 무결성을 위한 보조기구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 33 06'  -- 누워 있을 때 조직 무결성을 위한 보조기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%매트리스%오버레이%' OR
    p.name ILIKE '%mattress%overlay%' OR
    p.name ILIKE '%쿠션%매트리스%'
  );

-- 1-6. 쿠션체어 (그래비티체어 등)
-- ISO 9999:2022 기준: 18 09 21 특수 좌식 가구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 09 21'  -- 특수 좌식 가구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%쿠션체어%' OR
    p.name ILIKE '%cushion%chair%' OR
    p.name ILIKE '%그래비티체어%' OR
    p.name ILIKE '%gravity%chair%'
  );

-- =========================================================
-- [2] 자세지지/텀블폼 관련 제품들
-- =========================================================

-- 2-0. 자세보조용 발판 쿠션 및 자세보조 관련 제품들
-- ISO 9999:2022 기준: 18 10 15 다리 지지대 및 발 지지대
-- 다리를 받치거나 발을 지탱하기 위해 좌석 가구 앞에 배치하는 비장착형 보조기구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 10 15'  -- 다리 지지대 및 발 지지대
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%자세보조%발판%' OR
    p.name ILIKE '%발판%쿠션%' OR
    p.name ILIKE '%foot%rest%' OR
    p.name ILIKE '%footrest%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 2-0-1. 자세보조용구 및 자세보조의자
-- ISO 9999:2022 기준: 18 09 21 특수 좌식 가구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 09 21'  -- 특수 좌식 가구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%자세보조%' OR
    p.name ILIKE '%position%support%'
  )
  AND (
    p.name ILIKE '%의자%' OR
    p.name ILIKE '%chair%' OR
    p.name ILIKE '%용구%' OR
    p.name ILIKE '%이너%' OR
    p.name ILIKE '%inner%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%'
  AND p.name NOT ILIKE '%발판%'
  AND p.name NOT ILIKE '%카시트%'
  AND p.name NOT ILIKE '%car%seat%'
  AND p.name NOT ILIKE '%차량용%';

-- 2-0-2. 차량용 시트 (카시트, 차량용 자세 보조용구 등)
-- ISO 9999:2022 기준: 12 12 12 자동차용 시트와 쿠션 및 차량 시트 관련 액세서리 및 개조물
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 12 12'  -- 자동차용 시트와 쿠션 및 차량 시트 관련 액세서리 및 개조물
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%카시트%' OR
    p.name ILIKE '%car%seat%' OR
    (p.name ILIKE '%차량용%' AND (p.name ILIKE '%자세%' OR p.name ILIKE '%시트%' OR p.name ILIKE '%seat%'))
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 2-1. 자세지지용 의자/시트 (피더시트, 플로어시터 등)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 09 21'  -- 특수 좌식 가구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%자세지지%' OR
    p.name ILIKE '%피더시트%' OR
    p.name ILIKE '%플로어시터%' OR
    p.name ILIKE '%feeder%seat%' OR
    p.name ILIKE '%floor%seater%' OR
    p.name ILIKE '%코너체어%' OR
    p.name ILIKE '%corner%chair%'
  );

-- 2-2. 웨지/롤 (자세지지용)
-- ISO 9999:2022 기준: 12 25 06 시트 쿠션 및 밑깔개
-- 안정된 앉은 자세를 교정하고 유지하기 위해 좌석에 장착하는 쿠션 및 기타 장치
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 25 06'  -- 시트 쿠션 및 밑깔개
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    -- 텀블폼 제품들 (자세지지용 제품)
    p.name ILIKE '%텀블폼%' OR
    p.name ILIKE '%tumbleform%' OR
    -- 웨지 관련
    (p.name ILIKE '%웨지%' OR p.name ILIKE '%wedge%') OR
    -- 롤 관련
    (p.name ILIKE '%롤%' OR p.name ILIKE '%roll%') OR
    -- 받침 관련
    p.name ILIKE '%받침%' OR
    -- 내전방지봉 (자세지지용)
    p.name ILIKE '%내전방지%' OR
    -- 기타 자세지지 관련 키워드
    p.name ILIKE '%자세지지%' OR
    p.name ILIKE '%position%support%' OR
    p.name ILIKE '%지지%'
  );

-- 2-3. 24시간 자세유지시스템
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 09 21'  -- 특수 좌식 가구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%자세유지%' OR
    p.name ILIKE '%드리마%' OR
    p.name ILIKE '%Dreama%' OR
    p.name ILIKE '%24시간%'
  );

-- =========================================================
-- [3] 리프터/리프팅 관련 제품들
-- =========================================================

-- 3-1. 리프터 (Apexlift 등)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 31 24'  -- 리프팅 시트 및 리프팅 매트리스
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%리프터%' OR
    p.name ILIKE '%lifter%' OR
    p.name ILIKE '%리프트%' OR
    p.name ILIKE '%lift%' OR
    p.name ILIKE '%Apexlift%' OR
    p.name ILIKE '%기립%'
  );

-- =========================================================
-- [4] 재활운동기구
-- =========================================================

-- 4-1. 재활러닝머신/운동기구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 48 15'  -- 팔 운동기구, 몸통 운동기구 및 다리 운동기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%재활%' OR
    p.name ILIKE '%운동기%' OR
    p.name ILIKE '%러닝머신%' OR
    p.name ILIKE '%running%machine%' OR
    p.name ILIKE '%그네%' OR
    p.name ILIKE '%swing%' OR
    p.name ILIKE '%평균대%' OR
    p.name ILIKE '%balance%beam%'
  );

-- 4-2. 손조작운동기
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 48 12'  -- 손가락 및 손 운동기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%손조작%' OR
    p.name ILIKE '%운동기%'
  );

-- =========================================================
-- [5] 의자/시트 관련 제품들
-- =========================================================

-- 5-1. 일반 의자 (Jr TILT, MC-22, Basic D 등)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 09 21'  -- 특수 좌식 가구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%TILT%' OR
    p.name ILIKE '%틸트%' OR
    p.name ILIKE '%MC-%' OR
    p.name ILIKE '%Basic%' OR
    p.name ILIKE '%BETA%' OR
    p.name ILIKE '%Carina%' OR
    p.name ILIKE '%D-%' OR
    p.name ILIKE '%GK%' OR
    p.name ILIKE '%HAL-%' OR
    p.name ILIKE '%HSA-%' OR
    p.name ILIKE '%JOY%' OR
    p.name ILIKE '%Jr-%' OR
    p.name ILIKE '%K401%' OR
    p.name ILIKE '%KP-%' OR
    p.name ILIKE '%LV%' OR
    p.name ILIKE '%M-%' OR
    p.name ILIKE '%MADE-%' OR
    p.name ILIKE '%MBW-%' OR
    p.name ILIKE '%MF-%' OR
    p.name ILIKE '%MFL-%' OR
    p.name ILIKE '%MGL-%' OR
    p.name ILIKE '%MIKIEV-%' OR
    p.name ILIKE '%MIRAGE%'
  )
  AND (
    p.name NOT ILIKE '%지팡이%' AND
    p.name NOT ILIKE '%cane%' AND
    p.name NOT ILIKE '%stick%'
  );

-- =========================================================
-- [6] 스위치 관련 제품들
-- =========================================================

-- 6-1. 스위치 (Pillow Switch 등)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 13 09'  -- 전기기기용 스위치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%스위치%' OR
    p.name ILIKE '%switch%' OR
    p.name ILIKE '%Switch%'
  );

-- =========================================================
-- [7] 마운팅시스템
-- =========================================================

-- 7-1. 마운팅시스템
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 18 12'  -- 스탠드
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%마운트%' OR
    p.name ILIKE '%mount%' OR
    p.name ILIKE '%마운팅%'
  );

-- =========================================================
-- [8] 부유대/머리부유대
-- =========================================================

-- 8-1. 부유대
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '09 33 39'  -- 부유 보조기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%부유%' OR
    p.name ILIKE '%float%' OR
    p.name ILIKE '%머리부유%'
  );

-- =========================================================
-- [9] 시각 보조기기 (ClearView 등)
-- =========================================================

-- 9-1. 화면확대기/독서확대기
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 03 18'  -- 독서 확대기
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%확대기%' OR
    p.name ILIKE '%magnifier%' OR
    p.name ILIKE '%ClearView%' OR
    p.name ILIKE '%크리어뷰%'
  );

-- =========================================================
-- [10] 추가 의자/휠체어 모델명 처리
-- =========================================================

-- 10-0. 의자/휠체어 모델명 (B500, FT-2000, ML-22D, MSA, MSL, MY, P12, PF2K, POCKET, Reveal, TRB, U2, VP, W-레전드 등)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 09 21'  -- 특수 좌식 가구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%B500%' OR
    p.name ILIKE '%FT-2000%' OR
    p.name ILIKE '%ML-%' OR
    p.name ILIKE '%MSA-%' OR
    p.name ILIKE '%MSL-%' OR
    p.name ILIKE '%MY-%' OR
    p.name ILIKE '%P12%' OR
    p.name ILIKE '%PF2K%' OR
    p.name ILIKE '%POCKET-%' OR
    p.name ILIKE '%Reveal%' OR
    p.name ILIKE '%TRB%' OR
    p.name ILIKE '%U2%' OR
    p.name ILIKE '%VP%' OR
    p.name ILIKE '%W-레전드%' OR
    p.name ILIKE '%나드리%' OR
    p.name ILIKE '%나래%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%'
  AND p.name NOT ILIKE '%stick%';

-- 10-0-1. 이송 보조기구 (글라이더, 글라이드보드 등)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 31 21'  -- 이송 플랫폼
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%글라이더%' OR
    p.name ILIKE '%glider%' OR
    p.name ILIKE '%글라이드%' OR
    p.name ILIKE '%glide%' OR
    p.name ILIKE '%이송%' OR
    p.name ILIKE '%transfer%'
  );

-- 10-0-2. 작업치료/재활 도구 (페그보드, 원뿔쌓기 등)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 48 12'  -- 손가락 및 손 운동기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%페그보드%' OR
    p.name ILIKE '%peg%board%' OR
    p.name ILIKE '%원뿔쌓기%' OR
    p.name ILIKE '%패턴보드%'
  );

-- 10-0-3. 착의 보조기구 (양말신는도구, 신발끈 등)
-- ISO 9999:2022 기준: 09 09 03 옷을 입거나 벗을 때 필요한 보조기구
-- 양말, 스타킹을 착용하거나 벗을 수 있게 해주는 기기
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '09 09 03'  -- 옷을 입거나 벗을 때 필요한 보조기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%양말%' OR
    p.name ILIKE '%sock%' OR
    p.name ILIKE '%착의%' OR
    p.name ILIKE '%dressing%' OR
    p.name ILIKE '%신발끈%' OR
    p.name ILIKE '%shoe%lace%' OR
    p.name ILIKE '%매듭이필요없는%' OR
    p.name ILIKE '%no%tie%'
  );

-- 10-0-4. 보행 보조기구 (Moxie, TREKKER 등)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 06 03'  -- 보행 프레임
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%Moxie%' OR
    p.name ILIKE '%막시%' OR
    p.name ILIKE '%TREKKER%' OR
    p.name ILIKE '%트랙커%' OR
    p.name ILIKE '%보행%' OR
    p.name ILIKE '%walking%frame%'
  )
  AND p.name NOT ILIKE '%지팡이%';

-- =========================================================
-- [11] 추가 제품 유형 처리
-- =========================================================

-- 11-0. 전동스쿠터
-- ISO 9999:2022 기준: 12 23 03 수동 직접 조향 기능을 갖춘 전동 휠체어
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 23 03'  -- 수동 직접 조향 기능을 갖춘 전동 휠체어
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%전동스쿠터%' OR
    p.name ILIKE '%electric%scooter%' OR
    p.name ILIKE '%스쿠터%S19%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-1. 전동 스텐더 (전동 슈파인 스텐더, 전동 프론 스텐더 등)
-- ISO 9999:2022 기준: 04 48 39 스탠딩 프레임 및 스탠딩 지지대
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 48 39'  -- 스탠딩 프레임 및 스탠딩 지지대
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%전동%스텐더%' OR
    p.name ILIKE '%electric%stander%' OR
    p.name ILIKE '%슈파인%스텐더%' OR
    p.name ILIKE '%프론%스텐더%' OR
    p.name ILIKE '%spine%stander%' OR
    p.name ILIKE '%prone%stander%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-2. 조이스틱/트랙볼 (엔에이블러 조이스틱, 엔에이블러 트랙볼, 퀘스터 조이스틱 등)
-- ISO 9999:2022 기준: 24 13 21 컴퓨터 포인팅 장치
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 13 21'  -- 컴퓨터 포인팅 장치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%조이스틱%' OR
    p.name ILIKE '%joystick%' OR
    p.name ILIKE '%트랙볼%' OR
    p.name ILIKE '%trackball%' OR
    p.name ILIKE '%엔에이블러%' OR
    p.name ILIKE '%enable%' OR
    p.name ILIKE '%퀘스터%' OR
    p.name ILIKE '%quester%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-3. 마우스스틱 (직선형 마우스스틱, 집게형수직 마우스스틱 등)
-- ISO 9999:2022 기준: 24 13 21 컴퓨터 포인팅 장치 또는 24 18 15 작동 스틱
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 18 15'  -- 작동 스틱
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%마우스스틱%' OR
    p.name ILIKE '%mouse%stick%' OR
    p.name ILIKE '%직선형%마우스%' OR
    p.name ILIKE '%집게형%마우스%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-4. 랩보드 (자작나무랩보드, 트라바색랩보드 등)
-- ISO 9999:2022 기준: 18 03 06 독서대, 책상 및 입식 책상
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 03 06'  -- 독서대, 책상 및 입식 책상
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%랩보드%' OR
    p.name ILIKE '%lap%board%' OR
    p.name ILIKE '%자작나무%' OR
    p.name ILIKE '%트라바색%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-5. 이송 보조기구 (레이저프로 환자이동플렛폼, 매니풀레이션보드 등)
-- ISO 9999:2022 기준: 12 31 21 이송 플랫폼
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 31 21'  -- 이송 플랫폼
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%환자이동%' OR
    p.name ILIKE '%patient%transfer%' OR
    p.name ILIKE '%레이저프로%' OR
    p.name ILIKE '%raiser%pro%' OR
    p.name ILIKE '%매니풀레이션%' OR
    p.name ILIKE '%manipulation%board%' OR
    p.name ILIKE '%이동플렛폼%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-6. 재활/운동기구 (코지사다리훈련기, 코지징검다리훈련판 등)
-- ISO 9999:2022 기준: 04 48 07 보행 패턴 운동용 보조기구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 48 07'  -- 보행 패턴 운동용 보조기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%사다리훈련%' OR
    p.name ILIKE '%징검다리%' OR
    p.name ILIKE '%계단훈련%' OR
    p.name ILIKE '%step%training%' OR
    p.name ILIKE '%훈련기%' OR
    p.name ILIKE '%training%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-7. 시각 보조기구 (센스리더 어센드, 아크로벳 LCD HD 등)
-- ISO 9999:2022 기준: 22 13 15 화면 낭독 소프트웨어 또는 22 03 18 이미지 확대 시스템
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 13 15'  -- 화면 낭독 소프트웨어
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%센스리더%' OR
    p.name ILIKE '%sense%reader%' OR
    p.name ILIKE '%아크로벳%' OR
    p.name ILIKE '%acrobat%' OR
    p.name ILIKE '%화면%낭독%' OR
    p.name ILIKE '%screen%reader%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-8. 의사소통 보조기구 (메세지스톤 AI, 위드톡 등)
-- ISO 9999:2022 기준: 22 21 09 대화 장치
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 21 09'  -- 대화 장치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%메세지스톤%' OR
    p.name ILIKE '%message%stone%' OR
    p.name ILIKE '%위드톡%' OR
    p.name ILIKE '%withtalk%' OR
    p.name ILIKE '%토커블%' OR
    p.name ILIKE '%talkable%' OR
    p.name ILIKE '%의사소통%' OR
    p.name ILIKE '%communication%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-9. 유모차 (스트라이브 유모차, 에미오 유모차, 에쿠보 유모차 등)
-- ISO 9999:2022 기준: 12 27 07 유모차 및 사륜차
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 27 07'  -- 유모차 및 사륜차
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%유모차%' OR
    p.name ILIKE '%stroller%' OR
    p.name ILIKE '%스트라이브%' OR
    p.name ILIKE '%strive%' OR
    p.name ILIKE '%에미오%' OR
    p.name ILIKE '%emio%' OR
    p.name ILIKE '%에쿠보%' OR
    p.name ILIKE '%ekubo%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-10. 코지 의자 시리즈 (코지베이직체어, 코지멀티체어, 코지킨더체어 등)
-- ISO 9999:2022 기준: 18 09 21 특수 좌식 가구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 09 21'  -- 특수 좌식 가구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%코지%' AND (
      p.name ILIKE '%체어%' OR
      p.name ILIKE '%chair%' OR
      p.name ILIKE '%의자%'
    )
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-11. 리프터 (무버180, 업고 플러스 등)
-- ISO 9999:2022 기준: 12 31 24 리프팅 시트 및 리프팅 매트리스
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 31 24'  -- 리프팅 시트 및 리프팅 매트리스
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%무버%' OR
    p.name ILIKE '%mover%' OR
    p.name ILIKE '%업고%' OR
    p.name ILIKE '%up%go%' OR
    p.name ILIKE '%리프터%' OR
    p.name ILIKE '%lifter%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-12. 이동보조벨트 (리프팅 벨트)
-- ISO 9999:2022 기준: 12 31 15 리프팅 벨트 및 하네스
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 31 15'  -- 리프팅 벨트 및 하네스
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%이동보조벨트%' OR
    p.name ILIKE '%transfer%belt%' OR
    p.name ILIKE '%리프팅%벨트%' OR
    p.name ILIKE '%lifting%belt%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-13. 자전거 (오페어 자전거 등)
-- ISO 9999:2022 기준: 12 18 04 발로 움직이는 자전거 또는 12 18 05 손으로 움직이는 자전거
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 18 04'  -- 발로 움직이는 자전거
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%자전거%' OR
    p.name ILIKE '%bicycle%' OR
    p.name ILIKE '%bike%' OR
    p.name ILIKE '%오페어%' OR
    p.name ILIKE '%opair%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-14. 보행 보조기구 (리틀스텝바이스텝, 빅스텝바이스텝, 리틀스탭바이스탭, 빅스탭바이스탭 등)
-- ISO 9999:2022 기준: 04 48 07 보행 패턴 운동용 보조기구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 48 07'  -- 보행 패턴 운동용 보조기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%스텝바이스텝%' OR
    p.name ILIKE '%스탭바이스탭%' OR
    p.name ILIKE '%step%by%step%' OR
    p.name ILIKE '%리틀스텝%' OR
    p.name ILIKE '%리틀스탭%' OR
    p.name ILIKE '%빅스텝%' OR
    p.name ILIKE '%빅스탭%' OR
    p.name ILIKE '%little%step%' OR
    p.name ILIKE '%big%step%' OR
    p.name ILIKE '%레벨%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 11-15. 휠체어/의자 모델명 (레포, 빅토리, 빙고, 아미고, 아이체어프로, 점보레스트, 주보 등)
-- ISO 9999:2022 기준: 18 09 21 특수 좌식 가구 또는 12 22 03 일수 핸드림 구동 휠체어
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 09 21'  -- 특수 좌식 가구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%레포%' OR
    p.name ILIKE '%revo%' OR
    p.name ILIKE '%빅토리%' OR
    p.name ILIKE '%victory%' OR
    p.name ILIKE '%빙고%' OR
    p.name ILIKE '%bingo%' OR
    p.name ILIKE '%아미고%' OR
    p.name ILIKE '%amigo%' OR
    p.name ILIKE '%아이체어%' OR
    p.name ILIKE '%eyechair%' OR
    p.name ILIKE '%점보레스트%' OR
    p.name ILIKE '%jumbo%rest%' OR
    p.name ILIKE '%주보%' OR
    p.name ILIKE '%jubo%' OR
    p.name ILIKE '%리틀맥%' OR
    p.name ILIKE '%little%mac%' OR
    p.name ILIKE '%에스%' OR
    p.name ILIKE '%S19%' OR
    p.name ILIKE '%에스라이더%' OR
    p.name ILIKE '%에베레스트%' OR
    p.name ILIKE '%everest%' OR
    p.name ILIKE '%스타트%' OR
    p.name ILIKE '%start%' OR
    p.name ILIKE '%토도%' OR
    p.name ILIKE '%todo%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%'
  AND p.name NOT ILIKE '%스텝%';

-- 11-16. 추가 휠체어/의자 모델명 (마이토키, 머린, 메이저, 비지, 카멜, 캔디, 한소네 등)
-- ISO 9999:2022 기준: 18 09 21 특수 좌식 가구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 09 21'  -- 특수 좌식 가구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%마이토키%' OR
    p.name ILIKE '%mytoqi%' OR
    p.name ILIKE '%머린%' OR
    p.name ILIKE '%merlin%' OR
    p.name ILIKE '%메이저%' OR
    p.name ILIKE '%major%' OR
    p.name ILIKE '%비지%' OR
    p.name ILIKE '%bizzy%' OR
    p.name ILIKE '%카멜%' OR
    p.name ILIKE '%camel%' OR
    p.name ILIKE '%캔디%' OR
    p.name ILIKE '%candy%' OR
    p.name ILIKE '%한소네%' OR
    p.name ILIKE '%hansone%' OR
    p.name ILIKE '%하하%' OR
    p.name ILIKE '%크리켓%' OR
    p.name ILIKE '%cricket%' OR
    p.name ILIKE '%텔레스틱%' OR
    p.name ILIKE '%telestick%' OR
    p.name ILIKE '%투부스원%' OR
    p.name ILIKE '%toobusone%' OR
    p.name ILIKE '%티닷%' OR
    p.name ILIKE '%tdot%' OR
    p.name ILIKE '%비닷%' OR
    p.name ILIKE '%bdot%' OR
    p.name ILIKE '%파이프트리%' OR
    p.name ILIKE '%pipetree%' OR
    p.name ILIKE '%포밍휠%' OR
    p.name ILIKE '%foaming%wheel%' OR
    p.name ILIKE '%휠스터%' OR
    p.name ILIKE '%wheelster%' OR
    p.name ILIKE '%스칼롭%' OR
    p.name ILIKE '%scallop%' OR
    p.name ILIKE '%아코이하트%' OR
    p.name ILIKE '%acoiheart%' OR
    p.name ILIKE '%스마트나브%' OR
    p.name ILIKE '%smartnav%' OR
    p.name ILIKE '%소리안썬더%' OR
    p.name ILIKE '%sound%thunder%' OR
    p.name ILIKE '%라이트닝%' OR
    p.name ILIKE '%lightning%' OR
    p.name ILIKE '%던슬로프%' OR
    p.name ILIKE '%dunslope%' OR
    p.name ILIKE '%레인보우%빈백%' OR
    p.name ILIKE '%rainbow%bean%bag%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- =========================================================
-- [12] 기타 명확한 제품들
-- =========================================================

-- 12-0. 집게/그립 (새몬스집게, 쿼드집게, 슈퍼 그립, 점보 그립, 펜슬그립 등)
-- ISO 9999:2022 기준: 24 18 03 파지 장치
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 18 03'  -- 파지 장치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%집게%' OR
    p.name ILIKE '%grasp%' OR
    p.name ILIKE '%그립%' OR
    p.name ILIKE '%grip%' OR
    p.name ILIKE '%새몬스%' OR
    p.name ILIKE '%salmon%' OR
    p.name ILIKE '%쿼드%' OR
    p.name ILIKE '%quad%' OR
    p.name ILIKE '%픽업%' OR
    p.name ILIKE '%pickup%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-1. 매트 (무지개매트, 울트라매트, 파워체조매트, 낙상 충격흡수 침대 바닥매트 등)
-- ISO 9999:2022 기준: 04 33 06 누워 있을 때 조직 무결성을 위한 보조기구 또는 18 12 18 매트리스 및 매트리스 커버
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 33 06'  -- 누워 있을 때 조직 무결성을 위한 보조기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%매트%' OR
    p.name ILIKE '%mat%' OR
    p.name ILIKE '%무지개매트%' OR
    p.name ILIKE '%rainbow%mat%' OR
    p.name ILIKE '%울트라매트%' OR
    p.name ILIKE '%ultra%mat%' OR
    p.name ILIKE '%파워체조매트%' OR
    p.name ILIKE '%power%folding%mat%' OR
    p.name ILIKE '%낙상%충격흡수%' OR
    p.name ILIKE '%fall%protection%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-2. 보드 (비지P 트랜스퍼 보드, 휠링 보드, 코지낮은무빙보드 등)
-- ISO 9999:2022 기준: 12 31 21 이송 플랫폼
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 31 21'  -- 이송 플랫폼
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    (p.name ILIKE '%트랜스퍼%보드%' OR p.name ILIKE '%transfer%board%') OR
    (p.name ILIKE '%휠링%보드%' OR p.name ILIKE '%wheeling%board%') OR
    (p.name ILIKE '%무빙보드%' OR p.name ILIKE '%moving%board%')
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-3. 손잡이 (흡착식이동손잡이, 압축 벽 손잡이 등)
-- ISO 9999:2022 기준: 24 18 06 그립 어댑터 및 부착물
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 18 06'  -- 그립 어댑터 및 부착물
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%흡착식%이동손잡이%' OR
    p.name ILIKE '%suction%handle%' OR
    p.name ILIKE '%압축%벽%손잡이%' OR
    p.name ILIKE '%compression%wall%handle%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-4. 벨트 (안전벨트, 차량용 고정벨트, 차량용 보조안전벨트 등)
-- ISO 9999:2022 기준: 12 12 09 차량 탑승자 보호 시스템
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 12 09'  -- 차량 탑승자 보호 시스템
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    (p.name ILIKE '%안전벨트%' OR p.name ILIKE '%safety%belt%') OR
    (p.name ILIKE '%차량용%' AND (p.name ILIKE '%벨트%' OR p.name ILIKE '%belt%'))
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-5. 책상 (코지데스크, 책마루3 등)
-- ISO 9999:2022 기준: 18 03 06 독서대, 책상 및 입식 책상
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 03 06'  -- 독서대, 책상 및 입식 책상
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%데스크%' OR
    p.name ILIKE '%desk%' OR
    p.name ILIKE '%책마루%' OR
    p.name ILIKE '%책상%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-6. 계단 (코지3단계단, 코지흔들배(계단오르기) 등)
-- ISO 9999:2022 기준: 18 30 21 사다리 및 발판사다리
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 30 21'  -- 사다리 및 발판사다리
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%계단%' OR
    p.name ILIKE '%step%' OR
    p.name ILIKE '%흔들배%' OR
    p.name ILIKE '%사다리%' OR
    p.name ILIKE '%ladder%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%'
  AND p.name NOT ILIKE '%스텝바이스텝%';

-- 12-7. 베드 (코지이동베드 등)
-- ISO 9999:2022 기준: 18 12 04 침대 및 분리형 침대 보드/매트리스 지지대, 비조절식
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 12 04'  -- 침대 및 분리형 침대 보드/매트리스 지지대, 비조절식
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%이동베드%' OR
    p.name ILIKE '%mobile%bed%' OR
    p.name ILIKE '%베드%' OR
    p.name ILIKE '%bed%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-8. 벤치 (치료용 벤치 등)
-- ISO 9999:2022 기준: 18 09 04 스툴 또는 04 48 27 치료 중 신체 위치 조정을 위한 보조기구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 48 27'  -- 치료 중 신체 위치 조정을 위한 보조기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%치료용%벤치%' OR
    p.name ILIKE '%therapy%bench%' OR
    p.name ILIKE '%벤치%' OR
    p.name ILIKE '%bench%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-9. 스탠드 (사이트 스탠드 등)
-- ISO 9999:2022 기준: 24 18 12 스탠드
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 18 12'  -- 스탠드
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%사이트%스탠드%' OR
    p.name ILIKE '%site%stand%' OR
    p.name ILIKE '%스탠드%' OR
    p.name ILIKE '%stand%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%'
  AND p.name NOT ILIKE '%스텐더%';

-- 12-10. 착의 보조기구 (지퍼올리는도구 등)
-- ISO 9999:2022 기준: 09 09 12 착의 및 탈의 후크 또는 스틱
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '09 09 12'  -- 착의 및 탈의 후크 또는 스틱
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%지퍼%올리는%' OR
    p.name ILIKE '%zipper%' OR
    p.name ILIKE '%착의%' OR
    p.name ILIKE '%dressing%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-11. 의사소통 보조기구 (프록스토커, 프록스패드 등)
-- ISO 9999:2022 기준: 22 21 09 대화 장치
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 21 09'  -- 대화 장치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%프록스토커%' OR
    p.name ILIKE '%proxtalker%' OR
    p.name ILIKE '%프록스패드%' OR
    p.name ILIKE '%proxpad%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-12. 자세지지 제품 (프리폼 키트, 바디서포트, 슈퍼헤드 등)
-- ISO 9999:2022 기준: 12 25 18 휠체어용 몸통 지지대 및 골반 지지대 또는 18 10 03 등쿠션
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 25 18'  -- 휠체어용 몸통 지지대 및 골반 지지대
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%프리폼%' OR
    p.name ILIKE '%preform%' OR
    p.name ILIKE '%바디서포트%' OR
    p.name ILIKE '%body%support%' OR
    p.name ILIKE '%슈퍼헤드%' OR
    p.name ILIKE '%super%head%' OR
    p.name ILIKE '%컴포트헤드%' OR
    p.name ILIKE '%comfort%head%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-13. 컴퓨터 포인팅 장치 (인테그라마우스플러스, 조우스+, 장애인용 POS 등)
-- ISO 9999:2022 기준: 24 13 21 컴퓨터 포인팅 장치
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 13 21'  -- 컴퓨터 포인팅 장치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%인테그라마우스%' OR
    p.name ILIKE '%integra%mouse%' OR
    p.name ILIKE '%조우스%' OR
    p.name ILIKE '%jouse%' OR
    p.name ILIKE '%장애인용%POS%' OR
    p.name ILIKE '%pointing%device%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-14. 보행 보조기구 (엑설런트워크, 오비트랙 등)
-- ISO 9999:2022 기준: 12 06 03 보행 프레임
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 06 03'  -- 보행 프레임
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%엑설런트워크%' OR
    p.name ILIKE '%excellent%walk%' OR
    p.name ILIKE '%오비트랙%' OR
    p.name ILIKE '%orbitrack%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-15. 식사 보조기구 (사발단장 등)
-- ISO 9999:2022 기준: 15 09 13 커트러리, 젓가락 및 빨대
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '15 09 13'  -- 커트러리, 젓가락 및 빨대
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%사발단장%' OR
    p.name ILIKE '%bowl%holder%' OR
    p.name ILIKE '%식사%보조%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-16. 청각 보조기구 (소리안썬더 등)
-- ISO 9999:2022 기준: 22 06 03 보청기
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 06 03'  -- 보청기
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%소리안썬더%' OR
    p.name ILIKE '%sound%thunder%' OR
    p.name ILIKE '%청각%' OR
    p.name ILIKE '%hearing%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-17. 목 트랙션 (목트랙션 등)
-- ISO 9999:2022 기준: 04 30 03 온열 치료용 보조기구 또는 적절한 코드
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 30 03'  -- 온열 치료용 보조기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%목트랙션%' OR
    p.name ILIKE '%neck%traction%' OR
    p.name ILIKE '%트랙션%' OR
    p.name ILIKE '%traction%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-18. 담요 (무게가있는담요 등)
-- ISO 9999:2022 기준: 18 12 15 침구류
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 12 15'  -- 침구류
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%담요%' OR
    p.name ILIKE '%blanket%' OR
    p.name ILIKE '%무게가있는%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-19. 어댑터 (배터리 장치 어댑터 등)
-- ISO 9999:2022 기준: 24 13 27 전기기기 작동 및 제어용 보조기구 액세서리
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 13 27'  -- 전기기기 작동 및 제어용 보조기구 액세서리
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%어댑터%' OR
    p.name ILIKE '%adapter%' OR
    p.name ILIKE '%배터리%장치%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-20. 커버 (벌사폼 하프매트리스용 커버 등)
-- ISO 9999:2022 기준: 18 12 18 매트리스 및 매트리스 커버
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 12 18'  -- 매트리스 및 매트리스 커버
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%커버%' OR
    p.name ILIKE '%cover%' OR
    p.name ILIKE '%매트리스%커버%' OR
    p.name ILIKE '%mattress%cover%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-21. 인터페이스 (히치2 인터페이스 등)
-- ISO 9999:2022 기준: 24 13 27 전기기기 작동 및 제어용 보조기구 액세서리
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 13 27'  -- 전기기기 작동 및 제어용 보조기구 액세서리
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%인터페이스%' OR
    p.name ILIKE '%interface%' OR
    p.name ILIKE '%히치%' OR
    p.name ILIKE '%hitch%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-22. 슬링 (무버180용 전용슬링 등)
-- ISO 9999:2022 기준: 12 31 18 운반용 의자, 하네스 및 바스켓
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 31 18'  -- 운반용 의자, 하네스 및 바스켓
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%슬링%' OR
    p.name ILIKE '%sling%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-23. 체중계 (무버180, 무버205, 아놀드150 용 체중계 등)
-- ISO 9999:2022 기준: 04 24 27 체중계
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 24 27'  -- 체중계
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%체중계%' OR
    p.name ILIKE '%scale%' OR
    p.name ILIKE '%weight%scale%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-24. 베이스 (빙고 전용 실내 베이스 등)
-- ISO 9999:2022 기준: 12 24 03 휠체어용 조향 및 제어 시스템 또는 적절한 코드
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 24 03'  -- 휠체어용 조향 및 제어 시스템
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%베이스%' OR
    p.name ILIKE '%base%' OR
    p.name ILIKE '%실내%베이스%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-25. 시스템 (고정 튜브 시스템, 피닉스 시스템 백, 피닉스 컴팩트 백 등)
-- ISO 9999:2022 기준: 제품 특성에 따라 적절한 코드 배정 필요
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 24 42'  -- 물건을 고정하거나 운반하기 위해 휠체어에 부착된 장치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%고정%튜브%시스템%' OR
    p.name ILIKE '%tubo%system%' OR
    p.name ILIKE '%피닉스%' OR
    p.name ILIKE '%phoenix%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-26. 트레이 (토마토 모바일 트레이 등)
-- ISO 9999:2022 기준: 12 25 24 휠체어용 무릎 트레이
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 25 24'  -- 휠체어용 무릎 트레이
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%트레이%' OR
    p.name ILIKE '%tray%' OR
    p.name ILIKE '%토마토%모바일%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-27. 서포트 (토일렛 암서포트 등)
-- ISO 9999:2022 기준: 09 12 24 변기에 장착된 변기 팔 지지대 및 변기 등받이
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '09 12 24'  -- 변기에 장착된 변기 팔 지지대 및 변기 등받이
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%토일렛%암서포트%' OR
    p.name ILIKE '%toilet%arm%support%' OR
    p.name ILIKE '%변기%팔%지지%' OR
    p.name ILIKE '%toilet%arm%rest%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-28. 발판 (코지스트레치용발판 등)
-- ISO 9999:2022 기준: 18 10 15 다리 지지대 및 발 지지대
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 10 15'  -- 다리 지지대 및 발 지지대
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%스트레치용발판%' OR
    p.name ILIKE '%stretch%footrest%' OR
    p.name ILIKE '%발판%' OR
    p.name ILIKE '%footrest%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-29. 의자 (이지포지셔닝 체어, 장애아동용의자, 레인보우 빈백체어 등)
-- ISO 9999:2022 기준: 18 09 21 특수 좌식 가구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 09 21'  -- 특수 좌식 가구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    (p.name ILIKE '%이지포지셔닝%체어%' OR p.name ILIKE '%ez%positioning%chair%') OR
    (p.name ILIKE '%장애아동용의자%') OR
    (p.name ILIKE '%빈백체어%' OR p.name ILIKE '%bean%bag%chair%')
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-30. 작업치료/재활 도구 (박스와블럭테스트, 한글잼잼 등)
-- ISO 9999:2022 기준: 04 26 03 기억력 훈련용 보조기구 또는 04 28 12 지각 차별 및 매칭 훈련용 보조기구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '04 28 12'  -- 지각 차별 및 매칭 훈련용 보조기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%박스와블럭%' OR
    p.name ILIKE '%box%block%' OR
    p.name ILIKE '%한글잼잼%' OR
    p.name ILIKE '%작업치료%' OR
    p.name ILIKE '%occupational%therapy%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-31. 체험복 (노인체험복 등)
-- ISO 9999:2022 기준: 09 03 18 재킷 및 바지
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '09 03 18'  -- 재킷 및 바지
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%체험복%' OR
    p.name ILIKE '%experience%suit%' OR
    p.name ILIKE '%노인체험%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-32. 통/컨테이너 (무지개통 등)
-- ISO 9999:2022 기준: 24 36 03 운반용 보조기구
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 36 03'  -- 운반용 보조기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%무지개통%' OR
    p.name ILIKE '%rainbow%container%' OR
    p.name ILIKE '%통%' OR
    p.name ILIKE '%container%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-33. 테스트 제품 (test_product1 등)
-- 테스트 제품은 NULL로 설정하거나 적절한 코드로 배정
UPDATE products p
SET iso_code_id = NULL,
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%test%product%' OR
    p.name ILIKE '%테스트%제품%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- 12-34. 인코딩 문제로 인해 제품 이름이 깨진 제품들
-- 인코딩 문제가 있는 제품은 NULL로 설정하여 수동 검토 필요
UPDATE products p
SET iso_code_id = NULL,
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    -- 한글이 깨진 것으로 보이는 패턴 (바이트 시퀀스 확인)
    p.name ~ '[^\x20-\x7E가-힣]' OR
    -- 특정 깨진 패턴들
    p.name LIKE '%%' OR
    p.name LIKE '%긴%' OR
    p.name LIKE '%Ʈ%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%';

-- =========================================================
-- [13] 기타 명확한 제품들
-- =========================================================

-- 13-1. 트래커 (LV트래커 등)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 13 21'  -- 컴퓨터 포인팅 장치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%트래커%' OR
    p.name ILIKE '%tracker%'
  );

-- 10-2. 세발기
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 06 03'  -- 보행 프레임
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%세발기%' OR
    p.name ILIKE '%트라이포드%' OR
    p.name ILIKE '%tripod%'
  );

-- =========================================================
-- [11] 검증: 수정 후 상태 확인
-- =========================================================

-- 11-1. 12 03 03에 남아있는 제품 수 확인
SELECT 
  COUNT(*) as remaining_count,
  COUNT(CASE WHEN p.name ILIKE '%지팡이%' OR p.name ILIKE '%cane%' OR p.name ILIKE '%stick%' THEN 1 END) as cane_count,
  COUNT(CASE WHEN p.name NOT ILIKE '%지팡이%' AND p.name NOT ILIKE '%cane%' AND p.name NOT ILIKE '%stick%' THEN 1 END) as non_cane_count
FROM products p
JOIN iso_codes ic ON p.iso_code_id = ic.id
WHERE ic.code = '12 03 03'
  AND ic.level = 3
  AND p.is_active = true;

-- 11-2. 여전히 잘못 배정된 제품 샘플 확인 (지팡이가 아닌 제품들)
-- 엄격한 기준: "지팡이", "cane", "stick" 키워드가 없는 모든 제품은 잘못 배정된 것으로 간주
SELECT 
  p.id,
  p.name,
  ic.code as iso_code
FROM products p
JOIN iso_codes ic ON p.iso_code_id = ic.id
WHERE ic.code = '12 03 03'
  AND ic.level = 3
  AND p.is_active = true
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%'
  AND p.name NOT ILIKE '%stick%'
  -- 추가로 명확히 지팡이가 아닌 키워드들
  AND (
    p.name ILIKE '%시트%' OR
    p.name ILIKE '%seat%' OR
    p.name ILIKE '%클러치%' OR
    p.name ILIKE '%clutch%' OR
    p.name ILIKE '%다빈치%' OR
    p.name ILIKE '%davinci%' OR
    p.name ILIKE '%뚜버기%' OR
    p.name ILIKE '%toobagi%' OR
    p.name ILIKE '%쿠션%' OR
    p.name ILIKE '%cushion%' OR
    p.name ILIKE '%방석%' OR
    p.name ILIKE '%로호%' OR
    p.name ILIKE '%roho%'
  )
ORDER BY p.name
LIMIT 50;

-- =========================================================
-- [12] 완료 메시지
-- =========================================================

DO $$
DECLARE
  v_total_count INTEGER;
  v_cane_count INTEGER;
  v_non_cane_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_count
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code = '12 03 03' AND p.is_active = true;
  
  SELECT COUNT(*) INTO v_cane_count
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code = '12 03 03' AND p.is_active = true
    AND (p.name ILIKE '%지팡이%' OR p.name ILIKE '%cane%' OR p.name ILIKE '%stick%');
  
  SELECT COUNT(*) INTO v_non_cane_count
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code = '12 03 03' AND p.is_active = true
    AND p.name NOT ILIKE '%지팡이%'
    AND p.name NOT ILIKE '%cane%'
    AND p.name NOT ILIKE '%stick%';
  
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '12 03 03 (지팡이) 제품 재배정 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '전체 제품 수: %', v_total_count;
  RAISE NOTICE '지팡이 제품 수: %', v_cane_count;
  RAISE NOTICE '잘못 배정된 제품 수 (남은 것): %', v_non_cane_count;
  RAISE NOTICE '=========================================================';
  IF v_non_cane_count > 0 THEN
    RAISE NOTICE '주의: 여전히 잘못 배정된 제품이 있습니다. 수동 검토가 필요합니다.';
  END IF;
  RAISE NOTICE '=========================================================';
END $$;
