import { jwtDecode } from 'jwt-decode';

/** Papéis de realm_access.roles do access token (o id token não traz papéis). Token ausente ou ilegível → []. */
export function extrairRoles(accessToken: string | null | undefined): string[] {
  if (!accessToken) return [];
  try {
    const roles = jwtDecode<{ realm_access?: { roles?: unknown } }>(accessToken).realm_access?.roles;
    return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [];
  } catch {
    return [];
  }
}
