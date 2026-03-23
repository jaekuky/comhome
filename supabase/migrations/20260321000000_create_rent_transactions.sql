-- =============================================================
-- rent_transactions: 국토교통부 실거래가 개별 거래 레코드
-- 기존 housing_listings(더미)를 대체하는 실데이터 테이블
-- =============================================================

-- 1. rent_transactions 테이블 생성
CREATE TABLE IF NOT EXISTS public.rent_transactions (
  id              bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  region_code     char(5)       NOT NULL,   -- 법정동 코드 5자리 (LAWD_CD)
  dong_name       text          NOT NULL,   -- 법정동 이름
  housing_type    text          NOT NULL CHECK (housing_type IN ('villa', 'officetel')),
  building_name   text,                     -- 건물명 (연립다세대명/오피스텔명)
  area_sqm        real          NOT NULL,   -- 전용면적 (㎡)
  floor           int,                      -- 층수
  deposit         int           NOT NULL,   -- 보증금 (만원)
  monthly_rent    int           NOT NULL,   -- 월세 (만원)
  build_year      int,                      -- 건축년도
  deal_date       date          NOT NULL,   -- 계약일 (YYYY-MM-DD)
  base_ym         char(6)       NOT NULL,   -- 조회 기준년월 YYYYMM
  contract_type   text,                     -- 신규/갱신 구분
  collected_at    timestamptz   DEFAULT now(),

  CONSTRAINT uq_rent_transaction UNIQUE (
    region_code, dong_name, housing_type, building_name,
    area_sqm, floor, deposit, monthly_rent, deal_date
  )
);

-- 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_rent_tx_region ON public.rent_transactions (region_code, base_ym);
CREATE INDEX IF NOT EXISTS idx_rent_tx_dong ON public.rent_transactions (dong_name, base_ym);
CREATE INDEX IF NOT EXISTS idx_rent_tx_deal_date ON public.rent_transactions (deal_date DESC);

-- RLS 정책 (anon 읽기 허용)
ALTER TABLE public.rent_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rent_transactions_read" ON public.rent_transactions
  FOR SELECT TO anon, authenticated USING (true);

COMMENT ON TABLE public.rent_transactions IS
  '국토교통부 실거래가 API 기반 개별 전월세 거래 레코드 (1인 가구, 20~33㎡)';

-- 2. neighborhoods 테이블에 region_code 컬럼 추가
ALTER TABLE public.neighborhoods
  ADD COLUMN IF NOT EXISTS region_code char(5);

-- 기존 동네 데이터에 region_code 매핑
-- 서울
UPDATE public.neighborhoods SET region_code = '11590' WHERE district = '동작구';
UPDATE public.neighborhoods SET region_code = '11620' WHERE district = '관악구';
UPDATE public.neighborhoods SET region_code = '11530' WHERE district = '구로구';
UPDATE public.neighborhoods SET region_code = '11560' WHERE district = '영등포구';
UPDATE public.neighborhoods SET region_code = '11410' WHERE district = '서대문구';
UPDATE public.neighborhoods SET region_code = '11440' WHERE district = '마포구';
UPDATE public.neighborhoods SET region_code = '11710' WHERE district = '송파구';
UPDATE public.neighborhoods SET region_code = '11650' WHERE district = '서초구';
UPDATE public.neighborhoods SET region_code = '11680' WHERE district = '강남구';
UPDATE public.neighborhoods SET region_code = '11140' WHERE district = '중구';
UPDATE public.neighborhoods SET region_code = '11170' WHERE district = '용산구';
UPDATE public.neighborhoods SET region_code = '11200' WHERE district = '성동구';
UPDATE public.neighborhoods SET region_code = '11215' WHERE district = '광진구';
UPDATE public.neighborhoods SET region_code = '11260' WHERE district = '중랑구';
UPDATE public.neighborhoods SET region_code = '11350' WHERE district = '노원구';
UPDATE public.neighborhoods SET region_code = '11500' WHERE district = '강서구';
UPDATE public.neighborhoods SET region_code = '11545' WHERE district = '금천구';
UPDATE public.neighborhoods SET region_code = '11740' WHERE district = '강동구';

-- 경기도
UPDATE public.neighborhoods SET region_code = '41131' WHERE district = '분당구';
UPDATE public.neighborhoods SET region_code = '41135' WHERE district = '영통구';
UPDATE public.neighborhoods SET region_code = '41111' WHERE district = '수정구';
UPDATE public.neighborhoods SET region_code = '41113' WHERE district = '중원구';
UPDATE public.neighborhoods SET region_code = '41117' WHERE district = '기흥구';
UPDATE public.neighborhoods SET region_code = '41115' WHERE district = '수지구';
UPDATE public.neighborhoods SET region_code = '41133' WHERE district = '권선구';
UPDATE public.neighborhoods SET region_code = '41273' WHERE district = '처인구';
UPDATE public.neighborhoods SET region_code = '41830' WHERE district = '화성시';
UPDATE public.neighborhoods SET region_code = '41370' WHERE district = '오산시';
UPDATE public.neighborhoods SET region_code = '41220' WHERE district = '평택시';
UPDATE public.neighborhoods SET region_code = '41360' WHERE district = '군포시';
UPDATE public.neighborhoods SET region_code = '41390' WHERE district = '의왕시';
UPDATE public.neighborhoods SET region_code = '41210' WHERE district = '안양시';
UPDATE public.neighborhoods SET region_code = '41285' WHERE district = '상현동';
UPDATE public.neighborhoods SET region_code = '41461' WHERE district = '만안구';
UPDATE public.neighborhoods SET region_code = '41463' WHERE district = '동안구';
UPDATE public.neighborhoods SET region_code = '41590' WHERE district = '남양주시';
UPDATE public.neighborhoods SET region_code = '41570' WHERE district = '하남시';
UPDATE public.neighborhoods SET region_code = '41480' WHERE district = '의정부시';
UPDATE public.neighborhoods SET region_code = '41250' WHERE district = '광명시';

CREATE INDEX IF NOT EXISTS idx_neighborhoods_region_code ON public.neighborhoods (region_code);
