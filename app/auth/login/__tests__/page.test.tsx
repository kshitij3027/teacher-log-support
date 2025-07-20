import { render, screen } from '@testing-library/react';
import LoginPage from '../page';

// Mock the LoginForm component
jest.mock('../../../../components/auth/login-form', () => ({
  LoginForm: () => <div data-testid="login-form">Login Form Component</div>,
}));

// Mock Next.js metadata (it's not used in tests)
jest.mock('next', () => ({
  ...jest.requireActual('next'),
  metadata: {},
}));

describe('LoginPage', () => {
  test('should render login page with proper structure', () => {
    render(<LoginPage />);
    
    // Check that the login form is rendered
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  test('should have proper layout and styling classes', () => {
    const { container } = render(<LoginPage />);
    
    // Check for main container with proper classes
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center');
  });

  test('should display registration information', () => {
    render(<LoginPage />);
    
    // Check for the registration info text
    expect(
      screen.getByText(/Don't have an account\? You'll be automatically registered when you sign in for the first time\./)
    ).toBeInTheDocument();
  });

  test('should have proper responsive design classes', () => {
    const { container } = render(<LoginPage />);
    
    // Check for responsive padding classes
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('py-12', 'px-4', 'sm:px-6', 'lg:px-8');
    
    // Check for responsive width classes
    const contentContainer = mainContainer.querySelector('.max-w-md');
    expect(contentContainer).toBeInTheDocument();
    expect(contentContainer).toHaveClass('w-full');
  });

  test('should have proper dark mode support', () => {
    const { container } = render(<LoginPage />);
    
    // Check for dark mode classes
    const backgroundContainer = container.firstChild as HTMLElement;
    expect(backgroundContainer).toHaveClass('bg-gray-50', 'dark:bg-gray-900');
    
    const formContainer = container.querySelector('.bg-white');
    expect(formContainer).toHaveClass('dark:bg-gray-800');
  });

  test('should have proper card styling', () => {
    const { container } = render(<LoginPage />);
    
    const cardContainer = container.querySelector('.bg-white');
    expect(cardContainer).toHaveClass('shadow-lg', 'rounded-lg', 'p-8');
  });
});