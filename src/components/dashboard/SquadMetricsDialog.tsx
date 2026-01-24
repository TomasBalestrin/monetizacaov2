import React from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SquadMetricsForm, type SquadMetricsFormValues } from './SquadMetricsForm';
import { useCreateMetric, useUpdateMetric, useSquads, type CloserMetricRecord } from '@/hooks/useMetrics';

interface SquadMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squadSlug: string;
  defaultCloserId?: string;
  metric?: CloserMetricRecord;
}

export function SquadMetricsDialog({ 
  open, 
  onOpenChange, 
  squadSlug,
  defaultCloserId,
  metric 
}: SquadMetricsDialogProps) {
  const createMetric = useCreateMetric();
  const updateMetric = useUpdateMetric();
  const { data: squads } = useSquads();
  
  const squad = squads?.find(s => s.slug.toLowerCase() === squadSlug.toLowerCase());
  const isEditing = !!metric?.id;

  const handleSubmit = async (
    values: SquadMetricsFormValues, 
    period: { start: Date; end: Date }
  ) => {
    const payload = {
      closer_id: values.closer_id,
      period_start: format(period.start, 'yyyy-MM-dd'),
      period_end: format(period.end, 'yyyy-MM-dd'),
      calls: values.calls,
      sales: values.sales,
      revenue: values.revenue,
      entries: values.entries,
      revenue_trend: values.revenue_trend ?? 0,
      entries_trend: values.entries_trend ?? 0,
      cancellations: values.cancellations ?? 0,
      cancellation_value: values.cancellation_value ?? 0,
      cancellation_entries: values.cancellation_entries ?? 0,
      source: 'manual',
    };

    if (isEditing) {
      await updateMetric.mutateAsync({ id: metric.id, ...payload });
    } else {
      await createMetric.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  if (!squad) return null;

  const isPending = createMetric.isPending || updateMetric.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Métrica' : 'Adicionar Métrica Manual'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? `Atualize os dados de desempenho para o Squad ${squad.name}.`
              : `Insira os dados de desempenho para um closer do Squad ${squad.name}.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <SquadMetricsForm
          squadId={squad.id}
          defaultCloserId={defaultCloserId}
          defaultMetric={metric}
          onSubmit={handleSubmit}
          isLoading={isPending}
          submitLabel={isEditing ? 'Atualizar Métrica' : 'Adicionar Métrica'}
        />
      </DialogContent>
    </Dialog>
  );
}
