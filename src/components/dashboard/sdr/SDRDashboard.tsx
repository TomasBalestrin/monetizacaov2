import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Phone, Users, UserCheck, Calendar, TrendingUp, ShoppingCart, Plus } from 'lucide-react';
import { MonthSelector, getMonthPeriod } from '@/components/dashboard/MonthSelector';
import { WeekSelector, getWeeksOfMonth } from '@/components/dashboard/WeekSelector';
import { parseDateString } from '@/lib/utils';
import { SDRTypeToggle, SDRType } from './SDRTypeToggle';
import { SDRMetricCard } from './SDRMetricCard';
import { SDRCard } from './SDRCard';
import { SDRDetailPage } from './SDRDetailPage';
import { SDRMetricsDialog } from './SDRMetricsDialog';
import { useSDRTotalMetrics, useSDRsWithMetrics } from '@/hooks/useSdrMetrics';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { MetricCardSkeletonGrid, SDRCardSkeletonGrid } from '@/components/dashboard/skeletons';
import { useRealtimeSDRMetrics } from '@/hooks/useRealtimeMetrics';
import { Button } from '@/components/ui/button';

export function SDRDashboard() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sdrType, setSdrType] = useState<SDRType>('sdr');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [isAddMetricOpen, setIsAddMetricOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  // Enable realtime subscriptions for automatic updates
  useRealtimeSDRMetrics();

  // Check if viewing a specific SDR
  const selectedSdrId = searchParams.get('sdr');
  
  const { periodStart, periodEnd } = useMemo(() => getMonthPeriod(selectedMonth), [selectedMonth]);

  const { data: totalMetrics, isLoading: isLoadingTotal } = useSDRTotalMetrics(
    sdrType,
    periodStart,
    periodEnd
  );

  const { data: sdrsWithMetrics, isLoading: isLoadingSDRs } = useSDRsWithMetrics(
    sdrType,
    periodStart,
    periodEnd
  );

  const handleMonthChange = useCallback((month: Date) => {
    setSelectedMonth(month);
    setSelectedWeek(null); // Reset week when month changes
  }, []);

  // Get week boundaries for filtering
  const weekFilter = useMemo(() => {
    if (!selectedWeek) return null;
    const weeks = getWeeksOfMonth(selectedMonth);
    return weeks.find(w => w.weekKey === selectedWeek) || null;
  }, [selectedWeek, selectedMonth]);

  const handleSDRClick = (sdrId: string) => {
    setSearchParams({ module: 'sdrs', sdr: sdrId });
  };

  const handleBackToDashboard = () => {
    setSearchParams({ module: 'sdrs' });
  };

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['sdr-total-metrics'] });
    await queryClient.invalidateQueries({ queryKey: ['sdrs-with-metrics'] });
  }, [queryClient]);

  // If a specific SDR is selected, render the detail page
  if (selectedSdrId) {
    return (
      <SDRDetailPage
        sdrId={selectedSdrId}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        onBack={handleBackToDashboard}
      />
    );
  }

  const isLoading = isLoadingTotal || isLoadingSDRs;
  const hasData = sdrsWithMetrics && sdrsWithMetrics.length > 0;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Phone size={28} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard SDR</h1>
              <p className="text-muted-foreground">
                Métricas consolidadas de {sdrType === 'sdr' ? 'SDRs' : 'Social Selling'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setIsAddMetricOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Métrica
            </Button>
            <SDRTypeToggle value={sdrType} onChange={setSdrType} />
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


        {/* Consolidated Metrics */}

        {/* Consolidated Metrics */}
        {isLoading ? (
          <MetricCardSkeletonGrid count={7} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <SDRMetricCard
              title="Ativados"
              value={totalMetrics?.totalActivated || 0}
              icon={Users}
            />
            <SDRMetricCard
              title="Agendados"
              value={totalMetrics?.totalScheduled || 0}
              icon={Calendar}
            />
            <SDRMetricCard
              title="% Agendamento"
              value={totalMetrics?.avgScheduledRate || 0}
              isPercentage
              showProgress
              icon={TrendingUp}
            />
            <SDRMetricCard
              title="Agend. no dia"
              value={totalMetrics?.totalScheduledSameDay || 0}
              icon={UserCheck}
            />
            <SDRMetricCard
              title="Realizados"
              value={totalMetrics?.totalAttended || 0}
              icon={UserCheck}
            />
            <SDRMetricCard
              title="% Comparec."
              value={totalMetrics?.avgAttendanceRate || 0}
              isPercentage
              showProgress
              icon={TrendingUp}
            />
            <SDRMetricCard
              title="Vendas"
              value={totalMetrics?.totalSales || 0}
              icon={ShoppingCart}
              variant="highlight"
            />
          </div>
        )}

        {/* SDR List */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {sdrType === 'sdr' ? 'SDRs' : 'Social Selling'} Individuais
          </h2>

          {isLoading ? (
            <SDRCardSkeletonGrid count={6} />
          ) : sdrsWithMetrics && sdrsWithMetrics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sdrsWithMetrics.map((sdr) => (
                <SDRCard
                  key={sdr.id}
                  sdr={sdr}
                  onClick={() => handleSDRClick(sdr.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-card rounded-xl border border-border">
              <Phone size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum {sdrType === 'sdr' ? 'SDR' : 'Social Selling'} cadastrado
              </h3>
               <p className="text-muted-foreground text-center max-w-md">
                 Adicione métricas usando o botão acima para visualizar os dados.
               </p>
            </div>
          )}
        </div>

        {/* Add Metric Dialog */}
        <SDRMetricsDialog
          open={isAddMetricOpen}
          onOpenChange={setIsAddMetricOpen}
          sdrType={sdrType}
        />
      </div>
    </PullToRefresh>
  );
}
