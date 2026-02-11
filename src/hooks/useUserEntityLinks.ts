import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserEntityLink {
  id: string;
  user_id: string;
  entity_type: 'closer' | 'sdr';
  entity_id: string;
  created_at: string;
}

// Fetch all entity links (admin only)
export function useAllEntityLinks() {
  return useQuery({
    queryKey: ['user-entity-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_entity_links')
        .select('id, user_id, entity_type, entity_id, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserEntityLink[];
    },
  });
}

// Fetch links for a specific user
export function useUserEntityLinks(userId?: string) {
  return useQuery({
    queryKey: ['user-entity-links', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_entity_links')
        .select('id, user_id, entity_type, entity_id, created_at')
        .eq('user_id', userId);

      if (error) throw error;
      return data as UserEntityLink[];
    },
    enabled: !!userId,
  });
}

// Fetch links for the current user
export function useCurrentUserEntityLinks() {
  const { user } = useAuth();
  return useUserEntityLinks(user?.id);
}

// Create a new entity link
export function useCreateEntityLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (link: { user_id: string; entity_type: 'closer' | 'sdr'; entity_id: string }) => {
      const { data, error } = await supabase
        .from('user_entity_links')
        .insert(link)
        .select()
        .single();

      if (error) throw error;
      return data as UserEntityLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-entity-links'] });
    },
  });
}

// Delete an entity link
export function useDeleteEntityLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('user_entity_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-entity-links'] });
    },
  });
}

// Fetch closers for linking dropdown
export function useClosersForLinking() {
  return useQuery({
    queryKey: ['closers-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('closers')
        .select('id, name, squad_id, squads(name)')
        .order('name');

      if (error) throw error;
      return data as Array<{ id: string; name: string; squad_id: string; squads: { name: string } | null }>;
    },
  });
}

// Fetch SDRs for linking dropdown
export function useSDRsForLinking() {
  return useQuery({
    queryKey: ['sdrs-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sdrs')
        .select('id, name, type')
        .order('name');

      if (error) throw error;
      return data as Array<{ id: string; name: string; type: string }>;
    },
  });
}
