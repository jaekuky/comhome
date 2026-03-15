-- =============================================================
-- rent_stats 테이블 스키마 보완
-- 기존 테이블에 dong_name, base_ym, collected_at 컬럼 추가 및
-- uq_rent_stats_entry 제약 조건 추가
-- =============================================================

-- 1. 컬럼 추가 (없는 경우에만)
ALTER TABLE public.rent_stats
  ADD COLUMN IF NOT EXISTS dong_name    text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS base_ym      char(6)     NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS collected_at timestamptz DEFAULT now();

-- 2. housing_type CHECK 제약 보완
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'rent_stats'
      AND constraint_name = 'rent_stats_housing_type_check'
  ) THEN
    ALTER TABLE public.rent_stats
      ADD CONSTRAINT rent_stats_housing_type_check
        CHECK (housing_type IN ('villa', 'officetel', 'mixed'));
  END IF;
END$$;

-- 3. UNIQUE 제약 추가 (없는 경우에만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'rent_stats'
      AND constraint_name = 'uq_rent_stats_entry'
  ) THEN
    ALTER TABLE public.rent_stats
      ADD CONSTRAINT uq_rent_stats_entry
        UNIQUE (region_code, dong_name, housing_type, base_ym);
  END IF;
END$$;

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_rent_stats_region_ym
  ON public.rent_stats (region_code, base_ym);

CREATE INDEX IF NOT EXISTS idx_rent_stats_type
  ON public.rent_stats (housing_type, base_ym);
