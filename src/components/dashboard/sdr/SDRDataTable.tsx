import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TableIcon, MoreHorizontal, Edit, Trash2, Check, X, ChevronRight, ChevronDown } from 'lucide-react';
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
import type { SDRMetric } from '@/controllers/useSdrController';
import { cn, parseDateString } from '@/lib/utils';

type EditableField = 'activated' | 'scheduled' | 'scheduled_follow_up' | 'scheduled_same_day' | 'attended' | 'sales' | 'fi_called' | 'fi_awaiting' | 'fi_received_link' | 'fi_got_ticket' | 'fi_attended';

interface SDRDataTableProps {
  metrics: SDRMetric[];
  showFunnelColumn?: boolean;
  onEditMetric?: (metric: SDRMetric) => void;
  onDeleteMetric?: (metricId: string) => void;
  onUpdateField?: (metricId: string, field: EditableField, value: number) => void;
  canInlineEdit?: boolean;
  sdrType?: 'sdr' | 'social_selling' | 'funil_intensivo';
}

interface DateGroup {
  date: string;
  metrics: SDRMetric[];
  totals: {
    activated: number;
    scheduled: number;
    scheduled_follow_up: number;
    scheduled_same_day: number;
    attended: number;
    sales: number;
    revenue: number;
    entries: number;
    fi_called: number;
    fi_awaiting: number;
    fi_received_link: number;
    fi_got_ticket: number;
    fi_attended: number;
  };
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

function summarizeFunnels(metrics: SDRMetric[]): string {
  const values = [...new Set(metrics.map(m => m.funnel).filter(Boolean))];
  if (values.length === 0) return '-';
  if (values.length === 1) return values[0]!;
  return `${values.length} funis`;
}

// Inline editable cell component
function EditableCell({
  value,
  metricId,
  field,
  onSave,
  canEdit,
  highlight = false,
}: {
  value: number;
  metricId: string;
  field: EditableField;
  onSave: (metricId: string, field: EditableField, value: number) => void;
  canEdit: boolean;
  highlight?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    const num = parseInt(editValue, 10);
    if (!isNaN(num) && num >= 0 && num !== value) {
      onSave(metricId, field, num);
    }
    setIsEditing(false);
  }, [editValue, value, metricId, field, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(String(value));
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <input
          ref={inputRef}
          type="number"
          min={0}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="w-16 h-7 text-right text-sm font-medium bg-background border border-primary rounded px-1.5 outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    );
  }

  if (highlight) {
    return (
      <div
        className={cn(
          "text-right",
          canEdit && "cursor-pointer group"
        )}
        onClick={() => {
          if (canEdit) {
            setEditValue(String(value));
            setIsEditing(true);
          }
        }}
      >
        <span className={cn(
          "px-2.5 py-1 rounded-lg bg-primary/15 text-primary font-bold text-sm inline-block",
          canEdit && "group-hover:ring-1 group-hover:ring-primary/40 transition-all"
        )}>
          {value}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "text-right font-medium",
        canEdit && "cursor-pointer hover:text-primary hover:bg-primary/5 rounded px-1 -mx-1 transition-colors"
      )}
      onClick={() => {
        if (canEdit) {
          setEditValue(String(value));
          setIsEditing(true);
        }
      }}
    >
      {value}
    </div>
  );
}

export function SDRDataTable({
  metrics,
  showFunnelColumn = false,
  onEditMetric,
  onDeleteMetric,
  onUpdateField,
  canInlineEdit = false,
  sdrType = 'sdr',
}: SDRDataTableProps) {
  const hasActions = onEditMetric || onDeleteMetric;
  const editable = canInlineEdit && !!onUpdateField;
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];

    const map = new Map<string, SDRMetric[]>();
    for (const m of metrics) {
      const arr = map.get(m.date) || [];
      arr.push(m);
      map.set(m.date, arr);
    }

    const result: DateGroup[] = [];
    for (const [date, items] of map) {
      result.push({
        date,
        metrics: items,
        totals: {
          activated: items.reduce((s, m) => s + m.activated, 0),
          scheduled: items.reduce((s, m) => s + m.scheduled, 0),
          scheduled_follow_up: items.reduce((s, m) => s + (m.scheduled_follow_up || 0), 0),
          scheduled_same_day: items.reduce((s, m) => s + m.scheduled_same_day, 0),
          attended: items.reduce((s, m) => s + m.attended, 0),
          sales: items.reduce((s, m) => s + m.sales, 0),
          revenue: items.reduce((s, m) => s + (Number(m.revenue) || 0), 0),
          entries: items.reduce((s, m) => s + (Number(m.entries) || 0), 0),
          fi_called: items.reduce((s, m) => s + (m.fi_called || 0), 0),
          fi_awaiting: items.reduce((s, m) => s + (m.fi_awaiting || 0), 0),
          fi_received_link: items.reduce((s, m) => s + (m.fi_received_link || 0), 0),
          fi_got_ticket: items.reduce((s, m) => s + (m.fi_got_ticket || 0), 0),
          fi_attended: items.reduce((s, m) => s + (m.fi_attended || 0), 0),
        },
      });
    }

    return result.sort(
      (a, b) => parseDateString(b.date).getTime() - parseDateString(a.date).getTime()
    );
  }, [metrics]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
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

  const isFI = sdrType === 'funil_intensivo';

  const renderMetricRow = (metric: SDRMetric, index: number, isSubRow: boolean) => {
    const canEditRow = editable && !!metric.id;

    const dateCellContent = isSubRow ? (
      <span className="text-sm text-muted-foreground">{metric.funnel || '-'}</span>
    ) : (
      format(parseDateString(metric.date), 'dd/MM/yyyy', { locale: ptBR })
    );

    if (isFI) {
      const fiAttRate = (metric.fi_got_ticket || 0) > 0
        ? ((metric.fi_attended || 0) / (metric.fi_got_ticket || 1)) * 100
        : 0;

      return (
        <TableRow
          key={metric.id || `${metric.date}-${index}`}
          className={cn(
            "transition-colors",
            isSubRow
              ? "bg-primary/[0.03] border-l-2 border-l-primary/30"
              : index % 2 === 0 ? "bg-transparent" : "bg-muted/30",
            "hover:bg-primary/5"
          )}
        >
          <TableCell className={cn("font-medium text-foreground", isSubRow && "pl-10")}>
            {dateCellContent}
          </TableCell>
          {showFunnelColumn && (
            <TableCell className="text-muted-foreground text-sm">{metric.funnel || '-'}</TableCell>
          )}
          <TableCell>
            <EditableCell value={metric.fi_called || 0} metricId={metric.id} field="fi_called" onSave={onUpdateField!} canEdit={canEditRow} />
          </TableCell>
          <TableCell>
            <EditableCell value={metric.fi_awaiting || 0} metricId={metric.id} field="fi_awaiting" onSave={onUpdateField!} canEdit={canEditRow} />
          </TableCell>
          <TableCell>
            <EditableCell value={metric.fi_received_link || 0} metricId={metric.id} field="fi_received_link" onSave={onUpdateField!} canEdit={canEditRow} />
          </TableCell>
          <TableCell>
            <EditableCell value={metric.fi_got_ticket || 0} metricId={metric.id} field="fi_got_ticket" onSave={onUpdateField!} canEdit={canEditRow} />
          </TableCell>
          <TableCell>
            <EditableCell value={metric.fi_attended || 0} metricId={metric.id} field="fi_attended" onSave={onUpdateField!} canEdit={canEditRow} highlight />
          </TableCell>
          <TableCell className="text-right">
            <span className={cn(
              "px-2 py-0.5 rounded-md text-xs font-bold",
              getPercentageColor(fiAttRate),
              getPercentageBg(fiAttRate)
            )}>
              {fiAttRate.toFixed(1)}%
            </span>
          </TableCell>
          {hasActions && (
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border">
                  {onEditMetric && (
                    <DropdownMenuItem onClick={() => onEditMetric(metric)} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {onDeleteMetric && (
                    <DropdownMenuItem
                      onClick={() => onDeleteMetric(metric.id)}
                      className="cursor-pointer text-destructive focus:text-destructive"
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
    }

    // Standard SDR row
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
          isSubRow
            ? "bg-primary/[0.03] border-l-2 border-l-primary/30"
            : index % 2 === 0 ? "bg-transparent" : "bg-muted/30",
          "hover:bg-primary/5"
        )}
      >
        <TableCell className={cn("font-medium text-foreground", isSubRow && "pl-10")}>
          {dateCellContent}
        </TableCell>
        {showFunnelColumn && (
          <TableCell className="text-muted-foreground text-sm">
            {metric.funnel || '-'}
          </TableCell>
        )}

        <TableCell>
          <EditableCell value={metric.activated} metricId={metric.id} field="activated" onSave={onUpdateField!} canEdit={canEditRow} />
        </TableCell>
        <TableCell>
          <EditableCell value={metric.scheduled} metricId={metric.id} field="scheduled" onSave={onUpdateField!} canEdit={canEditRow} />
        </TableCell>
        <TableCell>
          <EditableCell value={metric.scheduled_follow_up || 0} metricId={metric.id} field="scheduled_follow_up" onSave={onUpdateField!} canEdit={canEditRow} />
        </TableCell>

        <TableCell className="text-right">
          <span className={cn(
            "px-2 py-0.5 rounded-md text-xs font-bold",
            getPercentageColor(scheduledRate),
            getPercentageBg(scheduledRate)
          )}>
            {scheduledRate.toFixed(1)}%
          </span>
        </TableCell>

        <TableCell>
          <EditableCell value={metric.scheduled_same_day} metricId={metric.id} field="scheduled_same_day" onSave={onUpdateField!} canEdit={canEditRow} />
        </TableCell>
        <TableCell>
          <EditableCell value={metric.attended} metricId={metric.id} field="attended" onSave={onUpdateField!} canEdit={canEditRow} />
        </TableCell>

        <TableCell className="text-right">
          <span className={cn(
            "px-2 py-0.5 rounded-md text-xs font-bold",
            getPercentageColor(attendanceRate),
            getPercentageBg(attendanceRate)
          )}>
            {attendanceRate.toFixed(1)}%
          </span>
        </TableCell>

        <TableCell>
          <EditableCell value={metric.sales} metricId={metric.id} field="sales" onSave={onUpdateField!} canEdit={canEditRow} highlight />
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

        <TableCell className="text-right font-medium text-emerald-600">
          {(Number(metric.revenue) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </TableCell>
        <TableCell className="text-right font-medium text-emerald-600">
          {(Number(metric.entries) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </TableCell>

        {hasActions && (
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                {onEditMetric && (
                  <DropdownMenuItem onClick={() => onEditMetric(metric)} className="cursor-pointer">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDeleteMetric && (
                  <DropdownMenuItem
                    onClick={() => onDeleteMetric(metric.id)}
                    className="cursor-pointer text-destructive focus:text-destructive"
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

  const renderGroupRow = (group: DateGroup, index: number) => {
    const isExpanded = expandedDates.has(group.date);
    const t = group.totals;

    const dateCell = (
      <TableCell className="font-medium text-foreground">
        <div className="flex items-center gap-1.5">
          {isExpanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          }
          <div>
            <span>{format(parseDateString(group.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
            {!showFunnelColumn && (
              <div className="text-xs text-muted-foreground">{summarizeFunnels(group.metrics)}</div>
            )}
          </div>
          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
            {group.metrics.length}
          </span>
        </div>
      </TableCell>
    );

    if (isFI) {
      const fiAttRate = t.fi_got_ticket > 0 ? (t.fi_attended / t.fi_got_ticket) * 100 : 0;
      return (
        <TableRow
          key={group.date}
          className={cn("transition-colors cursor-pointer", index % 2 === 0 ? "bg-transparent" : "bg-muted/30", "hover:bg-primary/5")}
          onClick={() => toggleDate(group.date)}
        >
          {dateCell}
          {showFunnelColumn && <TableCell className="text-muted-foreground text-sm">{summarizeFunnels(group.metrics)}</TableCell>}
          <TableCell className="text-right font-medium">{t.fi_called}</TableCell>
          <TableCell className="text-right font-medium">{t.fi_awaiting}</TableCell>
          <TableCell className="text-right font-medium">{t.fi_received_link}</TableCell>
          <TableCell className="text-right font-medium">{t.fi_got_ticket}</TableCell>
          <TableCell>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary font-bold text-sm inline-block">{t.fi_attended}</span>
            </div>
          </TableCell>
          <TableCell className="text-right">
            <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold", getPercentageColor(fiAttRate), getPercentageBg(fiAttRate))}>
              {fiAttRate.toFixed(1)}%
            </span>
          </TableCell>
          {hasActions && <TableCell />}
        </TableRow>
      );
    }

    const scheduledRate = t.activated > 0 ? (t.scheduled / t.activated) * 100 : 0;
    const attendanceRate = t.scheduled_same_day > 0 ? (t.attended / t.scheduled_same_day) * 100 : 0;
    const conversionRate = t.attended > 0 ? (t.sales / t.attended) * 100 : 0;

    return (
      <TableRow
        key={group.date}
        className={cn(
          "transition-colors cursor-pointer",
          index % 2 === 0 ? "bg-transparent" : "bg-muted/30",
          "hover:bg-primary/5"
        )}
        onClick={() => toggleDate(group.date)}
      >
        {dateCell}
        {showFunnelColumn && (
          <TableCell className="text-muted-foreground text-sm">
            {summarizeFunnels(group.metrics)}
          </TableCell>
        )}
        <TableCell className="text-right font-medium">{t.activated}</TableCell>
        <TableCell className="text-right font-medium">{t.scheduled}</TableCell>
        <TableCell className="text-right font-medium">{t.scheduled_follow_up}</TableCell>
        <TableCell className="text-right">
          <span className={cn(
            "px-2 py-0.5 rounded-md text-xs font-bold",
            getPercentageColor(scheduledRate),
            getPercentageBg(scheduledRate)
          )}>
            {scheduledRate.toFixed(1)}%
          </span>
        </TableCell>
        <TableCell className="text-right font-medium">{t.scheduled_same_day}</TableCell>
        <TableCell className="text-right font-medium">{t.attended}</TableCell>
        <TableCell className="text-right">
          <span className={cn(
            "px-2 py-0.5 rounded-md text-xs font-bold",
            getPercentageColor(attendanceRate),
            getPercentageBg(attendanceRate)
          )}>
            {attendanceRate.toFixed(1)}%
          </span>
        </TableCell>
        <TableCell>
          <div className="text-right">
            <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary font-bold text-sm inline-block">
              {t.sales}
            </span>
          </div>
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
        <TableCell className="text-right font-medium text-emerald-600">
          {t.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </TableCell>
        <TableCell className="text-right font-medium text-emerald-600">
          {t.entries.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </TableCell>
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
        {editable && (
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto">
            Clique nos valores para editar
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data</TableHead>
              {showFunnelColumn && (
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Funil</TableHead>
              )}
              {isFI ? (
                <>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Chamou</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Aguard.</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Link</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ingresso</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Comparec.</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">% Comp.</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ativados</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Agendados</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Agend. FU</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">% Agend.</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Agend. dia</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Realizados</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">% Comp.</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Vendas</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">% Conv.</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Faturamento</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Entradas</TableHead>
                </>
              )}
              {hasActions && (
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground w-[50px]"></TableHead>
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
              const isExpanded = expandedDates.has(group.date);
              return (
                <React.Fragment key={group.date}>
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
