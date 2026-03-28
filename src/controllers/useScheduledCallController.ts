import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import * as scheduledCallRepo from '@/model/repositories/scheduledCallRepository';
import * as notificationRepo from '@/model/repositories/notificationRepository';
import * as closerRepo from '@/model/repositories/closerRepository';
import * as sdrRepo from '@/model/repositories/sdrRepository';
import type { CreateScheduledCallPayload, ScheduledCall } from '@/model/entities/scheduledCall';

export function useScheduledCalls(sdrId?: string, periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['scheduled-calls', sdrId, periodStart, periodEnd],
    queryFn: () => scheduledCallRepo.fetchScheduledCalls(sdrId, periodStart, periodEnd),
  });
}

export function useCreateScheduledCall() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateScheduledCallPayload) => scheduledCallRepo.createScheduledCall(payload),
    onSuccess: async (createdCall) => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-calls'] });
      toast({
        title: 'Call agendada',
        description: 'A call foi agendada com sucesso.',
      });

      // Create notification for the closer
      try {
        const userId = await notificationRepo.findUserIdByCloserId(createdCall.closer_id);
        if (userId) {
          const sdrName = createdCall.sdr?.name || 'SDR';
          const clientName = createdCall.client_name;
          const funnelName = createdCall.funnel?.name || '';
          const scheduledTime = new Date(createdCall.scheduled_time).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });

          await notificationRepo.createNotification({
            user_id: userId,
            type: 'scheduled_call',
            title: 'Nova Call Agendada',
            message: `${sdrName} agendou uma call com ${clientName} (${funnelName}) para ${scheduledTime}`,
            entity_id: createdCall.closer_id,
            entity_type: 'closer',
            data: {
              scheduled_call_id: createdCall.id,
              sdr_name: sdrName,
              client_name: clientName,
              funnel_name: funnelName,
              scheduled_time: createdCall.scheduled_time,
            },
          });
        }
      } catch (err) {
        console.error('Error creating notification:', err);
      }
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível agendar a call.',
      });
      console.error('Error creating scheduled call:', error);
    },
  });
}

export function useUpdateScheduledCall() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<CreateScheduledCallPayload & { status: string }>) =>
      scheduledCallRepo.updateScheduledCall(id, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scheduled-calls'] });
      toast({
        title: 'Call atualizada',
        description: 'A call foi atualizada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar a call.',
      });
      console.error('Error updating scheduled call:', error);
    },
  });
}

export function useDeleteScheduledCall() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => scheduledCallRepo.deleteScheduledCall(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-calls'] });
      toast({
        title: 'Call removida',
        description: 'A call foi removida com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível remover a call.',
      });
      console.error('Error deleting scheduled call:', error);
    },
  });
}

export function useStartCall() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (call: ScheduledCall) => {
      const updated = await scheduledCallRepo.updateScheduledCall(call.id, { status: 'in_progress' });

      // Notify the SDR that the closer started the call
      try {
        const userId = await notificationRepo.findUserIdBySdrId(call.sdr_id);
        if (userId) {
          const closerName = call.closer?.name || 'Closer';
          const clientName = call.client_name;
          const funnelName = call.funnel?.name || '';

          await notificationRepo.createNotification({
            user_id: userId,
            type: 'call_started',
            title: 'Call Iniciada',
            message: `${closerName} iniciou a call com ${clientName} (${funnelName})`,
            entity_id: call.sdr_id,
            entity_type: 'sdr',
            data: {
              scheduled_call_id: call.id,
              closer_name: closerName,
              client_name: clientName,
              funnel_name: funnelName,
            },
          });
        }
      } catch (err) {
        console.error('Error creating call_started notification:', err);
      }

      return updated;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scheduled-calls'] });
      toast({
        title: 'Call iniciada',
        description: 'O status da call foi atualizado para em andamento.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível iniciar a call.',
      });
      console.error('Error starting call:', error);
    },
  });
}

export function useCloserActiveCalls(closerId?: string) {
  return useQuery({
    queryKey: ['closer-active-calls', closerId],
    queryFn: () => scheduledCallRepo.fetchScheduledCallsByCloser(closerId!, 'in_progress'),
    enabled: !!closerId,
    refetchInterval: 30000,
  });
}

export interface FinishCallPayload {
  call: ScheduledCall;
  hasSale: boolean;
  revenue: number;
  entryValue: number;
}

export function useFinishCall() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ call, hasSale, revenue, entryValue }: FinishCallPayload) => {
      // 1. Update call status to 'done'
      const updated = await scheduledCallRepo.updateScheduledCall(call.id, { status: 'done' });

      // 2. Create metric record for this call
      const today = format(new Date(), 'yyyy-MM-dd');
      await closerRepo.createMetric({
        closer_id: call.closer_id,
        period_start: today,
        period_end: today,
        calls: 1,
        sales: hasSale ? 1 : 0,
        revenue: hasSale ? revenue : 0,
        entries: hasSale ? entryValue : 0,
        source: 'scheduled_call',
        funnel_id: call.funnel_id || null,
        sdr_id: call.sdr_id || null,
      });

      // 2b. Increment SDR attended count + sales/revenue/entries
      try {
        const funnelName = call.funnel?.name || '';
        if (funnelName) {
          await sdrRepo.incrementSdrAttended(call.sdr_id, today, funnelName);
          await sdrRepo.recalculateSdrSales(call.sdr_id, today, funnelName, call.funnel_id);
        }
      } catch (err) {
        console.error('Error incrementing SDR attended:', err);
      }

      // 3. Notify SDR
      try {
        const userId = await notificationRepo.findUserIdBySdrId(call.sdr_id);
        if (userId) {
          const closerName = call.closer?.name || 'Closer';
          const clientName = call.client_name;
          const saleText = hasSale
            ? `com venda de R$ ${revenue.toLocaleString('pt-BR')}`
            : 'sem venda';

          await notificationRepo.createNotification({
            user_id: userId,
            type: 'call_finished',
            title: 'Call Finalizada',
            message: `${closerName} finalizou a call com ${clientName} ${saleText}`,
            entity_id: call.sdr_id,
            entity_type: 'sdr',
            data: {
              scheduled_call_id: call.id,
              closer_name: closerName,
              client_name: clientName,
              had_sale: hasSale,
              revenue: hasSale ? revenue : 0,
              entry_value: hasSale ? entryValue : 0,
            },
          });
        }
      } catch (err) {
        console.error('Error creating call_finished notification:', err);
      }

      return updated;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scheduled-calls'] });
      await queryClient.invalidateQueries({ queryKey: ['closer-active-calls'] });
      await queryClient.invalidateQueries({ queryKey: ['metrics'] });
      await queryClient.invalidateQueries({ queryKey: ['closer-metrics'] });
      await queryClient.invalidateQueries({ queryKey: ['squad-metrics'] });
      await queryClient.invalidateQueries({ queryKey: ['sdr-metrics'] });
      toast({
        title: 'Call finalizada',
        description: 'A call foi finalizada e as métricas foram registradas.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível finalizar a call.',
      });
      console.error('Error finishing call:', error);
    },
  });
}

export function useSendCallReminder() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (call: ScheduledCall) => {
      const userId = await notificationRepo.findUserIdByCloserId(call.closer_id);
      if (!userId) throw new Error('Closer não possui usuário vinculado');

      const scheduledTime = new Date(call.scheduled_time).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      return notificationRepo.createNotification({
        user_id: userId,
        type: 'call_reminder',
        title: 'Lembrete de Call',
        message: `Lembrete: call com ${call.client_name} agendada para ${scheduledTime}`,
        entity_id: call.closer_id,
        entity_type: 'closer',
        data: {
          scheduled_call_id: call.id,
          client_name: call.client_name,
          funnel_name: call.funnel?.name || '',
          scheduled_time: call.scheduled_time,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Lembrete enviado',
        description: 'O closer foi notificado sobre a call.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error?.message || 'Não foi possível enviar o lembrete.',
      });
      console.error('Error sending reminder:', error);
    },
  });
}
