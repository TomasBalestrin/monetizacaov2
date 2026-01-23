import React, { useState } from 'react';
import { Phone, Target, TrendingUp, DollarSign, Users, Loader2 } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { PeriodFilter } from './PeriodFilter';
import { useSquadMetrics } from '@/hooks/useMetrics';
import { useRealtimeMetrics, useRealtimeSyncStatus } from '@/hooks/useRealtimeMetrics';

interface SquadPageProps {
  squadSlug: string;
}

export function SquadPage({ squadSlug }: SquadPageProps) {
  // Enable realtime subscriptions for automatic updates
  useRealtimeMetrics();
  useRealtimeSyncStatus();
  
  const [periodStart, setPeriodStart] = useState<string | undefined>();
  const [periodEnd, setPeriodEnd] = useState<string | undefined>();
  const { squadMetrics, isLoading, error } = useSquadMetrics(periodStart, periodEnd);

  const currentSquad = squadMetrics.find(
    (sm) => sm.squad.slug.toLowerCase() === squadSlug.toLowerCase()
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error || !currentSquad) {
    return (
      <div className="text-center py-20">
        <Users className="mx-auto text-slate-400 mb-4" size={64} />
        <h2 className="text-2xl font-bold text-white mb-2">Squad não encontrado</h2>
        <p className="text-slate-400">Não foi possível carregar os dados do squad.</p>
      </div>
    );
  }

  const { squad, closers, totals } = currentSquad;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-foreground">Squad {squad.name}</h1>
        <PeriodFilter
          periodStart={periodStart}
          periodEnd={periodEnd}
          onPeriodChange={(start, end) => {
            setPeriodStart(start);
            setPeriodEnd(end);
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <MetricCard
            title="Valor de Venda Total do Squad"
            value={totals.revenue}
            icon={DollarSign}
            large
            isCurrency
          />
          <MetricCard
            title="Tendência Faturamento"
            value={totals.revenueTrend}
            icon={TrendingUp}
            isCurrency
          />
        </div>
        <div className="space-y-3">
          <MetricCard
            title="Valor Total de Entrada do Squad"
            value={totals.entries}
            icon={DollarSign}
            large
            isCurrency
          />
          <MetricCard
            title="Tendência Entradas"
            value={totals.entriesTrend}
            icon={TrendingUp}
            isCurrency
          />
        </div>
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

      {closers.length > 0 ? (
        <div className="space-y-6">
          {closers.map(({ closer, metrics }) => (
            <div key={closer.id} className="p-5 rounded-xl bg-card/50 border border-border/50">
              {/* Header com nome do closer destacado */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {closer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{closer.name}</h3>
                  <p className="text-xs text-muted-foreground">Closer</p>
                </div>
              </div>
              
              {/* Métricas do closer */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <MetricCard title="Calls Realizadas" value={metrics.calls} icon={Phone} />
                <MetricCard title="Número de Vendas" value={metrics.sales} icon={Target} />
                <MetricCard
                  title="Taxa de Conversão"
                  value={metrics.conversion}
                  icon={TrendingUp}
                  isPercentage
                />
                <div className="space-y-2">
                  <MetricCard
                    title="Valor em Venda"
                    value={metrics.revenue}
                    icon={DollarSign}
                    isCurrency
                  />
                  <MetricCard
                    title="Tendência"
                    value={metrics.revenueTrend}
                    icon={TrendingUp}
                    isCurrency
                  />
                </div>
                <div className="space-y-2">
                  <MetricCard
                    title="Valor de Entrada"
                    value={metrics.entries}
                    icon={DollarSign}
                    isCurrency
                  />
                  <MetricCard
                    title="Tendência"
                    value={metrics.entriesTrend}
                    icon={TrendingUp}
                    isCurrency
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-slate-800 rounded-lg border border-slate-700">
          <p className="text-slate-400">Nenhum closer encontrado neste squad.</p>
          <p className="text-slate-500 text-sm mt-2">
            Adicione métricas para visualizar os dados dos closers.
          </p>
        </div>
      )}
    </div>
  );
}
