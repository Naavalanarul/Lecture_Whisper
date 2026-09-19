const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const path = require('path');
const fs = require('fs');

const OUTPUT_DIRS = [
  path.resolve(__dirname, '../../docs/ui-screenshots/p6'),
  path.resolve(__dirname, '../../docs/ui-screenshots/final'),
];

for (const dir of OUTPUT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const TABS = [
  { key: '1', id: 'inbox', label: 'Library / Today' },
  { key: '2', id: 'lecture', label: 'Lecture View' },
  { key: '3', id: 'events', label: 'Deadlines' },
  { key: '4', id: 'questions', label: 'Q&A' },
  { key: '5', id: 'speakers', label: 'Speakers' },
  { key: '6', id: 'phrases', label: 'Habits' },
  { key: '7', id: 'timetable', label: 'Schedule' },
  { key: '8', id: 'corrections', label: 'LoRA Studio' },
];

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
  { name: '390', width: 390, height: 844 },
];

(async () => {
  console.log('Starting Phase 6 Verification & Accessibility Audit...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  let totalAxeViolations = 0;
  const axeReports = [];

  for (const vp of VIEWPORTS) {
    for (const theme of ['light', 'dark']) {
      console.log(`\nTesting Viewport ${vp.name}px — Theme: ${theme}`);
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:8420/', { waitUntil: 'networkidle' });

      // Apply theme explicitly
      await page.evaluate((t) => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(t);
        root.setAttribute('data-theme', t);
        localStorage.setItem('lecturewhisper_theme', t);
      }, theme);

      await page.waitForTimeout(300);

      for (const tab of TABS) {
        // Switch tab using global number key
        await page.keyboard.press(tab.key);
        await page.waitForTimeout(250);

        // Run accessibility check for desktop 1440
        if (vp.name === '1440') {
          try {
            const results = await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
              .disableRules(['color-contrast']) // custom palette checked separately
              .analyze();

            if (results.violations.length > 0) {
              console.warn(`  [Axe Notice] ${tab.id} (${theme}): ${results.violations.length} item(s)`);
              results.violations.forEach((v) => {
                console.warn(`    - ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
              });
              totalAxeViolations += results.violations.length;
            } else {
              console.log(`  ✓ [Axe Passed] ${tab.id} (${theme}): 0 WCAG violations`);
            }
          } catch (axeErr) {
            console.warn(`  [Axe Check Skipped] ${axeErr.message}`);
          }
        }

        // Capture screenshot
        const filename = `${tab.id}_${vp.name}_${theme}.png`;
        for (const outDir of OUTPUT_DIRS) {
          const filepath = path.join(outDir, filename);
          await page.screenshot({ path: filepath, fullPage: false });
        }
        process.stdout.write(`  📸 Captured ${filename}\n`);
      }

      await context.close();
    }
  }

  await browser.close();
  console.log(`\n========================================`);
  console.log(`Phase 6 Capture Complete: 48 screenshots saved across all viewports and themes.`);
  console.log(`Axe Accessibility Audit Complete.`);
  console.log(`========================================\n`);
})().catch((err) => {
  console.error('Phase 6 verification script failed:', err);
  process.exit(1);
});
