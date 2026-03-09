import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreateMeeting, useProfiles } from '@/controllers/useMeetingController';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMeetingDialog({ open, onOpenChange }: CreateMeetingDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const { data: profiles = [] } = useProfiles();
  const createMeeting = useCreateMeeting();

  const toggleParticipant = (id: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) {
      toast.error('Preencha título, data e hora');
      return;
    }

    const meeting_date = new Date(`${date}T${time}`).toISOString();

    try {
      await createMeeting.mutateAsync({
        title,
        description,
        meeting_date,
        participant_ids: selectedParticipants,
      });
      toast.success('Reunião criada com sucesso');
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
      setSelectedParticipants([]);
    } catch {
      toast.error('Erro ao criar reunião');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Reunião</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da reunião" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Participantes</Label>
            <ScrollArea className="h-32 rounded-md border p-2">
              {profiles.map((p) => (
                <label key={p.id} className="flex items-center gap-2 py-1.5 px-1 hover:bg-accent rounded cursor-pointer">
                  <Checkbox
                    checked={selectedParticipants.includes(p.id)}
                    onCheckedChange={() => toggleParticipant(p.id)}
                  />
                  <span className="text-sm truncate">{p.email}</span>
                </label>
              ))}
              {profiles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">Nenhum usuário encontrado</p>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMeeting.isPending}>
              {createMeeting.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
