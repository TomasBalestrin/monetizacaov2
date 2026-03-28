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
import { useFunnels } from '@/controllers/useFunnelController';
import { recalculateSdrSales } from '@/model/repositories/sdrRepository';

interface MetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric?: Metric;
}

export function MetricsDialog({ open, onOpenChange, metric }: MetricsDialogProps) {
  const createMetric = useCreateMetric();
  const updateMetric = useUpdateMetric();
  const { data: funnels } = useFunnels();

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
      const oldSdrId = metric.sdr_id || null;
      const newSdrId = payload.sdr_id;
      const sdrChanged = oldSdrId !== newSdrId;

      await updateMetric.mutateAsync({ id: metric.id, ...payload });

      // Recalculate SDR metrics for affected SDRs
      try {
        const oldFunnelName = metric.funnel?.name || '';
        const oldFunnelId = metric.funnel_id || null;
        const newFunnelName = payload.funnel_id ? (funnels?.find(f => f.id === payload.funnel_id)?.name || '') : '';
        const newFunnelId = payload.funnel_id || null;

        if (oldSdrId && oldFunnelName) {
          await recalculateSdrSales(oldSdrId, metric.period_start, oldFunnelName, oldFunnelId);
        }
        if (newSdrId && newFunnelName && (newSdrId !== oldSdrId || newFunnelName !== oldFunnelName || payload.period_start !== metric.period_start)) {
          await recalculateSdrSales(newSdrId, payload.period_start, newFunnelName, newFunnelId);
        }
      } catch (err) {
        console.error('Error recalculating SDR sales on edit:', err);
      }
    } else {
      await createMetric.mutateAsync(payload);

      // Recalculate SDR metrics from source data
      if (payload.sdr_id) {
        const funnelName = payload.funnel_id ? (funnels?.find(f => f.id === payload.funnel_id)?.name || '') : '';
        try {
          if (funnelName) {
            await recalculateSdrSales(payload.sdr_id, payload.period_start, funnelName, payload.funnel_id);
          }
        } catch (err) {
          console.error('Error recalculating SDR sales:', err);
        }
      }
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
