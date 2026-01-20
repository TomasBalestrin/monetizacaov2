import React from 'react';
import { Users, Phone, Target, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { MetricCard } from './MetricCard';
import type { SquadMetrics } from '@/hooks/useMetrics';

interface SquadSectionProps {
  squadMetrics: SquadMetrics;
  showClosers?: boolean;
}

export function SquadSection({ squadMetrics, showClosers = true }: SquadSectionProps) {
  const { squad, closers, totals } = squadMetrics;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
        <Users className="mr-2 text-blue-400" />
        Squad {squad.name}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Calls Realizadas" value={totals.calls} icon={Phone} />
        <MetricCard title="Número de Vendas" value={totals.sales} icon={Target} />
        <MetricCard
          title="Taxa de Conversão"
          value={totals.conversion}
          icon={TrendingUp}
          isPercentage
        />
        <MetricCard title="Valor em Venda" value={totals.revenue} icon={DollarSign} isCurrency />
        <MetricCard title="Valor de Entrada" value={totals.entries} icon={DollarSign} isCurrency />
      </div>

      {showClosers && closers.length > 0 && (
        <div className="mt-6 space-y-6">
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
      )}
    </div>
  );
}

interface SquadSectionLoadingProps {
  showClosers?: boolean;
}

export function SquadSectionLoading({ showClosers = true }: SquadSectionLoadingProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="h-4 w-24 bg-slate-700 rounded animate-pulse mb-2" />
            <div className="h-8 w-20 bg-slate-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
