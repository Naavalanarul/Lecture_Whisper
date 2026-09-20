const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static file server for server/static
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
      console.log(`Static server running at http://localhost:${port}/`);
      resolve(server);
    });
  });
}

async function captureMockups() {
  const port = 8999;
  const server = await startStaticServer(port);

  const outDir = path.resolve('docs/ui-v2/phase1');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  const options = [
    { key: 'editorial', name: 'option1-editorial-scribe' },
    { key: 'kinetic', name: 'option2-kinetic-studio' },
    { key: 'ambient', name: 'option3-ambient-paper' },
  ];

  const viewports = [
    { name: '1440', width: 1440, height: 1000 },
    { name: '1024', width: 1024, height: 900 },
    { name: '390', width: 390, height: 844 },
  ];

  for (const opt of options) {
    for (const vp of viewports) {
      for (const theme of ['light', 'dark']) {
        const page = await browser.newPage({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
        });

        await page.goto(`http://localhost:${port}/#design`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        // Apply theme
        await page.evaluate((t) => {
          const root = document.documentElement;
          root.classList.remove('light', 'dark');
          root.classList.add(t);
          root.setAttribute('data-theme', t);
        }, theme);

        // Select the option in UI
        const buttonIdx = opt.key === 'editorial' ? 0 : opt.key === 'kinetic' ? 1 : 2;
        await page.evaluate((idx) => {
          const buttons = Array.from(document.querySelectorAll('header button'));
          const target = buttons.find(b => 
            (idx === 0 && b.innerText.includes('Editorial')) ||
            (idx === 1 && b.innerText.includes('Kinetic')) ||
            (idx === 2 && b.innerText.includes('Ambient'))
          );
          if (target) target.click();
        }, buttonIdx);

        // Set viewport width in UI
        const vpIdx = vp.width === 1440 ? 'desktop' : vp.width === 1024 ? 'tablet' : 'mobile';
        await page.evaluate((v) => {
          const btns = Array.from(document.querySelectorAll('header button[title]'));
          const btn = btns.find(b => b.title && b.title.toLowerCase().includes(v));
          if (btn) btn.click();
        }, vpIdx);

        await page.waitForTimeout(300);

        const filename = `${opt.name}-${theme}-${vp.name}px.png`;
        const filepath = path.join(outDir, filename);
        await page.screenshot({ path: filepath, fullPage: vp.width === 390 });
        console.log(`Captured ${filename}`);

        await page.close();
      }
    }
  }

  // Also capture Tokens & Motion Inspector (Light & Dark at 1440)
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
      deviceScaleFactor: 2,
    });
    await page.goto(`http://localhost:${port}/#design`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    await page.evaluate((t) => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(t);
      root.setAttribute('data-theme', t);
      const buttons = Array.from(document.querySelectorAll('header button'));
      const target = buttons.find(b => b.innerText.includes('Tokens'));
      if (target) target.click();
    }, theme);

    await page.waitForTimeout(300);
    const filename = `tokens-and-motion-${theme}-1440px.png`;
    const filepath = path.join(outDir, filename);
    await page.screenshot({ path: filepath });
    console.log(`Captured ${filename}`);
    await page.close();
  }

  await browser.close();
  server.close();
  console.log('\nAll Phase 1 screenshots captured successfully!');
}

captureMockups().catch((err) => {
  console.error(err);
  process.exit(1);
});
