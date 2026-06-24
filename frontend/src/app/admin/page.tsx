'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Navbar, PageContainer } from '@/components/layout/Navbar';
import { RoleHero } from '@/components/layout/RoleHero';
import { SecurityStrip } from '@/components/layout/SecurityStrip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { apiFetch, authHeaders } from '@/lib/api/config';
import { performLogout } from '@/lib/auth/session';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  isOnline: boolean;
  teamId: string | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<{ name: string; username: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalMessages: 0,
    serverUptime: '0h'
  });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    
    toast.success('⚙️ Welcome to Admin Panel');
    setCurrentUser({ name: user.name, username: user.username });
    setAuthReady(true);
    loadDashboard(token);
  }, [router]);

  const loadDashboard = async (token: string) => {
    setDataLoading(true);
    setFetchError('');
    try {
      const response = await apiFetch('/users', {
        headers: authHeaders(token),
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
        const online = data.data.filter((u: User) => u.isOnline).length;
        setStats({
          totalUsers: data.data.length,
          onlineUsers: online,
          totalMessages: 0,
          serverUptime: '2h 15m'
        });
      } else {
        setFetchError(data.message || 'Failed to load dashboard data');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error fetching dashboard data';
      setFetchError(message);
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const buildHierarchy = () => {
    const hierarchy: any = {
      admin: null,
      superUser: null,
      teamLeads: []
    };

    const admin = users.find(u => u.role === 'ADMIN');
    if (admin) {
      hierarchy.admin = admin;
    }

    const superUser = users.find(u => u.role === 'SUPER_USER');
    if (superUser) {
      hierarchy.superUser = superUser;
    }

    const teamLeads = users.filter(u => u.role === 'TEAM_LEAD');
    
    teamLeads.forEach(lead => {
      const managers = users.filter(u => 
        u.role === 'TEAM_MANAGER' && u.teamId === lead.teamId
      );
      
      const members = users.filter(u => 
        u.role === 'TEAM_MEMBER' && u.teamId === lead.teamId
      );
      
      hierarchy.teamLeads.push({
        ...lead,
        managers: managers,
        members: members
      });
    });

    const orphanedManagers = users.filter(u => 
      u.role === 'TEAM_MANAGER' && 
      !teamLeads.some(l => l.teamId === u.teamId)
    );

    const orphanedMembers = users.filter(u => 
      u.role === 'TEAM_MEMBER' && 
      !teamLeads.some(l => l.teamId === u.teamId)
    );

    return { hierarchy, orphanedManagers, orphanedMembers };
  };

  const { hierarchy, orphanedManagers, orphanedMembers } = buildHierarchy();

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', accent: 'slate' as const },
    { label: 'Online Now', value: stats.onlineUsers, icon: '🟢', accent: 'emerald' as const },
    { label: 'Messages', value: stats.totalMessages, icon: '💬', accent: 'blue' as const },
    { label: 'Server Uptime', value: stats.serverUptime, icon: '⏱️', accent: 'violet' as const },
  ];

  if (!authReady) {
    return <LoadingSpinner fullScreen message="Checking access..." />;
  }

  return (
    <div className="page-shell">
      <Navbar variant="admin" title="⚙️ Admin Control Center">
        <Button onClick={() => router.push('/admin/users')} size="sm">
          👥 Manage Users
        </Button>
        <Button onClick={() => router.push('/dashboard')} variant="secondary" size="sm">
          Dashboard
        </Button>
        <Button onClick={() => performLogout()} variant="danger" size="sm">
          Logout
        </Button>
      </Navbar>

      <PageContainer className="space-y-6">
        {fetchError && (
          <Alert variant="error" className="mb-4">
            {fetchError}
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                const token = localStorage.getItem('auth_token');
                if (token) loadDashboard(token);
              }}
            >
              Retry
            </Button>
          </Alert>
        )}

        <RoleHero
          role="ADMIN"
          name={currentUser?.name || 'Admin'}
          username={currentUser?.username}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            dataLoading ? (
              <div key={stat.label} className="h-28 animate-pulse rounded-2xl bg-blue-800/50" />
            ) : (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                accent={stat.accent}
              />
            )
          ))}
        </div>

        <Card className="mb-6">
          <h2 className="heading-card mb-4">
            📊 Organization Hierarchy
          </h2>

          {dataLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner message="Loading organization data..." size="sm" />
            </div>
          ) : (
          <div className="hierarchy-root">
            {hierarchy.admin && (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚙️</span>
                  <span className="hierarchy-title">Admin</span>
                  <span className="hierarchy-subtitle">({hierarchy.admin.name})</span>
                </div>
                <div className="hierarchy-item">
                  {hierarchy.admin.isOnline ? '🟢' : '⚪'} {hierarchy.admin.username}
                </div>
              </div>
            )}

            {hierarchy.superUser && (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👑</span>
                  <span className="hierarchy-title">Super User</span>
                  <span className="hierarchy-subtitle">({hierarchy.superUser.name})</span>
                </div>
                <div className="hierarchy-item">
                  {hierarchy.superUser.isOnline ? '🟢' : '⚪'} {hierarchy.superUser.username}
                </div>
              </div>
            )}

            {hierarchy.teamLeads.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">🌿</span>
                  <span className="hierarchy-title">Team Leads</span>
                  <span className="hierarchy-subtitle">({hierarchy.teamLeads.length})</span>
                </div>
                
                {hierarchy.teamLeads.map((lead: any) => (
                  <div key={lead.id} className="mb-3 pl-8">
                    <div className="text-sm font-medium text-card-body">
                      {lead.isOnline ? '🟢' : '⚪'} {lead.name} ({lead.username})
                    </div>
                    
                    {lead.managers.length > 0 && (
                      <div className="mt-1 pl-6">
                        <div className="hierarchy-nested-label">📋 Team Managers:</div>
                        {lead.managers.map((manager: User) => (
                          <div key={manager.id} className="hierarchy-nested-item">
                            {manager.isOnline ? '🟢' : '⚪'} {manager.name} ({manager.username})
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {lead.members.length > 0 && (
                      <div className="mt-1 pl-6">
                        <div className="hierarchy-nested-label">👤 Team Members:</div>
                        {lead.members.map((member: User) => (
                          <div key={member.id} className="hierarchy-nested-item">
                            {member.isOnline ? '🟢' : '⚪'} {member.name} ({member.username})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {orphanedManagers.length > 0 && (
              <div className="mt-3">
                <div className="hierarchy-warning">
                  ⚠️ Orphaned Team Managers (No Team Lead):
                </div>
                {orphanedManagers.map((user: User) => (
                  <div key={user.id} className="hierarchy-item">
                    {user.isOnline ? '🟢' : '⚪'} {user.name} ({user.username})
                  </div>
                ))}
              </div>
            )}

            {orphanedMembers.length > 0 && (
              <div className="mt-2">
                <div className="hierarchy-warning">
                  ⚠️ Orphaned Team Members (No Team Lead):
                </div>
                {orphanedMembers.map((user: User) => (
                  <div key={user.id} className="hierarchy-item">
                    {user.isOnline ? '🟢' : '⚪'} {user.name} ({user.username})
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="heading-card">📋 Audit Logs</h2>
            <SecurityStrip variant="dark" />
          </div>
          <p className="demo-banner">
            Demo data — real audit logging will appear here once the AuditLog service is enabled (Wave B).
          </p>
          <div className="table-wrap">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: new Date().toLocaleTimeString(), event: 'User logged in', user: 'admin' },
                  { time: new Date().toLocaleTimeString(), event: 'New user created', user: 'admin' },
                  { time: new Date(Date.now() - 300000).toLocaleTimeString(), event: 'File uploaded', user: 'admin' },
                ].map((log, index) => (
                  <tr key={index}>
                    <td>{log.time}</td>
                    <td>{log.event}</td>
                    <td>{log.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </PageContainer>
    </div>
  );
}
