import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 1440, height: 900, name: 'desktop-1440' },
  { width: 1024, height: 768, name: 'tablet-1024' },
  { width: 768, height: 1024, name: 'tablet-768' },
  { width: 390, height: 844, name: 'mobile-390' },
];

const THEMES = ['light', 'dark'];

test.describe('FloatingNav Visual Regression', () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`FloatingNav - ${viewport.name} - ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.emulateMedia({ colorScheme: theme === 'dark' ? 'dark' : 'light' });
        
        await page.goto('http://localhost:5173/');
        await page.waitForLoadState('networkidle');
        
        // Wait for nav to mount and animate in
        await page.waitForSelector('nav[aria-label="Main navigation"]', { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(1000);
        
        // Disable animations for consistent screenshots
        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          `
        });
        
        const nav = page.locator('nav[aria-label="Main navigation"]');
        await expect(nav).toHaveScreenshot(`navbar-${viewport.name}-${theme}.png`, {
          maxDiffPixels: 100,
          threshold: 0.2,
        });
      });
    }
  }
});

test.describe('FloatingNav Navigation Flow', () => {
  test('navigates between tabs correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('nav[aria-label="Main navigation"]', { state: 'visible' });
    
    // Test each nav link
    const tabs = ['Home', 'Lectures', 'Deadlines', 'Insights', 'Schedule'];
    
    for (const tab of tabs) {
      await page.click(`nav[aria-label="Main navigation"] button:has-text("${tab}")`);
      await page.waitForTimeout(300);
      
      // Verify active state
      const activeButton = page.locator(`nav[aria-label="Main navigation"] button[aria-current="page"]:has-text("${tab}")`);
      await expect(activeButton).toBeVisible();
    }
  });

  test('keyboard shortcuts work', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('nav[aria-label="Main navigation"]', { state: 'visible' });
    
    // Test g + h (Home)
    await page.keyboard.press('g');
    await page.keyboard.press('h');
    await page.waitForTimeout(300);
    await expect(page.locator('nav[aria-label="Main navigation"] button[aria-current="page"]:has-text("Home")')).toBeVisible();
    
    // Test g + l (Lectures)
    await page.keyboard.press('g');
    await page.keyboard.press('l');
    await page.waitForTimeout(300);
    await expect(page.locator('nav[aria-label="Main navigation"] button[aria-current="page"]:has-text("Lectures")')).toBeVisible();
    
    // Test g + d (Deadlines)
    await page.keyboard.press('g');
    await page.keyboard.press('d');
    await page.waitForTimeout(300);
    await expect(page.locator('nav[aria-label="Main navigation"] button[aria-current="page"]:has-text("Deadlines")')).toBeVisible();
  });

  test('scroll behavior - nav condenses', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('nav[aria-label="Main navigation"]', { state: 'visible' });
    
    const nav = page.locator('nav[aria-label="Main navigation"]');
    
    // Initial state - not scrolled
    const initialBox = await nav.boundingBox();
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 100));
    await page.waitForTimeout(300);
    
    const scrolledBox = await nav.boundingBox();
    
    // Nav should have condensed (height reduced)
    expect(scrolledBox!.height).toBeLessThan(initialBox!.height);
  });

  test('mobile sheet opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('nav[aria-label="Main navigation"]', { state: 'visible' });
    
    // Click mobile menu button
    await page.click('nav[aria-label="Main navigation"] button[aria-label="Open navigation menu"]');
    await page.waitForTimeout(500);
    
    // Sheet should be visible
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    
    // Click a link in the sheet
    await page.click('[role="dialog"] button:has-text("Deadlines")');
    await page.waitForTimeout(300);
    
    // Sheet should close
    await expect(page.locator('[role="dialog"]').first()).not.toBeVisible();
    
    // Active tab should be Deadlines
    await expect(page.locator('nav[aria-label="Main navigation"] button[aria-current="page"]:has-text("Deadlines")')).toBeVisible();
  });
});

test.describe('FloatingNav Accessibility', () => {
  test('has proper ARIA attributes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('nav[aria-label="Main navigation"]', { state: 'visible' });
    
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toHaveAttribute('role', 'navigation');
    await expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    
    // Check active link has aria-current="page"
    const activeLink = nav.locator('button[aria-current="page"]');
    await expect(activeLink).toBeVisible();
  });

  test('skip to content link works', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('nav[aria-label="Main navigation"]', { state: 'visible' });
    
    // Tab to skip link
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();
    
    // Press Enter to skip
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    
    // Main content should be focused
    await expect(page.locator('#main-content')).toBeFocused();
  });
});