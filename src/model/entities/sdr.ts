export interface SDR {
  id: string;
  name: string;
  type: 'sdr' | 'social_selling' | 'funil_intensivo';
  created_at: string;
  updated_at: string;
}

export interface SDRMetric {
  id: string;
  sdr_id: string;
  date: string;
  funnel: string;
  activated: number;
  scheduled: number;
  scheduled_rate: number;
  scheduled_follow_up: number;
  scheduled_same_day: number;
  attended: number;
  attendance_rate: number;
  sales: number;
  revenue: number;
  entries: number; // valor de entrada (R$)
  conversion_rate: number;
  source: string | null;
  created_at: string;
  updated_at: string;
  // Funil Intensivo specific fields
  fi_called?: number;
  fi_awaiting?: number;
  fi_received_link?: number;
  fi_got_ticket?: number;
  fi_attended?: number;
  fi_attendance_rate?: number;
}

export interface SDRAggregatedMetrics {
  totalActivated: number;
  totalScheduled: number;
  avgScheduledRate: number;
  totalScheduledFollowUp: number;
  totalScheduledSameDay: number;
  totalAttended: number;
  avgAttendanceRate: number;
  totalSales: number;
  totalRevenue: number;
  totalEntries: number;
  avgConversionRate: number;
  // Funil Intensivo aggregated fields
  totalFiCalled?: number;
  totalFiAwaiting?: number;
  totalFiReceivedLink?: number;
  totalFiGotTicket?: number;
  totalFiAttended?: number;
  avgFiAttendanceRate?: number;
}

export interface SDRWithMetrics extends SDR {
  metrics: SDRAggregatedMetrics;
}

export interface SDRFunnelWithDate {
  funnel_name: string;
  event_date: string | null;
}

export interface CreateSDRMetricPayload {
  sdr_id: string;
  date: string;
  funnel: string | null;
  activated: number;
  scheduled: number;
  scheduled_follow_up: number;
  scheduled_same_day: number;
  attended: number;
  sales: number;
  source: string;
  // Funil Intensivo fields
  fi_called?: number;
  fi_awaiting?: number;
  fi_received_link?: number;
  fi_got_ticket?: number;
  fi_attended?: number;
}
