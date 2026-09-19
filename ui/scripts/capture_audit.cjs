const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '../../docs/ui-screenshots/p0');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const TABS = [
  { id: 'inbox', label: 'Library' },
  { id: 'lecture', label: 'Lecture View' },
  { id: 'events', label: 'Deadlines' },
  { id: 'questions', label: 'Q&A' },
  { id: 'speakers', label: 'Speakers' },
  { id: 'phrases', label: 'Habits' },
  { id: 'timetable', label: 'Schedule' },
  { id: 'corrections', label: 'LoRA Studio' },
];

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
  { name: '390', width: 390, height: 844 },
];

(async () => {
  console.log('Launching browser for UI Audit Capture...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  for (const vp of VIEWPORTS) {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto('http://127.0.0.1:8420/', { waitUntil: 'networkidle' });

      // Apply theme
      await page.evaluate((t) => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(t);
        root.setAttribute('data-theme', t);
        localStorage.setItem('lecturewhisper_theme', t);
      }, theme);

      await page.waitForTimeout(400);

      // Audit Library (Inbox) first
      for (const tab of TABS) {
        // Switch tab via page evaluation (to support small screens where nav is hidden)
        await page.evaluate((tabLabel) => {
          const buttons = Array.from(document.querySelectorAll('button, nav button'));
          const target = buttons.find(b => b.textContent && b.textContent.includes(tabLabel));
          if (target) {
            target.click();
          }
        }, tab.label);

        await page.waitForTimeout(300);

        const filename = `${tab.id}_${vp.name}_${theme}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        console.log(`Captured: ${filename}`);
      }

      await page.close();
    }
  }

  await browser.close();
  console.log('All audit screenshots captured successfully in docs/ui-screenshots/p0/');
})().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
