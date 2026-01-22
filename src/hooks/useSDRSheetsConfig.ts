import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SDRSheetsConfig {
  id: string;
  spreadsheet_id: string;
  spreadsheet_name: string | null;
  row_mapping: Record<string, unknown>;
  last_sync_at: string | null;
  sync_status: string;
  sync_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch current SDR sheets configuration
export function useSDRSheetsConfig() {
  return useQuery({
    queryKey: ['sdr-sheets-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sdr_sheets_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SDRSheetsConfig | null;
    },
  });
}

// Extract spreadsheet ID from URL or raw ID
function extractSpreadsheetId(input: string): string {
  // If it's a URL, extract the ID
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  // Otherwise, assume it's already an ID
  return input.trim();
}

// Save SDR sheets configuration
export function useSaveSDRSheetsConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spreadsheetIdOrUrl: string) => {
      const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);

      const { data: existingConfig } = await supabase
        .from('sdr_sheets_config')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existingConfig) {
        // Update existing
        const { data, error } = await supabase
          .from('sdr_sheets_config')
          .update({
            spreadsheet_id: spreadsheetId,
            sync_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConfig.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('sdr_sheets_config')
          .insert({
            spreadsheet_id: spreadsheetId,
            sync_status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-sheets-config'] });
      toast.success('Planilha conectada com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving SDR sheets config:', error);
      toast.error('Erro ao conectar planilha');
    },
  });
}

// Disconnect SDR sheets
export function useDisconnectSDRSheets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sdr_sheets_config')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-sheets-config'] });
      toast.success('Planilha desconectada');
    },
    onError: (error) => {
      console.error('Error disconnecting SDR sheets:', error);
      toast.error('Erro ao desconectar planilha');
    },
  });
}

// Sync SDR data from Google Sheets
export function useSyncSDRSheets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-sdr-sheets');

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-sheets-config'] });
      queryClient.invalidateQueries({ queryKey: ['sdrs'] });
      queryClient.invalidateQueries({ queryKey: ['sdr-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sdr-total-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sdrs-with-metrics'] });
      toast.success(data?.message || 'Dados sincronizados com sucesso!');
    },
    onError: (error) => {
      console.error('Error syncing SDR sheets:', error);
      toast.error('Erro ao sincronizar dados');
    },
  });
}
