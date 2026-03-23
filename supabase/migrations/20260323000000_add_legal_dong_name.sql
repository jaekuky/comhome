-- =============================================================
-- neighborhoods 테이블에 legal_dong_name 컬럼 추가
-- 국토교통부 API의 법정동 이름(umdNm)과 매칭하기 위한 컬럼
-- neighborhoods.name은 생활권/역세권 이름 (예: "이수", "낙성대")
-- legal_dong_name은 법정동 이름 (예: "사당동", "봉천동")
-- =============================================================

-- 1. 컬럼 추가
ALTER TABLE public.neighborhoods ADD COLUMN IF NOT EXISTS legal_dong_name text;

-- 2. 시드 데이터 동네 (seed_data.sql)
UPDATE public.neighborhoods SET legal_dong_name = '사당동'   WHERE id = 'b1000000-0000-0000-0000-000000000001'; -- 사당
UPDATE public.neighborhoods SET legal_dong_name = '봉천동'   WHERE id = 'b1000000-0000-0000-0000-000000000002'; -- 낙성대
UPDATE public.neighborhoods SET legal_dong_name = '신림동'   WHERE id = 'b1000000-0000-0000-0000-000000000003'; -- 신림
UPDATE public.neighborhoods SET legal_dong_name = '봉천동'   WHERE id = 'b1000000-0000-0000-0000-000000000004'; -- 봉천
UPDATE public.neighborhoods SET legal_dong_name = '사당동'   WHERE id = 'b1000000-0000-0000-0000-000000000005'; -- 이수
UPDATE public.neighborhoods SET legal_dong_name = '영통동'   WHERE id = 'b1000000-0000-0000-0000-000000000006'; -- 수원 영통
UPDATE public.neighborhoods SET legal_dong_name = '정자동'   WHERE id = 'b1000000-0000-0000-0000-000000000007'; -- 정자
UPDATE public.neighborhoods SET legal_dong_name = '금곡동'   WHERE id = 'b1000000-0000-0000-0000-000000000008'; -- 미금
UPDATE public.neighborhoods SET legal_dong_name = '당산동'   WHERE id = 'b1000000-0000-0000-0000-000000000009'; -- 당산
UPDATE public.neighborhoods SET legal_dong_name = '신도림동' WHERE id = 'b1000000-0000-0000-0000-000000000010'; -- 신도림
UPDATE public.neighborhoods SET legal_dong_name = '대림동'   WHERE id = 'b1000000-0000-0000-0000-000000000011'; -- 대림
UPDATE public.neighborhoods SET legal_dong_name = '충정로'   WHERE id = 'b1000000-0000-0000-0000-000000000012'; -- 충정로
UPDATE public.neighborhoods SET legal_dong_name = '공덕동'   WHERE id = 'b1000000-0000-0000-0000-000000000013'; -- 공덕
UPDATE public.neighborhoods SET legal_dong_name = '구로동'   WHERE id = 'b1000000-0000-0000-0000-000000000014'; -- 구로
UPDATE public.neighborhoods SET legal_dong_name = '신천동'   WHERE id = 'b1000000-0000-0000-0000-000000000015'; -- 잠실새내

-- 3. Priority 1 동네 (add_priority1_neighborhoods.sql)
UPDATE public.neighborhoods SET legal_dong_name = '창동'     WHERE id = 'd1000000-0000-0000-0000-000000000001'; -- 창동
UPDATE public.neighborhoods SET legal_dong_name = '수유동'   WHERE id = 'd1000000-0000-0000-0000-000000000002'; -- 수유
UPDATE public.neighborhoods SET legal_dong_name = '미아동'   WHERE id = 'd1000000-0000-0000-0000-000000000003'; -- 미아사거리
UPDATE public.neighborhoods SET legal_dong_name = '길음동'   WHERE id = 'd1000000-0000-0000-0000-000000000004'; -- 길음
UPDATE public.neighborhoods SET legal_dong_name = '마두동'   WHERE id = 'd1000000-0000-0000-0000-000000000005'; -- 일산 마두
UPDATE public.neighborhoods SET legal_dong_name = '백석동'   WHERE id = 'd1000000-0000-0000-0000-000000000006'; -- 일산 백석
UPDATE public.neighborhoods SET legal_dong_name = '화정동'   WHERE id = 'd1000000-0000-0000-0000-000000000007'; -- 화정
UPDATE public.neighborhoods SET legal_dong_name = '행신동'   WHERE id = 'd1000000-0000-0000-0000-000000000008'; -- 행신
UPDATE public.neighborhoods SET legal_dong_name = '부평동'   WHERE id = 'd1000000-0000-0000-0000-000000000009'; -- 인천 부평
UPDATE public.neighborhoods SET legal_dong_name = '구월동'   WHERE id = 'd1000000-0000-0000-0000-000000000010'; -- 인천 구월
UPDATE public.neighborhoods SET legal_dong_name = '주안동'   WHERE id = 'd1000000-0000-0000-0000-000000000011'; -- 인천 주안
UPDATE public.neighborhoods SET legal_dong_name = '상동'     WHERE id = 'd1000000-0000-0000-0000-000000000012'; -- 부천 상동
UPDATE public.neighborhoods SET legal_dong_name = '중동'     WHERE id = 'd1000000-0000-0000-0000-000000000013'; -- 부천 중동

-- 4. 경기 남부 동네 (add_gyeonggi_south_neighborhoods.sql)
UPDATE public.neighborhoods SET legal_dong_name = '동탄동'   WHERE name = '동탄1신도시';
UPDATE public.neighborhoods SET legal_dong_name = '동탄동'   WHERE name = '동탄2신도시';
UPDATE public.neighborhoods SET legal_dong_name = '세교동'   WHERE name = '오산 세교';
UPDATE public.neighborhoods SET legal_dong_name = '구갈동'   WHERE name = '용인 기흥';
UPDATE public.neighborhoods SET legal_dong_name = '망포동'   WHERE name = '수원 망포';
UPDATE public.neighborhoods SET legal_dong_name = '동화동'   WHERE name = '화성 봉담';
UPDATE public.neighborhoods SET legal_dong_name = '권선동'   WHERE name = '수원 권선';
UPDATE public.neighborhoods SET legal_dong_name = '소사동'   WHERE name = '평택 소사벌';

-- 5. 안산 지역 동네 (add_ansan_area_neighborhoods.sql)
UPDATE public.neighborhoods SET legal_dong_name = '고잔동'   WHERE name = '안산 고잔';
UPDATE public.neighborhoods SET legal_dong_name = '선부동'   WHERE name = '안산 선부';
UPDATE public.neighborhoods SET legal_dong_name = '초지동'   WHERE name = '안산 중앙';
UPDATE public.neighborhoods SET legal_dong_name = '산본동'   WHERE name = '군포 산본';
UPDATE public.neighborhoods SET legal_dong_name = '정왕동'   WHERE name = '시흥 정왕';
UPDATE public.neighborhoods SET legal_dong_name = '관양동'   WHERE name = '안양 평촌';

-- 6. 남양주·하남 동네 (add_namyangju_hanam_neighborhoods.sql)
UPDATE public.neighborhoods SET legal_dong_name = '별내동'   WHERE name = '남양주 별내';
UPDATE public.neighborhoods SET legal_dong_name = '다산동'   WHERE name = '남양주 다산';
UPDATE public.neighborhoods SET legal_dong_name = '갈매동'   WHERE name = '구리 갈매';
UPDATE public.neighborhoods SET legal_dong_name = '망월동'   WHERE name = '하남 미사';
UPDATE public.neighborhoods SET legal_dong_name = '감일동'   WHERE name = '하남 감일';

-- 7. 경기 동남부 동네 (add_gyeonggi_southeast_neighborhoods.sql)
UPDATE public.neighborhoods SET legal_dong_name = '중리동'   WHERE name = '이천 중리';
UPDATE public.neighborhoods SET legal_dong_name = '부발동'   WHERE name = '이천 부발';
UPDATE public.neighborhoods SET legal_dong_name = '신둔면'   WHERE name = '이천 신둔';
UPDATE public.neighborhoods SET legal_dong_name = '경안동'   WHERE name = '광주 경안';
UPDATE public.neighborhoods SET legal_dong_name = '초월읍'   WHERE name = '광주 초월';
UPDATE public.neighborhoods SET legal_dong_name = '태전동'   WHERE name = '광주 태전';
UPDATE public.neighborhoods SET legal_dong_name = '세종대왕면' WHERE name = '여주 세종';
UPDATE public.neighborhoods SET legal_dong_name = '점동면'   WHERE name = '여주 점동';
UPDATE public.neighborhoods SET legal_dong_name = '삼가동'   WHERE name = '용인 처인';
