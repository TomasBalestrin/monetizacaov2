import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as notificationRepo from '@/model/repositories/notificationRepository';
import type { CreateNotificationPayload } from '@/model/entities/notification';

export function useNotifications() {
  const { user, selectedEntity, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['notifications', isAdmin ? 'all' : user?.id, selectedEntity?.entity_id],
    queryFn: () => isAdmin
      ? notificationRepo.fetchAllNotifications()
      : notificationRepo.fetchNotifications(
          user!.id,
          selectedEntity?.entity_id,
          selectedEntity?.entity_type
        ),
    enabled: !!user?.id,
  });
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter(n => !n.read).length || 0;
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateNotificationPayload) => notificationRepo.createNotification(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationRepo.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { user, selectedEntity, isAdmin } = useAuth();

  return useMutation({
    mutationFn: () => notificationRepo.markAllAsRead(
      isAdmin ? undefined : user!.id,
      selectedEntity?.entity_id,
      selectedEntity?.entity_type
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useEntityNotifications(entityId?: string, entityType?: string) {
  return useQuery({
    queryKey: ['notifications', 'entity', entityId, entityType],
    queryFn: () => notificationRepo.fetchEntityNotifications(entityId!, entityType!),
    enabled: !!entityId && !!entityType,
  });
}

export function useEntityUnreadCount(entityId?: string, entityType?: string) {
  const { data: notifications } = useEntityNotifications(entityId, entityType);
  return notifications?.filter(n => !n.read).length || 0;
}

export function useMarkAllEntityAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityId, entityType }: { entityId: string; entityType: string }) =>
      notificationRepo.markAllAsRead(undefined, entityId, entityType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useClearEntityNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityId, entityType }: { entityId: string; entityType: string }) =>
      notificationRepo.clearAllNotifications(undefined, entityId, entityType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useClearAllNotifications() {
  const queryClient = useQueryClient();
  const { user, selectedEntity, isAdmin } = useAuth();

  return useMutation({
    mutationFn: () => notificationRepo.clearAllNotifications(
      isAdmin ? undefined : user!.id,
      selectedEntity?.entity_id,
      selectedEntity?.entity_type
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
