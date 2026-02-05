import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { cn, parseDateString } from '@/lib/utils';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSquads, useClosers, Metric } from '@/hooks/useMetrics';

const metricsFormSchema = z.object({
  closer_id: z.string().min(1, 'Selecione um closer'),
  period_start: z.date({ required_error: 'Selecione a data de início' }),
  period_end: z.date({ required_error: 'Selecione a data de término' }),
  calls: z.coerce.number().int().min(0, 'Valor deve ser maior ou igual a 0'),
  sales: z.coerce.number().int().min(0, 'Valor deve ser maior ou igual a 0'),
  revenue: z.coerce.number().min(0, 'Valor deve ser maior ou igual a 0'),
  entries: z.coerce.number().min(0, 'Valor deve ser maior ou igual a 0'),
}).refine((data) => data.period_end >= data.period_start, {
  message: 'Data de término deve ser igual ou posterior à data de início',
  path: ['period_end'],
});

export type MetricsFormValues = z.infer<typeof metricsFormSchema>;

interface MetricsFormProps {
  defaultValues?: Partial<Metric>;
  onSubmit: (values: MetricsFormValues) => void;
  isLoading?: boolean;
}

export function MetricsForm({ defaultValues, onSubmit, isLoading }: MetricsFormProps) {
  const { data: squads } = useSquads();
  const { data: closers } = useClosers();

  const form = useForm<MetricsFormValues>({
    resolver: zodResolver(metricsFormSchema),
    defaultValues: {
      closer_id: defaultValues?.closer_id || '',
      period_start: defaultValues?.period_start 
        ? parseDateString(defaultValues.period_start) 
        : undefined,
      period_end: defaultValues?.period_end 
        ? parseDateString(defaultValues.period_end) 
        : undefined,
      calls: defaultValues?.calls || 0,
      sales: defaultValues?.sales || 0,
      revenue: defaultValues?.revenue || 0,
      entries: defaultValues?.entries || 0,
    },
  });

  // Group closers by squad
  const closersBySquad = squads?.map(squad => ({
    squad,
    closers: closers?.filter(c => c.squad_id === squad.id) || [],
  })) || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Closer Select */}
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
                  {closersBySquad.map(({ squad, closers }) => (
                    <SelectGroup key={squad.id}>
                      <SelectLabel className="font-bold text-primary">
                        {squad.name}
                      </SelectLabel>
                      {closers.map(closer => (
                        <SelectItem key={closer.id} value={closer.id}>
                          {closer.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Period Dates */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="period_start"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Período Início</FormLabel>
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
                        {field.value ? (
                          format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                        ) : (
                          <span>Selecionar</span>
                        )}
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
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="period_end"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Período Fim</FormLabel>
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
                        {field.value ? (
                          format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                        ) : (
                          <span>Selecionar</span>
                        )}
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
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Numeric Fields */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="calls"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ligações</FormLabel>
                <FormControl>
                  <Input type="number" min={0} placeholder="0" {...field} />
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
                  <Input type="number" min={0} placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="revenue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Faturamento (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={0} 
                    step="0.01"
                    placeholder="0,00" 
                    {...field} 
                  />
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
                  <Input 
                    type="number" 
                    min={0} 
                    step="0.01"
                    placeholder="0,00" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Salvando...' : defaultValues?.id ? 'Atualizar Métrica' : 'Adicionar Métrica'}
        </Button>
      </form>
    </Form>
  );
}
