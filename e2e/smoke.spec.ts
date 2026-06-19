import { test, expect } from '@playwright/test';

test.describe('FocusMixr smoke', () => {
  test('loads homepage without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /shape your/i })).toBeVisible();

    const critical = errors.filter(
      (e) => !e.includes('THREE.Clock') && !e.includes('deprecated'),
    );
    expect(critical).toEqual([]);
  });

  test('start journey and toggle rain channel', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /start journey/i }).first().click();
    await expect(page.getByRole('switch', { name: /toggle rain/i })).toBeVisible();

    const rainToggle = page.getByRole('switch', { name: /toggle rain/i });
    const rainRequest = page.waitForResponse(
      (r) => r.url().includes('/sounds/rain.mp3') && r.status() === 200,
      { timeout: 15_000 },
    );
    await rainToggle.click();
    await expect(rainToggle).toHaveAttribute('aria-checked', 'true');
    await rainRequest;
  });

  test('opens Aura Forge panel', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /start journey/i }).first().click();

    await page.getByRole('button', { name: /open aura forge/i }).click();
    await expect(page.getByText('AI Sound Generation')).toBeVisible();
    await expect(page.getByLabel('Sound prompt')).toBeVisible();
  });

  test('mobile mixer dock fits viewport without clipping master control', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByRole('button', { name: /start journey/i }).first().click();

    const master = page.getByRole('button', { name: /pause mix|play mix/i });
    await expect(master).toBeVisible();

    const box = await master.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);

    const keyboard = page.getByRole('switch', { name: /toggle keyboard/i });
    await expect(keyboard).toBeVisible();
    await expect(page.getByText('Keyboard')).toBeHidden();
  });
});
