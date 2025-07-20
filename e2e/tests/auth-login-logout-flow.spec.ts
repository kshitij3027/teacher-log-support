import { test, expect } from '@playwright/test';
import { AuthHelpers, MockHelpers, TEST_DATA } from '../fixtures/test-helpers';

test.describe('Complete Login & Logout Flow E2E Tests', () => {
  let authHelpers: AuthHelpers;
  let mockHelpers: MockHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    mockHelpers = new MockHelpers(page);
  });

  test.afterEach(async ({ page }) => {
    await mockHelpers.resetMocks();
  });

  test.describe('Full Authentication Flow', () => {
    test('should complete full login flow and display success state', async ({ page }) => {
      // Mock successful magic link sending
      await page.route('**/api/auth/magic-link', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Magic link sent' })
        });
      });

      // Navigate to login and complete form
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm(TEST_DATA.validEmail);
      
      // Verify loading state appears
      await authHelpers.verifyLoadingState();
      
      // Verify success state
      await authHelpers.verifyLoginSuccess();
      
      // Verify success elements
      await expect(page.getByText(/check your email/i)).toBeVisible();
      await expect(page.getByText(/we've sent a magic link to test@example.com/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send another link/i })).toBeVisible();
    });

    test('should handle complete magic link authentication flow', async ({ page }) => {
      // Mock the complete authentication flow
      await page.route('**/api/auth/magic-link', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Magic link sent' })
        });
      });

      // Mock auth callback success
      await page.route('**/auth/callback**', async (route) => {
        await route.fulfill({
          status: 302,
          headers: {
            'Location': '/dashboard'
          }
        });
      });

      // Mock authenticated user state
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-id',
              email: TEST_DATA.validEmail,
              created_at: new Date().toISOString()
            }
          })
        });
      });

      // Complete login form
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm(TEST_DATA.validEmail);
      await authHelpers.verifyLoginSuccess();

      // Simulate clicking magic link (navigate to callback)
      await page.goto('/auth/callback?token=test-token&type=magiclink');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      
      // Should show authenticated content
      await expect(page.getByRole('button', { name: /sign out|logout/i })).toBeVisible();
    });

    test('should prevent access to protected routes without authentication', async ({ page }) => {
      // Mock unauthenticated state
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not authenticated' })
        });
      });

      const protectedRoutes = [
        '/dashboard',
        '/incidents/new',
        '/onboarding'
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should redirect to login
        await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 });
        
        // Should show login form
        await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      }
    });
  });

  test.describe('Login to Logout Complete Flow', () => {
    test('should complete full authentication cycle', async ({ page }) => {
      // Step 1: Login flow
      await page.route('**/api/auth/magic-link', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm(TEST_DATA.validEmail);
      await authHelpers.verifyLoginSuccess();

      // Step 2: Simulate successful authentication
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-id',
              email: TEST_DATA.validEmail,
              created_at: new Date().toISOString()
            }
          })
        });
      });

      // Navigate to dashboard (simulate successful login callback)
      await page.goto('/dashboard');
      await expect(page.getByRole('button', { name: /sign out|logout/i })).toBeVisible();

      // Step 3: Logout flow
      await page.route('**/api/auth/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
      await logoutButton.click();

      // Should redirect back to login
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
      
      // Should show login form again
      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      
      // Step 4: Verify session is cleared
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not authenticated' })
        });
      });

      // Try to access protected route - should be redirected
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should maintain proper state throughout authentication cycle', async ({ page }) => {
      // Track the complete flow with state changes
      const states: string[] = [];

      // Monitor navigation changes
      page.on('response', (response) => {
        if (response.url().includes('/api/auth/')) {
          states.push(`API: ${response.url()} - ${response.status()}`);
        }
      });

      // Start unauthenticated
      await page.route('**/api/auth/user', async (route) => {
        states.push('State: Unauthenticated');
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not authenticated' })
        });
      });

      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/auth\/login/);

      // Login process
      await page.route('**/api/auth/magic-link', async (route) => {
        states.push('State: Magic link requested');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await authHelpers.fillLoginForm(TEST_DATA.validEmail);
      await authHelpers.verifyLoginSuccess();

      // Authenticate
      await page.route('**/api/auth/user', async (route) => {
        states.push('State: Authenticated');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-id',
              email: TEST_DATA.validEmail,
              created_at: new Date().toISOString()
            }
          })
        });
      });

      await page.goto('/dashboard');
      await expect(page.getByRole('button', { name: /sign out|logout/i })).toBeVisible();

      // Logout
      await page.route('**/api/auth/logout', async (route) => {
        states.push('State: Logout requested');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
      await logoutButton.click();

      await expect(page).toHaveURL(/\/auth\/login/);

      // Verify we went through the expected states
      expect(states.length).toBeGreaterThan(0);
      expect(states.some(state => state.includes('Unauthenticated'))).toBe(true);
      expect(states.some(state => state.includes('Magic link requested'))).toBe(true);
      expect(states.some(state => state.includes('Authenticated'))).toBe(true);
      expect(states.some(state => state.includes('Logout requested'))).toBe(true);
    });
  });

  test.describe('Error Handling in Complete Flow', () => {
    test('should handle login errors without breaking logout capability', async ({ page }) => {
      // Mock login error
      await page.route('**/api/auth/magic-link', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to send magic link' })
        });
      });

      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm(TEST_DATA.validEmail);
      
      // Should show error state
      await authHelpers.verifyErrorState();

      // Form should be usable again
      await expect(page.getByPlaceholder(/enter your email/i)).toBeEnabled();
      await expect(page.getByRole('button', { name: /send magic link/i })).toBeEnabled();

      // If user somehow gets authenticated later, logout should still work
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-id',
              email: TEST_DATA.validEmail,
              created_at: new Date().toISOString()
            }
          })
        });
      });

      await page.route('**/api/auth/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/dashboard');
      const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
      await expect(logoutButton).toBeVisible();
      await logoutButton.click();
      
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should handle logout errors gracefully', async ({ page }) => {
      // Set up authenticated state
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-id',
              email: TEST_DATA.validEmail,
              created_at: new Date().toISOString()
            }
          })
        });
      });

      await page.goto('/dashboard');
      
      // Mock logout error
      await page.route('**/api/auth/logout', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Logout failed' })
        });
      });

      const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
      await logoutButton.click();

      // Should handle error gracefully - button should be re-enabled
      await expect(logoutButton).toBeEnabled({ timeout: 5000 });
      
      // User should still be on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Cross-Device and Session Management', () => {
    test('should handle authentication state across page refreshes', async ({ page }) => {
      // Mock authenticated state
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-id',
              email: TEST_DATA.validEmail,
              created_at: new Date().toISOString()
            }
          })
        });
      });

      // Navigate to dashboard
      await page.goto('/dashboard');
      await expect(page.getByRole('button', { name: /sign out|logout/i })).toBeVisible();

      // Refresh page
      await page.reload();
      
      // Should still be authenticated
      await expect(page.getByRole('button', { name: /sign out|logout/i })).toBeVisible();

      // Logout should still work after refresh
      await page.route('**/api/auth/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
      await logoutButton.click();
      
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      // Start with valid session
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-id',
              email: TEST_DATA.validEmail,
              created_at: new Date().toISOString()
            }
          })
        });
      });

      await page.goto('/dashboard');
      await expect(page.getByRole('button', { name: /sign out|logout/i })).toBeVisible();

      // Simulate session expiration
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Session expired' })
        });
      });

      // Try to navigate to protected route
      await page.goto('/incidents/new');
      
      // Should redirect to login due to expired session
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
    });
  });
});