import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as goalRepo from '@/model/repositories/goalRepository';
import type { Goal } from '@/model/entities/goal';

export function useGoals(entityType: string, entityId: string | undefined, month: string | undefined) {
  return useQuery({
    queryKey: ['goals', entityType, entityId, month],
    queryFn: async () => {
      if (!entityId || !month) return [];
      return goalRepo.fetchGoals(entityType, entityId, month);
    },
    enabled: !!entityId && !!month,
  });
}

export function useAllGoals(month: string | undefined) {
  return useQuery({
    queryKey: ['goals', 'all', month],
    queryFn: async () => {
      if (!month) return [];
      return goalRepo.fetchAllGoals(month);
    },
    enabled: !!month,
  });
}

export function useUpsertGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (goal: { entity_type: string; entity_id: string; month: string; metric_key: string; target_value: number }) => {
      return goalRepo.upsertGoal(goal, user?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      return goalRepo.deleteGoal(goalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

// Re-export service function
export { getGoalTarget } from '@/model/services/goalService';

// Re-export types and constants
export type { Goal } from '@/model/entities/goal';
export { CLOSER_METRIC_KEYS, SDR_METRIC_KEYS } from '@/model/entities/goal';
