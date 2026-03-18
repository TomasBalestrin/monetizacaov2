import React, { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSquads } from '@/controllers/useCloserController';
import { useCreateCloser } from '@/controllers/useCloserController';
import { useCreateSDR } from '@/controllers/useSdrController';

type EntityType = 'closer' | 'sdr' | 'social_selling' | 'funil_intensivo';

const ENTITY_LABELS: Record<EntityType, string> = {
  closer: 'Closer',
  sdr: 'SDR',
  social_selling: 'Social Selling',
  funil_intensivo: 'Funil Intensivo',
};

interface CreateEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEntityDialog({ open, onOpenChange }: CreateEntityDialogProps) {
  const [entityType, setEntityType] = useState<EntityType>('closer');
  const [name, setName] = useState('');
  const [squadId, setSquadId] = useState('');

  const { data: squads } = useSquads();
  const createCloser = useCreateCloser();
  const createSDR = useCreateSDR();

  const isPending = createCloser.isPending || createSDR.isPending;
  const isCloser = entityType === 'closer';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isCloser && !squadId) return;

    if (isCloser) {
      await createCloser.mutateAsync({ name: name.trim(), squadId });
    } else {
      await createSDR.mutateAsync({ name: name.trim(), type: entityType as 'sdr' | 'social_selling' | 'funil_intensivo' });
    }

    setName('');
    setSquadId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Novo Perfil
          </DialogTitle>
          <DialogDescription>
            Crie um novo Closer, SDR ou Social Selling no sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="closer">Closer</SelectItem>
                <SelectItem value="sdr">SDR</SelectItem>
                <SelectItem value="social_selling">Social Selling</SelectItem>
                <SelectItem value="funil_intensivo">Funil Intensivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              placeholder={`Nome do ${ENTITY_LABELS[entityType]}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {isCloser && (
            <div className="space-y-2">
              <Label>Squad</Label>
              <Select value={squadId} onValueChange={setSquadId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um squad" />
                </SelectTrigger>
                <SelectContent>
                  {squads?.map((squad) => (
                    <SelectItem key={squad.id} value={squad.id}>
                      {squad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !name.trim() || (isCloser && !squadId)}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar {ENTITY_LABELS[entityType]}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
