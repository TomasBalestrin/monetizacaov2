import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as sdrRepo from '@/model/repositories/sdrRepository';
import { calculateSDRRates, calculatePartialSDRRates, groupMetricsBySDR, calculateAggregatedMetrics } from '@/model/services/sdrService';
import type { SDR, SDRMetric, SDRAggregatedMetrics, SDRWithMetrics } from '@/model/entities/sdr';

export function useSDRs(type?: 'sdr' | 'social_selling') {
  return useQuery({
    queryKey: ['sdrs', type],
    queryFn: () => sdrRepo.fetchSDRs(type),
  });
}

export function useSDRMetrics(
  sdrId?: string,
  periodStart?: string,
  periodEnd?: string,
  funnel?: string | null,
  excludeEmptyFunnel?: boolean
) {
  return useQuery({
    queryKey: ['sdr-metrics', sdrId, periodStart, periodEnd, funnel, excludeEmptyFunnel],
    queryFn: async () => {
      if (!sdrId) return [];
      return sdrRepo.fetchSDRMetrics(sdrId, periodStart, periodEnd, funnel, excludeEmptyFunnel);
    },
    enabled: !!sdrId,
  });
}

export function useSDRFunnels(sdrId?: string) {
  return useQuery({
    queryKey: ['sdr-funnels', sdrId],
    queryFn: async () => {
      if (!sdrId) return [];
      return sdrRepo.fetchSDRFunnels(sdrId);
    },
    enabled: !!sdrId,
  });
}

export function useAddSDRFunnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sdrId, funnelName }: { sdrId: string; funnelName: string }) => {
      return sdrRepo.addSDRFunnel(sdrId, funnelName);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-funnels', variables.sdrId] });
      toast.success('Funil adicionado!');
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('Este funil já existe para este SDR');
      } else {
        toast.error('Erro ao adicionar funil');
      }
    },
  });
}

export function useDeleteSDRFunnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sdrId, funnelName }: { sdrId: string; funnelName: string }) => {
      return sdrRepo.deleteSDRFunnel(sdrId, funnelName);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-funnels', variables.sdrId] });
      toast.success('Funil removido!');
    },
    onError: () => {
      toast.error('Erro ao remover funil');
    },
  });
}

export function useSDRTotalMetrics(
  type: 'sdr' | 'social_selling',
  periodStart?: string,
  periodEnd?: string
) {
  return useQuery({
    queryKey: ['sdr-total-metrics', type, periodStart, periodEnd],
    queryFn: () => sdrRepo.fetchSDRTotalMetrics(type, periodStart, periodEnd),
  });
}

export function useSDRsWithMetrics(
  type: 'sdr' | 'social_selling',
  periodStart?: string,
  periodEnd?: string
) {
  return useQuery({
    queryKey: ['sdrs-with-metrics', type, periodStart, periodEnd],
    queryFn: async () => {
      const { sdrs, metrics } = await sdrRepo.fetchSDRsWithMetricsRaw(type, periodStart, periodEnd);
      if (sdrs.length === 0) return [] as SDRWithMetrics[];
      return groupMetricsBySDR(sdrs, metrics);
    },
  });
}

export function useSDRsWithMetricsRaw(
  type: 'sdr' | 'social_selling',
  periodStart?: string,
  periodEnd?: string
) {
  return useQuery({
    queryKey: ['sdrs-with-metrics-raw', type, periodStart, periodEnd],
    queryFn: async () => {
      const { sdrs, metrics } = await sdrRepo.fetchSDRsWithMetricsRaw(type, periodStart, periodEnd);
      const availableFunnels = [...new Set(metrics.map(m => m.funnel).filter(Boolean))].sort();
      return { sdrs, metrics, availableFunnels };
    },
  });
}

export function useCreateSDRMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metric: {
      sdr_id: string;
      date: string;
      funnel: string | null;
      activated: number;
      scheduled: number;
      scheduled_follow_up: number;
      scheduled_same_day: number;
      attended: number;
      sales: number;
      source: string;
    }) => {
      const { data: { user } } = await (await import('@/integrations/supabase/client')).supabase.auth.getUser();
      const rates = calculateSDRRates(metric);

      return sdrRepo.createSDRMetric({
        ...metric,
        funnel: metric.funnel || '',
        ...rates,
        created_by: user?.id,
      });
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

export function useUpdateSDRMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      date?: string;
      funnel?: string | null;
      activated?: number;
      scheduled?: number;
      scheduled_follow_up?: number;
      scheduled_same_day?: number;
      attended?: number;
      sales?: number;
    }) => {
      const calculatedRates = calculatePartialSDRRates(updates);

      if (updates.funnel === null || updates.funnel === undefined) {
        updates.funnel = '';
      }

      return sdrRepo.updateSDRMetric(id, { ...updates, ...calculatedRates });
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

export function useDeleteSDRMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sdrRepo.deleteSDRMetric,
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

// Re-export types and service
export type { SDR, SDRMetric, SDRAggregatedMetrics, SDRWithMetrics } from '@/model/entities/sdr';
export { calculateAggregatedMetrics } from '@/model/services/sdrService';
