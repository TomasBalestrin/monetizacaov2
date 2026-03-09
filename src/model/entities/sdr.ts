export interface SDR {
  id: string;
  name: string;
  type: 'sdr' | 'social_selling';
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
  conversion_rate: number;
  source: string | null;
  created_at: string;
  updated_at: string;
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
  avgConversionRate: number;
}

export interface SDRWithMetrics extends SDR {
  metrics: SDRAggregatedMetrics;
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
}
