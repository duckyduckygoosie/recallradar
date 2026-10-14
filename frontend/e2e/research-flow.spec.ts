import { expect, test } from '@playwright/test';

// Requires the FastAPI service and a bounded cache containing at least one coded FDA record.
test('searches a sourced record, explores a category timeline, and exports local research', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/search');
  await expect(page.getByRole('heading', { name: 'Search explorer' })).toBeVisible();
  const records = page.locator('table tbody tr');
  await expect(records.first()).toBeVisible({ timeout: 30_000 });
  await records.first().locator('button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('[role="dialog"] a[href^="https://api.fda.gov/device/"]')).toBeVisible();
  const categoryLink = page.locator('table tbody a[href^="/devices/"]').first();
  await expect(categoryLink).toBeVisible();
  const categoryPath = await categoryLink.getAttribute('href');
  expect(categoryPath).toMatch(/^\/devices\/[A-Z0-9-]+$/);
  await page.goto(categoryPath!);
  await expect(page).toHaveURL(/\/devices\/[A-Z0-9-]+$/);
  await expect(page.locator('ol li').first()).toBeVisible({ timeout: 30_000 });

  await page.getByRole('link', { name: 'Research notebook' }).click();
  await page.getByLabel('Title').fill('Smoke test research note');
  await page.getByLabel('Notes').fill('Review source record in context.');
  await page.getByRole('button', { name: 'Save note locally' }).click();
  await expect(page.getByText('Smoke test research note')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  expect((await download).suggestedFilename()).toBe('recallradar-notebook.json');
});
