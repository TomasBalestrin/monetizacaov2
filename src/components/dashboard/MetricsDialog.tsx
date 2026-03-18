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
import { incrementSdrSales, decrementSdrSales } from '@/model/repositories/sdrRepository';

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

      // Sync SDR metrics when sdr_id changes on edit
      if (sdrChanged) {
        try {
          // Decrement old SDR
          if (oldSdrId && (metric.sales > 0 || metric.revenue > 0 || metric.entries > 0)) {
            const oldFunnelName = metric.funnel?.name || '';
            await decrementSdrSales(oldSdrId, metric.period_start, oldFunnelName, metric.sales || 0, Number(metric.revenue) || 0, Number(metric.entries) || 0);
          }
          // Increment new SDR
          if (newSdrId && (payload.sales > 0 || Number(payload.revenue) > 0 || Number(payload.entries) > 0)) {
            const funnelName = payload.funnel_id ? (funnels?.find(f => f.id === payload.funnel_id)?.name || '') : '';
            await incrementSdrSales(newSdrId, payload.period_start, funnelName, payload.sales || 0, Number(payload.revenue) || 0, Number(payload.entries) || 0);
          }
        } catch (err) {
          console.error('Error syncing SDR sales on edit:', err);
        }
      }
    } else {
      await createMetric.mutateAsync(payload);

      // Increment SDR on create
      if (payload.sdr_id && (payload.sales > 0 || Number(payload.revenue) > 0 || Number(payload.entries) > 0)) {
        const funnelName = payload.funnel_id ? (funnels?.find(f => f.id === payload.funnel_id)?.name || '') : '';
        try {
          await incrementSdrSales(payload.sdr_id, payload.period_start, funnelName, payload.sales || 0, Number(payload.revenue) || 0, Number(payload.entries) || 0);
        } catch (err) {
          console.error('Error incrementing SDR sales:', err);
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
