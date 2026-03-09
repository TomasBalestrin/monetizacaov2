import type { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];

export interface UserWithRole {
  id: string;
  email: string;
  role: AppRole | null;
  permissions: string[];
  created_at: string;
}

export interface UserEntityLink {
  id: string;
  user_id: string;
  entity_type: 'closer' | 'sdr';
  entity_id: string;
  created_at: string;
}

export interface CloserForLinking {
  id: string;
  name: string;
  squad_id: string;
  squads: { name: string } | null;
}

export interface SDRForLinking {
  id: string;
  name: string;
  type: string;
}

export interface Profile {
  id: string;
  email: string;
}

export interface SelectedEntity {
  entity_id: string;
  entity_type: 'closer' | 'sdr';
  entity_name: string;
}
