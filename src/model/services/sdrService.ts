import type { SDR, SDRMetric, SDRAggregatedMetrics, SDRWithMetrics } from '@/model/entities/sdr';

/**
 * Calcula métricas agregadas a partir de um array de métricas SDR
 */
export function calculateAggregatedMetrics(metrics: SDRMetric[]): SDRAggregatedMetrics {
  if (metrics.length === 0) {
    return {
      totalActivated: 0,
      totalScheduled: 0,
      avgScheduledRate: 0,
      totalScheduledFollowUp: 0,
      totalScheduledSameDay: 0,
      totalAttended: 0,
      avgAttendanceRate: 0,
      totalSales: 0,
      totalRevenue: 0,
      totalEntries: 0,
      avgConversionRate: 0,
      totalCancellations: 0,
      totalCancellationValue: 0,
      totalCancellationEntries: 0,
      cancellationRate: 0,
      totalFiCalled: 0,
      totalFiAwaiting: 0,
      totalFiReceivedLink: 0,
      totalFiGotTicket: 0,
      totalFiAttended: 0,
      avgFiAttendanceRate: 0,
    };
  }

  const totalActivated = metrics.reduce((sum, m) => sum + (m.activated || 0), 0);
  const totalScheduled = metrics.reduce((sum, m) => sum + (m.scheduled || 0), 0);
  const totalScheduledFollowUp = metrics.reduce((sum, m) => sum + (m.scheduled_follow_up || 0), 0);
  const totalScheduledSameDay = metrics.reduce((sum, m) => sum + (m.scheduled_same_day || 0), 0);
  const totalAttended = metrics.reduce((sum, m) => sum + (m.attended || 0), 0);
  const totalSales = metrics.reduce((sum, m) => sum + (m.sales || 0), 0);
  const totalRevenue = metrics.reduce((sum, m) => sum + (Number(m.revenue) || 0), 0);
  const totalEntries = metrics.reduce((sum, m) => sum + (Number(m.entries) || 0), 0);

  const avgScheduledRate = totalActivated > 0 ? (totalScheduled / totalActivated) * 100 : 0;
  const avgAttendanceRate = totalScheduledSameDay > 0 ? (totalAttended / totalScheduledSameDay) * 100 : 0;
  const avgConversionRate = totalAttended > 0 ? (totalSales / totalAttended) * 100 : 0;

  // Cancellation aggregation
  const totalCancellations = metrics.reduce((sum, m) => sum + (m.cancellations || 0), 0);
  const totalCancellationValue = metrics.reduce((sum, m) => sum + (Number(m.cancellation_value) || 0), 0);
  const totalCancellationEntries = metrics.reduce((sum, m) => sum + (Number(m.cancellation_entries) || 0), 0);
  const cancellationRate = totalSales > 0 ? (totalCancellations / totalSales) * 100 : 0;

  // Funil Intensivo aggregation
  const totalFiCalled = metrics.reduce((sum, m) => sum + (m.fi_called || 0), 0);
  const totalFiAwaiting = metrics.reduce((sum, m) => sum + (m.fi_awaiting || 0), 0);
  const totalFiReceivedLink = metrics.reduce((sum, m) => sum + (m.fi_received_link || 0), 0);
  const totalFiGotTicket = metrics.reduce((sum, m) => sum + (m.fi_got_ticket || 0), 0);
  const totalFiAttended = metrics.reduce((sum, m) => sum + (m.fi_attended || 0), 0);
  const avgFiAttendanceRate = totalFiGotTicket > 0 ? (totalFiAttended / totalFiGotTicket) * 100 : 0;

  return {
    totalActivated,
    totalScheduled,
    avgScheduledRate,
    totalScheduledFollowUp,
    totalScheduledSameDay,
    totalAttended,
    avgAttendanceRate,
    totalSales,
    totalRevenue,
    totalEntries,
    avgConversionRate,
    totalCancellations,
    totalCancellationValue,
    totalCancellationEntries,
    cancellationRate,
    totalFiCalled,
    totalFiAwaiting,
    totalFiReceivedLink,
    totalFiGotTicket,
    totalFiAttended,
    avgFiAttendanceRate,
  };
}

/**
 * Agrupa métricas por SDR e calcula valores agregados
 */
export function groupMetricsBySDR(sdrs: SDR[], allMetrics: SDRMetric[]): SDRWithMetrics[] {
  return sdrs.map((sdr) => {
    const sdrMetrics = allMetrics.filter((m) => m.sdr_id === sdr.id);
    return {
      ...sdr,
      metrics: calculateAggregatedMetrics(sdrMetrics),
    };
  });
}

/**
 * Calcula as taxas de um metric SDR para inserção/atualização
 */
export function calculateSDRRates(metric: {
  activated: number;
  scheduled: number;
  scheduled_same_day: number;
  attended: number;
  sales: number;
}) {
  return {
    scheduled_rate: metric.activated > 0
      ? (metric.scheduled / metric.activated) * 100
      : 0,
    attendance_rate: metric.scheduled_same_day > 0
      ? (metric.attended / metric.scheduled_same_day) * 100
      : 0,
    conversion_rate: metric.attended > 0
      ? (metric.sales / metric.attended) * 100
      : 0,
  };
}

/**
 * Calcula a taxa de comparecimento do Funil Intensivo
 */
export function calculateFIRates(metric: {
  fi_got_ticket?: number;
  fi_attended?: number;
}) {
  return {
    fi_attendance_rate: (metric.fi_got_ticket || 0) > 0
      ? ((metric.fi_attended || 0) / metric.fi_got_ticket!) * 100
      : 0,
  };
}

/**
 * Calcula taxas parciais para update (quando nem todos os campos estão presentes)
 */
export function calculatePartialSDRRates(updates: {
  activated?: number;
  scheduled?: number;
  scheduled_same_day?: number;
  attended?: number;
  sales?: number;
}): Record<string, number> {
  const rates: Record<string, number> = {};

  if (updates.activated !== undefined && updates.scheduled !== undefined) {
    rates.scheduled_rate = updates.activated > 0
      ? (updates.scheduled / updates.activated) * 100
      : 0;
  }
  if (updates.scheduled_same_day !== undefined && updates.attended !== undefined) {
    rates.attendance_rate = updates.scheduled_same_day > 0
      ? (updates.attended / updates.scheduled_same_day) * 100
      : 0;
  }
  if (updates.attended !== undefined && updates.sales !== undefined) {
    rates.conversion_rate = updates.attended > 0
      ? (updates.sales / updates.attended) * 100
      : 0;
  }

  return rates;
}
