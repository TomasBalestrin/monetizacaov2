/**
 * Calcula dias úteis (segunda a sexta) entre duas datas
 */
export function getWorkingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // 0 = domingo, 6 = sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Retorna o total de dias úteis em um mês específico
 */
export function getWorkingDaysInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return getWorkingDaysBetween(firstDay, lastDay);
}

/**
 * Calcula a tendência projetada baseada nos dias úteis
 * Fórmula: (valor / dias_úteis_trabalhados) * total_dias_úteis_do_mês
 * 
 * @param value - Valor atual (faturamento ou entradas)
 * @param periodStart - Data de início do período selecionado (para determinar o mês)
 * @returns Tendência projetada para o mês completo
 */
export function calculateTrend(value: number, periodStart: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Mês de referência é baseado no período selecionado
  const referenceMonth = periodStart.getMonth();
  const referenceYear = periodStart.getFullYear();
  
  // Primeiro dia do mês de referência
  const monthStart = new Date(referenceYear, referenceMonth, 1);
  
  // Se hoje está no mesmo mês, conta até hoje
  // Se não, conta até o último dia do mês de referência
  let workedUntil: Date;
  if (today.getFullYear() === referenceYear && today.getMonth() === referenceMonth) {
    workedUntil = today;
  } else {
    // Se o período é de um mês anterior ou futuro, usa o mês completo
    workedUntil = new Date(referenceYear, referenceMonth + 1, 0);
  }
  
  // Dias úteis trabalhados (início do mês até a data de referência)
  const workedDays = getWorkingDaysBetween(monthStart, workedUntil);
  
  // Total de dias úteis no mês
  const totalDays = getWorkingDaysInMonth(referenceYear, referenceMonth);
  
  if (workedDays === 0) return 0;
  
  return (value / workedDays) * totalDays;
}
