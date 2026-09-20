const { chromium } = require('playwright');
const fs = require('fs');
const { execSync } = require('child_process');

async function renderSvg(svgPath, outputPngPath, width = 1024, height = 1024) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const page = await browser.newPage({ viewport: { width, height } });
  
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: ${width}px; height: ${height}px; background: #ffffff; overflow: hidden; }
        svg { width: 100%; height: 100%; display: block; color: #4241C4; }
      </style>
    </head>
    <body>
      ${svgContent}
    </body>
    </html>
  `;
  
  await page.setContent(html);
  await page.waitForTimeout(100);
  await page.screenshot({ path: outputPngPath });
  await browser.close();
}

(async () => {
  const svgPath = process.argv[2] || 'brand/svg/mark.svg';
  const outPngPath = process.argv[3] || 'docs/brand/rendered_test.png';
  
  await renderSvg(svgPath, outPngPath);
  console.log(`Rendered ${svgPath} -> ${outPngPath}`);
  
  const pyCmd = `source server/.venv/bin/activate && python -c "
import cv2
import numpy as np

def compute_ssim(img1, img2):
    C1 = (0.01 * 255)**2
    C2 = (0.03 * 255)**2
    img1 = img1.astype(np.float64)
    img2 = img2.astype(np.float64)
    kernel = cv2.getGaussianKernel(11, 1.5)
    window = np.outer(kernel, kernel.transpose())
    mu1 = cv2.filter2D(img1, -1, window)[5:-5, 5:-5]
    mu2 = cv2.filter2D(img2, -1, window)[5:-5, 5:-5]
    mu1_sq = mu1**2
    mu2_sq = mu2**2
    mu1_mu2 = mu1 * mu2
    sigma1_sq = cv2.filter2D(img1**2, -1, window)[5:-5, 5:-5] - mu1_sq
    sigma2_sq = cv2.filter2D(img2**2, -1, window)[5:-5, 5:-5] - mu2_sq
    sigma12 = cv2.filter2D(img1 * img2, -1, window)[5:-5, 5:-5] - mu1_mu2
    return (((2 * mu1_mu2 + C1) * (2 * sigma12 + C2)) / ((mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2))).mean()

gt = cv2.imread('brand/source/logo-master.png')
ren = cv2.imread('${outPngPath}')

b_gt = gt[:, :, 0].astype(float) - (gt[:, :, 1].astype(float) + gt[:, :, 2].astype(float)) / 2.0
m_gt = (b_gt > 40)

b_ren = ren[:, :, 0].astype(float) - (ren[:, :, 1].astype(float) + ren[:, :, 2].astype(float)) / 2.0
m_ren = (b_ren > 40)

inter = np.logical_and(m_gt, m_ren).sum()
union = np.logical_or(m_gt, m_ren).sum()
iou = inter / union
acc = (m_gt == m_ren).sum() / m_gt.size

gt_gray = cv2.cvtColor(gt, cv2.COLOR_BGR2GRAY)
ren_gray = cv2.cvtColor(ren, cv2.COLOR_BGR2GRAY)
ssim_val = compute_ssim(gt_gray, ren_gray)

print(f'Intersection over Union (IoU): {iou * 100:.2f}%')
print(f'Structural Similarity (SSIM):  {ssim_val * 100:.2f}%')
print(f'Pixel Match Accuracy:         {acc * 100:.2f}%')
"`;
  const result = execSync(pyCmd, { encoding: 'utf8' });
  console.log(result);
})().catch(err => {
    console.error(err);
    process.exit(1);
});
