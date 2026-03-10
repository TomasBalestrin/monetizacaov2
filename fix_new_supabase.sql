-- ============================================================
-- SQL CONSOLIDADO PARA O NOVO PROJETO SUPABASE
-- Contém todas as functions faltantes + triggers + policies
-- ============================================================

-- 1. ENUM (se não existir)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. CORE FUNCTIONS (usadas pelas RLS policies)
-- ============================================================

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

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

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

-- ============================================================
-- 3. TRIGGER FUNCTIONS
-- ============================================================

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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

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

-- ============================================================
-- 4. TRIGGERS (criar se não existirem)
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

-- ============================================================
-- 5. RPC FUNCTIONS (relatórios e métricas)
-- ============================================================

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
    'total_entries', COALESCE(closer.total_entries, 0),
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
  ) sdr;
$function$;

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
      COALESCE(closer.total_entries, 0) as total_entries,
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
        SUM(fdd.sales_value) as total_revenue,
        SUM(fdd.entries_value) as total_entries
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

CREATE OR REPLACE FUNCTION public.get_sales_by_person_and_product(p_period_start date DEFAULT NULL::date, p_period_end date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(row_data ORDER BY person_name, funnel_name), '[]'::json)
  FROM (
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
$function$;

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
$$;

-- ============================================================
-- 6. DROP FK fk_fdd_closer se existir
-- ============================================================
ALTER TABLE public.funnel_daily_data DROP CONSTRAINT IF EXISTS fk_fdd_closer;

-- ============================================================
-- 7. RELOAD SCHEMA CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';
