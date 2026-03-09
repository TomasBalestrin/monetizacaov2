import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUserFunnels, useCreateFunnelDailyData, type Funnel } from '@/controllers/useFunnelController';
import { useSDRs } from '@/controllers/useSdrController';

interface CloserFunnelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closerId: string;
  closerName: string;
}

interface FunnelEntry {
  funnel_id: string;
  funnel_name: string;
  calls_scheduled: number;
  calls_done: number;
  sales_count: number;
  sales_value: number;
  entries_value: number;
  sdr_id: string;
  leads_count: number;
  qualified_count: number;
}

export function CloserFunnelForm({ open, onOpenChange, closerId, closerName }: CloserFunnelFormProps) {
  const [date, setDate] = useState<Date>(new Date());
  const { data: funnels, isLoading: loadingFunnels } = useUserFunnels(closerId);
  const { data: sdrs } = useSDRs();
  const createData = useCreateFunnelDailyData();

  const [entries, setEntries] = useState<FunnelEntry[]>([]);

  // Reset entries when funnels load or dialog opens
  useMemo(() => {
    if (funnels && funnels.length > 0 && open) {
      setEntries(
        funnels.map((f) => ({
          funnel_id: f.id,
          funnel_name: f.name,
          calls_scheduled: 0,
          calls_done: 0,
          sales_count: 0,
          sales_value: 0,
          entries_value: 0,
          sdr_id: '',
          leads_count: 0,
          qualified_count: 0,
        }))
      );
    }
  }, [funnels, open]);

  const updateEntry = (index: number, field: keyof FunnelEntry, value: number | string) => {
    setEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async () => {
    const nonEmpty = entries.filter(
      (e) => e.calls_scheduled > 0 || e.calls_done > 0 || e.sales_count > 0 || e.leads_count > 0 || e.qualified_count > 0 || e.entries_value > 0
    );

    if (nonEmpty.length === 0) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    await createData.mutateAsync(
      nonEmpty.map((e) => ({
        user_id: closerId,
        funnel_id: e.funnel_id,
        date: dateStr,
        calls_scheduled: e.calls_scheduled,
        calls_done: e.calls_done,
        sales_count: e.sales_count,
        sales_value: e.sales_value,
        entries_value: e.entries_value,
        sdr_id: e.sdr_id || null,
        leads_count: e.leads_count,
        qualified_count: e.qualified_count,
      }))
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Cadastro por Funil — {closerName}</DialogTitle>
          <DialogDescription>
            Preencha os dados de cada funil para o dia selecionado. Apenas funis com dados serão salvos.
          </DialogDescription>
        </DialogHeader>

        {/* Date picker */}
        <div className="flex items-center gap-3 mb-4">
          <Label>Data:</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-[200px] justify-start text-left font-normal')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "dd 'de' MMM, yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border-border">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {loadingFunnels ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum funil atribuído a este Closer.</p>
            <p className="text-sm mt-1">Peça a um administrador para atribuir funis.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {entries.map((entry, i) => (
              <div key={entry.funnel_id} className="p-4 rounded-lg border border-border bg-card space-y-3">
                <h3 className="font-semibold text-foreground">{entry.funnel_name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Leads</Label>
                    <Input
                      type="number"
                      min={0}
                      value={entry.leads_count || ''}
                      onChange={(e) => updateEntry(i, 'leads_count', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Qualificados</Label>
                    <Input
                      type="number"
                      min={0}
                      value={entry.qualified_count || ''}
                      onChange={(e) => updateEntry(i, 'qualified_count', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Calls Agendadas</Label>
                    <Input
                      type="number"
                      min={0}
                      value={entry.calls_scheduled || ''}
                      onChange={(e) => updateEntry(i, 'calls_scheduled', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Calls Realizadas</Label>
                    <Input
                      type="number"
                      min={0}
                      value={entry.calls_done || ''}
                      onChange={(e) => updateEntry(i, 'calls_done', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Vendas</Label>
                    <Input
                      type="number"
                      min={0}
                      value={entry.sales_count || ''}
                      onChange={(e) => updateEntry(i, 'sales_count', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Valor da Venda (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={entry.sales_value || ''}
                      onChange={(e) => updateEntry(i, 'sales_value', Number(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Valor de Entrada (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={entry.entries_value || ''}
                      onChange={(e) => updateEntry(i, 'entries_value', Number(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* SDR de Origem - only show if there are sales */}
                {entry.sales_count > 0 && sdrs && sdrs.length > 0 && (
                  <div>
                    <Label className="text-xs">SDR de Origem</Label>
                    <Select
                      value={entry.sdr_id || 'none'}
                      onValueChange={(v) => updateEntry(i, 'sdr_id', v === 'none' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o SDR" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {sdrs.map((sdr) => (
                          <SelectItem key={sdr.id} value={sdr.id}>
                            {sdr.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createData.isPending || entries.length === 0}
          >
            {createData.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Salvar Dados
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
