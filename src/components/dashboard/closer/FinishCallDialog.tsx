import React, { useState, useEffect } from 'react';
import { Phone, User, Calendar, Tag, Loader2, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFinishCall } from '@/controllers/useScheduledCallController';
import type { ScheduledCall } from '@/model/entities/scheduledCall';

interface FinishCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: ScheduledCall | null;
}

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

export function FinishCallDialog({ open, onOpenChange, call }: FinishCallDialogProps) {
  const [hasSale, setHasSale] = useState(false);
  const [revenue, setRevenue] = useState('');
  const [entryValue, setEntryValue] = useState('');
  const finishCall = useFinishCall();

  useEffect(() => {
    if (open) {
      setHasSale(false);
      setRevenue('');
      setEntryValue('');
    }
  }, [open]);

  if (!call) return null;

  const scheduledTime = new Date(call.scheduled_time).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleSubmit = async () => {
    await finishCall.mutateAsync({
      call,
      hasSale,
      revenue: hasSale ? parseFloat(revenue) || 0 : 0,
      entryValue: hasSale ? parseFloat(entryValue) || 0 : 0,
    });
    onOpenChange(false);
  };

  const canSubmit = !hasSale || (parseFloat(revenue) > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-sm border-border/50">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/20">
              <Phone className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Finalizar Call</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Registre o resultado da call
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Read-only call details */}
          <div className="divide-y divide-border/50">
            <DetailRow icon={User} label="Cliente" value={call.client_name} />
            <DetailRow icon={Phone} label="Telefone" value={call.client_phone} />
            <DetailRow icon={Tag} label="Produto" value={call.funnel?.name || '—'} />
            <DetailRow icon={User} label="SDR" value={call.sdr?.name || '—'} />
            <DetailRow icon={Calendar} label="Data/Hora" value={scheduledTime} />
          </div>

          {/* Sale toggle */}
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="has-sale" className="text-sm font-medium cursor-pointer">
                Fechou venda?
              </Label>
              <Switch
                id="has-sale"
                checked={hasSale}
                onCheckedChange={setHasSale}
              />
            </div>

            {hasSale && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="space-y-1.5">
                  <Label htmlFor="revenue" className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <DollarSign size={12} />
                    Faturamento (R$)
                  </Label>
                  <Input
                    id="revenue"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="entry-value" className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <DollarSign size={12} />
                    Valor da Entrada (R$)
                  </Label>
                  <Input
                    id="entry-value"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={entryValue}
                    onChange={(e) => setEntryValue(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={finishCall.isPending || !canSubmit}
            className="w-full"
          >
            {finishCall.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              'Finalizar Call'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
