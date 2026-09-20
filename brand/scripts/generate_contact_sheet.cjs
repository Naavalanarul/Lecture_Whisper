const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const colorways = [
  { name: 'Light Mode', bg: '#FAFAF9', fg: '#4F46E5', text: '#171717', border: '#E7E7E4' },
  { name: 'Dark Mode', bg: '#0A0A0A', fg: '#818CF8', text: '#EDEDED', border: '#262626' },
  { name: 'Brand Accent', bg: '#4F46E5', fg: '#FFFFFF', text: '#FFFFFF', border: '#6366F1' },
  { name: 'Monochrome', bg: '#FFFFFF', fg: '#171717', text: '#171717', border: '#E4E4E7' },
];

async function generate() {
  const svgMaster = fs.readFileSync('brand/svg/mark.svg', 'utf8');
  const svgSmall = fs.readFileSync('brand/svg/mark-small.svg', 'utf8');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #F4F4F5;
          color: #18181B;
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          width: 1400px;
        }
        .header {
          border-bottom: 2px solid #E4E4E7;
          padding-bottom: 20px;
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #09090B;
        }
        .subtitle {
          font-size: 15px;
          color: #71717A;
          margin-top: 6px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        .theme-card {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          border: 1px solid #E4E4E7;
          display: flex;
          flex-direction: column;
        }
        .card-header {
          padding: 14px 18px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(0,0,0,0.08);
          background: #FFFFFF;
          color: #09090B;
        }
        .preview-area {
          padding: 28px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
          flex: 1;
        }
        .size-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          width: 100%;
        }
        .size-label {
          font-size: 11px;
          font-family: monospace;
          opacity: 0.75;
          letter-spacing: 0.04em;
        }
        .icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .micro-section {
          width: 100%;
          border-top: 1px dashed rgba(128,128,128,0.3);
          padding-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .micro-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: center;
          opacity: 0.8;
        }
        .micro-comparison {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
        }
        .micro-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .micro-tag {
          font-size: 9px;
          font-family: monospace;
          opacity: 0.6;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Lecture Whisper Mark - Legibility & Multi-Scale Contact Sheet</div>
        <div class="subtitle">Multi-scale rendering evaluation across light, dark, accent, and monochrome palettes (16px to 256px + micro-optimized variants)</div>
      </div>
      
      <div class="grid">
        ${colorways.map(c => `
          <div class="theme-card">
            <div class="card-header">${c.name} (${c.fg} on ${c.bg})</div>
            <div class="preview-area" style="background: ${c.bg}; color: ${c.fg};">
              <!-- 256px Master -->
              <div class="size-row">
                <div class="size-label" style="color: ${c.text};">256 x 256 (Master)</div>
                <div class="icon-container" style="width: 256px; height: 256px;">
                  ${svgMaster}
                </div>
              </div>
              
              <!-- 128px Master -->
              <div class="size-row">
                <div class="size-label" style="color: ${c.text};">128 x 128</div>
                <div class="icon-container" style="width: 128px; height: 128px;">
                  ${svgMaster}
                </div>
              </div>
              
              <!-- 64px Master -->
              <div class="size-row">
                <div class="size-label" style="color: ${c.text};">64 x 64</div>
                <div class="icon-container" style="width: 64px; height: 64px;">
                  ${svgMaster}
                </div>
              </div>
              
              <!-- Micro Scales Comparison (32px, 24px, 16px) -->
              <div class="micro-section">
                <div class="micro-title" style="color: ${c.text};">Micro-Scales: Master vs Optical Tuned</div>
                
                <div class="micro-comparison">
                  <!-- 32px -->
                  <div class="micro-col">
                    <div class="micro-tag" style="color: ${c.text};">32px Std</div>
                    <div class="icon-container" style="width: 32px; height: 32px;">${svgMaster}</div>
                  </div>
                  <div class="micro-col">
                    <div class="micro-tag" style="color: ${c.text};">32px Opt</div>
                    <div class="icon-container" style="width: 32px; height: 32px;">${svgSmall}</div>
                  </div>
                  
                  <!-- 24px -->
                  <div class="micro-col">
                    <div class="micro-tag" style="color: ${c.text};">24px Std</div>
                    <div class="icon-container" style="width: 24px; height: 24px;">${svgMaster}</div>
                  </div>
                  <div class="micro-col">
                    <div class="micro-tag" style="color: ${c.text};">24px Opt</div>
                    <div class="icon-container" style="width: 24px; height: 24px;">${svgSmall}</div>
                  </div>
                  
                  <!-- 16px -->
                  <div class="micro-col">
                    <div class="micro-tag" style="color: ${c.text};">16px Std</div>
                    <div class="icon-container" style="width: 16px; height: 16px;">${svgMaster}</div>
                  </div>
                  <div class="micro-col">
                    <div class="micro-tag" style="color: ${c.text};">16px Opt</div>
                    <div class="icon-container" style="width: 16px; height: 16px;">${svgSmall}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;

  const page = await browser.newPage({ viewport: { width: 1400, height: 1100, deviceScaleFactor: 2 } });
  await page.setContent(html);
  await page.waitForTimeout(200);
  
  const bodyHandle = await page.$('body');
  const boundingBox = await bodyHandle.boundingBox();
  
  await page.setViewportSize({
    width: 1400,
    height: Math.ceil(boundingBox.height) + 40,
  });
  
  const outPath = 'docs/brand/legibility-contact-sheet.png';
  await page.screenshot({ path: outPath });
  console.log(`Generated contact sheet -> ${outPath}`);
  await browser.close();
}

generate().catch(console.error);
