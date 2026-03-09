import type { Goal } from '@/model/entities/goal';

/**
 * Retorna o valor alvo de uma meta para uma chave de métrica específica
 */
export function getGoalTarget(goals: Goal[] | undefined, metricKey: string): number | null {
  if (!goals) return null;
  const goal = goals.find(g => g.metric_key === metricKey);
  return goal ? goal.target_value : null;
}
