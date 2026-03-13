import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarIcon,
  DollarSign,
  Target,
  User,
  Layers,
  CheckCircle2,
  XIcon,
  Hash,
  Filter,
  Phone,
} from 'lucide-react';
import { cn, parseDateString } from '@/lib/utils';
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
import type { PeriodType } from './PeriodTypeSelector';
import { useClosers, type CloserMetricRecord } from '@/controllers/useCloserController';
import { useProducts, useFunnels } from '@/controllers/useFunnelController';
import { useSDRs } from '@/controllers/useSdrController';

const callEntrySchema = z.object({
  had_sale: z.boolean(),
  product_id: z.string().optional(),
  revenue: z.coerce.number().min(0),
  entries: z.coerce.number().min(0),
});

const squadMetricsSchema = z.object({
  closer_id: z.string().min(1, 'Selecione um closer'),
  selected_date: z.date({ required_error: 'Selecione uma data' }),
  calls: z.coerce.number().int().min(0),

  // Campos para call única (calls <= 1)
  had_sale: z.boolean(),
  product_id: z.string().optional(),
  revenue: z.coerce.number().min(0),
  entries: z.coerce.number().min(0),

  // Entradas individuais (calls > 1)
  call_entries: z.array(callEntrySchema).optional(),

  // --- Compatibilidade com SquadMetricsDialog ---
  period_type: z.enum(['day', 'week', 'month']).optional().default('day'),
  sales: z.coerce.number().int().min(0).optional().default(0),

  // --- Campos arquivados ---
  revenue_trend: z.coerce.number().min(0).optional(),
  entries_trend: z.coerce.number().min(0).optional(),
  cancellations: z.coerce.number().int().min(0).optional(),
  cancellation_value: z.coerce.number().min(0).optional(),
  cancellation_entries: z.coerce.number().min(0).optional(),
  funnel_id: z.string().optional(),
  leads_count: z.coerce.number().int().min(0).optional(),
  qualified_count: z.coerce.number().int().min(0).optional(),
  sdr_id: z.string().optional(),
  funnel_breakdown: z.array(z.any()).optional(),
});

export type SquadMetricsFormValues = z.infer<typeof squadMetricsSchema>;

interface SquadMetricsFormProps {
  squadId?: string;
  defaultCloserId?: string;
  defaultMetric?: CloserMetricRecord;
  selectedMonth?: Date;
  onSubmit: (values: SquadMetricsFormValues, period: { start: Date; end: Date }) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

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

function calculatePeriod(date: Date, type: PeriodType) {
  switch (type) {
    case 'day':
      return { start: startOfDay(date), end: endOfDay(date) };
    case 'week':
      return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(date), end: endOfMonth(date) };
  }
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500/20 text-blue-400',
    'bg-purple-500/20 text-purple-400',
    'bg-emerald-500/20 text-emerald-400',
    'bg-amber-500/20 text-amber-400',
    'bg-rose-500/20 text-rose-400',
    'bg-cyan-500/20 text-cyan-400',
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

export function SquadMetricsForm({
  squadId,
  defaultCloserId,
  defaultMetric,
  selectedMonth,
  onSubmit,
  isLoading,
  submitLabel = 'Adicionar Métrica'
}: SquadMetricsFormProps) {
  const { data: closers } = useClosers(squadId);
  const { data: allProducts } = useProducts();
  const { data: allFunnels } = useFunnels();
  const { data: allSDRs } = useSDRs();

  const form = useForm<SquadMetricsFormValues>({
    resolver: zodResolver(squadMetricsSchema),
    defaultValues: {
      closer_id: defaultMetric?.closer_id || defaultCloserId || '',
      selected_date: defaultMetric ? parseDateString(defaultMetric.period_start) : (selectedMonth || new Date()),
      calls: defaultMetric?.calls ?? 0,
      had_sale: defaultMetric ? (defaultMetric.sales ?? 0) > 0 : false,
      product_id: (defaultMetric as any)?.product_id || '',
      revenue: defaultMetric?.revenue ?? 0,
      entries: defaultMetric?.entries ?? 0,
      call_entries: [],
      period_type: 'day',
      sales: defaultMetric?.sales ?? 0,
      revenue_trend: defaultMetric?.revenue_trend ?? 0,
      entries_trend: defaultMetric?.entries_trend ?? 0,
      cancellations: defaultMetric?.cancellations ?? 0,
      cancellation_value: defaultMetric?.cancellation_value ?? 0,
      cancellation_entries: defaultMetric?.cancellation_entries ?? 0,
      funnel_id: defaultMetric?.funnel_id || '',
      sdr_id: (defaultMetric as any)?.sdr_id || '',
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'call_entries',
  });

  useEffect(() => {
    if (defaultMetric) {
      form.reset({
        closer_id: defaultMetric.closer_id,
        selected_date: parseDateString(defaultMetric.period_start),
        calls: defaultMetric.calls,
        had_sale: (defaultMetric.sales ?? 0) > 0,
        product_id: (defaultMetric as any)?.product_id || '',
        revenue: defaultMetric.revenue,
        entries: defaultMetric.entries,
        call_entries: [],
        period_type: 'day',
        sales: defaultMetric.sales ?? 0,
        revenue_trend: defaultMetric.revenue_trend ?? 0,
        entries_trend: defaultMetric.entries_trend ?? 0,
        cancellations: defaultMetric.cancellations ?? 0,
        cancellation_value: defaultMetric.cancellation_value ?? 0,
        cancellation_entries: defaultMetric.cancellation_entries ?? 0,
        funnel_id: defaultMetric.funnel_id || '',
        sdr_id: (defaultMetric as any)?.sdr_id || '',
      });
    }
  }, [defaultMetric, form]);

  const numCalls = form.watch('calls');
  const selectedCloserId = form.watch('closer_id');
  const hadSale = form.watch('had_sale');
  const selectedCloser = closers?.find(c => c.id === selectedCloserId);

  // Sincronizar call_entries quando calls muda
  React.useEffect(() => {
    const n = Number(numCalls) || 0;
    if (n > 1) {
      const currentEntries = form.getValues('call_entries') || [];
      const newEntries = Array.from({ length: n }, (_, i) => ({
        had_sale: currentEntries[i]?.had_sale ?? false,
        product_id: currentEntries[i]?.product_id || '',
        revenue: currentEntries[i]?.revenue ?? 0,
        entries: currentEntries[i]?.entries ?? 0,
      }));
      replace(newEntries);
    } else {
      replace([]);
    }
  }, [numCalls]);

  const showIndividualEntries = Number(numCalls) > 1;

  const handleSubmit = async (values: SquadMetricsFormValues) => {
    const period = calculatePeriod(values.selected_date, 'day');
    const cleanFunnelId = values.funnel_id === 'none' ? undefined : values.funnel_id;
    const cleanSdrId = values.sdr_id === 'none' ? undefined : values.sdr_id;

    if (showIndividualEntries && values.call_entries && values.call_entries.length > 0) {
      // Múltiplas calls: somar totais das entradas individuais
      const totalSales = values.call_entries.filter(e => e.had_sale).length;
      const totalRevenue = values.call_entries.reduce((s, e) => s + (e.had_sale ? e.revenue : 0), 0);
      const totalEntries = values.call_entries.reduce((s, e) => s + (e.had_sale ? e.entries : 0), 0);

      const enriched: SquadMetricsFormValues = {
        ...values,
        sales: totalSales,
        revenue: totalRevenue,
        entries: totalEntries,
        funnel_id: cleanFunnelId,
        sdr_id: cleanSdrId,
        period_type: 'day',
      };
      await onSubmit(enriched, period);
    } else {
      // Call única
      const cleanProductId = values.product_id === 'none' ? undefined : values.product_id;
      const enriched: SquadMetricsFormValues = {
        ...values,
        sales: values.had_sale ? 1 : 0,
        revenue: values.had_sale ? values.revenue : 0,
        entries: values.had_sale ? values.entries : 0,
        product_id: values.had_sale ? cleanProductId : undefined,
        funnel_id: cleanFunnelId,
        sdr_id: cleanSdrId,
        period_type: 'day',
      };
      await onSubmit(enriched, period);
    }
  };

  const setQuickDate = (type: 'today' | 'yesterday') => {
    const today = new Date();
    form.setValue('selected_date', type === 'today' ? today : subDays(today, 1));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        {/* Closer Selector */}
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

        {/* Data */}
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
                  <span className="text-xs font-medium text-muted-foreground">Data</span>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    type="button" variant="outline" size="sm"
                    className="h-7 text-xs px-2 bg-muted/30 border-border/50 hover:bg-muted/50"
                    onClick={() => setQuickDate('today')}
                  >
                    Hoje
                  </Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    className="h-7 text-xs px-2 bg-muted/30 border-border/50 hover:bg-muted/50"
                    onClick={() => setQuickDate('yesterday')}
                  >
                    Ontem
                  </Button>
                </div>
              </div>
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
                      {field.value
                        ? format(field.value, "dd 'de' MMMM, yyyy", { locale: ptBR })
                        : 'Selecione...'}
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
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Funil */}
        {allFunnels && allFunnels.length > 0 && (
          <FormField
            control={form.control}
            name="funnel_id"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-md bg-violet-500/20">
                    <Filter className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Funil</span>
                </div>
                <Select onValueChange={field.onChange} value={field.value || 'none'}>
                  <FormControl>
                    <SelectTrigger className="h-11 bg-muted/30 border-border/50">
                      <SelectValue placeholder="Selecione o funil" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {allFunnels.map((funnel) => (
                      <SelectItem key={funnel.id} value={funnel.id}>
                        {funnel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* SDR que agendou */}
        {allSDRs && allSDRs.length > 0 && (
          <FormField
            control={form.control}
            name="sdr_id"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-md bg-cyan-500/20">
                    <Phone className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">SDR que agendou</span>
                </div>
                <Select onValueChange={field.onChange} value={field.value || 'none'}>
                  <FormControl>
                    <SelectTrigger className="h-11 bg-muted/30 border-border/50">
                      <SelectValue placeholder="Selecione o SDR" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {allSDRs.map((sdr) => (
                      <SelectItem key={sdr.id} value={sdr.id}>
                        {sdr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Calls */}
        <FormField
          control={form.control}
          name="calls"
          render={({ field }) => (
            <FormItem>
              <MetricInput
                icon={Hash}
                label="Quantidade de Calls"
                iconBgColor="bg-blue-500/20"
                iconColor="text-blue-400"
              >
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    className="bg-muted/30 border-border/50"
                    {...field}
                  />
                </FormControl>
              </MetricInput>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* === Call única (calls <= 1) === */}
        {!showIndividualEntries && (
          <>
            <FormField
              control={form.control}
              name="had_sale"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1.5 rounded-md bg-emerald-500/20">
                      <Target className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Houve venda?</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button" variant="outline"
                      className={cn(
                        "h-11 gap-2 transition-all",
                        field.value
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/20"
                          : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50"
                      )}
                      onClick={() => field.onChange(true)}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Sim
                    </Button>
                    <Button
                      type="button" variant="outline"
                      className={cn(
                        "h-11 gap-2 transition-all",
                        !field.value
                          ? "bg-muted/50 border-border text-foreground hover:bg-muted/60"
                          : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50"
                      )}
                      onClick={() => field.onChange(false)}
                    >
                      <XIcon className="h-4 w-4" /> Não
                    </Button>
                  </div>
                </FormItem>
              )}
            />

            {hadSale && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-emerald-500/20">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-emerald-400">Dados da Venda</h4>
                </div>

                {allProducts && allProducts.length > 0 && (
                  <FormField
                    control={form.control}
                    name="product_id"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Layers className="h-3 w-3 text-emerald-400" />
                          <span className="text-xs text-muted-foreground">Produto</span>
                        </div>
                        <Select onValueChange={field.onChange} value={field.value || 'none'}>
                          <FormControl>
                            <SelectTrigger className="h-10 bg-background/50 border-border/50">
                              <SelectValue placeholder="Selecione o produto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum (geral)</SelectItem>
                            {allProducts.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="revenue"
                  render={({ field }) => (
                    <FormItem>
                      <MetricInput icon={DollarSign} label="Faturamento (R$)" iconBgColor="bg-emerald-500/20" iconColor="text-emerald-400">
                        <FormControl>
                          <Input type="number" min={0} step="0.01" className="bg-background/50 border-border/50" {...field} />
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
                      <MetricInput icon={DollarSign} label="Entrada (R$)" iconBgColor="bg-emerald-500/20" iconColor="text-emerald-400">
                        <FormControl>
                          <Input type="number" min={0} step="0.01" className="bg-background/50 border-border/50" {...field} />
                        </FormControl>
                      </MetricInput>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </>
        )}

        {/* === Múltiplas calls (calls > 1) - entrada individual por call === */}
        {showIndividualEntries && fields.map((entry, index) => {
          const entryHadSale = form.watch(`call_entries.${index}.had_sale`);

          return (
            <div
              key={entry.id}
              className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-3"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Call {index + 1}
              </p>

              {/* Venda sim/não */}
              <FormField
                control={form.control}
                name={`call_entries.${index}.had_sale`}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target className="h-3 w-3 text-emerald-400" />
                      <span className="text-xs text-muted-foreground">Houve venda?</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button" variant="outline"
                        className={cn(
                          "h-9 gap-1.5 text-xs transition-all",
                          field.value
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/20"
                            : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50"
                        )}
                        onClick={() => field.onChange(true)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Sim
                      </Button>
                      <Button
                        type="button" variant="outline"
                        className={cn(
                          "h-9 gap-1.5 text-xs transition-all",
                          !field.value
                            ? "bg-muted/50 border-border text-foreground hover:bg-muted/60"
                            : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50"
                        )}
                        onClick={() => field.onChange(false)}
                      >
                        <XIcon className="h-3.5 w-3.5" /> Não
                      </Button>
                    </div>
                  </FormItem>
                )}
              />

              {/* Dados da venda - aparecem se had_sale */}
              {entryHadSale && (
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Produto */}
                  {allProducts && allProducts.length > 0 && (
                    <FormField
                      control={form.control}
                      name={`call_entries.${index}.product_id`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Layers className="h-3 w-3 text-emerald-400" />
                            <span className="text-xs text-muted-foreground">Produto</span>
                          </div>
                          <Select onValueChange={field.onChange} value={field.value || 'none'}>
                            <FormControl>
                              <SelectTrigger className="h-9 bg-background/50 border-border/50">
                                <SelectValue placeholder="Produto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {allProducts.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Faturamento */}
                  <FormField
                    control={form.control}
                    name={`call_entries.${index}.revenue`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="h-3 w-3 text-emerald-400" />
                          <span className="text-xs text-muted-foreground">Faturamento (R$)</span>
                        </div>
                        <FormControl>
                          <Input type="number" min={0} step="0.01" className="h-9 bg-background/50 border-border/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Entrada */}
                  <FormField
                    control={form.control}
                    name={`call_entries.${index}.entries`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="h-3 w-3 text-emerald-400" />
                          <span className="text-xs text-muted-foreground">Entrada (R$)</span>
                        </div>
                        <FormControl>
                          <Input type="number" min={0} step="0.01" className="h-9 bg-background/50 border-border/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Resumo das calls quando > 1 */}
        {showIndividualEntries && fields.length > 0 && (() => {
          const entries = form.watch('call_entries') || [];
          const totalSales = entries.filter(e => e.had_sale).length;
          const totalRevenue = entries.reduce((s, e) => s + (e.had_sale ? (Number(e.revenue) || 0) : 0), 0);
          const totalEntries = entries.reduce((s, e) => s + (e.had_sale ? (Number(e.entries) || 0) : 0), 0);

          if (totalSales === 0) return null;

          return (
            <div className="flex items-center justify-between px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-medium text-emerald-400">Totais:</span>
              <div className="flex items-center gap-4 text-xs font-semibold text-foreground">
                <span>{totalSales} venda{totalSales !== 1 ? 's' : ''}</span>
                <span>R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span>Ent: R$ {totalEntries.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          );
        })()}

        {/* ===== CAMPOS ARQUIVADOS =====
        - period_type, revenue_trend, entries_trend
        - cancellations, cancellation_value, cancellation_entries
        - leads_count, qualified_count, funnel_breakdown
        ===== FIM ===== */}

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
