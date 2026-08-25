import type { RoleT } from '@/lib/database.types';

export const usernameToEmail = (u: string) =>
  `${u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')}@balsabha.local`;

export const isVistarScope = (r: RoleT) =>
  r === 'super_admin' || r === 'agresar' || r === 'nirikshak';

export const canCancelSession = (r: RoleT) =>
  r === 'super_admin' || r === 'nirikshak';

export class ForbiddenError extends Error {
  constructor(message = '403 Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
