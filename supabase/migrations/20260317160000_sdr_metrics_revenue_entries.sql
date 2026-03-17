-- Add revenue and entries columns to sdr_metrics for closer sale attribution
ALTER TABLE public.sdr_metrics
  ADD COLUMN IF NOT EXISTS revenue NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entries NUMERIC DEFAULT 0;

-- Update RPC to include revenue and entries in totals
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
    'totalRevenue', COALESCE(SUM(sm.revenue), 0),
    'totalEntries', COALESCE(SUM(sm.entries), 0),
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

-- Backfill: sync revenue/entries from closer metrics to existing sdr_metrics
-- Step 1: Update existing sdr_metrics rows that already match (sdr_id + date + funnel)
UPDATE public.sdr_metrics sm
SET
  revenue = COALESCE(sm.revenue, 0) + agg.total_revenue,
  entries = COALESCE(sm.entries, 0) + agg.total_entries
FROM (
  SELECT
    m.sdr_id,
    m.period_start AS date,
    COALESCE(f.name, '') AS funnel_name,
    SUM(m.revenue) AS total_revenue,
    SUM(m.entries) AS total_entries
  FROM public.metrics m
  LEFT JOIN public.funnels f ON m.funnel_id = f.id
  WHERE m.sdr_id IS NOT NULL
    AND (m.revenue > 0 OR m.entries > 0)
  GROUP BY m.sdr_id, m.period_start, COALESCE(f.name, '')
) agg
WHERE sm.sdr_id = agg.sdr_id
  AND sm.date = agg.date
  AND sm.funnel = agg.funnel_name
  AND sm.revenue = 0
  AND sm.entries = 0;

-- Step 2: Insert new sdr_metrics rows for closer sales that have no matching SDR row yet
INSERT INTO public.sdr_metrics (sdr_id, date, funnel, activated, scheduled, scheduled_follow_up, scheduled_same_day, attended, sales, revenue, entries, source, scheduled_rate, attendance_rate, conversion_rate)
SELECT
  agg.sdr_id,
  agg.date,
  agg.funnel_name,
  0, 0, 0, 0, 0,
  agg.total_sales,
  agg.total_revenue,
  agg.total_entries,
  'manual',
  0, 0, 0
FROM (
  SELECT
    m.sdr_id,
    m.period_start AS date,
    COALESCE(f.name, '') AS funnel_name,
    SUM(m.sales) AS total_sales,
    SUM(m.revenue) AS total_revenue,
    SUM(m.entries) AS total_entries
  FROM public.metrics m
  LEFT JOIN public.funnels f ON m.funnel_id = f.id
  WHERE m.sdr_id IS NOT NULL
    AND (m.revenue > 0 OR m.entries > 0 OR m.sales > 0)
  GROUP BY m.sdr_id, m.period_start, COALESCE(f.name, '')
) agg
WHERE NOT EXISTS (
  SELECT 1 FROM public.sdr_metrics sm
  WHERE sm.sdr_id = agg.sdr_id
    AND sm.date = agg.date
    AND sm.funnel = agg.funnel_name
);
