import React, { useState } from 'react';
import { Bell, Check, CheckCheck, CalendarPlus, Clock, Phone, Trash2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, useClearAllNotifications } from '@/controllers/useNotificationController';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { CallDetailDialog } from './CallDetailDialog';
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
  if (type === 'scheduled_call') {
    return (
      <div className="p-2 rounded-lg bg-primary/10">
        <CalendarPlus size={16} className="text-primary" />
      </div>
    );
  }
  if (type === 'call_started') {
    return (
      <div className="p-2 rounded-lg bg-green-500/10">
        <Phone size={16} className="text-green-500" />
      </div>
    );
  }
  if (type === 'call_reminder') {
    return (
      <div className="p-2 rounded-lg bg-orange-500/10">
        <Clock size={16} className="text-orange-500" />
      </div>
    );
  }
  if (type === 'call_finished') {
    return (
      <div className="p-2 rounded-lg bg-emerald-500/10">
        <CheckCircle size={16} className="text-emerald-500" />
      </div>
    );
  }
  return (
    <div className="p-2 rounded-lg bg-muted">
      <Bell size={16} className="text-muted-foreground" />
    </div>
  );
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: (notification: Notification) => void;
}) {
  return (
    <button
      onClick={() => onClick(notification)}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left transition-colors rounded-lg',
        notification.read
          ? 'opacity-60 hover:opacity-80'
          : 'bg-primary/5 hover:bg-primary/10'
      )}
    >
      <NotificationIcon type={notification.type} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            'text-sm truncate',
            !notification.read && 'font-semibold'
          )}>
            {notification.title}
          </p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Clock size={10} />
            {formatTimeAgo(notification.created_at)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
      )}
    </button>
  );
}

const CALL_NOTIFICATION_TYPES = ['scheduled_call', 'call_reminder', 'call_started', 'call_finished'];

export function NotificationPanel() {
  useRealtimeNotifications();

  const { data: notifications, isLoading } = useNotifications();
  const unreadCount = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const clearAll = useClearAllNotifications();

  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }

    // If it's a call-related notification, open the detail dialog
    if (CALL_NOTIFICATION_TYPES.includes(notification.type) && notification.data?.scheduled_call_id) {
      setSelectedCallId(notification.data.scheduled_call_id);
      setPopoverOpen(false);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleClearAll = () => {
    clearAll.mutate();
  };

  const hasNotifications = notifications && notifications.length > 0;

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-80 p-0"
          align="end"
          sideOffset={8}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="font-semibold text-sm">Notificações</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1"
                  onClick={handleMarkAllAsRead}
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
                  onClick={handleClearAll}
                  disabled={clearAll.isPending}
                >
                  <Trash2 size={14} />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="max-h-[360px]">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
              </div>
            ) : hasNotifications ? (
              <div className="p-1 space-y-0.5">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell size={32} className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sem notificações</p>
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <CallDetailDialog
        open={!!selectedCallId}
        onOpenChange={(open) => { if (!open) setSelectedCallId(null); }}
        callId={selectedCallId}
      />
    </>
  );
}
