import React, { useEffect } from 'react';
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
  CalendarPlus
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
import { useSDRs, useSDRFunnels, type SDRMetric } from '@/hooks/useSdrMetrics';

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
});

export type SDRMetricsFormValues = z.infer<typeof sdrMetricsSchema>;

interface SDRMetricsFormProps {
  sdrType: 'sdr' | 'social_selling';
  defaultSdrId?: string;
  defaultMetric?: SDRMetric;
  onSubmit: (values: SDRMetricsFormValues) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
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
  defaultMetric,
  onSubmit,
  isLoading,
  submitLabel = 'Adicionar Métrica',
}: SDRMetricsFormProps) {
  const { data: sdrs } = useSDRs(sdrType);
  
  // Filter out SDRs with empty or invalid IDs
  const validSdrs = sdrs?.filter(sdr => sdr.id && sdr.id.trim() !== '') || [];

  const form = useForm<SDRMetricsFormValues>({
    resolver: zodResolver(sdrMetricsSchema),
    defaultValues: {
      sdr_id: defaultMetric?.sdr_id || defaultSdrId || '',
      date: defaultMetric ? parseDateString(defaultMetric.date) : new Date(),
      funnel: defaultMetric?.funnel || 'none',
      activated: defaultMetric?.activated ?? 0,
      scheduled: defaultMetric?.scheduled ?? 0,
      scheduled_follow_up: defaultMetric?.scheduled_follow_up ?? 0,
      scheduled_same_day: defaultMetric?.scheduled_same_day ?? 0,
      attended: defaultMetric?.attended ?? 0,
      sales: defaultMetric?.sales ?? 0,
    },
  });

  // Watch the selected SDR to fetch its funnels
  const selectedSdrId = form.watch('sdr_id');
  const { data: sdrFunnels, isLoading: isLoadingFunnels } = useSDRFunnels(selectedSdrId);

  // Reset funnel when SDR changes (unless it's initial load with defaultMetric)
  useEffect(() => {
    if (selectedSdrId && !defaultMetric) {
      form.setValue('funnel', 'none');
    }
  }, [selectedSdrId, form, defaultMetric]);

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

  const hasFunnels = sdrFunnels && sdrFunnels.length > 0;

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
                {sdrType === 'sdr' ? 'SDR' : 'Social Selling'}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 bg-card border-border/50 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder={`Selecione um ${sdrType === 'sdr' ? 'SDR' : 'Social Selling'}`} />
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
                Funil
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
                            ? "Carregando funis..." 
                            : "Selecione o funil"
                      } 
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none" className="cursor-pointer">
                    <span className="text-muted-foreground">Nenhum</span>
                  </SelectItem>
                  {hasFunnels && sdrFunnels.map((funnel) => (
                    <SelectItem key={funnel} value={funnel} className="cursor-pointer">
                      {funnel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSdrId && !isLoadingFunnels && !hasFunnels && (
                <p className="text-xs text-muted-foreground mt-1">
                  Nenhum funil cadastrado para este SDR
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

          {/* Metrics Grid - 2x3 layout with visual hierarchy */}
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
        </div>

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
