-- =============================================================
-- rent_stats 컬럼 타입 수정: integer → numeric(10,2)
-- 기존 테이블이 integer로 생성된 경우 소수점 임대료 저장을 위해 변경
-- =============================================================

ALTER TABLE public.rent_stats
  ALTER COLUMN avg_rent    TYPE numeric(10,2) USING avg_rent::numeric,
  ALTER COLUMN median_rent TYPE numeric(10,2) USING median_rent::numeric,
  ALTER COLUMN min_rent    TYPE numeric(10,2) USING min_rent::numeric,
  ALTER COLUMN max_rent    TYPE numeric(10,2) USING max_rent::numeric,
  ALTER COLUMN avg_deposit TYPE numeric(10,2) USING avg_deposit::numeric;
