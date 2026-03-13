import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Phone, Users, UserCheck, Calendar, TrendingUp, ShoppingCart, CalendarPlus, Filter, ChevronRight } from 'lucide-react';
import { MonthSelector, getMonthPeriod } from '@/components/dashboard/MonthSelector';
import { WeekSelector, getWeeksOfMonth } from '@/components/dashboard/WeekSelector';
import { parseDateString } from '@/lib/utils';
import type { SDRType } from './SDRTypeToggle';
import { SDRMetricCard } from './SDRMetricCard';
import { useSDRTotalMetrics, useSDRsWithMetricsRaw } from '@/controllers/useSdrController';
import { calculateAggregatedMetrics, groupMetricsBySDR } from '@/model/services/sdrService';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { MetricCardSkeletonGrid } from '@/components/dashboard/skeletons';
import { useRealtimeSDRMetrics } from '@/hooks/useRealtimeMetrics';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SDRFunnelKanban } from './SDRFunnelKanban';

// Lazy load heavy sub-pages/dialogs to avoid circular chunk initialization
const SDRDetailPage = lazy(() => import('./SDRDetailPage').then(m => ({ default: m.SDRDetailPage })));
const ScheduleCallDialog = lazy(() => import('./ScheduleCallDialog').then(m => ({ default: m.ScheduleCallDialog })));

interface SDRDashboardProps {
  sdrType: SDRType;
}

export function SDRDashboard({ sdrType }: SDRDashboardProps) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [isScheduleCallOpen, setIsScheduleCallOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);

  // Enable realtime subscriptions for automatic updates
  useRealtimeSDRMetrics();

  // Check if viewing a specific SDR
  const selectedSdrId = searchParams.get('sdr');
  
  const { periodStart, periodEnd } = useMemo(() => getMonthPeriod(selectedMonth), [selectedMonth]);

  const { data: totalMetricsRpc, isLoading: isLoadingTotal } = useSDRTotalMetrics(
    sdrType,
    periodStart,
    periodEnd
  );

  const { data: rawData, isLoading: isLoadingSDRs } = useSDRsWithMetricsRaw(
    sdrType,
    periodStart,
    periodEnd
  );

  const availableFunnels = rawData?.availableFunnels || [];

  // Get week boundaries for filtering (must be before filteredMetrics)
  const weekFilter = useMemo(() => {
    if (!selectedWeek) return null;
    const weeks = getWeeksOfMonth(selectedMonth);
    return weeks.find(w => w.weekKey === selectedWeek) || null;
  }, [selectedWeek, selectedMonth]);

  const filteredMetrics = useMemo(() => {
    if (!rawData?.metrics) return [];
    let metrics = rawData.metrics;

    // Filter by week
    if (weekFilter) {
      const weekStart = weekFilter.startDate;
      const weekEnd = weekFilter.endDate;
      metrics = metrics.filter(m => {
        const date = parseDateString(m.date);
        return date >= weekStart && date <= weekEnd;
      });
    }

    // Filter by funnel
    if (selectedFunnel) {
      metrics = metrics.filter(m => m.funnel === selectedFunnel);
    }

    return metrics;
  }, [rawData?.metrics, selectedFunnel, weekFilter]);

  const totalMetrics = useMemo(() => {
    if (!selectedFunnel && !weekFilter) return totalMetricsRpc;
    return calculateAggregatedMetrics(filteredMetrics);
  }, [selectedFunnel, weekFilter, totalMetricsRpc, filteredMetrics]);

  const sdrsWithMetrics = useMemo(() => {
    if (!rawData?.sdrs) return [];
    return groupMetricsBySDR(rawData.sdrs, filteredMetrics);
  }, [rawData?.sdrs, filteredMetrics]);

  const handleMonthChange = useCallback((month: Date) => {
    setSelectedMonth(month);
    setSelectedWeek(null); // Reset week when month changes
  }, []);

  const moduleName = sdrType === 'sdr' ? 'sdrs' : 'social_selling';

  const handleSDRClick = (sdrId: string) => {
    setSearchParams({ module: moduleName, sdr: sdrId });
  };

  const handleBackToDashboard = () => {
    setSearchParams({ module: moduleName });
  };

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['sdr-total-metrics'] });
    await queryClient.invalidateQueries({ queryKey: ['sdrs-with-metrics-raw'] });
  }, [queryClient]);

  // If a specific SDR is selected, render the detail page
  if (selectedSdrId) {
    return (
      <Suspense fallback={<MetricCardSkeletonGrid count={8} />}>
        <SDRDetailPage
          sdrId={selectedSdrId}
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          onBack={handleBackToDashboard}
        />
      </Suspense>
    );
  }

  const isLoading = isLoadingTotal || isLoadingSDRs;
  const hasData = sdrsWithMetrics && sdrsWithMetrics.length > 0;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/8">
              {sdrType === 'sdr' ? (
                <Phone size={22} className="text-primary" />
              ) : (
                <Users size={22} className="text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Dashboard {sdrType === 'sdr' ? 'SDR' : 'Social Selling'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Metricas consolidadas de {sdrType === 'sdr' ? 'SDRs' : 'Social Selling'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setIsScheduleCallOpen(true)} size="sm" variant="outline" className="hidden rounded-xl h-8 text-xs gap-1.5">
              <CalendarPlus className="h-3.5 w-3.5" />
              Agendar Call
            </Button>
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
            />
            <WeekSelector
              selectedMonth={selectedMonth}
              selectedWeek={selectedWeek}
              onWeekChange={setSelectedWeek}
            />
            {availableFunnels.length > 0 && (
              <Select
                value={selectedFunnel || 'all'}
                onValueChange={(v) => setSelectedFunnel(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter size={16} className="mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Todos os Funis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Funis</SelectItem>
                  {availableFunnels.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>


        {/* Consolidated Metrics */}
        {isLoading ? (
          <MetricCardSkeletonGrid count={8} />
        ) : (
          <div className="space-y-4">
            {/* Primary metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SDRMetricCard
                title="Ativados"
                value={totalMetrics?.totalActivated || 0}
                icon={Users}
                size="large"
              />
              <SDRMetricCard
                title="Agendados"
                value={totalMetrics?.totalScheduled || 0}
                icon={Calendar}
                size="large"
              />
              <SDRMetricCard
                title="Realizados"
                value={totalMetrics?.totalAttended || 0}
                icon={UserCheck}
                size="large"
              />
              <SDRMetricCard
                title="Vendas"
                value={totalMetrics?.totalSales || 0}
                icon={ShoppingCart}
                variant="highlight"
                size="large"
              />
            </div>

            {/* Secondary metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SDRMetricCard
                title="% Agendamento"
                value={totalMetrics?.avgScheduledRate || 0}
                isPercentage
                showProgress
                icon={TrendingUp}
              />
              <SDRMetricCard
                title="Agend. Follow Up"
                value={totalMetrics?.totalScheduledFollowUp || 0}
                icon={CalendarPlus}
              />
              <SDRMetricCard
                title="Agend. no Dia"
                value={totalMetrics?.totalScheduledSameDay || 0}
                icon={UserCheck}
              />
              <SDRMetricCard
                title="% Comparecimento"
                value={totalMetrics?.avgAttendanceRate || 0}
                isPercentage
                showProgress
                icon={TrendingUp}
              />
            </div>
          </div>
        )}

        {/* Funnel Kanban */}
        {!isLoading && !selectedFunnel && rawData?.sdrs && rawData?.metrics && (
          <SDRFunnelKanban sdrs={rawData.sdrs} metrics={weekFilter ? rawData.metrics.filter(m => {
            const date = parseDateString(m.date);
            return date >= weekFilter.startDate && date <= weekFilter.endDate;
          }) : rawData.metrics} />
        )}

        {/* SDR Selector */}
        {!isLoading && sdrsWithMetrics && sdrsWithMetrics.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mr-1">
              {sdrType === 'sdr' ? 'SDRs' : 'Social Selling'}:
            </p>
            {sdrsWithMetrics.map((sdr) => (
              <button
                key={sdr.id}
                onClick={() => handleSDRClick(sdr.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-sm font-medium text-foreground group"
              >
                {sdr.type === 'sdr' ? (
                  <Phone size={12} className="text-muted-foreground group-hover:text-primary transition-colors" />
                ) : (
                  <Users size={12} className="text-muted-foreground group-hover:text-primary transition-colors" />
                )}
                {sdr.name}
                <span className="text-xs text-success font-bold">{sdr.metrics.totalSales}v</span>
                <ChevronRight size={12} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Schedule Call Dialog */}
        {isScheduleCallOpen && (
          <Suspense fallback={null}>
            <ScheduleCallDialog
              open={isScheduleCallOpen}
              onOpenChange={setIsScheduleCallOpen}
              sdrType={sdrType}
            />
          </Suspense>
        )}
      </div>
    </PullToRefresh>
  );
}
