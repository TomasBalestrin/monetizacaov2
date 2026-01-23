import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateTrend } from '@/lib/workingDays';
export interface Squad {
  id: string;
  name: string;
  slug: string;
}

export interface Closer {
  id: string;
  name: string;
  squad_id: string;
  squad?: Squad;
}

export interface Metric {
  id: string;
  closer_id: string;
  period_start: string;
  period_end: string;
  calls: number;
  sales: number;
  revenue: number;
  entries: number;
  source: string;
  revenue_trend?: number;
  entries_trend?: number;
  cancellations?: number;
  cancellation_value?: number;
  cancellation_entries?: number;
  closer?: Closer;
}

// Individual closer metric record with all fields
export interface CloserMetricRecord {
  id: string;
  closer_id: string;
  period_start: string;
  period_end: string;
  calls: number;
  sales: number;
  revenue: number;
  entries: number;
  source: string;
  revenue_trend: number;
  entries_trend: number;
  cancellations: number;
  cancellation_value: number;
  cancellation_entries: number;
}

export interface SquadMetrics {
  squad: Squad;
  closers: {
    closer: Closer;
    metrics: {
      calls: number;
      sales: number;
      revenue: number;
      entries: number;
      revenueTrend: number;
      entriesTrend: number;
      conversion: number;
    };
  }[];
  totals: {
    calls: number;
    sales: number;
    revenue: number;
    entries: number;
    revenueTrend: number;
    entriesTrend: number;
    conversion: number;
  };
}

export function useSquads() {
  return useQuery({
    queryKey: ['squads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squads')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Squad[];
    },
  });
}

export function useClosers(squadId?: string) {
  return useQuery({
    queryKey: ['closers', squadId],
    queryFn: async () => {
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
    },
  });
}

export function useMetrics(periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['metrics', periodStart, periodEnd],
    queryFn: async () => {
      let query = supabase
        .from('metrics')
        .select('*, closer:closers(*, squad:squads(*))');
      
      if (periodStart) {
        query = query.gte('period_start', periodStart);
      }
      if (periodEnd) {
        query = query.lte('period_end', periodEnd);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Metric[];
    },
  });
}

// Hook for fetching individual closer metrics
export function useCloserMetrics(closerId: string, periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['closer-metrics', closerId, periodStart, periodEnd],
    queryFn: async () => {
      let query = supabase
        .from('metrics')
        .select('*')
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
    },
    enabled: !!closerId,
  });
}

export function useSquadMetrics(periodStart?: string, periodEnd?: string) {
  const { data: squads } = useSquads();
  const { data: metrics, isLoading, error } = useMetrics(periodStart, periodEnd);

  // Data de referência para cálculo da tendência
  const referenceDate = periodStart ? new Date(periodStart) : new Date();

  const squadMetrics: SquadMetrics[] = squads?.map(squad => {
    const squadCloserMetrics = metrics?.filter(m => m.closer?.squad_id === squad.id) || [];
    
    // Group by closer
    const closerMap = new Map<string, { closer: Closer; metrics: Metric[] }>();
    squadCloserMetrics.forEach(m => {
      if (!m.closer) return;
      const existing = closerMap.get(m.closer.id);
      if (existing) {
        existing.metrics.push(m);
      } else {
        closerMap.set(m.closer.id, { closer: m.closer, metrics: [m] });
      }
    });

    const closers = Array.from(closerMap.values()).map(({ closer, metrics }) => {
      const closerTotals = metrics.reduce(
        (acc, m) => ({
          calls: acc.calls + m.calls,
          sales: acc.sales + m.sales,
          revenue: acc.revenue + Number(m.revenue),
          entries: acc.entries + Number(m.entries),
        }),
        { calls: 0, sales: 0, revenue: 0, entries: 0 }
      );
      
      // Calcula tendência dinamicamente para cada closer
      const revenueTrend = calculateTrend(closerTotals.revenue, referenceDate);
      const entriesTrend = calculateTrend(closerTotals.entries, referenceDate);
      
      return {
        closer,
        metrics: {
          ...closerTotals,
          revenueTrend,
          entriesTrend,
          conversion: closerTotals.calls > 0 ? (closerTotals.sales / closerTotals.calls) * 100 : 0,
        },
      };
    });

    const totals = closers.reduce(
      (acc, c) => ({
        calls: acc.calls + c.metrics.calls,
        sales: acc.sales + c.metrics.sales,
        revenue: acc.revenue + c.metrics.revenue,
        entries: acc.entries + c.metrics.entries,
      }),
      { calls: 0, sales: 0, revenue: 0, entries: 0 }
    );

    // Calcula tendência dinamicamente para o squad
    const squadRevenueTrend = calculateTrend(totals.revenue, referenceDate);
    const squadEntriesTrend = calculateTrend(totals.entries, referenceDate);

    return {
      squad,
      closers,
      totals: {
        ...totals,
        revenueTrend: squadRevenueTrend,
        entriesTrend: squadEntriesTrend,
        conversion: totals.calls > 0 ? (totals.sales / totals.calls) * 100 : 0,
      },
    };
  }) || [];

  return { squadMetrics, isLoading, error, periodStart };
}

export function useTotalMetrics(periodStart?: string, periodEnd?: string) {
  const { squadMetrics, isLoading, error } = useSquadMetrics(periodStart, periodEnd);

  // Data de referência para cálculo da tendência total
  const referenceDate = periodStart ? new Date(periodStart) : new Date();

  const totals = squadMetrics.reduce(
    (acc, sm) => ({
      calls: acc.calls + sm.totals.calls,
      sales: acc.sales + sm.totals.sales,
      revenue: acc.revenue + sm.totals.revenue,
      entries: acc.entries + sm.totals.entries,
    }),
    { calls: 0, sales: 0, revenue: 0, entries: 0 }
  );

  // Calcula tendência dinamicamente para o total geral
  const revenueTrend = calculateTrend(totals.revenue, referenceDate);
  const entriesTrend = calculateTrend(totals.entries, referenceDate);

  return {
    totals: {
      ...totals,
      revenueTrend,
      entriesTrend,
      conversion: totals.calls > 0 ? (totals.sales / totals.calls) * 100 : 0,
    },
    squadMetrics,
    isLoading,
    error,
  };
}

export function useCreateMetric() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (metric: Omit<Metric, 'id' | 'closer'>) => {
      const { data, error } = await supabase
        .from('metrics')
        .insert(metric)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast({
        title: 'Métrica adicionada',
        description: 'A métrica foi salva com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar a métrica.',
      });
      console.error('Error creating metric:', error);
    },
  });
}

export function useUpdateMetric() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...metric }: Partial<Metric> & { id: string }) => {
      const { data, error } = await supabase
        .from('metrics')
        .update(metric)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast({
        title: 'Métrica atualizada',
        description: 'A métrica foi atualizada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar a métrica.',
      });
      console.error('Error updating metric:', error);
    },
  });
}

export function useDeleteMetric() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('metrics')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast({
        title: 'Métrica removida',
        description: 'A métrica foi removida com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível remover a métrica.',
      });
      console.error('Error deleting metric:', error);
    },
  });
}
