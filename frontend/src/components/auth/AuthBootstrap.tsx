'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  clearLegacyAuthStorage,
  clearStoredAuth,
  getAuthToken,
  validateStoredSession,
} from '@/lib/auth/session';

const PUBLIC_PATHS = new Set(['/login']);

/** Validates browser session against the API; clears stale auth when user was deleted or server is down. */
export function AuthBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    clearLegacyAuthStorage();
  }, []);

  useEffect(() => {
    if (PUBLIC_PATHS.has(pathname)) return;

    const token = getAuthToken();
    if (!token) return;

    let cancelled = false;

    const checkSession = () => {
      validateStoredSession().then((valid) => {
        if (cancelled || valid) return;
        clearStoredAuth();
        window.location.assign('/login');
      });
    };

    checkSession();

    const onVisible = () => {
      if (document.visibilityState === 'visible') checkSession();
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

  return null;
}
