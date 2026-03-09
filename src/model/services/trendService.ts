import { getWorkingDaysBetween, getWorkingDaysInMonth } from '@/lib/workingDays';

export interface TrendResult {
  projected: number;
  workedDays: number;
  totalDays: number;
}

/**
 * Calcula a tendência projetada baseada nos dias úteis
 * Fórmula: (valor / dias_úteis_trabalhados) * total_dias_úteis_do_mês
 */
export function calculateTrend(value: number, periodStart: Date): number {
  const result = calculateTrendDetailed(value, periodStart);
  return result.projected;
}

/**
 * Versão detalhada que retorna também os dias úteis para exibição de avisos
 */
export function calculateTrendDetailed(value: number, periodStart: Date): TrendResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const referenceMonth = periodStart.getMonth();
  const referenceYear = periodStart.getFullYear();
  const monthStart = new Date(referenceYear, referenceMonth, 1);

  let workedUntil: Date;
  if (today.getFullYear() === referenceYear && today.getMonth() === referenceMonth) {
    workedUntil = today;
  } else {
    workedUntil = new Date(referenceYear, referenceMonth + 1, 0);
  }

  const workedDays = getWorkingDaysBetween(monthStart, workedUntil);
  const totalDays = getWorkingDaysInMonth(referenceYear, referenceMonth);

  if (workedDays === 0) return { projected: 0, workedDays, totalDays };

  return { projected: (value / workedDays) * totalDays, workedDays, totalDays };
}
