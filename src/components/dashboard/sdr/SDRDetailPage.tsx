import React, { useCallback, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Phone, Users, Calendar, TrendingUp, UserCheck, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { SDRMetricCard } from './SDRMetricCard';
import { SDRWeeklyComparisonChart } from './SDRWeeklyComparisonChart';
import { SDRDataTable } from './SDRDataTable';
import { useSDRs, useSDRMetrics, useSDRFunnels, type SDRAggregatedMetrics, type SDRMetric } from '@/hooks/useSdrMetrics';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useRealtimeSDRMetrics, useRealtimeSyncStatus } from '@/hooks/useRealtimeMetrics';
import { MetricCardSkeletonGrid, ChartSkeleton, TableSkeleton } from '@/components/dashboard/skeletons';
import { cn } from '@/lib/utils';

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
      totalScheduledSameDay: 0,
      totalAttended: 0,
      avgAttendanceRate: 0,
      totalSales: 0,
      avgConversionRate: 0,
    };
  }

  const totalActivated = metrics.reduce((sum, m) => sum + (m.activated || 0), 0);
  const totalScheduled = metrics.reduce((sum, m) => sum + (m.scheduled || 0), 0);
  const totalScheduledSameDay = metrics.reduce((sum, m) => sum + (m.scheduled_same_day || 0), 0);
  const totalAttended = metrics.reduce((sum, m) => sum + (m.attended || 0), 0);
  const totalSales = metrics.reduce((sum, m) => sum + (m.sales || 0), 0);

  const avgScheduledRate = totalActivated > 0 ? (totalScheduled / totalActivated) * 100 : 0;
  const avgAttendanceRate = totalScheduledSameDay > 0 ? (totalAttended / totalScheduledSameDay) * 100 : 0;
  const avgConversionRate = totalAttended > 0 ? (totalSales / totalAttended) * 100 : 0;

  return {
    totalActivated,
    totalScheduled,
    avgScheduledRate,
    totalScheduledSameDay,
    totalAttended,
    avgAttendanceRate,
    totalSales,
    avgConversionRate,
  };
}

// Aggregate metrics by date when viewing all funnels (sum values for same date)
function aggregateMetricsByDate(metrics: SDRMetric[]): SDRMetric[] {
  const byDate = new Map<string, SDRMetric>();
  
  for (const m of metrics) {
    const existing = byDate.get(m.date);
    if (existing) {
      existing.activated += m.activated || 0;
      existing.scheduled += m.scheduled || 0;
      existing.scheduled_same_day += m.scheduled_same_day || 0;
      existing.attended += m.attended || 0;
      existing.sales += m.sales || 0;
    } else {
      byDate.set(m.date, { ...m });
    }
  }
  
  // Recalculate rates
  const aggregated = Array.from(byDate.values());
  for (const m of aggregated) {
    m.scheduled_rate = m.activated > 0 ? (m.scheduled / m.activated) * 100 : 0;
    m.attendance_rate = m.scheduled_same_day > 0 ? (m.attended / m.scheduled_same_day) * 100 : 0;
    m.conversion_rate = m.attended > 0 ? (m.sales / m.attended) * 100 : 0;
    m.funnel = null; // Clear funnel since it's aggregated
  }
  
  return aggregated.sort((a, b) => a.date.localeCompare(b.date));
}

export function SDRDetailPage({
  sdrId,
  periodStart,
  periodEnd,
  onPeriodChange,
  onBack,
}: SDRDetailPageProps) {
  const queryClient = useQueryClient();
  const [, setSearchParams] = useSearchParams();
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);
  
  // Enable realtime subscriptions for automatic data refresh
  useRealtimeSDRMetrics();
  useRealtimeSyncStatus();
  
  const { data: sdrs } = useSDRs();
  const { data: funnels, isLoading: isLoadingFunnels } = useSDRFunnels(sdrId);
  const { data: rawMetrics, isLoading: isLoadingMetrics } = useSDRMetrics(
    sdrId,
    periodStart,
    periodEnd,
    undefined // Always fetch all funnels, filter client-side for aggregation
  );

  const sdr = sdrs?.find((s) => s.id === sdrId);
  
  // Filter and/or aggregate metrics based on funnel selection
  const displayMetrics = useMemo(() => {
    if (!rawMetrics) return [];
    
    if (selectedFunnel) {
      // Filter by selected funnel
      return rawMetrics.filter(m => m.funnel === selectedFunnel);
    }
    
    // If no funnel selected and SDR has multiple funnels, aggregate by date
    if (funnels && funnels.length > 1) {
      return aggregateMetricsByDate(rawMetrics);
    }
    
    return rawMetrics;
  }, [rawMetrics, selectedFunnel, funnels]);
  
  const aggregatedMetrics = displayMetrics.length > 0 ? calculateAggregatedMetrics(displayMetrics) : null;

  const Icon = sdr?.type === 'social_selling' ? Users : Phone;
  const hasFunnels = funnels && funnels.length > 1;

  // Swipe navigation between SDRs
  const handleNavigateToSDR = useCallback((id: string) => {
    setSelectedFunnel(null); // Reset funnel selection when navigating
    setSearchParams({ module: 'sdrs', sdr: id });
  }, [setSearchParams]);

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
    items: sdrs || [],
    currentId: sdrId,
    onNavigate: handleNavigateToSDR,
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['sdr-metrics', sdrId] });
    await queryClient.invalidateQueries({ queryKey: ['sdr-funnels', sdrId] });
  }, [queryClient, sdrId]);

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
              <Icon size={28} className="text-primary" />
            </div>

            <div>
              {sdr ? (
                <>
                  <h1 className="text-2xl font-bold text-foreground">{sdr.name}</h1>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground capitalize">
                      {sdr.type === 'sdr' ? 'SDR' : 'Social Selling'}
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
            
            {/* Funnel selector - only show if SDR has multiple funnels */}
            {hasFunnels && !isLoadingFunnels && (
              <Select
                value={selectedFunnel || 'all'}
                onValueChange={(value) => setSelectedFunnel(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos os Funis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Funis</SelectItem>
                  {funnels.map((funnel) => (
                    <SelectItem key={funnel} value={funnel}>
                      {funnel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            ← Deslize para navegar entre SDRs →
          </p>
        )}

        {/* Metrics - Hierarchical Grid */}
        {isLoadingMetrics ? (
          <MetricCardSkeletonGrid count={7} />
        ) : (
          <div className="space-y-4">
            {/* Primary Metrics Row - Large Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SDRMetricCard
                title="Ativados"
                value={aggregatedMetrics?.totalActivated || 0}
                icon={Users}
                size="large"
              />
              <SDRMetricCard
                title="Agendados"
                value={aggregatedMetrics?.totalScheduled || 0}
                icon={Calendar}
                size="large"
              />
              <SDRMetricCard
                title="% Agendamento"
                value={aggregatedMetrics?.avgScheduledRate || 0}
                isPercentage
                showProgress
                icon={TrendingUp}
                size="large"
                variant={aggregatedMetrics?.avgScheduledRate && aggregatedMetrics.avgScheduledRate >= 25 ? 'success' : 'warning'}
              />
              <SDRMetricCard
                title="Vendas"
                value={aggregatedMetrics?.totalSales || 0}
                icon={ShoppingCart}
                variant="highlight"
                size="featured"
              />
            </div>
            
            {/* Secondary Metrics Row - Regular Cards */}
            <div className="grid grid-cols-3 gap-4">
              <SDRMetricCard
                title="Agend. no dia"
                value={aggregatedMetrics?.totalScheduledSameDay || 0}
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
                variant={aggregatedMetrics?.avgAttendanceRate && aggregatedMetrics.avgAttendanceRate >= 50 ? 'success' : 'warning'}
              />
            </div>
          </div>
        )}

        {/* Chart */}
        {isLoadingMetrics ? (
          <ChartSkeleton height={350} />
        ) : (
          <SDRWeeklyComparisonChart metrics={displayMetrics || []} />
        )}

        {/* Data Table */}
        {isLoadingMetrics ? (
          <TableSkeleton rows={5} columns={8} />
        ) : (
          <SDRDataTable 
            metrics={displayMetrics || []} 
            showFunnelColumn={!selectedFunnel && hasFunnels}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
