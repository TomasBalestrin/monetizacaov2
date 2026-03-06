
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
