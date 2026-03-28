import { supabase } from '@/integrations/supabase/client';
import type { SDR, SDRMetric, SDRAggregatedMetrics } from '@/model/entities/sdr';

export async function fetchSDRs(type?: 'sdr' | 'social_selling' | 'funil_intensivo'): Promise<SDR[]> {
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
    .select('id, sdr_id, date, funnel, activated, scheduled, scheduled_follow_up, scheduled_rate, scheduled_same_day, attended, attendance_rate, sales, revenue, entries, conversion_rate, source, created_at, updated_at, fi_called, fi_awaiting, fi_received_link, fi_got_ticket, fi_attended, fi_attendance_rate')
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

export async function fetchSDRFunnelsWithDates(sdrId: string): Promise<{ funnel_name: string; event_date: string | null }[]> {
  const { data, error } = await supabase
    .from('sdr_funnels')
    .select('funnel_name, event_date')
    .eq('sdr_id', sdrId)
    .order('event_date', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data || []) as { funnel_name: string; event_date: string | null }[];
}

export async function addSDRFunnel(sdrId: string, funnelName: string, eventDate?: string): Promise<unknown> {
  const { data: { user } } = await supabase.auth.getUser();
  const insertData: Record<string, unknown> = {
    sdr_id: sdrId,
    funnel_name: funnelName,
    created_by: user?.id,
  };
  if (eventDate) insertData.event_date = eventDate;

  const { data, error } = await supabase
    .from('sdr_funnels')
    .insert(insertData as any)
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
  type: 'sdr' | 'social_selling' | 'funil_intensivo',
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
    totalRevenue: Number((result as any).totalRevenue) || 0,
    totalEntries: Number((result as any).totalEntries) || 0,
    avgConversionRate: Number(result.avgConversionRate) || 0,
    totalFiCalled: Number((result as any).totalFiCalled) || 0,
    totalFiAwaiting: Number((result as any).totalFiAwaiting) || 0,
    totalFiReceivedLink: Number((result as any).totalFiReceivedLink) || 0,
    totalFiGotTicket: Number((result as any).totalFiGotTicket) || 0,
    totalFiAttended: Number((result as any).totalFiAttended) || 0,
    avgFiAttendanceRate: Number((result as any).avgFiAttendanceRate) || 0,
  };
}

export async function fetchSDRsWithMetricsRaw(
  type: 'sdr' | 'social_selling' | 'funil_intensivo',
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
    .select('id, sdr_id, date, funnel, activated, scheduled, scheduled_follow_up, scheduled_rate, scheduled_same_day, attended, attendance_rate, sales, revenue, entries, conversion_rate, source, created_at, updated_at, fi_called, fi_awaiting, fi_received_link, fi_got_ticket, fi_attended, fi_attendance_rate')
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
  fi_called?: number;
  fi_awaiting?: number;
  fi_received_link?: number;
  fi_got_ticket?: number;
  fi_attended?: number;
  fi_attendance_rate?: number;
}): Promise<unknown> {
  const { data, error } = await supabase
    .from('sdr_metrics')
    .insert(metric)
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
  funnelName: string
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('sdr_metrics')
    .select('id, attended')
    .eq('sdr_id', sdrId)
    .eq('date', date)
    .eq('funnel', funnelName)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    const { error } = await supabase
      .from('sdr_metrics')
      .update({
        attended: (existing.attended || 0) + 1,
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
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
        sales: 0,
        source: 'scheduled_call',
        scheduled_rate: 0,
        attendance_rate: 0,
        conversion_rate: 0,
      });

    if (error) throw error;
  }
}

export async function incrementSdrSales(
  sdrId: string,
  date: string,
  funnelName: string,
  addSales: number,
  addRevenue: number = 0,
  addEntries: number = 0
): Promise<void> {
  if (addSales <= 0 && addRevenue <= 0 && addEntries <= 0) return;

  const { data: existing, error: fetchError } = await supabase
    .from('sdr_metrics')
    .select('id, sales, revenue, entries')
    .eq('sdr_id', sdrId)
    .eq('date', date)
    .eq('funnel', funnelName)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    const { error } = await supabase
      .from('sdr_metrics')
      .update({
        sales: (existing.sales || 0) + addSales,
        revenue: (existing.revenue || 0) + addRevenue,
        entries: (existing.entries || 0) + addEntries,
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
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
        attended: 0,
        sales: addSales,
        revenue: addRevenue,
        entries: addEntries,
        source: 'manual',
        scheduled_rate: 0,
        attendance_rate: 0,
        conversion_rate: 0,
      });
    if (error) throw error;
  }
}

export async function decrementSdrSales(
  sdrId: string,
  date: string,
  funnelName: string,
  removeSales: number,
  removeRevenue: number = 0,
  removeEntries: number = 0
): Promise<void> {
  if (removeSales <= 0 && removeRevenue <= 0 && removeEntries <= 0) return;

  const { data: existing, error: fetchError } = await supabase
    .from('sdr_metrics')
    .select('id, sales, revenue, entries')
    .eq('sdr_id', sdrId)
    .eq('date', date)
    .eq('funnel', funnelName)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) return;

  const newSales = Math.max(0, (existing.sales || 0) - removeSales);
  const newRevenue = Math.max(0, (Number(existing.revenue) || 0) - removeRevenue);
  const newEntries = Math.max(0, (Number(existing.entries) || 0) - removeEntries);

  const { error } = await supabase
    .from('sdr_metrics')
    .update({
      sales: newSales,
      revenue: newRevenue,
      entries: newEntries,
    })
    .eq('id', existing.id);
  if (error) throw error;
}

/**
 * Recalcula sales/revenue/entries no sdr_metrics a partir dos dados reais
 * nas tabelas metrics e funnel_daily_data. Substitui o padrão frágil de
 * increment/decrement que falhava quando um increment era perdido.
 */
export async function recalculateSdrSales(
  sdrId: string,
  date: string,
  funnelName: string,
  funnelId?: string | null
): Promise<void> {
  // Look up funnelId from name if not provided
  if (!funnelId && funnelName) {
    const { data: funnel } = await supabase
      .from('funnels')
      .select('id')
      .eq('name', funnelName)
      .maybeSingle();
    funnelId = funnel?.id ?? null;
  }

  let totalSales = 0;
  let totalRevenue = 0;
  let totalEntries = 0;

  if (funnelId) {
    // Sum from metrics table (SquadMetricsDialog, MetricsDialog, FinishCallDialog)
    const { data: metricsData } = await supabase
      .from('metrics')
      .select('sales, revenue, entries')
      .eq('sdr_id', sdrId)
      .eq('period_start', date)
      .eq('funnel_id', funnelId);

    if (metricsData) {
      for (const m of metricsData) {
        totalSales += m.sales || 0;
        totalRevenue += Number(m.revenue) || 0;
        totalEntries += Number(m.entries) || 0;
      }
    }

    // Sum from funnel_daily_data table (CloserFunnelForm)
    const { data: funnelData } = await supabase
      .from('funnel_daily_data')
      .select('sales_count, sales_value, entries_value')
      .eq('sdr_id', sdrId)
      .eq('date', date)
      .eq('funnel_id', funnelId);

    if (funnelData) {
      for (const f of funnelData) {
        totalSales += f.sales_count || 0;
        totalRevenue += Number(f.sales_value) || 0;
        totalEntries += Number(f.entries_value) || 0;
      }
    }
  }

  // Upsert sdr_metrics (only sales/revenue/entries — never touch attended, activated, etc.)
  const { data: existing } = await supabase
    .from('sdr_metrics')
    .select('id')
    .eq('sdr_id', sdrId)
    .eq('date', date)
    .eq('funnel', funnelName)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('sdr_metrics')
      .update({
        sales: totalSales,
        revenue: totalRevenue,
        entries: totalEntries,
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else if (totalSales > 0 || totalRevenue > 0 || totalEntries > 0) {
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
        attended: 0,
        sales: totalSales,
        revenue: totalRevenue,
        entries: totalEntries,
        source: 'manual',
        scheduled_rate: 0,
        attendance_rate: 0,
        conversion_rate: 0,
      });
    if (error) throw error;
  }
}

/**
 * Retorna um mapa de closers por (date|funnel) para um SDR.
 * Usado para exibir a coluna "Closer Origem" na tabela do SDR.
 */
export async function fetchCloserNamesForSDR(
  sdrId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<Record<string, string[]>> {
  const closersByKey: Record<string, Set<string>> = {};

  // From metrics table (has closer_id with FK to closers)
  let metricsQuery = supabase
    .from('metrics')
    .select('period_start, sales, closer:closers(name), funnel:funnels(name)')
    .eq('sdr_id', sdrId)
    .gt('sales', 0);
  if (periodStart) metricsQuery = metricsQuery.gte('period_start', periodStart);
  if (periodEnd) metricsQuery = metricsQuery.lte('period_start', periodEnd);

  const { data: metricsData } = await metricsQuery;
  for (const m of metricsData || []) {
    const closerName = (m.closer as any)?.name;
    const funnelName = (m.funnel as any)?.name || '';
    if (closerName) {
      const key = `${m.period_start}|${funnelName}`;
      if (!closersByKey[key]) closersByKey[key] = new Set();
      closersByKey[key].add(closerName);
    }
  }

  // From funnel_daily_data (user_id → closers, no direct FK hint available)
  let fddQuery = supabase
    .from('funnel_daily_data')
    .select('date, user_id, sales_count, funnel:funnels(name)')
    .eq('sdr_id', sdrId)
    .gt('sales_count', 0);
  if (periodStart) fddQuery = fddQuery.gte('date', periodStart);
  if (periodEnd) fddQuery = fddQuery.lte('date', periodEnd);

  const { data: fddData } = await fddQuery;
  if (fddData && fddData.length > 0) {
    const userIds = [...new Set(fddData.map(f => f.user_id))];
    const { data: closers } = await supabase
      .from('closers')
      .select('id, name')
      .in('id', userIds);
    const closerMap: Record<string, string> = {};
    for (const c of closers || []) closerMap[c.id] = c.name;

    for (const f of fddData) {
      const closerName = closerMap[f.user_id];
      const funnelName = (f.funnel as any)?.name || '';
      if (closerName) {
        const key = `${f.date}|${funnelName}`;
        if (!closersByKey[key]) closersByKey[key] = new Set();
        closersByKey[key].add(closerName);
      }
    }
  }

  // Convert Sets to arrays
  const result: Record<string, string[]> = {};
  for (const [key, names] of Object.entries(closersByKey)) {
    result[key] = [...names];
  }
  return result;
}

export async function deleteSDRMetric(id: string): Promise<void> {
  const { error } = await supabase
    .from('sdr_metrics')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function createSDR(name: string, type: 'sdr' | 'social_selling' | 'funil_intensivo'): Promise<SDR> {
  const { data, error } = await supabase
    .from('sdrs')
    .insert({ name, type })
    .select('id, name, type, created_at, updated_at')
    .single();

  if (error) throw error;
  return data as SDR;
}
