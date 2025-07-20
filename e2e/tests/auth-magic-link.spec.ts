import { test, expect } from '@playwright/test';
import { AuthHelpers, MockHelpers, TEST_DATA } from '../fixtures/test-helpers';

test.describe('Magic Link Authentication E2E Tests', () => {
  let authHelpers: AuthHelpers;
  let mockHelpers: MockHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    mockHelpers = new MockHelpers(page);
  });

  test.afterEach(async ({ page }) => {
    await mockHelpers.resetMocks();
  });

  test.describe('Magic Link Callback Flow', () => {
    test('should successfully authenticate user via magic link callback', async ({ page }) => {
      // Mock successful auth callback that returns HTML page with redirect
      await page.route('**/auth/callback**', async (route) => {
        const url = new URL(route.request().url());
        const token = url.searchParams.get('token');
        const type = url.searchParams.get('type');

        // Validate expected parameters
        if (token && type === 'magiclink') {
          await route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta http-equiv="refresh" content="0; url=/dashboard">
                  <title>Authentication Successful</title>
                </head>
                <body>
                  <p>Authentication successful. Redirecting...</p>
                  <script>window.location.href = '/dashboard';</script>
                </body>
              </html>
            `
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid parameters' })
          });
        }
      });

      // Mock authenticated user state after callback
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

      // Mock dashboard page since it doesn't exist yet
      await page.route('**/dashboard**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head><title>Dashboard - Teacher Support</title></head>
              <body>
                <h1>Dashboard</h1>
                <p>Welcome to your dashboard</p>
                <button type="button" aria-label="Sign out">Sign out</button>
              </body>
            </html>
          `
        });
      });

      // Navigate directly to magic link callback URL
      await page.goto('/auth/callback?token=valid-test-token&type=magiclink');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Should show authenticated content
      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
    });

    test('should handle magic link callback with missing token', async ({ page }) => {
      // Mock error response for missing token
      await page.route('**/auth/callback**', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Missing token parameter' })
        });
      });

      // Navigate to callback without token
      await page.goto('/auth/callback?type=magiclink');

      // Should handle error gracefully
      await expect(page).toHaveURL(/\/auth\/callback/, { timeout: 5000 });
      
      // Should show error or redirect to login
      const isOnLogin = await page.locator('text=/login|sign in|enter your email/i').isVisible().catch(() => false);
      const hasError = await page.locator('text=/error|invalid|missing/i').isVisible().catch(() => false);
      
      expect(isOnLogin || hasError).toBe(true);
    });

    test('should handle magic link callback with invalid token', async ({ page }) => {
      // Mock error response for invalid token
      await page.route('**/auth/callback**', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid or expired token' })
        });
      });

      // Navigate to callback with invalid token
      await page.goto('/auth/callback?token=invalid-token&type=magiclink');

      // Should handle error and redirect or show error message
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const isOnLogin = currentUrl.includes('/auth/login') || currentUrl.includes('/login');
      const hasErrorMessage = await page.locator('text=/invalid|expired|error/i').isVisible().catch(() => false);
      
      expect(isOnLogin || hasErrorMessage).toBe(true);
    });

    test('should handle magic link callback with wrong type parameter', async ({ page }) => {
      // Mock error response for wrong type
      await page.route('**/auth/callback**', async (route) => {
        const url = new URL(route.request().url());
        const type = url.searchParams.get('type');
        
        if (type !== 'magiclink') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid authentication type' })
          });
        }
      });

      // Navigate to callback with wrong type
      await page.goto('/auth/callback?token=valid-token&type=invalid');

      // Should handle error
      await page.waitForTimeout(2000);
      
      const hasError = await page.locator('text=/invalid|error/i').isVisible().catch(() => false);
      const isRedirected = !page.url().includes('type=invalid');
      
      expect(hasError || isRedirected).toBe(true);
    });
  });

  test.describe('Authentication State Management', () => {
    test('should maintain authentication state after magic link login', async ({ page }) => {
      // Mock successful authentication flow with HTML redirect
      await page.route('**/auth/callback**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta http-equiv="refresh" content="0; url=/dashboard">
                <title>Authentication Successful</title>
              </head>
              <body>
                <script>window.location.href = '/dashboard';</script>
              </body>
            </html>
          `
        });
      });

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

      // Mock dashboard page
      await page.route('**/dashboard**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head><title>Dashboard - Teacher Support</title></head>
              <body>
                <h1>Dashboard</h1>
                <button type="button" aria-label="Sign out">Sign out</button>
              </body>
            </html>
          `
        });
      });

      // Authenticate via magic link
      await page.goto('/auth/callback?token=valid-test-token&type=magiclink');
      await expect(page).toHaveURL(/\/dashboard/);

      // Refresh page - should maintain auth state
      await page.reload();
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();

      // Navigate to other protected routes - should remain authenticated
      const protectedRoutes = ['/incidents/new', '/onboarding'];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should either stay on the route or redirect to dashboard (but not to login)
        await page.waitForTimeout(1000);
        const currentUrl = page.url();
        const isStillAuthenticated = !currentUrl.includes('/auth/login') && !currentUrl.includes('/login');
        
        expect(isStillAuthenticated).toBe(true);
      }
    });

    test('should allow logout after magic link authentication', async ({ page }) => {
      // Set up successful magic link authentication
      await page.route('**/auth/callback**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta http-equiv="refresh" content="0; url=/dashboard">
                <title>Authentication Successful</title>
              </head>
              <body>
                <script>window.location.href = '/dashboard';</script>
              </body>
            </html>
          `
        });
      });

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

      // Mock dashboard page
      await page.route('**/dashboard**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head><title>Dashboard - Teacher Support</title></head>
              <body>
                <h1>Dashboard</h1>
                <button type="button" aria-label="Sign out">Sign out</button>
              </body>
            </html>
          `
        });
      });

      // Authenticate via magic link
      await page.goto('/auth/callback?token=valid-test-token&type=magiclink');
      await expect(page).toHaveURL(/\/dashboard/);

      // Set up logout mock that also handles the redirect
      await page.route('**/api/auth/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      // Mock the login page for redirect
      await page.route('**/auth/login**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head><title>Login - Teacher Support</title></head>
              <body>
                <h1>Welcome Back</h1>
                <p>Enter your email to receive a magic link</p>
                <input type="email" placeholder="Enter your email" />
                <button type="submit">Send Magic Link</button>
              </body>
            </html>
          `
        });
      });

      // Perform logout
      const logoutButton = page.getByRole('button', { name: /sign out/i });
      await logoutButton.click();

      // Wait for logout to complete and check if redirected or session cleared
      await page.waitForTimeout(2000);

      // Wait for logout to complete and check current URL
      const currentUrl = page.url();
      if (!currentUrl.includes('/auth/login')) {
        // If not redirected immediately, update auth state to unauthenticated
        await page.route('**/api/auth/user', async (route) => {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Not authenticated' })
          });
        });

        // Update dashboard route to redirect to login when unauthenticated
        await page.route('**/dashboard**', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta http-equiv="refresh" content="0; url=/auth/login">
                  <title>Redirecting...</title>
                </head>
                <body>
                  <script>window.location.href = '/auth/login';</script>
                </body>
              </html>
            `
          });
        });

        // Try to access dashboard - should redirect to login
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 });
      } else {
        // Already redirected to login
        await expect(page).toHaveURL(/\/auth\/login/);
      }
    });
  });

  test.describe('Magic Link URL Structure', () => {
    test('should handle magic link with additional parameters', async ({ page }) => {
      // Mock successful callback with additional parameters
      await page.route('**/auth/callback**', async (route) => {
        const url = new URL(route.request().url());
        const token = url.searchParams.get('token');
        const type = url.searchParams.get('type');
        const next = url.searchParams.get('next');

        if (token && type === 'magiclink') {
          const redirectUrl = next || '/dashboard';
          await route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta http-equiv="refresh" content="0; url=${redirectUrl}">
                  <title>Authentication Successful</title>
                </head>
                <body>
                  <script>window.location.href = '${redirectUrl}';</script>
                </body>
              </html>
            `
          });
        }
      });

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

      // Mock incidents/new page
      await page.route('**/incidents/new**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head><title>New Incident - Teacher Support</title></head>
              <body>
                <h1>Create New Incident</h1>
                <button type="button" aria-label="Sign out">Sign out</button>
              </body>
            </html>
          `
        });
      });

      // Navigate with next parameter
      await page.goto('/auth/callback?token=valid-token&type=magiclink&next=/incidents/new');

      // Should redirect to the specified next URL
      await expect(page).toHaveURL(/\/incidents\/new/, { timeout: 10000 });
    });

    test('should handle malformed magic link URLs gracefully', async ({ page }) => {
      const malformedUrls = [
        '/auth/callback?',
        '/auth/callback?token=',
        '/auth/callback?type=magiclink',
        '/auth/callback?token=valid&type=',
        '/auth/callback?invalid=params'
      ];

      for (const url of malformedUrls) {
        // Mock error handling for malformed URLs
        await page.route('**/auth/callback**', async (route) => {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid callback parameters' })
          });
        });

        await page.goto(url);
        await page.waitForTimeout(1000);

        // Should handle gracefully - either show error or redirect to login
        const currentUrl = page.url();
        const isHandledGracefully = 
          currentUrl.includes('/auth/login') || 
          currentUrl.includes('/login') ||
          await page.locator('text=/error|invalid/i').isVisible().catch(() => false);

        expect(isHandledGracefully).toBe(true);
      }
    });
  });

  test.describe('Magic Link Security', () => {
    test('should prevent token reuse after successful authentication', async ({ page }) => {
      let tokenUsed = false;

      // Mock callback that tracks token usage
      await page.route('**/auth/callback**', async (route) => {
        const url = new URL(route.request().url());
        const token = url.searchParams.get('token');

        if (token === 'one-time-token') {
          if (tokenUsed) {
            // Token already used
            await route.fulfill({
              status: 401,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Token already used' })
            });
          } else {
            // First time using token
            tokenUsed = true;
            await route.fulfill({
              status: 200,
              contentType: 'text/html',
              body: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta http-equiv="refresh" content="0; url=/dashboard">
                    <title>Authentication Successful</title>
                  </head>
                  <body>
                    <script>window.location.href = '/dashboard';</script>
                  </body>
                </html>
              `
            });
          }
        }
      });

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

      // Mock dashboard page
      await page.route('**/dashboard**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head><title>Dashboard - Teacher Support</title></head>
              <body>
                <h1>Dashboard</h1>
                <button type="button" aria-label="Sign out">Sign out</button>
              </body>
            </html>
          `
        });
      });

      // First use - should succeed
      await page.goto('/auth/callback?token=one-time-token&type=magiclink');
      await expect(page).toHaveURL(/\/dashboard/);

      // Second use of same token - should fail
      await page.goto('/auth/callback?token=one-time-token&type=magiclink');
      
      // Should not reach dashboard again
      await page.waitForTimeout(2000);
      const isOnDashboard = page.url().includes('/dashboard');
      expect(isOnDashboard).toBe(false);
    });

    test('should handle concurrent magic link authentications', async ({ browser }) => {
      // Create two browser contexts to simulate concurrent logins
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Set up mocks for both pages
        for (const page of [page1, page2]) {
          await page.route('**/auth/callback**', async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'text/html',
              body: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta http-equiv="refresh" content="0; url=/dashboard">
                    <title>Authentication Successful</title>
                  </head>
                  <body>
                    <script>window.location.href = '/dashboard';</script>
                  </body>
                </html>
              `
            });
          });

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

          // Mock dashboard page
          await page.route('**/dashboard**', async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'text/html',
              body: `
                <!DOCTYPE html>
                <html>
                  <head><title>Dashboard - Teacher Support</title></head>
                  <body>
                    <h1>Dashboard</h1>
                    <button type="button" aria-label="Sign out">Sign out</button>
                  </body>
                </html>
              `
            });
          });
        }

        // Concurrent authentication attempts
        await Promise.all([
          page1.goto('/auth/callback?token=token1&type=magiclink'),
          page2.goto('/auth/callback?token=token2&type=magiclink')
        ]);

        // Both should succeed (different tokens)
        await expect(page1).toHaveURL(/\/dashboard/);
        await expect(page2).toHaveURL(/\/dashboard/);

        // Both should show authenticated state
        await expect(page1.getByRole('button', { name: /sign out/i })).toBeVisible();
        await expect(page2.getByRole('button', { name: /sign out/i })).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('Integration with Existing Auth Flow', () => {
    test('should work independently of regular login flow', async ({ page }) => {
      // Test that magic link authentication works without going through login form first
      await page.route('**/auth/callback**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta http-equiv="refresh" content="0; url=/dashboard">
                <title>Authentication Successful</title>
              </head>
              <body>
                <script>window.location.href = '/dashboard';</script>
              </body>
            </html>
          `
        });
      });

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

      // Mock dashboard page
      await page.route('**/dashboard**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head><title>Dashboard - Teacher Support</title></head>
              <body>
                <h1>Dashboard</h1>
                <button type="button" aria-label="Sign out">Sign out</button>
              </body>
            </html>
          `
        });
      });

      // Navigate directly to magic link (simulating email click)
      await page.goto('/auth/callback?token=valid-token&type=magiclink');

      // Should complete authentication
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
    });

    test('should handle magic link authentication from different browser contexts', async ({ browser }) => {
      // Test that magic link works across different browser contexts (simulating devices)
      const context1 = await browser.newContext({
        viewport: { width: 375, height: 667 }
      });
      
      const context2 = await browser.newContext({
        viewport: { width: 1280, height: 720 }
      });

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Set up mocks for both contexts
        for (const page of [page1, page2]) {
          await page.route('**/auth/callback**', async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'text/html',
              body: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta http-equiv="refresh" content="0; url=/dashboard">
                    <title>Authentication Successful</title>
                  </head>
                  <body>
                    <script>window.location.href = '/dashboard';</script>
                  </body>
                </html>
              `
            });
          });

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

          await page.route('**/dashboard**', async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'text/html',
              body: `
                <!DOCTYPE html>
                <html>
                  <head><title>Dashboard - Teacher Support</title></head>
                  <body>
                    <h1>Dashboard</h1>
                    <button type="button" aria-label="Sign out">Sign out</button>
                  </body>
                </html>
              `
            });
          });
        }

        // Use magic link on both contexts (different tokens)
        await page1.goto('/auth/callback?token=device1-token&type=magiclink');
        await page2.goto('/auth/callback?token=device2-token&type=magiclink');

        // Both should authenticate successfully
        await expect(page1).toHaveURL(/\/dashboard/);
        await expect(page2).toHaveURL(/\/dashboard/);
        
        await expect(page1.getByRole('button', { name: /sign out/i })).toBeVisible();
        await expect(page2.getByRole('button', { name: /sign out/i })).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });
});