CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are viewable by everyone"
  ON public.companies
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_companies_name_trgm ON public.companies USING gin(name gin_trgm_ops);
CREATE INDEX idx_companies_address_trgm ON public.companies USING gin(address gin_trgm_ops);