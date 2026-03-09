import { supabase } from '@/integrations/supabase/client';
import type { Notification, CreateNotificationPayload } from '@/model/entities/notification';

export async function fetchNotifications(
  userId: string,
  entityId?: string,
  entityType?: string
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (entityId && entityType) {
    query = query.eq('entity_id', entityId).eq('entity_type', entityType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Notification[];
}

export async function fetchAllNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data || []) as Notification[];
}

export async function fetchEntityNotifications(
  entityId: string,
  entityType: string
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as Notification[];
}

export async function createNotification(payload: CreateNotificationPayload): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .insert(payload);

  if (error) throw error;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markAllAsRead(
  userId?: string,
  entityId?: string,
  entityType?: string
): Promise<void> {
  let query = supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (entityId && entityType) {
    query = query.eq('entity_id', entityId).eq('entity_type', entityType);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function clearAllNotifications(
  userId?: string,
  entityId?: string,
  entityType?: string
): Promise<void> {
  let query = supabase
    .from('notifications')
    .delete();

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (entityId && entityType) {
    query = query.eq('entity_id', entityId).eq('entity_type', entityType);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function findUserIdByCloserId(closerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_entity_links')
    .select('user_id')
    .eq('entity_type', 'closer')
    .eq('entity_id', closerId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.user_id || null;
}

export async function findUserIdBySdrId(sdrId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_entity_links')
    .select('user_id')
    .eq('entity_type', 'sdr')
    .eq('entity_id', sdrId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.user_id || null;
}
