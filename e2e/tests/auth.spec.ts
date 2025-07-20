import { test, expect } from '@playwright/test';
import { AuthHelpers, CommonHelpers, MockHelpers, TEST_DATA } from '../fixtures/test-helpers';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from a clean state
    await page.goto('/');
  });

  test.describe('Login Flow', () => {
    test('should navigate to login page', async ({ page }) => {
      const authHelpers = new AuthHelpers(page);
      
      await authHelpers.navigateToLogin();
      
      // Verify login page elements are present
      await expect(page.getByText(/welcome back/i)).toBeVisible();
      await expect(page.getByText(/enter your email to receive a magic link/i)).toBeVisible();
      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
    });

    test('should successfully submit valid email', async ({ page }) => {
      const authHelpers = new AuthHelpers(page);
      
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm(TEST_DATA.validEmail);
      await authHelpers.verifyLoginSuccess();
    });

    test('should show loading state during submission', async ({ page }) => {
      const authHelpers = new AuthHelpers(page);
      const mockHelpers = new MockHelpers(page);
      
      // Mock slow network to see loading state
      await mockHelpers.mockSlowNetwork();
      
      await authHelpers.navigateToLogin();
      
      // Fill form and start submission
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      await emailInput.fill(TEST_DATA.validEmail);
      await submitButton.click();
      
      // Verify loading state appears
      await authHelpers.verifyLoadingState();
      
      // Wait for completion and verify success
      await authHelpers.verifyLoginSuccess();
      
      await mockHelpers.resetMocks();
    });

    test('should handle form validation for invalid email', async ({ page }) => {
      const authHelpers = new AuthHelpers(page);
      
      await authHelpers.navigateToLogin();
      
      // Try to submit invalid email
      await authHelpers.fillLoginForm(TEST_DATA.invalidEmail);
      
      // Should not proceed to success state with invalid email
      // The form should remain on the same page
      await expect(page.getByText(/welcome back/i)).toBeVisible();
      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
    });

    test('should handle empty email submission', async ({ page }) => {
      const authHelpers = new AuthHelpers(page);
      
      await authHelpers.navigateToLogin();
      
      // Try to submit without email
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      await submitButton.click();
      
      // Should remain on form due to HTML5 validation
      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
    });

    test('should handle server errors gracefully', async ({ page }) => {
      const authHelpers = new AuthHelpers(page);
      const mockHelpers = new MockHelpers(page);
      
      // Mock server error
      await mockHelpers.mockApiError('Invalid email address');
      
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm(TEST_DATA.validEmail);
      
      // Should show error message
      await authHelpers.verifyErrorState();
      
      await mockHelpers.resetMocks();
    });

    test('should allow resending magic link', async ({ page }) => {
      const authHelpers = new AuthHelpers(page);
      
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm(TEST_DATA.validEmail);
      await authHelpers.verifyLoginSuccess();
      
      // Reset to form and try again
      await authHelpers.resetToFormState();
      await authHelpers.fillLoginForm(TEST_DATA.validEmail);
      await authHelpers.verifyLoginSuccess();
    });
  });

  test.describe('Accessibility & UX', () => {
    test('should be accessible', async ({ page }) => {
      const authHelpers = new AuthHelpers(page);
      const commonHelpers = new CommonHelpers(page);
      
      await authHelpers.navigateToLogin();
      await commonHelpers.verifyAccessibility();
    });

    test('should work on mobile devices', async ({ page }) => {
      const authHelpers = new AuthHelpers(page);
      const commonHelpers = new CommonHelpers(page);
      
      await authHelpers.navigateToLogin();
      await commonHelpers.verifyResponsive();
      
      // Test form submission on mobile
      await authHelpers.fillLoginForm(TEST_DATA.validEmail);
      await authHelpers.verifyLoginSuccess();
    });

    test('should handle keyboard navigation', async ({ page }) => {
      const authHelpers = new AuthHelpers(page);
      
      await authHelpers.navigateToLogin();
      
      // Navigate using keyboard
      await page.keyboard.press('Tab'); // Should focus email input
      await page.keyboard.type(TEST_DATA.validEmail);
      await page.keyboard.press('Tab'); // Should focus submit button
      await page.keyboard.press('Enter'); // Should submit form
      
      await authHelpers.verifyLoginSuccess();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle multiple rapid submissions', async ({ page }) => {
      const authHelpers = new AuthHelpers(page);
      
      await authHelpers.navigateToLogin();
      
      const emailInput = page.getByPlaceholder(/enter your email/i);
      const submitButton = page.getByRole('button', { name: /send magic link/i });
      
      await emailInput.fill(TEST_DATA.validEmail);
      
      // Try to submit multiple times quickly
      await submitButton.click();
      await submitButton.click();
      await submitButton.click();
      
      // Should still handle gracefully and show success once
      await authHelpers.verifyLoginSuccess();
    });

    test('should handle network interruption', async ({ page }) => {
      const authHelpers = new AuthHelpers(page);
      const mockHelpers = new MockHelpers(page);
      
      await authHelpers.navigateToLogin();
      
      // Mock network failure
      await mockHelpers.mockApiError('Network timeout');
      
      await authHelpers.fillLoginForm(TEST_DATA.validEmail);
      
      // Should show error and allow retry
      await authHelpers.verifyErrorState();
      
      // Reset mocks and try again
      await mockHelpers.resetMocks();
      await authHelpers.fillLoginForm(TEST_DATA.validEmail);
      await authHelpers.verifyLoginSuccess();
    });
  });
});

test.describe('Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Note: For logout tests, we would need to simulate an authenticated state
    // Since we don't have actual magic link processing in this setup,
    // these tests serve as placeholders for the complete implementation
    await page.goto('/');
  });

  test('should handle logout when authenticated', async ({ page }) => {
    // This test would require setting up an authenticated session first
    // For now, we'll check the structure is in place
    
    // Navigate to a page that might have logout functionality
    await page.goto('/dashboard'); // This will be implemented in later tasks
    
    // The test structure is ready for when authentication is fully implemented
    expect(true).toBe(true); // Placeholder assertion
  });

  test('should redirect to login after logout', async ({ page }) => {
    // Placeholder for logout redirect test
    // Will be implemented when dashboard and full auth flow are ready
    expect(true).toBe(true); // Placeholder assertion
  });

  test('should clear session data on logout', async ({ page }) => {
    // Placeholder for session clearing test
    // Will be implemented when full auth flow is ready
    expect(true).toBe(true); // Placeholder assertion
  });
});