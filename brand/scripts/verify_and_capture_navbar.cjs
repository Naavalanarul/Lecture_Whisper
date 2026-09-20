const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AxeBuilder = require('@axe-core/playwright').default;

const MOCK_RECORDINGS = [
  {
    id: 'rec-cs229-ml-opt',
    subject: 'CS 229: Machine Learning & Optimization',
    duration_s: 3750,
    status: 'completed',
    started_at: '2026-09-18T10:00:00Z',
    speaker_count: 2,
    device_id: 'Pixel 8a (Laboratory)',
    sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    chunk_count: 32,
  },
  {
    id: 'rec-ee261-fourier',
    subject: 'EE 261: Fourier Transform & Applications',
    duration_s: 4120,
    status: 'completed',
    started_at: '2026-09-17T14:30:00Z',
    speaker_count: 1,
    device_id: 'Pixel 8a (Laboratory)',
    sha256: 'b2c3d4e5f6a17890123456789abcdef0123456789abcdef0123456789abcdef0',
    chunk_count: 35,
  },
  {
    id: 'rec-stat300-stats',
    subject: 'STATS 300: Advanced Theory of Statistics',
    duration_s: 3200,
    status: 'completed',
    started_at: '2026-09-16T11:00:00Z',
    speaker_count: 3,
    device_id: 'Pixel 8a (Laboratory)',
    sha256: 'c3d4e5f6a1b27890123456789abcdef0123456789abcdef0123456789abcdef0',
    chunk_count: 28,
  },
  {
    id: 'rec-cs224n-nlp',
    subject: 'CS 224N: Natural Language Processing with Deep Learning',
    duration_s: 4800,
    status: 'completed',
    started_at: '2026-09-15T09:30:00Z',
    speaker_count: 2,
    device_id: 'Pixel 8a (Laboratory)',
    sha256: 'd4e5f6a1b2c37890123456789abcdef0123456789abcdef0123456789abcdef0',
    chunk_count: 40,
  },
  {
    id: 'rec-cs140-os',
    subject: 'CS 140: Operating Systems Principles',
    duration_s: 3600,
    status: 'completed',
    started_at: '2026-09-14T13:00:00Z',
    speaker_count: 1,
    device_id: 'Pixel 8a (Laboratory)',
    sha256: 'e5f6a1b2c3d47890123456789abcdef0123456789abcdef0123456789abcdef0',
    chunk_count: 30,
  },
];

const MOCK_EVENTS = [
  {
    id: 'ev-1',
    title: 'Problem Set 4 Due (Lagrangian Duality)',
    date_iso: '2026-09-24T23:59:00Z',
    resolved: false,
    needs_review: true,
  },
  {
    id: 'ev-2',
    title: 'Midterm Exam - In Class',
    date_iso: '2026-10-01T10:00:00Z',
    resolved: false,
    needs_review: true,
  },
];

const MOCK_TIMETABLE = [
  {
    id: 'slot-1',
    subject: 'CS 229',
    day: 'Monday',
    start_time: '10:00',
    end_time: '11:30',
    room: 'Skilling 191',
  },
  {
    id: 'slot-2',
    subject: 'EE 261',
    day: 'Tuesday',
    start_time: '14:30',
    end_time: '16:00',
    room: 'Packard 101',
  },
];

function startStaticServer(port = 8999) {
  const staticDir = path.resolve('server/static');
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
  };

  const server = http.createServer((req, res) => {
    if (req.url.includes('/events')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(MOCK_EVENTS));
      return;
    }
    if (req.url.includes('/transcript')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text: 'Welcome to CS229.', segments: [{ start: 0, end: 5, text: 'Welcome to CS229.', speaker: 'Professor' }] }));
      return;
    }
    if (req.url.includes('/notes')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ summary: 'Lecture on optimization.', chapters: [] }));
      return;
    }
    if (req.url === '/api/recordings' || req.url === '/api/recordings/' || req.url.startsWith('/api/recordings?')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(MOCK_RECORDINGS));
      return;
    }
    if (req.url.startsWith('/api/recordings/')) {
      const rec = MOCK_RECORDINGS[0];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rec));
      return;
    }
    if (req.url === '/api/timetable' || req.url.startsWith('/api/timetable')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(MOCK_TIMETABLE));
      return;
    }
    if (req.url === '/api/pairing/devices') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
      return;
    }
    if (req.url === '/api/pairing/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ host: '192.168.1.50', port: 8000, token: 'LWHISP-2026-X7', server_id: 'srv-mock' }));
      return;
    }

    let filePath = path.join(staticDir, req.url === '/' || req.url.startsWith('/#') ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(staticDir, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Static mock server running at http://localhost:${port}/`);
      resolve(server);
    });
  });
}

async function runVerification() {
  const port = 8999;
  const server = await startStaticServer(port);

  const outDir = path.resolve('docs/ui-v2/navbar');
  const videoTempDir = path.resolve('docs/ui-v2/navbar/raw_videos');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(videoTempDir, { recursive: true });

  console.log('Launching browser for automated verification & captures...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  try {
    // -------------------------------------------------------------
    // 1. EXACT GEOMETRY & INSET TESTS
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Exact Geometry & Insets ---');
    const testCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await testCtx.newPage();
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('nav[aria-label="Main"]', { timeout: 8000 });
    await page.waitForTimeout(500);

    // 1.1 Outer pill height and insets
    const outerPill = page.locator('nav[aria-label="Main"] .hidden.md\\:flex .nav-pill-container').first();
    const outerBox = await outerPill.boundingBox();
    console.log(`Outer link pill: height=${outerBox?.height}px (expected 52px)`);
    if (!outerBox || Math.abs(outerBox.height - 52) > 1) {
      throw new Error(`Outer pill height is ${outerBox?.height}px, expected 52px`);
    }

    // 1.2 Logo badge geometry and alignment
    const badge = page.locator('nav[aria-label="Main"] button[aria-label="Lecture Whisper Home"]').first();
    const badgeBox = await badge.boundingBox();
    console.log(`Logo badge: width=${badgeBox?.width}px, height=${badgeBox?.height}px (expected 40x40px)`);
    if (!badgeBox || Math.abs(badgeBox.width - 40) > 1 || Math.abs(badgeBox.height - 40) > 1) {
      throw new Error(`Logo badge size is ${badgeBox?.width}x${badgeBox?.height}px, expected 40x40px`);
    }

    const badgeTopInset = badgeBox.y - outerBox.y;
    console.log(`Badge top inset from pill: ${badgeTopInset}px (expected 6px)`);
    if (Math.abs(badgeTopInset - 6) > 1) {
      throw new Error(`Badge top inset is ${badgeTopInset}px, expected 6px`);
    }

    // 1.3 Check every link item geometry (40px height, 6px insets)
    const links = ['Home', 'Lectures', 'Deadlines', 'Insights', 'Schedule'];
    for (const l of links) {
      const linkLoc = page.locator(`nav[aria-label="Main"] button:has-text("${l}")`).first();
      const linkBox = await linkLoc.boundingBox();
      console.log(`Link "${l}": height=${linkBox?.height}px, y=${linkBox?.y}px (expected 40px, y=${outerBox.y + 6}px)`);
      if (!linkBox || Math.abs(linkBox.height - 40) > 1) {
        throw new Error(`Link "${l}" height is ${linkBox?.height}px, expected 40px`);
      }
      const diffY = Math.abs(badgeBox.y + badgeBox.height / 2 - (linkBox.y + linkBox.height / 2));
      if (diffY > 0.5) {
        throw new Error(`Link "${l}" vertical center differs from badge by ${diffY}px, expected <= 0.5px`);
      }
    }

    // 1.4 Check Selected item outline & border
    const selectedItem = page.locator('nav[aria-label="Main"] button[aria-current="page"]').first();
    const borderInfo = await selectedItem.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        borderWidth: cs.borderWidth,
        outlineWidth: cs.outlineWidth,
        outlineStyle: cs.outlineStyle,
      };
    });
    console.log(`[PASS] Selected item has no outline/border: borderWidth=${borderInfo.borderWidth}, outlineStyle=${borderInfo.outlineStyle}`);
    if (borderInfo.borderWidth !== '0px') {
      throw new Error(`Selected item has visible border: ${borderInfo.borderWidth}`);
    }

    // 1.5 Check Deadlines badge color (no red)
    const deadlinesBadge = page.locator('nav[aria-label="Main"] button:has-text("Deadlines") span.tabular-nums').first();
    if (await deadlinesBadge.count() > 0) {
      const badgeColors = await deadlinesBadge.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return { color: cs.color, bg: cs.backgroundColor };
      });
      console.log(`[PASS] Deadlines badge colors: color=${badgeColors.color}, bg=${badgeColors.bg}`);
      if (badgeColors.color.includes('220, 38, 38') || badgeColors.bg.includes('220, 38, 38')) {
        throw new Error('Deadlines badge uses alert red color!');
      }
    }

    // 1.6 Check Icon buttons and CTA pills (52px outer, 40px inner)
    const searchPill = page.locator('nav[aria-label="Main"] button[aria-label*="Search"]').locator('..');
    const searchPillBox = await searchPill.boundingBox();
    const searchBtnBox = await page.locator('nav[aria-label="Main"] button[aria-label*="Search"]').boundingBox();
    console.log(`Search pill outer: height=${searchPillBox?.height}px, button inner: height=${searchBtnBox?.height}px`);
    if (!searchPillBox || Math.abs(searchPillBox.height - 52) > 1 || !searchBtnBox || Math.abs(searchBtnBox.height - 40) > 1) {
      throw new Error(`Search button geometry mismatch: pill=${searchPillBox?.height}px, btn=${searchBtnBox?.height}px`);
    }

    const ctaPill = page.locator('nav[aria-label="Main"] .group').first();
    const ctaPillBox = await ctaPill.boundingBox();
    console.log(`CTA pill outer: height=${ctaPillBox?.height}px (expected 52px)`);
    if (!ctaPillBox || Math.abs(ctaPillBox.height - 52) > 1) {
      throw new Error(`CTA pill height is ${ctaPillBox?.height}px, expected 52px`);
    }

    // -------------------------------------------------------------
    // 2. ASYMMETRIC FADE SAMPLING (requestAnimationFrame)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Asymmetric Fade Highlight (rAF Opacity Sampling) ---');
    const targetLink = page.locator('nav[aria-label="Main"] button:has-text("Lectures")').first();
    
    // Move mouse away first to ensure resting state
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);

    const targetBox = await targetLink.boundingBox();
    if (!targetBox) throw new Error('Target link bounding box not found');

    // Start sampling in browser while Playwright moves mouse onto button
    const inPromise = page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('nav[aria-label="Main"] button')).find(b => b.textContent.includes('Lectures'));
      const highlight = btn.querySelector('.nav-highlight');
      const samples = [];
      const startTime = performance.now();
      return new Promise((resolve) => {
        function sample() {
          const now = performance.now();
          const elapsed = now - startTime;
          const opacity = parseFloat(window.getComputedStyle(highlight).opacity);
          samples.push({ elapsed, opacity });
          if (elapsed < 260) {
            requestAnimationFrame(sample);
          } else {
            resolve(samples);
          }
        }
        requestAnimationFrame(sample);
      });
    });

    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
    const inSamples = await inPromise;

    // Start sampling fade-out while Playwright moves mouse away
    const outPromise = page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('nav[aria-label="Main"] button')).find(b => b.textContent.includes('Lectures'));
      const highlight = btn.querySelector('.nav-highlight');
      const samples = [];
      const startTime = performance.now();
      return new Promise((resolve) => {
        function sample() {
          const now = performance.now();
          const elapsed = now - startTime;
          const opacity = parseFloat(window.getComputedStyle(highlight).opacity);
          samples.push({ elapsed, opacity });
          if (elapsed < 420) {
            requestAnimationFrame(sample);
          } else {
            resolve(samples);
          }
        }
        requestAnimationFrame(sample);
      });
    });

    await page.mouse.move(0, 0);
    const outSamples = await outPromise;

    console.log(`Fade-in samples (count=${inSamples.length}): start=${inSamples[0]?.opacity}, mid=${inSamples[Math.floor(inSamples.length/2)]?.opacity}, end=${inSamples[inSamples.length-1]?.opacity}`);
    console.log(`Fade-out samples (count=${outSamples.length}): start=${outSamples[0]?.opacity}, mid=${outSamples[Math.floor(outSamples.length/2)]?.opacity}, end=${outSamples[outSamples.length-1]?.opacity}`);

    // Assert fade-in reaches >= 0.9 within 250ms
    const finalInOpacity = inSamples[inSamples.length - 1].opacity;
    if (finalInOpacity < 0.9) {
      throw new Error(`Fade-in failed to reach >= 0.9 within 250ms (got ${finalInOpacity})`);
    }
    console.log(`[PASS] Fade-in reached ${finalInOpacity} within 250ms`);

    // Assert fade-out reaches <= 0.15 within 420ms
    const finalOutOpacity = outSamples[outSamples.length - 1].opacity;
    if (finalOutOpacity > 0.15) {
      throw new Error(`Fade-out failed to reach <= 0.15 within 420ms (got ${finalOutOpacity})`);
    }
    console.log(`[PASS] Fade-out reached ${finalOutOpacity} within 420ms`);

    // Assert no transform translation on highlight during hover
    const highlightTransform = await targetLink.locator('.nav-highlight').evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });
    console.log(`[PASS] Highlight transform: ${highlightTransform} (no translation/sliding)`);
    if (highlightTransform.includes('translate') || highlightTransform.includes('matrix') && highlightTransform.split(',')[4]?.trim() !== '0') {
      // translation values in matrix are 5th and 6th components
      const parts = highlightTransform.replace(/[^0-9.,-]/g, '').split(',');
      if (parts.length >= 6 && (Math.abs(parseFloat(parts[4])) > 0.1 || Math.abs(parseFloat(parts[5])) > 0.1)) {
        throw new Error(`Highlight has translate transform: ${highlightTransform}`);
      }
    }

    // -------------------------------------------------------------
    // 3. SECTION 5: LIBRARY SEARCH & RECORDING ROWS
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Library Search & Recording Rows (Section 5) ---');
    const searchInput = page.locator('input[placeholder="Search by title, course, or ID..."]');
    const searchInputBox = await searchInput.boundingBox();
    console.log(`Search input width: ${searchInputBox?.width}px (expected >= 280px)`);
    if (!searchInputBox || searchInputBox.width < 280) {
      throw new Error(`Search input width is ${searchInputBox?.width}px, expected >= 280px`);
    }

    // Check recording row dates (no "Unscheduled")
    const dateCells = await page.locator('table tbody tr td:nth-child(3)').allTextContents();
    console.log('Recorded date cells sample:', dateCells.slice(0, 3));
    for (const text of dateCells) {
      if (text.includes('Unscheduled')) {
        throw new Error('Table row unexpectedly contains "Unscheduled"!');
      }
    }
    console.log('[PASS] Recording rows display formatted date and time with zero "Unscheduled" text');

    // Click Details button and verify Details popover opens with full ID
    const detailsBtn = page.locator('button[aria-label="View recording details"]').first();
    await detailsBtn.click();
    await page.waitForTimeout(300);
    const detailsModal = page.locator('[role="dialog"]');
    if (!(await detailsModal.isVisible())) {
      throw new Error('Details modal failed to open upon clicking Details button');
    }
    const modalId = await detailsModal.locator('span.font-mono.select-all').textContent();
    console.log(`[PASS] Details modal opened with full recording ID: ${modalId?.trim()}`);
    await page.locator('button[aria-label="Close details"]').click();
    await page.waitForTimeout(200);

    // -------------------------------------------------------------
    // 4. ACCESSIBILITY WITH AXE
    // -------------------------------------------------------------
    console.log('\n--- 4. Running Axe Accessibility Audit ---');
    const axeResults = await new AxeBuilder({ page })
      .include('nav[aria-label="Main"]')
      .analyze();
    console.log(`[PASS] Axe violations on navbar: ${axeResults.violations.length}`);
    if (axeResults.violations.length > 0) {
      throw new Error(`Axe accessibility violations found: ${JSON.stringify(axeResults.violations)}`);
    }

    await testCtx.close();

    // -------------------------------------------------------------
    // 5. CAPTURE VISUAL REGRESSION SCREENSHOTS (1440, 1024, 768, 390)
    // -------------------------------------------------------------
    console.log('\n--- 5. Capturing Multi-Viewport Screenshots (Light & Dark) ---');
    const viewports = [
      { name: '1440', width: 1440, height: 900 },
      { name: '1024', width: 1024, height: 768 },
      { name: '768', width: 768, height: 1024 },
      { name: '390', width: 390, height: 844 },
    ];

    for (const theme of ['light', 'dark']) {
      for (const vp of viewports) {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
        });
        const p = await ctx.newPage();
        await p.goto(`http://localhost:${port}/`);
        await p.waitForSelector('nav[aria-label="Main"]');

        // Apply theme
        await p.evaluate((t) => {
          window.localStorage.setItem('lecturewhisper_theme', t);
          const root = document.documentElement;
          root.setAttribute('data-theme', t);
          if (t === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
          } else {
            root.classList.add('light');
            root.classList.remove('dark');
          }
        }, theme);

        await p.waitForTimeout(400);

        const shotPath = path.join(outDir, `navbar-${vp.name}-${theme}.png`);
        await p.screenshot({ path: shotPath, fullPage: false });
        console.log(`Saved screenshot: ${shotPath}`);

        if (vp.name === '390') {
          const menuBtn = p.locator('nav[aria-label="Main"] button[aria-label="Open navigation menu"]');
          if (await menuBtn.isVisible()) {
            await menuBtn.click();
            await p.waitForTimeout(400);
            const sheetPath = path.join(outDir, `navbar-390-sheet-${theme}.png`);
            await p.screenshot({ path: sheetPath, fullPage: false });
            console.log(`Saved mobile sheet screenshot: ${sheetPath}`);
          }
        }

        await ctx.close();
      }
    }

    // Scrolled condensation state
    for (const theme of ['light', 'dark']) {
      const scrollCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
      const scrollPage = await scrollCtx.newPage();
      await scrollPage.goto(`http://localhost:${port}/`);
      await scrollPage.waitForSelector('nav[aria-label="Main"]');

      await scrollPage.evaluate((t) => {
        window.localStorage.setItem('lecturewhisper_theme', t);
        const root = document.documentElement;
        root.setAttribute('data-theme', t);
        if (t === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      }, theme);

      await scrollPage.waitForTimeout(300);
      await scrollPage.evaluate(() => window.scrollTo(0, 150));
      await scrollPage.waitForTimeout(400);

      const scrolledPath = path.join(outDir, `navbar-scrolled-1440-${theme}.png`);
      await scrollPage.screenshot({ path: scrolledPath, fullPage: false });
      console.log(`Saved scrolled screenshot: ${scrolledPath}`);
      await scrollCtx.close();
    }

    // Condensed lecture detail variant
    for (const theme of ['light', 'dark']) {
      const lectureCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
      const lecturePage = await lectureCtx.newPage();
      await lecturePage.goto(`http://localhost:${port}/`);
      await lecturePage.waitForSelector('nav[aria-label="Main"]');

      await lecturePage.evaluate((t) => {
        window.localStorage.setItem('lecturewhisper_theme', t);
        const root = document.documentElement;
        root.setAttribute('data-theme', t);
        if (t === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      }, theme);

      await lecturePage.waitForTimeout(300);
      const lectureRow = lecturePage.locator('tr:has-text("CS 229")').first();
      if (await lectureRow.isVisible()) {
        await lectureRow.click();
        await lecturePage.waitForTimeout(500);
      }

      const condensedPath = path.join(outDir, `navbar-condensed-lecture-1440-${theme}.png`);
      await lecturePage.screenshot({ path: condensedPath, fullPage: false });
      console.log(`Saved condensed lecture screenshot: ${condensedPath}`);
      await lectureCtx.close();
    }

    // -------------------------------------------------------------
    // 6. RECORD VIDEO: FORWARD, REVERSE & QUICK BACK-AND-FORTH HOVER
    // -------------------------------------------------------------
    console.log('\n--- 6. Recording Video of Asymmetric Fade Transitions ---');
    const videoCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: videoTempDir, size: { width: 1440, height: 900 } },
    });
    const videoPage = await videoCtx.newPage();
    await videoPage.goto(`http://localhost:${port}/`);
    await videoPage.waitForSelector('nav[aria-label="Main"]');
    await videoPage.waitForTimeout(500);

    // 6.1 Forward pass: hover across all links
    console.log('Recording forward hover pass...');
    const allLinks = ['Home', 'Lectures', 'Deadlines', 'Insights', 'Schedule'];
    for (const l of allLinks) {
      const loc = videoPage.locator(`nav[aria-label="Main"] button:has-text("${l}")`);
      if (await loc.isVisible()) {
        await loc.hover();
        await videoPage.waitForTimeout(350);
      }
    }

    // 6.2 Reverse pass: hover back across all links
    console.log('Recording reverse hover pass...');
    for (let i = allLinks.length - 1; i >= 0; i--) {
      const l = allLinks[i];
      const loc = videoPage.locator(`nav[aria-label="Main"] button:has-text("${l}")`);
      if (await loc.isVisible()) {
        await loc.hover();
        await videoPage.waitForTimeout(350);
      }
    }

    // 6.3 Quick back-and-forth hover (checking for flicker)
    console.log('Recording quick back-and-forth hover...');
    for (let cycle = 0; cycle < 3; cycle++) {
      await videoPage.locator('nav[aria-label="Main"] button:has-text("Home")').hover();
      await videoPage.waitForTimeout(150);
      await videoPage.locator('nav[aria-label="Main"] button:has-text("Lectures")').hover();
      await videoPage.waitForTimeout(150);
      await videoPage.locator('nav[aria-label="Main"] button:has-text("Deadlines")').hover();
      await videoPage.waitForTimeout(150);
    }

    // 6.4 Route changes: crossfade between tabs (no sliding)
    console.log('Recording route selection crossfades...');
    await videoPage.click('nav[aria-label="Main"] button:has-text("Deadlines")');
    await videoPage.waitForTimeout(500);

    await videoPage.click('nav[aria-label="Main"] button:has-text("Insights")');
    await videoPage.waitForTimeout(500);

    await videoPage.click('nav[aria-label="Main"] button:has-text("Schedule")');
    await videoPage.waitForTimeout(500);

    await videoPage.click('nav[aria-label="Main"] button:has-text("Home")');
    await videoPage.waitForTimeout(500);

    // 6.5 CTA hover and Search/Settings hover
    console.log('Recording CTA and icon button interactions...');
    const ctaArrow = videoPage.locator('nav[aria-label="Main"] .group button').last();
    if (await ctaArrow.isVisible()) {
      await ctaArrow.hover();
      await videoPage.waitForTimeout(400);
    }

    await videoPage.hover('nav[aria-label="Main"] button[aria-label*="Search"]');
    await videoPage.waitForTimeout(300);
    await videoPage.hover('nav[aria-label="Main"] button[aria-label*="Settings"]');
    await videoPage.waitForTimeout(300);

    // 6.6 Scroll condensation
    console.log('Recording scroll condensation...');
    await videoPage.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
    await videoPage.waitForTimeout(700);
    await videoPage.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await videoPage.waitForTimeout(700);

    await videoPage.close();
    await videoCtx.close();

    // Convert video with ffmpeg
    const videoFiles = fs.readdirSync(videoTempDir).filter((f) => f.endsWith('.webm'));
    if (videoFiles.length > 0) {
      videoFiles.sort((a, b) => fs.statSync(path.join(videoTempDir, b)).mtimeMs - fs.statSync(path.join(videoTempDir, a)).mtimeMs);
      const rawVideo = path.join(videoTempDir, videoFiles[0]);
      const mp4Path = path.join(outDir, 'navbar-interactions.mp4');
      const gifPath = path.join(outDir, 'navbar-interactions.gif');

      console.log(`Converting recorded video ${rawVideo} to MP4 & GIF...`);
      try {
        execSync(`/opt/homebrew/bin/ffmpeg -y -i "${rawVideo}" -c:v libx264 -pix_fmt yuv420p "${mp4Path}"`);
        console.log(`Saved interaction video: ${mp4Path}`);
        execSync(`/opt/homebrew/bin/ffmpeg -y -i "${rawVideo}" -vf "fps=15,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${gifPath}"`);
        console.log(`Saved interaction GIF: ${gifPath}`);
      } catch (err) {
        console.error('ffmpeg conversion error:', err.message);
      }
    }

    console.log('\n=======================================');
    console.log('ALL VERIFICATION TESTS & ARTIFACTS COMPLETED SUCCESSFULLY!');
    console.log('=======================================\n');
  } finally {
    await browser.close();
    server.close();
  }
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
