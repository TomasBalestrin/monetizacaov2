import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import type { SDRMetric } from '@/controllers/useSdrController';
import { cn, parseDateString } from '@/lib/utils';

interface SDRWeeklyComparisonChartProps {
  metrics: SDRMetric[];
  activeWeekKey?: string | null;
  sdrType?: 'sdr' | 'social_selling' | 'funil_intensivo';
}

interface WeeklyData {
  weekKey: string;
  weekLabel: string;
  activated: number;
  scheduled: number;
  attended: number;
  sales: number;
  // FI fields
  fi_called: number;
  fi_received_link: number;
  fi_got_ticket: number;
  fi_attended: number;
}

interface WeeklyComparison {
  current: WeeklyData | null;
  previous: WeeklyData | null;
  changes: Record<string, number | null>;
}

const COLORS: Record<string, string> = {
  activated: '#6366f1',  // indigo
  scheduled: '#06b6d4',  // cyan
  attended: '#f59e0b',   // amber
  sales: '#10b981',      // emerald
};

const FI_COLORS: Record<string, string> = {
  fi_called: '#3b82f6',      // blue
  fi_received_link: '#8b5cf6', // violet
  fi_got_ticket: '#6366f1',    // indigo
  fi_attended: '#10b981',      // emerald
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

function groupMetricsByWeek(metrics: SDRMetric[]): WeeklyData[] {
  const weeklyMap = new Map<string, WeeklyData>();

  for (const m of metrics) {
    const date = parseDateString(m.date);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const weekLabel = format(weekStart, "'Sem' dd/MM", { locale: ptBR });

    const existing = weeklyMap.get(weekKey);
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
      weeklyMap.set(weekKey, {
        weekKey,
        weekLabel,
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

  return Array.from(weeklyMap.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

function calculateChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function ChangeIndicator({ value, label, color }: { value: number | null; label: string; color: string }) {
  if (value === null) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <Minus className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }

  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <Icon
        className={cn(
          'h-3 w-3',
          isPositive && 'text-emerald-500',
          isNeutral && 'text-muted-foreground',
          !isPositive && !isNeutral && 'text-red-500'
        )}
      />
      <span className={cn(
        'text-[11px] font-semibold',
        isPositive && 'text-emerald-500',
        isNeutral && 'text-muted-foreground',
        !isPositive && !isNeutral && 'text-red-500'
      )}>
        {isPositive ? '+' : ''}{value.toFixed(0)}%
      </span>
    </div>
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

export function SDRWeeklyComparisonChart({ metrics, activeWeekKey, sdrType = 'sdr' }: SDRWeeklyComparisonChartProps) {
  const isFI = sdrType === 'funil_intensivo';
  const metricKeys = isFI
    ? ['fi_called', 'fi_received_link', 'fi_got_ticket', 'fi_attended'] as const
    : ['activated', 'scheduled', 'attended', 'sales'] as const;
  const colors = isFI ? FI_COLORS : COLORS;

  const weeklyData = useMemo(() => groupMetricsByWeek(metrics), [metrics]);

  const comparison: WeeklyComparison = useMemo(() => {
    const buildChanges = (current: WeeklyData, previous: WeeklyData | null): Record<string, number | null> => {
      const changes: Record<string, number | null> = {};
      for (const key of metricKeys) {
        changes[key] = previous ? calculateChange(current[key], previous[key]) : null;
      }
      return changes;
    };

    if (activeWeekKey) {
      const activeIndex = weeklyData.findIndex(w => w.weekKey === activeWeekKey);
      if (activeIndex >= 0) {
        const current = weeklyData[activeIndex];
        const previous = activeIndex > 0 ? weeklyData[activeIndex - 1] : null;
        return { current, previous, changes: buildChanges(current, previous) };
      }
    }

    if (weeklyData.length < 2) {
      const nullChanges: Record<string, number | null> = {};
      for (const key of metricKeys) nullChanges[key] = null;
      return { current: weeklyData[weeklyData.length - 1] || null, previous: null, changes: nullChanges };
    }

    const current = weeklyData[weeklyData.length - 1];
    const previous = weeklyData[weeklyData.length - 2];
    return { current, previous, changes: buildChanges(current, previous) };
  }, [weeklyData, activeWeekKey, metricKeys]);

  const chartData = useMemo(() => {
    if (!activeWeekKey) return weeklyData.map(w => ({ ...w, opacity: 1 }));
    return weeklyData.map(w => ({
      ...w,
      opacity: w.weekKey === activeWeekKey ? 1 : 0.3,
    }));
  }, [weeklyData, activeWeekKey]);

  if (weeklyData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] bg-card rounded-2xl border border-border/40 gap-3">
        <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhum dado disponivel para o periodo</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
      <div className="px-5 pt-5 pb-3 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Comparativo Semanal</h3>
        </div>

        {comparison.previous && (
          <div className="flex flex-wrap gap-1.5">
            {metricKeys.map(key => (
              <ChangeIndicator key={key} value={comparison.changes[key]} label={LABELS[key]} color={colors[key]} />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 pb-3">
        {metricKeys.map(key => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[key] }} />
            <span className="text-[11px] text-muted-foreground">{LABELS[key]}</span>
          </div>
        ))}
      </div>

      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barCategoryGap="20%" barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
            <XAxis
              dataKey="weekLabel"
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
              >
                {activeWeekKey && chartData.map((entry, index) => (
                  <Cell key={`cell-${key}-${index}`} fillOpacity={entry.opacity} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
