
-- Create sdr_funnels table
CREATE TABLE public.sdr_funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sdr_id uuid NOT NULL REFERENCES public.sdrs(id) ON DELETE CASCADE,
  funnel_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(sdr_id, funnel_name)
);

-- Enable RLS
ALTER TABLE public.sdr_funnels ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins can manage sdr_funnels"
ON public.sdr_funnels FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Managers: full access for SDRs in their scope
CREATE POLICY "Managers can manage sdr_funnels"
ON public.sdr_funnels FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role) AND manager_can_access_sdr(auth.uid(), sdr_id))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) AND manager_can_access_sdr(auth.uid(), sdr_id));

-- Authenticated users: read-only
CREATE POLICY "Authenticated users can view sdr_funnels"
ON public.sdr_funnels FOR SELECT
USING (true);

-- Migrate existing funnels from sdr_metrics
INSERT INTO public.sdr_funnels (sdr_id, funnel_name)
SELECT DISTINCT sdr_id, funnel
FROM public.sdr_metrics
WHERE funnel IS NOT NULL AND funnel != ''
ON CONFLICT (sdr_id, funnel_name) DO NOTHING;
