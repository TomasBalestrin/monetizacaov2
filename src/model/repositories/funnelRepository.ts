import { supabase } from '@/integrations/supabase/client';
import type { Funnel, FunnelSummary, FunnelReport, FunnelDailyData, PersonProductSales } from '@/model/entities/funnel';

export async function fetchFunnels(): Promise<Funnel[]> {
  const { data, error } = await supabase
    .from('funnels')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data as Funnel[];
}

export async function fetchAllFunnelsIncludingInactive(): Promise<Funnel[]> {
  const { data, error } = await supabase
    .from('funnels')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as Funnel[];
}

export async function createFunnel(name: string, category?: string): Promise<Funnel> {
  const { data, error } = await supabase
    .from('funnels')
    .insert({ name, category: category || null, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data as Funnel;
}

export async function updateFunnel(id: string, updates: { name?: string; category?: string | null; is_active?: boolean }): Promise<Funnel> {
  const { data, error } = await supabase
    .from('funnels')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Funnel;
}

export async function deleteFunnel(id: string): Promise<void> {
  const { error } = await supabase
    .from('funnels')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function fetchUserFunnels(userId: string): Promise<Funnel[]> {
  const { data, error } = await supabase
    .from('user_funnels')
    .select('funnel_id, funnels(id, name, category, is_active)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || [])
    .map((uf: any) => uf.funnels as Funnel)
    .filter((f: Funnel | null) => f && f.is_active);
}

export async function fetchAllFunnelsSummary(
  periodStart?: string,
  periodEnd?: string
): Promise<FunnelSummary[]> {
  const { data, error } = await supabase.rpc('get_all_funnels_summary', {
    p_period_start: periodStart || null,
    p_period_end: periodEnd || null,
  });
  if (error) throw error;
  return (data as unknown as FunnelSummary[]) || [];
}

export async function fetchFunnelReport(
  funnelId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<FunnelReport | null> {
  const { data, error } = await supabase.rpc('get_funnel_report', {
    p_funnel_id: funnelId,
    p_period_start: periodStart || null,
    p_period_end: periodEnd || null,
  });
  if (error) throw error;
  return data as unknown as FunnelReport;
}

export async function fetchCloserFunnelData(
  closerId: string,
  funnelId?: string,
  periodStart?: string,
  periodEnd?: string
): Promise<FunnelDailyData[]> {
  let query = supabase
    .from('funnel_daily_data')
    .select('*, funnel:funnels(id, name), sdr:sdrs(id, name, type)')
    .eq('user_id', closerId)
    .order('date', { ascending: false });

  if (funnelId) query = query.eq('funnel_id', funnelId);
  if (periodStart) query = query.gte('date', periodStart);
  if (periodEnd) query = query.lte('date', periodEnd);

  const { data, error } = await query;
  if (error) throw error;
  return data as FunnelDailyData[];
}

export async function createFunnelDailyData(records: {
  user_id: string;
  funnel_id: string;
  date: string;
  calls_scheduled?: number;
  calls_done?: number;
  sales_count?: number;
  sales_value?: number;
  entries_value?: number;
  sdr_id?: string | null;
  leads_count?: number;
  qualified_count?: number;
}[]): Promise<unknown[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const rows = records.map(r => ({ ...r, created_by: user?.id }));
  const { data, error } = await supabase
    .from('funnel_daily_data')
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

export async function fetchSalesByPersonAndProduct(
  periodStart?: string,
  periodEnd?: string
): Promise<PersonProductSales[]> {
  const { data, error } = await supabase.rpc('get_sales_by_person_and_product', {
    p_period_start: periodStart || null,
    p_period_end: periodEnd || null,
  });
  if (error) throw error;
  return (data as unknown as PersonProductSales[]) || [];
}

export async function deleteFunnelDailyData(id: string): Promise<void> {
  const { error } = await supabase
    .from('funnel_daily_data')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
