import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to subscribe to realtime changes on the metrics table
 * Automatically invalidates React Query cache when data changes
 */
export function useRealtimeMetrics() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('metrics-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metrics' },
        (payload) => {
          console.log('Metrics table changed:', payload.eventType);
          // Invalidate all metrics-related queries
          queryClient.invalidateQueries({ queryKey: ['metrics'] });
          queryClient.invalidateQueries({ queryKey: ['closer-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['squad-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['squads'] });
          queryClient.invalidateQueries({ queryKey: ['closers'] });
        }
      )
      .subscribe((status) => {
        console.log('Metrics realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Hook to subscribe to realtime changes on the sdr_metrics table
 * Automatically invalidates React Query cache when data changes
 */
export function useRealtimeSDRMetrics() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('sdr-metrics-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sdr_metrics' },
        (payload) => {
          console.log('SDR Metrics table changed:', payload.eventType);
          // Invalidate all SDR-related queries
          queryClient.invalidateQueries({ queryKey: ['sdrs'] });
          queryClient.invalidateQueries({ queryKey: ['sdr-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['sdr-total-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['sdrs-with-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['sdr-funnels'] });
        }
      )
      .subscribe((status) => {
        console.log('SDR Metrics realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Hook to subscribe to realtime changes on sync config tables
 * Useful for showing sync status updates
 */
export function useRealtimeSyncStatus() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('sync-status-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'google_sheets_config' },
        (payload) => {
          console.log('Google Sheets config updated:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['google-sheets-config'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sdr_sheets_config' },
        (payload) => {
          console.log('SDR Sheets config updated:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['sdr-sheets-config'] });
        }
      )
      .subscribe((status) => {
        console.log('Sync status realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
