import React from 'react';
import { MoreHorizontal, Edit, Trash2, Bell, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { ScheduledCall } from '@/model/entities/scheduledCall';

interface ScheduledCallsTableProps {
  calls: ScheduledCall[];
  onEdit?: (call: ScheduledCall) => void;
  onDelete?: (call: ScheduledCall) => void;
  onReminder?: (call: ScheduledCall) => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { label: 'Agendada', variant: 'default' },
  in_progress: { label: 'Em Andamento', variant: 'secondary' },
  done: { label: 'Realizada', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
};

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ScheduledCallsTable({ calls, onEdit, onDelete, onReminder }: ScheduledCallsTableProps) {
  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 bg-card rounded-xl border border-border">
        <Phone size={32} className="text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma call agendada</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produto</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Closer</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data/Hora</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call, i) => {
              const status = statusConfig[call.status] || statusConfig.scheduled;
              return (
                <tr
                  key={call.id}
                  className={cn(
                    'border-b border-border/50 last:border-0',
                    i % 2 === 1 && 'bg-muted/20'
                  )}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{call.client_name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{call.client_phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{call.funnel?.name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{call.closer?.name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(call.scheduled_time)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={status.variant} className="text-[10px]">
                      {status.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(call)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {onReminder && call.status === 'scheduled' && (
                          <DropdownMenuItem onClick={() => onReminder(call)}>
                            <Bell className="mr-2 h-4 w-4" />
                            Enviar Lembrete
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={() => onDelete(call)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
