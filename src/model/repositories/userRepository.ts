import { supabase } from '@/integrations/supabase/client';
import type { AppRole, UserEntityLink, CloserForLinking, SDRForLinking } from '@/model/entities/user';

export async function fetchProfilesRaw() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchRolesRaw() {
  const { data, error } = await supabase
    .from('user_roles')
    .select('id, user_id, role');
  if (error) throw error;
  return data;
}

export async function fetchPermissionsRaw() {
  const { data, error } = await supabase
    .from('module_permissions')
    .select('id, user_id, module');
  if (error) throw error;
  return data;
}

export async function assignRole(userId: string, role: AppRole): Promise<void> {
  await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role });
  if (error) throw error;
}

export async function togglePermission(
  userId: string,
  module: string,
  hasPermission: boolean
): Promise<void> {
  if (hasPermission) {
    const { error } = await supabase
      .from('module_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('module', module);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('module_permissions')
      .insert({ user_id: userId, module });
    if (error) throw error;
  }
}

export async function deleteUserPermissions(userId: string): Promise<void> {
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
}

export async function deleteUserCompletely(userId: string): Promise<unknown> {
  const response = await supabase.functions.invoke('admin-delete-user', {
    body: { user_id: userId }
  });
  if (response.error) throw response.error;
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}

export async function createUser(input: {
  email: string;
  password: string;
  role: AppRole;
  permissions: string[];
  linked_closer_id?: string;
  linked_sdr_id?: string;
}): Promise<unknown> {
  const response = await supabase.functions.invoke('admin-create-user', {
    body: input
  });
  if (response.error) throw response.error;
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}

// Entity Links

export async function fetchAllEntityLinks(): Promise<UserEntityLink[]> {
  const { data, error } = await supabase
    .from('user_entity_links')
    .select('id, user_id, entity_type, entity_id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as UserEntityLink[];
}

export async function fetchUserEntityLinks(userId: string): Promise<UserEntityLink[]> {
  const { data, error } = await supabase
    .from('user_entity_links')
    .select('id, user_id, entity_type, entity_id, created_at')
    .eq('user_id', userId);
  if (error) throw error;
  return data as UserEntityLink[];
}

export async function createEntityLink(link: {
  user_id: string;
  entity_type: 'closer' | 'sdr';
  entity_id: string;
}): Promise<UserEntityLink> {
  const { data, error } = await supabase
    .from('user_entity_links')
    .insert(link)
    .select()
    .single();
  if (error) throw error;
  return data as UserEntityLink;
}

export async function deleteEntityLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('user_entity_links')
    .delete()
    .eq('id', linkId);
  if (error) throw error;
}

export async function fetchClosersForLinking(): Promise<CloserForLinking[]> {
  const { data, error } = await supabase
    .from('closers')
    .select('id, name, squad_id, squads(name)')
    .order('name');
  if (error) throw error;
  return data as CloserForLinking[];
}

export async function fetchSDRsForLinking(): Promise<SDRForLinking[]> {
  const { data, error } = await supabase
    .from('sdrs')
    .select('id, name, type')
    .order('name');
  if (error) throw error;
  return data as SDRForLinking[];
}
