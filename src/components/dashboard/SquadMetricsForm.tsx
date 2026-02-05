import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CalendarIcon, 
  Phone, 
  Target, 
  DollarSign, 
  TrendingUp, 
  XCircle, 
  ChevronDown,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PeriodTypeSelector, type PeriodType } from './PeriodTypeSelector';
import { MonthSelector } from './MonthSelector';
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

// Helper component for metric inputs with icons
interface MetricInputProps {
  icon: React.ElementType;
  label: string;
  iconBgColor: string;
  iconColor: string;
  children: React.ReactNode;
}

function MetricInput({ icon: Icon, label, iconBgColor, iconColor, children }: MetricInputProps) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn("p-1.5 rounded-md", iconBgColor)}>
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
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

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Generate consistent color from name
function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500/20 text-blue-400',
    'bg-purple-500/20 text-purple-400',
    'bg-emerald-500/20 text-emerald-400',
    'bg-amber-500/20 text-amber-400',
    'bg-rose-500/20 text-rose-400',
    'bg-cyan-500/20 text-cyan-400',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
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
  const [showCancellations, setShowCancellations] = useState(
    !!defaultMetric && (
      (defaultMetric.cancellations ?? 0) > 0 ||
      (defaultMetric.cancellation_value ?? 0) > 0 ||
      (defaultMetric.cancellation_entries ?? 0) > 0
    )
  );
  
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
      
      // Open cancellations section if there's data
      if (
        (defaultMetric.cancellations ?? 0) > 0 ||
        (defaultMetric.cancellation_value ?? 0) > 0 ||
        (defaultMetric.cancellation_entries ?? 0) > 0
      ) {
        setShowCancellations(true);
      }
    }
  }, [defaultMetric, form]);

  const periodType = form.watch('period_type');
  const selectedDate = form.watch('selected_date');
  const selectedCloserId = form.watch('closer_id');
  
  const selectedCloser = closers?.find(c => c.id === selectedCloserId);

  // Quick date setters
  const setQuickDate = (type: 'today' | 'yesterday' | 'thisWeek') => {
    const today = new Date();
    switch (type) {
      case 'today':
        form.setValue('selected_date', today);
        form.setValue('period_type', 'day');
        break;
      case 'yesterday':
        form.setValue('selected_date', subDays(today, 1));
        form.setValue('period_type', 'day');
        break;
      case 'thisWeek':
        form.setValue('selected_date', today);
        form.setValue('period_type', 'week');
        break;
    }
  };

  const handleSubmit = async (values: SquadMetricsFormValues) => {
    const period = calculatePeriod(values.selected_date, values.period_type);
    await onSubmit(values, period);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        {/* Closer Selector with Avatar */}
        <FormField
          control={form.control}
          name="closer_id"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 rounded-md bg-primary/20">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Closer</span>
              </div>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12 bg-muted/30 border-border/50">
                    <SelectValue placeholder="Selecione um closer">
                      {selectedCloser && (
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                            getAvatarColor(selectedCloser.name)
                          )}>
                            {getInitials(selectedCloser.name)}
                          </div>
                          <span className="font-medium">{selectedCloser.name}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {closers?.map((closer) => (
                    <SelectItem key={closer.id} value={closer.id} className="py-2.5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                          getAvatarColor(closer.name)
                        )}>
                          {getInitials(closer.name)}
                        </div>
                        <span>{closer.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Period Type Selector */}
        <FormField
          control={form.control}
          name="period_type"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 rounded-md bg-purple-500/20">
                  <CalendarIcon className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Tipo de Período</span>
              </div>
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

        {/* Date Selector with Quick Buttons */}
        <FormField
          control={form.control}
          name="selected_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-md bg-amber-500/20">
                    <CalendarIcon className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {periodType === 'month' ? 'Mês' : 'Data'}
                  </span>
                </div>
                {periodType !== 'month' && (
                  <div className="flex gap-1.5">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-xs px-2 bg-muted/30 border-border/50 hover:bg-muted/50"
                      onClick={() => setQuickDate('today')}
                    >
                      Hoje
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-xs px-2 bg-muted/30 border-border/50 hover:bg-muted/50"
                      onClick={() => setQuickDate('yesterday')}
                    >
                      Ontem
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-xs px-2 bg-muted/30 border-border/50 hover:bg-muted/50"
                      onClick={() => setQuickDate('thisWeek')}
                    >
                      Semana
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Month Selector for monthly periods */}
              {periodType === 'month' ? (
                <div className="flex justify-center py-2 px-3 rounded-lg bg-muted/30 border border-border/50">
                  <MonthSelector
                    selectedMonth={field.value || new Date()}
                    onMonthChange={(date) => field.onChange(date)}
                  />
                </div>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal h-11 bg-muted/30 border-border/50',
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
              )}
              
              {selectedDate && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/20 border border-border/30">
                  <span className="text-xs text-muted-foreground">Período:</span>
                  <span className="text-xs font-medium text-foreground">
                    {format(calculatePeriod(selectedDate, periodType).start, 'dd/MM/yyyy')} a {format(calculatePeriod(selectedDate, periodType).end, 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Performance Metrics Section */}
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/20">
              <Target className="h-4 w-4 text-blue-400" />
            </div>
            <h4 className="text-sm font-semibold text-blue-400">Métricas de Performance</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="calls"
              render={({ field }) => (
                <FormItem>
                  <MetricInput
                    icon={Phone}
                    label="Calls"
                    iconBgColor="bg-blue-500/20"
                    iconColor="text-blue-400"
                  >
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        className="bg-background/50 border-border/50"
                        {...field} 
                      />
                    </FormControl>
                  </MetricInput>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sales"
              render={({ field }) => (
                <FormItem>
                  <MetricInput
                    icon={Target}
                    label="Vendas"
                    iconBgColor="bg-blue-500/20"
                    iconColor="text-blue-400"
                  >
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        className="bg-background/50 border-border/50"
                        {...field} 
                      />
                    </FormControl>
                  </MetricInput>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Revenue Metrics Section */}
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/20">
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <h4 className="text-sm font-semibold text-emerald-400">Faturamento</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="revenue"
              render={({ field }) => (
                <FormItem>
                  <MetricInput
                    icon={DollarSign}
                    label="Faturamento (R$)"
                    iconBgColor="bg-emerald-500/20"
                    iconColor="text-emerald-400"
                  >
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        step="0.01" 
                        className="bg-background/50 border-border/50"
                        {...field} 
                      />
                    </FormControl>
                  </MetricInput>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="entries"
              render={({ field }) => (
                <FormItem>
                  <MetricInput
                    icon={DollarSign}
                    label="Entradas (R$)"
                    iconBgColor="bg-emerald-500/20"
                    iconColor="text-emerald-400"
                  >
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        step="0.01" 
                        className="bg-background/50 border-border/50"
                        {...field} 
                      />
                    </FormControl>
                  </MetricInput>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="revenue_trend"
              render={({ field }) => (
                <FormItem>
                  <MetricInput
                    icon={TrendingUp}
                    label="Tend. Faturamento (R$)"
                    iconBgColor="bg-emerald-500/20"
                    iconColor="text-emerald-400"
                  >
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        step="0.01" 
                        className="bg-background/50 border-border/50"
                        {...field} 
                      />
                    </FormControl>
                  </MetricInput>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="entries_trend"
              render={({ field }) => (
                <FormItem>
                  <MetricInput
                    icon={TrendingUp}
                    label="Tend. Entradas (R$)"
                    iconBgColor="bg-emerald-500/20"
                    iconColor="text-emerald-400"
                  >
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        step="0.01" 
                        className="bg-background/50 border-border/50"
                        {...field} 
                      />
                    </FormControl>
                  </MetricInput>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Cancellations Section - Collapsible */}
        <Collapsible open={showCancellations} onOpenChange={setShowCancellations}>
          <CollapsibleTrigger asChild>
            <Button 
              type="button"
              variant="ghost" 
              className={cn(
                "w-full justify-between h-12 px-4 rounded-lg border transition-all",
                showCancellations 
                  ? "border-destructive/30 bg-destructive/5" 
                  : "border-border/50 bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-md",
                  showCancellations ? "bg-destructive/20" : "bg-muted"
                )}>
                  <XCircle className={cn(
                    "h-4 w-4",
                    showCancellations ? "text-destructive" : "text-muted-foreground"
                  )} />
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  showCancellations ? "text-destructive" : "text-muted-foreground"
                )}>
                  Cancelamentos
                </span>
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                showCancellations && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="cancellations"
                  render={({ field }) => (
                    <FormItem>
                      <MetricInput
                        icon={XCircle}
                        label="Quantidade"
                        iconBgColor="bg-destructive/20"
                        iconColor="text-destructive"
                      >
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            className="bg-background/50 border-border/50"
                            {...field} 
                          />
                        </FormControl>
                      </MetricInput>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cancellation_value"
                  render={({ field }) => (
                    <FormItem>
                      <MetricInput
                        icon={DollarSign}
                        label="Valor Venda"
                        iconBgColor="bg-destructive/20"
                        iconColor="text-destructive"
                      >
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            step="0.01" 
                            className="bg-background/50 border-border/50"
                            {...field} 
                          />
                        </FormControl>
                      </MetricInput>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cancellation_entries"
                  render={({ field }) => (
                    <FormItem>
                      <MetricInput
                        icon={DollarSign}
                        label="Valor Entrada"
                        iconBgColor="bg-destructive/20"
                        iconColor="text-destructive"
                      >
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            step="0.01" 
                            className="bg-background/50 border-border/50"
                            {...field} 
                          />
                        </FormControl>
                      </MetricInput>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold" 
          disabled={isLoading}
        >
          {isLoading ? 'Salvando...' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
