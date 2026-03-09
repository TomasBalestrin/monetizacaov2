import React from 'react';
import { formatDateString } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MetricsForm, MetricsFormValues } from './MetricsForm';
import { useCreateMetric, useUpdateMetric, Metric } from '@/controllers/useCloserController';

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
      period_start: formatDateString(values.period_start),
      period_end: formatDateString(values.period_end),
      calls: values.calls,
      sales: values.sales,
      revenue: values.revenue,
      entries: values.entries,
      source: 'manual',
      funnel_id: values.funnel_id && values.funnel_id !== 'none' ? values.funnel_id : null,
      sdr_id: values.sdr_id && values.sdr_id !== 'none' ? values.sdr_id : null,
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
