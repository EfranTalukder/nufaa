// screenshot.mjs — Puppeteer screenshot utility for Nufaa Website
// Usage:
//   node screenshot.mjs http://localhost:3000
//   node screenshot.mjs http://localhost:3000 label
// Screenshots are saved to ./temporary screenshots/screenshot-N.png
// Optional label: screenshot-N-label.png

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.argv[2];
const label = process.argv[3] || null;
const mode = process.argv[4] || "full"; // "full" or "view"
const scrollTo = parseInt(process.argv[5] || "0", 10);

if (!url) {
  console.error("❌ Usage: node screenshot.mjs <url> [label]");
  process.exit(1);
}

// Ensure output directory exists
const outputDir = path.join(__dirname, "temporary screenshots");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Auto-increment filename
function getNextFilename() {
  const existing = fs.readdirSync(outputDir).filter((f) => f.endsWith(".png"));
  let maxN = 0;
  for (const f of existing) {
    const match = f.match(/^screenshot-(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxN) maxN = n;
    }
  }
  const n = maxN + 1;
  const name = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;
  return path.join(outputDir, name);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH || undefined, // uses bundled Chrome by default
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Standard desktop viewport
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  console.log(`📸 Navigating to ${url} …`);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

  // Trigger scroll reveals by walking the page top-to-bottom
  await page.evaluate(async () => {
    await new Promise(resolve => {
      const distance = 800;
      const delay = 80;
      let total = 0;
      const timer = setInterval(() => {
        const max = document.body.scrollHeight;
        window.scrollBy(0, distance);
        total += distance;
        if (total >= max) { clearInterval(timer); resolve(); }
      }, delay);
    });
    document.querySelectorAll('.reveal').forEach(el => {
      el.classList.add('visible');
      el.style.transition = 'none';
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.filter = 'none';
    });
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 800));
  });

  if (scrollTo > 0) {
    await page.evaluate(y => window.scrollTo(0, y), scrollTo);
    await new Promise(r => setTimeout(r, 800));
  }

  const filePath = getNextFilename();
  await page.screenshot({ path: filePath, fullPage: mode === "full" });

  console.log(`✅ Screenshot saved: ${filePath}`);

  await browser.close();
})();
