import React, { useState } from 'react';
import { useMeetings, Meeting } from '@/controllers/useMeetingController';
import { CreateMeetingDialog } from './CreateMeetingDialog';
import { MeetingDetailPage } from './MeetingDetailPage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; dotColor: string; badgeClass: string }> = {
  scheduled: { label: 'Agendada', dotColor: 'bg-blue-500', badgeClass: 'bg-blue-500/8 text-blue-600 border-blue-500/15' },
  completed: { label: 'Concluida', dotColor: 'bg-green-500', badgeClass: 'bg-green-500/8 text-green-600 border-green-500/15' },
  cancelled: { label: 'Cancelada', dotColor: 'bg-red-500', badgeClass: 'bg-red-500/8 text-red-600 border-red-500/15' },
};

export function MeetingsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const { data: meetings = [], isLoading } = useMeetings();

  const filtered = statusFilter === 'all'
    ? meetings
    : meetings.filter((m) => m.status === statusFilter);

  if (selectedMeeting) {
    const fresh = meetings.find((m) => m.id === selectedMeeting.id) || selectedMeeting;
    return <MeetingDetailPage meeting={fresh} onBack={() => setSelectedMeeting(null)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight">Reuniões</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="scheduled">Agendadas</SelectItem>
              <SelectItem value="completed">Concluidas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)} className="rounded-xl">
            <Plus className="h-4 w-4 mr-1" /> Nova Reuniao
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhuma reuniao encontrada</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((meeting) => {
            const status = statusConfig[meeting.status] || statusConfig.scheduled;
            const date = new Date(meeting.meeting_date);
            return (
              <button
                key={meeting.id}
                className="w-full p-4 rounded-2xl bg-card border border-border/30 text-left hover:border-primary/20 transition-all duration-300 group"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
                onClick={() => setSelectedMeeting(meeting)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-primary/5 shrink-0">
                      <Calendar size={16} className="text-primary/60" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{meeting.title}</h3>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {format(date, "dd 'de' MMMM 'de' yyyy 'as' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`${status.badgeClass} rounded-lg text-[11px] gap-1.5`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                    {status.label}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <CreateMeetingDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
