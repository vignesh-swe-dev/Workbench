import type { Role } from './types.ts';

export type Permission =
  | 'org:update'
  | 'org:delete'
  | 'org:transfer_ownership'
  | 'members:invite'
  | 'members:update_role'
  | 'members:remove'
  | 'members:view'
  | 'projects:create'
  | 'projects:update'
  | 'projects:delete'
  | 'projects:archive'
  | 'projects:view'
  | 'tasks:create'
  | 'tasks:update'
  | 'tasks:delete'
  | 'tasks:assign'
  | 'tasks:view'
  | 'comments:create'
  | 'comments:delete'
  | 'releases:create'
  | 'releases:update'
  | 'analytics:view'
  | 'integrations:manage';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'org:update',
    'org:delete',
    'org:transfer_ownership',
    'members:invite',
    'members:update_role',
    'members:remove',
    'members:view',
    'projects:create',
    'projects:update',
    'projects:delete',
    'projects:archive',
    'projects:view',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'tasks:assign',
    'tasks:view',
    'comments:create',
    'comments:delete',
    'releases:create',
    'releases:update',
    'analytics:view',
    'integrations:manage',
  ],
  admin: [
    'org:update',
    'members:invite',
    'members:update_role',
    'members:remove',
    'members:view',
    'projects:create',
    'projects:update',
    'projects:delete',
    'projects:archive',
    'projects:view',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'tasks:assign',
    'tasks:view',
    'comments:create',
    'comments:delete',
    'releases:create',
    'releases:update',
    'analytics:view',
    'integrations:manage',
  ],
  member: [
    'members:view',
    'projects:create',
    'projects:update',
    'projects:view',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'tasks:assign',
    'tasks:view',
    'comments:create',
    'comments:delete',
    'releases:create',
    'releases:update',
    'analytics:view',
  ],
  guest: [
    'members:view',
    'projects:view',
    'tasks:view',
    'comments:create',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function canManageRole(actorRole: Role, targetCurrentRole: Role, targetNewRole: Role): boolean {
  if (actorRole === 'owner') {
    // Owner can change anyone except transferring ownership via regular role update
    return targetCurrentRole !== 'owner' && targetNewRole !== 'owner';
  }
  if (actorRole === 'admin') {
    // Admins cannot alter owners or promote anyone to owner/admin
    return targetCurrentRole !== 'owner' && targetCurrentRole !== 'admin' && targetNewRole !== 'owner' && targetNewRole !== 'admin';
  }
  return false;
}
