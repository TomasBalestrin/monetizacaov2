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
  LabelList,
  Cell,
} from 'recharts';
import { format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import type { CloserMetricRecord } from '@/controllers/useCloserController';
import { cn, parseDateString } from '@/lib/utils';

interface CloserWeeklyComparisonChartProps {
  metrics: CloserMetricRecord[];
  activeWeekKey?: string | null;
}

interface WeeklyData {
  weekKey: string;
  weekLabel: string;
  calls: number;
  sales: number;
  revenue: number;
  entries: number;
}

interface WeeklyComparison {
  current: WeeklyData | null;
  previous: WeeklyData | null;
  changes: {
    calls: number | null;
    sales: number | null;
    revenue: number | null;
    entries: number | null;
  };
}

function groupMetricsByWeek(metrics: CloserMetricRecord[]): WeeklyData[] {
  const weeklyMap = new Map<string, WeeklyData>();

  for (const m of metrics) {
    const date = parseDateString(m.period_start);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const weekLabel = format(weekStart, "'Sem' dd/MM", { locale: ptBR });

    const existing = weeklyMap.get(weekKey);
    if (existing) {
      existing.calls += m.calls || 0;
      existing.sales += m.sales || 0;
      existing.revenue += m.revenue || 0;
      existing.entries += m.entries || 0;
    } else {
      weeklyMap.set(weekKey, {
        weekKey,
        weekLabel,
        calls: m.calls || 0,
        sales: m.sales || 0,
        revenue: m.revenue || 0,
        entries: m.entries || 0,
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
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50">
        <Minus className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">--</span>
      </div>
    );
  }

  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all",
        isPositive && "bg-green-500/10",
        isNeutral && "bg-muted/50",
        !isPositive && !isNeutral && "bg-red-500/10"
      )}
    >
      <div 
        className="w-2 h-2 rounded-full" 
        style={{ backgroundColor: color }}
      />
      <span className="text-xs font-medium text-foreground">{label}</span>
      <Icon 
        className={cn(
          "h-3.5 w-3.5",
          isPositive && "text-green-500",
          isNeutral && "text-muted-foreground",
          !isPositive && !isNeutral && "text-red-500"
        )} 
      />
      <span className={cn(
        "text-xs font-bold",
        isPositive && "text-green-500",
        isNeutral && "text-muted-foreground",
        !isPositive && !isNeutral && "text-red-500"
      )}>
        {isPositive ? '+' : ''}{value.toFixed(0)}%
      </span>
    </div>
  );
}

// Custom label renderer for bar values
const renderCustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  
  return (
    <text 
      x={x + width / 2} 
      y={y - 6} 
      fill="hsl(var(--foreground))" 
      textAnchor="middle" 
      fontSize={10}
      fontWeight={600}
    >
      {value}
    </text>
  );
};

// Custom label renderer for currency values
const renderCurrencyLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  
  const formatted = (value / 1000).toFixed(0) + 'k';
  
  return (
    <text 
      x={x + width / 2} 
      y={y - 6} 
      fill="hsl(var(--foreground))" 
      textAnchor="middle" 
      fontSize={10}
      fontWeight={600}
    >
      {formatted}
    </text>
  );
};

export function CloserWeeklyComparisonChart({ metrics, activeWeekKey }: CloserWeeklyComparisonChartProps) {
  const weeklyData = useMemo(() => groupMetricsByWeek(metrics), [metrics]);

  const chartData = useMemo(() => {
    if (!activeWeekKey) return weeklyData.map(w => ({ ...w, opacity: 1 }));
    return weeklyData.map(w => ({
      ...w,
      opacity: w.weekKey === activeWeekKey ? 1 : 0.35,
    }));
  }, [weeklyData, activeWeekKey]);

  const comparison: WeeklyComparison = useMemo(() => {
    if (weeklyData.length < 2) {
      return {
        current: weeklyData[weeklyData.length - 1] || null,
        previous: null,
        changes: { calls: null, sales: null, revenue: null, entries: null },
      };
    }

    let currentIdx = weeklyData.length - 1;
    if (activeWeekKey) {
      const idx = weeklyData.findIndex(w => w.weekKey === activeWeekKey);
      if (idx >= 0) currentIdx = idx;
    }

    if (currentIdx === 0) {
      return {
        current: weeklyData[0],
        previous: null,
        changes: { calls: null, sales: null, revenue: null, entries: null },
      };
    }

    const current = weeklyData[currentIdx];
    const previous = weeklyData[currentIdx - 1];

    return {
      current,
      previous,
      changes: {
        calls: calculateChange(current.calls, previous.calls),
        sales: calculateChange(current.sales, previous.sales),
        revenue: calculateChange(current.revenue, previous.revenue),
        entries: calculateChange(current.entries, previous.entries),
      },
    };
  }, [weeklyData, activeWeekKey]);

  // Vibrant color palette
  const chartColors = {
    calls: 'hsl(217, 91%, 60%)',
    sales: 'hsl(270, 70%, 60%)',
    revenue: 'hsl(152, 69%, 45%)',
    entries: 'hsl(38, 92%, 50%)',
  };

  if (weeklyData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] bg-card rounded-xl border border-border gap-3">
        <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">Nenhum dado disponível para o período</p>
      </div>
    );
  }

  return (
    <div className="p-5 bg-card rounded-xl border border-border space-y-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Comparativo Semanal</h3>
          </div>
        </div>
        
        {/* Week-over-week comparison indicators */}
        {comparison.previous && (
          <div className="flex flex-wrap gap-2">
            <ChangeIndicator value={comparison.changes.calls} label="Calls" color={chartColors.calls} />
            <ChangeIndicator value={comparison.changes.sales} label="Vendas" color={chartColors.sales} />
            <ChangeIndicator value={comparison.changes.revenue} label="Faturamento" color={chartColors.revenue} />
            <ChangeIndicator value={comparison.changes.entries} label="Entradas" color={chartColors.entries} />
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} barCategoryGap="15%" barGap={2}>
          <defs>
            <linearGradient id="gradientCalls" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.calls} stopOpacity={1} />
              <stop offset="100%" stopColor={chartColors.calls} stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="gradientSalesCloser" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.sales} stopOpacity={1} />
              <stop offset="100%" stopColor={chartColors.sales} stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.revenue} stopOpacity={1} />
              <stop offset="100%" stopColor={chartColors.revenue} stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="gradientEntries" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.entries} stopOpacity={1} />
              <stop offset="100%" stopColor={chartColors.entries} stopOpacity={0.7} />
            </linearGradient>
          </defs>
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
            width={40}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 10px 40px -10px hsl(var(--foreground) / 0.1)',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '8px' }}
            itemStyle={{ color: 'hsl(var(--foreground))', padding: '2px 0' }}
            formatter={(value: number, name: string) => {
              if (name === 'Faturamento' || name === 'Entradas') {
                return [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), name];
              }
              return [value.toLocaleString('pt-BR'), name];
            }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => (
              <span style={{ color: 'hsl(var(--foreground))', fontSize: '12px', fontWeight: 500 }}>
                {value}
              </span>
            )}
          />
          <Bar
            dataKey="calls"
            name="Calls"
            fill="url(#gradientCalls)"
            radius={[6, 6, 0, 0]}
          >
            <LabelList dataKey="calls" content={renderCustomLabel} />
            {chartData.map((entry, index) => (
              <Cell key={`calls-${index}`} fillOpacity={entry.opacity} />
            ))}
          </Bar>
          <Bar
            dataKey="sales"
            name="Vendas"
            fill="url(#gradientSalesCloser)"
            radius={[6, 6, 0, 0]}
          >
            <LabelList dataKey="sales" content={renderCustomLabel} />
            {chartData.map((entry, index) => (
              <Cell key={`sales-${index}`} fillOpacity={entry.opacity} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
