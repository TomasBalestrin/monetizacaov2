export interface Goal {
  id: string;
  entity_type: string;
  entity_id: string;
  month: string;
  metric_key: string;
  target_value: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const CLOSER_METRIC_KEYS = [
  { key: 'calls', label: 'Calls Realizadas' },
  { key: 'sales', label: 'Número de Vendas' },
  { key: 'revenue', label: 'Faturamento' },
  { key: 'entries', label: 'Valor de Entrada' },
] as const;

export const SDR_METRIC_KEYS = [
  { key: 'activated', label: 'Ativados' },
  { key: 'scheduled', label: 'Agendados' },
  { key: 'attended', label: 'Realizados' },
  { key: 'sales', label: 'Vendas' },
] as const;
