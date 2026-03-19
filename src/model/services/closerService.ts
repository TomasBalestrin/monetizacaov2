import type { Squad, Closer, Metric, CloserMetricTotals, SquadMetrics } from '@/model/entities/closer';
import { calculateTrend, calculateTrendDetailed } from './trendService';

interface RawCloserTotals {
  calls: number;
  sales: number;
  revenue: number;
  entries: number;
  cancellations: number;
  cancellationValue: number;
  cancellationEntries: number;
}

/**
 * Agrega métricas brutas de um closer em totais
 */
function aggregateCloserRawTotals(metrics: Metric[]): RawCloserTotals {
  return metrics.reduce(
    (acc, m) => ({
      calls: acc.calls + m.calls,
      sales: acc.sales + m.sales,
      revenue: acc.revenue + Number(m.revenue),
      entries: acc.entries + Number(m.entries),
      cancellations: acc.cancellations + (m.cancellations || 0),
      cancellationValue: acc.cancellationValue + Number(m.cancellation_value || 0),
      cancellationEntries: acc.cancellationEntries + Number(m.cancellation_entries || 0),
    }),
    { calls: 0, sales: 0, revenue: 0, entries: 0, cancellations: 0, cancellationValue: 0, cancellationEntries: 0 }
  );
}

/**
 * Calcula as métricas finais de um closer (com net values e trends)
 */
function calculateCloserMetrics(rawTotals: RawCloserTotals, referenceDate: Date): CloserMetricTotals {
  // Valores brutos (cancelamentos são exibidos separadamente)
  const revenueTrend = calculateTrend(rawTotals.revenue, referenceDate);
  const entriesTrend = calculateTrend(rawTotals.entries, referenceDate);
  const cancellationRate = rawTotals.sales > 0 ? (rawTotals.cancellations / rawTotals.sales) * 100 : 0;

  return {
    calls: rawTotals.calls,
    sales: rawTotals.sales,
    revenue: rawTotals.revenue,
    entries: rawTotals.entries,
    revenueTrend,
    entriesTrend,
    conversion: rawTotals.calls > 0 ? (rawTotals.sales / rawTotals.calls) * 100 : 0,
    cancellations: rawTotals.cancellations,
    cancellationValue: rawTotals.cancellationValue,
    cancellationEntries: rawTotals.cancellationEntries,
    cancellationRate,
  };
}

/**
 * Agrupa métricas por squad e calcula totais por closer e por squad
 */
export function aggregateSquadMetrics(
  squads: Squad[],
  metrics: Metric[],
  referenceDate: Date
): SquadMetrics[] {
  return squads.map(squad => {
    const squadCloserMetrics = metrics.filter(m => m.closer?.squad_id === squad.id);

    // Agrupa por closer
    const closerMap = new Map<string, { closer: Closer; metrics: Metric[] }>();
    squadCloserMetrics.forEach(m => {
      if (!m.closer) return;
      const existing = closerMap.get(m.closer.id);
      if (existing) {
        existing.metrics.push(m);
      } else {
        closerMap.set(m.closer.id, { closer: m.closer, metrics: [m] });
      }
    });

    const closers = Array.from(closerMap.values()).map(({ closer, metrics: closerMetrics }) => {
      const rawTotals = aggregateCloserRawTotals(closerMetrics);
      return {
        closer,
        metrics: calculateCloserMetrics(rawTotals, referenceDate),
      };
    });

    const totals = closers.reduce(
      (acc, c) => ({
        calls: acc.calls + c.metrics.calls,
        sales: acc.sales + c.metrics.sales,
        revenue: acc.revenue + c.metrics.revenue,
        entries: acc.entries + c.metrics.entries,
        cancellations: acc.cancellations + c.metrics.cancellations,
        cancellationValue: acc.cancellationValue + c.metrics.cancellationValue,
        cancellationEntries: acc.cancellationEntries + c.metrics.cancellationEntries,
      }),
      { calls: 0, sales: 0, revenue: 0, entries: 0, cancellations: 0, cancellationValue: 0, cancellationEntries: 0 }
    );

    const squadRevenueTrend = calculateTrend(totals.revenue, referenceDate);
    const squadEntriesTrend = calculateTrend(totals.entries, referenceDate);
    // sales já é bruto, não precisa somar cancellations
    const squadCancellationRate = totals.sales > 0 ? (totals.cancellations / totals.sales) * 100 : 0;

    return {
      squad,
      closers,
      totals: {
        ...totals,
        revenueTrend: squadRevenueTrend,
        entriesTrend: squadEntriesTrend,
        conversion: totals.calls > 0 ? (totals.sales / totals.calls) * 100 : 0,
        cancellationRate: squadCancellationRate,
      },
    };
  });
}

/**
 * Calcula métricas totais somando todos os squads
 */
export function calculateTotalMetrics(
  squadMetrics: SquadMetrics[],
  referenceDate: Date
) {
  const totals = squadMetrics.reduce(
    (acc, sm) => ({
      calls: acc.calls + sm.totals.calls,
      sales: acc.sales + sm.totals.sales,
      revenue: acc.revenue + sm.totals.revenue,
      entries: acc.entries + sm.totals.entries,
      cancellations: acc.cancellations + sm.totals.cancellations,
      cancellationValue: acc.cancellationValue + sm.totals.cancellationValue,
      cancellationEntries: acc.cancellationEntries + sm.totals.cancellationEntries,
    }),
    { calls: 0, sales: 0, revenue: 0, entries: 0, cancellations: 0, cancellationValue: 0, cancellationEntries: 0 }
  );

  const revenueTrendResult = calculateTrendDetailed(totals.revenue, referenceDate);
  const entriesTrendResult = calculateTrendDetailed(totals.entries, referenceDate);

  // sales já é bruto, não precisa somar cancellations
  const cancellationRate = totals.sales > 0 ? (totals.cancellations / totals.sales) * 100 : 0;

  return {
    ...totals,
    revenueTrend: revenueTrendResult.projected,
    entriesTrend: entriesTrendResult.projected,
    conversion: totals.calls > 0 ? (totals.sales / totals.calls) * 100 : 0,
    cancellationRate,
    trendContext: {
      workedDays: revenueTrendResult.workedDays,
      totalDays: revenueTrendResult.totalDays,
    },
  };
}
