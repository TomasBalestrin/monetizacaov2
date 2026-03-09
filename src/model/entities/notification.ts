export interface Notification {
  id: string;
  user_id: string;
  type: 'scheduled_call' | 'call_reminder' | 'call_started' | 'call_finished';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
  entity_id?: string;
  entity_type?: string;
}

export interface CreateNotificationPayload {
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  entity_id?: string;
  entity_type?: string;
}
