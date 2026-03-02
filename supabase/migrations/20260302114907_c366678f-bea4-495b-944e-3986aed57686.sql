
-- Create neighborhoods table
CREATE TABLE public.neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district text NOT NULL,
  city text NOT NULL DEFAULT '서울',
  avg_rent integer NOT NULL DEFAULT 50,
  latitude double precision,
  longitude double precision,
  transit_lines jsonb DEFAULT '[]'::jsonb,
  description text
);

ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Neighborhoods are viewable by everyone"
ON public.neighborhoods FOR SELECT
USING (true);

-- Create recommended_neighborhoods table
CREATE TABLE public.recommended_neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  neighborhood_id uuid REFERENCES public.neighborhoods(id) ON DELETE CASCADE NOT NULL,
  rank integer NOT NULL DEFAULT 1,
  commute_minutes integer NOT NULL,
  commute_route text,
  savings_amount integer NOT NULL DEFAULT 0
);

ALTER TABLE public.recommended_neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recommended neighborhoods are viewable by everyone"
ON public.recommended_neighborhoods FOR SELECT
USING (true);
