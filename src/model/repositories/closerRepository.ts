import { supabase } from '@/integrations/supabase/client';
import type { Squad, Closer, Metric, CloserMetricRecord, CreateMetricPayload } from '@/model/entities/closer';

export async function fetchSquads(): Promise<Squad[]> {
  const { data, error } = await supabase
    .from('squads')
    .select('id, name, slug')
    .order('name');

  if (error) throw error;
  return data as Squad[];
}

export async function fetchClosers(squadId?: string): Promise<Closer[]> {
  let query = supabase
    .from('closers')
    .select('*, squad:squads(*)')
    .order('name');

  if (squadId) {
    query = query.eq('squad_id', squadId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Closer[];
}

export async function fetchMetrics(periodStart?: string, periodEnd?: string): Promise<Metric[]> {
  let query = supabase
    .from('metrics')
    .select('id, closer_id, period_start, period_end, calls, sales, revenue, entries, source, revenue_trend, entries_trend, cancellations, cancellation_value, cancellation_entries, funnel_id, product_id, funnel:funnels(id, name), product:products(id, name), closer:closers(id, name, squad_id, squad:squads(id, name, slug))');

  if (periodStart) {
    query = query.gte('period_start', periodStart);
  }
  if (periodEnd) {
    query = query.lte('period_end', periodEnd);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Metric[];
}

export async function fetchCloserMetrics(
  closerId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<CloserMetricRecord[]> {
  let query = supabase
    .from('metrics')
    .select('id, closer_id, period_start, period_end, calls, sales, revenue, entries, source, revenue_trend, entries_trend, cancellations, cancellation_value, cancellation_entries, funnel_id, sdr_id, product_id, funnel:funnels(id, name), sdr:sdrs(id, name, type), product:products(id, name)')
    .eq('closer_id', closerId)
    .order('period_start', { ascending: true });

  if (periodStart) {
    query = query.gte('period_start', periodStart);
  }
  if (periodEnd) {
    query = query.lte('period_end', periodEnd);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as CloserMetricRecord[];
}

export async function fetchCloserMetricsByFunnel(
  closerId: string,
  funnelId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<CloserMetricRecord[]> {
  let query = supabase
    .from('metrics')
    .select('id, closer_id, period_start, period_end, calls, sales, revenue, entries, source, revenue_trend, entries_trend, cancellations, cancellation_value, cancellation_entries, funnel_id, sdr_id, product_id, funnel:funnels(id, name), sdr:sdrs(id, name, type), product:products(id, name)')
    .eq('closer_id', closerId)
    .eq('funnel_id', funnelId)
    .order('period_start', { ascending: true });

  if (periodStart) {
    query = query.gte('period_start', periodStart);
  }
  if (periodEnd) {
    query = query.lte('period_end', periodEnd);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as CloserMetricRecord[];
}

export async function createMetric(metric: CreateMetricPayload): Promise<Metric> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('metrics')
    .insert({
      ...metric,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMetric(id: string, updates: Partial<Metric>): Promise<Metric> {
  const { data, error } = await supabase
    .from('metrics')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMetric(id: string): Promise<void> {
  const { error } = await supabase
    .from('metrics')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
