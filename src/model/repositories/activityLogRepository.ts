import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogEntry {
  id: string;
  type: 'closer_metric' | 'sdr_metric' | 'goal';
  user_email: string;
  description: string;
  created_at: string;
}

export async function fetchActivityLog(
  periodStart?: string,
  periodEnd?: string,
  limit = 200
): Promise<ActivityLogEntry[]> {
  const results: ActivityLogEntry[] = [];

  // Query all sources in parallel
  const [metricsRes, sdrMetricsRes, goalsRes] = await Promise.all([
    fetchCloserMetricLogs(periodStart, periodEnd),
    fetchSdrMetricLogs(periodStart, periodEnd),
    fetchGoalLogs(periodStart, periodEnd),
  ]);

  results.push(...metricsRes, ...sdrMetricsRes, ...goalsRes);

  // Sort by created_at DESC and limit
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return results.slice(0, limit);
}

async function fetchCloserMetricLogs(periodStart?: string, periodEnd?: string): Promise<ActivityLogEntry[]> {
  let query = supabase
    .from('metrics')
    .select('id, calls, sales, revenue, entries, created_at, created_by, closer:closers(name), funnel:funnels(name), product:products(name)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (periodStart) query = query.gte('created_at', `${periodStart}T00:00:00`);
  if (periodEnd) query = query.lte('created_at', `${periodEnd}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Get user emails for created_by
  const userIds = [...new Set(data.map(d => d.created_by).filter(Boolean))] as string[];
  const emailMap = await fetchEmailMap(userIds);

  return data.map(d => {
    const closerName = (d.closer as any)?.name || '?';
    const funnelName = (d.funnel as any)?.name;
    const productName = (d.product as any)?.name;

    const parts = [];
    if (d.calls) parts.push(`${d.calls} calls`);
    if (d.sales) parts.push(`${d.sales} vendas`);
    if (d.revenue) parts.push(`R$ ${Number(d.revenue).toLocaleString('pt-BR')}`);
    if (d.entries) parts.push(`R$ ${Number(d.entries).toLocaleString('pt-BR')} entradas`);
    const details = parts.length > 0 ? parts.join(', ') : 'dados';

    const context = [funnelName, productName].filter(Boolean).join(' / ');

    return {
      id: `metric-${d.id}`,
      type: 'closer_metric' as const,
      user_email: d.created_by ? (emailMap.get(d.created_by) || d.created_by) : 'Sistema',
      description: `Adicionou métrica de ${closerName}: ${details}${context ? ` (${context})` : ''}`,
      created_at: d.created_at,
    };
  });
}

async function fetchSdrMetricLogs(periodStart?: string, periodEnd?: string): Promise<ActivityLogEntry[]> {
  let query = supabase
    .from('sdr_metrics')
    .select('id, activated, scheduled, attended, sales, funnel, created_at, created_by, sdr:sdrs(name, type)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (periodStart) query = query.gte('created_at', `${periodStart}T00:00:00`);
  if (periodEnd) query = query.lte('created_at', `${periodEnd}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map(d => d.created_by).filter(Boolean))] as string[];
  const emailMap = await fetchEmailMap(userIds);

  return data.map(d => {
    const sdrName = (d.sdr as any)?.name || '?';
    const sdrType = (d.sdr as any)?.type === 'social_selling' ? 'SS' : 'SDR';

    const parts = [];
    if (d.activated) parts.push(`${d.activated} ativados`);
    if (d.scheduled) parts.push(`${d.scheduled} agendados`);
    if (d.attended) parts.push(`${d.attended} realizados`);
    if (d.sales) parts.push(`${d.sales} vendas`);
    const details = parts.length > 0 ? parts.join(', ') : 'dados';

    return {
      id: `sdr-metric-${d.id}`,
      type: 'sdr_metric' as const,
      user_email: d.created_by ? (emailMap.get(d.created_by) || d.created_by) : 'Sistema',
      description: `Adicionou métrica ${sdrType} de ${sdrName}: ${details}${d.funnel ? ` (${d.funnel})` : ''}`,
      created_at: d.created_at,
    };
  });
}

async function fetchGoalLogs(periodStart?: string, periodEnd?: string): Promise<ActivityLogEntry[]> {
  let query = supabase
    .from('goals')
    .select('id, entity_type, target_value, metric_key, created_at, created_by')
    .order('created_at', { ascending: false })
    .limit(100);

  if (periodStart) query = query.gte('created_at', `${periodStart}T00:00:00`);
  if (periodEnd) query = query.lte('created_at', `${periodEnd}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map(d => d.created_by).filter(Boolean))] as string[];
  const emailMap = await fetchEmailMap(userIds);

  return data.map(d => ({
    id: `goal-${d.id}`,
    type: 'goal' as const,
    user_email: d.created_by ? (emailMap.get(d.created_by) || d.created_by) : 'Sistema',
    description: `Definiu meta ${d.metric_key || ''} para ${d.entity_type || 'entidade'}: ${d.target_value}`,
    created_at: d.created_at,
  }));
}

// Cache email lookups within a request
async function fetchEmailMap(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const { data } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', userIds);

  const map = new Map<string, string>();
  if (data) {
    for (const p of data) {
      map.set(p.id, p.email);
    }
  }
  return map;
}
