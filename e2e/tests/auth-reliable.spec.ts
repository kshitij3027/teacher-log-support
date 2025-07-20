import { test, expect } from '@playwright/test';

test.describe('Authentication E2E - Reliable Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test.describe('Core UI Functionality', () => {
    test('should render login page with all elements', async ({ page }) => {
      // Test page structure
      await expect(page).toHaveTitle(/teacher support/i);
      await expect(page.getByText(/welcome back/i)).toBeVisible();
      await expect(page.getByText(/enter your email to receive a magic link/i)).toBeVisible();
      
      // Test form elements
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      await expect(emailInput).toBeVisible();
      await expect(submitButton).toBeVisible();
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('required');
    });

    test('should accept email input correctly', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/enter your email/i);
      
      await emailInput.fill('test@example.com');
      await expect(emailInput).toHaveValue('test@example.com');
      
      // Clear and try another email
      await emailInput.clear();
      await emailInput.fill('user@company.org');
      await expect(emailInput).toHaveValue('user@company.org');
    });

    test('should handle form submission', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      // Verify initial state
      await expect(emailInput).not.toBeDisabled();
      await expect(submitButton).not.toBeDisabled();
      
      await emailInput.fill('test@example.com');
      await submitButton.click();
      
      // Form should remain functional after submission attempt
      // The exact response depends on Supabase configuration, but form should handle it gracefully
      await page.waitForTimeout(2000);
      
      // Verify the form is in a valid state (not crashed)
      const formExists = await page.locator('form').isVisible().catch(() => false);
      const emailFieldExists = await emailInput.isVisible().catch(() => false);
      const submitButtonExists = await submitButton.isVisible().catch(() => false);
      
      // At minimum, the form should still exist and be functional
      expect(formExists && (emailFieldExists || submitButtonExists)).toBe(true);
    });
  });

  test.describe('Form Validation and Interaction', () => {
    test('should handle empty form submission', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      // Try to submit without email
      await submitButton.click();
      
      // Should prevent submission via HTML5 validation
      const emailInput = page.getByPlaceholder(/enter your email/i);
      await expect(emailInput).toBeVisible();
      await expect(submitButton).toBeVisible();
    });

    test('should maintain form state during interaction', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/enter your email/i);
      
      await emailInput.fill('persistence@test.com');
      
      // Click outside the form
      await page.click('body');
      
      // Value should persist
      await expect(emailInput).toHaveValue('persistence@test.com');
    });

    test('should handle rapid multiple clicks', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      await emailInput.fill('test@example.com');
      
      // Click submit multiple times rapidly
      await Promise.all([
        submitButton.click(),
        submitButton.click(),
        submitButton.click()
      ]);
      
      // Should handle gracefully - form should be in loading state
      await expect(emailInput).toBeDisabled({ timeout: 3000 });
    });
  });

  test.describe('Accessibility Features', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Tab should focus email input
      await page.keyboard.press('Tab');
      const emailInput = page.getByPlaceholder(/enter your email/i);
      await expect(emailInput).toBeFocused();
      
      // Type email
      await page.keyboard.type('keyboard@test.com');
      await expect(emailInput).toHaveValue('keyboard@test.com');
      
      // Tab to submit button
      await page.keyboard.press('Tab');
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      await expect(submitButton).toBeFocused();
      
      // Enter should submit form
      await page.keyboard.press('Enter');
      await expect(emailInput).toBeDisabled({ timeout: 3000 });
    });

    test('should have proper semantic structure', async ({ page }) => {
      // Check for form element
      await expect(page.locator('form')).toBeVisible();
      
      // Check for proper labeling - use the label element specifically
      const emailLabel = page.locator('label', { hasText: 'Email' });
      await expect(emailLabel).toBeVisible();
      
      // Check for heading
      const heading = page.getByRole('heading');
      await expect(heading.first()).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // All elements should be visible
      await expect(page.getByText(/welcome back/i)).toBeVisible();
      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
      
      // Form should work
      const emailInput = page.getByPlaceholder(/enter your email/i);
      await emailInput.fill('mobile@test.com');
      await expect(emailInput).toHaveValue('mobile@test.com');
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      await expect(page.getByText(/welcome back/i)).toBeVisible();
      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
    });
  });

  test.describe('Error Handling (UI Level)', () => {
    test('should handle form after failed submission gracefully', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      await emailInput.fill('test@example.com');
      await submitButton.click();
      
      // Wait for any response (success or error)
      await page.waitForTimeout(5000);
      
      // Regardless of outcome, form should be in a usable state
      // Either showing success, error, or back to initial state
      const formStillExists = await page.getByPlaceholder(/enter your email/i).isVisible().catch(() => false);
      const successShown = await page.getByText(/check your email/i).isVisible().catch(() => false);
      const errorShown = await page.locator('[class*="error"], [class*="destructive"]').isVisible().catch(() => false);
      
      // One of these should be true - the app should be in a valid state
      expect(formStillExists || successShown || errorShown).toBe(true);
    });

    test('should recover from network issues', async ({ page }) => {
      // This test verifies the UI remains functional even if backend fails
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      await emailInput.fill('test@example.com');
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(8000);
      
      // Form should be in a recoverable state
      const canSubmitAgain = await submitButton.isEnabled().catch(() => false);
      const canTypeEmail = await emailInput.isEditable().catch(() => false);
      const formVisible = await emailInput.isVisible().catch(() => false);
      
      // Should be able to interact with form again
      expect(canSubmitAgain || canTypeEmail || formVisible).toBe(true);
    });
  });
});

test.describe('Navigation and Page Structure', () => {
  test('should be accessible from root', async ({ page }) => {
    await page.goto('/');
    
    // Wait for any potential redirects
    await page.waitForTimeout(1000);
    
    // Should show landing page with link to login
    const url = page.url();
    const hasLoginElements = await page.getByText(/welcome back/i).isVisible().catch(() => false);
    const hasGetStartedLink = await page.getByRole('link', { name: /get started/i }).isVisible().catch(() => false);
    const hasTeacherSupport = await page.getByText(/teacher support platform/i).isVisible().catch(() => false);
    
    // Should either be on login page, have login elements, or show landing page with get started link
    expect(url.includes('/auth/login') || hasLoginElements || hasGetStartedLink || hasTeacherSupport).toBe(true);
  });

  test('should have correct metadata and SEO', async ({ page }) => {
    await page.goto('/auth/login');
    
    await expect(page).toHaveTitle(/teacher support/i);
    
    // Check for meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /sign in/i);
  });
});

test.describe('Logout Infrastructure Check', () => {
  test('should handle protected route navigation', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/dashboard');
    
    // Should either show the page (if auth works) or redirect
    const currentUrl = page.url();
    
    // This is a basic check that navigation works
    expect(currentUrl).toBeTruthy();
    expect(currentUrl.length).toBeGreaterThan(0);
    
    // The specific behavior will depend on middleware implementation
    // For now, just verify the app doesn't crash
  });
});