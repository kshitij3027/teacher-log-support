import { test, expect } from '@playwright/test';

test.describe('Basic Authentication UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should render login page correctly', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/teacher support/i);
    
    // Verify main elements are present
    await expect(page.getByText(/welcome back/i)).toBeVisible();
    await expect(page.getByText(/enter your email to receive a magic link/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
  });

  test('should accept email input', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/enter your email/i);
    
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('should have proper form attributes', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/enter your email/i);
    const submitButton = page.getByRole('button', { name: /send magic link/i });
    
    // Check input attributes
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required');
    
    // Check button attributes  
    await expect(submitButton).toHaveAttribute('type', 'submit');
    await expect(submitButton).not.toBeDisabled();
  });

  test('should show loading state when form is submitted', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/enter your email/i);
    const submitButton = page.getByRole('button', { name: /send magic link/i });
    
    await emailInput.fill('test@example.com');
    await submitButton.click();
    
    // Check for loading state (button text changes or gets disabled)
    // This should happen quickly before any API response
    await expect(emailInput).toBeDisabled({ timeout: 5000 });
  });

  test('should be accessible via keyboard', async ({ page }) => {
    // Tab to email input
    await page.keyboard.press('Tab');
    const emailInput = page.getByPlaceholder(/enter your email/i);
    await expect(emailInput).toBeFocused();
    
    // Type email
    await page.keyboard.type('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
    
    // Tab to submit button
    await page.keyboard.press('Tab');
    const submitButton = page.getByRole('button', { name: /send magic link/i });
    await expect(submitButton).toBeFocused();
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Elements should still be visible and functional
    await expect(page.getByText(/welcome back/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
    
    // Form should still work
    const emailInput = page.getByPlaceholder(/enter your email/i);
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('should handle HTML5 validation for empty email', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /send magic link/i });
    
    // Try to submit without email - HTML5 validation should prevent it
    await submitButton.click();
    
    // Should still be on the same page with form visible
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should have correct page structure', async ({ page }) => {
    // Check for proper heading structure
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    
    // Check for form elements
    await expect(page.locator('form')).toBeVisible();
    
    // Check for proper semantic structure
    await expect(page.getByRole('main, document, dialog, application')).toBeTruthy();
  });
});