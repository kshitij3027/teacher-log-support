'use client';

import { useState } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { Button } from '../ui/button';
import { LogOut } from 'lucide-react';

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

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const result = await signOut();
      
      if (result.error) {
        onLogoutError?.(result.error);
      } else {
        onLogoutSuccess?.();
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
      {showIcon && <LogOut className="h-4 w-4" />}
      {isLoggingOut ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}