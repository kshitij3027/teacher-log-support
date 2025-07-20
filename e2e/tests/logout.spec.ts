import { test, expect } from '@playwright/test';
import { AuthHelpers, MockHelpers, TEST_DATA } from '../fixtures/test-helpers';

test.describe('Logout Flow E2E Tests', () => {
  let authHelpers: AuthHelpers;
  let mockHelpers: MockHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    mockHelpers = new MockHelpers(page);
    
    // Start from login page
    await authHelpers.navigateToLogin();
  });

  test.afterEach(async ({ page }) => {
    // Clean up any mocks
    await mockHelpers.resetMocks();
  });

  test.describe('Logout Button Visibility', () => {
    test('should show logout button when user is authenticated', async ({ page }) => {
      // Mock successful login state
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              created_at: new Date().toISOString()
            }
          })
        });
      });

      // Navigate to a protected page where logout button should be visible
      await page.goto('/dashboard');
      
      // Check if logout button is present
      const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
      await expect(logoutButton).toBeVisible({ timeout: 5000 });
    });

    test('should not show logout button when user is not authenticated', async ({ page }) => {
      // Mock unauthenticated state
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not authenticated' })
        });
      });

      // Try to visit dashboard - should redirect to login
      await page.goto('/dashboard');
      
      // Should be redirected to login page
      await expect(page).toHaveURL(/\/auth\/login/);
      
      // Logout button should not be present on login page
      const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
      await expect(logoutButton).not.toBeVisible();
    });
  });

  test.describe('Logout Functionality', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authenticated state for these tests
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              created_at: new Date().toISOString()
            }
          })
        });
      });
    });

    test('should successfully logout and redirect to login page', async ({ page }) => {
      // Mock successful logout
      await page.route('**/api/auth/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      // Go to dashboard where logout button should be available
      await page.goto('/dashboard');
      
      // Find and click logout button
      const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
      await expect(logoutButton).toBeVisible();
      await logoutButton.click();
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
      
      // Verify we're on the login page
      await expect(page.getByText(/welcome back/i)).toBeVisible();
    });

    test('should show loading state during logout', async ({ page }) => {
      // Mock slow logout response
      await page.route('**/api/auth/logout', async (route) => {
        // Add delay to test loading state
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      // Go to dashboard
      await page.goto('/dashboard');
      
      // Click logout button
      const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
      await logoutButton.click();
      
      // Should show loading state
      await expect(page.getByText(/signing out/i)).toBeVisible({ timeout: 2000 });
      
      // Button should be disabled during logout
      await expect(logoutButton).toBeDisabled();
    });

    test('should handle logout errors gracefully', async ({ page }) => {
      // Mock logout error
      await page.route('**/api/auth/logout', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Logout failed' })
        });
      });

      // Go to dashboard
      await page.goto('/dashboard');
      
      // Click logout button
      const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
      await logoutButton.click();
      
      // Should handle error (might show error message or stay on same page)
      // The exact behavior depends on implementation
      await page.waitForTimeout(2000);
      
      // Button should be re-enabled after error
      await expect(logoutButton).toBeEnabled();
    });
  });

  test.describe('Logout Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authenticated state
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              created_at: new Date().toISOString()
            }
          })
        });
      });
    });

    test('should be accessible via keyboard', async ({ page }) => {
      // Mock successful logout
      await page.route('**/api/auth/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/dashboard');
      
      // Use keyboard to navigate to logout button
      await page.keyboard.press('Tab');
      
      // Keep tabbing until we find the logout button
      let attempts = 0;
      while (attempts < 20) {
        const activeElement = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent);
        
        if (activeElement && /sign out|logout/i.test(activeElement)) {
          break;
        }
        
        await page.keyboard.press('Tab');
        attempts++;
      }
      
      // Press Enter to activate logout
      await page.keyboard.press('Enter');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      await page.goto('/dashboard');
      
      const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
      await expect(logoutButton).toBeVisible();
      
      // Check for proper accessibility attributes
      await expect(logoutButton).toHaveAttribute('aria-label');
      await expect(logoutButton).toHaveAttribute('type', 'button');
    });
  });

  test.describe('Session Cleanup', () => {
    test('should clear authentication state after logout', async ({ page }) => {
      // Mock authenticated state initially
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              created_at: new Date().toISOString()
            }
          })
        });
      });

      // Mock successful logout
      await page.route('**/api/auth/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      // Go to dashboard
      await page.goto('/dashboard');
      
      // Logout
      const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
      await logoutButton.click();
      
      // Wait for redirect
      await expect(page).toHaveURL(/\/auth\/login/);
      
      // Try to access protected route again - should be redirected
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should prevent access to protected routes after logout', async ({ page }) => {
      // Mock logout response
      await page.route('**/api/auth/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      // Mock unauthenticated state after logout
      await page.route('**/api/auth/user', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not authenticated' })
        });
      });

      // Try to access various protected routes
      const protectedRoutes = ['/dashboard', '/incidents/new', '/onboarding'];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should redirect to login
        await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 });
      }
    });
  });

  test.describe('Multiple Device Logout', () => {
    test('should handle logout across multiple browser contexts', async ({ browser }) => {
      // Create two browser contexts to simulate multiple devices
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Mock authenticated state for both contexts
        for (const page of [page1, page2]) {
          await page.route('**/api/auth/user', async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                user: {
                  id: 'test-user-id',
                  email: 'test@example.com',
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
        }

        // Navigate both to dashboard
        await Promise.all([
          page1.goto('/dashboard'),
          page2.goto('/dashboard')
        ]);

        // Logout from first browser
        const logoutButton1 = page1.getByRole('button', { name: /sign out|logout/i });
        await logoutButton1.click();
        
        // First browser should redirect to login
        await expect(page1).toHaveURL(/\/auth\/login/);
        
        // Second browser session should still work (unless session sharing is implemented)
        // This test verifies the logout doesn't affect other browser contexts
        await expect(page2.getByRole('button', { name: /sign out|logout/i })).toBeVisible();
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });
});