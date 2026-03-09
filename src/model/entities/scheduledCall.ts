export interface ScheduledCall {
  id: string;
  sdr_id: string;
  closer_id: string;
  funnel_id: string;
  client_name: string;
  client_phone: string;
  scheduled_time: string;
  status: 'scheduled' | 'in_progress' | 'done' | 'cancelled';
  created_at: string;
  updated_at: string;
  sdr?: { id: string; name: string };
  closer?: { id: string; name: string };
  funnel?: { id: string; name: string };
}

export interface CreateScheduledCallPayload {
  sdr_id: string;
  closer_id: string;
  funnel_id: string;
  client_name: string;
  client_phone: string;
  scheduled_time: string;
}
