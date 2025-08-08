'use client';

import { useState } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { Button } from '../ui/button';
const IconLogout = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);
import { useRouter } from 'next/navigation';

interface LogoutButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  onLogoutSuccess?: () => void;
  onLogoutError?: (error: string) => void;
}

export function LogoutButton({ 
  variant = 'outline',
  size = 'md',
  showIcon = true,
  onLogoutSuccess,
  onLogoutError
}: LogoutButtonProps) {
  const { signOut, loading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Call server-side logout to clear cookies; tests mock this endpoint
      let serverError: string | undefined;
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          serverError = body?.error || `Logout failed (${res.status})`;
        }
      } catch (e) {
        serverError = e instanceof Error ? e.message : 'Logout request failed';
      }

      const result = await signOut();
      
      if (serverError || result.error) {
        onLogoutError?.(serverError || result.error!);
      } else {
        onLogoutSuccess?.();
        router.replace('/auth/login');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout';
      onLogoutError?.(errorMessage);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isDisabled = loading || isLoggingOut;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isDisabled}
      className="flex items-center gap-2"
      aria-label="Sign out"
    >
      {showIcon && <IconLogout className="h-4 w-4" />}
      {isLoggingOut ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}