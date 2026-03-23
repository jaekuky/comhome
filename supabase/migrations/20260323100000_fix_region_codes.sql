-- =============================================================
-- region_code(LAWD_CD) 전면 수정
-- 기존 마이그레이션(20260321000000)의 경기도 코드가 대부분 잘못됨
-- 공공데이터포털 실거래가 API 공식 법정동코드 기준으로 전면 재설정
-- 참조: https://apt-info.github.io/프로그래밍/5/
-- =============================================================

-- 1. 기존 경기도 region_code 전체 초기화 (잘못된 코드 제거)
UPDATE public.neighborhoods SET region_code = NULL WHERE city IN ('경기', '인천');

-- 2. 서울 누락 구역 추가
UPDATE public.neighborhoods SET region_code = '11290' WHERE district = '성북구';
UPDATE public.neighborhoods SET region_code = '11305' WHERE district = '강북구';
UPDATE public.neighborhoods SET region_code = '11320' WHERE district = '도봉구';

-- 3. 인천 추가
UPDATE public.neighborhoods SET region_code = '28177' WHERE district = '미추홀구';
UPDATE public.neighborhoods SET region_code = '28200' WHERE district = '남동구';
UPDATE public.neighborhoods SET region_code = '28237' WHERE district = '부평구';

-- 4. 경기도 — 수원시 (41110)
UPDATE public.neighborhoods SET region_code = '41113' WHERE district = '권선구';
UPDATE public.neighborhoods SET region_code = '41117' WHERE district = '영통구';

-- 5. 경기도 — 성남시 (41130)
UPDATE public.neighborhoods SET region_code = '41131' WHERE district = '수정구';
UPDATE public.neighborhoods SET region_code = '41133' WHERE district = '중원구';
UPDATE public.neighborhoods SET region_code = '41135' WHERE district = '분당구';

-- 6. 경기도 — 의정부시
UPDATE public.neighborhoods SET region_code = '41150' WHERE district = '의정부시';

-- 7. 경기도 — 안양시 (41170)
UPDATE public.neighborhoods SET region_code = '41171' WHERE district = '만안구';
UPDATE public.neighborhoods SET region_code = '41173' WHERE district = '동안구';

-- 8. 경기도 — 부천시 (구 폐지)
UPDATE public.neighborhoods SET region_code = '41190' WHERE district = '원미구';

-- 9. 경기도 — 광명시
UPDATE public.neighborhoods SET region_code = '41210' WHERE district = '광명시';

-- 10. 경기도 — 평택시
UPDATE public.neighborhoods SET region_code = '41220' WHERE district = '평택시';

-- 11. 경기도 — 안산시 (41270)
UPDATE public.neighborhoods SET region_code = '41271' WHERE district = '상록구';
UPDATE public.neighborhoods SET region_code = '41273' WHERE district = '단원구';

-- 12. 경기도 — 고양시 (41280)
UPDATE public.neighborhoods SET region_code = '41281' WHERE district = '덕양구';
UPDATE public.neighborhoods SET region_code = '41285' WHERE district = '일산동구';

-- 13. 경기도 — 구리시
UPDATE public.neighborhoods SET region_code = '41310' WHERE district = '구리시';

-- 14. 경기도 — 남양주시 (district 값이 '별내면', '다산동' 등이므로 name으로 매칭)
UPDATE public.neighborhoods SET region_code = '41360' WHERE district = '남양주시';
UPDATE public.neighborhoods SET region_code = '41360' WHERE name LIKE '남양주%';

-- 15. 경기도 — 오산시
UPDATE public.neighborhoods SET region_code = '41370' WHERE district = '오산시';

-- 16. 경기도 — 시흥시
UPDATE public.neighborhoods SET region_code = '41390' WHERE district = '시흥시';

-- 17. 경기도 — 군포시
UPDATE public.neighborhoods SET region_code = '41410' WHERE district = '군포시';

-- 18. 경기도 — 의왕시
UPDATE public.neighborhoods SET region_code = '41430' WHERE district = '의왕시';

-- 19. 경기도 — 하남시 (district 값이 '미사동', '감일동'이므로 name으로 매칭)
UPDATE public.neighborhoods SET region_code = '41450' WHERE district = '하남시';
UPDATE public.neighborhoods SET region_code = '41450' WHERE name LIKE '하남%';

-- 20. 경기도 — 용인시 (41460)
UPDATE public.neighborhoods SET region_code = '41461' WHERE district = '처인구';
UPDATE public.neighborhoods SET region_code = '41463' WHERE district = '기흥구';
UPDATE public.neighborhoods SET region_code = '41465' WHERE district = '수지구';

-- 21. 경기도 — 이천시
UPDATE public.neighborhoods SET region_code = '41500' WHERE district = '이천시';

-- 22. 경기도 — 화성시
UPDATE public.neighborhoods SET region_code = '41590' WHERE district = '화성시';

-- 23. 경기도 — 광주시 (경기)
UPDATE public.neighborhoods SET region_code = '41610' WHERE district = '광주시';

-- 24. 경기도 — 여주시
UPDATE public.neighborhoods SET region_code = '41670' WHERE district = '여주시';

-- 25. 구리시 — district가 '갈매동'인 경우 name으로 매칭
UPDATE public.neighborhoods SET region_code = '41310' WHERE name = '구리 갈매';
