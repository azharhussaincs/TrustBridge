'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isOnline: boolean;
  teamId: string | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetchUsers(token);
    fetchStats(token);
  }, []);

  const fetchUsers = async (token: string) => {
    try {
      const response = await fetch('http://192.168.18.139:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (token: string) => {
    try {
      const usersRes = await fetch('http://192.168.18.139:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      
      if (usersData.success) {
        const online = usersData.data.filter((u: any) => u.isOnline).length;
        setStats({
          totalUsers: usersData.data.length,
          onlineUsers: online,
          totalMessages: 0,
          serverUptime: '2h 15m'
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'ADMIN': return '⚙️';
      case 'SUPER_USER': return '👑';
      case 'TEAM_LEAD': return '🌿';
      case 'TEAM_MANAGER': return '📋';
      case 'TEAM_MEMBER': return '👤';
      default: return '👤';
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'ADMIN': return '#1e293b';
      case 'SUPER_USER': return '#fbbf24';
      case 'TEAM_LEAD': return '#10b981';
      case 'TEAM_MANAGER': return '#3b82f6';
      case 'TEAM_MEMBER': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  // Build organization hierarchy
  const buildHierarchy = () => {
    const hierarchy: any = {
      admin: null,
      superUser: null,
      teamLeads: []
    };

    // Find Admin
    const admin = users.find(u => u.role === 'ADMIN');
    if (admin) {
      hierarchy.admin = admin;
    }

    // Find Super User
    const superUser = users.find(u => u.role === 'SUPER_USER');
    if (superUser) {
      hierarchy.superUser = superUser;
    }

    // Find all Team Leads
    const teamLeads = users.filter(u => u.role === 'TEAM_LEAD');
    
    teamLeads.forEach(lead => {
      // Find Team Managers under this lead (same teamId)
      const managers = users.filter(u => 
        u.role === 'TEAM_MANAGER' && u.teamId === lead.teamId
      );
      
      // Find Team Members under this lead (same teamId)
      const members = users.filter(u => 
        u.role === 'TEAM_MEMBER' && u.teamId === lead.teamId
      );
      
      hierarchy.teamLeads.push({
        ...lead,
        managers: managers,
        members: members
      });
    });

    // Find orphaned managers (no team lead)
    const orphanedManagers = users.filter(u => 
      u.role === 'TEAM_MANAGER' && 
      !teamLeads.some(l => l.teamId === u.teamId)
    );

    // Find orphaned members (no team lead)
    const orphanedMembers = users.filter(u => 
      u.role === 'TEAM_MEMBER' && 
      !teamLeads.some(l => l.teamId === u.teamId)
    );

    return { hierarchy, orphanedManagers, orphanedMembers };
  };

  const { hierarchy, orphanedManagers, orphanedMembers } = buildHierarchy();

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading Admin Dashboard...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <Toaster position="top-right" />
      
      <nav style={{ backgroundColor: '#1e293b', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', padding: '0 20px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', height: '64px', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>⚙️ Admin Panel</h1>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button onClick={() => router.push('/admin/users')} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              👥 Manage Users
            </button>
            <button onClick={() => router.push('/dashboard')} style={{ padding: '8px 16px', backgroundColor: '#64748b', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Dashboard
            </button>
            <button onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('user'); router.push('/login'); }} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '14px', color: '#6b7280' }}>Total Users</h3>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>{stats.totalUsers}</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '14px', color: '#6b7280' }}>Online Users</h3>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>{stats.onlineUsers}</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '14px', color: '#6b7280' }}>Total Messages</h3>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.totalMessages}</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '14px', color: '#6b7280' }}>Server Uptime</h3>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.serverUptime}</p>
          </div>
        </div>

        {/* Organization Hierarchy */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
            📊 Organization Hierarchy
          </h2>
          
          <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>
            {/* Admin */}
            {hierarchy.admin && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>⚙️</span>
                  <span style={{ fontWeight: 'bold', color: '#1e293b' }}>Admin</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>({hierarchy.admin.name})</span>
                </div>
                <div style={{ paddingLeft: '32px', fontSize: '13px', color: '#4b5563' }}>
                  {hierarchy.admin.isOnline ? '🟢' : '⚪'} {hierarchy.admin.email}
                </div>
              </div>
            )}

            {/* Super User */}
            {hierarchy.superUser && (
              <div style={{ marginBottom: '8px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>👑</span>
                  <span style={{ fontWeight: 'bold', color: '#92400e' }}>Super User</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>({hierarchy.superUser.name})</span>
                </div>
                <div style={{ paddingLeft: '32px', fontSize: '13px', color: '#4b5563' }}>
                  {hierarchy.superUser.isOnline ? '🟢' : '⚪'} {hierarchy.superUser.email}
                </div>
              </div>
            )}

            {/* Team Leads with their team */}
            {hierarchy.teamLeads.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🌿</span>
                  <span style={{ fontWeight: 'bold', color: '#065f46' }}>Team Leads</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>({hierarchy.teamLeads.length})</span>
                </div>
                
                {hierarchy.teamLeads.map((lead: any, index: number) => (
                  <div key={lead.id} style={{ paddingLeft: '32px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#065f46' }}>
                      {lead.isOnline ? '🟢' : '⚪'} {lead.name} ({lead.email})
                    </div>
                    
                    {/* Team Managers under this Team Lead */}
                    {lead.managers.length > 0 && (
                      <div style={{ paddingLeft: '30px', marginTop: '4px' }}>
                        <div style={{ fontSize: '13px', color: '#3b82f6' }}>📋 Team Managers:</div>
                        {lead.managers.map((manager: User) => (
                          <div key={manager.id} style={{ paddingLeft: '24px', fontSize: '13px', color: '#4b5563' }}>
                            {manager.isOnline ? '🟢' : '⚪'} {manager.name} ({manager.email})
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Team Members under this Team Lead */}
                    {lead.members.length > 0 && (
                      <div style={{ paddingLeft: '30px', marginTop: '4px' }}>
                        <div style={{ fontSize: '13px', color: '#8b5cf6' }}>👤 Team Members:</div>
                        {lead.members.map((member: User) => (
                          <div key={member.id} style={{ paddingLeft: '24px', fontSize: '13px', color: '#4b5563' }}>
                            {member.isOnline ? '🟢' : '⚪'} {member.name} ({member.email})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Orphaned Users (if any) */}
            {orphanedManagers.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '13px', color: '#ef4444' }}>
                  ⚠️ Orphaned Team Managers (No Team Lead):
                </div>
                {orphanedManagers.map((user: User) => (
                  <div key={user.id} style={{ paddingLeft: '32px', fontSize: '13px', color: '#4b5563' }}>
                    {user.isOnline ? '🟢' : '⚪'} {user.name} ({user.email})
                  </div>
                ))}
              </div>
            )}

            {orphanedMembers.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '13px', color: '#ef4444' }}>
                  ⚠️ Orphaned Team Members (No Team Lead):
                </div>
                {orphanedMembers.map((user: User) => (
                  <div key={user.id} style={{ paddingLeft: '32px', fontSize: '13px', color: '#4b5563' }}>
                    {user.isOnline ? '🟢' : '⚪'} {user.name} ({user.email})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Audit Logs */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>📋 Audit Logs</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280' }}>Time</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280' }}>Event</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280' }}>User</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: new Date().toLocaleTimeString(), event: 'User logged in', user: 'admin@company.com' },
                  { time: new Date().toLocaleTimeString(), event: 'New user created', user: 'admin@company.com' },
                  { time: new Date(Date.now() - 300000).toLocaleTimeString(), event: 'File uploaded', user: 'admin@company.com' },
                ].map((log, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{log.time}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{log.event}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{log.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
