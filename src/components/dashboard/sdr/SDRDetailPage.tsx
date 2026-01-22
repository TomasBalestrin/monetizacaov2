import React from 'react';
import { ArrowLeft, Phone, Users, Calendar, TrendingUp, UserCheck, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { SDRMetricCard } from './SDRMetricCard';
import { SDRChart } from './SDRChart';
import { SDRDataTable } from './SDRDataTable';
import { useSDRs, useSDRMetrics, type SDRAggregatedMetrics, type SDRMetric } from '@/hooks/useSdrMetrics';

interface SDRDetailPageProps {
  sdrId: string;
  periodStart?: string;
  periodEnd?: string;
  onPeriodChange: (start: string | undefined, end: string | undefined) => void;
  onBack: () => void;
}

// Calculate aggregated metrics from an array of metrics
function calculateAggregatedMetrics(metrics: SDRMetric[]): SDRAggregatedMetrics {
  if (metrics.length === 0) {
    return {
      totalActivated: 0,
      totalScheduled: 0,
      avgScheduledRate: 0,
      totalConfirmed: 0,
      totalAttended: 0,
      avgAttendanceRate: 0,
      totalSales: 0,
      avgConversionRate: 0,
    };
  }

  const totalActivated = metrics.reduce((sum, m) => sum + (m.activated || 0), 0);
  const totalScheduled = metrics.reduce((sum, m) => sum + (m.scheduled || 0), 0);
  const totalConfirmed = metrics.reduce((sum, m) => sum + (m.confirmed || 0), 0);
  const totalAttended = metrics.reduce((sum, m) => sum + (m.attended || 0), 0);
  const totalSales = metrics.reduce((sum, m) => sum + (m.sales || 0), 0);

  const avgScheduledRate = totalActivated > 0 ? (totalScheduled / totalActivated) * 100 : 0;
  const avgAttendanceRate = totalConfirmed > 0 ? (totalAttended / totalConfirmed) * 100 : 0;
  const avgConversionRate = totalAttended > 0 ? (totalSales / totalAttended) * 100 : 0;

  return {
    totalActivated,
    totalScheduled,
    avgScheduledRate,
    totalConfirmed,
    totalAttended,
    avgAttendanceRate,
    totalSales,
    avgConversionRate,
  };
}

export function SDRDetailPage({
  sdrId,
  periodStart,
  periodEnd,
  onPeriodChange,
  onBack,
}: SDRDetailPageProps) {
  const { data: sdrs } = useSDRs();
  const { data: metrics, isLoading: isLoadingMetrics } = useSDRMetrics(
    sdrId,
    periodStart,
    periodEnd
  );

  const sdr = sdrs?.find((s) => s.id === sdrId);
  const aggregatedMetrics = metrics ? calculateAggregatedMetrics(metrics) : null;

  const Icon = sdr?.type === 'social_selling' ? Users : Phone;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-10 w-10"
          >
            <ArrowLeft size={20} />
          </Button>

          <div className="p-3 rounded-2xl bg-primary/10">
            <Icon size={28} className="text-primary" />
          </div>

          <div>
            {sdr ? (
              <>
                <h1 className="text-2xl font-bold text-foreground">{sdr.name}</h1>
                <p className="text-muted-foreground capitalize">
                  {sdr.type === 'sdr' ? 'SDR' : 'Social Selling'}
                </p>
              </>
            ) : (
              <>
                <Skeleton className="h-8 w-48 mb-1" />
                <Skeleton className="h-4 w-24" />
              </>
            )}
          </div>
        </div>

        <PeriodFilter
          periodStart={periodStart}
          periodEnd={periodEnd}
          onPeriodChange={onPeriodChange}
        />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {isLoadingMetrics ? (
          Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <SDRMetricCard
              title="Ativados"
              value={aggregatedMetrics?.totalActivated || 0}
              icon={Users}
            />
            <SDRMetricCard
              title="Agendados"
              value={aggregatedMetrics?.totalScheduled || 0}
              icon={Calendar}
            />
            <SDRMetricCard
              title="% Agendamento"
              value={aggregatedMetrics?.avgScheduledRate || 0}
              isPercentage
              showProgress
              icon={TrendingUp}
            />
            <SDRMetricCard
              title="Confirmados"
              value={aggregatedMetrics?.totalConfirmed || 0}
              icon={UserCheck}
            />
            <SDRMetricCard
              title="Realizados"
              value={aggregatedMetrics?.totalAttended || 0}
              icon={UserCheck}
            />
            <SDRMetricCard
              title="% Comparec."
              value={aggregatedMetrics?.avgAttendanceRate || 0}
              isPercentage
              showProgress
              icon={TrendingUp}
            />
            <SDRMetricCard
              title="Vendas"
              value={aggregatedMetrics?.totalSales || 0}
              icon={ShoppingCart}
              variant="highlight"
            />
          </>
        )}
      </div>

      {/* Chart */}
      {isLoadingMetrics ? (
        <Skeleton className="h-[350px] rounded-xl" />
      ) : (
        <SDRChart metrics={metrics || []} />
      )}

      {/* Data Table */}
      {isLoadingMetrics ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <SDRDataTable metrics={metrics || []} />
      )}
    </div>
  );
}
