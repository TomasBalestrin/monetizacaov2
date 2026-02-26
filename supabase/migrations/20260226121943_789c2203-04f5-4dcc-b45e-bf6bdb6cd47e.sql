
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
