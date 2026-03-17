-- Garantir que viewers (role SDR) possam ler todos os dados necessários
-- Recria as políticas de SELECT com USING (true) caso tenham sido removidas

-- METRICS
DROP POLICY IF EXISTS "Authenticated users can view metrics" ON public.metrics;
CREATE POLICY "Authenticated users can view metrics"
  ON public.metrics FOR SELECT
  TO authenticated
  USING (true);

-- CLOSERS
DROP POLICY IF EXISTS "Authenticated users can view closers" ON public.closers;
CREATE POLICY "Authenticated users can view closers"
  ON public.closers FOR SELECT
  TO authenticated
  USING (true);

-- SDRS
DROP POLICY IF EXISTS "Authenticated users can view sdrs" ON public.sdrs;
CREATE POLICY "Authenticated users can view sdrs"
  ON public.sdrs FOR SELECT
  TO authenticated
  USING (true);

-- SQUADS
DROP POLICY IF EXISTS "Authenticated users can view squads" ON public.squads;
CREATE POLICY "Authenticated users can view squads"
  ON public.squads FOR SELECT
  TO authenticated
  USING (true);

-- SDR_METRICS
DROP POLICY IF EXISTS "Authenticated users can view sdr_metrics" ON public.sdr_metrics;
CREATE POLICY "Authenticated users can view sdr_metrics"
  ON public.sdr_metrics FOR SELECT
  TO authenticated
  USING (true);

-- FUNNELS
DROP POLICY IF EXISTS "Authenticated users can view funnels" ON public.funnels;
CREATE POLICY "Authenticated users can view funnels"
  ON public.funnels FOR SELECT
  TO authenticated
  USING (true);

-- PRODUCTS
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

-- GOALS
DROP POLICY IF EXISTS "Authenticated users can view goals" ON public.goals;
CREATE POLICY "Authenticated users can view goals"
  ON public.goals FOR SELECT
  TO authenticated
  USING (true);
