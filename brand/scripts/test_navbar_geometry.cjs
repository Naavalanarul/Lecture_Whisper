const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MOCK_RECORDINGS = [
  {
    id: 'rec-cs229-ml',
    subject: 'CS 229: Machine Learning & Optimization',
    duration_s: 3750,
    status: 'completed',
    started_at: '2026-09-18T10:00:00Z',
  },
];

function startStaticServer(port = 8998) {
  const staticDir = path.resolve('server/static');
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  };

  const server = http.createServer((req, res) => {
    if (req.url.includes('/events')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([{ id: 'ev-1', title: 'Problem Set 4', date_iso: '2026-09-24', resolved: false }]));
      return;
    }
    if (req.url.includes('/api/recordings')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(MOCK_RECORDINGS));
      return;
    }
    if (req.url.includes('/api/timetable')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
      return;
    }
    if (req.url.includes('/api/pairing')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
      return;
    }

    let filePath = path.join(staticDir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) filePath = path.join(staticDir, 'index.html');
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

async function runGeometryTest() {
  const port = 8998;
  const server = await startStaticServer(port);
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  const failures = [];

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('nav[aria-label="Main"]', { timeout: 5000 });
    await page.waitForTimeout(600);

    // 1. Check outer link pill height and insets
    const outerPill = page.locator('nav[aria-label="Main"] .md\\:flex').first().locator('> div').first();
    const outerBox = await outerPill.boundingBox();
    console.log(`Outer pill bounding box: height=${outerBox?.height}, y=${outerBox?.y}`);
    if (!outerBox || Math.abs(outerBox.height - 52) > 1) {
      failures.push(`Outer link pill height is ${outerBox?.height}px, expected 52px`);
    }

    // 2. Check logo badge diameter and vertical center
    const badge = page.locator('nav[aria-label="Main"] button[aria-label="Lecture Whisper Home"]').first();
    const badgeBox = await badge.boundingBox();
    console.log(`Logo badge box: width=${badgeBox?.width}, height=${badgeBox?.height}, y=${badgeBox?.y}`);
    if (!badgeBox || Math.abs(badgeBox.height - 40) > 1 || Math.abs(badgeBox.width - 40) > 1) {
      failures.push(`Logo badge diameter is ${badgeBox?.width}x${badgeBox?.height}px, expected 40x40px`);
    }

    // Badge inset from outer pill top
    if (outerBox && badgeBox) {
      const topInset = badgeBox.y - outerBox.y;
      console.log(`Badge top inset: ${topInset}px`);
      if (Math.abs(topInset - 6) > 1) {
        failures.push(`Logo badge top inset is ${topInset}px, expected 6px`);
      }
    }

    // 3. Check link item heights and badge vertical center alignment
    const homeLink = page.locator('nav[aria-label="Main"] button:has-text("Home")').first();
    const homeBox = await homeLink.boundingBox();
    console.log(`Home link box: height=${homeBox?.height}, y=${homeBox?.y}`);
    if (!homeBox || Math.abs(homeBox.height - 40) > 1) {
      failures.push(`Home link height is ${homeBox?.height}px, expected 40px`);
    }

    if (badgeBox && homeBox) {
      const badgeCenterY = badgeBox.y + badgeBox.height / 2;
      const homeCenterY = homeBox.y + homeBox.height / 2;
      const diffY = Math.abs(badgeCenterY - homeCenterY);
      console.log(`Center Y difference between badge and link: ${diffY}px`);
      if (diffY > 0.5) {
        failures.push(`Badge and link vertical center Y differ by ${diffY}px, expected <= 0.5px`);
      }
    }

    // 4. Check selected item highlight outline/ring
    const selectedItem = page.locator('nav[aria-label="Main"] button[aria-current="page"]').first();
    const borderInfo = await selectedItem.evaluate((el) => {
      const activeEl = el.querySelector('[class*="active"]') || el;
      const cs = window.getComputedStyle(activeEl);
      return {
        borderWidth: cs.borderWidth,
        outlineWidth: cs.outlineWidth,
        boxShadow: cs.boxShadow,
      };
    });
    console.log('Selected item border/outline info:', borderInfo);

    // 5. Check Deadlines badge color
    const deadlineBadge = page.locator('nav[aria-label="Main"] button:has-text("Deadlines") span.tabular-nums').first();
    if (await deadlineBadge.count() > 0) {
      const badgeColor = await deadlineBadge.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return { color: cs.color, backgroundColor: cs.backgroundColor };
      });
      console.log('Deadlines count badge colors:', badgeColor);
      // alert is red rgb(220, 38, 38)
      if (badgeColor.backgroundColor.includes('220, 38, 38') || badgeColor.color.includes('220, 38, 38')) {
        failures.push(`Deadlines badge uses alert/red color: ${JSON.stringify(badgeColor)}, expected neutral or accent`);
      }
    }

    // 6. Check per-item fade highlight system (no layoutId sliding)
    const hasSlidingMotion = await page.evaluate(() => {
      return !!document.querySelector('[data-projection-id]');
    });
    console.log(`Has Framer/Motion layoutId sliding indicator: ${hasSlidingMotion}`);

    console.log('\n=======================================');
    if (failures.length > 0) {
      console.log(`TEST FAILED (expected on current build) with ${failures.length} errors:`);
      failures.forEach((f, i) => console.log(` ${i + 1}. ${f}`));
    } else {
      console.log('ALL GEOMETRY TESTS PASSED');
    }
    console.log('=======================================\n');
  } finally {
    await browser.close();
    server.close();
  }
}

runGeometryTest();
