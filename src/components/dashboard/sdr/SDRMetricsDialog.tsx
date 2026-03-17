import React from 'react';
import { TrendingUp, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SDRMetricsForm, type SDRMetricsFormValues } from './SDRMetricsForm';
import { useCreateSDRMetric, useUpdateSDRMetric, type SDRMetric } from '@/controllers/useSdrController';
import { toast } from 'sonner';
import { formatDateString } from '@/lib/utils';

interface SDRMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sdrType: 'sdr' | 'social_selling' | 'funil_intensivo';
  defaultSdrId?: string;
  defaultFunnel?: string | null;
  editingMetric?: SDRMetric | null;
  lockSdr?: boolean;
}

export function SDRMetricsDialog({
  open,
  onOpenChange,
  sdrType,
  defaultSdrId,
  defaultFunnel,
  editingMetric,
  lockSdr,
}: SDRMetricsDialogProps) {
  const createMetric = useCreateSDRMetric();
  const updateMetric = useUpdateSDRMetric();

  const isEditing = !!editingMetric;

  const handleSubmit = async (values: SDRMetricsFormValues) => {
    try {
      const isFI = sdrType === 'funil_intensivo';
      // Calculate FI attendance rate
      const fiAttendanceRate = isFI && (values.fi_got_ticket || 0) > 0
        ? ((values.fi_attended || 0) / (values.fi_got_ticket || 1)) * 100
        : 0;

      if (isEditing && editingMetric) {
        // Update existing metric
        await updateMetric.mutateAsync({
          id: editingMetric.id,
          date: formatDateString(values.date),
          funnel: values.funnel || '',
          activated: values.activated,
          scheduled: values.scheduled,
          scheduled_follow_up: values.scheduled_follow_up,
          scheduled_same_day: values.scheduled_same_day,
          attended: values.attended,
          sales: values.sales,
          ...(isFI && {
            fi_called: values.fi_called || 0,
            fi_awaiting: values.fi_awaiting || 0,
            fi_received_link: values.fi_received_link || 0,
            fi_got_ticket: values.fi_got_ticket || 0,
            fi_attended: values.fi_attended || 0,
            fi_attendance_rate: fiAttendanceRate,
          }),
        });
        toast.success('Métrica atualizada com sucesso!');
      } else {
        // Create new metric
        await createMetric.mutateAsync({
          sdr_id: values.sdr_id,
          date: formatDateString(values.date),
          funnel: values.funnel || '',
          activated: values.activated,
          scheduled: values.scheduled,
          scheduled_follow_up: values.scheduled_follow_up,
          scheduled_same_day: values.scheduled_same_day,
          attended: values.attended,
          sales: values.sales,
          source: 'manual',
          ...(isFI && {
            fi_called: values.fi_called || 0,
            fi_awaiting: values.fi_awaiting || 0,
            fi_received_link: values.fi_received_link || 0,
            fi_got_ticket: values.fi_got_ticket || 0,
            fi_attended: values.fi_attended || 0,
            fi_attendance_rate: fiAttendanceRate,
          }),
        });
        toast.success('Métrica adicionada com sucesso!');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving SDR metric:', error);
      toast.error(isEditing ? 'Erro ao atualizar métrica' : 'Erro ao adicionar métrica');
    }
  };

  const isLoading = createMetric.isPending || updateMetric.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-sm border-border/50">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              {isEditing ? (
                <Edit className="h-5 w-5 text-primary" />
              ) : (
                <TrendingUp className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {isEditing ? 'Editar' : 'Nova'} Métrica {sdrType === 'sdr' ? 'SDR' : sdrType === 'funil_intensivo' ? 'Funil Intensivo' : 'Social Selling'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {isEditing ? 'Modifique os dados da métrica' : 'Insira os dados de desempenho manualmente'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <SDRMetricsForm
          key={editingMetric?.id || 'new'}
          sdrType={sdrType}
          defaultSdrId={editingMetric?.sdr_id || defaultSdrId}
          defaultFunnel={defaultFunnel}
          defaultMetric={editingMetric || undefined}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitLabel={isEditing ? 'Salvar Alterações' : 'Adicionar Métrica'}
          lockSdr={lockSdr}
        />
      </DialogContent>
    </Dialog>
  );
}
