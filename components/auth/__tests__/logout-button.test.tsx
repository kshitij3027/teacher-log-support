import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogoutButton } from '../logout-button';

// Mock the useAuth hook
const mockSignOut = jest.fn();
const mockUseAuth = {
  signOut: mockSignOut,
  loading: false,
  user: null,
  error: null,
  isAuthenticated: false,
  signIn: jest.fn(),
};

jest.mock('../../../hooks/use-auth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock the UI button component
jest.mock('../../ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  LogOut: ({ className }: any) => <span className={className} data-testid="logout-icon">⬅</span>,
}));

describe('LogoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue({ success: true });
    mockUseAuth.loading = false;
  });

  test('should render logout button with default props', () => {
    render(<LogoutButton />);
    
    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Sign out');
    expect(screen.getByTestId('logout-icon')).toBeInTheDocument();
  });

  test('should call signOut when clicked', async () => {
    render(<LogoutButton />);
    
    const button = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  test('should show loading state during logout', async () => {
    // Mock a slow logout
    mockSignOut.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );
    
    render(<LogoutButton />);
    
    const button = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(button);
    
    // Should show loading text immediately
    expect(button).toHaveTextContent('Signing out...');
    expect(button).toBeDisabled();
    
    // Wait for logout to complete
    await waitFor(() => {
      expect(button).toHaveTextContent('Sign out');
      expect(button).not.toBeDisabled();
    });
  });

  test('should be disabled when auth is loading', () => {
    mockUseAuth.loading = true;
    
    render(<LogoutButton />);
    
    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button).toBeDisabled();
  });

  test('should call onLogoutSuccess callback on successful logout', async () => {
    const onLogoutSuccess = jest.fn();
    mockSignOut.mockResolvedValue({ success: true });
    
    render(<LogoutButton onLogoutSuccess={onLogoutSuccess} />);
    
    const button = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(onLogoutSuccess).toHaveBeenCalledTimes(1);
    });
  });

  test('should call onLogoutError callback on logout failure', async () => {
    const onLogoutError = jest.fn();
    const errorMessage = 'Logout failed';
    mockSignOut.mockResolvedValue({ error: errorMessage });
    
    render(<LogoutButton onLogoutError={onLogoutError} />);
    
    const button = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(onLogoutError).toHaveBeenCalledWith(errorMessage);
    });
  });

  test('should handle network errors during logout', async () => {
    const onLogoutError = jest.fn();
    mockSignOut.mockRejectedValue(new Error('Network error'));
    
    render(<LogoutButton onLogoutError={onLogoutError} />);
    
    const button = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(onLogoutError).toHaveBeenCalledWith('Network error');
    });
  });

  test('should hide icon when showIcon is false', () => {
    render(<LogoutButton showIcon={false} />);
    
    expect(screen.queryByTestId('logout-icon')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('Sign out');
  });

  test('should apply custom variant and size props', () => {
    render(<LogoutButton variant="ghost" size="sm" />);
    
    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button).toBeInTheDocument();
  });
});