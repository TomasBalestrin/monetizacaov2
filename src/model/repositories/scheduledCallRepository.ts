import { supabase } from '@/integrations/supabase/client';
import type { ScheduledCall, CreateScheduledCallPayload } from '@/model/entities/scheduledCall';

export async function fetchScheduledCalls(
  sdrId?: string,
  periodStart?: string,
  periodEnd?: string
): Promise<ScheduledCall[]> {
  let query = supabase
    .from('scheduled_calls')
    .select('*, sdr:sdrs(id, name), closer:closers(id, name), funnel:funnels(id, name)')
    .order('scheduled_time', { ascending: true });

  if (sdrId) query = query.eq('sdr_id', sdrId);
  if (periodStart) query = query.gte('scheduled_time', periodStart);
  if (periodEnd) query = query.lte('scheduled_time', periodEnd);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as ScheduledCall[];
}

export async function createScheduledCall(payload: CreateScheduledCallPayload): Promise<ScheduledCall> {
  const { data, error } = await supabase
    .from('scheduled_calls')
    .insert(payload)
    .select('*, sdr:sdrs(id, name), closer:closers(id, name), funnel:funnels(id, name)')
    .single();

  if (error) throw error;
  return data as unknown as ScheduledCall;
}

export async function updateScheduledCall(
  id: string,
  updates: Partial<CreateScheduledCallPayload & { status: string }>
): Promise<ScheduledCall> {
  const { data, error } = await supabase
    .from('scheduled_calls')
    .update(updates)
    .eq('id', id)
    .select('*, sdr:sdrs(id, name), closer:closers(id, name), funnel:funnels(id, name)')
    .single();

  if (error) throw error;
  return data as unknown as ScheduledCall;
}

export async function fetchScheduledCallById(id: string): Promise<ScheduledCall | null> {
  const { data, error } = await supabase
    .from('scheduled_calls')
    .select('*, sdr:sdrs(id, name), closer:closers(id, name), funnel:funnels(id, name)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ScheduledCall | null;
}

export async function fetchScheduledCallsByCloser(
  closerId: string,
  status?: string
): Promise<ScheduledCall[]> {
  let query = supabase
    .from('scheduled_calls')
    .select('*, sdr:sdrs(id, name), closer:closers(id, name), funnel:funnels(id, name)')
    .eq('closer_id', closerId)
    .order('scheduled_time', { ascending: true });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as ScheduledCall[];
}

export async function deleteScheduledCall(id: string): Promise<void> {
  const { error } = await supabase
    .from('scheduled_calls')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
