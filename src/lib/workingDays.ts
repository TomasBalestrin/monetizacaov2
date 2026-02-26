/**
 * Feriados nacionais fixos brasileiros (mês é 0-indexed)
 */
const FIXED_HOLIDAYS = [
  { month: 0, day: 1 },   // Confraternização Universal
  { month: 3, day: 21 },  // Tiradentes
  { month: 4, day: 1 },   // Dia do Trabalho
  { month: 8, day: 7 },   // Independência do Brasil
  { month: 9, day: 12 },  // Nossa Senhora Aparecida
  { month: 10, day: 2 },  // Finados
  { month: 10, day: 15 }, // Proclamação da República
  { month: 11, day: 25 }, // Natal
];

/**
 * Dias adicionais não úteis (emendas, pontos facultativos específicos)
 * Adicione aqui datas específicas da empresa
 */
const ADDITIONAL_NON_WORKING_DAYS: { year: number; month: number; day: number }[] = [
  { year: 2025, month: 0, day: 2 }, // Emenda Ano Novo 2025
  { year: 2026, month: 0, day: 2 }, // Emenda Ano Novo 2026
  { year: 2026, month: 0, day: 3 }, // Sábado não trabalhado
];

/**
 * Calcula a data da Páscoa usando o algoritmo Computus
 */
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/**
 * Adiciona dias a uma data
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Retorna os feriados móveis de um ano (baseados na Páscoa)
 */
function getMovableHolidays(year: number): Date[] {
  const easter = calculateEaster(year);
  return [
    addDays(easter, -48), // Segunda de Carnaval
    addDays(easter, -47), // Terça de Carnaval
    addDays(easter, -2),  // Sexta-feira Santa
    addDays(easter, 60),  // Corpus Christi
  ];
}

/**
 * Retorna todos os feriados de um ano específico
 */
function getHolidaysForYear(year: number): Date[] {
  const holidays: Date[] = [];
  
  // Adiciona feriados fixos
  FIXED_HOLIDAYS.forEach(({ month, day }) => {
    holidays.push(new Date(year, month, day));
  });
  
  // Adiciona feriados móveis
  holidays.push(...getMovableHolidays(year));
  
  // Adiciona dias não úteis adicionais do ano
  ADDITIONAL_NON_WORKING_DAYS
    .filter(d => d.year === year)
    .forEach(({ month, day }) => {
      holidays.push(new Date(year, month, day));
    });
  
  return holidays;
}

/**
 * Retorna todos os feriados em um intervalo de datas
 */
function getHolidaysInRange(start: Date, end: Date): Date[] {
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const holidays: Date[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    holidays.push(...getHolidaysForYear(year));
  }
  
  return holidays;
}

/**
 * Verifica se uma data é feriado
 */
function isHoliday(date: Date, holidays: Date[]): boolean {
  return holidays.some(
    h => h.getFullYear() === date.getFullYear() &&
         h.getMonth() === date.getMonth() &&
         h.getDate() === date.getDate()
  );
}

/**
 * Calcula dias úteis entre duas datas
 * - Segunda a Sexta: 1 dia
 * - Sábado: 0.5 dia (meio expediente)
 * - Domingo: 0 dia
 * - Feriados: 0 dia
 */
export function getWorkingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);
  
  // Pré-calcula feriados do período
  const holidays = getHolidaysInRange(start, end);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    
    // Domingo (0) não conta
    if (dayOfWeek === 0) {
      current.setDate(current.getDate() + 1);
      continue;
    }
    
    // Verifica se é feriado (não conta)
    if (isHoliday(current, holidays)) {
      current.setDate(current.getDate() + 1);
      continue;
    }
    
    // Sábado (6) conta como 0.5
    if (dayOfWeek === 6) {
      count += 0.5;
    } else {
      // Segunda a Sexta conta como 1
      count += 1;
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
  const result = calculateTrendDetailed(value, periodStart);
  return result.projected;
}

/**
 * Versão detalhada que retorna também os dias úteis para exibição de avisos
 */
export function calculateTrendDetailed(value: number, periodStart: Date): { projected: number; workedDays: number; totalDays: number } {
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
