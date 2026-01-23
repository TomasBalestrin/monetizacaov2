import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, Target, TrendingUp, DollarSign, Users, Loader2, XCircle } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { PeriodFilter } from './PeriodFilter';
import { useSquadMetrics } from '@/hooks/useMetrics';
import { useRealtimeMetrics, useRealtimeSyncStatus } from '@/hooks/useRealtimeMetrics';
import { CloserDetailPage } from './closer/CloserDetailPage';
import { CloserCard } from './closer/CloserCard';
import { SquadSheetsConfig } from './SquadSheetsConfig';
import { SquadSyncButton } from './SquadSyncButton';

interface SquadPageProps {
  squadSlug: string;
}

export function SquadPage({ squadSlug }: SquadPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const closerId = searchParams.get('closer');
  
  // Enable realtime subscriptions for automatic updates
  useRealtimeMetrics();
  useRealtimeSyncStatus();
  
  const [periodStart, setPeriodStart] = useState<string | undefined>();
  const [periodEnd, setPeriodEnd] = useState<string | undefined>();
  const { squadMetrics, isLoading, error } = useSquadMetrics(periodStart, periodEnd);

  const currentSquad = squadMetrics.find(
    (sm) => sm.squad.slug.toLowerCase() === squadSlug.toLowerCase()
  );

  const handlePeriodChange = useCallback((start: string | undefined, end: string | undefined) => {
    setPeriodStart(start);
    setPeriodEnd(end);
  }, []);

  const handleCloserClick = useCallback((id: string) => {
    setSearchParams({ module: squadSlug, closer: id });
  }, [setSearchParams, squadSlug]);

  const handleBackFromCloser = useCallback(() => {
    setSearchParams({ module: squadSlug });
  }, [setSearchParams, squadSlug]);

  // If a closer is selected, show the detail page
  if (closerId) {
    return (
      <CloserDetailPage
        closerId={closerId}
        squadSlug={squadSlug}
        periodStart={periodStart}
        periodEnd={periodEnd}
        onPeriodChange={handlePeriodChange}
        onBack={handleBackFromCloser}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !currentSquad) {
    return (
      <div className="text-center py-20">
        <Users className="mx-auto text-muted-foreground mb-4" size={64} />
        <h2 className="text-2xl font-bold text-foreground mb-2">Squad não encontrado</h2>
        <p className="text-muted-foreground">Não foi possível carregar os dados do squad.</p>
      </div>
    );
  }

  const { squad, closers, totals } = currentSquad;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Squad {squad.name}</h1>
          <SquadSyncButton squadSlug={squadSlug} />
        </div>
        <PeriodFilter
          periodStart={periodStart}
          periodEnd={periodEnd}
          onPeriodChange={handlePeriodChange}
        />
      </div>

      {/* Squad-specific sheets configuration */}
      <SquadSheetsConfig squadSlug={squadSlug} squadName={squad.name} variant="compact" />

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

      {/* Cancellation Metrics Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-muted-foreground">Cancelamentos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Nº de Cancelamentos"
            value={totals.cancellations}
            icon={XCircle}
            variant="destructive"
          />
          <MetricCard
            title="% de Cancelamento"
            value={totals.cancellationRate}
            icon={TrendingUp}
            isPercentage
            variant="destructive"
          />
          <MetricCard
            title="Valor Venda Cancelamento"
            value={totals.cancellationValue}
            icon={DollarSign}
            isCurrency
            variant="destructive"
          />
          <MetricCard
            title="Valor Entrada Cancelamento"
            value={totals.cancellationEntries}
            icon={DollarSign}
            isCurrency
            variant="destructive"
          />
        </div>
      </div>

      {closers.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Closers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {closers.map(({ closer, metrics }) => (
              <CloserCard
                key={closer.id}
                closer={{
                  id: closer.id,
                  name: closer.name,
                  squad_id: closer.squad_id,
                  metrics,
                }}
                onClick={() => handleCloserClick(closer.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground">Nenhum closer encontrado neste squad.</p>
          <p className="text-muted-foreground/70 text-sm mt-2">
            Adicione métricas para visualizar os dados dos closers.
          </p>
        </div>
      )}
    </div>
  );
}
