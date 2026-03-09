import type { UserWithRole, UserEntityLink, CloserForLinking, SDRForLinking } from '@/model/entities/user';

interface RawProfile {
  id: string;
  email: string;
  created_at: string;
}

interface RawRole {
  id: string;
  user_id: string;
  role: string;
}

interface RawPermission {
  id: string;
  user_id: string;
  module: string;
}

/**
 * Combina dados de profiles, roles e permissions em UserWithRole[]
 */
export function combineUserData(
  profiles: RawProfile[],
  roles: RawRole[],
  permissions: RawPermission[]
): UserWithRole[] {
  return profiles.map(profile => {
    const userRole = roles.find(r => r.user_id === profile.id);
    const userPerms = permissions.filter(p => p.user_id === profile.id);

    return {
      id: profile.id,
      email: profile.email,
      role: (userRole?.role as UserWithRole['role']) || null,
      permissions: userPerms.map(p => p.module),
      created_at: profile.created_at,
    };
  });
}

/**
 * Resolve os entity links de um usuário em nomes legíveis
 */
export function resolveUserEntityLinks(
  userId: string,
  entityLinks: UserEntityLink[],
  closers: CloserForLinking[],
  sdrs: SDRForLinking[]
): { type: string; name: string; id: string }[] {
  const userLinks = entityLinks.filter(l => l.user_id === userId);

  return userLinks.map(link => {
    if (link.entity_type === 'closer') {
      const closer = closers.find(c => c.id === link.entity_id);
      return {
        type: 'closer',
        name: closer?.name || 'Closer desconhecido',
        id: link.entity_id,
      };
    } else {
      const sdr = sdrs.find(s => s.id === link.entity_id);
      return {
        type: 'sdr',
        name: sdr?.name || 'SDR desconhecido',
        id: link.entity_id,
      };
    }
  });
}
