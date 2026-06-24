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
import { clearStoredAuth, getAuthToken, performLogout, readStoredUser } from '@/lib/auth/session';

export default function TeamManagerDashboard() {
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
    if (userData.role !== 'TEAM_MANAGER') {
      router.replace('/dashboard');
      return;
    }
    setUser(userData);
    setAuthReady(true);
  }, [router]);

  if (!authReady || !user) {
    return <LoadingSpinner fullScreen message="Loading Team Manager workspace..." />;
  }

  return (
    <div className={cn('page-shell', ROLE_SHELL_BG.TEAM_MANAGER)}>
      <Navbar
        title={
          <span className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Team Manager Dashboard
          </span>
        }
        subtitle={<span>Operational lead · {user.name}</span>}
      >
        <Button onClick={() => router.push('/chat')} size="sm" className="bg-blue-600 hover:bg-blue-700">
          💬 Team Chat
          <ChatNavBadge count={unreadCount} />
        </Button>
        <Button onClick={() => router.push('/dashboard')} variant="secondary" size="sm">
          Home
        </Button>
        <Button onClick={() => performLogout()} variant="danger" size="sm">
          Logout
        </Button>
      </Navbar>

      <PageContainer className="space-y-6">
        <RoleHero role="TEAM_MANAGER" name={user.name} username={user.username} />

        <QuickActionGrid
          actions={[
            {
              href: '/chat',
              icon: '💬',
              title: 'Secure Chat',
              description: 'Message your Team Lead and team members',
              accent: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card padding="lg">
            <h3 className="text-lg font-semibold text-white">Your responsibilities</h3>
            <p className="mt-2 text-sm text-blue-100/85">
              As Team Manager you coordinate day-to-day work within your team. Chat with your Team Lead,
              fellow managers, and team members — all within SRS-defined boundaries.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-blue-100/90">
              <li>✅ Chat with Team Lead (your team)</li>
              <li>✅ Chat with Team Members (your team)</li>
              <li>✅ Chat with Super User for escalations</li>
              <li>🚫 No user management access</li>
            </ul>
          </Card>

          <Card padding="lg" className="flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Security</h3>
              <p className="mt-2 text-sm text-blue-200/80">AES-GCM encrypted messaging over LAN.</p>
            </div>
            <SecurityStrip className="mt-5 justify-start" />
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
