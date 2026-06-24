'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getRoleHomePath } from '@/lib/roles';
import { getAuthToken, readStoredUser, validateStoredSession } from '@/lib/auth/session';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    const user = readStoredUser();
    if (!token || !user) {
      router.replace('/login');
      return;
    }

    validateStoredSession().then((valid) => {
      if (valid) router.replace(getRoleHomePath(user.role));
      else router.replace('/login');
    });
  }, [router]);

  return <LoadingSpinner fullScreen message="Loading..." />;
}
