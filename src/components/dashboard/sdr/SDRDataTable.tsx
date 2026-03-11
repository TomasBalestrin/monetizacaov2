import React, { useState, useCallback, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TableIcon, MoreHorizontal, Edit, Trash2, Check, X } from 'lucide-react';
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

type EditableField = 'activated' | 'scheduled' | 'scheduled_follow_up' | 'scheduled_same_day' | 'attended' | 'sales';

interface SDRDataTableProps {
  metrics: SDRMetric[];
  showFunnelColumn?: boolean;
  onEditMetric?: (metric: SDRMetric) => void;
  onDeleteMetric?: (metricId: string) => void;
  onUpdateField?: (metricId: string, field: EditableField, value: number) => void;
  canInlineEdit?: boolean;
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
}: SDRDataTableProps) {
  const hasActions = onEditMetric || onDeleteMetric;
  const editable = canInlineEdit && !!onUpdateField;

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
    (a, b) => parseDateString(b.date).getTime() - parseDateString(a.date).getTime()
  );

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
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ativados</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Agendados</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Agend. FU</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">% Agend.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Agend. dia</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Realizados</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">% Comp.</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Vendas</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">% Conv.</TableHead>
              {hasActions && (
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground w-[50px]"></TableHead>
              )}
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

              const canEditRow = editable && !!metric.id;

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
                    {format(parseDateString(metric.date), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  {showFunnelColumn && (
                    <TableCell className="text-muted-foreground text-sm">
                      {metric.funnel || '-'}
                    </TableCell>
                  )}
                  
                  {/* Editable cells */}
                  <TableCell>
                    <EditableCell value={metric.activated} metricId={metric.id} field="activated" onSave={onUpdateField!} canEdit={canEditRow} />
                  </TableCell>
                  <TableCell>
                    <EditableCell value={metric.scheduled} metricId={metric.id} field="scheduled" onSave={onUpdateField!} canEdit={canEditRow} />
                  </TableCell>
                  <TableCell>
                    <EditableCell value={metric.scheduled_follow_up || 0} metricId={metric.id} field="scheduled_follow_up" onSave={onUpdateField!} canEdit={canEditRow} />
                  </TableCell>
                  
                  {/* Percentage - auto calculated */}
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
                  
                  {/* Percentage - auto calculated */}
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
                  
                  {/* Percentage - auto calculated */}
                  <TableCell className="text-right">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-xs font-bold",
                      getPercentageColor(conversionRate),
                      getPercentageBg(conversionRate)
                    )}>
                      {conversionRate.toFixed(1)}%
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
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
