import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Package, Clock, UserCheck, Hash } from 'lucide-react';
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
import type { SDRType } from './SDRTypeToggle';

const callEntrySchema = z.object({
  closer_id: z.string().min(1, 'Selecione um closer'),
  funnel_id: z.string().min(1, 'Selecione um funil'),
  scheduled_date: z.string().min(1, 'Data é obrigatória'),
});

const scheduleCallSchema = z.object({
  num_calls: z.coerce.number().min(1, 'Mínimo 1 call'),
  // Campos padrão (usados quando num_calls = 1)
  funnel_id: z.string().optional().default(''),
  scheduled_date: z.string().optional().default(''),
  closer_id: z.string().optional().default(''),
  // Entradas individuais (usadas quando num_calls > 1)
  entries: z.array(callEntrySchema).optional(),
  // --- Campos arquivados para uso futuro ---
  // sdr_id, client_name, client_phone, scheduled_time
}).refine((data) => {
  if (data.num_calls <= 1) {
    return !!data.funnel_id && !!data.scheduled_date && !!data.closer_id;
  }
  // quando > 1, validação é nos entries
  return !data.entries || data.entries.every(e => !!e.closer_id && !!e.funnel_id && !!e.scheduled_date);
}, { message: 'Preencha todos os campos obrigatórios' });

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

  const today = new Date().toISOString().split('T')[0];

  const form = useForm<ScheduleCallFormValues>({
    resolver: zodResolver(scheduleCallSchema),
    defaultValues: {
      num_calls: defaults?.num_calls || 1,
      funnel_id: defaults?.funnel_id || '',
      scheduled_date: defaults?.scheduled_date || today,
      closer_id: defaults?.closer_id || '',
      entries: defaults?.entries || [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'entries',
  });

  const numCalls = form.watch('num_calls');
  const mainCloserId = form.watch('closer_id');
  const mainFunnelId = form.watch('funnel_id');
  const mainDate = form.watch('scheduled_date');

  // Sincronizar entries quando num_calls muda
  React.useEffect(() => {
    const n = Number(numCalls) || 1;
    if (n > 1) {
      const currentEntries = form.getValues('entries') || [];
      const newEntries = Array.from({ length: n }, (_, i) => ({
        closer_id: currentEntries[i]?.closer_id || mainCloserId || '',
        funnel_id: currentEntries[i]?.funnel_id || mainFunnelId || '',
        scheduled_date: currentEntries[i]?.scheduled_date || mainDate || today,
      }));
      replace(newEntries);
    } else {
      replace([]);
    }
  }, [numCalls]);

  const isEditMode = !!defaults;

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    if (!isEditMode) {
      form.reset();
    }
  });

  const showIndividualEntries = Number(numCalls) > 1;

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Número de Calls */}
        <FormField
          control={form.control}
          name="num_calls"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <Hash size={14} className="text-primary" />
                Número de Calls
              </FormLabel>
              <FormControl>
                <Input type="number" min={1} placeholder="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campos padrão - mostram quando num_calls = 1 */}
        {!showIndividualEntries && (
          <>
            {/* Funil */}
            <FormField
              control={form.control}
              name="funnel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <Package size={14} className="text-primary" />
                    Funil
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o funil" />
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

            {/* Data */}
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
          </>
        )}

        {/* Entradas individuais - mostram quando num_calls > 1 */}
        {showIndividualEntries && fields.map((entry, index) => (
          <div
            key={entry.id}
            className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-3"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Call {index + 1}
            </p>

            {/* Closer individual */}
            <FormField
              control={form.control}
              name={`entries.${index}.closer_id`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium flex items-center gap-1.5">
                    <UserCheck size={12} className="text-primary" />
                    Closer
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Closer" />
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

            {/* Funil individual */}
            <FormField
              control={form.control}
              name={`entries.${index}.funnel_id`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium flex items-center gap-1.5">
                    <Package size={12} className="text-primary" />
                    Funil
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Funil" />
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

            {/* Data individual */}
            <FormField
              control={form.control}
              name={`entries.${index}.scheduled_date`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium flex items-center gap-1.5">
                    <Clock size={12} className="text-primary" />
                    Data
                  </FormLabel>
                  <FormControl>
                    <Input type="date" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ))}

        {/* ===== CAMPOS ARQUIVADOS PARA USO FUTURO =====
        - sdr_id (seletor de SDR)
        - client_name (Nome do Cliente)
        - client_phone (Telefone)
        - scheduled_time (Horário)
        ===== FIM DOS CAMPOS ARQUIVADOS ===== */}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Salvando...' : (submitLabel || 'Agendar Call')}
        </Button>
      </form>
    </Form>
  );
}
