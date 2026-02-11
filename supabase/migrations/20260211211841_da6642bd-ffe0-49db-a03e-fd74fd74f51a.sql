-- P3: RPC para agregação de métricas SDR (lógica no banco = mais rápido)
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