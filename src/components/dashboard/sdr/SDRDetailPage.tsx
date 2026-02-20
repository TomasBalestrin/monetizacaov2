import React, { useCallback, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Phone, Users, Calendar, TrendingUp, UserCheck, ShoppingCart, ChevronLeft, ChevronRight, Plus, CalendarPlus } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { parseDateString } from '@/lib/utils';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { SDRMetricCard } from './SDRMetricCard';
import { SDRWeeklyComparisonChart } from './SDRWeeklyComparisonChart';
import { SDRDataTable } from './SDRDataTable';
import { SDRMetricsDialog } from './SDRMetricsDialog';
import { useSDRs, useSDRMetrics, useSDRFunnels, useDeleteSDRMetric, type SDRAggregatedMetrics, type SDRMetric } from '@/hooks/useSdrMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { SDRFunnelManager } from './SDRFunnelManager';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useRealtimeSDRMetrics } from '@/hooks/useRealtimeMetrics';
import { useGoals, getGoalTarget } from '@/hooks/useGoals';
import { MetricCardSkeletonGrid, ChartSkeleton, TableSkeleton } from '@/components/dashboard/skeletons';
import { cn } from '@/lib/utils';

interface SDRDetailPageProps {
  sdrId: string;
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
  onBack?: () => void;
}

// Calculate aggregated metrics from an array of metrics
function calculateAggregatedMetrics(metrics: SDRMetric[]): SDRAggregatedMetrics {
  if (metrics.length === 0) {
    return {
      totalActivated: 0,
      totalScheduled: 0,
      avgScheduledRate: 0,
      totalScheduledFollowUp: 0,
      totalScheduledSameDay: 0,
      totalAttended: 0,
      avgAttendanceRate: 0,
      totalSales: 0,
      avgConversionRate: 0,
    };
  }

  const totalActivated = metrics.reduce((sum, m) => sum + (m.activated || 0), 0);
  const totalScheduled = metrics.reduce((sum, m) => sum + (m.scheduled || 0), 0);
  const totalScheduledFollowUp = metrics.reduce((sum, m) => sum + (m.scheduled_follow_up || 0), 0);
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
    totalScheduledFollowUp,
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
      existing.scheduled_follow_up += m.scheduled_follow_up || 0;
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
    m.funnel = ''; // Clear funnel since it's aggregated
  }
  
  return aggregated.sort((a, b) => a.date.localeCompare(b.date));
}

export function SDRDetailPage({
  sdrId,
  selectedMonth,
  onMonthChange,
  onBack,
}: SDRDetailPageProps) {
  const queryClient = useQueryClient();
  const { isAdmin, isManager } = useAuth();
  const [, setSearchParams] = useSearchParams();
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  
  // Dialog states
  const [showMetricsDialog, setShowMetricsDialog] = useState(false);
  const [editingMetric, setEditingMetric] = useState<SDRMetric | null>(null);
  const [deletingMetricId, setDeletingMetricId] = useState<string | null>(null);
  
  const deleteMetric = useDeleteSDRMetric();
  
  // Enable realtime subscriptions for automatic data refresh
  useRealtimeSDRMetrics();
  
  
  const { periodStart, periodEnd } = useMemo(() => getMonthPeriod(selectedMonth), [selectedMonth]);
  const monthStr = useMemo(() => format(startOfMonth(selectedMonth), 'yyyy-MM-dd'), [selectedMonth]);
  
  const { data: sdrs } = useSDRs();
  const { data: funnels, isLoading: isLoadingFunnels } = useSDRFunnels(sdrId);
  const { data: rawMetrics, isLoading: isLoadingMetrics } = useSDRMetrics(
    sdrId,
    periodStart,
    periodEnd,
    undefined
  );
  const { data: goals } = useGoals('sdr', sdrId, monthStr);

  const sdr = sdrs?.find((s) => s.id === sdrId);
  
  // Filter and/or aggregate metrics based on funnel selection
  const displayMetrics = useMemo(() => {
    if (!rawMetrics) return [];
    
    if (selectedFunnel) {
      // Filter by selected funnel
      return rawMetrics.filter(m => m.funnel === selectedFunnel);
    }
    
    // If no funnel selected and SDR has multiple funnels, aggregate by date
    // Exclude empty-funnel records (created by a previous bug) to avoid inflating totals
    if (funnels && funnels.length > 1) {
      const metricsWithFunnel = rawMetrics.filter(m => m.funnel !== '');
      return aggregateMetricsByDate(metricsWithFunnel);
    }
    
    return rawMetrics;
  }, [rawMetrics, selectedFunnel, funnels]);
  
  // Get week boundaries for filtering
  const weekFilter = useMemo(() => {
    if (!selectedWeek) return null;
    const weeks = getWeeksOfMonth(selectedMonth);
    return weeks.find(w => w.weekKey === selectedWeek) || null;
  }, [selectedWeek, selectedMonth]);

  // Filter by week for cards and table (chart gets full data)
  const weekFilteredMetrics = useMemo(() => {
    if (!weekFilter) return displayMetrics;
    return displayMetrics.filter(m => {
      const date = parseDateString(m.date);
      return date >= weekFilter.startDate && date <= weekFilter.endDate;
    });
  }, [displayMetrics, weekFilter]);

  const aggregatedMetrics = weekFilteredMetrics.length > 0 ? calculateAggregatedMetrics(weekFilteredMetrics) : null;

  const Icon = sdr?.type === 'social_selling' ? Users : Phone;
  const hasFunnels = funnels && funnels.length > 1;
  const isAggregatedView = !selectedFunnel && hasFunnels;

  // Reset week when month changes
  const handleMonthChange = useCallback((month: Date) => {
    onMonthChange(month);
    setSelectedWeek(null);
  }, [onMonthChange]);

  // Swipe navigation between SDRs
  const handleNavigateToSDR = useCallback((id: string) => {
    setSelectedFunnel(null);
    setSelectedWeek(null);
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

  // Edit/Delete handlers
  const handleEditMetric = useCallback((metric: SDRMetric) => {
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

  const handleCloseEditDialog = useCallback((open: boolean) => {
    if (!open) {
      setEditingMetric(null);
    }
  }, []);

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
              <Icon size={28} className="text-primary" />
            </div>

            <div>
              {sdr ? (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground">{sdr.name}</h1>
                    {(isAdmin || isManager) && (
                      <SDRFunnelManager sdrId={sdrId} sdrName={sdr.name} />
                    )}
                  </div>
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
            
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
            />
            <WeekSelector
              selectedMonth={selectedMonth}
              selectedWeek={selectedWeek}
              onWeekChange={setSelectedWeek}
            />

            {!isAggregatedView && (
              <Button
                onClick={() => setShowMetricsDialog(true)}
                size="sm"
                className="gap-1.5"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
            )}
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
                goalTarget={getGoalTarget(goals, 'activated')}
              />
              <SDRMetricCard
                title="Agendados"
                value={aggregatedMetrics?.totalScheduled || 0}
                icon={Calendar}
                size="large"
                goalTarget={getGoalTarget(goals, 'scheduled')}
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
                goalTarget={getGoalTarget(goals, 'sales')}
              />
            </div>
            
            {/* Secondary Metrics Row - Regular Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SDRMetricCard
                title="Agend. Follow Up"
                value={aggregatedMetrics?.totalScheduledFollowUp || 0}
                icon={CalendarPlus}
              />
              <SDRMetricCard
                title="Agend. no dia"
                value={aggregatedMetrics?.totalScheduledSameDay || 0}
                icon={UserCheck}
              />
              <SDRMetricCard
                title="Realizados"
                value={aggregatedMetrics?.totalAttended || 0}
                icon={UserCheck}
                goalTarget={getGoalTarget(goals, 'attended')}
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
          <SDRWeeklyComparisonChart metrics={displayMetrics || []} activeWeekKey={selectedWeek} />
        )}

        {/* Data Table with Edit/Delete actions */}
        {isLoadingMetrics ? (
          <TableSkeleton rows={5} columns={8} />
        ) : (
          <SDRDataTable 
            metrics={weekFilteredMetrics || []} 
            showFunnelColumn={!selectedFunnel && hasFunnels}
            onEditMetric={isAggregatedView ? undefined : handleEditMetric}
            onDeleteMetric={isAggregatedView ? undefined : handleDeleteMetric}
          />
        )}
      </div>

      {/* Add Metrics Dialog */}
      <SDRMetricsDialog
        open={showMetricsDialog}
        onOpenChange={setShowMetricsDialog}
        sdrType={sdr?.type || 'sdr'}
        defaultSdrId={sdrId}
      />

      {/* Edit Metrics Dialog */}
      <SDRMetricsDialog
        open={!!editingMetric}
        onOpenChange={handleCloseEditDialog}
        sdrType={sdr?.type || 'sdr'}
        defaultSdrId={sdrId}
        editingMetric={editingMetric}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingMetricId} onOpenChange={(open) => !open && setDeletingMetricId(null)}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Métrica</AlertDialogTitle>
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
              {deleteMetric.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PullToRefresh>
  );
}
