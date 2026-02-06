import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SDR {
  id: string;
  name: string;
  type: 'sdr' | 'social_selling';
  created_at: string;
  updated_at: string;
}

export interface SDRMetric {
  id: string;
  sdr_id: string;
  date: string;
  funnel: string | null;
  activated: number;
  scheduled: number;
  scheduled_rate: number;
  scheduled_same_day: number;
  attended: number;
  attendance_rate: number;
  sales: number;
  conversion_rate: number;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface SDRAggregatedMetrics {
  totalActivated: number;
  totalScheduled: number;
  avgScheduledRate: number;
  totalScheduledSameDay: number;
  totalAttended: number;
  avgAttendanceRate: number;
  totalSales: number;
  avgConversionRate: number;
}

export interface SDRWithMetrics extends SDR {
  metrics: SDRAggregatedMetrics;
}

// Fetch all SDRs filtered by type
export function useSDRs(type?: 'sdr' | 'social_selling') {
  return useQuery({
    queryKey: ['sdrs', type],
    queryFn: async () => {
      let query = supabase
        .from('sdrs')
        .select('*')
        .order('name');

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SDR[];
    },
  });
}

// Fetch metrics for a specific SDR within a period, optionally filtered by funnel
export function useSDRMetrics(
  sdrId?: string,
  periodStart?: string,
  periodEnd?: string,
  funnel?: string | null
) {
  return useQuery({
    queryKey: ['sdr-metrics', sdrId, periodStart, periodEnd, funnel],
    queryFn: async () => {
      if (!sdrId) return [];

      let query = supabase
        .from('sdr_metrics')
        .select('*')
        .eq('sdr_id', sdrId)
        .order('date', { ascending: true });

      if (periodStart) {
        query = query.gte('date', periodStart);
      }
      if (periodEnd) {
        query = query.lte('date', periodEnd);
      }
      // Filter by specific funnel if provided
      if (funnel) {
        query = query.eq('funnel', funnel);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SDRMetric[];
    },
    enabled: !!sdrId,
  });
}

// Fetch list of unique funnels for a specific SDR
export function useSDRFunnels(sdrId?: string) {
  return useQuery({
    queryKey: ['sdr-funnels', sdrId],
    queryFn: async () => {
      if (!sdrId) return [];

      const { data, error } = await supabase
        .from('sdr_metrics')
        .select('funnel')
        .eq('sdr_id', sdrId)
        .neq('funnel', '');

      if (error) throw error;

      // Return unique funnel names
      const uniqueFunnels = [...new Set(data?.map((m) => m.funnel).filter(Boolean))] as string[];
      return uniqueFunnels.sort();
    },
    enabled: !!sdrId,
  });
}

// Calculate aggregated metrics from an array of metrics
function calculateAggregatedMetrics(metrics: SDRMetric[]): SDRAggregatedMetrics {
  if (metrics.length === 0) {
    return {
      totalActivated: 0,
      totalScheduled: 0,
      avgScheduledRate: 0,
      totalScheduledSameDay: 0,
      totalAttended: 0,
      avgAttendanceRate: 0,
      totalSales: 0,
      avgConversionRate: 0,
    };
  }

  const totalActivated = metrics.reduce((sum, m) => sum + (m.activated || 0), 0);
  const totalScheduled = metrics.reduce((sum, m) => sum + (m.scheduled || 0), 0);
  const totalScheduledSameDay = metrics.reduce((sum, m) => sum + (m.scheduled_same_day || 0), 0);
  const totalAttended = metrics.reduce((sum, m) => sum + (m.attended || 0), 0);
  const totalSales = metrics.reduce((sum, m) => sum + (m.sales || 0), 0);

  // Calculate rates dynamically
  const avgScheduledRate = totalActivated > 0 ? (totalScheduled / totalActivated) * 100 : 0;
  const avgAttendanceRate = totalScheduledSameDay > 0 ? (totalAttended / totalScheduledSameDay) * 100 : 0;
  const avgConversionRate = totalAttended > 0 ? (totalSales / totalAttended) * 100 : 0;

  return {
    totalActivated,
    totalScheduled,
    avgScheduledRate,
    totalScheduledSameDay,
    totalAttended,
    avgAttendanceRate,
    totalSales,
    avgConversionRate,
  };
}

// Fetch aggregated metrics for all SDRs of a given type
export function useSDRTotalMetrics(
  type: 'sdr' | 'social_selling',
  periodStart?: string,
  periodEnd?: string
) {
  return useQuery({
    queryKey: ['sdr-total-metrics', type, periodStart, periodEnd],
    queryFn: async () => {
      // First get all SDRs of the given type
      const { data: sdrs, error: sdrsError } = await supabase
        .from('sdrs')
        .select('id')
        .eq('type', type);

      if (sdrsError) throw sdrsError;

      if (!sdrs || sdrs.length === 0) {
        return {
          totalActivated: 0,
          totalScheduled: 0,
          avgScheduledRate: 0,
          totalScheduledSameDay: 0,
          totalAttended: 0,
          avgAttendanceRate: 0,
          totalSales: 0,
          avgConversionRate: 0,
        } as SDRAggregatedMetrics;
      }

      const sdrIds = sdrs.map((s) => s.id);

      // Then get all metrics for those SDRs (only those with funnel identified)
      let query = supabase
        .from('sdr_metrics')
        .select('*')
        .in('sdr_id', sdrIds)
        .neq('funnel', '');

      if (periodStart) {
        query = query.gte('date', periodStart);
      }
      if (periodEnd) {
        query = query.lte('date', periodEnd);
      }

      const { data: metrics, error: metricsError } = await query;
      if (metricsError) throw metricsError;

      return calculateAggregatedMetrics(metrics as SDRMetric[]);
    },
  });
}

// Fetch SDRs with their aggregated metrics
export function useSDRsWithMetrics(
  type: 'sdr' | 'social_selling',
  periodStart?: string,
  periodEnd?: string
) {
  return useQuery({
    queryKey: ['sdrs-with-metrics', type, periodStart, periodEnd],
    queryFn: async () => {
      // Get all SDRs of the given type
      const { data: sdrs, error: sdrsError } = await supabase
        .from('sdrs')
        .select('*')
        .eq('type', type)
        .order('name');

      if (sdrsError) throw sdrsError;

      if (!sdrs || sdrs.length === 0) {
        return [] as SDRWithMetrics[];
      }

      // Get all metrics for those SDRs in a single query (only those with funnel identified)
      const sdrIds = sdrs.map((s) => s.id);
      let query = supabase
        .from('sdr_metrics')
        .select('*')
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

      // Group metrics by SDR and calculate aggregated values
      const result: SDRWithMetrics[] = sdrs.map((sdr) => {
        const sdrMetrics = (allMetrics || []).filter((m) => m.sdr_id === sdr.id) as SDRMetric[];
        return {
          ...sdr,
          type: sdr.type as 'sdr' | 'social_selling',
          metrics: calculateAggregatedMetrics(sdrMetrics),
        };
      });

      return result;
    },
  });
}

// Create SDR metric
export function useCreateSDRMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metric: {
      sdr_id: string;
      date: string;
      funnel: string | null;
      activated: number;
      scheduled: number;
      scheduled_same_day: number;
      attended: number;
      sales: number;
      source: string;
    }) => {
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      // Calculate rates
      const scheduled_rate = metric.activated > 0 
        ? (metric.scheduled / metric.activated) * 100 
        : 0;
      const attendance_rate = metric.scheduled_same_day > 0 
        ? (metric.attended / metric.scheduled_same_day) * 100 
        : 0;
      const conversion_rate = metric.attended > 0 
        ? (metric.sales / metric.attended) * 100 
        : 0;

      const { data, error } = await supabase
        .from('sdr_metrics')
        .upsert({
          ...metric,
          funnel: metric.funnel || '',
          scheduled_rate,
          attendance_rate,
          conversion_rate,
          created_by: user?.id,
        }, {
          onConflict: 'sdr_id,date,funnel',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sdr-total-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sdrs-with-metrics'] });
    },
    onError: (error) => {
      console.error('Error creating SDR metric:', error);
      toast.error('Erro ao criar métrica');
    },
  });
}

// Update SDR metric
export function useUpdateSDRMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      date?: string;
      funnel?: string | null;
      activated?: number;
      scheduled?: number;
      scheduled_same_day?: number;
      attended?: number;
      sales?: number;
    }) => {
      // Calculate rates if metrics are being updated
      const calculatedRates: Record<string, number> = {};
      
      if (updates.activated !== undefined && updates.scheduled !== undefined) {
        calculatedRates.scheduled_rate = updates.activated > 0 
          ? (updates.scheduled / updates.activated) * 100 
          : 0;
      }
      if (updates.scheduled_same_day !== undefined && updates.attended !== undefined) {
        calculatedRates.attendance_rate = updates.scheduled_same_day > 0 
          ? (updates.attended / updates.scheduled_same_day) * 100 
          : 0;
      }
      if (updates.attended !== undefined && updates.sales !== undefined) {
        calculatedRates.conversion_rate = updates.attended > 0 
          ? (updates.sales / updates.attended) * 100 
          : 0;
      }

      if (updates.funnel === null || updates.funnel === undefined) {
        updates.funnel = '';
      }

      const { data, error } = await supabase
        .from('sdr_metrics')
        .update({ ...updates, ...calculatedRates })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sdr-total-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sdrs-with-metrics'] });
      toast.success('Métrica atualizada!');
    },
    onError: (error) => {
      console.error('Error updating SDR metric:', error);
      toast.error('Erro ao atualizar métrica');
    },
  });
}

// Delete SDR metric
export function useDeleteSDRMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sdr_metrics')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sdr-total-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sdrs-with-metrics'] });
      toast.success('Métrica removida!');
    },
    onError: (error) => {
      console.error('Error deleting SDR metric:', error);
      toast.error('Erro ao remover métrica');
    },
  });
}
