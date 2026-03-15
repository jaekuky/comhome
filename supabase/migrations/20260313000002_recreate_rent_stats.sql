-- =============================================================
-- rent_stats 테이블 재생성
-- 기존 테이블(이전 스키마)을 삭제하고 현재 스키마로 재생성
-- 테이블이 비어있으므로 데이터 손실 없음
-- =============================================================

DROP TABLE IF EXISTS public.rent_stats CASCADE;

CREATE TABLE public.rent_stats (
  id            bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  region_code   char(5)       NOT NULL,   -- 법정동 코드 5자리 (LAWD_CD)
  dong_name     text          NOT NULL,   -- 법정동 이름
  housing_type  text          NOT NULL CHECK (housing_type IN ('villa', 'officetel', 'mixed')),
  base_ym       char(6)       NOT NULL,   -- 기준년월 YYYYMM
  avg_rent      numeric(10,2),            -- 평균 월세 (만원)
  median_rent   numeric(10,2),            -- 중앙값 월세 (만원)
  min_rent      numeric(10,2),            -- 최저 월세 (만원)
  max_rent      numeric(10,2),            -- 최고 월세 (만원)
  avg_deposit   numeric(10,2),            -- 평균 보증금 (만원)
  sample_count  int,                      -- 집계 건수
  collected_at  timestamptz   DEFAULT now(),

  CONSTRAINT uq_rent_stats_entry UNIQUE (region_code, dong_name, housing_type, base_ym)
);

CREATE INDEX idx_rent_stats_region_ym ON public.rent_stats (region_code, base_ym);
CREATE INDEX idx_rent_stats_type ON public.rent_stats (housing_type, base_ym);

COMMENT ON TABLE public.rent_stats IS
  '국토교통부 실거래가 API 기반 동 단위 1인 가구(20~33㎡) 임대료 통계';
