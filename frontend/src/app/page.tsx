'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getRoleHomePath } from '@/lib/roles';
import { getAuthToken, readStoredUser } from '@/lib/auth/session';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    const user = readStoredUser();
    if (token && user) {
      router.replace(getRoleHomePath(user.role));
    } else {
      router.replace('/login');
    }
  }, [router]);

  return <LoadingSpinner fullScreen message="Loading..." />;
}
