-- Permitir que viewers (role SDR) possam INSERT/UPDATE/DELETE em sdr_metrics

-- INSERT
DROP POLICY IF EXISTS "Viewers can insert sdr_metrics" ON public.sdr_metrics;
CREATE POLICY "Viewers can insert sdr_metrics"
  ON public.sdr_metrics FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'viewer'::app_role));

-- UPDATE
DROP POLICY IF EXISTS "Viewers can update sdr_metrics" ON public.sdr_metrics;
CREATE POLICY "Viewers can update sdr_metrics"
  ON public.sdr_metrics FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'viewer'::app_role))
  WITH CHECK (has_role(auth.uid(), 'viewer'::app_role));

-- DELETE
DROP POLICY IF EXISTS "Viewers can delete sdr_metrics" ON public.sdr_metrics;
CREATE POLICY "Viewers can delete sdr_metrics"
  ON public.sdr_metrics FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'viewer'::app_role));
