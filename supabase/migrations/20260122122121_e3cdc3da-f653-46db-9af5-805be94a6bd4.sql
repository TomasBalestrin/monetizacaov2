-- Rename confirmed to scheduled_same_day in sdr_metrics
ALTER TABLE public.sdr_metrics 
RENAME COLUMN confirmed TO scheduled_same_day;

-- Create configuration table for SDR Google Sheets
CREATE TABLE public.sdr_sheets_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spreadsheet_id TEXT NOT NULL,
  spreadsheet_name TEXT,
  row_mapping JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  sync_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sdr_sheets_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage sdr_sheets_config"
  ON public.sdr_sheets_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view sdr_sheets_config"
  ON public.sdr_sheets_config FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role));

-- Add unique constraint for upsert on sdr_metrics
ALTER TABLE public.sdr_metrics 
ADD CONSTRAINT sdr_metrics_sdr_id_date_unique UNIQUE (sdr_id, date);