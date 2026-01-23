import React, { useCallback, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Phone, Target, DollarSign, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CloserWeeklyComparisonChart } from './CloserWeeklyComparisonChart';
import { CloserDataTable } from './CloserDataTable';
import { useClosers, useCloserMetrics, type CloserMetricRecord } from '@/hooks/useMetrics';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { MetricCardSkeletonGrid, ChartSkeleton, TableSkeleton } from '@/components/dashboard/skeletons';
import { cn } from '@/lib/utils';

interface CloserDetailPageProps {
  closerId: string;
  squadSlug: string;
  periodStart?: string;
  periodEnd?: string;
  onPeriodChange: (start: string | undefined, end: string | undefined) => void;
  onBack: () => void;
}

// Calculate aggregated metrics from an array of metrics
function calculateAggregatedMetrics(metrics: CloserMetricRecord[]) {
  if (metrics.length === 0) {
    return {
      totalCalls: 0,
      totalSales: 0,
      totalRevenue: 0,
      totalEntries: 0,
      revenueTrend: 0,
      entriesTrend: 0,
      conversionRate: 0,
      totalCancellations: 0,
      totalCancellationValue: 0,
    };
  }

  const totalCalls = metrics.reduce((sum, m) => sum + (m.calls || 0), 0);
  const totalSales = metrics.reduce((sum, m) => sum + (m.sales || 0), 0);
  const totalRevenue = metrics.reduce((sum, m) => sum + (m.revenue || 0), 0);
  const totalEntries = metrics.reduce((sum, m) => sum + (m.entries || 0), 0);
  const revenueTrend = metrics.reduce((sum, m) => sum + (m.revenue_trend || 0), 0);
  const entriesTrend = metrics.reduce((sum, m) => sum + (m.entries_trend || 0), 0);
  const totalCancellations = metrics.reduce((sum, m) => sum + (m.cancellations || 0), 0);
  const totalCancellationValue = metrics.reduce((sum, m) => sum + (m.cancellation_value || 0), 0);

  const conversionRate = totalCalls > 0 ? (totalSales / totalCalls) * 100 : 0;

  return {
    totalCalls,
    totalSales,
    totalRevenue,
    totalEntries,
    revenueTrend,
    entriesTrend,
    conversionRate,
    totalCancellations,
    totalCancellationValue,
  };
}

export function CloserDetailPage({
  closerId,
  squadSlug,
  periodStart,
  periodEnd,
  onPeriodChange,
  onBack,
}: CloserDetailPageProps) {
  const queryClient = useQueryClient();
  const [, setSearchParams] = useSearchParams();
  
  const { data: closers } = useClosers();
  const { data: metrics, isLoading: isLoadingMetrics } = useCloserMetrics(
    closerId,
    periodStart,
    periodEnd
  );

  // Filter closers by current squad
  const squadClosers = useMemo(() => {
    if (!closers) return [];
    return closers.filter((c) => c.squad?.slug?.toLowerCase() === squadSlug.toLowerCase());
  }, [closers, squadSlug]);

  const closer = squadClosers.find((c) => c.id === closerId);
  const aggregatedMetrics = metrics && metrics.length > 0 ? calculateAggregatedMetrics(metrics) : null;

  // Swipe navigation between closers in the same squad
  const handleNavigateToCloser = useCallback((id: string) => {
    setSearchParams({ module: squadSlug, closer: id });
  }, [setSearchParams, squadSlug]);

  const {
    currentIndex,
    totalItems,
    canGoNext,
    canGoPrev,
    goNext,
    goPrev,
    swipeOffset,
    isSwiping,
    handlers,
  } = useSwipeNavigation({
    items: squadClosers,
    currentId: closerId,
    onNavigate: handleNavigateToCloser,
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['closer-metrics', closerId] });
  }, [queryClient, closerId]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div
        className={cn(
          "space-y-6 transition-transform duration-200",
          !isSwiping && "transition-transform"
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
        {...handlers}
      >
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
              <Phone size={28} className="text-primary" />
            </div>

            <div>
              {closer ? (
                <>
                  <h1 className="text-2xl font-bold text-foreground">{closer.name}</h1>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">
                      Closer • Squad {closer.squad?.name || squadSlug}
                    </p>
                    {totalItems > 1 && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {currentIndex + 1} de {totalItems}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Skeleton className="h-8 w-48 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Navigation arrows for desktop */}
            {totalItems > 1 && (
              <div className="hidden md:flex items-center gap-1 mr-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goPrev}
                  disabled={!canGoPrev}
                  className="h-8 w-8"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goNext}
                  disabled={!canGoNext}
                  className="h-8 w-8"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
            
            <PeriodFilter
              periodStart={periodStart}
              periodEnd={periodEnd}
              onPeriodChange={onPeriodChange}
            />
          </div>
        </div>

        {/* Swipe hint for mobile */}
        {totalItems > 1 && (
          <p className="text-xs text-muted-foreground text-center md:hidden animate-fade-in">
            ← Deslize para navegar entre Closers →
          </p>
        )}

        {/* Metrics - Hierarchical Grid */}
        {isLoadingMetrics ? (
          <MetricCardSkeletonGrid count={7} />
        ) : (
          <div className="space-y-4">
            {/* Primary Metrics Row - Large Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Calls Realizadas"
                value={aggregatedMetrics?.totalCalls || 0}
                icon={Phone}
                large
              />
              <MetricCard
                title="Número de Vendas"
                value={aggregatedMetrics?.totalSales || 0}
                icon={Target}
                variant="success"
                large
              />
              <MetricCard
                title="Taxa de Conversão"
                value={aggregatedMetrics?.conversionRate || 0}
                isPercentage
                showProgress
                icon={TrendingUp}
                large
              />
              <MetricCard
                title="Faturamento"
                value={aggregatedMetrics?.totalRevenue || 0}
                icon={DollarSign}
                isCurrency
                large
              />
            </div>
            
            {/* Secondary Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Tendência Faturamento"
                value={aggregatedMetrics?.revenueTrend || 0}
                icon={TrendingUp}
                isCurrency
              />
              <MetricCard
                title="Valor de Entrada"
                value={aggregatedMetrics?.totalEntries || 0}
                icon={DollarSign}
                isCurrency
              />
              <MetricCard
                title="Tendência Entradas"
                value={aggregatedMetrics?.entriesTrend || 0}
                icon={TrendingUp}
                isCurrency
              />
              <MetricCard
                title="Cancelamentos"
                value={aggregatedMetrics?.totalCancellations || 0}
                icon={Target}
              />
            </div>
          </div>
        )}

        {/* Chart */}
        {isLoadingMetrics ? (
          <ChartSkeleton height={350} />
        ) : (
          <CloserWeeklyComparisonChart metrics={metrics || []} />
        )}

        {/* Data Table */}
        {isLoadingMetrics ? (
          <TableSkeleton rows={5} columns={8} />
        ) : (
          <CloserDataTable metrics={metrics || []} />
        )}
      </div>
    </PullToRefresh>
  );
}
