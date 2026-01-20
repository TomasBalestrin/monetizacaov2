import React from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MetricsForm, MetricsFormValues } from './MetricsForm';
import { useCreateMetric, useUpdateMetric, Metric } from '@/hooks/useMetrics';

interface MetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric?: Metric;
}

export function MetricsDialog({ open, onOpenChange, metric }: MetricsDialogProps) {
  const createMetric = useCreateMetric();
  const updateMetric = useUpdateMetric();

  const isEditing = !!metric?.id;
  const isLoading = createMetric.isPending || updateMetric.isPending;

  const handleSubmit = async (values: MetricsFormValues) => {
    const payload = {
      closer_id: values.closer_id,
      period_start: format(values.period_start, 'yyyy-MM-dd'),
      period_end: format(values.period_end, 'yyyy-MM-dd'),
      calls: values.calls,
      sales: values.sales,
      revenue: values.revenue,
      entries: values.entries,
      source: 'manual',
    };

    if (isEditing && metric?.id) {
      await updateMetric.mutateAsync({ id: metric.id, ...payload });
    } else {
      await createMetric.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Métrica' : 'Nova Métrica'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Atualize os dados da métrica selecionada.'
              : 'Preencha os dados para adicionar uma nova métrica de vendas.'}
          </DialogDescription>
        </DialogHeader>
        
        <MetricsForm
          defaultValues={metric}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
