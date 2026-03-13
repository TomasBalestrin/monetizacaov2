-- =============================================================================
-- Migration: Separar Funis (origem do lead) de Produtos (tipo de venda)
-- Idempotent: safe to re-run
-- =============================================================================

-- 1. Criar tabela products (se não existir)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Authenticated users can view products'
  ) THEN
    CREATE POLICY "Authenticated users can view products"
      ON public.products FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Admins can manage products'
  ) THEN
    CREATE POLICY "Admins can manage products"
      ON public.products FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Seed initial products (ignore duplicates)
INSERT INTO public.products (name) VALUES
  ('Mentoria Julia'),
  ('Elite Premium'),
  ('Implementação de IA'),
  ('Implementação Comercial')
ON CONFLICT (name) DO NOTHING;

-- 2. Add product_id to funnel_daily_data (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'funnel_daily_data' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE public.funnel_daily_data
      ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_funnel_daily_data_product_id ON public.funnel_daily_data(product_id);

-- 3. Add product_id to metrics (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'metrics' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE public.metrics
      ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_metrics_product_id ON public.metrics(product_id);

-- Drop existing functions that may have different return types
DROP FUNCTION IF EXISTS public.get_all_funnels_summary(date, date);
DROP FUNCTION IF EXISTS public.get_funnel_report(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_sales_by_person_and_product(date, date);
DROP FUNCTION IF EXISTS public.get_product_summary(date, date);

-- =============================================================================
-- 4. get_all_funnels_summary
-- Pipeline: SDR fornece topo do funil, Closer fornece fundo do funil
-- SDR: leads (activated), agendados (scheduled)
-- Closer (metrics): calls, sales, revenue, entries
-- NÃO soma sdr_metrics.sales com metrics.sales (é a mesma venda)
-- =============================================================================
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
      COALESCE(sdr.total_activated, 0) as total_leads,
      0 as total_qualified,
      COALESCE(sdr.total_scheduled, 0) as total_calls_scheduled,
      COALESCE(closer_m.total_calls, 0) as total_calls_done,
      COALESCE(closer_m.total_sales, 0) as total_sales,
      COALESCE(closer_m.total_revenue, 0) as total_revenue,
      COALESCE(closer_m.total_entries, 0) as total_entries,
      CASE
        WHEN COALESCE(sdr.total_activated, 0) > 0
        THEN ROUND(COALESCE(sdr.total_scheduled, 0)::numeric / COALESCE(sdr.total_activated, 0) * 100, 2)
        ELSE 0
      END as leads_to_qualified_rate,
      CASE
        WHEN COALESCE(closer_m.total_calls, 0) > 0
        THEN ROUND(COALESCE(closer_m.total_sales, 0)::numeric / COALESCE(closer_m.total_calls, 0) * 100, 2)
        ELSE 0
      END as conversion_rate
    FROM funnels f
    LEFT JOIN LATERAL (
      SELECT
        SUM(m.calls) as total_calls,
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
        SUM(sm.attended) as total_attended
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

-- =============================================================================
-- 5. get_funnel_report
-- Mesma lógica: SDR = topo, Closer (metrics) = fundo
-- =============================================================================
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
    'total_leads', COALESCE(sdr.total_activated, 0),
    'total_qualified', 0,
    'total_calls_scheduled', COALESCE(sdr.total_scheduled, 0),
    'total_calls_done', COALESCE(closer_m.total_calls, 0),
    'total_sales', COALESCE(closer_m.total_sales, 0),
    'total_revenue', COALESCE(closer_m.total_revenue, 0),
    'total_entries', COALESCE(closer_m.total_entries, 0),
    'leads_to_qualified_rate', CASE
      WHEN COALESCE(sdr.total_activated, 0) > 0
      THEN ROUND(COALESCE(sdr.total_scheduled, 0)::numeric / COALESCE(sdr.total_activated, 0) * 100, 2)
      ELSE 0
    END,
    'qualified_to_scheduled_rate', 0,
    'scheduled_to_done_rate', CASE
      WHEN COALESCE(sdr.total_scheduled, 0) > 0
      THEN ROUND(COALESCE(closer_m.total_calls, 0)::numeric / COALESCE(sdr.total_scheduled, 0) * 100, 2)
      ELSE 0
    END,
    'done_to_sales_rate', CASE
      WHEN COALESCE(closer_m.total_calls, 0) > 0
      THEN ROUND(COALESCE(closer_m.total_sales, 0)::numeric / COALESCE(closer_m.total_calls, 0) * 100, 2)
      ELSE 0
    END
  )
  FROM (
    SELECT
      SUM(sm.activated) as total_activated,
      SUM(sm.scheduled) as total_scheduled,
      SUM(sm.attended) as total_attended
    FROM sdr_metrics sm
    WHERE sm.funnel = (SELECT name FROM funnels WHERE id = p_funnel_id)
      AND sm.funnel != ''
      AND (p_period_start IS NULL OR sm.date >= p_period_start)
      AND (p_period_end IS NULL OR sm.date <= p_period_end)
  ) sdr,
  (
    SELECT
      SUM(m.calls) as total_calls,
      SUM(m.sales) as total_sales,
      SUM(m.revenue) as total_revenue,
      SUM(COALESCE(m.entries, 0)) as total_entries
    FROM metrics m
    WHERE m.funnel_id = p_funnel_id
      AND (p_period_start IS NULL OR m.period_start >= p_period_start)
      AND (p_period_end IS NULL OR m.period_end <= p_period_end)
  ) closer_m;
$function$;

-- =============================================================================
-- 6. get_sales_by_person_and_product
-- Closer data vem de metrics, SDR data vem de sdr_metrics
-- =============================================================================
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
    -- Closers from metrics table
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

-- =============================================================================
-- 7. get_product_summary
-- Apenas de metrics (closer é quem registra produto na venda)
-- =============================================================================
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
      SUM(m.sales)::integer as total_sales,
      SUM(m.revenue)::numeric as total_revenue,
      SUM(COALESCE(m.entries, 0))::numeric as total_entries,
      SUM(m.calls)::integer as total_calls
    FROM metrics m
    JOIN products p ON m.product_id = p.id
    WHERE p.is_active = true
      AND m.product_id IS NOT NULL
      AND (p_period_start IS NULL OR m.period_start >= p_period_start)
      AND (p_period_end IS NULL OR m.period_end <= p_period_end)
    GROUP BY p.id, p.name
  ) product_data;
$function$;

-- =============================================================================
-- 8. Drop unique constraint on sdr_metrics to allow multiple entries per day
-- (same pattern as metrics table for closers)
-- =============================================================================
ALTER TABLE public.sdr_metrics DROP CONSTRAINT IF EXISTS sdr_metrics_sdr_id_date_funnel_key;
