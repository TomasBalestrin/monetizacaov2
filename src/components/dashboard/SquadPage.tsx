import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, Target, TrendingUp, DollarSign, Users, Loader2, XCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetricCard } from './MetricCard';
import { MonthSelector, getMonthPeriod } from './MonthSelector';
import { useSquadMetrics } from '@/controllers/useCloserController';
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics';
import { CloserDetailPage } from './closer/CloserDetailPage';
import { CloserCard } from './closer/CloserCard';
import { SquadMetricsDialog } from './SquadMetricsDialog';

interface SquadPageProps {
  squadSlug: string;
}

export function SquadPage({ squadSlug }: SquadPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const closerId = searchParams.get('closer');

  useRealtimeMetrics();

  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const { periodStart, periodEnd } = useMemo(() => getMonthPeriod(selectedMonth), [selectedMonth]);
  const [isMetricsDialogOpen, setIsMetricsDialogOpen] = useState(false);
  const { squadMetrics, isLoading, error } = useSquadMetrics(periodStart, periodEnd);

  const currentSquad = squadMetrics.find(
    (sm) => sm.squad.slug.toLowerCase() === squadSlug.toLowerCase()
  );

  const handleMonthChange = useCallback((month: Date) => {
    setSelectedMonth(month);
  }, []);

  const handleCloserClick = useCallback((id: string) => {
    setSearchParams({ module: squadSlug, closer: id });
  }, [setSearchParams, squadSlug]);

  const handleBackFromCloser = useCallback(() => {
    setSearchParams({ module: squadSlug });
  }, [setSearchParams, squadSlug]);

  if (closerId) {
    return (
      <CloserDetailPage
        closerId={closerId}
        squadSlug={squadSlug}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
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
        <h2 className="text-2xl font-bold text-foreground mb-2">Squad nao encontrado</h2>
        <p className="text-muted-foreground">Nao foi possivel carregar os dados do squad.</p>
      </div>
    );
  }

  const { squad, closers, totals } = currentSquad;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Squad {squad.name}</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMetricsDialogOpen(true)}
            className="gap-2 rounded-xl"
          >
            <Plus size={16} />
            Adicionar Metrica
          </Button>
        </div>
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      </div>

      <SquadMetricsDialog
        open={isMetricsDialogOpen}
        onOpenChange={setIsMetricsDialogOpen}
        squadSlug={squadSlug}
        selectedMonth={selectedMonth}
      />

      {/* Financial metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <MetricCard
            title="Valor de Venda Total do Squad"
            value={totals.revenue}
            icon={DollarSign}
            large
            isCurrency
          />
          <MetricCard
            title="Tendencia Faturamento"
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
            title="Tendencia Entradas"
            value={totals.entriesTrend}
            icon={TrendingUp}
            isCurrency
          />
        </div>
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Calls Realizadas" value={totals.calls} icon={Phone} />
        <MetricCard title="Numero de Vendas" value={totals.sales} icon={Target} />
        <MetricCard
          title="Taxa de Conversao"
          value={totals.conversion}
          icon={TrendingUp}
          isPercentage
        />
      </div>

      {/* Cancellation Metrics */}
      <div className="space-y-3">
        <p className="section-label px-1">Cancelamentos</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            title="N de Cancelamentos"
            value={totals.cancellations}
            icon={XCircle}
            variant="destructive"
            compact
          />
          <MetricCard
            title="% de Cancelamento"
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

      {/* Closers */}
      {closers.length > 0 ? (
        <div className="space-y-3">
          <p className="section-label px-1">Closers</p>
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
        <div className="text-center py-10 bg-card rounded-2xl border border-border/30">
          <p className="text-muted-foreground">Nenhum closer encontrado neste squad.</p>
          <p className="text-muted-foreground/70 text-sm mt-2">
            Adicione metricas para visualizar os dados dos closers.
          </p>
        </div>
      )}
    </div>
  );
}
