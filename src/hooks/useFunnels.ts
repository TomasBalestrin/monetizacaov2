import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Funnel {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FunnelSummary {
  funnel_id: string;
  funnel_name: string;
  category: string | null;
  total_leads: number;
  total_qualified: number;
  total_calls_scheduled: number;
  total_calls_done: number;
  total_sales: number;
  total_revenue: number;
  leads_to_qualified_rate: number;
  conversion_rate: number;
}

export interface FunnelReport {
  funnel_id: string;
  funnel_name: string;
  total_leads: number;
  total_qualified: number;
  total_calls_scheduled: number;
  total_calls_done: number;
  total_sales: number;
  total_revenue: number;
  leads_to_qualified_rate: number;
  qualified_to_scheduled_rate: number;
  scheduled_to_done_rate: number;
  done_to_sales_rate: number;
}

export interface FunnelDailyData {
  id: string;
  user_id: string;
  funnel_id: string;
  date: string;
  calls_scheduled: number;
  calls_done: number;
  sales_count: number;
  sales_value: number;
  sdr_id: string | null;
  leads_count: number;
  qualified_count: number;
  created_at: string;
  created_by: string | null;
}

// Fetch all active funnels
export function useFunnels() {
  return useQuery({
    queryKey: ['funnels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Funnel[];
    },
  });
}

// Fetch funnels assigned to a specific user (closer/sdr)
export function useUserFunnels(userId?: string) {
  return useQuery({
    queryKey: ['user-funnels', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_funnels')
        .select('funnel_id, funnels(id, name, category, is_active)')
        .eq('user_id', userId);
      if (error) throw error;
      return (data || [])
        .map((uf: any) => uf.funnels as Funnel)
        .filter((f: Funnel | null) => f && f.is_active);
    },
    enabled: !!userId,
  });
}

// Summary of all funnels for a period (RPC)
export function useAllFunnelsSummary(periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['funnels-summary', periodStart, periodEnd],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_funnels_summary', {
        p_period_start: periodStart || null,
        p_period_end: periodEnd || null,
      });
      if (error) throw error;
      return (data as unknown as FunnelSummary[]) || [];
    },
  });
}

// Detailed report for a single funnel (RPC)
export function useFunnelReport(funnelId?: string, periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['funnel-report', funnelId, periodStart, periodEnd],
    queryFn: async () => {
      if (!funnelId) return null;
      const { data, error } = await supabase.rpc('get_funnel_report', {
        p_funnel_id: funnelId,
        p_period_start: periodStart || null,
        p_period_end: periodEnd || null,
      });
      if (error) throw error;
      return data as unknown as FunnelReport;
    },
    enabled: !!funnelId,
  });
}

// Fetch funnel daily data for a closer
export function useCloserFunnelData(closerId?: string, funnelId?: string, periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['closer-funnel-data', closerId, funnelId, periodStart, periodEnd],
    queryFn: async () => {
      if (!closerId) return [];
      let query = supabase
        .from('funnel_daily_data')
        .select('*')
        .eq('user_id', closerId)
        .order('date', { ascending: false });

      if (funnelId) query = query.eq('funnel_id', funnelId);
      if (periodStart) query = query.gte('date', periodStart);
      if (periodEnd) query = query.lte('date', periodEnd);

      const { data, error } = await query;
      if (error) throw error;
      return data as FunnelDailyData[];
    },
    enabled: !!closerId,
  });
}

// Create funnel daily data (batch)
export function useCreateFunnelDailyData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: {
      user_id: string;
      funnel_id: string;
      date: string;
      calls_scheduled?: number;
      calls_done?: number;
      sales_count?: number;
      sales_value?: number;
      sdr_id?: string | null;
      leads_count?: number;
      qualified_count?: number;
    }[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      const rows = records.map(r => ({ ...r, created_by: user?.id }));
      const { data, error } = await supabase
        .from('funnel_daily_data')
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-funnel-data'] });
      queryClient.invalidateQueries({ queryKey: ['funnels-summary'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-report'] });
      toast.success('Dados salvos com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating funnel data:', error);
      toast.error('Erro ao salvar dados do funil');
    },
  });
}

// Sales by person and product (RPC)
export interface PersonProductSales {
  person_id: string;
  person_name: string;
  person_type: string;
  funnel_id: string | null;
  funnel_name: string;
  total_sales: number;
  total_revenue: number;
  total_leads: number;
  total_qualified: number;
  total_scheduled: number;
  total_done: number;
  total_entries: number;
}

export function useSalesByPersonAndProduct(periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['sales-by-person-product', periodStart, periodEnd],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sales_by_person_and_product', {
        p_period_start: periodStart || null,
        p_period_end: periodEnd || null,
      });
      if (error) throw error;
      return (data as unknown as PersonProductSales[]) || [];
    },
  });
}

// Delete funnel daily data
export function useDeleteFunnelDailyData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('funnel_daily_data')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-funnel-data'] });
      queryClient.invalidateQueries({ queryKey: ['funnels-summary'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-report'] });
      toast.success('Registro removido!');
    },
    onError: () => {
      toast.error('Erro ao remover registro');
    },
  });
}
