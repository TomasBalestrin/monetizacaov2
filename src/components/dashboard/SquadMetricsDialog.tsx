import React from 'react';
import { formatDateString } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SquadMetricsForm, type SquadMetricsFormValues } from './SquadMetricsForm';
import { useCreateMetric, useUpdateMetric, useSquads, type CloserMetricRecord } from '@/controllers/useCloserController';
import { useFunnels } from '@/controllers/useFunnelController';
import { incrementSdrSales, decrementSdrSales } from '@/model/repositories/sdrRepository';

interface SquadMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squadSlug?: string;
  defaultCloserId?: string;
  metric?: CloserMetricRecord;
  selectedMonth?: Date;
}

export function SquadMetricsDialog({
  open,
  onOpenChange,
  squadSlug,
  defaultCloserId,
  metric,
  selectedMonth
}: SquadMetricsDialogProps) {
  const createMetric = useCreateMetric();
  const updateMetric = useUpdateMetric();
  const { data: squads } = useSquads();
  const { data: funnels } = useFunnels();

  const squad = squadSlug
    ? squads?.find(s => s.slug.toLowerCase() === squadSlug.toLowerCase())
    : squads?.[0];
  const isEditing = !!metric?.id;

  const handleSubmit = async (
    values: SquadMetricsFormValues,
    period: { start: Date; end: Date }
  ) => {
    const periodStart = formatDateString(period.start);
    const periodEnd = formatDateString(period.end);

    let totalSalesForSDR = 0;
    let totalRevenueForSDR = 0;
    let totalEntriesForSDR = 0;

    if (isEditing) {
      // Edição: atualizar registro existente
      const oldSdrId = metric.sdr_id || null;
      const newSdrId = values.sdr_id || null;
      const sdrChanged = oldSdrId !== newSdrId;

      await updateMetric.mutateAsync({
        id: metric.id,
        closer_id: values.closer_id,
        period_start: periodStart,
        period_end: periodEnd,
        calls: values.calls,
        sales: values.sales ?? 0,
        revenue: values.revenue,
        entries: values.entries,
        revenue_trend: values.revenue_trend ?? 0,
        entries_trend: values.entries_trend ?? 0,
        cancellations: values.cancellations ?? 0,
        cancellation_value: values.cancellation_value ?? 0,
        cancellation_entries: values.cancellation_entries ?? 0,
        source: 'manual',
        funnel_id: values.funnel_id || null,
        sdr_id: newSdrId,
        product_id: values.product_id || null,
      });

      // Sync SDR metrics when sdr_id changes on edit
      if (sdrChanged) {
        try {
          // Decrement old SDR
          if (oldSdrId && (metric.sales > 0 || Number(metric.revenue) > 0 || Number(metric.entries) > 0)) {
            const oldFunnelName = metric.sdr?.name ? (metric.funnel?.name || '') : (metric.funnel?.name || '');
            await decrementSdrSales(oldSdrId, metric.period_start, oldFunnelName, metric.sales || 0, Number(metric.revenue) || 0, Number(metric.entries) || 0);
          }
          // Increment new SDR
          const newSales = values.sales ?? 0;
          const newRevenue = values.revenue || 0;
          const newEntries = values.entries || 0;
          if (newSdrId && (newSales > 0 || newRevenue > 0 || newEntries > 0)) {
            const funnelName = values.funnel_id ? (funnels?.find(f => f.id === values.funnel_id)?.name || '') : '';
            await incrementSdrSales(newSdrId, periodStart, funnelName, newSales, newRevenue, newEntries);
          }
        } catch (err) {
          console.error('Error syncing SDR sales on edit:', err);
        }
      }
    } else if (values.call_entries && values.call_entries.length > 0 && values.calls > 1) {
      // Múltiplas calls: criar um registro por call
      const cleanFunnelId = values.funnel_id || null;
      const cleanSdrId = values.sdr_id || null;
      const promises = values.call_entries.map((entry) => {
        const cleanProductId = entry.product_id === 'none' ? null : (entry.product_id || null);
        return createMetric.mutateAsync({
          closer_id: values.closer_id,
          period_start: periodStart,
          period_end: periodEnd,
          calls: 1,
          sales: entry.had_sale ? 1 : 0,
          revenue: entry.had_sale ? entry.revenue : 0,
          entries: entry.had_sale ? entry.entries : 0,
          revenue_trend: 0,
          entries_trend: 0,
          cancellations: 0,
          cancellation_value: 0,
          cancellation_entries: 0,
          source: 'manual',
          funnel_id: cleanFunnelId,
          sdr_id: cleanSdrId,
          product_id: entry.had_sale ? cleanProductId : null,
        });
      });
      await Promise.all(promises);
      totalSalesForSDR = values.call_entries.filter(e => e.had_sale).length;
      totalRevenueForSDR = values.call_entries.reduce((s, e) => s + (e.had_sale ? (e.revenue || 0) : 0), 0);
      totalEntriesForSDR = values.call_entries.reduce((s, e) => s + (e.had_sale ? (e.entries || 0) : 0), 0);
    } else {
      // Call única
      const cleanProductId = values.product_id === 'none' ? null : (values.product_id || null);
      await createMetric.mutateAsync({
        closer_id: values.closer_id,
        period_start: periodStart,
        period_end: periodEnd,
        calls: values.calls,
        sales: values.sales ?? 0,
        revenue: values.revenue,
        entries: values.entries,
        revenue_trend: values.revenue_trend ?? 0,
        entries_trend: values.entries_trend ?? 0,
        cancellations: values.cancellations ?? 0,
        cancellation_value: values.cancellation_value ?? 0,
        cancellation_entries: values.cancellation_entries ?? 0,
        source: 'manual',
        funnel_id: values.funnel_id || null,
        sdr_id: values.sdr_id || null,
        product_id: cleanProductId,
      });
      totalSalesForSDR = values.sales ?? 0;
      totalRevenueForSDR = values.revenue || 0;
      totalEntriesForSDR = values.entries || 0;
    }

    // Increment SDR sales, revenue and entries
    const cleanSdrId = values.sdr_id || null;
    if (cleanSdrId && !isEditing && (totalSalesForSDR > 0 || totalRevenueForSDR > 0 || totalEntriesForSDR > 0)) {
      try {
        const funnelName = values.funnel_id
          ? funnels?.find(f => f.id === values.funnel_id)?.name || ''
          : '';
        if (funnelName) {
          await incrementSdrSales(cleanSdrId, periodStart, funnelName, totalSalesForSDR, totalRevenueForSDR, totalEntriesForSDR);
        }
      } catch (err) {
        console.error('Error incrementing SDR sales:', err);
      }
    }

    onOpenChange(false);
  };

  if (!squad) return null;

  const isPending = createMetric.isPending || updateMetric.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto backdrop-blur-sm bg-background/95 border-border/50">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <DialogTitle className="text-lg">{isEditing ? 'Editar Métrica' : 'Adicionar Métrica'}</DialogTitle>
              <DialogDescription className="text-sm">
                {squadSlug ? `Squad ${squad.name}` : 'Selecione um closer'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <SquadMetricsForm
          squadId={squadSlug ? squad.id : undefined}
          defaultCloserId={defaultCloserId}
          defaultMetric={metric}
          selectedMonth={selectedMonth}
          onSubmit={handleSubmit}
          isLoading={isPending}
          submitLabel={isEditing ? 'Atualizar Métrica' : 'Adicionar Métrica'}
        />
      </DialogContent>
    </Dialog>
  );
}
