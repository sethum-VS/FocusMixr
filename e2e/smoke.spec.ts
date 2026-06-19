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

    await page.getByRole('button', { name: /start your ambient sound journey/i }).click();
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
    await page.getByRole('button', { name: /start your ambient sound journey/i }).click();

    await page.getByRole('button', { name: /open aura forge/i }).click();
    await expect(page.getByText('AI Sound Generation')).toBeVisible();
    await expect(page.getByLabel('Sound prompt')).toBeVisible();
  });

  test('mobile mixer dock fits viewport without clipping master control', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByRole('button', { name: /start your ambient sound journey/i }).click();

    const master = page.getByRole('button', { name: /pause mix|play mix/i });
    await expect(master).toBeVisible();

    const box = await master.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);

    const keyboard = page.getByRole('switch', { name: /toggle keyboard/i });
    await expect(keyboard).toBeVisible();
    // Mobile shows compact channel labels; desktop shows labels beside toggles
    await expect(page.getByText('Keyboard', { exact: true })).toBeVisible();
  });

  test('mobile vertical slider adjusts channel volume', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByRole('button', { name: /start your ambient sound journey/i }).click();

    await page.getByRole('switch', { name: /toggle rain/i }).click();

    const rainSlider = page.getByRole('slider', { name: /rain volume/i });
    await expect(rainSlider).toBeVisible();
    await expect(rainSlider).toHaveAttribute('aria-disabled', 'false');
    await expect(rainSlider).toHaveAttribute('aria-valuenow', '70');

    const sliderBox = await rainSlider.boundingBox();
    expect(sliderBox).not.toBeNull();

    await page.mouse.move(sliderBox!.x + sliderBox!.width / 2, sliderBox!.y + sliderBox!.height - 4);
    await page.mouse.down();
    await page.mouse.move(sliderBox!.x + sliderBox!.width / 2, sliderBox!.y + 4);
    await page.mouse.up();

    const after = await rainSlider.getAttribute('aria-valuenow');
    expect(Number(after)).toBeGreaterThan(85);
  });
});
