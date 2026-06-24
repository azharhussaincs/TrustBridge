'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Navbar, PageContainer } from '@/components/layout/Navbar';
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
  const { unreadCount } = useSocket();

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

  const getQuickActions = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { href: '/admin', icon: '⚙️', title: 'Admin Panel', description: 'System overview, hierarchy & audit logs', accent: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' },
          { href: '/admin/users', icon: '👥', title: 'Manage Users', description: 'Create Super Users and Team Leads', accent: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100' },
        ];
      case 'SUPER_USER':
        return [
          { href: '/super-user', icon: '👑', title: 'Executive Panel', description: 'Updates from Team Leads & Managers', accent: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' },
          { href: '/chat', icon: '💬', title: 'Secure Chat', description: 'Message Team Leads and Managers', accent: 'bg-brand-50 text-brand-600 ring-1 ring-brand-100' },
        ];
      case 'TEAM_LEAD':
        return [
          { href: '/team-lead', icon: '🌿', title: 'Team Lead Panel', description: 'Add managers & members to your team', accent: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' },
          { href: '/chat', icon: '💬', title: 'Team Chat', description: 'Chat with leads, managers & members', accent: 'bg-brand-50 text-brand-600 ring-1 ring-brand-100' },
        ];
      case 'TEAM_MANAGER':
        return [
          { href: '/team-manager', icon: '📋', title: 'Manager Panel', description: 'Your operational workspace', accent: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' },
          { href: '/chat', icon: '💬', title: 'Secure Chat', description: 'Encrypted messaging within your team', accent: 'bg-brand-50 text-brand-600 ring-1 ring-brand-100' },
        ];
      case 'TEAM_MEMBER':
        return [
          { href: '/team-member', icon: '👤', title: 'Member Panel', description: 'Your staff workspace', accent: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100' },
          { href: '/chat', icon: '💬', title: 'Secure Chat', description: 'Encrypted messaging within your team', accent: 'bg-brand-50 text-brand-600 ring-1 ring-brand-100' },
        ];
      default:
        return [];
    }
  };

  const getRoleActions = () => {
    const actions = [];
    const home = getRoleHomePath(role);
    if (home !== '/dashboard') {
      actions.push(
        <Button key="panel" onClick={() => router.push(home)} size="sm" className={roleColors?.badge}>
          {getRoleIcon(role)} {getRoleLabel(role)} Panel
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
          <ChatNavBadge count={unreadCount} />
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
            {getRoleIcon(role)} TrustBridge
          </span>
        }
        subtitle={
          <Badge variant="role" role={role} className={roleColors?.badge}>
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
        <RoleHero role={role} name={user.name} username={user.username} />

        <QuickActionGrid actions={getQuickActions()} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2" padding="lg">
            <h3 className="text-lg font-semibold text-white">Your workspace</h3>
            <p className="mt-2 text-sm leading-relaxed text-blue-100/85">
              TrustBridge renders a distinct interface for each role. UI elements you cannot access are hidden —
              enforcing Zero Trust at the presentation layer.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-blue-900/40 p-4 ring-1 ring-blue-400/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-200/80">Display name</p>
                <p className="mt-1 font-medium text-white">{user.name}</p>
              </div>
              <div className="rounded-xl bg-blue-900/40 p-4 ring-1 ring-blue-400/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-200/80">Username</p>
                <p className="mt-1 font-medium text-white">@{user.username}</p>
              </div>
              <div className="rounded-xl bg-blue-900/40 p-4 ring-1 ring-blue-400/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-200/80">Role</p>
                <p className="mt-1 font-medium text-white">{getRoleLabel(role)}</p>
              </div>
              <div className="rounded-xl bg-blue-900/40 p-4 ring-1 ring-blue-400/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-200/80">Chat access</p>
                <p className="mt-1 font-medium text-white">{showChat ? '✅ Enabled' : '🚫 Disabled (Admin)'}</p>
              </div>
            </div>
          </Card>

          <Card padding="lg" className="flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Security status</h3>
              <p className="mt-2 text-sm text-blue-200/80">All traffic encrypted end-to-end over LAN.</p>
            </div>
            <div className="mt-5">
              <SecurityStrip variant="dark" className="justify-start" />
            </div>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
