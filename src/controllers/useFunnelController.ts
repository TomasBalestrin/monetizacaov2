import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as funnelRepo from '@/model/repositories/funnelRepository';
import * as sdrRepo from '@/model/repositories/sdrRepository';
import type { Funnel, FunnelSummary, FunnelReport, FunnelDailyData, PersonProductSales, Product, ProductSummary } from '@/model/entities/funnel';

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
      funnel_name?: string;
      date: string;
      calls_scheduled?: number;
      calls_done?: number;
      sales_count?: number;
      sales_value?: number;
      entries_value?: number;
      sdr_id?: string | null;
      leads_count?: number;
      qualified_count?: number;
    }[]) => {
      const result = await funnelRepo.createFunnelDailyData(records);

      // Recalculate SDR metrics from source data for affected SDR/date/funnel combos
      const sdrRecords = records.filter((r) => r.sdr_id && r.funnel_name);
      const seen = new Set<string>();
      for (const r of sdrRecords) {
        const key = `${r.sdr_id}|${r.date}|${r.funnel_name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        await sdrRepo.recalculateSdrSales(r.sdr_id!, r.date, r.funnel_name!, r.funnel_id);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-funnel-data'] });
      queryClient.invalidateQueries({ queryKey: ['funnels-summary'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-report'] });
      queryClient.invalidateQueries({ queryKey: ['sdr-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sdr-total-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sdrs-with-metrics'] });
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

export function useAllFunnelsAdmin() {
  return useQuery({
    queryKey: ['funnels-admin'],
    queryFn: funnelRepo.fetchAllFunnelsIncludingInactive,
  });
}

export function useCreateFunnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, category }: { name: string; category?: string }) =>
      funnelRepo.createFunnel(name, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      queryClient.invalidateQueries({ queryKey: ['funnels-admin'] });
      toast.success('Funil criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating funnel:', error);
      toast.error('Erro ao criar funil');
    },
  });
}

export function useUpdateFunnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string; name?: string; category?: string | null; is_active?: boolean }) =>
      funnelRepo.updateFunnel(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      queryClient.invalidateQueries({ queryKey: ['funnels-admin'] });
      toast.success('Funil atualizado!');
    },
    onError: (error: any) => {
      console.error('Error updating funnel:', error);
      toast.error('Erro ao atualizar funil');
    },
  });
}

export function useDeleteFunnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => funnelRepo.deleteFunnel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      queryClient.invalidateQueries({ queryKey: ['funnels-admin'] });
      toast.success('Funil removido!');
    },
    onError: (error: any) => {
      console.error('Error deleting funnel:', error);
      toast.error('Erro ao remover funil. Verifique se não há dados vinculados.');
    },
  });
}

export function useDeleteFunnelDailyData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch record before deleting to get SDR/funnel info for recalculation
      const record = await funnelRepo.fetchFunnelDailyDataById(id);

      await funnelRepo.deleteFunnelDailyData(id);

      // Recalculate SDR metrics after deletion
      if (record?.sdr_id && record.funnel_id) {
        const funnel = await funnelRepo.fetchFunnelById(record.funnel_id);
        if (funnel?.name) {
          await sdrRepo.recalculateSdrSales(record.sdr_id, record.date, funnel.name, record.funnel_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-funnel-data'] });
      queryClient.invalidateQueries({ queryKey: ['funnels-summary'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-report'] });
      queryClient.invalidateQueries({ queryKey: ['sdr-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sdr-total-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sdrs-with-metrics'] });
      toast.success('Registro removido!');
    },
    onError: () => {
      toast.error('Erro ao remover registro');
    },
  });
}

export function useFunnelDailyData(periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['funnel-daily-data', periodStart, periodEnd],
    queryFn: () => funnelRepo.fetchFunnelDailyDataByPeriod(periodStart, periodEnd),
  });
}

// Product hooks
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: funnelRepo.fetchProducts,
  });
}

export function useAllProductsAdmin() {
  return useQuery({
    queryKey: ['products-admin'],
    queryFn: funnelRepo.fetchAllProductsIncludingInactive,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => funnelRepo.createProduct(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      toast.success('Produto criado com sucesso!');
    },
    onError: () => toast.error('Erro ao criar produto'),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string; name?: string; is_active?: boolean }) =>
      funnelRepo.updateProduct(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      toast.success('Produto atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar produto'),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => funnelRepo.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      toast.success('Produto removido!');
    },
    onError: () => toast.error('Erro ao remover produto. Verifique se não há dados vinculados.'),
  });
}

export function useProductSummary(periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['product-summary', periodStart, periodEnd],
    queryFn: () => funnelRepo.fetchProductSummary(periodStart, periodEnd),
  });
}

// Delegation hooks
export function useAssignUserFunnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ closerId, funnelId }: { closerId: string; funnelId: string }) =>
      funnelRepo.assignUserFunnel(closerId, funnelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-funnels'] });
      toast.success('Funil atribuído!');
    },
    onError: () => toast.error('Erro ao atribuir funil'),
  });
}

export function useRemoveUserFunnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ closerId, funnelId }: { closerId: string; funnelId: string }) =>
      funnelRepo.removeUserFunnel(closerId, funnelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-funnels'] });
      toast.success('Funil removido!');
    },
    onError: () => toast.error('Erro ao remover funil'),
  });
}

export function useUserProducts(closerId?: string) {
  return useQuery({
    queryKey: ['user-products', closerId],
    queryFn: async () => {
      if (!closerId) return [];
      return funnelRepo.fetchUserProducts(closerId);
    },
    enabled: !!closerId,
  });
}

export function useAssignUserProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ closerId, productId }: { closerId: string; productId: string }) =>
      funnelRepo.assignUserProduct(closerId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-products'] });
      toast.success('Produto atribuído!');
    },
    onError: () => toast.error('Erro ao atribuir produto'),
  });
}

export function useRemoveUserProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ closerId, productId }: { closerId: string; productId: string }) =>
      funnelRepo.removeUserProduct(closerId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-products'] });
      toast.success('Produto removido!');
    },
    onError: () => toast.error('Erro ao remover produto'),
  });
}

// Re-export types
export type { Funnel, FunnelSummary, FunnelReport, FunnelDailyData, PersonProductSales, Product, ProductSummary } from '@/model/entities/funnel';
