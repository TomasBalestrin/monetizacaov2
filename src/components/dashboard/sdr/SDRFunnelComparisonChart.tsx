import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Layers } from 'lucide-react';
import type { SDRMetric } from '@/controllers/useSdrController';

interface SDRFunnelComparisonChartProps {
  metrics: SDRMetric[];
  sdrType?: 'sdr' | 'social_selling' | 'funil_intensivo';
}

interface FunnelData {
  funnel: string;
  activated: number;
  scheduled: number;
  attended: number;
  sales: number;
  fi_called: number;
  fi_received_link: number;
  fi_got_ticket: number;
  fi_attended: number;
}

const COLORS: Record<string, string> = {
  activated: '#6366f1',
  scheduled: '#06b6d4',
  attended: '#f59e0b',
  sales: '#10b981',
};

const FI_COLORS: Record<string, string> = {
  fi_called: '#3b82f6',
  fi_received_link: '#8b5cf6',
  fi_got_ticket: '#6366f1',
  fi_attended: '#10b981',
};

const LABELS: Record<string, string> = {
  activated: 'Ativados',
  scheduled: 'Agendados',
  attended: 'Realizados',
  sales: 'Vendas',
  fi_called: 'Chamou',
  fi_received_link: 'Rec. Link',
  fi_got_ticket: 'Ret. Ingresso',
  fi_attended: 'Compareceram',
};

function groupMetricsByFunnel(metrics: SDRMetric[]): FunnelData[] {
  const funnelMap = new Map<string, FunnelData>();

  for (const m of metrics) {
    const funnel = m.funnel || 'Sem funil';
    const existing = funnelMap.get(funnel);
    if (existing) {
      existing.activated += m.activated || 0;
      existing.scheduled += m.scheduled || 0;
      existing.attended += m.attended || 0;
      existing.sales += m.sales || 0;
      existing.fi_called += m.fi_called || 0;
      existing.fi_received_link += m.fi_received_link || 0;
      existing.fi_got_ticket += m.fi_got_ticket || 0;
      existing.fi_attended += m.fi_attended || 0;
    } else {
      funnelMap.set(funnel, {
        funnel,
        activated: m.activated || 0,
        scheduled: m.scheduled || 0,
        attended: m.attended || 0,
        sales: m.sales || 0,
        fi_called: m.fi_called || 0,
        fi_received_link: m.fi_received_link || 0,
        fi_got_ticket: m.fi_got_ticket || 0,
        fi_attended: m.fi_attended || 0,
      });
    }
  }

  return Array.from(funnelMap.values()).sort((a, b) =>
    (b.sales + b.fi_attended) - (a.sales + a.fi_attended) || (b.activated + b.fi_called) - (a.activated + a.fi_called)
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2.5 shadow-lg">
      <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="text-[11px] text-muted-foreground">{LABELS[entry.dataKey] || entry.dataKey}</span>
          </div>
          <span className="text-[11px] font-semibold text-foreground tabular-nums">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SDRFunnelComparisonChart({ metrics, sdrType = 'sdr' }: SDRFunnelComparisonChartProps) {
  const isFI = sdrType === 'funil_intensivo';
  const metricKeys = isFI
    ? ['fi_called', 'fi_received_link', 'fi_got_ticket', 'fi_attended'] as const
    : ['activated', 'scheduled', 'attended', 'sales'] as const;
  const colors = isFI ? FI_COLORS : COLORS;

  const funnelData = useMemo(() => groupMetricsByFunnel(metrics), [metrics]);

  const funnelsWithData = funnelData.filter(f => f.funnel !== 'Sem funil');
  if (funnelsWithData.length === 0) return null;

  const displayData = funnelsWithData.length > 0 ? funnelsWithData : funnelData;

  return (
    <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            {isFI ? 'Comparativo por Evento' : 'Comparativo por Funil'}
          </h3>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 pb-3">
        {metricKeys.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[key] }} />
            <span className="text-[11px] text-muted-foreground">{LABELS[key]}</span>
          </div>
        ))}
      </div>

      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={displayData} barCategoryGap="20%" barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
            <XAxis
              dataKey="funnel"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
            {metricKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[key]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
