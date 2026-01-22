import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { format, startOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SDRMetric } from '@/hooks/useSdrMetrics';
import { cn } from '@/lib/utils';

interface SDRWeeklyComparisonChartProps {
  metrics: SDRMetric[];
}

interface WeeklyData {
  weekKey: string;
  weekLabel: string;
  activated: number;
  scheduled: number;
  attended: number;
  sales: number;
}

interface WeeklyComparison {
  current: WeeklyData | null;
  previous: WeeklyData | null;
  changes: {
    activated: number | null;
    scheduled: number | null;
    attended: number | null;
    sales: number | null;
  };
}

function groupMetricsByWeek(metrics: SDRMetric[]): WeeklyData[] {
  const weeklyMap = new Map<string, WeeklyData>();

  for (const m of metrics) {
    const date = parseISO(m.date);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const weekLabel = format(weekStart, "'Sem' dd/MM", { locale: ptBR });

    const existing = weeklyMap.get(weekKey);
    if (existing) {
      existing.activated += m.activated || 0;
      existing.scheduled += m.scheduled || 0;
      existing.attended += m.attended || 0;
      existing.sales += m.sales || 0;
    } else {
      weeklyMap.set(weekKey, {
        weekKey,
        weekLabel,
        activated: m.activated || 0,
        scheduled: m.scheduled || 0,
        attended: m.attended || 0,
        sales: m.sales || 0,
      });
    }
  }

  return Array.from(weeklyMap.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

function calculateChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function ChangeIndicator({ value, label }: { value: number | null; label: string }) {
  if (value === null) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span className="text-xs">{label}: --</span>
      </div>
    );
  }

  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        isPositive && "text-green-500",
        isNeutral && "text-muted-foreground",
        !isPositive && !isNeutral && "text-red-500"
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="text-xs">
        {label}: {isPositive ? '+' : ''}{value.toFixed(0)}%
      </span>
    </div>
  );
}

export function SDRWeeklyComparisonChart({ metrics }: SDRWeeklyComparisonChartProps) {
  const weeklyData = useMemo(() => groupMetricsByWeek(metrics), [metrics]);

  const comparison: WeeklyComparison = useMemo(() => {
    if (weeklyData.length < 2) {
      return {
        current: weeklyData[weeklyData.length - 1] || null,
        previous: null,
        changes: { activated: null, scheduled: null, attended: null, sales: null },
      };
    }

    const current = weeklyData[weeklyData.length - 1];
    const previous = weeklyData[weeklyData.length - 2];

    return {
      current,
      previous,
      changes: {
        activated: calculateChange(current.activated, previous.activated),
        scheduled: calculateChange(current.scheduled, previous.scheduled),
        attended: calculateChange(current.attended, previous.attended),
        sales: calculateChange(current.sales, previous.sales),
      },
    };
  }, [weeklyData]);

  if (weeklyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] bg-card rounded-xl border border-border">
        <p className="text-muted-foreground">Nenhum dado disponível para o período</p>
      </div>
    );
  }

  const chartColors = {
    activated: 'hsl(var(--chart-1))',
    scheduled: 'hsl(var(--chart-2))',
    attended: 'hsl(var(--chart-3))',
    sales: 'hsl(var(--chart-4))',
  };

  return (
    <div className="p-4 bg-card rounded-xl border border-border space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Comparativo Semanal</h3>
        
        {/* Week-over-week comparison indicators */}
        {comparison.previous && (
          <div className="flex flex-wrap gap-3 text-xs">
            <ChangeIndicator value={comparison.changes.activated} label="Ativados" />
            <ChangeIndicator value={comparison.changes.scheduled} label="Agendados" />
            <ChangeIndicator value={comparison.changes.attended} label="Realizados" />
            <ChangeIndicator value={comparison.changes.sales} label="Vendas" />
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={weeklyData} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="weekLabel"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ paddingTop: '16px' }}
          />
          <Bar
            dataKey="activated"
            name="Ativados"
            fill={chartColors.activated}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="scheduled"
            name="Agendados"
            fill={chartColors.scheduled}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="attended"
            name="Realizados"
            fill={chartColors.attended}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="sales"
            name="Vendas"
            fill={chartColors.sales}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
