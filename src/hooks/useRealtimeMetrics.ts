import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Singleton channels — shared across all component instances
let metricsChannel: RealtimeChannel | null = null;
let metricsRefCount = 0;

let sdrMetricsChannel: RealtimeChannel | null = null;
let sdrMetricsRefCount = 0;

/**
 * Hook to subscribe to realtime changes on the metrics table
 * Uses a shared singleton channel to avoid conflicts between components
 */
export function useRealtimeMetrics() {
  const queryClient = useQueryClient();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    metricsRefCount++;

    if (!metricsChannel) {
      metricsChannel = supabase
        .channel('metrics-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'metrics' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
            queryClient.invalidateQueries({ queryKey: ['closer-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['squad-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['squads'] });
            queryClient.invalidateQueries({ queryKey: ['closers'] });
          }
        )
        .subscribe();
    }

    return () => {
      subscribedRef.current = false;
      metricsRefCount--;
      if (metricsRefCount <= 0 && metricsChannel) {
        supabase.removeChannel(metricsChannel);
        metricsChannel = null;
        metricsRefCount = 0;
      }
    };
  }, [queryClient]);
}

/**
 * Hook to subscribe to realtime changes on the sdr_metrics table
 * Uses a shared singleton channel to avoid conflicts between components
 */
export function useRealtimeSDRMetrics() {
  const queryClient = useQueryClient();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    sdrMetricsRefCount++;

    if (!sdrMetricsChannel) {
      sdrMetricsChannel = supabase
        .channel('sdr-metrics-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sdr_metrics' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['sdrs'] });
            queryClient.invalidateQueries({ queryKey: ['sdr-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['sdr-total-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['sdrs-with-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['sdr-funnels'] });
          }
        )
        .subscribe();
    }

    return () => {
      subscribedRef.current = false;
      sdrMetricsRefCount--;
      if (sdrMetricsRefCount <= 0 && sdrMetricsChannel) {
        supabase.removeChannel(sdrMetricsChannel);
        sdrMetricsChannel = null;
        sdrMetricsRefCount = 0;
      }
    };
  }, [queryClient]);
}
