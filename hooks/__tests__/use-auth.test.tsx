import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../use-auth';

// Mock Supabase client
const mockSignInWithOtp = jest.fn();
const mockSignOut = jest.fn();
const mockGetUser = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

// Provide default successful mock responses
mockGetSession.mockResolvedValue({ 
  data: { session: null }, 
  error: null 
});
mockSignInWithOtp.mockResolvedValue({ 
  data: {}, 
  error: null 
});
mockSignOut.mockResolvedValue({ 
  data: {}, 
  error: null 
});
mockOnAuthStateChange.mockReturnValue({ 
  data: { subscription: { unsubscribe: jest.fn() } } 
});

jest.mock('../../lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      signOut: mockSignOut,
      getUser: mockGetUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockGetSession.mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    });
    mockSignInWithOtp.mockResolvedValue({ 
      data: {}, 
      error: null 
    });
    mockSignOut.mockResolvedValue({ 
      data: {}, 
      error: null 
    });
    mockOnAuthStateChange.mockReturnValue({ 
      data: { subscription: { unsubscribe: jest.fn() } } 
    });
  });

  test('should export useAuth hook', () => {
    expect(typeof useAuth).toBe('function');
  });

  test('should provide initial auth state', async () => {
    const { result } = renderHook(() => useAuth());
    
    // Wait for initial auth state to be set
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have the expected state structure
    expect(result.current).toMatchObject({
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false,
    });
    
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
  });

  test('should call getSession on mount', async () => {
    renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });
  });

  test('should set up auth state listener', () => {
    renderHook(() => useAuth());
    
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });

  test('should handle signIn correctly', async () => {
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const response = await result.current.signIn('test@example.com');
      expect(response).toEqual({ success: true });
    });

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: {
        emailRedirectTo: 'http://localhost/auth/callback',
      },
    });
  });

  test('should handle signOut correctly', async () => {
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const response = await result.current.signOut();
      expect(response).toEqual({ success: true });
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  test('should handle signIn errors correctly', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Invalid email' } 
    });

    const { result } = renderHook(() => useAuth());
    
    // Wait for initialization to complete
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Test signIn with error
    const response = await result.current.signIn('invalid@example.com');
    expect(response).toEqual({ error: 'Invalid email' });
  });

  test('should handle signOut errors correctly', async () => {
    mockSignOut.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Sign out failed' } 
    });

    const { result } = renderHook(() => useAuth());
    
    // Wait for initialization to complete
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Test signOut with error
    const response = await result.current.signOut();
    expect(response).toEqual({ error: 'Sign out failed' });
  });

  test('should clean up subscription on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockOnAuthStateChange.mockReturnValue({ 
      data: { subscription: { unsubscribe: mockUnsubscribe } } 
    });

    const { unmount } = renderHook(() => useAuth());
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  test('should update isAuthenticated based on user state', async () => {
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // When user is null, isAuthenticated should be false
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('should handle session initialization errors', async () => {
    const errorMessage = 'Session error';
    // Set the mock before rendering the hook
    mockGetSession.mockResolvedValue({ 
      data: { session: null }, 
      error: { message: errorMessage } 
    });

    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.error).toBe(errorMessage);
  });

  describe('Logout Functionality', () => {
    test('should call Supabase signOut when logout is triggered', async () => {
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Call signOut
      await act(async () => {
        const response = await result.current.signOut();
        expect(response).toEqual({ success: true });
      });

      expect(mockSignOut).toHaveBeenCalled();
    });

    test('should handle logout when already signed out', async () => {
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // User should already be null
      expect(result.current.user).toBe(null);

      // Logout should still work without errors
      await act(async () => {
        const response = await result.current.signOut();
        expect(response).toEqual({ success: true });
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(result.current.user).toBe(null);
    });

    test('should clear error state when logout succeeds', async () => {
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate successful logout clearing error
      await act(async () => {
        const response = await result.current.signOut();
        expect(response).toEqual({ success: true });
      });

      expect(result.current.error).toBe(null);
    });


    test('should handle SIGNED_OUT auth state change event', async () => {
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate SIGNED_OUT event
      await act(async () => {
        const mockCallback = mockOnAuthStateChange.mock.calls[0][0];
        mockCallback('SIGNED_OUT', null);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});