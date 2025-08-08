'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogoutButton } from '../../components/auth/logout-button';

interface UserResponse {
  user?: { id: string; email?: string };
  error?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/user', { cache: 'no-store' });
        if (!cancelled) {
          if (res.ok) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            router.replace('/auth/login');
          }
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          router.replace('/auth/login');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {loading ? (
        <div>Loading...</div>
      ) : isAuthenticated ? (
        <div>
          <LogoutButton variant="outline" />
        </div>
      ) : (
        <div className="text-muted-foreground">Redirecting to login...</div>
      )}
      <div className="text-muted-foreground">Welcome to your dashboard.</div>
    </main>
  );
}


