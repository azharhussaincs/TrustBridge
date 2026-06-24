export type UserRole =
  | 'ADMIN'
  | 'SUPER_USER'
  | 'TEAM_LEAD'
  | 'TEAM_MANAGER'
  | 'TEAM_MEMBER';

export const ROLE_ICONS: Record<UserRole, string> = {
  ADMIN: '⚙️',
  SUPER_USER: '👑',
  TEAM_LEAD: '',
  TEAM_MANAGER: '📋',
  TEAM_MEMBER: '👤',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  SUPER_USER: 'Executive User',
  TEAM_LEAD: 'Team Lead',
  TEAM_MANAGER: 'Team Manager',
  TEAM_MEMBER: 'Team Member',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: 'System configuration & user onboarding. No chat access.',
  SUPER_USER: 'Executive — oversees all teams via chat and file sharing.',
  TEAM_LEAD: 'Manages team staff, chats across leads and own team.',
  TEAM_MANAGER: 'Operational lead — chats with Team Lead and team members.',
  TEAM_MEMBER: 'Standard staff — chats within team boundaries.',
};

export const ROLE_PERMISSIONS: Record<UserRole, string> = {
  ADMIN: 'Create Executive Users & Team Leads · View audit logs · Full system control',
  SUPER_USER: 'Chat with Team Leads, Managers & Members · Group chat · No user management',
  TEAM_LEAD: 'CRUD own Team Managers & Members · Chat with leads & own team · Group chat',
  TEAM_MANAGER: 'Chat with Team Lead & own team members',
  TEAM_MEMBER: 'Chat with Team Manager & team members',
};

export const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string; badge: string }> = {
  ADMIN: {
    bg: 'bg-slate-800',
    text: 'text-slate-800',
    border: 'border-slate-700',
    badge: 'bg-slate-800 text-white',
  },
  SUPER_USER: {
    bg: 'bg-amber-400',
    text: 'text-amber-600',
    border: 'border-amber-400',
    badge: 'bg-amber-400 text-slate-900',
  },
  TEAM_LEAD: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-700',
    border: 'border-emerald-500',
    badge: 'bg-emerald-500 text-white',
  },
  TEAM_MANAGER: {
    bg: 'bg-blue-500',
    text: 'text-blue-700',
    border: 'border-blue-400',
    badge: 'bg-blue-500 text-white',
  },
  TEAM_MEMBER: {
    bg: 'bg-violet-500',
    text: 'text-violet-700',
    border: 'border-violet-400',
    badge: 'bg-violet-500 text-white',
  },
};

export const ROLE_GRADIENTS: Record<UserRole, string> = {
  ADMIN: 'from-slate-800 via-slate-700 to-slate-900',
  SUPER_USER: 'from-amber-500 via-amber-600 to-slate-900',
  TEAM_LEAD: 'from-emerald-600 via-emerald-700 to-emerald-950',
  TEAM_MANAGER: 'from-blue-600 via-blue-700 to-indigo-950',
  TEAM_MEMBER: 'from-violet-600 via-violet-700 to-purple-950',
};

export const ROLE_SHELL_BG: Record<UserRole, string> = {
  ADMIN: 'page-shell',
  SUPER_USER: 'page-shell',
  TEAM_LEAD: 'page-shell',
  TEAM_MANAGER: 'page-shell',
  TEAM_MEMBER: 'page-shell',
};

export const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  ADMIN: 'bg-slate-200 text-slate-800 ring-1 ring-slate-300',
  SUPER_USER: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300',
  TEAM_LEAD: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
  TEAM_MANAGER: 'bg-blue-100 text-blue-800 ring-1 ring-blue-300',
  TEAM_MEMBER: 'bg-violet-100 text-violet-800 ring-1 ring-violet-300',
};

export function getRoleIcon(role: string): string {
  return ROLE_ICONS[role as UserRole] ?? '🔐';
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}

export function getRoleBadgeStyle(role: string): string {
  return ROLE_BADGE_STYLES[role as UserRole] ?? 'bg-slate-100 text-slate-700';
}

export function canRoleChat(role: string): boolean {
  return role !== 'ADMIN';
}

export function getRoleHomePath(role: string): string {
  switch (role) {
    case 'ADMIN': return '/admin';
    case 'SUPER_USER': return '/super-user';
    case 'TEAM_LEAD': return '/team-lead';
    case 'TEAM_MANAGER': return '/team-manager';
    case 'TEAM_MEMBER': return '/team-member';
    default: return '/dashboard';
  }
}
