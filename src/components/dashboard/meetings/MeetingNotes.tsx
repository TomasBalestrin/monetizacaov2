import React, { useState } from 'react';
import { useMeetingNotes, useAddNote, useDeleteNote } from '@/hooks/useMeetings';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Trash2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MeetingNotesProps {
  meetingId: string;
}

export function MeetingNotes({ meetingId }: MeetingNotesProps) {
  const [content, setContent] = useState('');
  const { data: notes = [], isLoading } = useMeetingNotes(meetingId);
  const addNote = useAddNote();
  const deleteNote = useDeleteNote();

  const handleAdd = async () => {
    if (!content.trim()) return;
    try {
      await addNote.mutateAsync({ meeting_id: meetingId, content: content.trim() });
      setContent('');
      toast.success('Nota adicionada');
    } catch {
      toast.error('Erro ao adicionar nota');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva uma nota..."
          rows={2}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={addNote.isPending || !content.trim()} size="icon" className="shrink-0 self-end">
          {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      <div className="space-y-3">
        {notes.map((note) => (
          <Card key={note.id} className="p-4">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {note.profiles?.email} · {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8"
                onClick={() => deleteNote.mutate({ id: note.id, meeting_id: meetingId })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {!isLoading && notes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota ainda</p>
        )}
      </div>
    </div>
  );
}
