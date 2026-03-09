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
import { useCreateFunnelDailyData } from '@/controllers/useFunnelController';

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
  const createFunnelData = useCreateFunnelDailyData();
  const { data: squads } = useSquads();
  
  const squad = squadSlug
    ? squads?.find(s => s.slug.toLowerCase() === squadSlug.toLowerCase())
    : squads?.[0];
  const isEditing = !!metric?.id;

  const handleSubmit = async (
    values: SquadMetricsFormValues, 
    period: { start: Date; end: Date }
  ) => {
    const payload = {
      closer_id: values.closer_id,
      period_start: formatDateString(period.start),
      period_end: formatDateString(period.end),
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
      funnel_id: values.funnel_id || null,
      sdr_id: values.sdr_id || null,
    };

    if (isEditing) {
      await updateMetric.mutateAsync({ id: metric.id, ...payload });
    } else {
      await createMetric.mutateAsync(payload);
    }

    // Save per-funnel breakdown data to funnel_daily_data
    if (values.funnel_breakdown && values.funnel_breakdown.length > 0) {
      await createFunnelData.mutateAsync(
        values.funnel_breakdown.map((fb) => ({
          user_id: values.closer_id,
          funnel_id: fb.funnel_id,
          date: formatDateString(period.start),
          calls_scheduled: fb.calls,
          calls_done: fb.calls,
          sales_count: fb.sales,
          sales_value: 0,
          leads_count: 0,
          qualified_count: 0,
          sdr_id: fb.sdr_id || null,
        }))
      );
    } else if (values.funnel_id) {
      // Fallback: save single funnel data if funnel_id is provided
      await createFunnelData.mutateAsync([{
        user_id: values.closer_id,
        funnel_id: values.funnel_id,
        date: formatDateString(period.start),
        calls_scheduled: values.calls,
        calls_done: values.calls,
        sales_count: values.sales,
        sales_value: values.revenue,
        leads_count: values.leads_count ?? 0,
        qualified_count: values.qualified_count ?? 0,
        sdr_id: values.sdr_id || null,
      }]);
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
