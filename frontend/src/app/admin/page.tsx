'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalMessages: 0,
    serverUptime: '0h'
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    
    fetchStats(token);
    fetchLogs(token);
  }, []);

  const fetchStats = async (token: string) => {
    try {
      const usersRes = await fetch('http://localhost:5000/api/users', {
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
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (token: string) => {
    setLogs([
      { time: new Date().toLocaleTimeString(), event: 'User logged in', user: 'admin@company.com' },
      { time: new Date().toLocaleTimeString(), event: 'New user created', user: 'teamlead@company.com' },
      { time: new Date(Date.now() - 300000).toLocaleTimeString(), event: 'File uploaded', user: 'admin@company.com' },
    ]);
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading Admin Dashboard...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
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
                {logs.map((log, index) => (
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
