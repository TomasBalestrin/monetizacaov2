import React from 'react';
import { Meeting, useMeetingParticipants, useUpdateMeeting } from '@/controllers/useMeetingController';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MeetingNotes } from './MeetingNotes';
import { ActionItems } from './ActionItems';
import { ArrowLeft, Calendar, Clock, Users, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface MeetingDetailPageProps {
  meeting: Meeting;
  onBack: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Agendada', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  completed: { label: 'Concluída', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export function MeetingDetailPage({ meeting, onBack }: MeetingDetailPageProps) {
  const { data: participants = [] } = useMeetingParticipants(meeting.id);
  const updateMeeting = useUpdateMeeting();

  const status = statusConfig[meeting.status] || statusConfig.scheduled;
  const meetingDate = new Date(meeting.meeting_date);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateMeeting.mutateAsync({ id: meeting.id, status: newStatus });
      toast.success(`Reunião marcada como ${statusConfig[newStatus]?.label.toLowerCase()}`);
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{meeting.title}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <Badge variant="outline" className={status.color}>{status.label}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(meetingDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(meetingDate, 'HH:mm')}
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="actions">Plano de Ação</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          {meeting.description && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Descrição</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{meeting.description}</p></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Participantes ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length > 0 ? (
                <ul className="space-y-1">
                  {participants.map((p) => (
                    <li key={p.id} className="text-sm text-muted-foreground">{p.profiles?.email || p.user_id}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum participante</p>
              )}
            </CardContent>
          </Card>

          {meeting.status === 'scheduled' && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => handleStatusChange('completed')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Marcar como Concluída
              </Button>
              <Button variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => handleStatusChange('cancelled')}>
                <XCircle className="h-4 w-4 mr-2" /> Cancelar Reunião
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <ActionItems meetingId={meeting.id} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <MeetingNotes meetingId={meeting.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
