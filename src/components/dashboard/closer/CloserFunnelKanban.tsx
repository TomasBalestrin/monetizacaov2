import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Layers, UserCheck } from 'lucide-react';
import type { Metric } from '@/model/entities/closer';

interface CloserWithSquad {
  id: string;
  name: string;
  squad_id: string;
  squadName: string;
}

interface CloserFunnelKanbanProps {
  closers: CloserWithSquad[];
  metrics: Metric[];
}

interface FunnelCloserData {
  closerId: string;
  closerName: string;
  calls: number;
  sales: number;
  revenue: number;
  entries: number;
  conversion: number;
}

interface FunnelColumn {
  funnelId: string;
  funnelName: string;
  totalCalls: number;
  totalSales: number;
  totalRevenue: number;
  totalEntries: number;
  closers: FunnelCloserData[];
}

function getConversionTextColor(rate: number) {
  if (rate >= 30) return 'text-success';
  if (rate >= 15) return 'text-warning';
  return 'text-destructive';
}

function formatCurrency(value: number) {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

export function CloserFunnelKanban({ closers, metrics }: CloserFunnelKanbanProps) {
  const columns = useMemo(() => {
    const funnelMap = new Map<string, Map<string, Metric[]>>();

    for (const m of metrics) {
      if (!m.funnel_id || !m.funnel?.name) continue;

      const funnelKey = m.funnel_id;
      if (!funnelMap.has(funnelKey)) {
        funnelMap.set(funnelKey, new Map());
      }
      const closerMap = funnelMap.get(funnelKey)!;
      if (!closerMap.has(m.closer_id)) {
        closerMap.set(m.closer_id, []);
      }
      closerMap.get(m.closer_id)!.push(m);
    }

    const closerLookup = new Map(closers.map(c => [c.id, c]));
    const funnelNames = new Map<string, string>();
    for (const m of metrics) {
      if (m.funnel_id && m.funnel?.name && !funnelNames.has(m.funnel_id)) {
        funnelNames.set(m.funnel_id, m.funnel.name);
      }
    }

    const result: FunnelColumn[] = [];

    for (const [funnelId, closerMap] of funnelMap) {
      const closerDataList: FunnelCloserData[] = [];
      let totalCalls = 0;
      let totalSales = 0;
      let totalRevenue = 0;
      let totalEntries = 0;

      for (const [closerId, closerMetrics] of closerMap) {
        const closer = closerLookup.get(closerId);
        if (!closer) continue;

        const calls = closerMetrics.reduce((s, m) => s + (m.calls || 0), 0);
        const sales = closerMetrics.reduce((s, m) => s + (m.sales || 0), 0);
        const revenue = closerMetrics.reduce((s, m) => s + Number(m.revenue || 0), 0);
        const entries = closerMetrics.reduce((s, m) => s + Number(m.entries || 0), 0);

        totalCalls += calls;
        totalSales += sales;
        totalRevenue += revenue;
        totalEntries += entries;

        closerDataList.push({
          closerId,
          closerName: closer.name,
          calls,
          sales,
          revenue,
          entries,
          conversion: calls > 0 ? (sales / calls) * 100 : 0,
        });
      }

      closerDataList.sort((a, b) => b.sales - a.sales || b.revenue - a.revenue);

      result.push({
        funnelId,
        funnelName: funnelNames.get(funnelId) || 'Sem nome',
        totalCalls,
        totalSales,
        totalRevenue,
        totalEntries,
        closers: closerDataList,
      });
    }

    result.sort((a, b) => b.totalSales - a.totalSales || b.totalRevenue - a.totalRevenue);
    return result;
  }, [closers, metrics]);

  if (columns.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Layers className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Desempenho por Funil</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {columns.map((col) => (
          <div
            key={col.funnelId}
            className="rounded-2xl border border-border/40 bg-card overflow-hidden"
          >
            {/* Funnel header */}
            <div className="px-4 py-3 bg-muted/30 border-b border-border/30 flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground">{col.funnelName}</h4>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  {col.totalCalls} calls
                </span>
                <span className="font-bold text-success">
                  {col.totalSales} vendas
                </span>
                <span className="text-muted-foreground">
                  {formatCurrency(col.totalRevenue)}
                </span>
              </div>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_55px_55px_70px_70px_50px] px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/20">
              <span>Nome</span>
              <span className="text-right">Calls</span>
              <span className="text-right">Vendas</span>
              <span className="text-right">Fatur.</span>
              <span className="text-right">Entradas</span>
              <span className="text-right">Conv.</span>
            </div>

            {/* Closer rows */}
            {col.closers.map((closer, idx) => (
              <div
                key={closer.closerId}
                className={cn(
                  'grid grid-cols-[1fr_55px_55px_70px_70px_50px] px-4 py-2.5 items-center',
                  idx < col.closers.length - 1 && 'border-b border-border/10'
                )}
              >
                <div className="flex items-center gap-2">
                  <UserCheck size={13} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{closer.closerName}</span>
                </div>
                <span className="text-sm text-right text-foreground tabular-nums">{closer.calls}</span>
                <span className="text-sm text-right font-bold text-success tabular-nums">{closer.sales}</span>
                <span className="text-sm text-right text-foreground tabular-nums">{formatCurrency(closer.revenue)}</span>
                <span className="text-sm text-right text-foreground tabular-nums">{formatCurrency(closer.entries)}</span>
                <span className={cn('text-sm text-right font-semibold tabular-nums', getConversionTextColor(closer.conversion))}>
                  {closer.conversion.toFixed(0)}%
                </span>
              </div>
            ))}

            {col.closers.length === 0 && (
              <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                Nenhum dado neste funil
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
