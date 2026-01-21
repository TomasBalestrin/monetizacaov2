import React from 'react';
import { Settings2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface RowMapping {
  calls: number;
  revenue: number;
  entries: number;
  revenueTrend: number;
  entriesTrend: number;
  sales: number;
  cancellations: number;
  cancellationValue: number;
  cancellationEntries: number;
}

interface RowMappingConfigProps {
  mapping: RowMapping;
  onChange: (mapping: RowMapping) => void;
  onSave: () => void;
  isSaving: boolean;
}

const METRIC_LABELS: { key: keyof RowMapping; label: string; description: string }[] = [
  { key: 'calls', label: 'Ligações', description: 'Número de ligações realizadas' },
  { key: 'sales', label: 'Vendas', description: 'Quantidade de vendas' },
  { key: 'revenue', label: 'Faturamento', description: 'Valor total do faturamento' },
  { key: 'entries', label: 'Entradas', description: 'Valor de entradas' },
  { key: 'revenueTrend', label: 'Tendência Faturamento', description: 'Variação do faturamento' },
  { key: 'entriesTrend', label: 'Tendência Entradas', description: 'Variação das entradas' },
  { key: 'cancellations', label: 'Cancelamentos', description: 'Quantidade de cancelamentos' },
  { key: 'cancellationValue', label: 'Valor Cancelamentos', description: 'Valor dos cancelamentos' },
  { key: 'cancellationEntries', label: 'Entradas Canceladas', description: 'Valor de entradas canceladas' },
];

export function RowMappingConfig({ mapping, onChange, onSave, isSaving }: RowMappingConfigProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleChange = (key: keyof RowMapping, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onChange({ ...mapping, [key]: numValue });
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
          <Settings2 className="h-4 w-4 mr-2" />
          Configurar Mapeamento de Linhas
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Mapeamento de Campos</p>
            <p className="text-xs text-muted-foreground">
              Configure qual linha da planilha corresponde a cada métrica. Os valores são lidos da coluna B.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {METRIC_LABELS.map(({ key, label, description }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`row-${key}`} className="text-xs font-medium">
                  {label}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12">Linha</span>
                  <Input
                    id={`row-${key}`}
                    type="number"
                    min={1}
                    value={mapping[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="h-8 bg-background border-border text-sm"
                    title={description}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border">
            <Button 
              onClick={onSave} 
              disabled={isSaving}
              size="sm"
              className="w-full"
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Salvar Mapeamento</>
              )}
            </Button>
          </div>

          <p className="text-xs text-amber-400">
            ⚠️ Após salvar, sincronize novamente para aplicar as alterações.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
