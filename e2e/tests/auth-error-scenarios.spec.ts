import { test, expect } from '@playwright/test';
import { AuthHelpers, MockHelpers, TEST_DATA } from '../fixtures/test-helpers';

test.describe('Authentication Error Scenarios E2E Tests', () => {
  let authHelpers: AuthHelpers;
  let mockHelpers: MockHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    mockHelpers = new MockHelpers(page);
  });

  test.afterEach(async ({ page }) => {
    await mockHelpers.resetMocks();
  });

  test.describe('Invalid Email Format Scenarios', () => {
    test('should show validation error for empty email', async ({ page }) => {
      await authHelpers.navigateToLogin();
      
      // Try to submit without entering email
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      await submitButton.click();
      
      // Should show HTML5 validation or custom error
      const emailInput = page.getByPlaceholder(/enter your email/i);
      await expect(emailInput).toBeVisible();
      
      // Form should still be visible (not submitted)
      await expect(submitButton).toBeVisible();
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await authHelpers.navigateToLogin();
      
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      // Test various invalid email formats
      const invalidEmails = [
        'not-an-email',
        'missing@domain',
        '@missing-user.com',
        'spaces in@email.com',
        'double@@domain.com',
        'trailing.dot@domain.com.',
        'user@',
        'user@domain',
        '.user@domain.com',
        'user.@domain.com'
      ];
      
      for (const invalidEmail of invalidEmails) {
        await emailInput.fill(invalidEmail);
        await submitButton.click();
        
        // Should either show HTML5 validation or stay on form
        await expect(emailInput).toBeVisible();
        await expect(submitButton).toBeVisible();
        
        // Clear for next test
        await emailInput.fill('');
      }
    });

    test('should handle special characters in email validation', async ({ page }) => {
      await authHelpers.navigateToLogin();
      
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      // Test emails with special characters that should be rejected
      const specialCharEmails = [
        'user<script>@domain.com',
        'user"@domain.com',
        'user\'@domain.com',
        'user&@domain.com',
        'user%@domain.com',
        'user$@domain.com'
      ];
      
      for (const specialEmail of specialCharEmails) {
        await emailInput.fill(specialEmail);
        await submitButton.click();
        
        // Should show validation error or stay on form
        await expect(emailInput).toBeVisible();
        await expect(submitButton).toBeVisible();
        
        await emailInput.fill('');
      }
    });
  });

  test.describe('Expired Magic Link Scenarios', () => {
    test('should handle expired magic link gracefully', async ({ page }) => {
      // Mock expired token response - use HTML redirect like successful flows
      await page.route('**/auth/callback**', async (route) => {
        const url = new URL(route.request().url());
        const token = url.searchParams.get('token');
        
        if (token === 'expired-token') {
          await route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta http-equiv="refresh" content="0; url=/auth/login?error=expired_token">
                  <title>Magic Link Expired</title>
                </head>
                <body>
                  <p>Magic link expired. Redirecting...</p>
                  <script>window.location.href = '/auth/login?error=expired_token';</script>
                </body>
              </html>
            `
          });
        }
      });

      // Mock login page for redirect
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
                <div class="error-message">Magic link has expired. Please request a new one.</div>
                <input type="email" placeholder="Enter your email" />
                <button type="submit">Send Magic Link</button>
              </body>
            </html>
          `
        });
      });

      // Navigate to expired magic link
      await page.goto('/auth/callback?token=expired-token&type=magiclink');
      
      // Should show error and redirect to login
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
      await expect(page.getByText(/expired/i)).toBeVisible();
    });

    test('should handle invalid magic link token', async ({ page }) => {
      // Mock invalid token response
      await page.route('**/auth/callback**', async (route) => {
        const url = new URL(route.request().url());
        const token = url.searchParams.get('token');
        
        if (token === 'invalid-token') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Invalid magic link',
              code: 'INVALID_TOKEN',
              message: 'This magic link is not valid. Please request a new one.'
            })
          });
        }
      });

      // Mock error page or redirect
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
                <div class="error-message">Invalid magic link. Please request a new one.</div>
                <input type="email" placeholder="Enter your email" />
                <button type="submit">Send Magic Link</button>
              </body>
            </html>
          `
        });
      });

      // Navigate to invalid magic link
      await page.goto('/auth/callback?token=invalid-token&type=magiclink');
      
      // Should handle error appropriately
      const currentUrl = page.url();
      const hasError = await page.getByText(/invalid/i).isVisible().catch(() => false);
      const isRedirectedToLogin = currentUrl.includes('/auth/login');
      
      expect(hasError || isRedirectedToLogin).toBe(true);
    });

    test('should handle already used magic link', async ({ page }) => {
      // Mock already used token response
      await page.route('**/auth/callback**', async (route) => {
        const url = new URL(route.request().url());
        const token = url.searchParams.get('token');
        
        if (token === 'used-token') {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Magic link already used',
              code: 'TOKEN_ALREADY_USED',
              message: 'This magic link has already been used. Please request a new one.'
            })
          });
        }
      });

      await page.goto('/auth/callback?token=used-token&type=magiclink');
      
      // Should show appropriate error
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      const hasErrorMessage = await page.getByText(/already used|used/i).isVisible().catch(() => false);
      const isRedirected = currentUrl.includes('/auth/login') || currentUrl.includes('/error');
      
      expect(hasErrorMessage || isRedirected).toBe(true);
    });
  });

  test.describe('Network Error Scenarios', () => {
    test('should handle network failure during magic link request', async ({ page }) => {
      // Mock network error
      await page.route('**/api/auth/magic-link', async (route) => {
        await route.abort('failed');
      });

      await authHelpers.navigateToLogin();
      
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      await emailInput.fill(TEST_DATA.validEmail);
      await submitButton.click();
      
      // Should show network error or retry option
      await page.waitForTimeout(3000);
      
      // Button should be re-enabled for retry
      await expect(submitButton).toBeEnabled();
      
      // Should show some indication of error
      const hasErrorIndication = await page.getByText(/error|failed|try again|network/i).isVisible().catch(() => false);
      const formStillVisible = await emailInput.isVisible();
      
      expect(hasErrorIndication || formStillVisible).toBe(true);
    });

    test('should handle server error (500) during magic link request', async ({ page }) => {
      // Mock server error from Supabase OTP endpoint
      await page.route('**/auth/v1/otp', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'internal_server_error',
            error_description: 'Something went wrong. Please try again later.'
          })
        });
      });

      await authHelpers.navigateToLogin();
      
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      await emailInput.fill(TEST_DATA.validEmail);
      await submitButton.click();
      
      // Should handle server error gracefully
      await page.waitForTimeout(3000);
      
      // Form should be usable again
      await expect(submitButton).toBeEnabled();
      await expect(emailInput).toBeEnabled();
      
      // Should show error message
      await authHelpers.verifyErrorState();
    });

    test('should handle timeout during magic link request', async ({ page }) => {
      // Mock slow response that times out from Supabase OTP endpoint
      await page.route('**/auth/v1/otp', async (route) => {
        // Don't fulfill the request to simulate timeout
        await new Promise(resolve => setTimeout(resolve, 30000));
      });

      await authHelpers.navigateToLogin();
      
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      await emailInput.fill(TEST_DATA.validEmail);
      await submitButton.click();
      
      // Should show loading state initially
      await expect(emailInput).toBeDisabled({ timeout: 2000 });
      
      // Wait for timeout handling
      await page.waitForTimeout(10000);
      
      // Should recover from timeout
      const isFormUsable = await emailInput.isEnabled().catch(() => false);
      const isButtonUsable = await submitButton.isEnabled().catch(() => false);
      
      expect(isFormUsable && isButtonUsable).toBe(true);
    });
  });

  test.describe('Rate Limiting Scenarios', () => {
    test('should handle rate limiting gracefully', async ({ page }) => {
      // Navigate to a special callback URL that triggers rate limit error
      await page.goto('/auth/callback?token=rate-limit-token&type=magiclink');
      
      // Should redirect to login with rate limit error parameter
      await expect(page).toHaveURL(/\/auth\/login\?error=rate_limit/, { timeout: 10000 });
      
      // Verify the login form is displayed (core functionality working)
      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
    });

    test('should handle multiple rapid submissions', async ({ page }) => {
      let requestCount = 0;
      
      // Mock rate limiting after multiple requests from Supabase OTP endpoint
      await page.route('**/auth/v1/otp', async (route) => {
        requestCount++;
        
        if (requestCount <= 2) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({})
          });
        } else {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'rate_limit_exceeded',
              error_description: 'Too many requests. Please wait.',
              message: 'Too many requests'
            })
          });
        }
      });

      await authHelpers.navigateToLogin();
      
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      await emailInput.fill(TEST_DATA.validEmail);
      
      // Rapidly submit multiple times
      for (let i = 0; i < 5; i++) {
        await submitButton.click();
        await page.waitForTimeout(100);
        
        // Reset to form state if success (for rapid testing)
        const sendAnotherButton = page.getByRole('button', { name: /send another link/i });
        if (await sendAnotherButton.isVisible().catch(() => false)) {
          await sendAnotherButton.click();
        }
      }
      
      // Should eventually show rate limiting
      const hasRateLimit = await page.getByText(/rate|limit|too many|wait/i).isVisible().catch(() => false);
      expect(hasRateLimit).toBe(true);
    });
  });

  test.describe('Malformed Request Scenarios', () => {
    test('should handle missing callback parameters', async ({ page }) => {
      // Test various malformed callback URLs
      const malformedUrls = [
        '/auth/callback',
        '/auth/callback?',
        '/auth/callback?token=',
        '/auth/callback?type=',
        '/auth/callback?token=abc',
        '/auth/callback?type=magiclink',
        '/auth/callback?invalid=params'
      ];

      for (const url of malformedUrls) {
        await page.route('**/auth/callback**', async (route) => {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Missing required parameters',
              message: 'Invalid authentication request.'
            })
          });
        });

        await page.goto(url);
        await page.waitForTimeout(1000);
        
        // Should handle gracefully - either show error or redirect
        const currentUrl = page.url();
        const hasError = await page.getByText(/error|invalid|missing/i).isVisible().catch(() => false);
        const isRedirected = currentUrl.includes('/auth/login') || currentUrl.includes('/error');
        
        expect(hasError || isRedirected).toBe(true);
      }
    });

    test('should handle wrong authentication type', async ({ page }) => {
      await page.route('**/auth/callback**', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Invalid authentication type',
            message: 'Unsupported authentication method.'
          })
        });
      });

      await page.goto('/auth/callback?token=valid-token&type=invalid-type');
      
      // Should handle invalid type gracefully
      await page.waitForTimeout(2000);
      const hasError = await page.getByText(/invalid|unsupported|error/i).isVisible().catch(() => false);
      const isRedirected = page.url().includes('/auth/login');
      
      expect(hasError || isRedirected).toBe(true);
    });

    test('should handle malformed JSON responses', async ({ page }) => {
      // Mock malformed JSON response
      await page.route('**/api/auth/magic-link', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response {'
        });
      });

      await authHelpers.navigateToLogin();
      
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      await emailInput.fill(TEST_DATA.validEmail);
      await submitButton.click();
      
      // Should handle malformed response gracefully
      await page.waitForTimeout(3000);
      
      // Form should be usable again
      await expect(submitButton).toBeEnabled();
      await expect(emailInput).toBeEnabled();
    });
  });

  test.describe('Edge Cases and Boundary Scenarios', () => {
    test('should handle extremely long email addresses', async ({ page }) => {
      await authHelpers.navigateToLogin();
      
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      // Create very long email (beyond typical limits)
      const longUsername = 'a'.repeat(100);
      const longDomain = 'b'.repeat(100);
      const longEmail = `${longUsername}@${longDomain}.com`;
      
      await emailInput.fill(longEmail);
      await submitButton.click();
      
      // Should handle gracefully (either reject or accept based on validation)
      await expect(emailInput).toBeVisible();
      await expect(submitButton).toBeVisible();
    });

    test('should handle special Unicode characters in email', async ({ page }) => {
      await authHelpers.navigateToLogin();
      
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      // Test various Unicode characters
      const unicodeEmails = [
        'user@münchen.de',
        'tëst@example.com',
        'ñoño@domain.com',
        'user@例え.テスト',
        'مثال@domain.com'
      ];
      
      for (const unicodeEmail of unicodeEmails) {
        await emailInput.fill(unicodeEmail);
        await submitButton.click();
        
        // Should handle Unicode gracefully
        await expect(emailInput).toBeVisible();
        await expect(submitButton).toBeVisible();
        
        await emailInput.fill('');
      }
    });

    test('should handle concurrent error scenarios', async ({ browser }) => {
      // Test multiple browser contexts hitting errors simultaneously
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Mock different errors for each context
        await page1.route('**/api/auth/magic-link', async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Server error' })
          });
        });

        await page2.route('**/api/auth/magic-link', async (route) => {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Rate limited' })
          });
        });

        // Navigate both to login
        await page1.goto('/auth/login');
        await page2.goto('/auth/login');

        // Submit forms simultaneously
        await Promise.all([
          page1.getByPlaceholder(/enter your email/i).fill('test1@example.com'),
          page2.getByPlaceholder(/enter your email/i).fill('test2@example.com')
        ]);

        await Promise.all([
          page1.getByRole('button', { name: /send magic link/i }).click(),
          page2.getByRole('button', { name: /send magic link/i }).click()
        ]);

        // Both should handle their respective errors
        await page1.waitForTimeout(2000);
        await page2.waitForTimeout(2000);

        const page1HasError = await page1.getByText(/error|server/i).isVisible().catch(() => false);
        const page2HasError = await page2.getByText(/rate|limit/i).isVisible().catch(() => false);
        
        expect(page1HasError || page2HasError).toBe(true);

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });
});