import React, { useState, useMemo } from 'react';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, Phone, Users, Target, Clock } from 'lucide-react';
import { MonthSelector, getMonthPeriod } from '@/components/dashboard/MonthSelector';
import { useActivityLog, type ActivityLogEntry } from '@/controllers/useActivityLogController';
import { cn } from '@/lib/utils';

const typeConfig: Record<ActivityLogEntry['type'], { label: string; icon: typeof Phone; color: string; bg: string }> = {
  closer_metric: { label: 'Closer', icon: Phone, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  sdr_metric: { label: 'SDR', icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  goal: { label: 'Meta', icon: Target, color: 'text-amber-500', bg: 'bg-amber-500/10' },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHour < 24) return `${diffHour}h atrás`;
  if (diffDay < 7) return `${diffDay}d atrás`;
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

export function ActivityLog() {
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const { periodStart, periodEnd } = useMemo(() => getMonthPeriod(selectedMonth), [selectedMonth]);

  const { data: entries, isLoading } = useActivityLog(periodStart, periodEnd);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    if (!entries) return [];
    const map = new Map<string, ActivityLogEntry[]>();
    for (const entry of entries) {
      const dateKey = format(new Date(entry.created_at), 'yyyy-MM-dd');
      const arr = map.get(dateKey) || [];
      arr.push(entry);
      map.set(dateKey, arr);
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Log de Atividades</h2>
        </div>
        <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !entries || entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma atividade registrada neste período.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedEntries.map(({ date, items }) => (
            <div key={date}>
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {format(new Date(date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
              <div className="space-y-1">
                {items.map((entry) => {
                  const config = typeConfig[entry.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn('p-1.5 rounded-lg mt-0.5', config.bg)}>
                        <Icon className={cn('h-3.5 w-3.5', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-foreground truncate">
                            {entry.user_email}
                          </span>
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0',
                            config.bg, config.color
                          )}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-1">
                        <Clock className="h-3 w-3" />
                        <span title={format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}>
                          {format(new Date(entry.created_at), 'HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
