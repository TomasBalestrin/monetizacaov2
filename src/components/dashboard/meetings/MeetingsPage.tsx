import React, { useState } from 'react';
import { useMeetings, Meeting } from '@/hooks/useMeetings';
import { CreateMeetingDialog } from './CreateMeetingDialog';
import { MeetingDetailPage } from './MeetingDetailPage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Agendada', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  completed: { label: 'Concluída', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
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
    // Refresh meeting data from list
    const fresh = meetings.find((m) => m.id === selectedMeeting.id) || selectedMeeting;
    return <MeetingDetailPage meeting={fresh} onBack={() => setSelectedMeeting(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Reuniões</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="scheduled">Agendadas</SelectItem>
              <SelectItem value="completed">Concluídas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Reunião
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma reunião encontrada</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((meeting) => {
            const status = statusConfig[meeting.status] || statusConfig.scheduled;
            const date = new Date(meeting.meeting_date);
            return (
              <Card
                key={meeting.id}
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedMeeting(meeting)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{meeting.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="outline" className={status.color}>{status.label}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreateMeetingDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
