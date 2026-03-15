-- =============================================================
-- rent_stats: UNIQUE INDEX 직접 생성
-- Supabase JS onConflict 동작을 위해 unique index 필요
-- =============================================================

-- UNIQUE CONSTRAINT 제거 후 UNIQUE INDEX로 교체 (동일 효과, 더 명시적)
DO $$
BEGIN
  -- 기존 제약 조건이 있으면 제거하고 인덱스로 재생성
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'rent_stats'
      AND constraint_name = 'uq_rent_stats_entry'
  ) THEN
    ALTER TABLE public.rent_stats DROP CONSTRAINT uq_rent_stats_entry;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_rent_stats_entry
  ON public.rent_stats (region_code, dong_name, housing_type, base_ym);
