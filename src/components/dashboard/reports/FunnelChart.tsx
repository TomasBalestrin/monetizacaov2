import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FunnelReport } from '@/controllers/useFunnelController';

interface FunnelChartProps {
  report: FunnelReport;
}

const STAGE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function FunnelChart({ report }: FunnelChartProps) {
  const stages = [
    { name: 'Leads', value: Number(report.total_leads), rate: null },
    { name: 'Qualificados', value: Number(report.total_qualified), rate: Number(report.leads_to_qualified_rate) },
    { name: 'Agendadas', value: Number(report.total_calls_scheduled), rate: Number(report.qualified_to_scheduled_rate) },
    { name: 'Realizadas', value: Number(report.total_calls_done), rate: Number(report.scheduled_to_done_rate) },
    { name: 'Vendas', value: Number(report.total_sales), rate: Number(report.done_to_sales_rate) },
  ];

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">
          Funil: {report.funnel_name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Faturamento total: {formatCurrency(Number(report.total_revenue))}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stages} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
              <YAxis
                type="category"
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                width={75}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number, name: string, entry: any) => {
                  const rate = entry.payload.rate;
                  return [
                    `${value}${rate !== null ? ` (${rate.toFixed(1)}%)` : ''}`,
                    entry.payload.name,
                  ];
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {stages.map((_, i) => (
                  <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion rates between stages */}
        <div className="flex flex-wrap gap-3 mt-4">
          {stages.slice(1).map((stage, i) => (
            <div
              key={stage.name}
              className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full"
            >
              <span>{stages[i].name} → {stage.name}:</span>
              <span className="font-semibold text-foreground">
                {stage.rate !== null ? `${stage.rate.toFixed(1)}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
