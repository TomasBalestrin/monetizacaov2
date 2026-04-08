import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarIcon,
  Users,
  Calendar,
  UserCheck,
  ShoppingCart,
  Clock,
  Zap,
  Filter,
  CalendarPlus,
  Phone,
  Link,
  Ticket,
  CheckCircle,
  XCircle,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import { cn, parseDateString } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
import { useSDRs, useSDRFunnels, useSDRFunnelsWithDates, type SDRMetric } from '@/controllers/useSdrController';
import { useFunnels } from '@/controllers/useFunnelController';
import { isPast, parseISO, startOfDay } from 'date-fns';

const sdrMetricsSchema = z.object({
  sdr_id: z.string().min(1, 'Selecione um SDR'),
  date: z.date({ required_error: 'Selecione uma data' }),
  funnel: z.string().optional(),
  activated: z.coerce.number().int().min(0),
  scheduled: z.coerce.number().int().min(0),
  scheduled_follow_up: z.coerce.number().int().min(0),
  scheduled_same_day: z.coerce.number().int().min(0),
  attended: z.coerce.number().int().min(0),
  sales: z.coerce.number().int().min(0),
  // Cancellation fields
  cancellations: z.coerce.number().int().min(0).optional(),
  cancellation_value: z.coerce.number().min(0).optional(),
  cancellation_entries: z.coerce.number().min(0).optional(),
  // Funil Intensivo fields
  fi_called: z.coerce.number().int().min(0).optional(),
  fi_awaiting: z.coerce.number().int().min(0).optional(),
  fi_received_link: z.coerce.number().int().min(0).optional(),
  fi_got_ticket: z.coerce.number().int().min(0).optional(),
  fi_attended: z.coerce.number().int().min(0).optional(),
});

export type SDRMetricsFormValues = z.infer<typeof sdrMetricsSchema>;

interface SDRMetricsFormProps {
  sdrType: 'sdr' | 'social_selling' | 'funil_intensivo';
  defaultSdrId?: string;
  defaultFunnel?: string | null;
  defaultMetric?: SDRMetric;
  onSubmit: (values: SDRMetricsFormValues) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  lockSdr?: boolean;
}

interface MetricInputProps {
  icon: React.ElementType;
  label: string;
  iconColor?: string;
  children: React.ReactNode;
}

function MetricInput({ icon: Icon, label, iconColor = 'text-primary', children }: MetricInputProps) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn("p-1 rounded-md bg-primary/10", iconColor.replace('text-', 'bg-').replace('primary', 'primary/10'))}>
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

export function SDRMetricsForm({
  sdrType,
  defaultSdrId,
  defaultFunnel,
  defaultMetric,
  onSubmit,
  isLoading,
  submitLabel = 'Adicionar Métrica',
  lockSdr,
}: SDRMetricsFormProps) {
  const { data: sdrs } = useSDRs(sdrType);
  
  // Filter out SDRs with empty or invalid IDs
  const validSdrs = sdrs?.filter(sdr => sdr.id && sdr.id.trim() !== '') || [];

  const form = useForm<SDRMetricsFormValues>({
    resolver: zodResolver(sdrMetricsSchema),
    defaultValues: {
      sdr_id: defaultMetric?.sdr_id || defaultSdrId || '',
      date: defaultMetric ? parseDateString(defaultMetric.date) : new Date(),
      funnel: defaultMetric?.funnel || defaultFunnel || 'none',
      activated: defaultMetric?.activated ?? 0,
      scheduled: defaultMetric?.scheduled ?? 0,
      scheduled_follow_up: defaultMetric?.scheduled_follow_up ?? 0,
      scheduled_same_day: defaultMetric?.scheduled_same_day ?? 0,
      attended: defaultMetric?.attended ?? 0,
      sales: defaultMetric?.sales ?? 0,
      cancellations: defaultMetric?.cancellations ?? 0,
      cancellation_value: defaultMetric?.cancellation_value ?? 0,
      cancellation_entries: defaultMetric?.cancellation_entries ?? 0,
      fi_called: defaultMetric?.fi_called ?? 0,
      fi_awaiting: defaultMetric?.fi_awaiting ?? 0,
      fi_received_link: defaultMetric?.fi_received_link ?? 0,
      fi_got_ticket: defaultMetric?.fi_got_ticket ?? 0,
      fi_attended: defaultMetric?.fi_attended ?? 0,
    },
  });

  const isFI = sdrType === 'funil_intensivo';

  // Watch the selected SDR to fetch its funnels
  const selectedSdrId = form.watch('sdr_id');
  const { data: sdrFunnels, isLoading: isLoadingFunnels } = useSDRFunnels(selectedSdrId);
  const { data: funnelsWithDates } = useSDRFunnelsWithDates(isFI ? selectedSdrId : undefined);
  const { data: allFunnels } = useFunnels();

  // Build event date map for FI labels
  const eventDateMap = React.useMemo(() => {
    const map = new Map<string, string | null>();
    if (funnelsWithDates) {
      for (const f of funnelsWithDates) map.set(f.funnel_name, f.event_date);
    }
    return map;
  }, [funnelsWithDates]);

  // Find the active (next upcoming) event for FI auto-selection
  const activeEventFunnel = React.useMemo(() => {
    if (!isFI || !funnelsWithDates || funnelsWithDates.length === 0) return null;
    const upcoming = funnelsWithDates
      .filter(f => f.event_date && !isPast(startOfDay(parseISO(f.event_date))))
      .sort((a, b) => a.event_date!.localeCompare(b.event_date!));
    // Prefer the next upcoming event, otherwise the most recent
    if (upcoming.length > 0) return upcoming[0].funnel_name;
    return funnelsWithDates[0].funnel_name;
  }, [isFI, funnelsWithDates]);

  // Use SDR-specific funnels if available, otherwise show all global funnels
  const displayFunnels = sdrFunnels && sdrFunnels.length > 0
    ? sdrFunnels
    : (allFunnels || []).map(f => f.name);

  // Reset funnel when SDR changes, but NOT on first render (to preserve pre-selected SDR's funnel)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // For FI: auto-select the active event on first render (only for new metrics)
      if (isFI && activeEventFunnel && !defaultMetric) {
        form.setValue('funnel', activeEventFunnel);
      }
      return;
    }
    if (selectedSdrId && !defaultMetric) {
      form.setValue('funnel', isFI && activeEventFunnel ? activeEventFunnel : 'none');
    }
  }, [selectedSdrId, form, defaultMetric, isFI, activeEventFunnel]);

  const handleSubmit = async (values: SDRMetricsFormValues) => {
    // Convert "none" to empty string for submission
    const submissionValues = {
      ...values,
      funnel: values.funnel === 'none' ? '' : values.funnel,
    };
    await onSubmit(submissionValues);
  };

  const setQuickDate = (date: Date) => {
    form.setValue('date', date);
  };

  const hasFunnels = displayFunnels.length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        {/* SDR Selector - Full width with avatar-like styling */}
        <FormField
          control={form.control}
          name="sdr_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-muted-foreground">
                {sdrType === 'sdr' ? 'SDR' : sdrType === 'funil_intensivo' ? 'Funil Intensivo' : 'Social Selling'}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={lockSdr}>
                <FormControl>
                  <SelectTrigger className={cn("h-11 bg-card border-border/50 hover:border-primary/50 transition-colors", lockSdr && "opacity-70 cursor-not-allowed")}>
                    <SelectValue placeholder={`Selecione um ${sdrType === 'sdr' ? 'SDR' : sdrType === 'funil_intensivo' ? 'responsável' : 'Social Selling'}`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover border-border">
                  {validSdrs.map((sdr) => (
                    <SelectItem key={sdr.id} value={sdr.id} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {sdr.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {sdr.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Selector with Quick Actions */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-xs font-medium text-muted-foreground">Data</FormLabel>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'flex-1 h-11 pl-3 text-left font-normal bg-card border-border/50 hover:border-primary/50 transition-colors',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {field.value
                          ? format(field.value, "dd 'de' MMMM, yyyy", { locale: ptBR })
                          : 'Selecione uma data'}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                    <CalendarComponent
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
                
                {/* Quick date buttons */}
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 px-3 text-xs bg-card border-border/50 hover:bg-primary/10 hover:border-primary/50"
                    onClick={() => setQuickDate(new Date())}
                  >
                    Hoje
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 px-3 text-xs bg-card border-border/50 hover:bg-primary/10 hover:border-primary/50"
                    onClick={() => setQuickDate(subDays(new Date(), 1))}
                  >
                    Ontem
                  </Button>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Funnel Selector - Dynamic based on selected SDR */}
        <FormField
          control={form.control}
          name="funnel"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                {isFI ? 'Evento' : 'Funil'}
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || 'none'}
                disabled={!selectedSdrId || isLoadingFunnels}
              >
                <FormControl>
                  <SelectTrigger className="h-10 bg-card border-border/50 hover:border-primary/50 transition-colors">
                    <SelectValue
                      placeholder={
                        !selectedSdrId
                          ? "Selecione um SDR primeiro"
                          : isLoadingFunnels
                            ? "Carregando..."
                            : isFI ? "Selecione o evento" : "Selecione o funil"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover border-border">
                  {!isFI && (
                    <SelectItem value="none" className="cursor-pointer">
                      <span className="text-muted-foreground">Nenhum</span>
                    </SelectItem>
                  )}
                  {hasFunnels && displayFunnels.map((funnel) => {
                    const eventDate = eventDateMap.get(funnel);
                    const label = isFI && eventDate
                      ? `${funnel} (${new Date(eventDate + 'T12:00:00').toLocaleDateString('pt-BR')})`
                      : funnel;
                    return (
                      <SelectItem key={funnel} value={funnel} className="cursor-pointer">
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedSdrId && !isLoadingFunnels && !hasFunnels && (
                <p className="text-xs text-muted-foreground mt-1">
                  {isFI ? 'Nenhum evento cadastrado' : 'Nenhum funil disponivel'}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Performance Metrics Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Zap className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Métricas de Desempenho</h4>
          </div>

          {sdrType === 'funil_intensivo' ? (
            /* Funil Intensivo metrics - 5 fields */
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="fi_called"
                render={({ field }) => (
                  <FormItem>
                    <MetricInput icon={Phone} label="Chamou" iconColor="text-blue-500">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-10 bg-card border-border/50 text-center font-medium hover:border-blue-500/50 focus:border-blue-500 transition-colors"
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
                name="fi_awaiting"
                render={({ field }) => (
                  <FormItem>
                    <MetricInput icon={Clock} label="Aguardando" iconColor="text-orange-500">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-10 bg-card border-border/50 text-center font-medium hover:border-orange-500/50 focus:border-orange-500 transition-colors"
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
                name="fi_received_link"
                render={({ field }) => (
                  <FormItem>
                    <MetricInput icon={Link} label="Receberam Link" iconColor="text-purple-500">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-10 bg-card border-border/50 text-center font-medium hover:border-purple-500/50 focus:border-purple-500 transition-colors"
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
                name="fi_got_ticket"
                render={({ field }) => (
                  <FormItem>
                    <MetricInput icon={Ticket} label="Retiraram Ingresso" iconColor="text-indigo-500">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-10 bg-card border-border/50 text-center font-medium hover:border-indigo-500/50 focus:border-indigo-500 transition-colors"
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
                name="fi_attended"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                      <MetricInput icon={CheckCircle} label="Compareceram" iconColor="text-green-500">
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            className="h-12 bg-card/50 border-green-500/30 text-center text-lg font-bold hover:border-green-500/50 focus:border-green-500 transition-colors"
                            {...field}
                          />
                        </FormControl>
                      </MetricInput>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : (
            /* Standard SDR/Social Selling metrics - 6 fields */
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="activated"
                render={({ field }) => (
                  <FormItem>
                    <MetricInput icon={Users} label="Ativados" iconColor="text-blue-500">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-10 bg-card border-border/50 text-center font-medium hover:border-blue-500/50 focus:border-blue-500 transition-colors"
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
                name="scheduled"
                render={({ field }) => (
                  <FormItem>
                    <MetricInput icon={Calendar} label="Agendados" iconColor="text-purple-500">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-10 bg-card border-border/50 text-center font-medium hover:border-purple-500/50 focus:border-purple-500 transition-colors"
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
                name="scheduled_follow_up"
                render={({ field }) => (
                  <FormItem>
                    <MetricInput icon={CalendarPlus} label="Agend. Follow Up" iconColor="text-indigo-500">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-10 bg-card border-border/50 text-center font-medium hover:border-indigo-500/50 focus:border-indigo-500 transition-colors"
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
                name="scheduled_same_day"
                render={({ field }) => (
                  <FormItem>
                    <MetricInput icon={Clock} label="Agend. no dia" iconColor="text-orange-500">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-10 bg-card border-border/50 text-center font-medium hover:border-orange-500/50 focus:border-orange-500 transition-colors"
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
                name="attended"
                render={({ field }) => (
                  <FormItem>
                    <MetricInput icon={UserCheck} label="Realizados" iconColor="text-cyan-500">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-10 bg-card border-border/50 text-center font-medium hover:border-cyan-500/50 focus:border-cyan-500 transition-colors"
                          {...field}
                        />
                      </FormControl>
                    </MetricInput>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sales - Full width highlight */}
              <FormField
                control={form.control}
                name="sales"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                      <MetricInput icon={ShoppingCart} label="Vendas" iconColor="text-green-500">
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            className="h-12 bg-card/50 border-green-500/30 text-center text-lg font-bold hover:border-green-500/50 focus:border-green-500 transition-colors"
                            {...field}
                          />
                        </FormControl>
                      </MetricInput>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Cancellation Section - only for SDR/Social Selling */}
        {!isFI && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-destructive/30">
              <XCircle className="h-4 w-4 text-destructive" />
              <h4 className="text-sm font-semibold text-destructive">Cancelamentos</h4>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="cancellations"
                render={({ field }) => (
                  <FormItem>
                    <MetricInput icon={XCircle} label="Qtd" iconColor="text-destructive">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-10 bg-card border-destructive/30 text-center font-medium hover:border-destructive/50 focus:border-destructive transition-colors"
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
                    <MetricInput icon={DollarSign} label="Valor Venda" iconColor="text-destructive">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-10 bg-card border-destructive/30 text-center font-medium hover:border-destructive/50 focus:border-destructive transition-colors"
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
                    <MetricInput icon={CreditCard} label="Valor Entrada" iconColor="text-destructive">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-10 bg-card border-destructive/30 text-center font-medium hover:border-destructive/50 focus:border-destructive transition-colors"
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
        )}

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full h-11 bg-primary hover:bg-primary/90 font-medium" 
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Salvando...
            </span>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </Form>
  );
}
