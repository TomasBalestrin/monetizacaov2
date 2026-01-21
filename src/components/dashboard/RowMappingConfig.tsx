import React, { useState } from 'react';
import { Settings, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type RowMapping } from '@/hooks/useGoogleSheetsConfig';

interface RowMappingConfigProps {
  mapping: RowMapping;
  onChange: (mapping: RowMapping) => void;
  onSave: () => void;
  isSaving: boolean;
}

const METRIC_LABELS: { key: keyof Omit<RowMapping, 'column'>; label: string; description: string }[] = [
  { key: 'calls', label: 'Calls Realizadas', description: 'Número de ligações' },
  { key: 'sales', label: 'Vendas Fechadas', description: 'Quantidade de vendas' },
  { key: 'revenue', label: 'Valor Total', description: 'Faturamento total' },
  { key: 'entries', label: 'Valor Entrada', description: 'Valor de entrada' },
  { key: 'revenueTrend', label: 'Tendência Valor Total', description: 'Tendência do faturamento' },
  { key: 'entriesTrend', label: 'Tendência Valor Entrada', description: 'Tendência das entradas' },
  { key: 'cancellations', label: 'Nº Cancelamentos', description: 'Quantidade de cancelamentos' },
  { key: 'cancellationValue', label: 'Valor Cancelamento', description: 'Valor das vendas canceladas' },
  { key: 'cancellationEntries', label: 'Entradas Canceladas', description: 'Valor de entradas canceladas' },
];

const COLUMN_OPTIONS = [
  { value: 'B', label: 'B - Segunda' },
  { value: 'C', label: 'C - Terça' },
  { value: 'D', label: 'D - Quarta' },
  { value: 'E', label: 'E - Quinta' },
  { value: 'F', label: 'F - Sexta' },
  { value: 'G', label: 'G - SEMANAL (Totais)' },
];

export function RowMappingConfig({ mapping, onChange, onSave, isSaving }: RowMappingConfigProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleRowChange = (key: keyof Omit<RowMapping, 'column'>, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onChange({ ...mapping, [key]: numValue });
    }
  };

  const handleColumnChange = (value: string) => {
    onChange({ ...mapping, column: value });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-border rounded-lg">
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between p-4 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Configuração de Mapeamento</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {isOpen ? 'Fechar' : 'Abrir'}
          </span>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure qual coluna e linha da planilha corresponde a cada métrica.
        </p>

        {/* Column selector */}
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
          <Label className="text-sm font-medium">Coluna para leitura</Label>
          <Select value={mapping.column} onValueChange={handleColumnChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Selecione a coluna" />
            </SelectTrigger>
            <SelectContent>
              {COLUMN_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Selecione a coluna G para ler os totais semanais.
          </p>
        </div>

        {/* Row mapping grid */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Mapeamento de Linhas</Label>
          <div className="grid grid-cols-2 gap-3">
            {METRIC_LABELS.map(({ key, label, description }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={key} className="text-xs text-muted-foreground" title={description}>
                  {label}
                </Label>
                <Input
                  id={key}
                  type="number"
                  min="1"
                  value={mapping[key]}
                  onChange={(e) => handleRowChange(key, e.target.value)}
                  className="bg-background h-9"
                />
              </div>
            ))}
          </div>
        </div>

        <Button 
          onClick={onSave} 
          disabled={isSaving}
          className="w-full"
          size="sm"
        >
          {isSaving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Salvar Mapeamento</>
          )}
        </Button>

        <p className="text-xs text-amber-400">
          ⚠️ Após salvar, sincronize novamente para aplicar as alterações.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
