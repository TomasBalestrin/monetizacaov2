import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as closerRepo from '@/model/repositories/closerRepository';
import { aggregateSquadMetrics, calculateTotalMetrics } from '@/model/services/closerService';
import { parseDateString } from '@/lib/utils';
import type { Squad, Closer, Metric, CloserMetricRecord, SquadMetrics, CreateMetricPayload } from '@/model/entities/closer';

export function useSquads() {
  return useQuery({
    queryKey: ['squads'],
    queryFn: closerRepo.fetchSquads,
  });
}

export function useClosers(squadId?: string) {
  return useQuery({
    queryKey: ['closers', squadId],
    queryFn: () => closerRepo.fetchClosers(squadId),
  });
}

export function useMetrics(periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['metrics', periodStart, periodEnd],
    queryFn: () => closerRepo.fetchMetrics(periodStart, periodEnd),
  });
}

export function useCloserMetrics(closerId: string, periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['closer-metrics', closerId, periodStart, periodEnd],
    queryFn: () => closerRepo.fetchCloserMetrics(closerId, periodStart, periodEnd),
    enabled: !!closerId,
  });
}

export function useCloserMetricsByFunnel(
  closerId?: string,
  funnelId?: string,
  periodStart?: string,
  periodEnd?: string
) {
  return useQuery({
    queryKey: ['closer-metrics-funnel', closerId, funnelId, periodStart, periodEnd],
    queryFn: () => closerRepo.fetchCloserMetricsByFunnel(closerId!, funnelId!, periodStart, periodEnd),
    enabled: !!closerId && !!funnelId,
  });
}

export function useSquadMetrics(periodStart?: string, periodEnd?: string) {
  const { data: squads } = useSquads();
  const { data: metrics, isLoading, error } = useMetrics(periodStart, periodEnd);

  const referenceDate = periodStart ? parseDateString(periodStart) : new Date();
  const squadMetrics = aggregateSquadMetrics(squads || [], metrics || [], referenceDate);

  return { squadMetrics, isLoading, error, periodStart };
}

export function useTotalMetrics(periodStart?: string, periodEnd?: string) {
  const { squadMetrics, isLoading, error } = useSquadMetrics(periodStart, periodEnd);

  const referenceDate = periodStart ? parseDateString(periodStart) : new Date();
  const totals = calculateTotalMetrics(squadMetrics, referenceDate);

  return {
    totals,
    squadMetrics,
    isLoading,
    error,
  };
}

export function useCreateMetric() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: closerRepo.createMetric,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['closer-metrics'] });
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
      return closerRepo.updateMetric(id, metric);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['closer-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['squad-metrics'] });
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
    mutationFn: closerRepo.deleteMetric,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['closer-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['squad-metrics'] });
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

// Re-export types
export type { Squad, Closer, Metric, CloserMetricRecord, SquadMetrics, CreateMetricPayload } from '@/model/entities/closer';
