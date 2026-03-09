import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Phone, Users, UserCheck, Calendar, TrendingUp, ShoppingCart, Plus, CalendarPlus } from 'lucide-react';
import { MonthSelector, getMonthPeriod } from '@/components/dashboard/MonthSelector';
import { WeekSelector, getWeeksOfMonth } from '@/components/dashboard/WeekSelector';
import { parseDateString } from '@/lib/utils';
import type { SDRType } from './SDRTypeToggle';
import { SDRMetricCard } from './SDRMetricCard';
import { SDRCard } from './SDRCard';
import { SDRDetailPage } from './SDRDetailPage';
import { SDRMetricsDialog } from './SDRMetricsDialog';
import { ScheduleCallDialog } from './ScheduleCallDialog';
import { useSDRTotalMetrics, useSDRsWithMetrics } from '@/controllers/useSdrController';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { MetricCardSkeletonGrid, SDRCardSkeletonGrid } from '@/components/dashboard/skeletons';
import { useRealtimeSDRMetrics } from '@/hooks/useRealtimeMetrics';
import { Button } from '@/components/ui/button';

interface SDRDashboardProps {
  sdrType: SDRType;
}

export function SDRDashboard({ sdrType }: SDRDashboardProps) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [isAddMetricOpen, setIsAddMetricOpen] = useState(false);
  const [isScheduleCallOpen, setIsScheduleCallOpen] = useState(false);
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

  const moduleName = sdrType === 'sdr' ? 'sdrs' : 'social_selling';

  const handleSDRClick = (sdrId: string) => {
    setSearchParams({ module: moduleName, sdr: sdrId });
  };

  const handleBackToDashboard = () => {
    setSearchParams({ module: moduleName });
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
            <Button onClick={() => setIsAddMetricOpen(true)} size="sm" className="rounded-xl">
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar Metrica
            </Button>
            <Button onClick={() => setIsScheduleCallOpen(true)} size="sm" variant="outline" className="rounded-xl">
              <CalendarPlus className="mr-1.5 h-4 w-4" />
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

        {/* SDR List */}
        <div>
          <p className="section-label mb-4">
            {sdrType === 'sdr' ? 'SDRs' : 'Social Selling'} Individuais
          </p>

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
            <div className="flex flex-col items-center justify-center py-12 bg-card rounded-2xl border border-border/30">
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

        {/* Schedule Call Dialog */}
        <ScheduleCallDialog
          open={isScheduleCallOpen}
          onOpenChange={setIsScheduleCallOpen}
          sdrType={sdrType}
        />
      </div>
    </PullToRefresh>
  );
}
