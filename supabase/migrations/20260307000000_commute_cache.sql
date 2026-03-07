-- =============================================================
-- commute_cache: ODsay API 응답 캐시 테이블
-- =============================================================

-- 좌표 정규화 헬퍼 함수 (소수점 4자리 반올림)
CREATE OR REPLACE FUNCTION public.round_coord(val double precision)
RETURNS numeric(9,4)
LANGUAGE sql IMMUTABLE STRICT
AS $$
  SELECT ROUND(val::numeric, 4);
$$;

-- 캐시 테이블
CREATE TABLE public.commute_cache (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_lat  numeric(9,4) NOT NULL,
  company_lng  numeric(9,4) NOT NULL,
  neighborhood_id uuid NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
  commute_minutes  integer NOT NULL,
  route_summary    text NOT NULL DEFAULT '',
  transfer_count   integer NOT NULL DEFAULT 0,
  walk_minutes     integer NOT NULL DEFAULT 0,
  total_fare       integer NOT NULL DEFAULT 0,
  cached_at        timestamptz NOT NULL DEFAULT now(),
  api_provider     text NOT NULL DEFAULT 'odsay',

  CONSTRAINT commute_cache_unique_route
    UNIQUE (company_lat, company_lng, neighborhood_id)
);

CREATE INDEX commute_cache_lookup_idx
  ON public.commute_cache (company_lat, company_lng, neighborhood_id, cached_at DESC);

ALTER TABLE public.commute_cache ENABLE ROW LEVEL SECURITY;

-- Edge Function은 service_role 키로 접근하므로 RLS 우회됨.
-- 프론트엔드 직접 조회가 필요한 경우 아래 정책 추가.
CREATE POLICY "commute_cache_select"
  ON public.commute_cache FOR SELECT
  USING (true);
