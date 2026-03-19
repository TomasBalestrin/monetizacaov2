import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import * as authRepo from '@/model/repositories/authRepository';
import * as userRepo from '@/model/repositories/userRepository';
import type { AppRole, UserEntityLink, SelectedEntity } from '@/model/entities/user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  permissions: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isUser: boolean;
  hasPermission: (module: string) => boolean;
  // Entity selection
  entityLinks: UserEntityLink[];
  selectedEntity: SelectedEntity | null;
  isTeamAccount: boolean;
  needsEntitySelection: boolean;
  selectEntity: (entity: SelectedEntity) => void;
  clearSelectedEntity: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStorageKey(userId: string) {
  return `selectedEntity_${userId}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityLinks, setEntityLinks] = useState<UserEntityLink[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

  const fetchUserData = async (userId: string) => {
    try {
      const [userRole, userPermissions, links] = await Promise.all([
        authRepo.fetchUserRole(userId),
        authRepo.fetchUserPermissions(userId),
        userRepo.fetchUserEntityLinks(userId),
      ]);
      setRole(userRole);
      setPermissions(userPermissions);
      setEntityLinks(links);

      // Auto-select if single link
      if (links.length === 1) {
        // We don't have the name here, but we'll set entity_name as empty
        // EntitySelectionScreen or UserDashboard will resolve the name
        const stored = localStorage.getItem(getStorageKey(userId));
        if (stored) {
          try {
            const parsed: SelectedEntity = JSON.parse(stored);
            if (links.some(l => l.entity_id === parsed.entity_id)) {
              setSelectedEntity(parsed);
              return;
            }
          } catch { /* ignore */ }
        }
        // For single link, auto-select with empty name (will be resolved by components)
        setSelectedEntity({
          entity_id: links[0].entity_id,
          entity_type: links[0].entity_type,
          entity_name: '',
        });
      } else if (links.length > 1) {
        // Restore from localStorage
        const stored = localStorage.getItem(getStorageKey(userId));
        if (stored) {
          try {
            const parsed: SelectedEntity = JSON.parse(stored);
            // Validate the stored entity still exists in links
            if (links.some(l => l.entity_id === parsed.entity_id)) {
              setSelectedEntity(parsed);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setPermissions([]);
          setEntityLinks([]);
          setSelectedEntity(null);
        }

        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (user) {
      localStorage.removeItem(getStorageKey(user.id));
    }
    await supabase.auth.signOut();
    setRole(null);
    setPermissions([]);
    setEntityLinks([]);
    setSelectedEntity(null);
  };

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isUser = role === 'user';

  const isTeamAccount = isUser && entityLinks.length > 1;
  const needsEntitySelection = isTeamAccount && selectedEntity === null;

  const selectEntity = useCallback((entity: SelectedEntity) => {
    setSelectedEntity(entity);
    if (user) {
      localStorage.setItem(getStorageKey(user.id), JSON.stringify(entity));
    }
  }, [user]);

  const clearSelectedEntity = useCallback(() => {
    setSelectedEntity(null);
    if (user) {
      localStorage.removeItem(getStorageKey(user.id));
    }
  }, [user]);

  const isSDR = role === 'viewer';
  const SDR_PERMISSIONS = ['sdrs'];
  const isCloser = isUser;
  const CLOSER_PERMISSIONS = ['closers'];

  const hasPermission = (module: string): boolean => {
    if (isAdmin) return true;
    if (isSDR) return SDR_PERMISSIONS.includes(module) || permissions.includes(module);
    if (isCloser) return CLOSER_PERMISSIONS.includes(module) || permissions.includes(module);
    return permissions.includes(module);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        permissions,
        loading,
        signIn,
        signUp,
        signOut,
        isAdmin,
        isManager,
        isUser,
        hasPermission,
        entityLinks,
        selectedEntity,
        isTeamAccount,
        needsEntitySelection,
        selectEntity,
        clearSelectedEntity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
