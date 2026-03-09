import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Phone, Package, Clock, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClosers } from '@/controllers/useCloserController';
import { useFunnels } from '@/controllers/useFunnelController';
import { useSDRsWithMetrics } from '@/controllers/useSdrController';
import type { SDRType } from './SDRTypeToggle';

const scheduleCallSchema = z.object({
  sdr_id: z.string().min(1, 'Selecione um SDR'),
  client_name: z.string().min(1, 'Nome do cliente é obrigatório'),
  client_phone: z.string().min(1, 'Telefone é obrigatório'),
  funnel_id: z.string().min(1, 'Selecione um produto'),
  scheduled_date: z.string().min(1, 'Data é obrigatória'),
  scheduled_time: z.string().min(1, 'Horário é obrigatório'),
  closer_id: z.string().min(1, 'Selecione um closer'),
});

export type ScheduleCallFormValues = z.infer<typeof scheduleCallSchema>;

interface ScheduleCallFormProps {
  sdrType: SDRType;
  defaultSdrId?: string;
  defaultValues?: Partial<ScheduleCallFormValues>;
  onSubmit: (values: ScheduleCallFormValues) => Promise<void>;
  isLoading: boolean;
  submitLabel?: string;
}

export function ScheduleCallForm({ sdrType, defaultSdrId, defaultValues: defaults, onSubmit, isLoading, submitLabel }: ScheduleCallFormProps) {
  const { data: closers } = useClosers();
  const { data: funnels } = useFunnels();
  const { data: sdrs } = useSDRsWithMetrics(sdrType);

  const today = new Date().toISOString().split('T')[0];

  const form = useForm<ScheduleCallFormValues>({
    resolver: zodResolver(scheduleCallSchema),
    defaultValues: {
      sdr_id: defaults?.sdr_id || defaultSdrId || '',
      client_name: defaults?.client_name || '',
      client_phone: defaults?.client_phone || '',
      funnel_id: defaults?.funnel_id || '',
      scheduled_date: defaults?.scheduled_date || today,
      scheduled_time: defaults?.scheduled_time || '',
      closer_id: defaults?.closer_id || '',
    },
  });

  const isEditMode = !!defaults;

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    if (!isEditMode) {
      form.reset();
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SDR */}
        <FormField
          control={form.control}
          name="sdr_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <Phone size={14} className="text-primary" />
                {sdrType === 'sdr' ? 'SDR' : 'Social Selling'}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={`Selecione um ${sdrType === 'sdr' ? 'SDR' : 'Social Selling'}`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sdrs?.map((sdr) => (
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

        {/* Cliente */}
        <FormField
          control={form.control}
          name="client_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <User size={14} className="text-primary" />
                Nome do Cliente
              </FormLabel>
              <FormControl>
                <Input placeholder="Nome completo do cliente" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Telefone */}
        <FormField
          control={form.control}
          name="client_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <Phone size={14} className="text-primary" />
                Telefone
              </FormLabel>
              <FormControl>
                <Input placeholder="(00) 00000-0000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Produto (Funil) */}
        <FormField
          control={form.control}
          name="funnel_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <Package size={14} className="text-primary" />
                Produto
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {funnels?.map((funnel) => (
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

        {/* Data e Horário */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="scheduled_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  Data
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scheduled_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Horário</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Closer */}
        <FormField
          control={form.control}
          name="closer_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <UserCheck size={14} className="text-primary" />
                Closer Responsável
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o closer" />
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

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Salvando...' : (submitLabel || 'Agendar Call')}
        </Button>
      </form>
    </Form>
  );
}
