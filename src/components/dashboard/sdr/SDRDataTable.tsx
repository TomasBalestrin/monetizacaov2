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
import type { SDRMetric } from '@/hooks/useSdrMetrics';
import { cn } from '@/lib/utils';

interface SDRDataTableProps {
  metrics: SDRMetric[];
  showFunnelColumn?: boolean;
}

function getPercentageColor(value: number): string {
  if (value >= 50) return 'text-green-500';
  if (value >= 30) return 'text-amber-500';
  return 'text-red-500';
}

function getPercentageBg(value: number): string {
  if (value >= 50) return 'bg-green-500/10';
  if (value >= 30) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

export function SDRDataTable({ metrics, showFunnelColumn = false }: SDRDataTableProps) {
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
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data</TableHead>
              {showFunnelColumn && (
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Funil</TableHead>
              )}
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ativados</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Agendados</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">% Agend.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Agend. dia</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Realizados</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">% Comp.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Vendas</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">% Conv.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMetrics.map((metric, index) => {
              const scheduledRate = metric.activated > 0
                ? (metric.scheduled / metric.activated) * 100
                : 0;
              const attendanceRate = metric.scheduled_same_day > 0
                ? (metric.attended / metric.scheduled_same_day) * 100
                : 0;
              const conversionRate = metric.attended > 0
                ? (metric.sales / metric.attended) * 100
                : 0;

              return (
                <TableRow 
                  key={metric.id || `${metric.date}-${index}`} 
                  className={cn(
                    "transition-colors",
                    index % 2 === 0 ? "bg-transparent" : "bg-muted/30",
                    "hover:bg-primary/5"
                  )}
                >
                  <TableCell className="font-medium text-foreground">
                    {format(new Date(metric.date), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  {showFunnelColumn && (
                    <TableCell className="text-muted-foreground text-sm">
                      {metric.funnel || '-'}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-medium">{metric.activated}</TableCell>
                  <TableCell className="text-right font-medium">{metric.scheduled}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-xs font-bold",
                      getPercentageColor(scheduledRate),
                      getPercentageBg(scheduledRate)
                    )}>
                      {scheduledRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{metric.scheduled_same_day}</TableCell>
                  <TableCell className="text-right font-medium">{metric.attended}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-xs font-bold",
                      getPercentageColor(attendanceRate),
                      getPercentageBg(attendanceRate)
                    )}>
                      {attendanceRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary font-bold text-sm">
                      {metric.sales}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-xs font-bold",
                      getPercentageColor(conversionRate),
                      getPercentageBg(conversionRate)
                    )}>
                      {conversionRate.toFixed(1)}%
                    </span>
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
