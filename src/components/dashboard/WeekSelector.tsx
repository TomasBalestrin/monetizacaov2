import React, { useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks, format, isBefore, isAfter, max, min } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface WeekOption {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  label: string;
  weekKey: string; // yyyy-MM-dd of week start (Monday)
}

export function getWeeksOfMonth(month: Date): WeekOption[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const weeks: WeekOption[] = [];

  // Start from the Monday of the week containing the first day of month
  let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  let weekNumber = 1;

  while (isBefore(weekStart, monthEnd) || weekStart.getTime() === monthEnd.getTime()) {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    // Clamp to month boundaries
    const clampedStart = max([weekStart, monthStart]);
    const clampedEnd = min([weekEnd, monthEnd]);

    // Only include if there's overlap with the month
    if (!isAfter(clampedStart, clampedEnd)) {
      const label = `Sem ${weekNumber} - ${format(clampedStart, 'dd/MM')} a ${format(clampedEnd, 'dd/MM')}`;
      weeks.push({
        weekNumber,
        startDate: clampedStart,
        endDate: clampedEnd,
        label,
        weekKey: format(startOfWeek(clampedStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      });
      weekNumber++;
    }

    weekStart = addWeeks(weekStart, 1);
  }

  return weeks;
}

interface WeekSelectorProps {
  selectedMonth: Date;
  selectedWeek: string | null; // weekKey or null for "all"
  onWeekChange: (weekKey: string | null) => void;
  className?: string;
}

export function WeekSelector({ selectedMonth, selectedWeek, onWeekChange, className }: WeekSelectorProps) {
  const weeks = useMemo(() => getWeeksOfMonth(selectedMonth), [selectedMonth]);

  return (
    <Select
      value={selectedWeek || 'all'}
      onValueChange={(value) => onWeekChange(value === 'all' ? null : value)}
    >
      <SelectTrigger className={`w-[220px] ${className || ''}`}>
        <SelectValue placeholder="Todas as Semanas" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as Semanas</SelectItem>
        {weeks.map((week) => (
          <SelectItem key={week.weekKey} value={week.weekKey}>
            {week.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
