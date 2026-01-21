import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RowMapping {
  calls: number;
  revenue: number;
  entries: number;
  revenueTrend: number;
  entriesTrend: number;
  sales: number;
  cancellations: number;
  cancellationValue: number;
  cancellationEntries: number;
}

export const DEFAULT_ROW_MAPPING: RowMapping = {
  calls: 7,
  revenue: 10,
  entries: 11,
  revenueTrend: 12,
  entriesTrend: 13,
  sales: 14,
  cancellations: 15,
  cancellationValue: 16,
  cancellationEntries: 17,
};

interface GoogleSheetsConfig {
  id: string;
  spreadsheet_id: string;
  spreadsheet_name: string | null;
  last_sync_at: string | null;
  sync_status: string | null;
  sync_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  row_mapping: RowMapping | null;
}

export function useGoogleSheetsConfig() {
  return useQuery({
    queryKey: ['google-sheets-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_sheets_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      // Parse row_mapping from JSON
      return {
        ...data,
        row_mapping: data.row_mapping as unknown as RowMapping | null
      } as GoogleSheetsConfig;
    },
  });
}

export function useSaveGoogleSheetsConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spreadsheetId: string) => {
      // Check if config already exists
      const { data: existing } = await supabase
        .from('google_sheets_config')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update existing config
        const { data, error } = await supabase
          .from('google_sheets_config')
          .update({ 
            spreadsheet_id: spreadsheetId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new config
        const { data, error } = await supabase
          .from('google_sheets_config')
          .insert({ spreadsheet_id: spreadsheetId })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets-config'] });
      toast.success('Planilha conectada com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving config:', error);
      toast.error('Erro ao conectar planilha');
    },
  });
}

export function useSaveRowMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ configId, rowMapping }: { configId: string; rowMapping: RowMapping }) => {
      const { data, error } = await supabase
        .from('google_sheets_config')
        .update({ 
          row_mapping: rowMapping as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets-config'] });
      toast.success('Mapeamento salvo com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving row mapping:', error);
      toast.error('Erro ao salvar mapeamento');
    },
  });
}

export function useDisconnectGoogleSheets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('google_sheets_config')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets-config'] });
      toast.success('Planilha desconectada');
    },
    onError: (error) => {
      console.error('Error disconnecting:', error);
      toast.error('Erro ao desconectar planilha');
    },
  });
}

export function useSyncGoogleSheets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-google-sheets');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets-config'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success(`Sincronização concluída! ${data?.recordsImported || 0} registros importados.`);
    },
    onError: (error: any) => {
      console.error('Error syncing:', error);
      toast.error(error?.message || 'Erro ao sincronizar dados');
    },
  });
}
