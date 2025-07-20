import { Page, expect } from '@playwright/test';

/**
 * Test utilities for E2E tests
 */

/**
 * Common test data
 */
export const TEST_DATA = {
  validEmail: 'test@example.com',
  invalidEmail: 'invalid-email',
  timeout: {
    short: 5000,
    medium: 10000,
    long: 30000,
  }
};

/**
 * Page object model helpers for authentication flows
 */
export class AuthHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to login page
   */
  async navigateToLogin() {
    await this.page.goto('/auth/login');
    await expect(this.page).toHaveTitle(/teacher support/i);
  }

  /**
   * Fill and submit login form
   */
  async fillLoginForm(email: string) {
    const emailInput = this.page.getByPlaceholder(/enter your email/i);
    const submitButton = this.page.getByRole('button', { name: /send magic link/i });

    await emailInput.fill(email);
    await submitButton.click();
  }

  /**
   * Wait for and verify success state
   */
  async verifyLoginSuccess() {
    // Wait for success message to appear
    await expect(this.page.getByText(/check your email/i)).toBeVisible({
      timeout: TEST_DATA.timeout.medium
    });
    
    // Verify success elements are present
    await expect(this.page.getByText(/we've sent a magic link/i)).toBeVisible();
    await expect(this.page.getByRole('button', { name: /send another link/i })).toBeVisible();
  }

  /**
   * Verify loading state during form submission
   */
  async verifyLoadingState() {
    // Check that loading text appears
    await expect(this.page.getByText(/sending magic link/i)).toBeVisible({
      timeout: TEST_DATA.timeout.short
    });
    
    // Check that form is disabled during loading
    const emailInput = this.page.getByPlaceholder(/enter your email/i);
    await expect(emailInput).toBeDisabled();
  }

  /**
   * Verify error state
   */
  async verifyErrorState(errorMessage?: string) {
    if (errorMessage) {
      await expect(this.page.getByText(errorMessage)).toBeVisible({
        timeout: TEST_DATA.timeout.medium
      });
    } else {
      // Look for any actual error message divs, not just classes
      const errorLocator = this.page.locator('div:has-text("error"), div:has-text("Error"), div[class*="text-destructive"]:not(label):not(input):not(button)');
      await expect(errorLocator.first()).toBeVisible({
        timeout: TEST_DATA.timeout.medium
      });
    }
  }

  /**
   * Reset to form state from success screen
   */
  async resetToFormState() {
    const sendAnotherButton = this.page.getByRole('button', { name: /send another link/i });
    await sendAnotherButton.click();
    
    // Verify we're back to the form
    await expect(this.page.getByPlaceholder(/enter your email/i)).toBeVisible();
    await expect(this.page.getByRole('button', { name: /send magic link/i })).toBeVisible();
  }

  /**
   * Check if user appears to be logged in (for logout tests)
   */
  async checkIfLoggedIn() {
    // Try to find logout button or other authenticated state indicators
    const logoutButton = this.page.getByRole('button', { name: /logout/i });
    return await logoutButton.isVisible().catch(() => false);
  }

  /**
   * Perform logout action
   */
  async performLogout() {
    const logoutButton = this.page.getByRole('button', { name: /logout/i });
    await logoutButton.click();
    
    // Wait for redirect to login page or other indication of logout
    await expect(this.page).toHaveURL(/\/auth\/login|\/$/);
  }
}

/**
 * Common assertions and checks
 */
export class CommonHelpers {
  constructor(private page: Page) {}

  /**
   * Verify page accessibility basics
   */
  async verifyAccessibility() {
    // Check for basic accessibility features
    const heading = this.page.getByRole('heading').first();
    await expect(heading).toBeVisible();
    
    // Check that interactive elements are accessible
    const buttons = this.page.getByRole('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        await expect(button).toBeEnabled();
      }
    }
  }

  /**
   * Verify responsive behavior
   */
  async verifyResponsive() {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500); // Allow layout to settle
    
    // Verify page is still functional on mobile
    await expect(this.page.getByRole('button').first()).toBeVisible();
    
    // Reset to desktop
    await this.page.setViewportSize({ width: 1280, height: 720 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for network idle (useful for loading states)
   */
  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Mock helpers for testing different scenarios
 */
export class MockHelpers {
  constructor(private page: Page) {}

  /**
   * Mock slow network for testing loading states
   */
  async mockSlowNetwork() {
    // Intercept API calls and add delay but still return success
    await this.page.route('**/api/auth/magic-link', async (route) => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return successful response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Magic link sent' })
      });
    });
  }

  /**
   * Mock API error responses
   */
  async mockApiError(errorMessage: string = 'Network error') {
    await this.page.route('**/api/auth/magic-link', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: errorMessage })
      });
    });
  }

  /**
   * Reset all mocks
   */
  async resetMocks() {
    await this.page.unroute('**/api/auth/magic-link');
  }
}