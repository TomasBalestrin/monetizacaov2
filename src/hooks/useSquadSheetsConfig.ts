import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SquadSheetsConfig {
  id: string;
  squad_id: string;
  spreadsheet_id: string;
  spreadsheet_name: string | null;
  row_mapping: Record<string, unknown> | null;
  last_sync_at: string | null;
  sync_status: string | null;
  sync_message: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useSquadSheetsConfig(squadSlug: string) {
  return useQuery({
    queryKey: ['squad-sheets-config', squadSlug],
    queryFn: async () => {
      // First get the squad id
      const { data: squad, error: squadError } = await supabase
        .from('squads')
        .select('id')
        .eq('slug', squadSlug.toLowerCase())
        .single();

      if (squadError || !squad) {
        console.error('Squad not found:', squadSlug);
        return null;
      }

      // Then get the config for this squad
      const { data, error } = await supabase
        .from('squad_sheets_config')
        .select('*')
        .eq('squad_id', squad.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching squad sheets config:', error);
        throw error;
      }

      return data as SquadSheetsConfig | null;
    },
    enabled: !!squadSlug,
  });
}

export function useSaveSquadSheetsConfig(squadSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spreadsheetId: string) => {
      // Get squad id
      const { data: squad, error: squadError } = await supabase
        .from('squads')
        .select('id')
        .eq('slug', squadSlug.toLowerCase())
        .single();

      if (squadError || !squad) {
        throw new Error('Squad não encontrado');
      }

      // Default row mapping with column H
      const defaultRowMapping = {
        column: 'H',
        firstBlockStartRow: 5,
        blockOffset: 13,
        numberOfBlocks: 4,
        dateRow: 1,
        metrics: {
          calls: 0,
          sales: 1,
          revenue: 3,
          entries: 4,
          revenueTrend: 5,
          entriesTrend: 6,
          cancellations: 7,
          cancellationValue: 9,
          cancellationEntries: 10
        }
      };

      const { data, error } = await supabase
        .from('squad_sheets_config')
        .upsert({
          squad_id: squad.id,
          spreadsheet_id: spreadsheetId,
          row_mapping: defaultRowMapping,
          sync_status: 'pending',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'squad_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Planilha conectada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['squad-sheets-config', squadSlug] });
    },
    onError: (error) => {
      console.error('Error saving squad sheets config:', error);
      toast.error('Erro ao conectar planilha');
    },
  });
}

export function useDisconnectSquadSheets(squadSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get squad id
      const { data: squad, error: squadError } = await supabase
        .from('squads')
        .select('id')
        .eq('slug', squadSlug.toLowerCase())
        .single();

      if (squadError || !squad) {
        throw new Error('Squad não encontrado');
      }

      const { error } = await supabase
        .from('squad_sheets_config')
        .delete()
        .eq('squad_id', squad.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Planilha desconectada');
      queryClient.invalidateQueries({ queryKey: ['squad-sheets-config', squadSlug] });
    },
    onError: (error) => {
      console.error('Error disconnecting squad sheets:', error);
      toast.error('Erro ao desconectar planilha');
    },
  });
}

export function useSyncSquadSheets(squadSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-squad-sheets', {
        body: { squad: squadSlug },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const message = data?.metricsUpserted 
        ? `${data.metricsUpserted} registros sincronizados`
        : 'Sincronização concluída';
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['squad-sheets-config', squadSlug] });
      queryClient.invalidateQueries({ queryKey: ['squad-metrics'] });
    },
    onError: (error) => {
      console.error('Error syncing squad sheets:', error);
      toast.error('Erro ao sincronizar planilha');
    },
  });
}
