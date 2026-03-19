import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { UserCheck, Plus, Filter, Package } from 'lucide-react';
import { MonthSelector, getMonthPeriod } from '@/components/dashboard/MonthSelector';
import { WeekSelector, getWeeksOfMonth } from '@/components/dashboard/WeekSelector';
import { CloserCard } from './CloserCard';
import { CloserDetailPage } from './CloserDetailPage';
import { CloserFunnelKanban } from './CloserFunnelKanban';
import { SquadMetricsDialog } from '@/components/dashboard/SquadMetricsDialog';
import { useSquadMetrics, useSquads, useMetrics } from '@/controllers/useCloserController';
import { useFunnels, useProducts } from '@/controllers/useFunnelController';
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { aggregateSquadMetrics } from '@/model/services/closerService';
import { parseDateString } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function ClosersDashboard() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, entityLinks } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [isMetricsDialogOpen, setIsMetricsDialogOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  useRealtimeMetrics();

  const selectedCloserId = searchParams.get('closer');

  // Guard: closers (role "user") só podem ver seus próprios closers
  const linkedCloserIds = useMemo(() => {
    if (role !== 'user') return null;
    return entityLinks.filter(l => l.entity_type === 'closer').map(l => l.entity_id);
  }, [role, entityLinks]);

  // Guard: redirecionar para perfil próprio (sem visão geral) ou bloquear acesso a outro closer
  const needsRedirect = linkedCloserIds && (!selectedCloserId || !linkedCloserIds.includes(selectedCloserId));
  useEffect(() => {
    if (needsRedirect && linkedCloserIds) {
      const firstLinked = linkedCloserIds[0];
      if (firstLinked) {
        setSearchParams(prev => { prev.set('closer', firstLinked); return prev; });
      }
    }
  }, [needsRedirect, linkedCloserIds, setSearchParams]);
  const { periodStart, periodEnd } = useMemo(() => getMonthPeriod(selectedMonth), [selectedMonth]);
  const { squadMetrics, isLoading } = useSquadMetrics(periodStart, periodEnd);
  const { data: rawMetrics } = useMetrics(periodStart, periodEnd);
  const { data: allFunnels } = useFunnels();
  const { data: allProducts } = useProducts();

  const { data: squads } = useSquads();
  const availableFunnels = allFunnels || [];
  const availableProducts = allProducts || [];

  // Week filter
  const weekFilter = useMemo(() => {
    if (!selectedWeek) return null;
    const weeks = getWeeksOfMonth(selectedMonth);
    return weeks.find(w => w.weekKey === selectedWeek) || null;
  }, [selectedWeek, selectedMonth]);

  // Filter raw metrics by week and funnel, then re-aggregate
  const filteredSquadMetrics = useMemo(() => {
    if (!weekFilter && !selectedFunnel && !selectedProduct) return squadMetrics;
    if (!rawMetrics || !squads) return squadMetrics;

    let filtered = rawMetrics;

    if (weekFilter) {
      const weekStart = weekFilter.startDate;
      const weekEnd = weekFilter.endDate;
      filtered = filtered.filter(m => {
        const date = parseDateString(m.period_start);
        return date >= weekStart && date <= weekEnd;
      });
    }

    if (selectedFunnel) {
      filtered = filtered.filter(m => m.funnel_id === selectedFunnel);
    }

    if (selectedProduct) {
      filtered = filtered.filter(m => m.product_id === selectedProduct);
    }

    const referenceDate = periodStart ? parseDateString(periodStart) : new Date();
    return aggregateSquadMetrics(squads, filtered, referenceDate);
  }, [weekFilter, selectedFunnel, selectedProduct, squadMetrics, rawMetrics, squads, periodStart]);

  const handleMonthChange = useCallback((month: Date) => {
    setSelectedMonth(month);
    setSelectedWeek(null);
    setSelectedProduct(null);
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

  // Wait for redirect to complete
  if (needsRedirect) return null;

  // If a specific closer is selected, render the detail page
  if (selectedCloserId) {
    let closerSquadSlug = 'eagles';
    for (const sm of filteredSquadMetrics) {
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
  const allClosers = filteredSquadMetrics.flatMap(sm =>
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
            {availableProducts.length > 0 && (
              <Select
                value={selectedProduct || 'all'}
                onValueChange={(v) => setSelectedProduct(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-[180px]">
                  <Package size={16} className="mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Todos os Produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Produtos</SelectItem>
                  {availableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Funnel Kanban */}
        {!isLoading && !selectedFunnel && !selectedProduct && rawMetrics && allClosers.length > 0 && (
          <CloserFunnelKanban
            closers={allClosers}
            metrics={weekFilter ? rawMetrics.filter(m => {
              const date = parseDateString(m.period_start);
              return date >= weekFilter.startDate && date <= weekFilter.endDate;
            }) : rawMetrics}
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
