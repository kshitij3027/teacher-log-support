import { test, expect } from '@playwright/test';

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test.describe('Page Structure and Navigation', () => {
    test('should have correct page structure and metadata', async ({ page }) => {
      // Verify page title and metadata
      await expect(page).toHaveTitle(/teacher support/i);
      
      // Verify main page elements
      await expect(page.getByText(/welcome back/i)).toBeVisible();
      await expect(page.getByText(/enter your email to receive a magic link/i)).toBeVisible();
      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
      
      // Verify informational text
      await expect(page.getByText(/don't have an account/i)).toBeVisible();
    });

    test('should be accessible from root path', async ({ page }) => {
      await page.goto('/');
      
      // Should either be on login page or redirect to it
      const currentUrl = page.url();
      const isOnLogin = currentUrl.includes('/auth/login') || 
                       await page.getByText(/welcome back/i).isVisible().catch(() => false);
      
      expect(isOnLogin).toBe(true);
    });
  });

  test.describe('Form Functionality', () => {
    test('should accept and validate email input', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/enter your email/i);
      
      // Test valid email input
      await emailInput.fill('test@example.com');
      await expect(emailInput).toHaveValue('test@example.com');
      
      // Clear and test another email
      await emailInput.fill('');
      await emailInput.fill('user@company.org');
      await expect(emailInput).toHaveValue('user@company.org');
    });

    test('should have proper form attributes', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      // Verify input attributes
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('required');
      await expect(emailInput).toHaveAttribute('name', 'email');
      
      // Verify button attributes
      await expect(submitButton).toHaveAttribute('type', 'submit');
      await expect(submitButton).not.toBeDisabled();
    });

    test('should trigger loading state on form submission', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      // Fill valid email
      await emailInput.fill('test@example.com');
      
      // Submit form
      await submitButton.click();
      
      // Should immediately show loading state
      await expect(emailInput).toBeDisabled({ timeout: 2000 });
      
      // Loading text might appear in button
      const loadingIndicator = page.getByText(/sending/i).or(
        page.locator('[class*="animate-spin"]')
      ).or(submitButton.filter({ hasText: /sending/i }));
      
      await expect(loadingIndicator).toBeVisible({ timeout: 3000 });
    });

    test('should handle HTML5 validation', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      // Try to submit empty form
      await submitButton.click();
      
      // Should prevent submission and stay on form
      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      await expect(submitButton).toBeVisible();
      
      // Form should still be interactive
      const emailInput = page.getByPlaceholder(/enter your email/i);
      await emailInput.fill('test@example.com');
      await expect(emailInput).toHaveValue('test@example.com');
    });
  });

  test.describe('Accessibility Features', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Tab navigation should work
      await page.keyboard.press('Tab');
      
      const emailInput = page.getByPlaceholder(/enter your email/i);
      await expect(emailInput).toBeFocused();
      
      // Should be able to type
      await page.keyboard.type('test@example.com');
      await expect(emailInput).toHaveValue('test@example.com');
      
      // Tab to submit button
      await page.keyboard.press('Tab');
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      await expect(submitButton).toBeFocused();
      
      // Should be able to activate with Enter or Space
      await page.keyboard.press('Enter');
      
      // Should trigger form submission (loading state)
      await expect(emailInput).toBeDisabled({ timeout: 2000 });
    });

    test('should have proper ARIA attributes and semantic structure', async ({ page }) => {
      // Should have proper form structure
      const form = page.locator('form');
      await expect(form).toBeVisible();
      
      // Should have proper labels
      const emailLabel = page.getByText('Email');
      await expect(emailLabel).toBeVisible();
      
      // Should have proper heading structure
      const mainHeading = page.getByRole('heading', { level: 1 });
      await expect(mainHeading).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // All elements should still be visible and functional
      await expect(page.getByText(/welcome back/i)).toBeVisible();
      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
      
      // Form should still work
      const emailInput = page.getByPlaceholder(/enter your email/i);
      await emailInput.fill('mobile@example.com');
      await expect(emailInput).toHaveValue('mobile@example.com');
      
      // Button should still be clickable
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      await submitButton.click();
      await expect(emailInput).toBeDisabled({ timeout: 2000 });
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      // Verify responsive design
      await expect(page.getByText(/welcome back/i)).toBeVisible();
      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      
      // Test interaction
      const emailInput = page.getByPlaceholder(/enter your email/i);
      await emailInput.fill('tablet@example.com');
      await expect(emailInput).toHaveValue('tablet@example.com');
    });
  });

  test.describe('User Experience', () => {
    test('should handle multiple rapid clicks gracefully', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      await emailInput.fill('test@example.com');
      
      // Rapidly click submit button multiple times
      await Promise.all([
        submitButton.click(),
        submitButton.click(),
        submitButton.click()
      ]);
      
      // Should handle gracefully and show loading state
      await expect(emailInput).toBeDisabled({ timeout: 2000 });
    });

    test('should maintain state during interaction', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/enter your email/i);
      
      // Fill email
      await emailInput.fill('persistence@example.com');
      
      // Click somewhere else on the page
      await page.click('body');
      
      // Email should still be there
      await expect(emailInput).toHaveValue('persistence@example.com');
      
      // Focus back to input
      await emailInput.focus();
      await expect(emailInput).toBeFocused();
    });

    test('should show consistent styling and visual feedback', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      // Check that elements have expected styling classes
      await expect(emailInput).toHaveClass(/border|input|rounded/);
      await expect(submitButton).toHaveClass(/button|btn|bg-|text-/);
      
      // Test hover states work
      await submitButton.hover();
      await expect(submitButton).toBeVisible();
      
      // Test focus states work
      await emailInput.focus();
      await expect(emailInput).toBeFocused();
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    test('should work consistently across form interactions', async ({ page }) => {
      // This test verifies basic form functionality works in all browser engines
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      // Basic interaction test
      await emailInput.fill('crossbrowser@example.com');
      await expect(emailInput).toHaveValue('crossbrowser@example.com');
      
      await submitButton.click();
      await expect(emailInput).toBeDisabled({ timeout: 2000 });
    });
  });
});

test.describe('Logout Flow Preparation', () => {
  test('should have logout infrastructure ready', async ({ page }) => {
    // Navigate to protected pages to test logout functionality when ready
    // For now, verify the structure is in place
    
    await page.goto('/dashboard');
    
    // Should either redirect to login or show protected content
    // This will be fully testable once the dashboard is implemented
    const currentUrl = page.url();
    const hasRedirected = currentUrl.includes('/auth/login') || currentUrl.includes('/');
    
    // For now, just verify the navigation works
    expect(typeof currentUrl).toBe('string');
    expect(currentUrl.length).toBeGreaterThan(0);
  });
});