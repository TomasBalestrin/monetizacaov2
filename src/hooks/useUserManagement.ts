import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];

export interface UserWithRole {
  id: string;
  email: string;
  role: AppRole | null;
  permissions: string[];
  created_at: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;

      // Get roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role');
      
      if (rolesError) throw rolesError;

      // Get permissions for all users
      const { data: permissions, error: permError } = await supabase
        .from('module_permissions')
        .select('id, user_id, module');
      
      if (permError) throw permError;

      // Combine data
      const users: UserWithRole[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.id);
        const userPerms = permissions.filter(p => p.user_id === profile.id);
        
        return {
          id: profile.id,
          email: profile.email,
          role: userRole?.role || null,
          permissions: userPerms.map(p => p.module),
          created_at: profile.created_at,
        };
      });

      return users;
    },
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Delete existing role first
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Função atualizada',
        description: 'A função do usuário foi atualizada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar a função.',
      });
      console.error('Error assigning role:', error);
    },
  });
}

export function useTogglePermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, module, hasPermission }: { userId: string; module: string; hasPermission: boolean }) => {
      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from('module_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('module', module);
        
        if (error) throw error;
      } else {
        // Add permission
        const { error } = await supabase
          .from('module_permissions')
          .insert({ user_id: userId, module });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Permissão atualizada',
        description: 'A permissão foi atualizada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar a permissão.',
      });
      console.error('Error toggling permission:', error);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Note: We can only delete the profile, roles, and permissions
      // The auth.users entry requires admin SDK which we don't have access to
      // For now, we'll delete related data
      
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (rolesError) throw rolesError;

      const { error: permsError } = await supabase
        .from('module_permissions')
        .delete()
        .eq('user_id', userId);
      
      if (permsError) throw permsError;

      // Note: Profile will be cascade deleted if auth user is deleted
      // For now just clear permissions
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Usuário atualizado',
        description: 'As permissões do usuário foram removidas.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o usuário.',
      });
      console.error('Error deleting user:', error);
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email, password, role, permissions, linked_closer_id, linked_sdr_id }: {
      email: string;
      password: string;
      role: AppRole;
      permissions: string[];
      linked_closer_id?: string;
      linked_sdr_id?: string;
    }) => {
      const response = await supabase.functions.invoke('admin-create-user', {
        body: { email, password, role, permissions, linked_closer_id, linked_sdr_id }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Usuário criado',
        description: 'O novo usuário foi criado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar usuário',
        description: error.message,
      });
      console.error('Error creating user:', error);
    },
  });
}
