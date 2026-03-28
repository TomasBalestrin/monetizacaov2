import React, { useCallback, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Phone, Target, DollarSign, TrendingUp, ChevronLeft, ChevronRight, XCircle, Plus, Filter, Layers } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MonthSelector, getMonthPeriod } from '@/components/dashboard/MonthSelector';
import { WeekSelector, getWeeksOfMonth } from '@/components/dashboard/WeekSelector';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { parseDateString } from '@/lib/utils';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CloserWeeklyComparisonChart } from './CloserWeeklyComparisonChart';
import { CloserDataTable } from './CloserDataTable';
import { SquadMetricsDialog } from '@/components/dashboard/SquadMetricsDialog';
import { CloserFunnelForm } from './CloserFunnelForm';
import { ActiveCallBanner } from './ActiveCallBanner';
import { useClosers, useCloserMetrics, useCloserMetricsByFunnel, useDeleteMetric, type CloserMetricRecord } from '@/controllers/useCloserController';
import { recalculateSdrSales } from '@/model/repositories/sdrRepository';
import { useCloserFunnelData, useUserFunnels, useFunnels, type FunnelDailyData } from '@/controllers/useFunnelController';
import { calculateTrendDetailed } from '@/model/services/trendService';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics';
import { useGoals, getGoalTarget } from '@/controllers/useGoalController';
import { MetricCardSkeletonGrid, ChartSkeleton, TableSkeleton } from '@/components/dashboard/skeletons';
import { cn } from '@/lib/utils';
import { EntityNotifications } from '@/components/dashboard/EntityNotifications';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CloserDetailPageProps {
  closerId: string;
  squadSlug: string;
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
  onBack?: () => void;
}

// Calculate aggregated metrics from an array of metrics
function calculateAggregatedMetrics(metrics: CloserMetricRecord[], squadSlug: string) {
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
      totalCancellationEntries: 0,
      cancellationRate: 0,
    };
  }

  const totalCalls = metrics.reduce((sum, m) => sum + (m.calls || 0), 0);
  const grossSales = metrics.reduce((sum, m) => sum + (m.sales || 0), 0);
  const grossRevenue = metrics.reduce((sum, m) => sum + (m.revenue || 0), 0);
  const grossEntries = metrics.reduce((sum, m) => sum + (m.entries || 0), 0);
  const totalCancellations = metrics.reduce((sum, m) => sum + (m.cancellations || 0), 0);
  const totalCancellationValue = metrics.reduce((sum, m) => sum + (m.cancellation_value || 0), 0);
  const totalCancellationEntries = metrics.reduce((sum, m) => sum + (m.cancellation_entries || 0), 0);

  // Valores brutos (cancelamentos são exibidos separadamente)
  const totalSales = grossSales;
  const totalRevenue = grossRevenue;
  const totalEntries = grossEntries;

  // Tendências baseadas nos valores brutos da planilha
  const revenueTrend = metrics.reduce((sum, m) => sum + (m.revenue_trend || 0), 0);
  const entriesTrend = metrics.reduce((sum, m) => sum + (m.entries_trend || 0), 0);

  // Conversão baseada nos valores calculados (líquidos ou brutos conforme squad)
  const conversionRate = totalCalls > 0 ? (totalSales / totalCalls) * 100 : 0;
  // Taxa de cancelamento sempre baseada em vendas brutas
  const cancellationRate = grossSales > 0 ? (totalCancellations / grossSales) * 100 : 0;

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
    totalCancellationEntries,
    cancellationRate,
  };
}

export function CloserDetailPage({
  closerId,
  squadSlug,
  selectedMonth,
  onMonthChange,
  onBack,
}: CloserDetailPageProps) {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [, setSearchParams] = useSearchParams();
  const [isMetricsDialogOpen, setIsMetricsDialogOpen] = useState(false);
  const [isFunnelFormOpen, setIsFunnelFormOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<CloserMetricRecord | undefined>();
  const [deletingMetricId, setDeletingMetricId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);
  
  const deleteMetric = useDeleteMetric();
  
  // Enable realtime subscriptions for automatic data refresh
  useRealtimeMetrics();
  
  
  // Calculate period from selected month
  const { periodStart, periodEnd } = useMemo(() => getMonthPeriod(selectedMonth), [selectedMonth]);
  const monthStr = useMemo(() => format(startOfMonth(selectedMonth), 'yyyy-MM-dd'), [selectedMonth]);

  const { data: closers } = useClosers();
  const { data: metrics, isLoading: isLoadingMetrics } = useCloserMetrics(
    closerId,
    periodStart,
    periodEnd
  );
  const { data: goals } = useGoals('closer', closerId, monthStr);
  const { data: closerFunnels } = useUserFunnels(closerId);
  const { data: allFunnels } = useFunnels();
  const { data: funnelData, isLoading: isLoadingFunnelData } = useCloserFunnelData(
    closerId,
    selectedFunnel || undefined,
    selectedFunnel ? periodStart : undefined,
    selectedFunnel ? periodEnd : undefined
  );

  // Fetch metrics filtered by funnel_id (from metrics table)
  const { data: funnelMetricsData, isLoading: isLoadingFunnelMetrics } = useCloserMetricsByFunnel(
    closerId,
    selectedFunnel || undefined,
    selectedFunnel ? periodStart : undefined,
    selectedFunnel ? periodEnd : undefined
  );

  // Build available funnels list: merge user-assigned funnels with funnels found in metrics
  const availableFunnels = useMemo(() => {
    const funnelMap = new Map<string, { id: string; name: string }>();

    // Add user-assigned funnels
    (closerFunnels || []).forEach(f => funnelMap.set(f.id, { id: f.id, name: f.name }));

    // Add funnels found in metrics data
    (metrics || []).forEach(m => {
      if (m.funnel_id && m.funnel && !funnelMap.has(m.funnel_id)) {
        funnelMap.set(m.funnel_id, { id: m.funnel.id, name: m.funnel.name });
      }
    });

    // If we still have no funnels, try from all funnels list
    if (funnelMap.size === 0 && allFunnels) {
      allFunnels.forEach(f => funnelMap.set(f.id, { id: f.id, name: f.name }));
    }

    return Array.from(funnelMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [closerFunnels, metrics, allFunnels]);

  // Map funnel_daily_data to CloserMetricRecord format
  const mappedFunnelMetrics: CloserMetricRecord[] = useMemo(() => {
    if (!selectedFunnel) return [];

    // Map funnel_daily_data records
    const fromFunnelData = (funnelData || []).map((fd: FunnelDailyData) => ({
      id: fd.id,
      closer_id: fd.user_id,
      period_start: fd.date,
      period_end: fd.date,
      calls: fd.calls_done,
      sales: fd.sales_count,
      revenue: fd.sales_value,
      entries: fd.entries_value || 0,
      revenue_trend: 0,
      entries_trend: 0,
      cancellations: 0,
      cancellation_value: 0,
      cancellation_entries: 0,
      created_at: fd.created_at,
      updated_at: fd.created_at,
      created_by: fd.created_by,
      source: 'funnel',
      funnel_id: fd.funnel_id,
      sdr_id: fd.sdr_id,
      funnel: fd.funnel || null,
      sdr: fd.sdr || null,
    }));

    // Include metrics records that have this funnel_id
    const fromMetrics = (funnelMetricsData || []).map((m) => ({
      ...m,
      source: 'metrics',
    }));

    return [...fromFunnelData, ...fromMetrics];
  }, [funnelData, funnelMetricsData, selectedFunnel]);

  // Filter closers by current squad
  const squadClosers = useMemo(() => {
    if (!closers) return [];
    return closers.filter((c) => c.squad?.slug?.toLowerCase() === squadSlug.toLowerCase());
  }, [closers, squadSlug]);

  const closer = squadClosers.find((c) => c.id === closerId);

  // Use funnel data when a funnel is selected, otherwise use regular metrics
  const activeMetrics = useMemo(() => {
    return selectedFunnel ? mappedFunnelMetrics : (metrics || []);
  }, [selectedFunnel, mappedFunnelMetrics, metrics]);

  const isLoadingActiveMetrics = selectedFunnel ? (isLoadingFunnelData || isLoadingFunnelMetrics) : isLoadingMetrics;

  // Week filtering
  const weekFilteredMetrics = useMemo(() => {
    if (!selectedWeek) return activeMetrics;
    const weeks = getWeeksOfMonth(selectedMonth);
    const activeWeek = weeks.find(w => w.weekKey === selectedWeek);
    if (!activeWeek) return activeMetrics;
    return activeMetrics.filter(m => {
      const date = parseDateString(m.period_start);
      return date >= activeWeek.startDate && date <= activeWeek.endDate;
    });
  }, [activeMetrics, selectedWeek, selectedMonth]);

  const aggregatedMetrics = weekFilteredMetrics.length > 0 ? calculateAggregatedMetrics(weekFilteredMetrics, squadSlug) : null;

  // Compute trend context (working days info) for trend cards
  const trendContext = useMemo(() => {
    const refDate = periodStart ? parseDateString(periodStart) : new Date();
    const result = calculateTrendDetailed(0, refDate); // value doesn't matter, we just need days
    return { workedDays: result.workedDays, totalDays: result.totalDays };
  }, [periodStart]);

  // Swipe navigation between closers in the same squad
  const handleNavigateToCloser = useCallback((id: string) => {
    setSearchParams({ module: squadSlug, closer: id });
    setSelectedWeek(null);
  }, [setSearchParams, squadSlug]);

  const handleMonthChange = useCallback((month: Date) => {
    setSelectedWeek(null);
    onMonthChange(month);
  }, [onMonthChange]);

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

  const handleEditMetric = useCallback((metric: CloserMetricRecord) => {
    setEditingMetric(metric);
  }, []);

  const handleDeleteMetric = useCallback((metricId: string) => {
    setDeletingMetricId(metricId);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deletingMetricId) {
      // Capture metric info before deleting
      const metricToDelete = metrics?.find(m => m.id === deletingMetricId);
      const sdrId = metricToDelete?.sdr_id;
      const funnelName = metricToDelete?.funnel?.name || '';
      const funnelId = metricToDelete?.funnel_id || null;
      const periodStart = metricToDelete?.period_start;

      // Delete first, then recalculate from remaining source data
      await deleteMetric.mutateAsync(deletingMetricId);

      if (sdrId && funnelName && periodStart) {
        try {
          await recalculateSdrSales(sdrId, periodStart, funnelName, funnelId);
        } catch (err) {
          console.error('Error recalculating SDR sales:', err);
        }
      }
      setDeletingMetricId(null);
    }
  }, [deletingMetricId, deleteMetric, metrics]);

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
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-10 w-10"
              >
                <ArrowLeft size={20} />
              </Button>
            )}

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
            <Button
              size="sm"
              onClick={() => setIsMetricsDialogOpen(true)}
              className="rounded-xl h-9 text-sm gap-2 font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Metrica
            </Button>
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

            {closerFunnels && closerFunnels.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFunnelFormOpen(true)}
                className="rounded-xl h-8 text-xs gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" />
                Por Funil
              </Button>
            )}

            {availableFunnels.length > 0 && (
              <Select
                value={selectedFunnel || 'all'}
                onValueChange={(v) => setSelectedFunnel(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <Filter size={14} className="mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar por Funil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visão Geral</SelectItem>
                  {availableFunnels.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
            />
            <WeekSelector
              selectedMonth={selectedMonth}
              selectedWeek={selectedWeek}
              onWeekChange={setSelectedWeek}
            />
          </div>
        </div>

        {/* Dialog for manual metric entry */}
        <SquadMetricsDialog
          open={isMetricsDialogOpen}
          onOpenChange={setIsMetricsDialogOpen}
          squadSlug={squadSlug}
          defaultCloserId={closerId}
        />

        {/* Dialog for per-funnel data entry */}
        {closer && (
          <CloserFunnelForm
            open={isFunnelFormOpen}
            onOpenChange={setIsFunnelFormOpen}
            closerId={closerId}
            closerName={closer.name}
          />
        )}

        <SquadMetricsDialog
          open={!!editingMetric}
          onOpenChange={(open) => !open && setEditingMetric(undefined)}
          squadSlug={squadSlug}
          defaultCloserId={closerId}
          metric={editingMetric}
        />

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deletingMetricId} onOpenChange={(open) => !open && setDeletingMetricId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta métrica? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Swipe hint for mobile */}
        {totalItems > 1 && (
          <p className="text-xs text-muted-foreground text-center md:hidden animate-fade-in">
            ← Deslize para navegar entre Closers →
          </p>
        )}

        {/* Active Call Banner */}
        <ActiveCallBanner closerId={closerId} />

        {/* Notifications Section (admin only) */}
        {isAdmin && closer && (
          <EntityNotifications
            entityId={closerId}
            entityType="closer"
            entityName={closer.name}
          />
        )}

        {/* Metrics - Hierarchical Grid */}
        {isLoadingActiveMetrics ? (
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
                goalTarget={getGoalTarget(goals, 'calls')}
              />
              <MetricCard
                title="Número de Vendas"
                value={aggregatedMetrics?.totalSales || 0}
                icon={Target}
                variant="success"
                large
                goalTarget={getGoalTarget(goals, 'sales')}
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
                goalTarget={getGoalTarget(goals, 'revenue')}
              />
            </div>
            
            {/* Secondary Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Tendência Faturamento"
                value={aggregatedMetrics?.revenueTrend || 0}
                icon={TrendingUp}
                isCurrency
                trendWarning={trendContext.totalDays > 0 ? `Projeção · ${trendContext.workedDays.toFixed(0)} de ${trendContext.totalDays.toFixed(0)} dias úteis` : undefined}
              />
              <MetricCard
                title="Valor de Entrada"
                value={aggregatedMetrics?.totalEntries || 0}
                icon={DollarSign}
                isCurrency
                goalTarget={getGoalTarget(goals, 'entries')}
              />
              <MetricCard
                title="Tendência Entradas"
                value={aggregatedMetrics?.entriesTrend || 0}
                icon={TrendingUp}
                isCurrency
                trendWarning={trendContext.totalDays > 0 ? `Projeção · ${trendContext.workedDays.toFixed(0)} de ${trendContext.totalDays.toFixed(0)} dias úteis` : undefined}
              />
              <MetricCard
                title="Nº de Cancelamentos"
                value={aggregatedMetrics?.totalCancellations || 0}
                icon={XCircle}
                variant="destructive"
              />
            </div>

            {/* Cancellation Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard
                title="% de Cancelamento"
                value={aggregatedMetrics?.cancellationRate || 0}
                icon={TrendingUp}
                isPercentage
                variant="destructive"
              />
              <MetricCard
                title="Valor Venda Cancelamento"
                value={aggregatedMetrics?.totalCancellationValue || 0}
                icon={DollarSign}
                isCurrency
                variant="destructive"
              />
              <MetricCard
                title="Valor Entrada Cancelamento"
                value={aggregatedMetrics?.totalCancellationEntries || 0}
                icon={DollarSign}
                isCurrency
                variant="destructive"
              />
            </div>
          </div>
        )}

        {/* Chart */}
        {isLoadingActiveMetrics ? (
          <ChartSkeleton height={350} />
        ) : (
          <CloserWeeklyComparisonChart metrics={activeMetrics} activeWeekKey={selectedWeek} />
        )}

        {/* Data Table */}
        {isLoadingActiveMetrics ? (
          <TableSkeleton rows={5} columns={8} />
        ) : (
          <CloserDataTable 
            metrics={weekFilteredMetrics} 
            onEditMetric={handleEditMetric}
            onDeleteMetric={handleDeleteMetric}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
