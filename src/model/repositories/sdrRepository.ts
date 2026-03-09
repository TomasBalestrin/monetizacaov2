import { supabase } from '@/integrations/supabase/client';
import type { SDR, SDRMetric, SDRAggregatedMetrics } from '@/model/entities/sdr';

export async function fetchSDRs(type?: 'sdr' | 'social_selling'): Promise<SDR[]> {
  let query = supabase
    .from('sdrs')
    .select('id, name, type, created_at, updated_at')
    .order('name');

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as SDR[];
}

export async function fetchSDRMetrics(
  sdrId: string,
  periodStart?: string,
  periodEnd?: string,
  funnel?: string | null,
  excludeEmptyFunnel?: boolean
): Promise<SDRMetric[]> {
  let query = supabase
    .from('sdr_metrics')
    .select('id, sdr_id, date, funnel, activated, scheduled, scheduled_follow_up, scheduled_rate, scheduled_same_day, attended, attendance_rate, sales, conversion_rate, source, created_at, updated_at')
    .eq('sdr_id', sdrId)
    .order('date', { ascending: true });

  if (periodStart) {
    query = query.gte('date', periodStart);
  }
  if (periodEnd) {
    query = query.lte('date', periodEnd);
  }
  if (funnel) {
    query = query.eq('funnel', funnel);
  }
  if (excludeEmptyFunnel && !funnel) {
    query = query.neq('funnel', '');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as SDRMetric[];
}

export async function fetchSDRFunnels(sdrId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('sdr_funnels')
    .select('id, sdr_id, funnel_name, created_at')
    .eq('sdr_id', sdrId)
    .order('funnel_name');

  if (error) throw error;
  return (data || []).map(f => f.funnel_name);
}

export async function addSDRFunnel(sdrId: string, funnelName: string): Promise<unknown> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('sdr_funnels')
    .insert({ sdr_id: sdrId, funnel_name: funnelName, created_by: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSDRFunnel(sdrId: string, funnelName: string): Promise<void> {
  const { error } = await supabase
    .from('sdr_funnels')
    .delete()
    .eq('sdr_id', sdrId)
    .eq('funnel_name', funnelName);
  if (error) throw error;
}

export async function fetchSDRTotalMetrics(
  type: 'sdr' | 'social_selling',
  periodStart?: string,
  periodEnd?: string
): Promise<SDRAggregatedMetrics> {
  const { data, error } = await supabase.rpc('get_sdr_total_metrics', {
    p_type: type,
    p_period_start: periodStart || null,
    p_period_end: periodEnd || null,
  });

  if (error) throw error;

  const result = data as unknown as SDRAggregatedMetrics;
  return {
    totalActivated: Number(result.totalActivated) || 0,
    totalScheduled: Number(result.totalScheduled) || 0,
    avgScheduledRate: Number(result.avgScheduledRate) || 0,
    totalScheduledFollowUp: Number(result.totalScheduledFollowUp) || 0,
    totalScheduledSameDay: Number(result.totalScheduledSameDay) || 0,
    totalAttended: Number(result.totalAttended) || 0,
    avgAttendanceRate: Number(result.avgAttendanceRate) || 0,
    totalSales: Number(result.totalSales) || 0,
    avgConversionRate: Number(result.avgConversionRate) || 0,
  };
}

export async function fetchSDRsWithMetricsRaw(
  type: 'sdr' | 'social_selling',
  periodStart?: string,
  periodEnd?: string
): Promise<{ sdrs: SDR[]; metrics: SDRMetric[] }> {
  const { data: sdrs, error: sdrsError } = await supabase
    .from('sdrs')
    .select('id, name, type, created_at, updated_at')
    .eq('type', type)
    .order('name');

  if (sdrsError) throw sdrsError;
  if (!sdrs || sdrs.length === 0) return { sdrs: [], metrics: [] };

  const sdrIds = sdrs.map((s) => s.id);
  let query = supabase
    .from('sdr_metrics')
    .select('id, sdr_id, date, funnel, activated, scheduled, scheduled_follow_up, scheduled_rate, scheduled_same_day, attended, attendance_rate, sales, conversion_rate, source, created_at, updated_at')
    .in('sdr_id', sdrIds)
    .neq('funnel', '');

  if (periodStart) {
    query = query.gte('date', periodStart);
  }
  if (periodEnd) {
    query = query.lte('date', periodEnd);
  }

  const { data: allMetrics, error: metricsError } = await query;
  if (metricsError) throw metricsError;

  return {
    sdrs: sdrs as SDR[],
    metrics: (allMetrics || []) as SDRMetric[],
  };
}

export async function createSDRMetric(metric: {
  sdr_id: string;
  date: string;
  funnel: string;
  activated: number;
  scheduled: number;
  scheduled_follow_up: number;
  scheduled_same_day: number;
  attended: number;
  sales: number;
  source: string;
  scheduled_rate: number;
  attendance_rate: number;
  conversion_rate: number;
  created_by?: string;
}): Promise<unknown> {
  const { data, error } = await supabase
    .from('sdr_metrics')
    .upsert(metric, { onConflict: 'sdr_id,date,funnel' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSDRMetric(
  id: string,
  updates: Record<string, unknown>
): Promise<unknown> {
  const { data, error } = await supabase
    .from('sdr_metrics')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function incrementSdrAttended(
  sdrId: string,
  date: string,
  funnelName: string,
  addSales: number
): Promise<void> {
  // Check if a record already exists for this sdr/date/funnel
  const { data: existing, error: fetchError } = await supabase
    .from('sdr_metrics')
    .select('id, attended, sales')
    .eq('sdr_id', sdrId)
    .eq('date', date)
    .eq('funnel', funnelName)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    // Increment attended and sales on existing record
    const { error } = await supabase
      .from('sdr_metrics')
      .update({
        attended: (existing.attended || 0) + 1,
        sales: (existing.sales || 0) + addSales,
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    // Create minimal record — SDR will fill in activated/scheduled later
    const { error } = await supabase
      .from('sdr_metrics')
      .insert({
        sdr_id: sdrId,
        date,
        funnel: funnelName,
        activated: 0,
        scheduled: 0,
        scheduled_follow_up: 0,
        scheduled_same_day: 0,
        attended: 1,
        sales: addSales,
        source: 'scheduled_call',
        scheduled_rate: 0,
        attendance_rate: 0,
        conversion_rate: 0,
      });

    if (error) throw error;
  }
}

export async function deleteSDRMetric(id: string): Promise<void> {
  const { error } = await supabase
    .from('sdr_metrics')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
