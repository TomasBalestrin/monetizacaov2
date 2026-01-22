-- Create SDRs table for SDR and Social Selling representatives
CREATE TABLE public.sdrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sdr', 'social_selling')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create SDR Metrics table for daily metrics
CREATE TABLE public.sdr_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sdr_id UUID NOT NULL REFERENCES public.sdrs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  activated INTEGER NOT NULL DEFAULT 0,
  scheduled INTEGER NOT NULL DEFAULT 0,
  scheduled_rate NUMERIC NOT NULL DEFAULT 0,
  confirmed INTEGER NOT NULL DEFAULT 0,
  attended INTEGER NOT NULL DEFAULT 0,
  attendance_rate NUMERIC NOT NULL DEFAULT 0,
  sales INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sdr_id, date)
);

-- Enable RLS on sdrs
ALTER TABLE public.sdrs ENABLE ROW LEVEL SECURITY;

-- SDRs policies
CREATE POLICY "Authenticated users can view sdrs"
  ON public.sdrs
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage sdrs"
  ON public.sdrs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Enable RLS on sdr_metrics
ALTER TABLE public.sdr_metrics ENABLE ROW LEVEL SECURITY;

-- SDR Metrics policies
CREATE POLICY "Authenticated users can view sdr_metrics"
  ON public.sdr_metrics
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage sdr_metrics"
  ON public.sdr_metrics
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create trigger for updated_at on sdrs
CREATE TRIGGER update_sdrs_updated_at
  BEFORE UPDATE ON public.sdrs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on sdr_metrics
CREATE TRIGGER update_sdr_metrics_updated_at
  BEFORE UPDATE ON public.sdr_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();