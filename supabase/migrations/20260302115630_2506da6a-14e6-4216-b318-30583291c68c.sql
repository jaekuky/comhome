CREATE TABLE public.housing_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood_id uuid REFERENCES public.neighborhoods(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT '원룸',
  deposit integer NOT NULL DEFAULT 500,
  monthly_rent integer NOT NULL DEFAULT 45,
  area_sqm real NOT NULL DEFAULT 20.0,
  floor integer NOT NULL DEFAULT 3,
  distance_to_station integer NOT NULL DEFAULT 5,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.housing_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Housing listings are viewable by everyone"
  ON public.housing_listings
  FOR SELECT
  USING (true);