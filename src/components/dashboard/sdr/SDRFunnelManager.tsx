import React, { useState, useMemo } from 'react';
import { Settings, Plus, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useSDRFunnels, useSDRFunnelsWithDates, useAddSDRFunnel, useDeleteSDRFunnel } from '@/controllers/useSdrController';
import { useFunnels } from '@/controllers/useFunnelController';
import { useAuth } from '@/contexts/AuthContext';

interface SDRFunnelManagerProps {
  sdrId: string;
  sdrName: string;
  sdrType?: 'sdr' | 'social_selling' | 'funil_intensivo';
  trigger?: React.ReactNode;
}

export function SDRFunnelManager({ sdrId, sdrName, sdrType = 'sdr', trigger }: SDRFunnelManagerProps) {
  const { isAdmin, isManager } = useAuth();
  const [selectedFunnel, setSelectedFunnel] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [open, setOpen] = useState(false);

  const isFI = sdrType === 'funil_intensivo';

  const { data: sdrFunnels, isLoading } = useSDRFunnels(sdrId);
  const { data: sdrFunnelsWithDates } = useSDRFunnelsWithDates(isFI ? sdrId : undefined);
  const { data: allFunnels } = useFunnels();
  const addFunnel = useAddSDRFunnel();
  const deleteFunnel = useDeleteSDRFunnel();

  // Filter out funnels already assigned to this SDR (for non-FI)
  const availableFunnels = useMemo(() => {
    if (!allFunnels) return [];
    const assigned = new Set(sdrFunnels || []);
    return allFunnels.filter(f => !assigned.has(f.name));
  }, [allFunnels, sdrFunnels]);

  if (!isAdmin && !isManager) return null;

  const handleAdd = () => {
    if (isFI) {
      if (!eventName || !eventDate) return;
      addFunnel.mutate({ sdrId, funnelName: eventName, eventDate }, {
        onSuccess: () => { setEventName(''); setEventDate(''); },
      });
    } else {
      if (!selectedFunnel) return;
      addFunnel.mutate({ sdrId, funnelName: selectedFunnel }, {
        onSuccess: () => setSelectedFunnel(''),
      });
    }
  };

  const displayFunnels = isFI ? sdrFunnelsWithDates : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8" title={isFI ? 'Gerenciar Intensivos' : 'Gerenciar funis'}>
            <Settings size={16} />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-background border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isFI ? 'Eventos Intensivos' : `Funis de ${sdrName}`}</DialogTitle>
          <DialogDescription>
            {isFI
              ? 'Adicione ou remova eventos do Funil Intensivo com suas datas.'
              : 'Adicione ou remova funis vinculados a este SDR.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add funnel/event */}
          {isFI ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do evento (ex: Intensivo Março)"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Calendar size={16} className="text-muted-foreground shrink-0" />
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={!eventName || !eventDate || addFunnel.isPending}
                  size="icon"
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um funil" />
                </SelectTrigger>
                <SelectContent>
                  {availableFunnels.length > 0 ? (
                    availableFunnels.map((f) => (
                      <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none" disabled>Nenhum funil disponivel</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAdd}
                disabled={!selectedFunnel || addFunnel.isPending}
                size="icon"
              >
                <Plus size={16} />
              </Button>
            </div>
          )}

          {/* Funnel/Event list */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : isFI && displayFunnels ? (
              displayFunnels.length > 0 ? (
                displayFunnels.map((f) => (
                  <div
                    key={f.funnel_name}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border"
                  >
                    <div>
                      <span className="text-sm font-medium text-foreground">{f.funnel_name}</span>
                      {f.event_date && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(f.event_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteFunnel.mutate({ sdrId, funnelName: f.funnel_name })}
                      disabled={deleteFunnel.isPending}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum evento cadastrado
                </p>
              )
            ) : sdrFunnels && sdrFunnels.length > 0 ? (
              sdrFunnels.map((funnel) => (
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
