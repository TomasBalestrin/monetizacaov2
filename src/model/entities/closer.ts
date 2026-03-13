export interface Squad {
  id: string;
  name: string;
  slug: string;
}

export interface Closer {
  id: string;
  name: string;
  squad_id: string;
  squad?: Squad;
}

export interface Metric {
  id: string;
  closer_id: string;
  period_start: string;
  period_end: string;
  calls: number;
  sales: number;
  revenue: number;
  entries: number;
  source: string | null;
  revenue_trend?: number;
  entries_trend?: number;
  cancellations?: number;
  cancellation_value?: number;
  cancellation_entries?: number;
  funnel_id?: string | null;
  sdr_id?: string | null;
  product_id?: string | null;
  funnel?: { id: string; name: string } | null;
  product?: { id: string; name: string } | null;
  closer?: Closer;
}

export interface CloserMetricRecord {
  id: string;
  closer_id: string;
  period_start: string;
  period_end: string;
  calls: number;
  sales: number;
  revenue: number;
  entries: number;
  source: string | null;
  revenue_trend: number;
  entries_trend: number;
  cancellations: number;
  cancellation_value: number;
  cancellation_entries: number;
  funnel_id?: string | null;
  sdr_id?: string | null;
  product_id?: string | null;
  funnel?: { id: string; name: string } | null;
  sdr?: { id: string; name: string; type: string } | null;
  product?: { id: string; name: string } | null;
}

export interface CloserMetricTotals {
  calls: number;
  sales: number;
  revenue: number;
  entries: number;
  revenueTrend: number;
  entriesTrend: number;
  conversion: number;
  cancellations: number;
  cancellationValue: number;
  cancellationEntries: number;
  cancellationRate: number;
}

export interface SquadMetrics {
  squad: Squad;
  closers: {
    closer: Closer;
    metrics: CloserMetricTotals;
  }[];
  totals: CloserMetricTotals;
}

export interface CreateMetricPayload {
  closer_id: string;
  period_start: string;
  period_end: string;
  calls: number;
  sales: number;
  revenue: number;
  entries: number;
  source: string | null;
  revenue_trend?: number;
  entries_trend?: number;
  cancellations?: number;
  cancellation_value?: number;
  cancellation_entries?: number;
  funnel_id?: string | null;
  sdr_id?: string | null;
  product_id?: string | null;
  created_by?: string;
}
