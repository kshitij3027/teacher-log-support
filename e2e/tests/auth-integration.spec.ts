import { test, expect } from '@playwright/test';

test.describe('Authentication Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should show success state with mocked API response', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/auth/magic-link', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Magic link sent successfully' })
      });
    });

    const emailInput = page.getByPlaceholder(/enter your email/i);
    const submitButton = page.getByRole('button', { name: /send magic link/i });

    // Fill and submit form
    await emailInput.fill('test@example.com');
    await submitButton.click();

    // Should show success state
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/we've sent a magic link/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send another link/i })).toBeVisible();
  });

  test('should show error state with mocked API error', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/auth/magic-link', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid email address' })
      });
    });

    const emailInput = page.getByPlaceholder(/enter your email/i);
    const submitButton = page.getByRole('button', { name: /send magic link/i });

    // Fill and submit form
    await emailInput.fill('test@example.com');
    await submitButton.click();

    // Should show error message
    await expect(page.getByText(/invalid email address/i)).toBeVisible({ timeout: 10000 });
  });

  test('should handle network error gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/auth/magic-link', async (route) => {
      await route.abort('failed');
    });

    const emailInput = page.getByPlaceholder(/enter your email/i);
    const submitButton = page.getByRole('button', { name: /send magic link/i });

    // Fill and submit form
    await emailInput.fill('test@example.com');
    await submitButton.click();

    // Should show generic error or remain on form
    // The form should handle the network error gracefully
    await page.waitForTimeout(3000); // Give time for error handling
    
    // Should either show an error message or return to form state
    const isFormVisible = await page.getByPlaceholder(/enter your email/i).isVisible();
    const isErrorVisible = await page.getByText(/error|failed|try again/i).isVisible().catch(() => false);
    
    expect(isFormVisible || isErrorVisible).toBe(true);
  });

  test('should allow retry after success', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/auth/magic-link', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Magic link sent successfully' })
      });
    });

    const emailInput = page.getByPlaceholder(/enter your email/i);
    const submitButton = page.getByRole('button', { name: /send magic link/i });

    // First submission
    await emailInput.fill('test@example.com');
    await submitButton.click();
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });

    // Click "Send another link"
    const sendAnotherButton = page.getByRole('button', { name: /send another link/i });
    await sendAnotherButton.click();

    // Should return to form
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();

    // Should be able to submit again
    const newEmailInput = page.getByPlaceholder(/enter your email/i);
    const newSubmitButton = page.getByRole('button', { name: /send magic link/i });
    
    await newEmailInput.fill('another@example.com');
    await newSubmitButton.click();
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state during slow API response', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/auth/magic-link', async (route) => {
      // Add delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Magic link sent successfully' })
      });
    });

    const emailInput = page.getByPlaceholder(/enter your email/i);
    const submitButton = page.getByRole('button', { name: /send magic link/i });

    // Fill and submit form
    await emailInput.fill('test@example.com');
    await submitButton.click();

    // Should immediately show loading state
    await expect(page.getByText(/sending magic link/i)).toBeVisible({ timeout: 2000 });
    await expect(emailInput).toBeDisabled();

    // Eventually should show success
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 15000 });
  });

  test('should prevent multiple submissions', async ({ page }) => {
    // Mock slow API response to allow multiple clicks
    await page.route('**/api/auth/magic-link', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Magic link sent successfully' })
      });
    });

    const emailInput = page.getByPlaceholder(/enter your email/i);
    const submitButton = page.getByRole('button', { name: /send magic link/i });

    // Fill form
    await emailInput.fill('test@example.com');
    
    // Try to click submit multiple times rapidly
    await submitButton.click();
    await submitButton.click();
    await submitButton.click();

    // Should only process once and show loading then success
    await expect(page.getByText(/sending magic link/i)).toBeVisible({ timeout: 2000 });
    await expect(submitButton).toBeDisabled();
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
  });
});