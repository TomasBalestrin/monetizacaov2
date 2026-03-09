import React, { useState } from 'react';
import { Bell, CheckCheck, Trash2, CalendarPlus, Clock, Phone, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CallDetailDialog } from './CallDetailDialog';
import {
  useEntityNotifications,
  useEntityUnreadCount,
  useMarkAsRead,
  useMarkAllEntityAsRead,
  useClearEntityNotifications,
} from '@/controllers/useNotificationController';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import type { Notification } from '@/model/entities/notification';

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  return date.toLocaleDateString('pt-BR');
}

function NotificationIcon({ type }: { type: string }) {
  const configs: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
    scheduled_call: { icon: CalendarPlus, color: 'text-primary', bg: 'bg-primary/10' },
    call_started: { icon: Phone, color: 'text-green-500', bg: 'bg-green-500/10' },
    call_reminder: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    call_finished: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  };
  const config = configs[type] || { icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted' };
  const Icon = config.icon;

  return (
    <div className={cn('p-1.5 rounded-lg', config.bg)}>
      <Icon size={14} className={config.color} />
    </div>
  );
}

const CALL_TYPES = ['scheduled_call', 'call_reminder', 'call_started', 'call_finished'];

interface EntityNotificationsProps {
  entityId: string;
  entityType: 'closer' | 'sdr';
  entityName: string;
}

export function EntityNotifications({ entityId, entityType, entityName }: EntityNotificationsProps) {
  useRealtimeNotifications();

  const { data: notifications, isLoading } = useEntityNotifications(entityId, entityType);
  const unreadCount = useEntityUnreadCount(entityId, entityType);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllEntityAsRead();
  const clearAll = useClearEntityNotifications();

  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const handleClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    if (CALL_TYPES.includes(notification.type) && notification.data?.scheduled_call_id) {
      setSelectedCallId(notification.data.scheduled_call_id);
    }
  };

  const hasNotifications = notifications && notifications.length > 0;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Notificações</h2>
            {unreadCount > 0 && (
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {unreadCount} nova{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => markAllAsRead.mutate({ entityId, entityType })}
              >
                <CheckCheck size={14} />
                Marcar lidas
              </Button>
            )}
            {hasNotifications && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1 text-destructive hover:text-destructive"
                onClick={() => clearAll.mutate({ entityId, entityType })}
                disabled={clearAll.isPending}
              >
                <Trash2 size={14} />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="glass-card p-6 text-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          </div>
        ) : hasNotifications ? (
          <div className="glass-card divide-y divide-border/40">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50',
                  !n.read && 'bg-primary/5'
                )}
              >
                <NotificationIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', !n.read && 'font-semibold')}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatTimeAgo(n.created_at)}
                </span>
                {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
              </button>
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 text-center">
            <Bell size={24} className="text-muted-foreground/30 mx-auto mb-1" />
            <p className="text-sm text-muted-foreground">Sem notificações para {entityName}</p>
          </div>
        )}
      </div>

      <CallDetailDialog
        open={!!selectedCallId}
        onOpenChange={(open) => { if (!open) setSelectedCallId(null); }}
        callId={selectedCallId}
      />
    </>
  );
}
