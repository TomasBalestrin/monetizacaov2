import React from 'react';
import { Phone, User, Calendar, Tag, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchScheduledCallById } from '@/model/repositories/scheduledCallRepository';
import { useStartCall } from '@/controllers/useScheduledCallController';

interface CallDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callId: string | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  scheduled: { label: 'Agendada', variant: 'default' },
  in_progress: { label: 'Em Andamento', variant: 'secondary' },
  done: { label: 'Realizada', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
};

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon size={16} className="text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function CallDetailDialog({ open, onOpenChange, callId }: CallDetailDialogProps) {
  const { data: call, isLoading } = useQuery({
    queryKey: ['scheduled-call-detail', callId],
    queryFn: () => fetchScheduledCallById(callId!),
    enabled: !!callId && open,
  });

  const startCall = useStartCall();

  const handleStartCall = async () => {
    if (!call) return;
    await startCall.mutateAsync(call);
    onOpenChange(false);
  };

  const status = call ? (statusConfig[call.status] || statusConfig.scheduled) : null;

  const scheduledTime = call?.scheduled_time
    ? new Date(call.scheduled_time).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-sm border-border/50">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Detalhes da Call</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Informações da call agendada
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : call ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">Status</span>
              {status && <Badge variant={status.variant}>{status.label}</Badge>}
            </div>

            <div className="divide-y divide-border/50">
              <DetailRow icon={User} label="Cliente" value={call.client_name} />
              <DetailRow icon={Phone} label="Telefone" value={call.client_phone} />
              <DetailRow icon={Tag} label="Produto" value={call.funnel?.name || '—'} />
              <DetailRow icon={User} label="SDR" value={call.sdr?.name || '—'} />
              <DetailRow icon={User} label="Closer" value={call.closer?.name || '—'} />
              <DetailRow icon={Calendar} label="Data/Hora" value={scheduledTime} />
            </div>

            {call.status === 'scheduled' && (
              <div className="pt-4">
                <Button
                  onClick={handleStartCall}
                  disabled={startCall.isPending}
                  className="w-full"
                >
                  {startCall.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-4 w-4" />
                      Iniciar Call
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Call não encontrada.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
