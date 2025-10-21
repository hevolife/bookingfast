import { supabase } from '../lib/supabase';

export interface TeamRole {
  id: string;
  name: string;
  description: string;
  level: number;
  permissions: string[];
}

export interface TeamMember {
  id: string;
  owner_id: string;
  user_id: string;
  email: string;
  role_name: string;
  firstname?: string;
  lastname?: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface TeamInvitation {
  id: string;
  owner_id: string;
  email: string;
  role_name: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
}

export const TEAM_ROLES: Record<string, TeamRole> = {
  owner: {
    id: 'owner',
    name: 'Propriétaire',
    description: 'Accès complet à toutes les fonctionnalités',
    level: 100,
    permissions: ['*']
  },
  admin: {
    id: 'admin',
    name: 'Administrateur',
    description: 'Gestion complète sauf suppression du compte',
    level: 90,
    permissions: [
      'bookings:*',
      'services:*',
      'clients:*',
      'settings:read',
      'settings:write',
      'team:read',
      'team:write',
      'reports:read',
      'unavailabilities:*',
      'pos:*',
      'email_workflows:*'
    ]
  },
  manager: {
    id: 'manager',
    name: 'Manager',
    description: 'Gestion des réservations et des clients',
    level: 70,
    permissions: [
      'bookings:*',
      'services:read',
      'clients:*',
      'settings:read',
      'team:read',
      'reports:read',
      'unavailabilities:*',
      'pos:read',
      'pos:write',
      'email_workflows:read'
    ]
  },
  employee: {
    id: 'employee',
    name: 'Employé',
    description: 'Consultation et création de réservations',
    level: 50,
    permissions: [
      'bookings:read',
      'bookings:create',
      'bookings:update_own',
      'services:read',
      'clients:read',
      'clients:create',
      'settings:read',
      'unavailabilities:read',
      'unavailabilities:create_own',
      'pos:read',
      'email_workflows:read'
    ]
  },
  viewer: {
    id: 'viewer',
    name: 'Observateur',
    description: 'Consultation uniquement',
    level: 10,
    permissions: [
      'bookings:read',
      'services:read',
      'clients:read',
      'settings:read',
      'unavailabilities:read'
    ]
  }
};

export function hasPermission(userRole: string, permission: string): boolean {
  const role = TEAM_ROLES[userRole];
  if (!role) return false;
  
  if (role.permissions.includes('*')) return true;
  
  if (role.permissions.includes(permission)) return true;
  
  const [resource, action] = permission.split(':');
  const wildcardPermission = `${resource}:*`;
  return role.permissions.includes(wildcardPermission);
}

export function canManageRole(userRole: string, targetRole: string): boolean {
  const userRoleData = TEAM_ROLES[userRole];
  const targetRoleData = TEAM_ROLES[targetRole];
  
  if (!userRoleData || !targetRoleData) return false;
  
  return userRoleData.level > targetRoleData.level;
}

export function getAvailableRoles(userRole: string): TeamRole[] {
  const userRoleData = TEAM_ROLES[userRole];
  if (!userRoleData) return [];
  
  return Object.values(TEAM_ROLES).filter(role => 
    role.level < userRoleData.level
  );
}

export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    if (user.id === userId) {
      return 'owner';
    }

    const { data: member } = await supabase
      .from('team_members')
      .select('role_name')
      .eq('user_id', userId)
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .single();

    return member?.role_name || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

export async function checkPermission(userId: string, permission: string): Promise<boolean> {
  const role = await getUserRole(userId);
  if (!role) return false;
  return hasPermission(role, permission);
}

export function getRoleHierarchy(): TeamRole[] {
  return Object.values(TEAM_ROLES).sort((a, b) => b.level - a.level);
}

export function getRoleByName(roleName: string): TeamRole | undefined {
  return TEAM_ROLES[roleName];
}

export function isHigherRole(role1: string, role2: string): boolean {
  const r1 = TEAM_ROLES[role1];
  const r2 = TEAM_ROLES[role2];
  
  if (!r1 || !r2) return false;
  return r1.level > r2.level;
}

export function getHighestRole(roles: string[]): string | null {
  if (roles.length === 0) return null;
  
  const roleEntries = roles
    .map(roleName => [roleName, TEAM_ROLES[roleName]] as const)
    .filter(([, role]) => role !== undefined);
  
  if (roleEntries.length === 0) return null;
  
  for (const [, role] of roleEntries.reverse()) {
    if (role.level === Math.max(...roleEntries.map(([, r]) => r.level))) {
      return role.id;
    }
  }
  
  return roleEntries[0][0];
}
