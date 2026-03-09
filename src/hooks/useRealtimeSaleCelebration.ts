import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SaleCelebration {
  closerName: string;
  revenue: number;
  sales: number;
}

/**
 * Hook that listens for new metric inserts with sales > 0
 * and triggers a celebration visible to all connected users.
 */
export function useRealtimeSaleCelebration() {
  const [celebration, setCelebration] = useState<SaleCelebration | null>(null);

  const dismiss = useCallback(() => setCelebration(null), []);

  useEffect(() => {
    const channel = supabase
      .channel('sale-celebration')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'metrics' },
        async (payload) => {
          const record = payload.new as {
            closer_id: string;
            sales: number;
            revenue: number;
          };

          if (!record.sales || record.sales <= 0) return;

          // Resolve closer name
          const { data: closer } = await supabase
            .from('closers')
            .select('name')
            .eq('id', record.closer_id)
            .single();

          setCelebration({
            closerName: closer?.name || 'Closer',
            revenue: record.revenue || 0,
            sales: record.sales,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { celebration, dismiss };
}
