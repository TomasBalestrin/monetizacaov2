import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUserEntityLinks } from '@/hooks/useUserEntityLinks';

export interface Goal {
  id: string;
  entity_type: string;
  entity_id: string;
  month: string;
  metric_key: string;
  target_value: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const CLOSER_METRIC_KEYS = [
  { key: 'calls', label: 'Calls Realizadas' },
  { key: 'sales', label: 'Número de Vendas' },
  { key: 'revenue', label: 'Faturamento' },
  { key: 'entries', label: 'Valor de Entrada' },
] as const;

export const SDR_METRIC_KEYS = [
  { key: 'activated', label: 'Ativados' },
  { key: 'scheduled', label: 'Agendados' },
  { key: 'attended', label: 'Realizados' },
  { key: 'sales', label: 'Vendas' },
] as const;

// Fetch goals for a specific entity and month
export function useGoals(entityType: string, entityId: string | undefined, month: string | undefined) {
  return useQuery({
    queryKey: ['goals', entityType, entityId, month],
    queryFn: async () => {
      if (!entityId || !month) return [];
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('month', month);

      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!entityId && !!month,
  });
}

// Fetch all goals for a month (admin use)
export function useAllGoals(month: string | undefined) {
  return useQuery({
    queryKey: ['goals', 'all', month],
    queryFn: async () => {
      if (!month) return [];
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('month', month);

      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!month,
  });
}

// Upsert a goal
export function useUpsertGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (goal: { entity_type: string; entity_id: string; month: string; metric_key: string; target_value: number }) => {
      const { data, error } = await supabase
        .from('goals')
        .upsert(
          { ...goal, created_by: user?.id },
          { onConflict: 'entity_type,entity_id,month,metric_key' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as Goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

// Delete a goal
export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

// Helper: get goal target for a specific metric key from a goals array
export function getGoalTarget(goals: Goal[] | undefined, metricKey: string): number | null {
  if (!goals) return null;
  const goal = goals.find(g => g.metric_key === metricKey);
  return goal ? goal.target_value : null;
}
