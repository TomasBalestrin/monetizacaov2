import { supabase } from '@/integrations/supabase/client';
import type { Meeting, MeetingNote, MeetingActionItem } from '@/model/entities/meeting';
import type { Profile } from '@/model/entities/user';

export async function fetchMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('id, title, description, meeting_date, status, created_by, created_at, updated_at')
    .order('meeting_date', { ascending: false });
  if (error) throw error;
  return data as Meeting[];
}

export async function fetchMeetingParticipantsRaw(meetingId: string): Promise<{
  participants: { id: string; meeting_id: string; user_id: string; created_at: string }[];
  profiles: Profile[];
}> {
  const { data, error } = await supabase
    .from('meeting_participants')
    .select('id, meeting_id, user_id, created_at')
    .eq('meeting_id', meetingId);
  if (error) throw error;

  const userIds = data.map((p) => p.user_id);
  if (userIds.length === 0) return { participants: data, profiles: [] };

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', userIds);

  return { participants: data, profiles: (profiles || []) as Profile[] };
}

export async function createMeeting(input: {
  title: string;
  description: string;
  meeting_date: string;
  created_by: string;
  participant_ids: string[];
}): Promise<Meeting> {
  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      title: input.title,
      description: input.description,
      meeting_date: input.meeting_date,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.participant_ids.length > 0) {
    const { error: pError } = await supabase
      .from('meeting_participants')
      .insert(
        input.participant_ids.map((uid) => ({
          meeting_id: meeting.id,
          user_id: uid,
        }))
      );
    if (pError) throw pError;
  }

  return meeting as Meeting;
}

export async function updateMeeting(
  id: string,
  updates: Partial<Pick<Meeting, 'title' | 'description' | 'meeting_date' | 'status'>>
): Promise<void> {
  const { error } = await supabase
    .from('meetings')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('meetings').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchMeetingNotesRaw(meetingId: string): Promise<{
  notes: Omit<MeetingNote, 'profiles'>[];
  profiles: Profile[];
}> {
  const { data, error } = await supabase
    .from('meeting_notes')
    .select('id, meeting_id, content, created_by, created_at, updated_at')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const creatorIds = [...new Set(data.map((n) => n.created_by))];
  const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', creatorIds);

  return { notes: data, profiles: (profiles || []) as Profile[] };
}

export async function addNote(meetingId: string, content: string, createdBy: string): Promise<void> {
  const { error } = await supabase.from('meeting_notes').insert({
    meeting_id: meetingId,
    content,
    created_by: createdBy,
  });
  if (error) throw error;
}

export async function updateNote(id: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('meeting_notes')
    .update({ content })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('meeting_notes').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchActionItemsRaw(meetingId: string): Promise<{
  items: Omit<MeetingActionItem, 'profiles'>[];
  profiles: Profile[];
}> {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .select('id, meeting_id, title, assigned_to, due_date, status, created_by, created_at, updated_at')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const assignedIds = data.map((a) => a.assigned_to).filter(Boolean) as string[];
  const { data: profiles } = assignedIds.length > 0
    ? await supabase.from('profiles').select('id, email').in('id', assignedIds)
    : { data: [] };

  return { items: data, profiles: (profiles || []) as Profile[] };
}

export async function addActionItem(input: {
  meeting_id: string;
  title: string;
  assigned_to: string | null;
  due_date: string | null;
  created_by: string;
}): Promise<void> {
  const { error } = await supabase.from('meeting_action_items').insert(input);
  if (error) throw error;
}

export async function updateActionItem(
  id: string,
  updates: Partial<Pick<MeetingActionItem, 'status' | 'title'>>
): Promise<void> {
  const { error } = await supabase
    .from('meeting_action_items')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteActionItem(id: string): Promise<void> {
  const { error } = await supabase.from('meeting_action_items').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('id, email');
  if (error) throw error;
  return data as Profile[];
}
