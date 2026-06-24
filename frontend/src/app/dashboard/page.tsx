'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Navbar, PageContainer } from '@/components/layout/Navbar';
import { OpBridgeLogo } from '@/components/layout/OpBridgeLogo';
import { RoleHero } from '@/components/layout/RoleHero';
import { QuickActionGrid } from '@/components/layout/QuickActionGrid';
import { SecurityStrip } from '@/components/layout/SecurityStrip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSocket } from '@/context/SocketContext';
import { ChatNavBadge } from '@/components/ui/ChatNavBadge';
import {
  canRoleChat,
  getRoleHomePath,
  getRoleIcon,
  getRoleLabel,
  ROLE_COLORS,
  ROLE_SHELL_BG,
  type UserRole,
} from '@/lib/roles';
import { cn } from '@/lib/utils';
import { clearStoredAuth, getAuthToken, performLogout, readStoredUser } from '@/lib/auth/session';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const { totalUnreadCount } = useSocket();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const userData = readStoredUser();
    if (!userData) {
      clearStoredAuth();
      router.replace('/login');
      return;
    }

    setUser(userData);
    setAuthReady(true);
    toast.success(`Welcome ${userData.name}!`);
  }, [router]);

  if (!authReady || !user) {
    return <LoadingSpinner fullScreen message="Loading your workspace..." />;
  }

  const role = user.role as UserRole;
  const roleColors = ROLE_COLORS[role];
  const shellBg = ROLE_SHELL_BG[role] ?? 'bg-slate-50';
  const showChat = canRoleChat(role);

  const accountAction = {
    href: '/profile',
    icon: '🔑',
    title: 'My Account',
    description: 'Update your name, username, and password',
    accent: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  };

  const getQuickActions = () => {
    switch (role) {
      case 'ADMIN':
        return [
          accountAction,
          { href: '/admin', icon: '⚙️', title: 'Admin Panel', description: 'System overview, hierarchy & audit logs', accent: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' },
          { href: '/admin/users', icon: '👥', title: 'Manage Users', description: 'Create Executive Users and Team Leads', accent: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100' },
        ];
      case 'SUPER_USER':
        return [
          accountAction,
          { href: '/super-user', icon: '👑', title: 'Executive Panel', description: 'Organization tree & team overview', accent: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' },
          { href: '/chat', icon: '💬', title: 'Secure Chat', description: 'Message Leads, Managers & Members', accent: 'bg-brand-50 text-brand-600 ring-1 ring-brand-100' },
        ];
      case 'TEAM_LEAD':
        return [
          accountAction,
          { href: '/team-lead', icon: '👥', title: 'Team Lead Panel', description: 'Add managers & members to your team', accent: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' },
          { href: '/chat', icon: '💬', title: 'Team Chat', description: 'Chat with leads, managers & members', accent: 'bg-brand-50 text-brand-600 ring-1 ring-brand-100' },
        ];
      case 'TEAM_MANAGER':
        return [
          accountAction,
          { href: '/team-manager', icon: '📋', title: 'Manager Panel', description: 'Your operational workspace', accent: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' },
          { href: '/chat', icon: '💬', title: 'Secure Chat', description: 'Encrypted messaging within your team', accent: 'bg-brand-50 text-brand-600 ring-1 ring-brand-100' },
        ];
      case 'TEAM_MEMBER':
        return [
          accountAction,
          { href: '/team-member', icon: '👤', title: 'Member Panel', description: 'Your staff workspace', accent: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100' },
          { href: '/chat', icon: '💬', title: 'Secure Chat', description: 'Encrypted messaging within your team', accent: 'bg-brand-50 text-brand-600 ring-1 ring-brand-100' },
        ];
      default:
        return [accountAction];
    }
  };

  const getRoleActions = () => {
    const actions = [];
    const home = getRoleHomePath(role);
    if (home !== '/dashboard') {
      actions.push(
        <Button key="panel" onClick={() => router.push(home)} size="sm" className={roleColors?.badge}>
          {getRoleIcon(role) ? `${getRoleIcon(role)} ` : ''}{getRoleLabel(role)} Panel
        </Button>
      );
    }
    if (role === 'ADMIN') {
      actions.push(
        <Button key="users" onClick={() => router.push('/admin/users')} size="sm" className="bg-violet-500 hover:bg-violet-600">
          👥 Manage Users
        </Button>
      );
    }
    if (showChat) {
      actions.push(
        <Button key="chat" onClick={() => router.push('/chat')} size="sm">
          💬 Chat
          <ChatNavBadge count={totalUnreadCount} />
        </Button>
      );
    }
    return actions;
  };

  return (
    <div className={cn('page-shell', shellBg)}>
      <Navbar
        title={
          <span className="flex items-center gap-2">
            <OpBridgeLogo size={28} />
            OpBridge
          </span>
        }
        subtitle={
          <Badge variant="role" role={role}>
            {getRoleLabel(role)}
          </Badge>
        }
      >
        {getRoleActions()}
        <Button
          onClick={() => {
            toast.success('Logged out successfully');
            performLogout();
          }}
          variant="danger"
          size="sm"
        >
          Logout
        </Button>
      </Navbar>

      <PageContainer className="space-y-6">
        <RoleHero role={role} name={user.name} username={user.username} showBrandLogo />

        <QuickActionGrid actions={getQuickActions()} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card variant="light" className="lg:col-span-2" padding="lg">
            <h3 className="text-lg font-semibold text-slate-900">Your workspace</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              OpBridge renders a distinct interface for each role. UI elements you cannot access are hidden —
              enforcing Zero Trust at the presentation layer.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Display name</p>
                <p className="mt-1 font-medium text-slate-900">{user.name}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Username</p>
                <p className="mt-1 font-medium text-slate-900">@{user.username}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</p>
                <p className="mt-1 font-medium text-slate-900">{getRoleLabel(role)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chat access</p>
                <p className="mt-1 font-medium text-slate-900">{showChat ? '✅ Enabled' : '🚫 Disabled (Admin)'}</p>
              </div>
            </div>
          </Card>

          <Card variant="light" padding="lg" className="flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Security status</h3>
              <p className="mt-2 text-sm text-slate-600">All traffic encrypted end-to-end over LAN.</p>
            </div>
            <div className="mt-5">
              <SecurityStrip variant="light" className="justify-start" />
            </div>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
