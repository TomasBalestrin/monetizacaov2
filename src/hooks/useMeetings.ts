import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Meeting {
  id: string;
  title: string;
  description: string;
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

export function useMeetings() {
  return useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false });
      if (error) throw error;
      return data as Meeting[];
    },
  });
}

export function useMeetingParticipants(meetingId: string | null) {
  return useQuery({
    queryKey: ['meeting-participants', meetingId],
    enabled: !!meetingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId!);
      if (error) throw error;

      // Fetch profile emails for participants
      const userIds = data.map((p) => p.user_id);
      if (userIds.length === 0) return [] as MeetingParticipant[];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p.email]));
      return data.map((p) => ({
        ...p,
        profiles: profileMap.has(p.user_id) ? { email: profileMap.get(p.user_id)! } : undefined,
      })) as MeetingParticipant[];
    },
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      meeting_date: string;
      participant_ids: string[];
    }) => {
      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          title: input.title,
          description: input.description || '',
          meeting_date: input.meeting_date,
          created_by: user!.id,
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

      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      description?: string;
      meeting_date?: string;
      status?: string;
    }) => {
      const { id, ...updates } = input;
      const { error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meetings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

// --- Notes ---

export function useMeetingNotes(meetingId: string | null) {
  return useQuery({
    queryKey: ['meeting-notes', meetingId],
    enabled: !!meetingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('meeting_id', meetingId!)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const creatorIds = [...new Set(data.map((n) => n.created_by))];
      const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', creatorIds);
      const profileMap = new Map((profiles || []).map((p) => [p.id, p.email]));

      return data.map((n) => ({
        ...n,
        profiles: profileMap.has(n.created_by) ? { email: profileMap.get(n.created_by)! } : undefined,
      })) as MeetingNote[];
    },
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { meeting_id: string; content: string }) => {
      const { error } = await supabase.from('meeting_notes').insert({
        meeting_id: input.meeting_id,
        content: input.content,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-notes', vars.meeting_id] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; meeting_id: string }) => {
      const { error } = await supabase.from('meeting_notes').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-notes', vars.meeting_id] });
    },
  });
}

// --- Action Items ---

export function useActionItems(meetingId: string | null) {
  return useQuery({
    queryKey: ['meeting-actions', meetingId],
    enabled: !!meetingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_action_items')
        .select('*')
        .eq('meeting_id', meetingId!)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const assignedIds = data.map((a) => a.assigned_to).filter(Boolean) as string[];
      const { data: profiles } = assignedIds.length > 0
        ? await supabase.from('profiles').select('id, email').in('id', assignedIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p) => [p.id, p.email]));

      return data.map((a) => ({
        ...a,
        profiles: a.assigned_to && profileMap.has(a.assigned_to) ? { email: profileMap.get(a.assigned_to)! } : undefined,
      })) as MeetingActionItem[];
    },
  });
}

export function useAddActionItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      meeting_id: string;
      title: string;
      assigned_to?: string;
      due_date?: string;
    }) => {
      const { error } = await supabase.from('meeting_action_items').insert({
        meeting_id: input.meeting_id,
        title: input.title,
        assigned_to: input.assigned_to || null,
        due_date: input.due_date || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-actions', vars.meeting_id] });
    },
  });
}

export function useUpdateActionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      meeting_id: string;
      status?: string;
      title?: string;
    }) => {
      const { id, meeting_id, ...updates } = input;
      const { error } = await supabase
        .from('meeting_action_items')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-actions', vars.meeting_id] });
    },
  });
}

export function useDeleteActionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; meeting_id: string }) => {
      const { error } = await supabase.from('meeting_action_items').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-actions', vars.meeting_id] });
    },
  });
}

// --- Profiles list for participant selection ---

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, email');
      if (error) throw error;
      return data as { id: string; email: string }[];
    },
  });
}
