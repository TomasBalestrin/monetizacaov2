import React, { useState, useEffect } from 'react';
import { useMeetingNotes, useAddNote, useDeleteNote, useUpdateNote } from '@/hooks/useMeetings';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Trash2, Send, Pencil, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface MeetingNotesProps {
  meetingId: string;
}

export function MeetingNotes({ meetingId }: MeetingNotesProps) {
  const STORAGE_KEY = `draft-note-${meetingId}`;
  const [content, setContent] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (content) {
      localStorage.setItem(STORAGE_KEY, content);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [content, STORAGE_KEY]);

  const { data: notes = [], isLoading } = useMeetingNotes(meetingId);
  const addNote = useAddNote();
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();

  const handleAdd = async () => {
    if (!content.trim()) return;
    try {
      await addNote.mutateAsync({ meeting_id: meetingId, content: content.trim() });
      setContent('');
      localStorage.removeItem(STORAGE_KEY);
      toast.success('Nota adicionada');
    } catch {
      toast.error('Erro ao adicionar nota');
    }
  };

  const handleStartEdit = (noteId: string, currentContent: string) => {
    setEditingNoteId(noteId);
    setEditContent(currentContent);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId || !editContent.trim()) return;
    try {
      await updateNote.mutateAsync({ id: editingNoteId, meeting_id: meetingId, content: editContent.trim() });
      setEditingNoteId(null);
      setEditContent('');
      toast.success('Nota atualizada');
    } catch {
      toast.error('Erro ao atualizar nota');
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
            {editingNoteId === note.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="icon" className="h-8 w-8" onClick={handleSaveEdit} disabled={updateNote.isPending || !editContent.trim()}>
                    {updateNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {note.profiles?.email} · {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground h-8 w-8"
                    onClick={() => handleStartEdit(note.id, note.content)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir nota</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteNote.mutate({ id: note.id, meeting_id: meetingId })}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </Card>
        ))}
        {!isLoading && notes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota ainda</p>
        )}
      </div>
    </div>
  );
}
