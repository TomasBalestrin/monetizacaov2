-- Add new columns to metrics table for Google Sheets data
ALTER TABLE public.metrics
ADD COLUMN IF NOT EXISTS revenue_trend numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS entries_trend numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellations integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_entries numeric DEFAULT 0;

-- Create google_sheets_config table
CREATE TABLE IF NOT EXISTS public.google_sheets_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spreadsheet_id text NOT NULL,
  spreadsheet_name text,
  last_sync_at timestamptz,
  sync_status text DEFAULT 'pending',
  sync_message text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_sheets_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_sheets_config
CREATE POLICY "Admins can manage sheets config"
ON public.google_sheets_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view sheets config"
ON public.google_sheets_config
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_google_sheets_config_updated_at
BEFORE UPDATE ON public.google_sheets_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();