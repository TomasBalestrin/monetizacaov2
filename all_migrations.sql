-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'viewer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  UNIQUE (user_id, role)
);

-- Create module_permissions table for granular access control
CREATE TABLE public.module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

-- Create squads table
CREATE TABLE public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create closers table
CREATE TABLE public.closers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  squad_id UUID REFERENCES public.squads(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create metrics table
CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closer_id UUID REFERENCES public.closers(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  sales INTEGER NOT NULL DEFAULT 0,
  revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
  entries DECIMAL(15,2) NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'manual', -- 'manual' or 'sheets'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (closer_id, period_start, period_end)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check module permission
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id UUID, _module TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.module_permissions
    WHERE user_id = _user_id
      AND module = _module
  )
$$;

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for module_permissions
CREATE POLICY "Users can view their own permissions"
  ON public.module_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all permissions"
  ON public.module_permissions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage permissions"
  ON public.module_permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for squads (viewable by authenticated users)
CREATE POLICY "Authenticated users can view squads"
  ON public.squads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage squads"
  ON public.squads FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for closers
CREATE POLICY "Authenticated users can view closers"
  ON public.closers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage closers"
  ON public.closers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- RLS Policies for metrics
CREATE POLICY "Authenticated users can view metrics"
  ON public.metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage metrics"
  ON public.metrics FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_squads_updated_at
  BEFORE UPDATE ON public.squads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_closers_updated_at
  BEFORE UPDATE ON public.closers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at
  BEFORE UPDATE ON public.metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default squads
INSERT INTO public.squads (name, slug) VALUES
  ('Eagles', 'eagles'),
  ('Alcateia', 'alcateia'),
  ('Sharks', 'sharks');

-- Insert default closers for Eagles
INSERT INTO public.closers (name, squad_id) VALUES
  ('Deyvid', (SELECT id FROM public.squads WHERE slug = 'eagles')),
  ('Hannah', (SELECT id FROM public.squads WHERE slug = 'eagles')),
  ('Carlos', (SELECT id FROM public.squads WHERE slug = 'eagles'));

-- Insert default closers for Alcateia
INSERT INTO public.closers (name, squad_id) VALUES
  ('Isis', (SELECT id FROM public.squads WHERE slug = 'alcateia')),
  ('Tainara', (SELECT id FROM public.squads WHERE slug = 'alcateia')),
  ('Gisele', (SELECT id FROM public.squads WHERE slug = 'alcateia'));

-- Insert default closers for Sharks
INSERT INTO public.closers (name, squad_id) VALUES
  ('Leandro', (SELECT id FROM public.squads WHERE slug = 'sharks'));-- Fix function search path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;-- Primeiro, adicionar constraint unique se não existir
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Atribuir role de admin ao usuário tomasbalestrin
INSERT INTO user_roles (user_id, role)
VALUES ('9797f0f7-de08-4df0-86fe-2751adb84918', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Criar função para auto-assign de role padrão para novos usuários
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'viewer')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Criar trigger para executar após inserção de novo perfil
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON profiles;
CREATE TRIGGER on_profile_created_assign_role
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_role();-- Add new columns to metrics table for Google Sheets data
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
EXECUTE FUNCTION public.update_updated_at_column();-- Add unique constraint for upsert on metrics
ALTER TABLE public.metrics 
ADD CONSTRAINT metrics_closer_period_unique 
UNIQUE (closer_id, period_start, period_end);-- Add row_mapping column to google_sheets_config table
ALTER TABLE google_sheets_config
ADD COLUMN row_mapping jsonb DEFAULT '{
  "calls": 7,
  "revenue": 10,
  "entries": 11,
  "revenueTrend": 12,
  "entriesTrend": 13,
  "sales": 14,
  "cancellations": 15,
  "cancellationValue": 16,
  "cancellationEntries": 17
}'::jsonb;-- Deletar métricas de closers que serão removidos
DELETE FROM metrics 
WHERE closer_id IN (
  SELECT id FROM closers 
  WHERE name IN (
    'DEYVID', 'CARLOS ', 'HANNAH',
    'SDR - CLARA', 'SDR - DIENI', 'SDR - JAQUE', 'SDR - NATHI', 'SDR - THALI',
    'TOTAL SQUAD EAGLE', 'TOTAL SQUAD ALCATEIA', 'TOTAL SQUAD LEANDRO.', 
    'TOTAL CLOSER COMERCIAL', 'ASCENÇÃO CS'
  )
);

-- Deletar closers incorretos (duplicatas, SDRs e totais)
DELETE FROM closers 
WHERE name IN (
  'DEYVID', 'CARLOS ', 'HANNAH',
  'SDR - CLARA', 'SDR - DIENI', 'SDR - JAQUE', 'SDR - NATHI', 'SDR - THALI',
  'TOTAL SQUAD EAGLE', 'TOTAL SQUAD ALCATEIA', 'TOTAL SQUAD LEANDRO.', 
  'TOTAL CLOSER COMERCIAL', 'ASCENÇÃO CS'
);-- Create SDRs table for SDR and Social Selling representatives
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
  EXECUTE FUNCTION public.update_updated_at_column();-- Rename confirmed to scheduled_same_day in sdr_metrics
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
ADD CONSTRAINT sdr_metrics_sdr_id_date_unique UNIQUE (sdr_id, date);-- Adicionar coluna funnel para identificar origem das métricas
ALTER TABLE sdr_metrics ADD COLUMN funnel TEXT;

-- Remover constraint antiga se existir
ALTER TABLE sdr_metrics DROP CONSTRAINT IF EXISTS sdr_metrics_sdr_id_date_key;

-- Criar nova constraint única incluindo funil
ALTER TABLE sdr_metrics ADD CONSTRAINT sdr_metrics_sdr_id_date_funnel_key UNIQUE (sdr_id, date, funnel);

-- Criar índice para consultas por funil
CREATE INDEX IF NOT EXISTS idx_sdr_metrics_funnel ON sdr_metrics (funnel);-- Remover a constraint antiga que impede múltiplos funis por data
ALTER TABLE sdr_metrics 
DROP CONSTRAINT IF EXISTS sdr_metrics_sdr_id_date_unique;-- Remover registros antigos que não têm funil identificado
-- Esses dados são redundantes pois foram re-importados com o nome do funil
DELETE FROM sdr_metrics WHERE funnel IS NULL;-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage to postgres user for cron
GRANT USAGE ON SCHEMA cron TO postgres;

-- Enable realtime for metrics tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sdr_metrics;-- Habilitar realtime para tabelas de configuração de sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.google_sheets_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sdr_sheets_config;

-- Permitir que usuários autenticados vejam status de sync (para realtime funcionar)
CREATE POLICY "Authenticated users can view sync status"
  ON public.google_sheets_config FOR SELECT
  TO authenticated
  USING (true);-- Create squad_sheets_config table for per-squad Google Sheets configuration
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
  EXECUTE FUNCTION public.update_updated_at_column();-- 1) Update existing squad_sheets_config for alcateia and sharks to use blockOffset: 12
UPDATE public.squad_sheets_config c
SET row_mapping = jsonb_set(c.row_mapping, '{blockOffset}', '12'::jsonb, true),
    updated_at = now()
FROM public.squads s
WHERE c.squad_id = s.id
  AND s.slug IN ('alcateia', 'sharks');

-- 2) Update default value for row_mapping column to use blockOffset: 12
ALTER TABLE public.squad_sheets_config
ALTER COLUMN row_mapping
SET DEFAULT '{"column":"H","firstBlockStartRow":5,"blockOffset":12,"numberOfBlocks":4,"dateRow":1,"metrics":{"calls":0,"sales":1,"revenue":3,"entries":4,"revenueTrend":5,"entriesTrend":6,"cancellations":7,"cancellationValue":9,"cancellationEntries":10}}'::jsonb;-- Tabela para vincular usuários a Closers ou SDRs
CREATE TABLE public.user_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('closer', 'sdr')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- Índices para performance
CREATE INDEX idx_user_entity_links_user ON public.user_entity_links(user_id);
CREATE INDEX idx_user_entity_links_entity ON public.user_entity_links(entity_type, entity_id);

-- Habilitar RLS
ALTER TABLE public.user_entity_links ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem gerenciar todos os vínculos
CREATE POLICY "Admins can manage entity links"
  ON public.user_entity_links FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Política: Usuários podem ver seus próprios vínculos
CREATE POLICY "Users can view their own links"
  ON public.user_entity_links FOR SELECT
  USING (user_id = auth.uid());-- Add created_by column to metrics table
ALTER TABLE public.metrics 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add created_by column to sdr_metrics table
ALTER TABLE public.sdr_metrics 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Drop existing policies for metrics
DROP POLICY IF EXISTS "Admins and managers can manage metrics" ON public.metrics;
DROP POLICY IF EXISTS "Authenticated users can view metrics" ON public.metrics;

-- Create new RLS policies for metrics
-- Admins can do everything
CREATE POLICY "Admins can manage all metrics"
ON public.metrics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Managers can do everything
CREATE POLICY "Managers can manage all metrics"
ON public.metrics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- All authenticated users can view metrics
CREATE POLICY "Authenticated users can view metrics"
ON public.metrics
FOR SELECT
TO authenticated
USING (true);

-- Users can update their own metrics
CREATE POLICY "Users can update their own metrics"
ON public.metrics
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Users can delete their own metrics
CREATE POLICY "Users can delete their own metrics"
ON public.metrics
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Users can insert metrics (will be linked to them)
CREATE POLICY "Users can insert metrics"
ON public.metrics
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Drop existing policies for sdr_metrics
DROP POLICY IF EXISTS "Admins and managers can manage sdr_metrics" ON public.sdr_metrics;
DROP POLICY IF EXISTS "Authenticated users can view sdr_metrics" ON public.sdr_metrics;

-- Create new RLS policies for sdr_metrics
-- Admins can do everything
CREATE POLICY "Admins can manage all sdr_metrics"
ON public.sdr_metrics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Managers can do everything
CREATE POLICY "Managers can manage all sdr_metrics"
ON public.sdr_metrics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- All authenticated users can view sdr_metrics
CREATE POLICY "Authenticated users can view sdr_metrics"
ON public.sdr_metrics
FOR SELECT
TO authenticated
USING (true);

-- Users can update their own sdr_metrics
CREATE POLICY "Users can update their own sdr_metrics"
ON public.sdr_metrics
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Users can delete their own sdr_metrics
CREATE POLICY "Users can delete their own sdr_metrics"
ON public.sdr_metrics
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Users can insert sdr_metrics (will be linked to them)
CREATE POLICY "Users can insert sdr_metrics"
ON public.sdr_metrics
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());-- Create a function to check if a user is linked to a specific entity
CREATE OR REPLACE FUNCTION public.is_linked_to_entity(_user_id uuid, _entity_type text, _entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_entity_links
    WHERE user_id = _user_id
      AND entity_type = _entity_type
      AND entity_id = _entity_id
  )
$$;

-- Drop existing sdr_metrics policies to recreate with entity linking
DROP POLICY IF EXISTS "Admins can manage all sdr_metrics" ON public.sdr_metrics;
DROP POLICY IF EXISTS "Managers can manage all sdr_metrics" ON public.sdr_metrics;
DROP POLICY IF EXISTS "Authenticated users can view sdr_metrics" ON public.sdr_metrics;
DROP POLICY IF EXISTS "Users can update their own sdr_metrics" ON public.sdr_metrics;
DROP POLICY IF EXISTS "Users can delete their own sdr_metrics" ON public.sdr_metrics;
DROP POLICY IF EXISTS "Users can insert sdr_metrics" ON public.sdr_metrics;

-- Recreate policies with proper entity linking logic

-- Admins can do everything
CREATE POLICY "Admins can manage all sdr_metrics"
ON public.sdr_metrics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Managers can do everything
CREATE POLICY "Managers can manage all sdr_metrics"
ON public.sdr_metrics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- All authenticated users can view sdr_metrics
CREATE POLICY "Authenticated users can view sdr_metrics"
ON public.sdr_metrics
FOR SELECT
TO authenticated
USING (true);

-- Users can insert metrics for SDRs they are linked to
CREATE POLICY "Users can insert sdr_metrics for linked SDRs"
ON public.sdr_metrics
FOR INSERT
TO authenticated
WITH CHECK (
  is_linked_to_entity(auth.uid(), 'sdr', sdr_id) 
  AND created_by = auth.uid()
);

-- Users can update metrics for SDRs they are linked to (and they created)
CREATE POLICY "Users can update sdr_metrics for linked SDRs"
ON public.sdr_metrics
FOR UPDATE
TO authenticated
USING (
  is_linked_to_entity(auth.uid(), 'sdr', sdr_id) 
  AND created_by = auth.uid()
)
WITH CHECK (
  is_linked_to_entity(auth.uid(), 'sdr', sdr_id) 
  AND created_by = auth.uid()
);

-- Users can delete metrics for SDRs they are linked to (and they created)
CREATE POLICY "Users can delete sdr_metrics for linked SDRs"
ON public.sdr_metrics
FOR DELETE
TO authenticated
USING (
  is_linked_to_entity(auth.uid(), 'sdr', sdr_id) 
  AND created_by = auth.uid()
);-- Drop existing INSERT policy that requires entity link
DROP POLICY IF EXISTS "Users can insert sdr_metrics for linked SDRs" ON public.sdr_metrics;

-- Create a simpler INSERT policy that allows any authenticated user to insert
-- as long as they set created_by to their own user id
CREATE POLICY "Users can insert sdr_metrics" 
ON public.sdr_metrics 
FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Also fix the UPDATE and DELETE policies to be less restrictive
-- Users should be able to update/delete their own records without needing entity link
DROP POLICY IF EXISTS "Users can update sdr_metrics for linked SDRs" ON public.sdr_metrics;
DROP POLICY IF EXISTS "Users can delete sdr_metrics for linked SDRs" ON public.sdr_metrics;

-- Users can update their own records
CREATE POLICY "Users can update their own sdr_metrics" 
ON public.sdr_metrics 
FOR UPDATE 
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Users can delete their own records
CREATE POLICY "Users can delete their own sdr_metrics" 
ON public.sdr_metrics 
FOR DELETE 
TO authenticated
USING (created_by = auth.uid());
-- 1. First remove duplicates among existing empty-string funnels (keep most recent)
DELETE FROM sdr_metrics a
USING sdr_metrics b
WHERE a.sdr_id = b.sdr_id
  AND a.date = b.date
  AND a.funnel = b.funnel
  AND a.funnel = ''
  AND a.created_at < b.created_at;

-- 2. Remove duplicates where one is NULL and one is '' (keep the non-null one or most recent)
DELETE FROM sdr_metrics a
USING sdr_metrics b
WHERE a.sdr_id = b.sdr_id
  AND a.date = b.date
  AND a.funnel IS NULL
  AND b.funnel = ''
  AND a.id != b.id;

-- 3. Now remove any remaining NULL-NULL duplicates
DELETE FROM sdr_metrics a
USING sdr_metrics b
WHERE a.sdr_id = b.sdr_id
  AND a.date = b.date
  AND a.funnel IS NULL
  AND b.funnel IS NULL
  AND a.created_at < b.created_at;

-- 4. Update remaining NULL funnels to empty string
UPDATE sdr_metrics SET funnel = '' WHERE funnel IS NULL;

-- 5. Now remove any duplicates caused by step 4
DELETE FROM sdr_metrics a
USING sdr_metrics b
WHERE a.sdr_id = b.sdr_id
  AND a.date = b.date
  AND a.funnel = b.funnel
  AND a.created_at < b.created_at;

-- 6. Set NOT NULL constraint with default
ALTER TABLE sdr_metrics ALTER COLUMN funnel SET DEFAULT '';
ALTER TABLE sdr_metrics ALTER COLUMN funnel SET NOT NULL;

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  month date NOT NULL,
  metric_key text NOT NULL,
  target_value numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, month, metric_key)
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all goals"
  ON public.goals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view goals"
  ON public.goals FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view their entity goals"
  ON public.goals FOR SELECT
  USING (
    is_linked_to_entity(auth.uid(), entity_type, entity_id)
  );

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Adicionar nova role 'user' ao enum (precisa ser commitado antes de usar)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

-- Permitir que users vejam apenas suas entidades vinculadas (closers)
CREATE POLICY "Users can view linked closers"
  ON public.closers FOR SELECT
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'closer', id)
  );

-- Permitir que users vejam apenas suas entidades vinculadas (sdrs)
CREATE POLICY "Users can view linked sdrs"
  ON public.sdrs FOR SELECT
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'sdr', id)
  );

-- Permitir que users vejam metricas das suas entidades vinculadas
CREATE POLICY "Users can view metrics for linked closers"
  ON public.metrics FOR SELECT
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'closer', closer_id)
  );

-- Permitir que users insiram metricas para suas entidades vinculadas
CREATE POLICY "Users can insert metrics for linked closers"
  ON public.metrics FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'closer', closer_id)
    AND created_by = auth.uid()
  );

-- Permitir que users atualizem suas proprias metricas
CREATE POLICY "Users can update metrics for linked closers"
  ON public.metrics FOR UPDATE
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'closer', closer_id)
    AND created_by = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'closer', closer_id)
    AND created_by = auth.uid()
  );

-- Permitir que users deletem suas proprias metricas
CREATE POLICY "Users can delete metrics for linked closers"
  ON public.metrics FOR DELETE
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'closer', closer_id)
    AND created_by = auth.uid()
  );

-- Permitir que users vejam metricas SDR das suas entidades vinculadas
CREATE POLICY "Users can view sdr_metrics for linked sdrs"
  ON public.sdr_metrics FOR SELECT
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'sdr', sdr_id)
  );

-- Permitir que users insiram metricas SDR para suas entidades
CREATE POLICY "Users can insert sdr_metrics for linked sdrs"
  ON public.sdr_metrics FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'sdr', sdr_id)
    AND created_by = auth.uid()
  );

-- Permitir que users atualizem suas metricas SDR
CREATE POLICY "Users can update sdr_metrics for linked sdrs"
  ON public.sdr_metrics FOR UPDATE
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'sdr', sdr_id)
    AND created_by = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'sdr', sdr_id)
    AND created_by = auth.uid()
  );

-- Permitir que users deletem suas metricas SDR
CREATE POLICY "Users can delete sdr_metrics for linked sdrs"
  ON public.sdr_metrics FOR DELETE
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'sdr', sdr_id)
    AND created_by = auth.uid()
  );

-- Funcao: manager pode acessar closer via squad permission
CREATE OR REPLACE FUNCTION public.manager_can_access_closer(
  _user_id uuid, _closer_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.closers c
    JOIN public.squads s ON c.squad_id = s.id
    JOIN public.module_permissions mp ON mp.user_id = _user_id AND mp.module = s.slug
    WHERE c.id = _closer_id
  )
$$;

-- Funcao: manager pode acessar sdr via module permission 'sdrs'
CREATE OR REPLACE FUNCTION public.manager_can_access_sdr(
  _user_id uuid, _sdr_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.module_permissions
    WHERE user_id = _user_id AND module = 'sdrs'
  )
$$;

-- METRICS: Atualizar policy do manager
DROP POLICY IF EXISTS "Managers can manage all metrics" ON public.metrics;
CREATE POLICY "Managers can manage module metrics"
  ON public.metrics FOR ALL
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND manager_can_access_closer(auth.uid(), closer_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'manager'::app_role)
    AND manager_can_access_closer(auth.uid(), closer_id)
  );

-- SDR_METRICS: Atualizar policy do manager
DROP POLICY IF EXISTS "Managers can manage all sdr_metrics" ON public.sdr_metrics;
CREATE POLICY "Managers can manage module sdr_metrics"
  ON public.sdr_metrics FOR ALL
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND manager_can_access_sdr(auth.uid(), sdr_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'manager'::app_role)
    AND manager_can_access_sdr(auth.uid(), sdr_id)
  );

-- GOALS: Permitir managers gerenciar metas dos seus modulos
DROP POLICY IF EXISTS "Managers can view goals" ON public.goals;
CREATE POLICY "Managers can manage module goals"
  ON public.goals FOR ALL
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND (
      (entity_type = 'closer' AND manager_can_access_closer(auth.uid(), entity_id))
      OR
      (entity_type = 'sdr' AND manager_can_access_sdr(auth.uid(), entity_id))
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'manager'::app_role)
    AND (
      (entity_type = 'closer' AND manager_can_access_closer(auth.uid(), entity_id))
      OR
      (entity_type = 'sdr' AND manager_can_access_sdr(auth.uid(), entity_id))
    )
  );

-- Tabela de reunioes
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  meeting_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage meetings" ON public.meetings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage meetings" ON public.meetings FOR ALL
  USING (has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Participantes
CREATE TABLE public.meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage meeting_participants" ON public.meeting_participants FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage meeting_participants" ON public.meeting_participants FOR ALL
  USING (has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Notas
CREATE TABLE public.meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage meeting_notes" ON public.meeting_notes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage meeting_notes" ON public.meeting_notes FOR ALL
  USING (has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER update_meeting_notes_updated_at
  BEFORE UPDATE ON public.meeting_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Plano de acao
CREATE TABLE public.meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  assigned_to uuid,
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage meeting_action_items" ON public.meeting_action_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage meeting_action_items" ON public.meeting_action_items FOR ALL
  USING (has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER update_meeting_action_items_updated_at
  BEFORE UPDATE ON public.meeting_action_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Remove politicas antigas de UPDATE
DROP POLICY IF EXISTS "Users can update sdr_metrics for linked sdrs" ON public.sdr_metrics;
DROP POLICY IF EXISTS "Users can update their own sdr_metrics" ON public.sdr_metrics;

-- Remove politicas antigas de DELETE
DROP POLICY IF EXISTS "Users can delete sdr_metrics for linked sdrs" ON public.sdr_metrics;
DROP POLICY IF EXISTS "Users can delete their own sdr_metrics" ON public.sdr_metrics;

-- Nova politica de UPDATE: usuario pode editar qualquer metrica do SDR vinculado
CREATE POLICY "Users can update sdr_metrics for linked sdrs"
  ON public.sdr_metrics FOR UPDATE
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'sdr'::text, sdr_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'sdr'::text, sdr_id)
  );

-- Nova politica de DELETE: usuario pode excluir qualquer metrica do SDR vinculado
CREATE POLICY "Users can delete sdr_metrics for linked sdrs"
  ON public.sdr_metrics FOR DELETE
  USING (
    has_role(auth.uid(), 'user'::app_role)
    AND is_linked_to_entity(auth.uid(), 'sdr'::text, sdr_id)
  );
ALTER TABLE public.sdr_metrics ADD COLUMN scheduled_follow_up integer NOT NULL DEFAULT 0;-- P1: Índices para queries frequentes
-- sdr_metrics: queries por sdr_id + date são as mais comuns
CREATE INDEX IF NOT EXISTS idx_sdr_metrics_sdr_date ON public.sdr_metrics(sdr_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sdr_metrics_date ON public.sdr_metrics(date DESC);

-- metrics: queries por closer_id + period
CREATE INDEX IF NOT EXISTS idx_metrics_closer_period ON public.metrics(closer_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_period ON public.metrics(period_start, period_end);

-- closers: queries by squad_id
CREATE INDEX IF NOT EXISTS idx_closers_squad ON public.closers(squad_id);

-- goals: queries by entity + month
CREATE INDEX IF NOT EXISTS idx_goals_entity_month ON public.goals(entity_type, entity_id, month);

-- user_entity_links: queries by user_id
CREATE INDEX IF NOT EXISTS idx_entity_links_user ON public.user_entity_links(user_id, entity_type);

-- module_permissions: queries by user_id
CREATE INDEX IF NOT EXISTS idx_module_perms_user ON public.module_permissions(user_id);

-- meetings: order by date
CREATE INDEX IF NOT EXISTS idx_meetings_date ON public.meetings(meeting_date DESC);

-- meeting related: by meeting_id
CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting ON public.meeting_notes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_actions_meeting ON public.meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON public.meeting_participants(meeting_id);

-- Analyze tables for query planner
ANALYZE public.sdr_metrics;
ANALYZE public.metrics;
ANALYZE public.closers;
ANALYZE public.goals;
ANALYZE public.meetings;-- P3: RPC para agregação de métricas SDR (lógica no banco = mais rápido)
CREATE OR REPLACE FUNCTION public.get_sdr_total_metrics(
  p_type text,
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT json_build_object(
    'totalActivated', COALESCE(SUM(sm.activated), 0),
    'totalScheduled', COALESCE(SUM(sm.scheduled), 0),
    'totalScheduledFollowUp', COALESCE(SUM(sm.scheduled_follow_up), 0),
    'totalScheduledSameDay', COALESCE(SUM(sm.scheduled_same_day), 0),
    'totalAttended', COALESCE(SUM(sm.attended), 0),
    'totalSales', COALESCE(SUM(sm.sales), 0),
    'avgScheduledRate', CASE 
      WHEN COALESCE(SUM(sm.activated), 0) > 0 
      THEN ROUND((COALESCE(SUM(sm.scheduled), 0)::numeric / SUM(sm.activated)) * 100, 2)
      ELSE 0 
    END,
    'avgAttendanceRate', CASE 
      WHEN COALESCE(SUM(sm.scheduled_same_day), 0) > 0 
      THEN ROUND((COALESCE(SUM(sm.attended), 0)::numeric / SUM(sm.scheduled_same_day)) * 100, 2)
      ELSE 0 
    END,
    'avgConversionRate', CASE 
      WHEN COALESCE(SUM(sm.attended), 0) > 0 
      THEN ROUND((COALESCE(SUM(sm.sales), 0)::numeric / SUM(sm.attended)) * 100, 2)
      ELSE 0 
    END
  )
  FROM sdr_metrics sm
  JOIN sdrs s ON sm.sdr_id = s.id
  WHERE s.type = p_type
    AND sm.funnel != ''
    AND (p_period_start IS NULL OR sm.date >= p_period_start)
    AND (p_period_end IS NULL OR sm.date <= p_period_end);
$$;TRUNCATE cron.job_run_details;
TRUNCATE net._http_response;
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

-- =============================================
-- FASE 1: Schema SQL — funnels, user_funnels, funnel_daily_data
-- =============================================

-- 1.1 Tabela centralizada de funis
CREATE TABLE public.funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

-- RLS: Todos autenticados podem ver funis
CREATE POLICY "Authenticated users can view funnels"
  ON public.funnels FOR SELECT TO authenticated
  USING (true);

-- RLS: Admins podem gerenciar funis
CREATE POLICY "Admins can manage funnels"
  ON public.funnels FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS: Managers podem gerenciar funis
CREATE POLICY "Managers can manage funnels"
  ON public.funnels FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'manager'));

-- 1.2 Tabela de atribuição funil↔usuário
CREATE TABLE public.user_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE(user_id, funnel_id)
);

ALTER TABLE public.user_funnels ENABLE ROW LEVEL SECURITY;

-- RLS: Todos autenticados podem ver atribuições
CREATE POLICY "Authenticated users can view user_funnels"
  ON public.user_funnels FOR SELECT TO authenticated
  USING (true);

-- RLS: Admins podem gerenciar atribuições
CREATE POLICY "Admins can manage user_funnels"
  ON public.user_funnels FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS: Managers podem gerenciar atribuições
CREATE POLICY "Managers can manage user_funnels"
  ON public.user_funnels FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'manager'));

-- 1.3 Tabela de dados diários do closer por funil
CREATE TABLE public.funnel_daily_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calls_scheduled INTEGER NOT NULL DEFAULT 0,
  calls_done INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  sales_value NUMERIC NOT NULL DEFAULT 0,
  sdr_id UUID,
  leads_count INTEGER NOT NULL DEFAULT 0,
  qualified_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(user_id, funnel_id, date, sdr_id)
);

ALTER TABLE public.funnel_daily_data ENABLE ROW LEVEL SECURITY;

-- RLS: Todos autenticados podem ver dados
CREATE POLICY "Authenticated users can view funnel_daily_data"
  ON public.funnel_daily_data FOR SELECT TO authenticated
  USING (true);

-- RLS: Admins podem gerenciar todos os dados
CREATE POLICY "Admins can manage funnel_daily_data"
  ON public.funnel_daily_data FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS: Managers podem gerenciar dados do módulo
CREATE POLICY "Managers can manage funnel_daily_data"
  ON public.funnel_daily_data FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'manager'));

-- RLS: Users podem inserir seus próprios dados
CREATE POLICY "Users can insert own funnel_daily_data"
  ON public.funnel_daily_data FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'user') AND user_id IN (
    SELECT uel.entity_id FROM public.user_entity_links uel 
    WHERE uel.user_id = auth.uid() AND uel.entity_type = 'closer'
  ) AND created_by = auth.uid());

-- RLS: Users podem atualizar seus próprios dados
CREATE POLICY "Users can update own funnel_daily_data"
  ON public.funnel_daily_data FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'user') AND created_by = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'user') AND created_by = auth.uid());

-- RLS: Users podem deletar seus próprios dados
CREATE POLICY "Users can delete own funnel_daily_data"
  ON public.funnel_daily_data FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'user') AND created_by = auth.uid());

-- 1.5 Índices
CREATE INDEX idx_funnel_daily_data_user_id ON public.funnel_daily_data(user_id);
CREATE INDEX idx_funnel_daily_data_funnel_id ON public.funnel_daily_data(funnel_id);
CREATE INDEX idx_funnel_daily_data_date ON public.funnel_daily_data(date);
CREATE INDEX idx_funnel_daily_data_sdr_id ON public.funnel_daily_data(sdr_id);
CREATE INDEX idx_user_funnels_user_id ON public.user_funnels(user_id);
CREATE INDEX idx_user_funnels_funnel_id ON public.user_funnels(funnel_id);

-- 1.6 Migrar dados existentes de sdr_funnels → funnels + user_funnels
-- Inserir funis únicos na tabela funnels
INSERT INTO public.funnels (name, category, created_by)
SELECT DISTINCT sf.funnel_name, 
  CASE 
    WHEN sf.funnel_name ILIKE '%social%' THEN 'Social Selling'
    WHEN sf.funnel_name ILIKE '%mentoria%' THEN 'Mentoria'
    WHEN sf.funnel_name ILIKE '%implementa%' THEN 'Implementação'
    ELSE 'Outro'
  END,
  sf.created_by
FROM public.sdr_funnels sf
WHERE sf.funnel_name != ''
ON CONFLICT (name) DO NOTHING;

-- Criar vínculos user_funnels para SDRs (usando sdr_id como user_id proxy)
-- Nota: sdr_id referencia a tabela sdrs, não auth.users, então usamos entity_links para mapear
INSERT INTO public.user_funnels (user_id, funnel_id, assigned_by)
SELECT sf.sdr_id, f.id, sf.created_by
FROM public.sdr_funnels sf
JOIN public.funnels f ON f.name = sf.funnel_name
WHERE sf.funnel_name != ''
ON CONFLICT (user_id, funnel_id) DO NOTHING;

-- RPC: get_funnel_report - Report for a specific funnel
CREATE OR REPLACE FUNCTION public.get_funnel_report(
  p_funnel_id uuid,
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'funnel_id', p_funnel_id,
    'funnel_name', (SELECT name FROM funnels WHERE id = p_funnel_id),
    'total_leads', COALESCE(SUM(fdd.leads_count), 0),
    'total_qualified', COALESCE(SUM(fdd.qualified_count), 0),
    'total_calls_scheduled', COALESCE(SUM(fdd.calls_scheduled), 0),
    'total_calls_done', COALESCE(SUM(fdd.calls_done), 0),
    'total_sales', COALESCE(SUM(fdd.sales_count), 0),
    'total_revenue', COALESCE(SUM(fdd.sales_value), 0),
    'leads_to_qualified_rate', CASE 
      WHEN COALESCE(SUM(fdd.leads_count), 0) > 0 
      THEN ROUND((COALESCE(SUM(fdd.qualified_count), 0)::numeric / SUM(fdd.leads_count)) * 100, 2)
      ELSE 0 
    END,
    'qualified_to_scheduled_rate', CASE 
      WHEN COALESCE(SUM(fdd.qualified_count), 0) > 0 
      THEN ROUND((COALESCE(SUM(fdd.calls_scheduled), 0)::numeric / SUM(fdd.qualified_count)) * 100, 2)
      ELSE 0 
    END,
    'scheduled_to_done_rate', CASE 
      WHEN COALESCE(SUM(fdd.calls_scheduled), 0) > 0 
      THEN ROUND((COALESCE(SUM(fdd.calls_done), 0)::numeric / SUM(fdd.calls_scheduled)) * 100, 2)
      ELSE 0 
    END,
    'done_to_sales_rate', CASE 
      WHEN COALESCE(SUM(fdd.calls_done), 0) > 0 
      THEN ROUND((COALESCE(SUM(fdd.sales_count), 0)::numeric / SUM(fdd.calls_done)) * 100, 2)
      ELSE 0 
    END
  )
  FROM funnel_daily_data fdd
  WHERE fdd.funnel_id = p_funnel_id
    AND (p_period_start IS NULL OR fdd.date >= p_period_start)
    AND (p_period_end IS NULL OR fdd.date <= p_period_end);
$$;

-- RPC: get_all_funnels_summary - Summary for all active funnels
CREATE OR REPLACE FUNCTION public.get_all_funnels_summary(
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(funnel_data), '[]'::json)
  FROM (
    SELECT 
      f.id as funnel_id,
      f.name as funnel_name,
      f.category,
      COALESCE(SUM(fdd.leads_count), 0) as total_leads,
      COALESCE(SUM(fdd.qualified_count), 0) as total_qualified,
      COALESCE(SUM(fdd.calls_scheduled), 0) as total_calls_scheduled,
      COALESCE(SUM(fdd.calls_done), 0) as total_calls_done,
      COALESCE(SUM(fdd.sales_count), 0) as total_sales,
      COALESCE(SUM(fdd.sales_value), 0) as total_revenue,
      CASE 
        WHEN COALESCE(SUM(fdd.leads_count), 0) > 0 
        THEN ROUND((COALESCE(SUM(fdd.qualified_count), 0)::numeric / SUM(fdd.leads_count)) * 100, 2)
        ELSE 0 
      END as leads_to_qualified_rate,
      CASE 
        WHEN COALESCE(SUM(fdd.calls_done), 0) > 0 
        THEN ROUND((COALESCE(SUM(fdd.sales_count), 0)::numeric / SUM(fdd.calls_done)) * 100, 2)
        ELSE 0 
      END as conversion_rate
    FROM funnels f
    LEFT JOIN funnel_daily_data fdd ON fdd.funnel_id = f.id
      AND (p_period_start IS NULL OR fdd.date >= p_period_start)
      AND (p_period_end IS NULL OR fdd.date <= p_period_end)
    WHERE f.is_active = true
    GROUP BY f.id, f.name, f.category
    ORDER BY f.name
  ) funnel_data;
$$;

-- Update get_all_funnels_summary to include sdr_metrics data
CREATE OR REPLACE FUNCTION public.get_all_funnels_summary(p_period_start date DEFAULT NULL::date, p_period_end date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(funnel_data), '[]'::json)
  FROM (
    SELECT 
      f.id as funnel_id,
      f.name as funnel_name,
      f.category,
      COALESCE(closer.total_leads, 0) + COALESCE(sdr.total_activated, 0) as total_leads,
      COALESCE(closer.total_qualified, 0) as total_qualified,
      COALESCE(closer.total_calls_scheduled, 0) + COALESCE(sdr.total_scheduled, 0) as total_calls_scheduled,
      COALESCE(closer.total_calls_done, 0) + COALESCE(sdr.total_attended, 0) as total_calls_done,
      COALESCE(closer.total_sales, 0) + COALESCE(sdr.total_sales, 0) as total_sales,
      COALESCE(closer.total_revenue, 0) as total_revenue,
      CASE 
        WHEN (COALESCE(closer.total_leads, 0) + COALESCE(sdr.total_activated, 0)) > 0 
        THEN ROUND(COALESCE(closer.total_qualified, 0)::numeric / (COALESCE(closer.total_leads, 0) + COALESCE(sdr.total_activated, 0)) * 100, 2)
        ELSE 0 
      END as leads_to_qualified_rate,
      CASE 
        WHEN (COALESCE(closer.total_calls_done, 0) + COALESCE(sdr.total_attended, 0)) > 0 
        THEN ROUND((COALESCE(closer.total_sales, 0) + COALESCE(sdr.total_sales, 0))::numeric / (COALESCE(closer.total_calls_done, 0) + COALESCE(sdr.total_attended, 0)) * 100, 2)
        ELSE 0 
      END as conversion_rate
    FROM funnels f
    LEFT JOIN LATERAL (
      SELECT 
        SUM(fdd.leads_count) as total_leads,
        SUM(fdd.qualified_count) as total_qualified,
        SUM(fdd.calls_scheduled) as total_calls_scheduled,
        SUM(fdd.calls_done) as total_calls_done,
        SUM(fdd.sales_count) as total_sales,
        SUM(fdd.sales_value) as total_revenue
      FROM funnel_daily_data fdd
      WHERE fdd.funnel_id = f.id
        AND (p_period_start IS NULL OR fdd.date >= p_period_start)
        AND (p_period_end IS NULL OR fdd.date <= p_period_end)
    ) closer ON true
    LEFT JOIN LATERAL (
      SELECT 
        SUM(sm.activated) as total_activated,
        SUM(sm.scheduled) as total_scheduled,
        SUM(sm.attended) as total_attended,
        SUM(sm.sales) as total_sales
      FROM sdr_metrics sm
      WHERE sm.funnel = f.name
        AND sm.funnel != ''
        AND (p_period_start IS NULL OR sm.date >= p_period_start)
        AND (p_period_end IS NULL OR sm.date <= p_period_end)
    ) sdr ON true
    WHERE f.is_active = true
    ORDER BY f.name
  ) funnel_data;
$function$;

-- Update get_funnel_report to include sdr_metrics data
CREATE OR REPLACE FUNCTION public.get_funnel_report(p_funnel_id uuid, p_period_start date DEFAULT NULL::date, p_period_end date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'funnel_id', p_funnel_id,
    'funnel_name', (SELECT name FROM funnels WHERE id = p_funnel_id),
    'total_leads', COALESCE(closer.total_leads, 0) + COALESCE(sdr.total_activated, 0),
    'total_qualified', COALESCE(closer.total_qualified, 0),
    'total_calls_scheduled', COALESCE(closer.total_calls_scheduled, 0) + COALESCE(sdr.total_scheduled, 0),
    'total_calls_done', COALESCE(closer.total_calls_done, 0) + COALESCE(sdr.total_attended, 0),
    'total_sales', COALESCE(closer.total_sales, 0) + COALESCE(sdr.total_sales, 0),
    'total_revenue', COALESCE(closer.total_revenue, 0),
    'leads_to_qualified_rate', CASE 
      WHEN (COALESCE(closer.total_leads, 0) + COALESCE(sdr.total_activated, 0)) > 0 
      THEN ROUND(COALESCE(closer.total_qualified, 0)::numeric / (COALESCE(closer.total_leads, 0) + COALESCE(sdr.total_activated, 0)) * 100, 2)
      ELSE 0 
    END,
    'qualified_to_scheduled_rate', CASE 
      WHEN COALESCE(closer.total_qualified, 0) > 0 
      THEN ROUND((COALESCE(closer.total_calls_scheduled, 0) + COALESCE(sdr.total_scheduled, 0))::numeric / COALESCE(closer.total_qualified, 0) * 100, 2)
      ELSE 0 
    END,
    'scheduled_to_done_rate', CASE 
      WHEN (COALESCE(closer.total_calls_scheduled, 0) + COALESCE(sdr.total_scheduled, 0)) > 0 
      THEN ROUND((COALESCE(closer.total_calls_done, 0) + COALESCE(sdr.total_attended, 0))::numeric / (COALESCE(closer.total_calls_scheduled, 0) + COALESCE(sdr.total_scheduled, 0)) * 100, 2)
      ELSE 0 
    END,
    'done_to_sales_rate', CASE 
      WHEN (COALESCE(closer.total_calls_done, 0) + COALESCE(sdr.total_attended, 0)) > 0 
      THEN ROUND((COALESCE(closer.total_sales, 0) + COALESCE(sdr.total_sales, 0))::numeric / (COALESCE(closer.total_calls_done, 0) + COALESCE(sdr.total_attended, 0)) * 100, 2)
      ELSE 0 
    END
  )
  FROM (
    SELECT 
      SUM(fdd.leads_count) as total_leads,
      SUM(fdd.qualified_count) as total_qualified,
      SUM(fdd.calls_scheduled) as total_calls_scheduled,
      SUM(fdd.calls_done) as total_calls_done,
      SUM(fdd.sales_count) as total_sales,
      SUM(fdd.sales_value) as total_revenue
    FROM funnel_daily_data fdd
    WHERE fdd.funnel_id = p_funnel_id
      AND (p_period_start IS NULL OR fdd.date >= p_period_start)
      AND (p_period_end IS NULL OR fdd.date <= p_period_end)
  ) closer,
  (
    SELECT 
      SUM(sm.activated) as total_activated,
      SUM(sm.scheduled) as total_scheduled,
      SUM(sm.attended) as total_attended,
      SUM(sm.sales) as total_sales
    FROM sdr_metrics sm
    WHERE sm.funnel = (SELECT name FROM funnels WHERE id = p_funnel_id)
      AND sm.funnel != ''
      AND (p_period_start IS NULL OR sm.date >= p_period_start)
      AND (p_period_end IS NULL OR sm.date <= p_period_end)
  ) sdr;
$function$;

CREATE OR REPLACE FUNCTION public.get_sales_by_person_and_product(
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(row_data ORDER BY person_name, funnel_name), '[]'::json)
  FROM (
    -- Closers from funnel_daily_data
    SELECT 
      c.name as person_name,
      'closer' as person_type,
      f.name as funnel_name,
      SUM(fdd.sales_count)::integer as total_sales,
      SUM(fdd.sales_value)::numeric as total_revenue,
      SUM(fdd.leads_count)::integer as total_leads,
      SUM(fdd.qualified_count)::integer as total_qualified,
      SUM(fdd.calls_scheduled)::integer as total_scheduled,
      SUM(fdd.calls_done)::integer as total_done
    FROM funnel_daily_data fdd
    JOIN closers c ON fdd.user_id = c.id
    JOIN funnels f ON fdd.funnel_id = f.id
    WHERE (p_period_start IS NULL OR fdd.date >= p_period_start)
      AND (p_period_end IS NULL OR fdd.date <= p_period_end)
    GROUP BY c.name, f.name

    UNION ALL

    -- SDRs from sdr_metrics
    SELECT 
      s.name as person_name,
      s.type as person_type,
      sm.funnel as funnel_name,
      SUM(sm.sales)::integer as total_sales,
      0::numeric as total_revenue,
      SUM(sm.activated)::integer as total_leads,
      0::integer as total_qualified,
      SUM(sm.scheduled)::integer as total_scheduled,
      SUM(sm.attended)::integer as total_done
    FROM sdr_metrics sm
    JOIN sdrs s ON sm.sdr_id = s.id
    WHERE sm.funnel != ''
      AND (p_period_start IS NULL OR sm.date >= p_period_start)
      AND (p_period_end IS NULL OR sm.date <= p_period_end)
    GROUP BY s.name, s.type, sm.funnel
  ) row_data;
$$;

CREATE OR REPLACE FUNCTION public.get_sales_by_person_and_product(p_period_start date DEFAULT NULL::date, p_period_end date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(row_data ORDER BY person_name, funnel_name), '[]'::json)
  FROM (
    -- Closers from funnel_daily_data (granular per-funnel)
    SELECT 
      c.name as person_name,
      'closer' as person_type,
      f.name as funnel_name,
      SUM(fdd.sales_count)::integer as total_sales,
      SUM(fdd.sales_value)::numeric as total_revenue,
      SUM(fdd.leads_count)::integer as total_leads,
      SUM(fdd.qualified_count)::integer as total_qualified,
      SUM(fdd.calls_scheduled)::integer as total_scheduled,
      SUM(fdd.calls_done)::integer as total_done
    FROM funnel_daily_data fdd
    JOIN closers c ON fdd.user_id = c.id
    JOIN funnels f ON fdd.funnel_id = f.id
    WHERE (p_period_start IS NULL OR fdd.date >= p_period_start)
      AND (p_period_end IS NULL OR fdd.date <= p_period_end)
    GROUP BY c.name, f.name

    UNION ALL

    -- Closers from metrics table (aggregated, no funnel granularity)
    -- Only include closers that do NOT have funnel_daily_data in the period
    SELECT 
      c.name as person_name,
      'closer' as person_type,
      'Geral' as funnel_name,
      SUM(m.sales)::integer as total_sales,
      SUM(m.revenue)::numeric as total_revenue,
      0::integer as total_leads,
      0::integer as total_qualified,
      SUM(m.calls)::integer as total_scheduled,
      SUM(m.calls)::integer as total_done
    FROM metrics m
    JOIN closers c ON m.closer_id = c.id
    WHERE (p_period_start IS NULL OR m.period_start >= p_period_start)
      AND (p_period_end IS NULL OR m.period_end <= p_period_end)
      AND NOT EXISTS (
        SELECT 1 FROM funnel_daily_data fdd2
        WHERE fdd2.user_id = m.closer_id
          AND (p_period_start IS NULL OR fdd2.date >= p_period_start)
          AND (p_period_end IS NULL OR fdd2.date <= p_period_end)
      )
    GROUP BY c.name

    UNION ALL

    -- SDRs from sdr_metrics
    SELECT 
      s.name as person_name,
      s.type as person_type,
      sm.funnel as funnel_name,
      SUM(sm.sales)::integer as total_sales,
      0::numeric as total_revenue,
      SUM(sm.activated)::integer as total_leads,
      0::integer as total_qualified,
      SUM(sm.scheduled)::integer as total_scheduled,
      SUM(sm.attended)::integer as total_done
    FROM sdr_metrics sm
    JOIN sdrs s ON sm.sdr_id = s.id
    WHERE sm.funnel != ''
      AND (p_period_start IS NULL OR sm.date >= p_period_start)
      AND (p_period_end IS NULL OR sm.date <= p_period_end)
    GROUP BY s.name, s.type, sm.funnel
  ) row_data;
$$;

CREATE OR REPLACE FUNCTION public.get_sales_by_person_and_product(p_period_start date DEFAULT NULL::date, p_period_end date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(row_data ORDER BY person_name, funnel_name), '[]'::json)
  FROM (
    -- Closers from funnel_daily_data (granular per-funnel)
    SELECT 
      c.id::text as person_id,
      c.name as person_name,
      'closer' as person_type,
      f.id::text as funnel_id,
      f.name as funnel_name,
      SUM(fdd.sales_count)::integer as total_sales,
      SUM(fdd.sales_value)::numeric as total_revenue,
      SUM(fdd.leads_count)::integer as total_leads,
      SUM(fdd.qualified_count)::integer as total_qualified,
      SUM(fdd.calls_scheduled)::integer as total_scheduled,
      SUM(fdd.calls_done)::integer as total_done,
      0::numeric as total_entries
    FROM funnel_daily_data fdd
    JOIN closers c ON fdd.user_id = c.id
    JOIN funnels f ON fdd.funnel_id = f.id
    WHERE (p_period_start IS NULL OR fdd.date >= p_period_start)
      AND (p_period_end IS NULL OR fdd.date <= p_period_end)
    GROUP BY c.id, c.name, f.id, f.name

    UNION ALL

    -- Closers from metrics table (aggregated, no funnel granularity)
    SELECT 
      c.id::text as person_id,
      c.name as person_name,
      'closer' as person_type,
      null::text as funnel_id,
      'Geral' as funnel_name,
      SUM(m.sales)::integer as total_sales,
      SUM(m.revenue)::numeric as total_revenue,
      0::integer as total_leads,
      0::integer as total_qualified,
      SUM(m.calls)::integer as total_scheduled,
      SUM(m.calls)::integer as total_done,
      SUM(COALESCE(m.entries, 0))::numeric as total_entries
    FROM metrics m
    JOIN closers c ON m.closer_id = c.id
    WHERE (p_period_start IS NULL OR m.period_start >= p_period_start)
      AND (p_period_end IS NULL OR m.period_end <= p_period_end)
      AND NOT EXISTS (
        SELECT 1 FROM funnel_daily_data fdd2
        WHERE fdd2.user_id = m.closer_id
          AND (p_period_start IS NULL OR fdd2.date >= p_period_start)
          AND (p_period_end IS NULL OR fdd2.date <= p_period_end)
      )
    GROUP BY c.id, c.name

    UNION ALL

    -- SDRs from sdr_metrics
    SELECT 
      s.id::text as person_id,
      s.name as person_name,
      s.type as person_type,
      null::text as funnel_id,
      sm.funnel as funnel_name,
      SUM(sm.sales)::integer as total_sales,
      0::numeric as total_revenue,
      SUM(sm.activated)::integer as total_leads,
      0::integer as total_qualified,
      SUM(sm.scheduled)::integer as total_scheduled,
      SUM(sm.attended)::integer as total_done,
      0::numeric as total_entries
    FROM sdr_metrics sm
    JOIN sdrs s ON sm.sdr_id = s.id
    WHERE sm.funnel != ''
      AND (p_period_start IS NULL OR sm.date >= p_period_start)
      AND (p_period_end IS NULL OR sm.date <= p_period_end)
    GROUP BY s.id, s.name, s.type, sm.funnel
  ) row_data;
$function$

CREATE POLICY "Anyone can insert funnel_daily_data with created_by"
ON public.funnel_daily_data
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());
-- Drop foreign key constraint on funnel_daily_data.user_id referencing closers
-- This constraint prevents non-closer users (managers, SDRs) from inserting data via reports
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'funnel_daily_data'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'closers';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.funnel_daily_data DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;
-- =============================================================================
-- Migration: Separar Funis (origem do lead) de Produtos (tipo de venda)
-- =============================================================================

-- 1. Criar tabela products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed initial products
INSERT INTO public.products (name) VALUES
  ('Mentoria Julia'),
  ('Elite Premium'),
  ('Implementação de IA'),
  ('Implementação Comercial');

-- 2. Add product_id to funnel_daily_data
ALTER TABLE public.funnel_daily_data
  ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

CREATE INDEX idx_funnel_daily_data_product_id ON public.funnel_daily_data(product_id);

-- 3. Add product_id to metrics
ALTER TABLE public.metrics
  ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

CREATE INDEX idx_metrics_product_id ON public.metrics(product_id);

-- 4. Update get_all_funnels_summary to include metrics table data + entries
CREATE OR REPLACE FUNCTION public.get_all_funnels_summary(
  p_period_start date DEFAULT NULL::date,
  p_period_end date DEFAULT NULL::date
)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(funnel_data), '[]'::json)
  FROM (
    SELECT
      f.id as funnel_id,
      f.name as funnel_name,
      f.category,
      COALESCE(closer_fdd.total_leads, 0) + COALESCE(sdr.total_activated, 0) as total_leads,
      COALESCE(closer_fdd.total_qualified, 0) as total_qualified,
      COALESCE(closer_fdd.total_calls_scheduled, 0) + COALESCE(sdr.total_scheduled, 0) as total_calls_scheduled,
      COALESCE(closer_fdd.total_calls_done, 0) + COALESCE(sdr.total_attended, 0) as total_calls_done,
      COALESCE(closer_fdd.total_sales, 0) + COALESCE(sdr.total_sales, 0) + COALESCE(closer_m.total_sales, 0) as total_sales,
      COALESCE(closer_fdd.total_revenue, 0) + COALESCE(closer_m.total_revenue, 0) as total_revenue,
      COALESCE(closer_fdd.total_entries, 0) + COALESCE(closer_m.total_entries, 0) as total_entries,
      CASE
        WHEN (COALESCE(closer_fdd.total_leads, 0) + COALESCE(sdr.total_activated, 0)) > 0
        THEN ROUND(COALESCE(closer_fdd.total_qualified, 0)::numeric
          / (COALESCE(closer_fdd.total_leads, 0) + COALESCE(sdr.total_activated, 0)) * 100, 2)
        ELSE 0
      END as leads_to_qualified_rate,
      CASE
        WHEN (COALESCE(closer_fdd.total_calls_done, 0) + COALESCE(sdr.total_attended, 0)) > 0
        THEN ROUND(
          (COALESCE(closer_fdd.total_sales, 0) + COALESCE(sdr.total_sales, 0) + COALESCE(closer_m.total_sales, 0))::numeric
          / (COALESCE(closer_fdd.total_calls_done, 0) + COALESCE(sdr.total_attended, 0)) * 100, 2)
        ELSE 0
      END as conversion_rate
    FROM funnels f
    LEFT JOIN LATERAL (
      SELECT
        SUM(fdd.leads_count) as total_leads,
        SUM(fdd.qualified_count) as total_qualified,
        SUM(fdd.calls_scheduled) as total_calls_scheduled,
        SUM(fdd.calls_done) as total_calls_done,
        SUM(fdd.sales_count) as total_sales,
        SUM(fdd.sales_value) as total_revenue,
        SUM(fdd.entries_value) as total_entries
      FROM funnel_daily_data fdd
      WHERE fdd.funnel_id = f.id
        AND (p_period_start IS NULL OR fdd.date >= p_period_start)
        AND (p_period_end IS NULL OR fdd.date <= p_period_end)
    ) closer_fdd ON true
    LEFT JOIN LATERAL (
      SELECT
        SUM(m.sales) as total_sales,
        SUM(m.revenue) as total_revenue,
        SUM(COALESCE(m.entries, 0)) as total_entries
      FROM metrics m
      WHERE m.funnel_id = f.id
        AND (p_period_start IS NULL OR m.period_start >= p_period_start)
        AND (p_period_end IS NULL OR m.period_end <= p_period_end)
    ) closer_m ON true
    LEFT JOIN LATERAL (
      SELECT
        SUM(sm.activated) as total_activated,
        SUM(sm.scheduled) as total_scheduled,
        SUM(sm.attended) as total_attended,
        SUM(sm.sales) as total_sales
      FROM sdr_metrics sm
      WHERE sm.funnel = f.name
        AND sm.funnel != ''
        AND (p_period_start IS NULL OR sm.date >= p_period_start)
        AND (p_period_end IS NULL OR sm.date <= p_period_end)
    ) sdr ON true
    WHERE f.is_active = true
    ORDER BY f.name
  ) funnel_data;
$function$;

-- 5. Update get_funnel_report to include metrics table data
CREATE OR REPLACE FUNCTION public.get_funnel_report(
  p_funnel_id uuid,
  p_period_start date DEFAULT NULL::date,
  p_period_end date DEFAULT NULL::date
)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'funnel_id', p_funnel_id,
    'funnel_name', (SELECT name FROM funnels WHERE id = p_funnel_id),
    'total_leads', COALESCE(closer.total_leads, 0) + COALESCE(sdr.total_activated, 0),
    'total_qualified', COALESCE(closer.total_qualified, 0),
    'total_calls_scheduled', COALESCE(closer.total_calls_scheduled, 0) + COALESCE(sdr.total_scheduled, 0),
    'total_calls_done', COALESCE(closer.total_calls_done, 0) + COALESCE(sdr.total_attended, 0),
    'total_sales', COALESCE(closer.total_sales, 0) + COALESCE(sdr.total_sales, 0) + COALESCE(closer_m.total_sales, 0),
    'total_revenue', COALESCE(closer.total_revenue, 0) + COALESCE(closer_m.total_revenue, 0),
    'total_entries', COALESCE(closer.total_entries, 0) + COALESCE(closer_m.total_entries, 0),
    'leads_to_qualified_rate', CASE
      WHEN (COALESCE(closer.total_leads, 0) + COALESCE(sdr.total_activated, 0)) > 0
      THEN ROUND(COALESCE(closer.total_qualified, 0)::numeric / (COALESCE(closer.total_leads, 0) + COALESCE(sdr.total_activated, 0)) * 100, 2)
      ELSE 0
    END,
    'qualified_to_scheduled_rate', CASE
      WHEN COALESCE(closer.total_qualified, 0) > 0
      THEN ROUND((COALESCE(closer.total_calls_scheduled, 0) + COALESCE(sdr.total_scheduled, 0))::numeric / COALESCE(closer.total_qualified, 0) * 100, 2)
      ELSE 0
    END,
    'scheduled_to_done_rate', CASE
      WHEN (COALESCE(closer.total_calls_scheduled, 0) + COALESCE(sdr.total_scheduled, 0)) > 0
      THEN ROUND((COALESCE(closer.total_calls_done, 0) + COALESCE(sdr.total_attended, 0))::numeric / (COALESCE(closer.total_calls_scheduled, 0) + COALESCE(sdr.total_scheduled, 0)) * 100, 2)
      ELSE 0
    END,
    'done_to_sales_rate', CASE
      WHEN (COALESCE(closer.total_calls_done, 0) + COALESCE(sdr.total_attended, 0)) > 0
      THEN ROUND((COALESCE(closer.total_sales, 0) + COALESCE(sdr.total_sales, 0) + COALESCE(closer_m.total_sales, 0))::numeric / (COALESCE(closer.total_calls_done, 0) + COALESCE(sdr.total_attended, 0)) * 100, 2)
      ELSE 0
    END
  )
  FROM (
    SELECT
      SUM(fdd.leads_count) as total_leads,
      SUM(fdd.qualified_count) as total_qualified,
      SUM(fdd.calls_scheduled) as total_calls_scheduled,
      SUM(fdd.calls_done) as total_calls_done,
      SUM(fdd.sales_count) as total_sales,
      SUM(fdd.sales_value) as total_revenue,
      SUM(fdd.entries_value) as total_entries
    FROM funnel_daily_data fdd
    WHERE fdd.funnel_id = p_funnel_id
      AND (p_period_start IS NULL OR fdd.date >= p_period_start)
      AND (p_period_end IS NULL OR fdd.date <= p_period_end)
  ) closer,
  (
    SELECT
      SUM(sm.activated) as total_activated,
      SUM(sm.scheduled) as total_scheduled,
      SUM(sm.attended) as total_attended,
      SUM(sm.sales) as total_sales
    FROM sdr_metrics sm
    WHERE sm.funnel = (SELECT name FROM funnels WHERE id = p_funnel_id)
      AND sm.funnel != ''
      AND (p_period_start IS NULL OR sm.date >= p_period_start)
      AND (p_period_end IS NULL OR sm.date <= p_period_end)
  ) sdr,
  (
    SELECT
      SUM(m.sales) as total_sales,
      SUM(m.revenue) as total_revenue,
      SUM(COALESCE(m.entries, 0)) as total_entries
    FROM metrics m
    WHERE m.funnel_id = p_funnel_id
      AND (p_period_start IS NULL OR m.period_start >= p_period_start)
      AND (p_period_end IS NULL OR m.period_end <= p_period_end)
  ) closer_m;
$function$;

-- 6. Update get_sales_by_person_and_product to include product info and fix NOT EXISTS
CREATE OR REPLACE FUNCTION public.get_sales_by_person_and_product(
  p_period_start date DEFAULT NULL::date,
  p_period_end date DEFAULT NULL::date
)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(row_data ORDER BY person_name, funnel_name), '[]'::json)
  FROM (
    -- Closers from funnel_daily_data (granular per-funnel)
    SELECT
      c.id::text as person_id,
      c.name as person_name,
      'closer' as person_type,
      f.id::text as funnel_id,
      f.name as funnel_name,
      COALESCE(p.id::text, null) as product_id,
      COALESCE(p.name, '') as product_name,
      SUM(fdd.sales_count)::integer as total_sales,
      SUM(fdd.sales_value)::numeric as total_revenue,
      SUM(fdd.leads_count)::integer as total_leads,
      SUM(fdd.qualified_count)::integer as total_qualified,
      SUM(fdd.calls_scheduled)::integer as total_scheduled,
      SUM(fdd.calls_done)::integer as total_done,
      SUM(fdd.entries_value)::numeric as total_entries
    FROM funnel_daily_data fdd
    JOIN closers c ON fdd.user_id = c.id
    JOIN funnels f ON fdd.funnel_id = f.id
    LEFT JOIN products p ON fdd.product_id = p.id
    WHERE (p_period_start IS NULL OR fdd.date >= p_period_start)
      AND (p_period_end IS NULL OR fdd.date <= p_period_end)
    GROUP BY c.id, c.name, f.id, f.name, p.id, p.name

    UNION ALL

    -- Closers from metrics table (always included, not just fallback)
    SELECT
      c.id::text as person_id,
      c.name as person_name,
      'closer' as person_type,
      COALESCE(f.id::text, null) as funnel_id,
      COALESCE(f.name, 'Geral') as funnel_name,
      COALESCE(p.id::text, null) as product_id,
      COALESCE(p.name, '') as product_name,
      SUM(m.sales)::integer as total_sales,
      SUM(m.revenue)::numeric as total_revenue,
      0::integer as total_leads,
      0::integer as total_qualified,
      SUM(m.calls)::integer as total_scheduled,
      SUM(m.calls)::integer as total_done,
      SUM(COALESCE(m.entries, 0))::numeric as total_entries
    FROM metrics m
    JOIN closers c ON m.closer_id = c.id
    LEFT JOIN funnels f ON m.funnel_id = f.id
    LEFT JOIN products p ON m.product_id = p.id
    WHERE (p_period_start IS NULL OR m.period_start >= p_period_start)
      AND (p_period_end IS NULL OR m.period_end <= p_period_end)
    GROUP BY c.id, c.name, f.id, f.name, p.id, p.name

    UNION ALL

    -- SDRs from sdr_metrics
    SELECT
      s.id::text as person_id,
      s.name as person_name,
      s.type as person_type,
      null::text as funnel_id,
      sm.funnel as funnel_name,
      null::text as product_id,
      '' as product_name,
      SUM(sm.sales)::integer as total_sales,
      0::numeric as total_revenue,
      SUM(sm.activated)::integer as total_leads,
      0::integer as total_qualified,
      SUM(sm.scheduled)::integer as total_scheduled,
      SUM(sm.attended)::integer as total_done,
      0::numeric as total_entries
    FROM sdr_metrics sm
    JOIN sdrs s ON sm.sdr_id = s.id
    WHERE sm.funnel != ''
      AND (p_period_start IS NULL OR sm.date >= p_period_start)
      AND (p_period_end IS NULL OR sm.date <= p_period_end)
    GROUP BY s.id, s.name, s.type, sm.funnel
  ) row_data;
$function$;

-- 7. Create get_product_summary RPC
CREATE OR REPLACE FUNCTION public.get_product_summary(
  p_period_start date DEFAULT NULL::date,
  p_period_end date DEFAULT NULL::date
)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(product_data ORDER BY product_name), '[]'::json)
  FROM (
    SELECT
      p.id::text as product_id,
      p.name as product_name,
      SUM(total_sales)::integer as total_sales,
      SUM(total_revenue)::numeric as total_revenue,
      SUM(total_entries)::numeric as total_entries,
      SUM(total_calls)::integer as total_calls
    FROM (
      -- From funnel_daily_data
      SELECT
        fdd.product_id,
        SUM(fdd.sales_count) as total_sales,
        SUM(fdd.sales_value) as total_revenue,
        SUM(fdd.entries_value) as total_entries,
        SUM(fdd.calls_done) as total_calls
      FROM funnel_daily_data fdd
      WHERE fdd.product_id IS NOT NULL
        AND (p_period_start IS NULL OR fdd.date >= p_period_start)
        AND (p_period_end IS NULL OR fdd.date <= p_period_end)
      GROUP BY fdd.product_id

      UNION ALL

      -- From metrics table
      SELECT
        m.product_id,
        SUM(m.sales) as total_sales,
        SUM(m.revenue) as total_revenue,
        SUM(COALESCE(m.entries, 0)) as total_entries,
        SUM(m.calls) as total_calls
      FROM metrics m
      WHERE m.product_id IS NOT NULL
        AND (p_period_start IS NULL OR m.period_start >= p_period_start)
        AND (p_period_end IS NULL OR m.period_end <= p_period_end)
      GROUP BY m.product_id
    ) combined
    JOIN products p ON combined.product_id = p.id
    WHERE p.is_active = true
    GROUP BY p.id, p.name
  ) product_data;
$function$;
