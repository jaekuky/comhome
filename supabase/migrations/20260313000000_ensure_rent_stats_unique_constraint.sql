-- =============================================================
-- rent_stats UNIQUE 제약 조건 확실히 적용
-- ON CONFLICT (region_code, dong_name, housing_type, base_ym)
-- UPSERT를 위해 반드시 필요
-- =============================================================

-- 기존 제약이 없을 경우에만 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'rent_stats'
      AND constraint_name = 'uq_rent_stats_entry'
  ) THEN
    ALTER TABLE public.rent_stats
      ADD CONSTRAINT uq_rent_stats_entry
        UNIQUE (region_code, dong_name, housing_type, base_ym);
  END IF;
END$$;

-- 조회 최적화 인덱스 (없으면 생성)
CREATE INDEX IF NOT EXISTS idx_rent_stats_region_ym
  ON public.rent_stats (region_code, base_ym);

CREATE INDEX IF NOT EXISTS idx_rent_stats_type
  ON public.rent_stats (housing_type, base_ym);
