import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn, parseDateString } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface PeriodFilterProps {
  periodStart: string | undefined;
  periodEnd: string | undefined;
  onPeriodChange: (start: string | undefined, end: string | undefined) => void;
}

type PresetOption = 'today' | 'week' | 'month' | null;

export function PeriodFilter({ periodStart, periodEnd, onPeriodChange }: PeriodFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Sync external props with internal state when popover opens
  useEffect(() => {
    if (isOpen && periodStart && periodEnd) {
      setDateRange({
        from: parseDateString(periodStart),
        to: parseDateString(periodEnd),
      });
    }
  }, [isOpen, periodStart, periodEnd]);

  const handlePresetClick = (preset: PresetOption) => {
    setSelectedPreset(preset);
    const today = new Date();

    switch (preset) {
      case 'today':
        setDateRange({
          from: startOfDay(today),
          to: endOfDay(today),
        });
        break;
      case 'week':
        setDateRange({
          from: startOfWeek(today, { weekStartsOn: 1 }),
          to: endOfWeek(today, { weekStartsOn: 1 }),
        });
        break;
      case 'month':
        setDateRange({
          from: startOfMonth(today),
          to: endOfMonth(today),
        });
        break;
    }
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    setSelectedPreset(null); // Clear preset when manually selecting
  };

  const handleConfirm = () => {
    if (dateRange?.from && dateRange?.to) {
      onPeriodChange(
        format(dateRange.from, 'yyyy-MM-dd'),
        format(dateRange.to, 'yyyy-MM-dd')
      );
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setDateRange(undefined);
    setSelectedPreset(null);
    onPeriodChange(undefined, undefined);
    setIsOpen(false);
  };

  const getDisplayLabel = () => {
    if (!periodStart && !periodEnd) return 'Selecionar período';
    if (periodStart && periodEnd) {
      const start = parseDateString(periodStart);
      const end = parseDateString(periodEnd);
      return `${format(start, 'dd/MM', { locale: ptBR })} - ${format(end, 'dd/MM', { locale: ptBR })}`;
    }
    return 'Período';
  };

  const hasActiveFilter = periodStart || periodEnd;
  const canConfirm = dateRange?.from && dateRange?.to;

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal min-w-[180px]",
              hasActiveFilter && "border-primary/50 bg-primary/5"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className={hasActiveFilter ? "text-foreground" : "text-muted-foreground"}>
              {getDisplayLabel()}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent 
          className="w-auto p-0 bg-card border-border z-50" 
          align="end"
          sideOffset={8}
        >
          <div className="p-4 space-y-4">
            {/* Preset buttons */}
            <div className="flex gap-2">
              <Button
                variant={selectedPreset === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetClick('today')}
                className="flex-1"
              >
                Hoje
              </Button>
              <Button
                variant={selectedPreset === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetClick('week')}
                className="flex-1"
              >
                Esta Semana
              </Button>
              <Button
                variant={selectedPreset === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetClick('month')}
                className="flex-1"
              >
                Este Mês
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">ou selecione um período</span>
              </div>
            </div>

            {/* Dual month calendar */}
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={dateRange}
              onSelect={handleDateRangeSelect}
              locale={ptBR}
              className="pointer-events-auto rounded-md border-0"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                  "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-9 w-9 text-center text-sm p-0 relative",
                day: cn(
                  "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md inline-flex items-center justify-center"
                ),
                day_range_start: "day-range-start bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                day_range_end: "day-range-end bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "day-outside text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
            />

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-border">
              {hasActiveFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-muted-foreground"
                >
                  <X className="mr-1 h-4 w-4" />
                  Limpar
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="ml-auto"
              >
                <Check className="mr-1 h-4 w-4" />
                Confirmar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
