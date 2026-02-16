import React, { useState } from 'react';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSDRFunnels, useAddSDRFunnel, useDeleteSDRFunnel } from '@/hooks/useSdrMetrics';
import { useAuth } from '@/contexts/AuthContext';

interface SDRFunnelManagerProps {
  sdrId: string;
  sdrName: string;
  trigger?: React.ReactNode;
}

export function SDRFunnelManager({ sdrId, sdrName, trigger }: SDRFunnelManagerProps) {
  const { isAdmin, isManager } = useAuth();
  const [newFunnel, setNewFunnel] = useState('');
  const [open, setOpen] = useState(false);

  const { data: funnels, isLoading } = useSDRFunnels(sdrId);
  const addFunnel = useAddSDRFunnel();
  const deleteFunnel = useDeleteSDRFunnel();

  if (!isAdmin && !isManager) return null;

  const handleAdd = () => {
    const trimmed = newFunnel.trim();
    if (!trimmed) return;
    addFunnel.mutate({ sdrId, funnelName: trimmed }, {
      onSuccess: () => setNewFunnel(''),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Gerenciar funis">
            <Settings size={16} />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-background border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Funis de {sdrName}</DialogTitle>
          <DialogDescription>
            Adicione ou remova funis vinculados a este SDR.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add funnel */}
          <div className="flex gap-2">
            <Input
              placeholder="Nome do funil"
              value={newFunnel}
              onChange={(e) => setNewFunnel(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={addFunnel.isPending}
            />
            <Button
              onClick={handleAdd}
              disabled={!newFunnel.trim() || addFunnel.isPending}
              size="icon"
            >
              <Plus size={16} />
            </Button>
          </div>

          {/* Funnel list */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : funnels && funnels.length > 0 ? (
              funnels.map((funnel) => (
                <div
                  key={funnel}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border"
                >
                  <span className="text-sm text-foreground">{funnel}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteFunnel.mutate({ sdrId, funnelName: funnel })}
                    disabled={deleteFunnel.isPending}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum funil cadastrado
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
