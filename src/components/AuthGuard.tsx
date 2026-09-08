'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { UserProfile } from '@/types/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Exclude login page from redirect loop
    if (pathname === '/login') {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      setAuthorized(false);
      router.replace('/login');
    } else {
      setAuthorized(true);
    }
    setChecking(false);
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#070b0e] text-zinc-400 font-mono flex items-center justify-center text-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>// VERIFYING_SESSION_IDENTITY...</span>
        </div>
      </div>
    );
  }

  if (!authorized && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
