import React from 'react';
import { CalendarPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScheduleCallForm, type ScheduleCallFormValues } from './ScheduleCallForm';
import { useCreateScheduledCall } from '@/controllers/useScheduledCallController';
import { toast } from 'sonner';
import type { SDRType } from './SDRTypeToggle';

interface ScheduleCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sdrType: SDRType;
  defaultSdrId?: string;
}

export function ScheduleCallDialog({
  open,
  onOpenChange,
  sdrType,
  defaultSdrId,
}: ScheduleCallDialogProps) {
  const createCall = useCreateScheduledCall();

  const handleSubmit = async (values: ScheduleCallFormValues) => {
    try {
      const localDate = new Date(`${values.scheduled_date}T${values.scheduled_time}:00`);
      const scheduledTime = localDate.toISOString();

      await createCall.mutateAsync({
        sdr_id: values.sdr_id,
        closer_id: values.closer_id,
        funnel_id: values.funnel_id,
        client_name: values.client_name,
        client_phone: values.client_phone,
        scheduled_time: scheduledTime,
      });

      toast.success('Call agendada com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error scheduling call:', error);
      toast.error('Erro ao agendar call');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-sm border-border/50">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <CalendarPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Agendar Call</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Agende uma call para um closer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScheduleCallForm
          sdrType={sdrType}
          defaultSdrId={defaultSdrId}
          onSubmit={handleSubmit}
          isLoading={createCall.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
