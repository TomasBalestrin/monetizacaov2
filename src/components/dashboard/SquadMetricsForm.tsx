import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PeriodTypeSelector, type PeriodType } from './PeriodTypeSelector';
import { useClosers, type CloserMetricRecord } from '@/hooks/useMetrics';

const squadMetricsSchema = z.object({
  period_type: z.enum(['day', 'week', 'month']),
  closer_id: z.string().min(1, 'Selecione um closer'),
  selected_date: z.date({ required_error: 'Selecione uma data' }),
  calls: z.coerce.number().int().min(0),
  sales: z.coerce.number().int().min(0),
  revenue: z.coerce.number().min(0),
  entries: z.coerce.number().min(0),
  revenue_trend: z.coerce.number().min(0).optional(),
  entries_trend: z.coerce.number().min(0).optional(),
  cancellations: z.coerce.number().int().min(0).optional(),
  cancellation_value: z.coerce.number().min(0).optional(),
  cancellation_entries: z.coerce.number().min(0).optional(),
});

export type SquadMetricsFormValues = z.infer<typeof squadMetricsSchema>;

interface SquadMetricsFormProps {
  squadId: string;
  defaultCloserId?: string;
  defaultMetric?: CloserMetricRecord;
  onSubmit: (values: SquadMetricsFormValues, period: { start: Date; end: Date }) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

function detectPeriodType(startDate: string, endDate: string): PeriodType {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const daysDiff = differenceInDays(end, start);
  
  if (daysDiff === 0) return 'day';
  if (daysDiff <= 7) return 'week';
  return 'month';
}

function calculatePeriod(date: Date, type: PeriodType) {
  switch (type) {
    case 'day':
      return {
        start: startOfDay(date),
        end: endOfDay(date),
      };
    case 'week':
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }),
        end: endOfWeek(date, { weekStartsOn: 1 }),
      };
    case 'month':
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
  }
}

function formatPeriodDisplay(date: Date | undefined, type: PeriodType): string {
  if (!date) return 'Selecione...';
  
  const period = calculatePeriod(date, type);
  
  switch (type) {
    case 'day':
      return format(date, "dd 'de' MMMM, yyyy", { locale: ptBR });
    case 'week':
      return `${format(period.start, 'dd/MM', { locale: ptBR })} - ${format(period.end, 'dd/MM/yyyy', { locale: ptBR })}`;
    case 'month':
      return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  }
}

export function SquadMetricsForm({ 
  squadId, 
  defaultCloserId, 
  defaultMetric,
  onSubmit, 
  isLoading,
  submitLabel = 'Adicionar Métrica'
}: SquadMetricsFormProps) {
  const { data: closers } = useClosers(squadId);
  
  // Detect period type from existing metric
  const initialPeriodType = defaultMetric 
    ? detectPeriodType(defaultMetric.period_start, defaultMetric.period_end)
    : 'week';
  
  const form = useForm<SquadMetricsFormValues>({
    resolver: zodResolver(squadMetricsSchema),
    defaultValues: {
      period_type: initialPeriodType,
      closer_id: defaultMetric?.closer_id || defaultCloserId || '',
      selected_date: defaultMetric ? parseISO(defaultMetric.period_start) : new Date(),
      calls: defaultMetric?.calls ?? 0,
      sales: defaultMetric?.sales ?? 0,
      revenue: defaultMetric?.revenue ?? 0,
      entries: defaultMetric?.entries ?? 0,
      revenue_trend: defaultMetric?.revenue_trend ?? 0,
      entries_trend: defaultMetric?.entries_trend ?? 0,
      cancellations: defaultMetric?.cancellations ?? 0,
      cancellation_value: defaultMetric?.cancellation_value ?? 0,
      cancellation_entries: defaultMetric?.cancellation_entries ?? 0,
    },
  });

  // Reset form when defaultMetric changes (for edit mode)
  useEffect(() => {
    if (defaultMetric) {
      form.reset({
        period_type: detectPeriodType(defaultMetric.period_start, defaultMetric.period_end),
        closer_id: defaultMetric.closer_id,
        selected_date: parseISO(defaultMetric.period_start),
        calls: defaultMetric.calls,
        sales: defaultMetric.sales,
        revenue: defaultMetric.revenue,
        entries: defaultMetric.entries,
        revenue_trend: defaultMetric.revenue_trend ?? 0,
        entries_trend: defaultMetric.entries_trend ?? 0,
        cancellations: defaultMetric.cancellations ?? 0,
        cancellation_value: defaultMetric.cancellation_value ?? 0,
        cancellation_entries: defaultMetric.cancellation_entries ?? 0,
      });
    }
  }, [defaultMetric, form]);

  const periodType = form.watch('period_type');
  const selectedDate = form.watch('selected_date');

  const handleSubmit = async (values: SquadMetricsFormValues) => {
    const period = calculatePeriod(values.selected_date, values.period_type);
    await onSubmit(values, period);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Period Type Selector */}
        <FormField
          control={form.control}
          name="period_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Período</FormLabel>
              <FormControl>
                <PeriodTypeSelector
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Closer Selector */}
        <FormField
          control={form.control}
          name="closer_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Closer</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um closer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {closers?.map((closer) => (
                    <SelectItem key={closer.id} value={closer.id}>
                      {closer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Selector */}
        <FormField
          control={form.control}
          name="selected_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data/Período</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {formatPeriodDisplay(field.value, periodType)}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    locale={ptBR}
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                {selectedDate && `Período: ${format(calculatePeriod(selectedDate, periodType).start, 'dd/MM/yyyy')} a ${format(calculatePeriod(selectedDate, periodType).end, 'dd/MM/yyyy')}`}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Divider */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Métricas de Desempenho</h4>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="calls"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calls</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sales"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendas</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="revenue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Faturamento (R$)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="entries"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entradas (R$)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Trend Metrics */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Tendências</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="revenue_trend"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tend. Faturamento (R$)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="entries_trend"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tend. Entradas (R$)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Cancellation Metrics */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Cancelamentos</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cancellations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nº Cancelamentos</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cancellation_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Venda Cancel. (R$)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cancellation_entries"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Valor Entrada Cancel. (R$)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Salvando...' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
