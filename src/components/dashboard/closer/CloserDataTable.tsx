import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TableIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CloserMetricRecord } from '@/hooks/useMetrics';
import { cn } from '@/lib/utils';

interface CloserDataTableProps {
  metrics: CloserMetricRecord[];
}

function getConversionColor(value: number): string {
  if (value >= 30) return 'text-green-500';
  if (value >= 15) return 'text-amber-500';
  return 'text-red-500';
}

function getConversionBg(value: number): string {
  if (value >= 30) return 'bg-green-500/10';
  if (value >= 15) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CloserDataTable({ metrics }: CloserDataTableProps) {
  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 bg-card rounded-xl border border-border gap-2">
        <TableIcon className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-muted-foreground">Nenhum dado disponível</p>
      </div>
    );
  }

  // Sort by date descending
  const sortedMetrics = [...metrics].sort(
    (a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
  );

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <TableIcon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Dados Detalhados</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Período</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Calls</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Vendas</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">% Conv.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Faturamento</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Tend. Fat.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Entradas</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Tend. Ent.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMetrics.map((metric, index) => {
              const conversionRate = metric.calls > 0
                ? (metric.sales / metric.calls) * 100
                : 0;

              return (
                <TableRow 
                  key={metric.id || `${metric.period_start}-${index}`} 
                  className={cn(
                    "transition-colors",
                    index % 2 === 0 ? "bg-transparent" : "bg-muted/30",
                    "hover:bg-primary/5"
                  )}
                >
                  <TableCell className="font-medium text-foreground">
                    {format(new Date(metric.period_start), 'dd/MM', { locale: ptBR })} - {format(new Date(metric.period_end), 'dd/MM', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right font-medium">{metric.calls}</TableCell>
                  <TableCell className="text-right">
                    <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary font-bold text-sm">
                      {metric.sales}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-xs font-bold",
                      getConversionColor(conversionRate),
                      getConversionBg(conversionRate)
                    )}>
                      {conversionRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(metric.revenue)}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {formatCurrency(metric.revenue_trend || 0)}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(metric.entries)}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {formatCurrency(metric.entries_trend || 0)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
