-- =============================================================
-- legal_dong_name 매칭 오류 수정
-- rent_transactions.dong_name과 LIKE 매칭이 안 되는 3건 수정
-- =============================================================

-- 1. 이천 부발: "부발동" → "부발읍"
--    MOLIT API에서 "부발읍 무촌리", "부발읍 신하리" 등으로 표기
--    LIKE '부발읍%' 으로 매칭되도록 변경
UPDATE public.neighborhoods
SET legal_dong_name = '부발읍'
WHERE name = '이천 부발';

-- 2. 평택 소사벌: "소사동" → "비전동"
--    MOLIT API에 소사동 데이터 없음, 소사벌 지역 실질적 법정동은 비전동
UPDATE public.neighborhoods
SET legal_dong_name = '비전동'
WHERE name = '평택 소사벌';

-- 3. 안산 중앙: 초지동은 단원구(41273)에 속함
--    기존: district='상록구', region_code='41271'
--    수정: district='단원구', region_code='41273'
UPDATE public.neighborhoods
SET district = '단원구',
    region_code = '41273'
WHERE name = '안산 중앙';
