import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TableIcon, MoreHorizontal, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { CloserMetricRecord } from '@/controllers/useCloserController';
import { cn, parseDateString } from '@/lib/utils';

interface CloserDataTableProps {
  metrics: CloserMetricRecord[];
  onEditMetric?: (metric: CloserMetricRecord) => void;
  onDeleteMetric?: (metricId: string) => void;
}

interface PeriodGroup {
  key: string;
  period_start: string;
  period_end: string;
  metrics: CloserMetricRecord[];
  totals: {
    calls: number;
    sales: number;
    revenue: number;
    entries: number;
    revenue_trend: number;
    entries_trend: number;
    cancellations: number;
    cancellation_value: number;
    cancellation_entries: number;
  };
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

function summarizeField(metrics: CloserMetricRecord[], getter: (m: CloserMetricRecord) => string | undefined | null): string {
  const values = [...new Set(metrics.map(getter).filter(Boolean))];
  if (values.length === 0) return '—';
  if (values.length === 1) return values[0]!;
  return `${values.length} itens`;
}

export function CloserDataTable({ metrics, onEditMetric, onDeleteMetric }: CloserDataTableProps) {
  const hasActions = onEditMetric || onDeleteMetric;
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];

    const map = new Map<string, CloserMetricRecord[]>();
    for (const m of metrics) {
      const key = `${m.period_start}|${m.period_end}`;
      const arr = map.get(key) || [];
      arr.push(m);
      map.set(key, arr);
    }

    const result: PeriodGroup[] = [];
    for (const [key, items] of map) {
      result.push({
        key,
        period_start: items[0].period_start,
        period_end: items[0].period_end,
        metrics: items,
        totals: {
          calls: items.reduce((s, m) => s + m.calls, 0),
          sales: items.reduce((s, m) => s + m.sales, 0),
          revenue: items.reduce((s, m) => s + m.revenue, 0),
          entries: items.reduce((s, m) => s + m.entries, 0),
          revenue_trend: items.reduce((s, m) => s + (m.revenue_trend || 0), 0),
          entries_trend: items.reduce((s, m) => s + (m.entries_trend || 0), 0),
          cancellations: items.reduce((s, m) => s + (m.cancellations || 0), 0),
          cancellation_value: items.reduce((s, m) => s + (m.cancellation_value || 0), 0),
          cancellation_entries: items.reduce((s, m) => s + (m.cancellation_entries || 0), 0),
        },
      });
    }

    return result.sort(
      (a, b) => parseDateString(b.period_start).getTime() - parseDateString(a.period_start).getTime()
    );
  }, [metrics]);

  const togglePeriod = (key: string) => {
    setExpandedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 bg-card rounded-xl border border-border gap-2">
        <TableIcon className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-muted-foreground">Nenhum dado disponível</p>
      </div>
    );
  }

  const renderMetricRow = (metric: CloserMetricRecord, index: number, isSubRow: boolean) => {
    const conversionRate = metric.calls > 0 ? (metric.sales / metric.calls) * 100 : 0;

    return (
      <TableRow
        key={metric.id || `sub-${index}`}
        className={cn(
          "transition-colors",
          isSubRow
            ? "bg-primary/[0.03] border-l-2 border-l-primary/30"
            : index % 2 === 0 ? "bg-transparent" : "bg-muted/30",
          "hover:bg-primary/5"
        )}
      >
        <TableCell className={cn("font-medium text-foreground", isSubRow && "pl-10")}>
          {isSubRow ? '' : format(parseDateString(metric.period_start), 'dd/MM', { locale: ptBR }) + ' - ' + format(parseDateString(metric.period_end), 'dd/MM', { locale: ptBR })}
        </TableCell>
        <TableCell className="text-sm text-foreground">
          <div>
            {metric.product?.name || '—'}
            {metric.funnel?.name && (
              <div className="text-xs text-muted-foreground">{metric.funnel.name}</div>
            )}
          </div>
        </TableCell>
        <TableCell className="text-sm">
          {metric.sdr ? (
            <div className="flex items-center gap-1.5">
              <span className="text-foreground">{metric.sdr.name}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                metric.sdr.type === 'social_selling'
                  ? "bg-violet-500/15 text-violet-500"
                  : "bg-blue-500/15 text-blue-500"
              )}>
                {metric.sdr.type === 'social_selling' ? 'SS' : 'SDR'}
              </span>
            </div>
          ) : '—'}
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
        <TableCell className="text-right text-muted-foreground text-sm">{formatCurrency(metric.revenue_trend || 0)}</TableCell>
        <TableCell className="text-right font-medium">{formatCurrency(metric.entries)}</TableCell>
        <TableCell className="text-right text-muted-foreground text-sm">{formatCurrency(metric.entries_trend || 0)}</TableCell>
        <TableCell className="text-right">
          <span className="px-2 py-0.5 rounded-md text-xs font-bold text-destructive bg-destructive/10">
            {metric.cancellations || 0}
          </span>
        </TableCell>
        <TableCell className="text-right text-destructive text-sm">{formatCurrency(metric.cancellation_value || 0)}</TableCell>
        <TableCell className="text-right text-destructive text-sm">{formatCurrency(metric.cancellation_entries || 0)}</TableCell>
        {hasActions && (
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEditMetric && metric.source !== 'funnel' && (
                  <DropdownMenuItem onClick={() => onEditMetric(metric)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDeleteMetric && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDeleteMetric(metric.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )}
      </TableRow>
    );
  };

  const renderGroupRow = (group: PeriodGroup, index: number) => {
    const isExpanded = expandedPeriods.has(group.key);
    const t = group.totals;
    const conversionRate = t.calls > 0 ? (t.sales / t.calls) * 100 : 0;

    return (
      <TableRow
        key={group.key}
        className={cn(
          "transition-colors cursor-pointer",
          index % 2 === 0 ? "bg-transparent" : "bg-muted/30",
          "hover:bg-primary/5"
        )}
        onClick={() => togglePeriod(group.key)}
      >
        <TableCell className="font-medium text-foreground">
          <div className="flex items-center gap-1.5">
            {isExpanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            }
            <span>
              {format(parseDateString(group.period_start), 'dd/MM', { locale: ptBR })} - {format(parseDateString(group.period_end), 'dd/MM', { locale: ptBR })}
            </span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
              {group.metrics.length}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          <div>
            {summarizeField(group.metrics, m => m.product?.name)}
            {(() => {
              const funnelSummary = summarizeField(group.metrics, m => m.funnel?.name);
              return funnelSummary !== '—' ? <div className="text-xs">{funnelSummary}</div> : null;
            })()}
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {summarizeField(group.metrics, m => m.sdr?.name)}
        </TableCell>
        <TableCell className="text-right font-medium">{t.calls}</TableCell>
        <TableCell className="text-right">
          <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary font-bold text-sm">
            {t.sales}
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
        <TableCell className="text-right font-medium">{formatCurrency(t.revenue)}</TableCell>
        <TableCell className="text-right text-muted-foreground text-sm">{formatCurrency(t.revenue_trend)}</TableCell>
        <TableCell className="text-right font-medium">{formatCurrency(t.entries)}</TableCell>
        <TableCell className="text-right text-muted-foreground text-sm">{formatCurrency(t.entries_trend)}</TableCell>
        <TableCell className="text-right">
          <span className="px-2 py-0.5 rounded-md text-xs font-bold text-destructive bg-destructive/10">
            {t.cancellations}
          </span>
        </TableCell>
        <TableCell className="text-right text-destructive text-sm">{formatCurrency(t.cancellation_value)}</TableCell>
        <TableCell className="text-right text-destructive text-sm">{formatCurrency(t.cancellation_entries)}</TableCell>
        {hasActions && <TableCell />}
      </TableRow>
    );
  };

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
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Produto</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SDR Origem</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Calls</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Vendas</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">% Conv.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Faturamento</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Tend. Fat.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Entradas</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Tend. Ent.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-destructive text-right">Cancel.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-destructive text-right">Vlr Cancel.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-destructive text-right">Ent. Cancel.</TableHead>
              {hasActions && (
                <TableHead className="w-[50px]"></TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group, gi) => {
              if (group.metrics.length === 1) {
                // Single metric - render as normal row
                return renderMetricRow(group.metrics[0], gi, false);
              }

              // Multiple metrics - render group row + expandable sub-rows
              const isExpanded = expandedPeriods.has(group.key);
              return (
                <React.Fragment key={group.key}>
                  {renderGroupRow(group, gi)}
                  {isExpanded && group.metrics.map((m, mi) => renderMetricRow(m, mi, true))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
