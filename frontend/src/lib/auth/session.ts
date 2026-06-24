import { apiUrl } from '@/lib/api/config';

export interface StoredUser {
  id: string;
  username: string;
  name: string;
  role: string;
  teamId?: string | null;
}

const AUTH_TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';

function authStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

/** Drop old localStorage sessions so reopening the browser always requires login. */
export function clearLegacyAuthStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAuthToken(): string | null {
  return authStorage()?.getItem(AUTH_TOKEN_KEY) ?? null;
}

export function readStoredUser(): StoredUser | null {
  try {
    const raw = authStorage()?.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.role) return null;
    return parsed as StoredUser;
  } catch {
    return null;
  }
}

export function saveStoredAuth(token: string, user: StoredUser): void {
  const storage = authStorage();
  if (!storage) return;
  storage.setItem(AUTH_TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('auth-changed'));
}

export function updateStoredUser(user: StoredUser): void {
  const storage = authStorage();
  if (!storage) return;
  storage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('auth-changed'));
}

export function clearStoredAuth(): void {
  const storage = authStorage();
  if (!storage) return;
  storage.removeItem(AUTH_TOKEN_KEY);
  storage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('auth-changed'));
}

/** Clear session and hard-navigate to login (resets all in-memory UI state). */
export function performLogout(): void {
  clearStoredAuth();
  window.location.assign('/login');
}

/** Confirm token is still valid on the server (user exists, server reachable). */
export async function validateStoredSession(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch(apiUrl('/auth/verify'), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      clearStoredAuth();
      return false;
    }

    const data = await response.json();
    if (data.success && data.data?.id) {
      const current = readStoredUser();
      updateStoredUser({
        id: data.data.id,
        username: data.data.username ?? current?.username ?? '',
        name: data.data.name ?? current?.name ?? '',
        role: data.data.role ?? current?.role ?? '',
        teamId: data.data.teamId ?? current?.teamId ?? null,
      });
    }

    return true;
  } catch {
    clearStoredAuth();
    return false;
  }
}
