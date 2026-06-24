export interface StoredUser {
  id: string;
  username: string;
  name: string;
  role: string;
  teamId?: string | null;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function readStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.role) return null;
    return parsed as StoredUser;
  } catch {
    return null;
  }
}

export function clearStoredAuth(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('auth-changed'));
}

/** Clear session and hard-navigate to login (resets all in-memory UI state). */
export function performLogout(): void {
  clearStoredAuth();
  window.location.assign('/login');
}
