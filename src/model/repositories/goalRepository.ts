import { supabase } from '@/integrations/supabase/client';
import type { Goal } from '@/model/entities/goal';

export async function fetchGoals(
  entityType: string,
  entityId: string,
  month: string
): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, entity_type, entity_id, month, metric_key, target_value, created_by, created_at, updated_at')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('month', month);

  if (error) throw error;
  return data as Goal[];
}

export async function fetchAllGoals(month: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, entity_type, entity_id, month, metric_key, target_value, created_by, created_at, updated_at')
    .eq('month', month);

  if (error) throw error;
  return data as Goal[];
}

export async function upsertGoal(
  goal: { entity_type: string; entity_id: string; month: string; metric_key: string; target_value: number },
  createdBy?: string
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .upsert(
      { ...goal, created_by: createdBy },
      { onConflict: 'entity_type,entity_id,month,metric_key' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as Goal;
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId);

  if (error) throw error;
}
