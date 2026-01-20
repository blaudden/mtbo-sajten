import { test, expect } from '@playwright/test';

test.describe('Events Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events');
  });

  test('should show correct breadcrumbs', async ({ page }) => {
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Home');
    await expect(breadcrumb).toContainText('Events');
    await expect(breadcrumb).toContainText('2026');
  });

  test('should navigate to other years', async ({ page }) => {
    // Find the link for 2025
    const link2025 = page.locator('a.year-link', { hasText: '2025' });
    await expect(link2025).toBeVisible();
    await link2025.click();

    // Verify URL
    await expect(page).toHaveURL(/\/events\/2025$/);
    
    // Verify content heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('2025');
  });

  test('should show country names in Swedish in the filter', async ({ page }) => {
    const filter = page.locator('#country-filter');
    await expect(filter).toBeVisible();
    
    // Check for some expected Swedish names that are definitely in 2026 data
    const options = await filter.locator('option').allTextContents();
    expect(options.some(opt => opt.includes('Sverige'))).toBeTruthy();
    expect(options.some(opt => opt.includes('Portugal'))).toBeTruthy();
    // Use "Frankrike" instead of "Italien" as revealed by earlier subagent logs
    expect(options.some(opt => opt.includes('Frankrike'))).toBeTruthy();
  });

  test('should correctly count events for each country', async ({ page }) => {
    const filter = page.locator('#country-filter');
    
    // Pick the first country option (skipping the "All" option)
    const options = filter.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
    
    // Select the second option (index 1) which should be a country
    const optionText = await options.nth(1).textContent();
    const value = await options.nth(1).getAttribute('value');
    
    // Extract the number from "Country (X)"
    const match = optionText?.match(/\((\d+)\)/);
    const countInDropdown = parseInt(match?.[1] || '0');

    // Filter by this country
    await filter.selectOption({ value: value! });
    
    // Count visible rows in the table
    const visibleRows = page.locator('tbody tr:visible[data-country]');
    await expect(visibleRows).toHaveCount(countInDropdown);
  });

  test('should have readable text in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Check heading
    const heading = page.locator('h1');
    await expect(heading).toHaveClass(/dark:text-white/);
    
    // Check dropdown styling classes
    const filter = page.locator('#country-filter');
    await expect(filter).toHaveClass(/dark:bg-slate-800/);
    await expect(filter).toHaveClass(/dark:text-white/);
  });

  test.describe('Static Verification (2025)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/events/2025');
    });

    test('should verify table structure', async ({ page }) => {
      const headers = page.locator('thead th');
      await expect(headers).toContainText(['Datum', 'Tävling', 'Arrangör']);
    });

    test('should verify cancelled events show "Inställd" badge', async ({ page }) => {
      // Find a known cancelled event in 2025
      const cancelledRow = page.locator('tr').filter({ hasText: /Inställd/ }).first();
      await expect(cancelledRow).toBeVisible();
      await expect(cancelledRow).toHaveClass(/bg-red-50/);
      await expect(cancelledRow).toContainText('Inställd');
    });

    test('should verify external links have target="_blank"', async ({ page }) => {
      // Check the first event link
      const firstLink = page.locator('tbody tr a').first();
      await expect(firstLink).toHaveAttribute('target', '_blank');
      const href = await firstLink.getAttribute('href');
      expect(href).toMatch(/^https?:\/\/|\//);
    });

    test('should verify date formatting', async ({ page }) => {
      // Single day event: Domsjönatta (19 feb.)
      const singleDayEvent = page.locator('tr').filter({ hasText: 'Domsjönatta' });
      await expect(singleDayEvent.locator('td').first()).toContainText('19 feb.');

      // Multi day event: World Masters (30 apr. - 4 maj)
      const multiDayEvent = page.locator('tr').filter({ hasText: 'World Masters MTB Orienteering Championships 2025' }).first();
      await expect(multiDayEvent.locator('td').first()).toContainText('30 apr. - 4 maj');
    });
  });
});
