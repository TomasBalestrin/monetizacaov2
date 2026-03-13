import React from 'react';
import { Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScheduleCallForm, type ScheduleCallFormValues } from './ScheduleCallForm';
import { useUpdateScheduledCall } from '@/controllers/useScheduledCallController';
import type { ScheduledCall } from '@/model/entities/scheduledCall';
import type { SDRType } from './SDRTypeToggle';

interface EditScheduledCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sdrType: SDRType;
  call: ScheduledCall;
}

export function EditScheduledCallDialog({
  open,
  onOpenChange,
  sdrType,
  call,
}: EditScheduledCallDialogProps) {
  const updateCall = useUpdateScheduledCall();

  const d = call.scheduled_time ? new Date(call.scheduled_time) : null;
  const scheduledDate = d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : '';

  const handleSubmit = async (values: ScheduleCallFormValues) => {
    const scheduledTime = new Date(`${values.scheduled_date}T12:00:00`).toISOString();

    await updateCall.mutateAsync({
      id: call.id,
      closer_id: values.closer_id,
      funnel_id: values.funnel_id,
      scheduled_time: scheduledTime,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-sm border-border/50">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <Edit className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Editar Call</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Modifique os dados da call agendada
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScheduleCallForm
          key={`${call.id}-${call.scheduled_time}`}
          sdrType={sdrType}
          defaultValues={{
            num_calls: 1,
            funnel_id: call.funnel_id,
            scheduled_date: scheduledDate,
            closer_id: call.closer_id,
          }}
          onSubmit={handleSubmit}
          isLoading={updateCall.isPending}
          submitLabel="Salvar Alterações"
        />
      </DialogContent>
    </Dialog>
  );
}
