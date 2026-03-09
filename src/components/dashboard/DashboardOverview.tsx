import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Target, TrendingUp, DollarSign, XCircle } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { CombinedMetricCard } from './CombinedMetricCard';
import { SquadSection, SquadSectionLoading } from './SquadSection';
import { EmptyState } from './EmptyState';
import { MonthSelector, getMonthPeriod } from './MonthSelector';
import { useTotalMetrics } from '@/controllers/useCloserController';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics';

export function DashboardOverview() {
  // Enable realtime subscriptions for automatic updates
  useRealtimeMetrics();
  
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  
  const { periodStart, periodEnd } = useMemo(() => getMonthPeriod(selectedMonth), [selectedMonth]);
  const { totals, squadMetrics, isLoading, error } = useTotalMetrics(periodStart, periodEnd);

  const handleConnectSheet = () => {
    if (isAdmin) {
      // Navigate to admin panel where Google Sheets config will be
      navigate('/?module=admin');
      toast.info('Configure o Google Sheets no Painel Administrativo');
    } else {
      toast.error('Apenas administradores podem configurar a integração com Google Sheets');
    }
  };

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">Erro ao carregar dados</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard Geral</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Acompanhe as metricas de todas as equipes de vendas</p>
        </div>
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      </div>

      {/* Main metrics - value + trend in one card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CombinedMetricCard
          title="Faturamento Total do Setor"
          value={totals.revenue}
          trend={totals.revenueTrend}
          trendContext={totals.trendContext}
          icon={DollarSign}
          variant="success"
        />
        <CombinedMetricCard
          title="Entradas Total do Setor"
          value={totals.entries}
          trend={totals.entriesTrend}
          trendContext={totals.trendContext}
          icon={DollarSign}
          variant="warning"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Calls Realizadas"
          value={totals.calls}
          icon={Phone}
        />
        <MetricCard
          title="Número de Vendas"
          value={totals.sales}
          icon={Target}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={totals.conversion}
          icon={TrendingUp}
          isPercentage
        />
      </div>

      {/* Cancellation metrics */}
      <div className="space-y-3">
        <p className="section-label text-xs px-1">Cancelamentos do Setor</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            title="Nº Cancelamentos"
            value={totals.cancellations}
            icon={XCircle}
            variant="destructive"
            compact
          />
          <MetricCard
            title="% Cancelamento"
            value={totals.cancellationRate}
            icon={TrendingUp}
            isPercentage
            variant="destructive"
            compact
          />
          <MetricCard
            title="Valor Venda Cancel."
            value={totals.cancellationValue}
            icon={DollarSign}
            isCurrency
            variant="destructive"
            compact
          />
          <MetricCard
            title="Valor Entrada Cancel."
            value={totals.cancellationEntries}
            icon={DollarSign}
            isCurrency
            variant="destructive"
            compact
          />
        </div>
      </div>

      {/* Squad sections */}
      <div className="space-y-6">
        <h2 className="section-label text-xs px-1">Performance por Squad</h2>
        
        {isLoading ? (
          <div className="space-y-6">
            <SquadSectionLoading />
            <SquadSectionLoading />
            <SquadSectionLoading />
          </div>
        ) : (
          <div className="space-y-6">
            {squadMetrics.map((sm) => (
              <SquadSection key={sm.squad.id} squadMetrics={sm} showClosers={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
