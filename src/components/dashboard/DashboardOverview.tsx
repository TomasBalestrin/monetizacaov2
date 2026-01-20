import React from 'react';
import { Phone, Target, TrendingUp, DollarSign, Zap, Shield } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { SquadSection, SquadSectionLoading } from './SquadSection';
import { EmptyState } from './EmptyState';
import { useTotalMetrics } from '@/hooks/useMetrics';

export function DashboardOverview() {
  const { totals, squadMetrics, isLoading, error } = useTotalMetrics();

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">Erro ao carregar dados</p>
      </div>
    );
  }

  // Check if there's no data
  const hasData = totals.calls > 0 || totals.sales > 0 || totals.revenue > 0;

  if (!isLoading && !hasData) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Dashboard Geral</h1>
        <p className="text-muted-foreground">Acompanhe as métricas de todas as equipes de vendas</p>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricCard
          title="Faturamento Total do Setor"
          value={totals.revenue}
          trend={12.5}
          icon={DollarSign}
          large
          isCurrency
          variant="success"
        />
        <MetricCard
          title="Entradas Total do Setor"
          value={totals.entries}
          trend={8.3}
          icon={DollarSign}
          large
          isCurrency
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

      {/* Squad sections */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Performance por Squad</h2>
        
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
