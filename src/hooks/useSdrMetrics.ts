import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  activated: number;
  scheduled: number;
  scheduled_rate: number;
  confirmed: number;
  attended: number;
  attendance_rate: number;
  sales: number;
  conversion_rate: number;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface SDRAggregatedMetrics {
  totalActivated: number;
  totalScheduled: number;
  avgScheduledRate: number;
  totalConfirmed: number;
  totalAttended: number;
  avgAttendanceRate: number;
  totalSales: number;
  avgConversionRate: number;
}

export interface SDRWithMetrics extends SDR {
  metrics: SDRAggregatedMetrics;
}

// Fetch all SDRs filtered by type
export function useSDRs(type?: 'sdr' | 'social_selling') {
  return useQuery({
    queryKey: ['sdrs', type],
    queryFn: async () => {
      let query = supabase
        .from('sdrs')
        .select('*')
        .order('name');

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SDR[];
    },
  });
}

// Fetch metrics for a specific SDR within a period
export function useSDRMetrics(
  sdrId?: string,
  periodStart?: string,
  periodEnd?: string
) {
  return useQuery({
    queryKey: ['sdr-metrics', sdrId, periodStart, periodEnd],
    queryFn: async () => {
      if (!sdrId) return [];

      let query = supabase
        .from('sdr_metrics')
        .select('*')
        .eq('sdr_id', sdrId)
        .order('date', { ascending: true });

      if (periodStart) {
        query = query.gte('date', periodStart);
      }
      if (periodEnd) {
        query = query.lte('date', periodEnd);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SDRMetric[];
    },
    enabled: !!sdrId,
  });
}

// Calculate aggregated metrics from an array of metrics
function calculateAggregatedMetrics(metrics: SDRMetric[]): SDRAggregatedMetrics {
  if (metrics.length === 0) {
    return {
      totalActivated: 0,
      totalScheduled: 0,
      avgScheduledRate: 0,
      totalConfirmed: 0,
      totalAttended: 0,
      avgAttendanceRate: 0,
      totalSales: 0,
      avgConversionRate: 0,
    };
  }

  const totalActivated = metrics.reduce((sum, m) => sum + (m.activated || 0), 0);
  const totalScheduled = metrics.reduce((sum, m) => sum + (m.scheduled || 0), 0);
  const totalConfirmed = metrics.reduce((sum, m) => sum + (m.confirmed || 0), 0);
  const totalAttended = metrics.reduce((sum, m) => sum + (m.attended || 0), 0);
  const totalSales = metrics.reduce((sum, m) => sum + (m.sales || 0), 0);

  // Calculate rates dynamically
  const avgScheduledRate = totalActivated > 0 ? (totalScheduled / totalActivated) * 100 : 0;
  const avgAttendanceRate = totalConfirmed > 0 ? (totalAttended / totalConfirmed) * 100 : 0;
  const avgConversionRate = totalAttended > 0 ? (totalSales / totalAttended) * 100 : 0;

  return {
    totalActivated,
    totalScheduled,
    avgScheduledRate,
    totalConfirmed,
    totalAttended,
    avgAttendanceRate,
    totalSales,
    avgConversionRate,
  };
}

// Fetch aggregated metrics for all SDRs of a given type
export function useSDRTotalMetrics(
  type: 'sdr' | 'social_selling',
  periodStart?: string,
  periodEnd?: string
) {
  return useQuery({
    queryKey: ['sdr-total-metrics', type, periodStart, periodEnd],
    queryFn: async () => {
      // First get all SDRs of the given type
      const { data: sdrs, error: sdrsError } = await supabase
        .from('sdrs')
        .select('id')
        .eq('type', type);

      if (sdrsError) throw sdrsError;

      if (!sdrs || sdrs.length === 0) {
        return {
          totalActivated: 0,
          totalScheduled: 0,
          avgScheduledRate: 0,
          totalConfirmed: 0,
          totalAttended: 0,
          avgAttendanceRate: 0,
          totalSales: 0,
          avgConversionRate: 0,
        } as SDRAggregatedMetrics;
      }

      const sdrIds = sdrs.map((s) => s.id);

      // Then get all metrics for those SDRs
      let query = supabase
        .from('sdr_metrics')
        .select('*')
        .in('sdr_id', sdrIds);

      if (periodStart) {
        query = query.gte('date', periodStart);
      }
      if (periodEnd) {
        query = query.lte('date', periodEnd);
      }

      const { data: metrics, error: metricsError } = await query;
      if (metricsError) throw metricsError;

      return calculateAggregatedMetrics(metrics as SDRMetric[]);
    },
  });
}

// Fetch SDRs with their aggregated metrics
export function useSDRsWithMetrics(
  type: 'sdr' | 'social_selling',
  periodStart?: string,
  periodEnd?: string
) {
  return useQuery({
    queryKey: ['sdrs-with-metrics', type, periodStart, periodEnd],
    queryFn: async () => {
      // Get all SDRs of the given type
      const { data: sdrs, error: sdrsError } = await supabase
        .from('sdrs')
        .select('*')
        .eq('type', type)
        .order('name');

      if (sdrsError) throw sdrsError;

      if (!sdrs || sdrs.length === 0) {
        return [] as SDRWithMetrics[];
      }

      // Get all metrics for those SDRs in a single query
      const sdrIds = sdrs.map((s) => s.id);
      let query = supabase
        .from('sdr_metrics')
        .select('*')
        .in('sdr_id', sdrIds);

      if (periodStart) {
        query = query.gte('date', periodStart);
      }
      if (periodEnd) {
        query = query.lte('date', periodEnd);
      }

      const { data: allMetrics, error: metricsError } = await query;
      if (metricsError) throw metricsError;

      // Group metrics by SDR and calculate aggregated values
      const result: SDRWithMetrics[] = sdrs.map((sdr) => {
        const sdrMetrics = (allMetrics || []).filter((m) => m.sdr_id === sdr.id) as SDRMetric[];
        return {
          ...sdr,
          type: sdr.type as 'sdr' | 'social_selling',
          metrics: calculateAggregatedMetrics(sdrMetrics),
        };
      });

      return result;
    },
  });
}
