-- Create squad_sheets_config table for per-squad Google Sheets configuration
CREATE TABLE public.squad_sheets_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  spreadsheet_id TEXT NOT NULL,
  spreadsheet_name TEXT,
  row_mapping JSONB DEFAULT '{"column": "H", "firstBlockStartRow": 5, "blockOffset": 13, "numberOfBlocks": 4, "dateRow": 1, "metrics": {"calls": 0, "sales": 1, "revenue": 3, "entries": 4, "revenueTrend": 5, "entriesTrend": 6, "cancellations": 7, "cancellationValue": 9, "cancellationEntries": 10}}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  sync_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(squad_id)
);

-- Enable RLS
ALTER TABLE public.squad_sheets_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins and managers can manage squad sheets config"
  ON public.squad_sheets_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated users can view squad sheets config"
  ON public.squad_sheets_config
  FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_squad_sheets_config_updated_at
  BEFORE UPDATE ON public.squad_sheets_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();