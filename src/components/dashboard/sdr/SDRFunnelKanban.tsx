import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Layers, Phone, Users } from 'lucide-react';
import type { SDR, SDRMetric } from '@/model/entities/sdr';

interface SDRFunnelKanbanProps {
  sdrs: SDR[];
  metrics: SDRMetric[];
}

interface FunnelSDRData {
  sdrId: string;
  sdrName: string;
  sdrType: 'sdr' | 'social_selling';
  activated: number;
  scheduled: number;
  scheduledRate: number;
  attended: number;
  attendanceRate: number;
  sales: number;
  conversionRate: number;
}

interface FunnelColumn {
  funnel: string;
  totalActivated: number;
  totalScheduled: number;
  totalAttended: number;
  totalSales: number;
  sdrs: FunnelSDRData[];
}

function getConversionTextColor(rate: number) {
  if (rate >= 30) return 'text-success';
  if (rate >= 15) return 'text-warning';
  return 'text-destructive';
}

export function SDRFunnelKanban({ sdrs, metrics }: SDRFunnelKanbanProps) {
  const columns = useMemo(() => {
    const funnelMap = new Map<string, Map<string, SDRMetric[]>>();

    for (const m of metrics) {
      const funnel = m.funnel || '';
      if (!funnel) continue;

      if (!funnelMap.has(funnel)) {
        funnelMap.set(funnel, new Map());
      }
      const sdrMap = funnelMap.get(funnel)!;
      if (!sdrMap.has(m.sdr_id)) {
        sdrMap.set(m.sdr_id, []);
      }
      sdrMap.get(m.sdr_id)!.push(m);
    }

    const sdrLookup = new Map(sdrs.map(s => [s.id, s]));
    const result: FunnelColumn[] = [];

    for (const [funnel, sdrMap] of funnelMap) {
      const sdrDataList: FunnelSDRData[] = [];
      let totalActivated = 0;
      let totalScheduled = 0;
      let totalAttended = 0;
      let totalSales = 0;

      for (const [sdrId, sdrMetrics] of sdrMap) {
        const sdr = sdrLookup.get(sdrId);
        if (!sdr) continue;

        const activated = sdrMetrics.reduce((s, m) => s + (m.activated || 0), 0);
        const scheduled = sdrMetrics.reduce((s, m) => s + (m.scheduled || 0), 0);
        const scheduledSameDay = sdrMetrics.reduce((s, m) => s + (m.scheduled_same_day || 0), 0);
        const attended = sdrMetrics.reduce((s, m) => s + (m.attended || 0), 0);
        const sales = sdrMetrics.reduce((s, m) => s + (m.sales || 0), 0);

        totalActivated += activated;
        totalScheduled += scheduled;
        totalAttended += attended;
        totalSales += sales;

        sdrDataList.push({
          sdrId,
          sdrName: sdr.name,
          sdrType: sdr.type,
          activated,
          scheduled,
          scheduledRate: activated > 0 ? (scheduled / activated) * 100 : 0,
          attended,
          attendanceRate: scheduledSameDay > 0 ? (attended / scheduledSameDay) * 100 : 0,
          sales,
          conversionRate: attended > 0 ? (sales / attended) * 100 : 0,
        });
      }

      sdrDataList.sort((a, b) => b.sales - a.sales || b.activated - a.activated);

      result.push({
        funnel,
        totalActivated,
        totalScheduled,
        totalAttended,
        totalSales,
        sdrs: sdrDataList,
      });
    }

    result.sort((a, b) => b.totalSales - a.totalSales || b.totalActivated - a.totalActivated);
    return result;
  }, [sdrs, metrics]);

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
            key={col.funnel}
            className="rounded-2xl border border-border/40 bg-card overflow-hidden"
          >
            {/* Funnel header */}
            <div className="px-4 py-3 bg-muted/30 border-b border-border/30 flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground">{col.funnel}</h4>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  {col.totalActivated} ativ
                </span>
                <span className="text-muted-foreground">
                  {col.totalScheduled} agend
                </span>
                <span className="text-muted-foreground">
                  {col.totalAttended} realiz
                </span>
                <span className="font-bold text-success">
                  {col.totalSales} vendas
                </span>
              </div>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_60px_70px_60px_55px_55px] px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/20">
              <span>Nome</span>
              <span className="text-right">Ativ.</span>
              <span className="text-right">Agend.</span>
              <span className="text-right">Realiz.</span>
              <span className="text-right">Vendas</span>
              <span className="text-right">Conv.</span>
            </div>

            {/* SDR rows */}
            {col.sdrs.map((sdr, idx) => {
              const Icon = sdr.sdrType === 'sdr' ? Phone : Users;
              return (
                <div
                  key={sdr.sdrId}
                  className={cn(
                    'grid grid-cols-[1fr_60px_70px_60px_55px_55px] px-4 py-2.5 items-center',
                    idx < col.sdrs.length - 1 && 'border-b border-border/10'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={13} className="text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{sdr.sdrName}</span>
                  </div>
                  <span className="text-sm text-right text-foreground tabular-nums">{sdr.activated}</span>
                  <div className="text-right">
                    <span className="text-sm text-foreground tabular-nums">{sdr.scheduled}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">({sdr.scheduledRate.toFixed(0)}%)</span>
                  </div>
                  <span className="text-sm text-right text-foreground tabular-nums">{sdr.attended}</span>
                  <span className="text-sm text-right font-bold text-success tabular-nums">{sdr.sales}</span>
                  <span className={cn('text-sm text-right font-semibold tabular-nums', getConversionTextColor(sdr.conversionRate))}>
                    {sdr.conversionRate.toFixed(0)}%
                  </span>
                </div>
              );
            })}

            {col.sdrs.length === 0 && (
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
