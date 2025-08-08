import { useState, useCallback } from 'react';

type UseAccountDeletionResult = {
  loading: boolean;
  error: string | null;
  success: boolean;
  deleteAccount: () => Promise<void>;
};

export function useAccountDeletion(): UseAccountDeletionResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const deleteAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error || 'Failed to delete account');
        setSuccess(false);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, success, deleteAccount };
}


