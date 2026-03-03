
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
