import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as userRepo from '@/model/repositories/userRepository';
import { combineUserData } from '@/model/services/userService';
import type { AppRole, UserWithRole, UserEntityLink, CloserForLinking, SDRForLinking } from '@/model/entities/user';

// --- Users ---

export function useUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const [profiles, roles, permissions] = await Promise.all([
        userRepo.fetchProfilesRaw(),
        userRepo.fetchRolesRaw(),
        userRepo.fetchPermissionsRaw(),
      ]);
      return combineUserData(profiles, roles, permissions);
    },
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      return userRepo.assignRole(userId, role);
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
      return userRepo.togglePermission(userId, module, hasPermission);
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
    mutationFn: userRepo.deleteUserPermissions,
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

export function useDeleteUserCompletely() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: userRepo.deleteUserCompletely,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi removido permanentemente do sistema.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir usuário',
        description: error.message,
      });
      console.error('Error deleting user completely:', error);
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
      return userRepo.createUser({ email, password, role, permissions, linked_closer_id, linked_sdr_id });
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

// --- Entity Links ---

export function useAllEntityLinks() {
  return useQuery({
    queryKey: ['user-entity-links'],
    queryFn: userRepo.fetchAllEntityLinks,
  });
}

export function useUserEntityLinks(userId?: string) {
  return useQuery({
    queryKey: ['user-entity-links', userId],
    queryFn: async () => {
      if (!userId) return [];
      return userRepo.fetchUserEntityLinks(userId);
    },
    enabled: !!userId,
  });
}

export function useCurrentUserEntityLinks() {
  const { user } = useAuth();
  return useUserEntityLinks(user?.id);
}

export function useCreateEntityLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userRepo.createEntityLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-entity-links'] });
    },
  });
}

export function useDeleteEntityLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userRepo.deleteEntityLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-entity-links'] });
    },
  });
}

export function useClosersForLinking() {
  return useQuery({
    queryKey: ['closers-for-linking'],
    queryFn: userRepo.fetchClosersForLinking,
  });
}

export function useSDRsForLinking() {
  return useQuery({
    queryKey: ['sdrs-for-linking'],
    queryFn: userRepo.fetchSDRsForLinking,
  });
}

// Re-export types
export type { AppRole, UserWithRole, UserEntityLink, CloserForLinking, SDRForLinking } from '@/model/entities/user';
