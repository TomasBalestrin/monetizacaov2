import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/model/entities/user';

export async function fetchUserRole(userId: string): Promise<AppRole | null> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  return data?.role || null;
}

export async function fetchUserPermissions(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('module_permissions')
    .select('module')
    .eq('user_id', userId);

  return data ? data.map(p => p.module) : [];
}
