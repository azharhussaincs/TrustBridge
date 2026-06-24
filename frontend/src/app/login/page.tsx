'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { SecurityStrip } from '@/components/layout/SecurityStrip';
import { ROLE_ICONS, ROLE_LABELS, getRoleHomePath } from '@/lib/roles';
import { apiUrl } from '@/lib/api/config';
import { getAuthToken, readStoredUser, saveStoredAuth, validateStoredSession } from '@/lib/auth/session';

const ROLE_PREVIEW = [
  { role: 'ADMIN', desc: 'System config & onboarding' },
  { role: 'SUPER_USER', desc: 'Executive updates & oversight' },
  { role: 'TEAM_LEAD', desc: 'Team management & chat' },
  { role: 'TEAM_MANAGER', desc: 'Operational coordination' },
  { role: 'TEAM_MEMBER', desc: 'Secure team messaging' },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    const user = readStoredUser();
    if (!token || !user) return;

    validateStoredSession().then((valid) => {
      if (valid) router.replace(getRoleHomePath(user.role));
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        saveStoredAuth(data.data.token, data.data.user);
        toast.success('Welcome back!');
        router.push(getRoleHomePath(data.data.user.role));
      } else {
        setError(data.message || 'Login failed');
        toast.error(data.message || 'Login failed');
      }
    } catch {
      setError('Connection error. Please try again.');
      toast.error('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden page-shell">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-mesh-dark" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid opacity-30" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px] animate-pulse-soft" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-indigo-600/15 blur-[100px]" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        {/* Left — branding & roles */}
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-12 lg:py-16">
          <div className="animate-slide-up">
            <div className="mb-6 inline-flex items-center gap-4">
              <Image
                src="/opbridge-logo.png"
                alt="OpBridge logo"
                width={112}
                height={112}
                className="h-28 w-28 object-contain"
                priority
              />
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Op<span className="text-blue-400">Bridge</span>
                </h1>
                <p className="text-xs text-slate-400">Secure LAN Communication</p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ROLE_PREVIEW.map(({ role, desc }) => (
                <div key={role} className="feature-tile">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    {ROLE_ICONS[role] ? <span>{ROLE_ICONS[role]}</span> : null}
                    {ROLE_LABELS[role]}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 hidden lg:block">
              <SecurityStrip variant="dark" />
            </div>
          </div>
        </div>

        {/* Right — login form */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-md animate-slide-up">
            <div className="glass-card p-8 [&_.label-text]:text-slate-700">
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your credentials to access your role-based workspace
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <Alert variant="error">{error}</Alert>}

                <Input
                  label="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter username"
                  autoComplete="username"
                  className="input-light"
                />

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter password"
                      autoComplete="current-password"
                      className="input-light pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" fullWidth size="lg" disabled={loading} className="shadow-glow">
                  {loading ? 'Signing in...' : 'Sign In to OpBridge'}
                </Button>
              </form>
            </div>

            <div className="mt-6 lg:hidden">
              <SecurityStrip variant="dark" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
