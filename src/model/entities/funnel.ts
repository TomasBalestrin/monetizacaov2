export interface Funnel {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FunnelSummary {
  funnel_id: string;
  funnel_name: string;
  category: string | null;
  total_leads: number;
  total_qualified: number;
  total_calls_scheduled: number;
  total_calls_done: number;
  total_sales: number;
  total_revenue: number;
  total_entries: number;
  leads_to_qualified_rate: number;
  conversion_rate: number;
}

export interface FunnelReport {
  funnel_id: string;
  funnel_name: string;
  total_leads: number;
  total_qualified: number;
  total_calls_scheduled: number;
  total_calls_done: number;
  total_sales: number;
  total_revenue: number;
  total_entries: number;
  leads_to_qualified_rate: number;
  qualified_to_scheduled_rate: number;
  scheduled_to_done_rate: number;
  done_to_sales_rate: number;
}

export interface FunnelDailyData {
  id: string;
  user_id: string;
  funnel_id: string;
  date: string;
  calls_scheduled: number;
  calls_done: number;
  sales_count: number;
  sales_value: number;
  entries_value: number;
  sdr_id: string | null;
  leads_count: number;
  qualified_count: number;
  created_at: string;
  created_by: string | null;
  funnel?: { id: string; name: string } | null;
  sdr?: { id: string; name: string; type: string } | null;
}

export interface PersonProductSales {
  person_id: string;
  person_name: string;
  person_type: string;
  funnel_id: string | null;
  funnel_name: string;
  total_sales: number;
  total_revenue: number;
  total_leads: number;
  total_qualified: number;
  total_scheduled: number;
  total_done: number;
  total_entries: number;
}
