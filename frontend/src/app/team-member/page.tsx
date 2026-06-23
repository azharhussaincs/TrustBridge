'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar, PageContainer } from '@/components/layout/Navbar';
import { RoleHero } from '@/components/layout/RoleHero';
import { QuickActionGrid } from '@/components/layout/QuickActionGrid';
import { SecurityStrip } from '@/components/layout/SecurityStrip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSocket } from '@/context/SocketContext';
import { ChatNavBadge } from '@/components/ui/ChatNavBadge';
import { ROLE_SHELL_BG } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { clearStoredAuth, getAuthToken, readStoredUser } from '@/lib/auth/session';

export default function TeamMemberDashboard() {
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
    if (userData.role !== 'TEAM_MEMBER') {
      router.replace('/dashboard');
      return;
    }
    setUser(userData);
    setAuthReady(true);
  }, [router]);

  if (!authReady || !user) {
    return <LoadingSpinner fullScreen message="Loading Team Member workspace..." />;
  }

  return (
    <div className={cn('page-shell', ROLE_SHELL_BG.TEAM_MEMBER)}>
      <Navbar
        title={
          <span className="flex items-center gap-2">
            <span className="text-2xl">👤</span>
            Team Member Dashboard
          </span>
        }
        subtitle={<span>Staff workspace · {user.name}</span>}
      >
        <Button onClick={() => router.push('/chat')} size="sm" className="bg-violet-600 hover:bg-violet-700">
          💬 Team Chat
          <ChatNavBadge count={unreadCount} />
        </Button>
        <Button onClick={() => router.push('/dashboard')} variant="secondary" size="sm">
          Home
        </Button>
        <Button
          onClick={() => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth-changed'));
            router.push('/login');
          }}
          variant="danger"
          size="sm"
        >
          Logout
        </Button>
      </Navbar>

      <PageContainer className="space-y-6">
        <RoleHero role="TEAM_MEMBER" name={user.name} username={user.username} />

        <QuickActionGrid
          actions={[
            {
              href: '/chat',
              icon: '💬',
              title: 'Secure Chat',
              description: 'Message your Team Lead, Manager, and teammates',
              accent: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100',
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card padding="lg">
            <h3 className="text-lg font-semibold text-white">Your access</h3>
            <p className="mt-2 text-sm text-blue-100/85">
              Team Members communicate within their assigned team. You can reach your Team Lead,
              Team Manager, and fellow members — plus the Super User when needed.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-blue-100/90">
              <li>✅ Chat with Team Lead & Manager</li>
              <li>✅ Chat with teammates (same team)</li>
              <li>✅ Escalate to Super User</li>
              <li>🚫 No admin or user management</li>
            </ul>
          </Card>

          <Card padding="lg" className="flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Security</h3>
              <p className="mt-2 text-sm text-blue-200/80">End-to-end LAN messaging with encrypted file sharing.</p>
            </div>
            <SecurityStrip className="mt-5 justify-start" />
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
