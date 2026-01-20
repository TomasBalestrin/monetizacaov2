import React from 'react';
import { Phone, Target, TrendingUp, DollarSign, Users, Loader2 } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { useSquadMetrics } from '@/hooks/useMetrics';

interface SquadPageProps {
  squadSlug: string;
}

export function SquadPage({ squadSlug }: SquadPageProps) {
  const { squadMetrics, isLoading, error } = useSquadMetrics();

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
      <h1 className="text-3xl font-bold text-white mb-6">Squad {squad.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          title="Valor de Venda Total do Squad"
          value={totals.revenue}
          trend={12.5}
          icon={DollarSign}
          large
          isCurrency
        />
        <MetricCard
          title="Valor Total de Entrada do Squad"
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

      {closers.length > 0 ? (
        <div className="space-y-6">
          {closers.map(({ closer, metrics }) => (
            <div key={closer.id}>
              <h3 className="text-xl font-semibold text-white mb-3">Closer {closer.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard title="Calls Realizadas" value={metrics.calls} icon={Phone} />
                <MetricCard title="Número de Vendas" value={metrics.sales} icon={Target} />
                <MetricCard
                  title="Taxa de Conversão"
                  value={metrics.conversion}
                  icon={TrendingUp}
                  isPercentage
                />
                <MetricCard
                  title="Valor em Venda"
                  value={metrics.revenue}
                  icon={DollarSign}
                  isCurrency
                />
                <MetricCard
                  title="Valor de Entrada"
                  value={metrics.entries}
                  icon={DollarSign}
                  isCurrency
                />
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
