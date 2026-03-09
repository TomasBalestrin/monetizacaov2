import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as meetingRepo from '@/model/repositories/meetingRepository';
import { createProfileMap, enrichWithProfiles } from '@/model/services/meetingService';
import type { Meeting, MeetingParticipant, MeetingNote, MeetingActionItem } from '@/model/entities/meeting';

export function useMeetings() {
  return useQuery({
    queryKey: ['meetings'],
    queryFn: meetingRepo.fetchMeetings,
  });
}

export function useMeetingParticipants(meetingId: string | null) {
  return useQuery({
    queryKey: ['meeting-participants', meetingId],
    enabled: !!meetingId,
    queryFn: async () => {
      const { participants, profiles } = await meetingRepo.fetchMeetingParticipantsRaw(meetingId!);
      if (participants.length === 0) return [] as MeetingParticipant[];
      const profileMap = createProfileMap(profiles);
      return enrichWithProfiles(participants, profileMap, 'user_id') as MeetingParticipant[];
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
      return meetingRepo.createMeeting({
        title: input.title,
        description: input.description || '',
        meeting_date: input.meeting_date,
        created_by: user!.id,
        participant_ids: input.participant_ids,
      });
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
      return meetingRepo.updateMeeting(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: meetingRepo.deleteMeeting,
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
      const { notes, profiles } = await meetingRepo.fetchMeetingNotesRaw(meetingId!);
      const profileMap = createProfileMap(profiles);
      return enrichWithProfiles(notes, profileMap, 'created_by') as MeetingNote[];
    },
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { meeting_id: string; content: string }) => {
      return meetingRepo.addNote(input.meeting_id, input.content, user!.id);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-notes', vars.meeting_id] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; meeting_id: string; content: string }) => {
      return meetingRepo.updateNote(input.id, input.content);
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
      return meetingRepo.deleteNote(input.id);
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
      const { items, profiles } = await meetingRepo.fetchActionItemsRaw(meetingId!);
      const profileMap = createProfileMap(profiles);
      return enrichWithProfiles(items, profileMap, 'assigned_to') as MeetingActionItem[];
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
      return meetingRepo.addActionItem({
        meeting_id: input.meeting_id,
        title: input.title,
        assigned_to: input.assigned_to || null,
        due_date: input.due_date || null,
        created_by: user!.id,
      });
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
      return meetingRepo.updateActionItem(id, updates);
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
      return meetingRepo.deleteActionItem(input.id);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-actions', vars.meeting_id] });
    },
  });
}

// --- Profiles list ---

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles-list'],
    queryFn: meetingRepo.fetchProfiles,
  });
}

// Re-export types
export type { Meeting, MeetingParticipant, MeetingNote, MeetingActionItem } from '@/model/entities/meeting';
