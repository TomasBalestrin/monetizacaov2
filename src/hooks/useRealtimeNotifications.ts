import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Admin listens to ALL notification inserts; regular users only their own
    const channelConfig = isAdmin
      ? { event: 'INSERT' as const, schema: 'public', table: 'notifications' }
      : { event: 'INSERT' as const, schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` };

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', channelConfig, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id, isAdmin]);
}
