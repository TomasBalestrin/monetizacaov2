import type { Profile } from '@/model/entities/user';

/**
 * Cria um mapa de profiles por ID para lookups rápidos
 */
export function createProfileMap(profiles: Profile[]): Map<string, string> {
  return new Map(profiles.map(p => [p.id, p.email]));
}

/**
 * Enriquece uma lista de entidades com dados de profile (email)
 * Usado para participants, notes, e action items
 */
export function enrichWithProfiles<T extends Record<string, unknown>>(
  items: T[],
  profileMap: Map<string, string>,
  userIdField: string
): (T & { profiles?: { email: string } })[] {
  return items.map(item => {
    const userId = item[userIdField] as string | null;
    return {
      ...item,
      profiles: userId && profileMap.has(userId)
        ? { email: profileMap.get(userId)! }
        : undefined,
    };
  });
}
