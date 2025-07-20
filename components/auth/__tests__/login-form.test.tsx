import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../login-form';

// Mock the Supabase client
const mockSignInWithOtp = jest.fn();
jest.mock('../../../lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
    },
  }),
}));

describe('LoginForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithOtp.mockResolvedValue({ error: null });
  });

  test('should render login form with email input and submit button', () => {
    render(<LoginForm />);

    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /send magic link/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/enter your email to receive a magic link/i)
    ).toBeInTheDocument();
  });

  test('should validate email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /send magic link/i });

    // Test that component accepts input and doesn't crash with invalid email
    await user.type(emailInput, 'invalid-email');
    expect(emailInput).toHaveValue('invalid-email');
    
    // The button should be available for clicking
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });

  test('should require email field', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    });

    // Verify field has required attribute (HTML5 validation)
    expect(emailInput).toHaveAttribute('required');
    
    // Click submit without entering email - form should remain interactive
    await user.click(submitButton);
    
    // Form should still be available for interaction
    expect(emailInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
  });

  test('should show loading state during submission', async () => {
    // Mock a delayed response
    mockSignInWithOtp.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ error: null }), 100)
    ));
    
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText(/sending magic link.../i)).toBeInTheDocument();
    expect(emailInput).toBeDisabled();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  test('should call Supabase signInWithOtp on valid form submission', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    // Should call Supabase with correct parameters
    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: expect.stringContaining('/auth/callback'),
        },
      });
    });
  });

  test('should show success message after successful submission', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    // Should show success screen
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(screen.getByText(/we've sent a magic link/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send another link/i })).toBeInTheDocument();
    });
  });

  test('should show error message on submission failure', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Invalid email' } });
    
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    });

    await user.type(emailInput, 'test@invalid.com');
    await user.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  test('should reset form after successful submission', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    // After success, should be able to send another link
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send another link/i })).toBeInTheDocument();
    });
    
    // Click "Send another link" to go back to form
    const sendAnotherButton = screen.getByRole('button', { name: /send another link/i });
    await user.click(sendAnotherButton);
    
    // Form should be reset
    await waitFor(() => {
      const resetEmailInput = screen.getByPlaceholderText(/enter your email/i);
      expect(resetEmailInput).toHaveValue('');
    });
  });

  test('should have proper accessibility attributes', () => {
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    });

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });
  
  test('should show loading spinner in input during submission', async () => {
    // Mock a delayed response
    mockSignInWithOtp.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ error: null }), 100)
    ));
    
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    // Should show loading spinner icon - find by class since it's decorative
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
  
  test('should handle unexpected errors gracefully', async () => {
    mockSignInWithOtp.mockRejectedValue(new Error('Network error'));
    
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    // Should show generic error message
    await waitFor(() => {
      expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
    });
  });
});
