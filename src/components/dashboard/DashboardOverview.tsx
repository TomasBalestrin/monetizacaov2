import React from 'react';
import { Phone, Target, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { SquadSection, SquadSectionLoading } from './SquadSection';
import { useTotalMetrics } from '@/hooks/useMetrics';

export function DashboardOverview() {
  const { totals, squadMetrics, isLoading, error } = useTotalMetrics();

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">Erro ao carregar dados</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard Geral</h1>

      {/* Main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          title="Faturamento Total do Setor"
          value={totals.revenue}
          trend={12.5}
          icon={DollarSign}
          large
          isCurrency
        />
        <MetricCard
          title="Entradas Total do Setor"
          value={totals.entries}
          trend={8.3}
          icon={DollarSign}
          large
          isCurrency
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Calls Realizadas" value={totals.calls} icon={Phone} />
        <MetricCard title="Número de Vendas" value={totals.sales} icon={Target} />
        <MetricCard
          title="Taxa de Conversão"
          value={totals.conversion}
          icon={TrendingUp}
          isPercentage
        />
      </div>

      {/* Squad sections */}
      {isLoading ? (
        <>
          <SquadSectionLoading />
          <SquadSectionLoading />
          <SquadSectionLoading />
        </>
      ) : (
        squadMetrics.map((sm) => (
          <SquadSection key={sm.squad.id} squadMetrics={sm} showClosers={false} />
        ))
      )}
    </div>
  );
}
