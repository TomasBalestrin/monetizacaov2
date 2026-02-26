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
import { useClosers, useCloserMetrics, useDeleteMetric, type CloserMetricRecord } from '@/hooks/useMetrics';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics';
import { useGoals, getGoalTarget } from '@/hooks/useGoals';
import { useUserFunnels } from '@/hooks/useFunnels';
import { MetricCardSkeletonGrid, ChartSkeleton, TableSkeleton } from '@/components/dashboard/skeletons';
import { cn } from '@/lib/utils';
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

  // Net Sales
  const totalSales = grossSales - totalCancellations;
  const totalRevenue = grossRevenue - totalCancellationValue;
  const totalEntries = grossEntries - totalCancellationEntries;

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

  // Filter closers by current squad
  const squadClosers = useMemo(() => {
    if (!closers) return [];
    return closers.filter((c) => c.squad?.slug?.toLowerCase() === squadSlug.toLowerCase());
  }, [closers, squadSlug]);

  const closer = squadClosers.find((c) => c.id === closerId);

  // Week filtering
  const weekFilteredMetrics = useMemo(() => {
    if (!metrics || !selectedWeek) return metrics || [];
    const weeks = getWeeksOfMonth(selectedMonth);
    const activeWeek = weeks.find(w => w.weekKey === selectedWeek);
    if (!activeWeek) return metrics;
    return metrics.filter(m => {
      const date = parseDateString(m.period_start);
      return date >= activeWeek.startDate && date <= activeWeek.endDate;
    });
  }, [metrics, selectedWeek, selectedMonth]);

  const aggregatedMetrics = weekFilteredMetrics.length > 0 ? calculateAggregatedMetrics(weekFilteredMetrics, squadSlug) : null;

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
      await deleteMetric.mutateAsync(deletingMetricId);
      setDeletingMetricId(null);
    }
  }, [deletingMetricId, deleteMetric]);

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

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMetricsDialogOpen(true)}
              className="gap-2"
            >
              <Plus size={16} />
              Adicionar
            </Button>

            {closerFunnels && closerFunnels.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFunnelFormOpen(true)}
                className="gap-2"
              >
                <Layers size={16} />
                Por Funil
              </Button>
            )}

            {closerFunnels && closerFunnels.length > 0 && (
              <Select
                value={selectedFunnel || 'all'}
                onValueChange={(v) => setSelectedFunnel(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <Filter size={14} className="mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Funil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Funis</SelectItem>
                  {closerFunnels.map((f) => (
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
        {isLoadingMetrics ? (
          <ChartSkeleton height={350} />
        ) : (
          <CloserWeeklyComparisonChart metrics={metrics || []} activeWeekKey={selectedWeek} />
        )}

        {/* Data Table */}
        {isLoadingMetrics ? (
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
