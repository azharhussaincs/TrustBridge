'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperUserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    
    if (userData.role !== 'SUPER_USER') {
      router.push('/dashboard');
      return;
    }
    
    setLoading(false);
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#1a1a1a' }}>
      <div style={{ color: '#fbbf24' }}>Loading Super User Dashboard...</div>
    </div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a1a', color: '#f3f4f6' }}>
      <nav style={{ backgroundColor: '#0f0f0f', borderBottom: '2px solid #fbbf24', padding: '0 20px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', height: '64px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>👑</span>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>Super User Dashboard</h1>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ color: '#fbbf24', fontSize: '14px' }}>👤 {user?.name}</span>
            <button onClick={() => router.push('/chat')} style={{ padding: '8px 16px', backgroundColor: '#fbbf24', color: '#1a1a1a', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              💬 Chat
            </button>
            <button onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('user'); router.push('/login'); }} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ backgroundColor: '#2d2d2d', borderRadius: '8px', padding: '24px', marginBottom: '24px', borderLeft: '4px solid #fbbf24' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#fbbf24' }}>Welcome, {user?.name}! 👑</h2>
          <p style={{ color: '#d1d5db', marginTop: '8px' }}>Role: <strong style={{ color: '#fbbf24' }}>SUPER USER</strong></p>
          <p style={{ color: '#d1d5db' }}>You receive updates from Team Leads and Team Managers.</p>
          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#374151', borderRadius: '4px', fontSize: '14px', color: '#fbbf24' }}>
            ⚠️ Note: As Super User, you can only communicate with Team Leads and Team Managers.
          </div>
        </div>

        <div style={{ backgroundColor: '#2d2d2d', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fbbf24', marginBottom: '16px' }}>📨 Recent Updates</h3>
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>
            No updates yet. Updates from Team Leads and Managers will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
