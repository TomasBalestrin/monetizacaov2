-- Update get_sdr_total_metrics to include Funil Intensivo columns
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
    END,
    'totalFiCalled', COALESCE(SUM(sm.fi_called), 0),
    'totalFiAwaiting', COALESCE(SUM(sm.fi_awaiting), 0),
    'totalFiReceivedLink', COALESCE(SUM(sm.fi_received_link), 0),
    'totalFiGotTicket', COALESCE(SUM(sm.fi_got_ticket), 0),
    'totalFiAttended', COALESCE(SUM(sm.fi_attended), 0),
    'avgFiAttendanceRate', CASE
      WHEN COALESCE(SUM(sm.fi_got_ticket), 0) > 0
      THEN ROUND((COALESCE(SUM(sm.fi_attended), 0)::numeric / SUM(sm.fi_got_ticket)) * 100, 2)
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
