import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as funnelRepo from '@/model/repositories/funnelRepository';
import type { Funnel, FunnelSummary, FunnelReport, FunnelDailyData, PersonProductSales } from '@/model/entities/funnel';

export function useFunnels() {
  return useQuery({
    queryKey: ['funnels'],
    queryFn: funnelRepo.fetchFunnels,
  });
}

export function useUserFunnels(userId?: string) {
  return useQuery({
    queryKey: ['user-funnels', userId],
    queryFn: async () => {
      if (!userId) return [];
      return funnelRepo.fetchUserFunnels(userId);
    },
    enabled: !!userId,
  });
}

export function useAllFunnelsSummary(periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['funnels-summary', periodStart, periodEnd],
    queryFn: () => funnelRepo.fetchAllFunnelsSummary(periodStart, periodEnd),
  });
}

export function useFunnelReport(funnelId?: string, periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['funnel-report', funnelId, periodStart, periodEnd],
    queryFn: async () => {
      if (!funnelId) return null;
      return funnelRepo.fetchFunnelReport(funnelId, periodStart, periodEnd);
    },
    enabled: !!funnelId,
  });
}

export function useCloserFunnelData(closerId?: string, funnelId?: string, periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['closer-funnel-data', closerId, funnelId, periodStart, periodEnd],
    queryFn: async () => {
      if (!closerId) return [];
      return funnelRepo.fetchCloserFunnelData(closerId, funnelId, periodStart, periodEnd);
    },
    enabled: !!closerId,
  });
}

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
      return funnelRepo.createFunnelDailyData(records);
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

export function useSalesByPersonAndProduct(periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['sales-by-person-product', periodStart, periodEnd],
    queryFn: () => funnelRepo.fetchSalesByPersonAndProduct(periodStart, periodEnd),
  });
}

export function useDeleteFunnelDailyData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: funnelRepo.deleteFunnelDailyData,
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

// Re-export types
export type { Funnel, FunnelSummary, FunnelReport, FunnelDailyData, PersonProductSales } from '@/model/entities/funnel';
