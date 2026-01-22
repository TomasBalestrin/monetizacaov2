import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SDRMetric } from '@/hooks/useSdrMetrics';

interface SDRChartProps {
  metrics: SDRMetric[];
}

export function SDRChart({ metrics }: SDRChartProps) {
  const chartData = metrics.map((m) => ({
    date: format(new Date(m.date), 'dd/MM', { locale: ptBR }),
    Ativados: m.activated,
    Agendados: m.scheduled,
    Realizados: m.attended,
    Vendas: m.sales,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-card rounded-xl border border-border">
        <p className="text-muted-foreground">Nenhum dado disponível para o período</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">Evolução Temporal</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="Ativados"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Agendados"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Realizados"
            stroke="hsl(var(--chart-3))"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Vendas"
            stroke="hsl(var(--chart-4))"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
