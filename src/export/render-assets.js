import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function toFileUrl(p) {
  // Windows-safe file:// URL
  const resolved = path.resolve(p).replace(/\\/g, "/");
  return "file:///" + resolved.replace(/^([A-Za-z]):\//, "$1:/");
}

export async function renderAssets() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const root = path.join(__dirname, "..", "..");

  const indexPath = path.join(root, "public", "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing ${indexPath}. Run buildHtml() before renderAssets().`);
  }

  const outPdf = path.join(root, "public", "snapshot.pdf");
  const outPortrait = path.join(root, "public", "social", "portrait.png");
  const outStory = path.join(root, "public", "social", "story.png");

  ensureDir(path.dirname(outPdf));
  ensureDir(path.dirname(outPortrait));

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Load the generated HTML as a file URL so assets/CSS resolve correctly
  await page.goto(toFileUrl(indexPath), { waitUntil: "networkidle" });

  // PORTRAIT 1080x1350
  await page.setViewportSize({ width: 1080, height: 1350 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: outPortrait, fullPage: false });

  // STORY 1080x1920
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: outStory, fullPage: false });

  // PDF 8.5x11 portrait
  await page.pdf({
    path: outPdf,
    printBackground: true,
    width: "8.5in",
    height: "11in",
    margin: { top: "0.35in", right: "0.35in", bottom: "0.35in", left: "0.35in" }
  });

  await browser.close();
}
