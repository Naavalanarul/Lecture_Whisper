const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function inspectSite(url, name) {
  console.log(`\n=== Inspecting ${url} (${name}) ===`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  
  const page = await context.newPage();
  
  const scripts = [];
  page.on('request', req => {
    const rUrl = req.url();
    if (rUrl.endsWith('.js') || rUrl.includes('.js?') || rUrl.includes('/chunks/') || rUrl.includes('framer') || rUrl.includes('gsap') || rUrl.includes('lenis')) {
      scripts.push(rUrl);
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log(`Navigation note: ${e.message}`);
  }

  await page.waitForTimeout(2500);

  const screenshotDir = path.resolve('docs/ui-v2/research');
  fs.mkdirSync(screenshotDir, { recursive: true });
  const heroPath = path.join(screenshotDir, `${name}-hero.png`);
  await page.screenshot({ path: heroPath });
  console.log(`Captured hero screenshot: ${heroPath}`);

  const analysis = await page.evaluate(() => {
    const detectedLibs = {
      gsap: !!window.gsap,
      ScrollTrigger: !!(window.gsap && window.gsap.plugins && window.gsap.plugins.ScrollTrigger),
      lenis: !!window.lenis || !!window.Lenis,
      framerMotion: !!window.__FramerMetadata__ || !!window.Framer,
      three: !!window.THREE,
      lottie: !!window.lottie || !!window.bodymovin,
      rive: !!window.rive,
    };

    const bodyStyle = window.getComputedStyle(document.body);
    const h1 = document.querySelector('h1');
    const h1Style = h1 ? window.getComputedStyle(h1) : null;
    
    const ems = Array.from(document.querySelectorAll('em, i, span[class*="italic"], [style*="italic"], h1 span, h2 span, p span')).slice(0, 15).map(el => ({
      tag: el.tagName,
      text: el.innerText ? el.innerText.slice(0, 60).trim() : '',
      fontFamily: window.getComputedStyle(el).fontFamily,
      fontStyle: window.getComputedStyle(el).fontStyle,
      fontWeight: window.getComputedStyle(el).fontWeight,
      color: window.getComputedStyle(el).color,
    })).filter(e => e.text.length > 0);

    const buttons = Array.from(document.querySelectorAll('button, a[class*="btn"], a[class*="button"]')).slice(0, 5).map(b => ({
      text: b.innerText ? b.innerText.slice(0, 30).trim() : '',
      radius: window.getComputedStyle(b).borderRadius,
      bg: window.getComputedStyle(b).backgroundColor,
      color: window.getComputedStyle(b).color,
      padding: window.getComputedStyle(b).padding,
    }));

    const cards = Array.from(document.querySelectorAll('[class*="card"], [class*="container"], section > div')).slice(0, 10).map(c => ({
      radius: window.getComputedStyle(c).borderRadius,
      bg: window.getComputedStyle(c).backgroundColor,
      border: window.getComputedStyle(c).border,
      boxShadow: window.getComputedStyle(c).boxShadow,
    })).filter(c => c.radius !== '0px');

    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 10).map(h => ({
      tag: h.tagName,
      text: h.innerText ? h.innerText.replace(/\n+/g, ' ').trim() : '',
    }));

    return {
      title: document.title,
      detectedLibs,
      body: {
        bg: bodyStyle.backgroundColor,
        color: bodyStyle.color,
        fontFamily: bodyStyle.fontFamily,
      },
      h1: h1Style ? {
        fontFamily: h1Style.fontFamily,
        fontSize: h1Style.fontSize,
        fontWeight: h1Style.fontWeight,
        letterSpacing: h1Style.letterSpacing,
        lineHeight: h1Style.lineHeight,
      } : null,
      headings,
      ems,
      buttons,
      cards: cards.slice(0, 5),
    };
  });

  // Scroll down a bit
  await page.evaluate(() => window.scrollBy(0, 1200));
  await page.waitForTimeout(2000);
  const midScrollPath = path.join(screenshotDir, `${name}-midscroll.png`);
  await page.screenshot({ path: midScrollPath });
  console.log(`Captured mid-scroll screenshot: ${midScrollPath}`);

  await browser.close();

  return {
    name,
    url,
    scripts: scripts.slice(0, 20),
    analysis,
  };
}

(async () => {
  const wispr = await inspectSite('https://wisprflow.ai/', 'wisprflow');
  const lando = await inspectSite('https://landonorris.com/', 'landonorris');
  
  fs.writeFileSync('docs/ui-v2/research/raw-data.json', JSON.stringify({ wispr, lando }, null, 2));
  console.log('\nWrote docs/ui-v2/research/raw-data.json');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
