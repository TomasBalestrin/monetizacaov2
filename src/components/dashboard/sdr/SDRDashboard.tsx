import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Phone, Users, UserCheck, Calendar, TrendingUp, ShoppingCart, CalendarPlus, Filter, ChevronRight, MessageSquare, Clock, Link, Ticket, CheckCircle, Settings, DollarSign, CreditCard } from 'lucide-react';
import { MonthSelector, getMonthPeriod } from '@/components/dashboard/MonthSelector';
import { WeekSelector, getWeeksOfMonth } from '@/components/dashboard/WeekSelector';
import { parseDateString } from '@/lib/utils';
import type { SDRType } from './SDRTypeToggle';
import { SDRMetricCard } from './SDRMetricCard';
import { useSDRTotalMetrics, useSDRsWithMetricsRaw, useSDRs, useSDRFunnelsWithDates } from '@/controllers/useSdrController';
import { calculateAggregatedMetrics, groupMetricsBySDR } from '@/model/services/sdrService';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { MetricCardSkeletonGrid } from '@/components/dashboard/skeletons';
import { useRealtimeSDRMetrics } from '@/hooks/useRealtimeMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SDRFunnelKanban } from './SDRFunnelKanban';
import { SDRFunnelManager } from './SDRFunnelManager';

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

  const { isAdmin, isManager, role, entityLinks } = useAuth();

  // Enable realtime subscriptions for automatic updates
  useRealtimeSDRMetrics();

  const isFI = sdrType === 'funil_intensivo';

  // FI-specific: get SDR id and events with dates
  const { data: fiSdrs } = useSDRs(isFI ? 'funil_intensivo' : undefined);
  const fiSdrId = fiSdrs?.[0]?.id;
  const fiSdrName = fiSdrs?.[0]?.name || '';
  const { data: funnelsWithDates } = useSDRFunnelsWithDates(isFI ? fiSdrId : undefined);

  // Build event_date map for FI funnel filter labels
  const eventDateMap = useMemo(() => {
    const map = new Map<string, string | null>();
    if (funnelsWithDates) {
      for (const f of funnelsWithDates) map.set(f.funnel_name, f.event_date);
    }
    return map;
  }, [funnelsWithDates]);

  // Check if viewing a specific SDR
  const selectedSdrId = searchParams.get('sdr');

  // Guard: SDRs (role "viewer") só podem ver seus próprios SDRs
  const linkedSdrIds = useMemo(() => {
    if (role !== 'viewer') return null;
    return entityLinks.filter(l => l.entity_type === 'sdr').map(l => l.entity_id);
  }, [role, entityLinks]);

  // Guard: redirecionar para perfil próprio (sem visão geral) ou bloquear acesso a outro SDR
  const needsRedirect = linkedSdrIds && (!selectedSdrId || !linkedSdrIds.includes(selectedSdrId));
  useEffect(() => {
    if (needsRedirect && linkedSdrIds) {
      const firstLinked = linkedSdrIds[0];
      if (firstLinked) {
        setSearchParams(prev => { prev.set('sdr', firstLinked); return prev; });
      }
    }
  }, [needsRedirect, linkedSdrIds, setSearchParams]);

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

  const moduleName = sdrType === 'sdr' ? 'sdrs' : sdrType === 'social_selling' ? 'social_selling' : 'funil_intensivo';

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

  // Wait for redirect to complete
  if (needsRedirect) return null;

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
              {sdrType === 'social_selling' ? (
                <Users size={22} className="text-primary" />
              ) : (
                <Phone size={22} className="text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Dashboard {sdrType === 'sdr' ? 'SDR' : sdrType === 'social_selling' ? 'Social Selling' : 'Funil Intensivo'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Metricas consolidadas de {sdrType === 'sdr' ? 'SDRs' : sdrType === 'social_selling' ? 'Social Selling' : 'Funil Intensivo'}
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
                <SelectTrigger className="w-[220px]">
                  <Filter size={16} className="mr-2 text-muted-foreground" />
                  <SelectValue placeholder={isFI ? 'Todos os Eventos' : 'Todos os Funis'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isFI ? 'Todos os Eventos' : 'Todos os Funis'}</SelectItem>
                  {availableFunnels.map((f) => {
                    const eventDate = eventDateMap.get(f);
                    const label = isFI && eventDate
                      ? `${f} (${new Date(eventDate + 'T12:00:00').toLocaleDateString('pt-BR')})`
                      : f;
                    return <SelectItem key={f} value={f}>{label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            )}
            {isFI && (isAdmin || isManager) && fiSdrId && (
              <SDRFunnelManager
                sdrId={fiSdrId}
                sdrName={fiSdrName}
                sdrType="funil_intensivo"
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs rounded-xl">
                    <Settings size={14} />
                    Eventos
                  </Button>
                }
              />
            )}
          </div>
        </div>


        {/* Consolidated Metrics */}
        {isLoading ? (
          <MetricCardSkeletonGrid count={8} />
        ) : (
          <div className="space-y-4">
            {sdrType === 'funil_intensivo' ? (
              <>
                {/* Funil Intensivo metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <SDRMetricCard
                    title="Chamou"
                    value={totalMetrics?.totalFiCalled || 0}
                    icon={Phone}
                    size="large"
                  />
                  <SDRMetricCard
                    title="Aguardando"
                    value={totalMetrics?.totalFiAwaiting || 0}
                    icon={Clock}
                    size="large"
                  />
                  <SDRMetricCard
                    title="Receberam Link"
                    value={totalMetrics?.totalFiReceivedLink || 0}
                    icon={Link}
                    size="large"
                  />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <SDRMetricCard
                    title="Retiraram Ingresso"
                    value={totalMetrics?.totalFiGotTicket || 0}
                    icon={Ticket}
                    size="large"
                  />
                  <SDRMetricCard
                    title="Compareceram"
                    value={totalMetrics?.totalFiAttended || 0}
                    icon={CheckCircle}
                    size="large"
                  />
                  <SDRMetricCard
                    title="% Comparecimento"
                    value={totalMetrics?.avgFiAttendanceRate || 0}
                    isPercentage
                    showProgress
                    icon={TrendingUp}
                    variant={(totalMetrics?.avgFiAttendanceRate || 0) >= 50 ? 'success' : 'warning'}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Standard SDR metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <SDRMetricCard
                    title="Vendas"
                    value={totalMetrics?.totalSales || 0}
                    icon={ShoppingCart}
                    variant="highlight"
                    size="large"
                  />
                  <SDRMetricCard
                    title="Faturamento"
                    value={totalMetrics?.totalRevenue || 0}
                    icon={DollarSign}
                    isCurrency
                    variant="success"
                    size="large"
                  />
                  <SDRMetricCard
                    title="Entradas"
                    value={totalMetrics?.totalEntries || 0}
                    icon={CreditCard}
                    isCurrency
                    size="large"
                  />
                </div>
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
              </>
            )}
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
              {sdrType === 'sdr' ? 'SDRs' : sdrType === 'social_selling' ? 'Social Selling' : 'Funil Intensivo'}:
            </p>
            {sdrsWithMetrics.map((sdr) => (
              <button
                key={sdr.id}
                onClick={() => handleSDRClick(sdr.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-sm font-medium text-foreground group"
              >
                {sdr.type === 'social_selling' ? (
                  <Users size={12} className="text-muted-foreground group-hover:text-primary transition-colors" />
                ) : (
                  <Phone size={12} className="text-muted-foreground group-hover:text-primary transition-colors" />
                )}
                {sdr.name}
                <span className="text-xs text-success font-bold">
                  {sdrType === 'funil_intensivo'
                    ? `${sdr.metrics.totalFiAttended || 0} comp.`
                    : `${sdr.metrics.totalSales}v`
                  }
                </span>
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
