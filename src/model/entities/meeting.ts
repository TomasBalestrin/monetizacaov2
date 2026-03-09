export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  created_at: string;
  profiles?: { email: string };
}

export interface MeetingNote {
  id: string;
  meeting_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  profiles?: { email: string };
}

export interface MeetingActionItem {
  id: string;
  meeting_id: string;
  title: string;
  assigned_to: string | null;
  due_date: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  profiles?: { email: string };
}
