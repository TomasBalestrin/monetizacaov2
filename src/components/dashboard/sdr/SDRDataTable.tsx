import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SDRMetric } from '@/hooks/useSdrMetrics';

interface SDRDataTableProps {
  metrics: SDRMetric[];
}

export function SDRDataTable({ metrics }: SDRDataTableProps) {
  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-card rounded-xl border border-border">
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
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Dados Detalhados</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold">Data</TableHead>
              <TableHead className="text-xs font-semibold text-right">Ativados</TableHead>
              <TableHead className="text-xs font-semibold text-right">Agendados</TableHead>
              <TableHead className="text-xs font-semibold text-right">% Agend.</TableHead>
              <TableHead className="text-xs font-semibold text-right">Confirmados</TableHead>
              <TableHead className="text-xs font-semibold text-right">Realizados</TableHead>
              <TableHead className="text-xs font-semibold text-right">% Comp.</TableHead>
              <TableHead className="text-xs font-semibold text-right">Vendas</TableHead>
              <TableHead className="text-xs font-semibold text-right">% Conv.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMetrics.map((metric) => (
              <TableRow key={metric.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  {format(new Date(metric.date), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">{metric.activated}</TableCell>
                <TableCell className="text-right">{metric.scheduled}</TableCell>
                <TableCell className="text-right">
                  {metric.activated > 0
                    ? ((metric.scheduled / metric.activated) * 100).toFixed(1)
                    : '0.0'}%
                </TableCell>
                <TableCell className="text-right">{metric.confirmed}</TableCell>
                <TableCell className="text-right">{metric.attended}</TableCell>
                <TableCell className="text-right">
                  {metric.confirmed > 0
                    ? ((metric.attended / metric.confirmed) * 100).toFixed(1)
                    : '0.0'}%
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {metric.sales}
                </TableCell>
                <TableCell className="text-right">
                  {metric.attended > 0
                    ? ((metric.sales / metric.attended) * 100).toFixed(1)
                    : '0.0'}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
