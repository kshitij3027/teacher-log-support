import { renderHook, act } from '@testing-library/react';

// Hook to be implemented later (Task 6.11)
// eslint-disable-next-line import/no-unresolved
import { useAccountDeletion } from '../use-account-deletion';

global.fetch = jest.fn();

describe('useAccountDeletion', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it('exposes loading, error, and success flags', () => {
    const { result } = renderHook(() => useAccountDeletion());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(false);
  });

  it('calls API and sets success on 200 response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    const { result } = renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result.current.success).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  it('sets error on non-200 response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'Failed' }) });
    const { result } = renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(result.current.success).toBe(false);
    expect(result.current.error).toBe('Failed');
    expect(result.current.loading).toBe(false);
  });
});


