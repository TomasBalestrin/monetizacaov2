import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as sdrRepo from '@/model/repositories/sdrRepository';
import { calculateSDRRates, calculatePartialSDRRates, groupMetricsBySDR, calculateAggregatedMetrics } from '@/model/services/sdrService';
import type { SDR, SDRMetric, SDRAggregatedMetrics, SDRWithMetrics } from '@/model/entities/sdr';

export function useSDRs(type?: 'sdr' | 'social_selling' | 'funil_intensivo') {
  return useQuery({
    queryKey: ['sdrs', type],
    queryFn: () => sdrRepo.fetchSDRs(type),
  });
}

export function useCloserNamesForSDR(sdrId?: string, periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['closer-names-for-sdr', sdrId, periodStart, periodEnd],
    queryFn: () => sdrRepo.fetchCloserNamesForSDR(sdrId!, periodStart, periodEnd),
    enabled: !!sdrId,
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

export function useSDRFunnelsWithDates(sdrId?: string) {
  return useQuery({
    queryKey: ['sdr-funnels-dates', sdrId],
    queryFn: async () => {
      if (!sdrId) return [];
      return sdrRepo.fetchSDRFunnelsWithDates(sdrId);
    },
    enabled: !!sdrId,
  });
}

export function useAddSDRFunnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sdrId, funnelName, eventDate }: { sdrId: string; funnelName: string; eventDate?: string }) => {
      return sdrRepo.addSDRFunnel(sdrId, funnelName, eventDate);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-funnels', variables.sdrId] });
      queryClient.invalidateQueries({ queryKey: ['sdr-funnels-dates', variables.sdrId] });
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
      queryClient.invalidateQueries({ queryKey: ['sdr-funnels-dates', variables.sdrId] });
      toast.success('Funil removido!');
    },
    onError: () => {
      toast.error('Erro ao remover funil');
    },
  });
}

export function useSDRTotalMetrics(
  type: 'sdr' | 'social_selling' | 'funil_intensivo',
  periodStart?: string,
  periodEnd?: string
) {
  return useQuery({
    queryKey: ['sdr-total-metrics', type, periodStart, periodEnd],
    queryFn: () => sdrRepo.fetchSDRTotalMetrics(type, periodStart, periodEnd),
  });
}

export function useSDRsWithMetrics(
  type: 'sdr' | 'social_selling' | 'funil_intensivo',
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
  type: 'sdr' | 'social_selling' | 'funil_intensivo',
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
      fi_called?: number;
      fi_awaiting?: number;
      fi_received_link?: number;
      fi_got_ticket?: number;
      fi_attended?: number;
      fi_attendance_rate?: number;
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
      fi_called?: number;
      fi_awaiting?: number;
      fi_received_link?: number;
      fi_got_ticket?: number;
      fi_attended?: number;
      fi_attendance_rate?: number;
    }) => {
      const calculatedRates = calculatePartialSDRRates(updates);

      // Only normalize funnel if it was explicitly passed (null → ''), not when undefined (omitted)
      if (updates.funnel === null) {
        updates.funnel = '';
      }

      // Remove undefined fields so we don't accidentally overwrite with empty values
      const cleanUpdates = Object.fromEntries(
        Object.entries({ ...updates, ...calculatedRates }).filter(([, v]) => v !== undefined)
      );

      return sdrRepo.updateSDRMetric(id, cleanUpdates);
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

export function useCreateSDR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, type }: { name: string; type: 'sdr' | 'social_selling' | 'funil_intensivo' }) =>
      sdrRepo.createSDR(name, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdrs'] });
      queryClient.invalidateQueries({ queryKey: ['sdrs-for-linking'] });
      queryClient.invalidateQueries({ queryKey: ['sdrs-with-metrics'] });
      toast.success('Perfil criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating SDR:', error);
      toast.error('Erro ao criar perfil');
    },
  });
}

// Re-export types and service
export type { SDR, SDRMetric, SDRAggregatedMetrics, SDRWithMetrics, SDRFunnelWithDate } from '@/model/entities/sdr';
export { calculateAggregatedMetrics } from '@/model/services/sdrService';
