const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');
const markSvg = fs.readFileSync(path.join(projectRoot, 'brand/svg/mark.svg'), 'utf8');

const mipmaps = [
  { dir: 'mobile/android/app/src/main/res/mipmap-mdpi', size: 48 },
  { dir: 'mobile/android/app/src/main/res/mipmap-hdpi', size: 72 },
  { dir: 'mobile/android/app/src/main/res/mipmap-xhdpi', size: 96 },
  { dir: 'mobile/android/app/src/main/res/mipmap-xxhdpi', size: 144 },
  { dir: 'mobile/android/app/src/main/res/mipmap-xxxhdpi', size: 192 },
];

async function generate() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  const page = await browser.newPage();

  // Helper to render HTML to file
  async function renderIcon(html, outputPath, width, height) {
    await page.setViewportSize({ width, height });
    await page.setContent(html);
    await page.waitForTimeout(50);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: outputPath, omitBackground: true });
    console.log(`Rendered: ${outputPath} (${width}x${height})`);
  }

  // 1. In-app logo (app_logo.png: 512x512 rounded squircle badge)
  const appLogoHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 512px; height: 512px; background: transparent; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .badge {
          width: 512px;
          height: 512px;
          background: #4F46E5;
          border-radius: 114px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 16px 36px rgba(79, 70, 229, 0.28);
        }
        svg {
          width: 320px;
          height: 320px;
          color: #FFFFFF;
        }
      </style>
    </head>
    <body>
      <div class="badge">
        ${markSvg}
      </div>
    </body>
    </html>
  `;
  await renderIcon(appLogoHtml, path.join(projectRoot, 'mobile/android/app/src/main/res/drawable/app_logo.png'), 512, 512);

  // 2. docs/assets/logo.png (1024x1024)
  const docsLogoHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 1024px; height: 1024px; background: transparent; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .badge {
          width: 1024px;
          height: 1024px;
          background: #4F46E5;
          border-radius: 228px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 32px 72px rgba(79, 70, 229, 0.32);
        }
        svg {
          width: 640px;
          height: 640px;
          color: #FFFFFF;
        }
      </style>
    </head>
    <body>
      <div class="badge">
        ${markSvg}
      </div>
    </body>
    </html>
  `;
  await renderIcon(docsLogoHtml, path.join(projectRoot, 'docs/assets/logo.png'), 1024, 1024);

  // 3. Launcher mipmaps (Squircle & Round)
  for (const m of mipmaps) {
    const radius = Math.round(m.size * 0.22);
    const svgSize = Math.round(m.size * 0.62);

    // Squircle launcher icon
    const launcherHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: ${m.size}px; height: ${m.size}px; background: transparent; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .badge {
            width: ${m.size}px;
            height: ${m.size}px;
            background: #4F46E5;
            border-radius: ${radius}px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          svg {
            width: ${svgSize}px;
            height: ${svgSize}px;
            color: #FFFFFF;
          }
        </style>
      </head>
      <body>
        <div class="badge">
          ${markSvg}
        </div>
      </body>
      </html>
    `;
    await renderIcon(launcherHtml, path.join(projectRoot, m.dir, 'ic_launcher.png'), m.size, m.size);

    // Round launcher icon
    const roundHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: ${m.size}px; height: ${m.size}px; background: transparent; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .badge {
            width: ${m.size}px;
            height: ${m.size}px;
            background: #4F46E5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          svg {
            width: ${svgSize}px;
            height: ${svgSize}px;
            color: #FFFFFF;
          }
        </style>
      </head>
      <body>
        <div class="badge">
          ${markSvg}
        </div>
      </body>
      </html>
    `;
    await renderIcon(roundHtml, path.join(projectRoot, m.dir, 'ic_launcher_round.png'), m.size, m.size);
  }

  await browser.close();
  console.log('All Android icons successfully generated!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
