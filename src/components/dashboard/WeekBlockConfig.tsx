import React, { useState } from 'react';
import { Settings, Save, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type WeekBlockConfig, type MetricOffsets } from '@/hooks/useGoogleSheetsConfig';

const COLUMN_OPTIONS = [
  { value: 'B', label: 'B - Segunda' },
  { value: 'C', label: 'C - Terça' },
  { value: 'D', label: 'D - Quarta' },
  { value: 'E', label: 'E - Quinta' },
  { value: 'F', label: 'F - Sexta' },
  { value: 'G', label: 'G - SEMANAL (Totais)' },
];

const METRIC_LABELS: { key: keyof MetricOffsets; label: string; description: string }[] = [
  { key: 'calls', label: 'Calls Realizadas', description: 'Offset 0' },
  { key: 'sales', label: 'Vendas Fechadas', description: 'Offset 1' },
  // Taxa de Conversão é calculado (offset 2) - não importar
  { key: 'revenue', label: 'Valor Total', description: 'Offset 3' },
  { key: 'entries', label: 'Valor Entrada', description: 'Offset 4' },
  { key: 'revenueTrend', label: 'Tendência Valor Total', description: 'Offset 5' },
  { key: 'entriesTrend', label: 'Tendência Entrada', description: 'Offset 6' },
  { key: 'cancellations', label: 'Nº Cancelamentos', description: 'Offset 7' },
  // % de Cancelamento é calculado (offset 8) - não importar
  { key: 'cancellationValue', label: 'Valor Cancelamento', description: 'Offset 9' },
  { key: 'cancellationEntries', label: 'Entrada Cancelamento', description: 'Offset 10' },
];

interface WeekBlockConfigProps {
  config: WeekBlockConfig;
  onChange: (config: WeekBlockConfig) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function WeekBlockConfigComponent({ config, onChange, onSave, isSaving }: WeekBlockConfigProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleBlockConfigChange = (field: keyof Omit<WeekBlockConfig, 'metrics' | 'column'>, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onChange({ ...config, [field]: numValue });
    }
  };

  const handleColumnChange = (value: string) => {
    onChange({ ...config, column: value });
  };

  const handleMetricChange = (key: keyof WeekBlockConfig['metrics'], value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange({
        ...config,
        metrics: { ...config.metrics, [key]: numValue },
      });
    }
  };

  // Calculate preview of which rows will be read
  const getBlockPreview = () => {
    const blocks = [];
    for (let i = 0; i < config.numberOfBlocks; i++) {
      const startRow = config.firstBlockStartRow + (i * config.blockOffset);
      const endRow = startRow + 10; // 11 indicadores (offset 0-10)
      const dateRow = startRow - 1; // Data é 1 linha antes do bloco
      blocks.push({ week: i + 1, startRow, endRow, dateRow });
    }
    return blocks;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração de Blocos Semanais
          </span>
          <span className="text-xs">{isOpen ? '▲' : '▼'}</span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-6">
        {/* Block Structure Configuration */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            Estrutura dos Blocos
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Configure como os blocos semanais estão organizados na planilha.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstBlockStartRow" className="text-xs text-muted-foreground">
                Primeira semana começa na linha
              </Label>
              <Input
                id="firstBlockStartRow"
                type="number"
                min="1"
                value={config.firstBlockStartRow}
                onChange={(e) => handleBlockConfigChange('firstBlockStartRow', e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blockOffset" className="text-xs text-muted-foreground">
                Linhas entre cada semana
              </Label>
              <Input
                id="blockOffset"
                type="number"
                min="1"
                value={config.blockOffset}
                onChange={(e) => handleBlockConfigChange('blockOffset', e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfBlocks" className="text-xs text-muted-foreground">
                Número de semanas por aba
              </Label>
              <Input
                id="numberOfBlocks"
                type="number"
                min="1"
                max="12"
                value={config.numberOfBlocks}
                onChange={(e) => handleBlockConfigChange('numberOfBlocks', e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateRow" className="text-xs text-muted-foreground">
                Linha das datas (relativa)
              </Label>
              <Input
                id="dateRow"
                type="number"
                min="0"
                value={config.dateRow}
                onChange={(e) => handleBlockConfigChange('dateRow', e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          {/* Column Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Coluna para leitura
            </Label>
            <Select value={config.column} onValueChange={handleColumnChange}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Block Preview */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Preview dos Blocos</h4>
          <div className="space-y-1">
            {getBlockPreview().map((block) => (
              <div key={block.week} className="flex items-center gap-2 text-xs">
                <span className="text-primary">✓</span>
                <span className="text-muted-foreground">
                  Semana {block.week}: Data linha {block.dateRow} | Indicadores linhas {block.startRow}-{block.endRow}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Taxa de Conversão (offset 2) e % de Cancelamento (offset 8) são calculados automaticamente
          </p>
        </div>

        {/* Metric Offsets */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-foreground">
            Mapeamento de Métricas (posição relativa dentro do bloco)
          </h4>

          <div className="grid grid-cols-2 gap-3">
            {METRIC_LABELS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
                  {label}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={config.metrics[key]}
                  onChange={(e) => handleMetricChange(key, e.target.value)}
                  className="w-16 bg-background text-center"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={onSave} 
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configuração
            </>
          )}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
