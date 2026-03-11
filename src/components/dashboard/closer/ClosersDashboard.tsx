import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { UserCheck, Plus, Filter } from 'lucide-react';
import { MonthSelector, getMonthPeriod } from '@/components/dashboard/MonthSelector';
import { WeekSelector } from '@/components/dashboard/WeekSelector';
import { CloserCard } from './CloserCard';
import { CloserDetailPage } from './CloserDetailPage';
import { CloserFunnelKanban } from './CloserFunnelKanban';
import { SquadMetricsDialog } from '@/components/dashboard/SquadMetricsDialog';
import { useSquadMetrics, useMetrics } from '@/controllers/useCloserController';
import { useFunnels } from '@/controllers/useFunnelController';
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ClosersDashboard() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [isMetricsDialogOpen, setIsMetricsDialogOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);

  useRealtimeMetrics();

  const selectedCloserId = searchParams.get('closer');
  const { periodStart, periodEnd } = useMemo(() => getMonthPeriod(selectedMonth), [selectedMonth]);
  const { squadMetrics, isLoading } = useSquadMetrics(periodStart, periodEnd);
  const { data: rawMetrics } = useMetrics(periodStart, periodEnd);
  const { data: allFunnels } = useFunnels();

  const availableFunnels = allFunnels || [];

  const handleMonthChange = useCallback((month: Date) => {
    setSelectedMonth(month);
    setSelectedWeek(null);
  }, []);

  const handleCloserClick = useCallback((closerId: string) => {
    setSearchParams({ module: 'closers', closer: closerId });
  }, [setSearchParams]);

  const handleBackToDashboard = useCallback(() => {
    setSearchParams({ module: 'closers' });
  }, [setSearchParams]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['metrics'] });
    await queryClient.invalidateQueries({ queryKey: ['squads'] });
  }, [queryClient]);

  // If a specific closer is selected, render the detail page
  if (selectedCloserId) {
    let closerSquadSlug = 'eagles';
    for (const sm of squadMetrics) {
      if (sm.closers.some(c => c.closer.id === selectedCloserId)) {
        closerSquadSlug = sm.squad.slug;
        break;
      }
    }

    return (
      <CloserDetailPage
        closerId={selectedCloserId}
        squadSlug={closerSquadSlug}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        onBack={handleBackToDashboard}
      />
    );
  }

  // Aggregate all closers from all squads
  const allClosers = squadMetrics.flatMap(sm =>
    sm.closers.map(({ closer, metrics }) => ({
      ...closer,
      squadName: sm.squad.name,
      metrics,
    }))
  );

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/8">
              <UserCheck size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard Closers</h1>
              <p className="text-sm text-muted-foreground">Metricas consolidadas de todos os closers</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setIsMetricsDialogOpen(true)} size="sm" variant="outline" className="rounded-xl h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Metrica
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
                <SelectTrigger className="w-[180px]">
                  <Filter size={16} className="mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Todos os Funis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Funis</SelectItem>
                  {availableFunnels.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Funnel Kanban */}
        {!isLoading && !selectedFunnel && rawMetrics && allClosers.length > 0 && (
          <CloserFunnelKanban
            closers={allClosers}
            metrics={rawMetrics}
          />
        )}

        {/* Closers List */}
        <div>
          <p className="section-label mb-4">Closers Individuais</p>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : allClosers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allClosers.map((closer) => (
                <CloserCard
                  key={closer.id}
                  closer={{
                    id: closer.id,
                    name: closer.name,
                    squad_id: closer.squad_id,
                    metrics: closer.metrics,
                  }}
                  onClick={() => handleCloserClick(closer.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-card rounded-2xl border border-border/30">
              <UserCheck size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum closer cadastrado
              </h3>
              <p className="text-muted-foreground text-center max-w-md">
                Adicione métricas usando o botão acima para visualizar os dados.
              </p>
            </div>
          )}
        </div>

        {/* Add Metric Dialog */}
        <SquadMetricsDialog
          open={isMetricsDialogOpen}
          onOpenChange={setIsMetricsDialogOpen}
          selectedMonth={selectedMonth}
        />
      </div>
    </PullToRefresh>
  );
}
