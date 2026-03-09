import React, { useState, useEffect } from 'react';
import { useActionItems, useAddActionItem, useUpdateActionItem, useDeleteActionItem, useProfiles } from '@/controllers/useMeetingController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

interface ActionItemsProps {
  meetingId: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  done: 'Concluída',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  done: 'bg-green-500/10 text-green-600 border-green-500/20',
};

export function ActionItems({ meetingId }: ActionItemsProps) {
  const STORAGE_KEY = `draft-action-${meetingId}`;
  const [title, setTitle] = useState(() => localStorage.getItem(STORAGE_KEY) || '');

  useEffect(() => {
    if (title) {
      localStorage.setItem(STORAGE_KEY, title);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [title, STORAGE_KEY]);
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: items = [], isLoading } = useActionItems(meetingId);
  const { data: profiles = [] } = useProfiles();
  const addItem = useAddActionItem();
  const updateItem = useUpdateActionItem();
  const deleteItem = useDeleteActionItem();

  const handleAdd = async () => {
    if (!title.trim()) return;
    try {
      await addItem.mutateAsync({
        meeting_id: meetingId,
        title: title.trim(),
        assigned_to: assignedTo || undefined,
        due_date: dueDate || undefined,
      });
      setTitle('');
      localStorage.removeItem(STORAGE_KEY);
      setAssignedTo('');
      setDueDate('');
      setShowForm(false);
      toast.success('Ação adicionada');
    } catch {
      toast.error('Erro ao adicionar ação');
    }
  };

  const cycleStatus = (item: typeof items[0]) => {
    const order = ['pending', 'in_progress', 'done'];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    updateItem.mutate({ id: item.id, meeting_id: meetingId, status: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-muted-foreground">
          {items.filter((i) => i.status === 'done').length}/{items.length} concluídas
        </h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Ação
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Descrição da ação" />
          <div className="grid grid-cols-2 gap-3">
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAdd} disabled={addItem.isPending || !title.trim()}>
              {addItem.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Adicionar
            </Button>
          </div>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id} className="p-3 flex items-center gap-3">
            <Checkbox
              checked={item.status === 'done'}
              onCheckedChange={() => cycleStatus(item)}
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${item.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.profiles?.email && (
                  <span className="text-xs text-muted-foreground">{item.profiles.email}</span>
                )}
                {item.due_date && (
                  <span className="text-xs text-muted-foreground">
                    Prazo: {format(new Date(item.due_date + 'T00:00:00'), 'dd/MM/yyyy')}
                  </span>
                )}
              </div>
            </div>
            <Badge variant="outline" className={`cursor-pointer text-xs ${statusColors[item.status]}`} onClick={() => cycleStatus(item)}>
              {statusLabels[item.status]}
            </Badge>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir ação</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir esta ação? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteItem.mutate({ id: item.id, meeting_id: meetingId })}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        ))}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ação cadastrada</p>
        )}
      </div>
    </div>
  );
}
