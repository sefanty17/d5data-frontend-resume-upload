import { mkdir } from "node:fs/promises";
import { BASE_URL, launchBrowser, preparePage } from "./browser.mjs";

const OUT_DIR = "screenshots";
const browser = await launchBrowser();
await mkdir(OUT_DIR, { recursive: true });

async function withPage(options, fn) {
  const page = await browser.newPage(options);
  try {
    await preparePage(page);
    await fn(page);
  } finally {
    await page.close();
  }
}

async function shoot(page, name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, animations: "disabled" });
  console.log("saved", `${OUT_DIR}/${name}.png`);
}

async function dragData(page, fileName = "resume-jane-doe.pdf") {
  return page.evaluateHandle(
    ({ name }) => {
      const data = new DataTransfer();
      data.items.add(
        new File(["%PDF-1.4 sample resume"], name, { type: "application/pdf" }),
      );
      return data;
    },
    { name: fileName },
  );
}

try {
  /* ---------- 1920 x 1080 : every state on a fresh page ---------- */
  await withPage({ viewport: { width: 1920, height: 1080 } }, async (page) => {
    await shoot(page, "desktop-1920x1080");
  });

  await withPage({ viewport: { width: 1920, height: 1080 } }, async (page) => {
    await page.hover(".dropzone");
    await shoot(page, "desktop-1920x1080-dropzone-hover");
  });

  await withPage({ viewport: { width: 1920, height: 1080 } }, async (page) => {
    const box = await page.locator(".dropzone").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(60);
    await shoot(page, "desktop-1920x1080-dropzone-pressed");
    await page.mouse.up();
  });

  await withPage({ viewport: { width: 1920, height: 1080 } }, async (page) => {
    const data = await dragData(page);
    await page.dispatchEvent(".dropzone", "dragenter", { dataTransfer: data });
    await page.dispatchEvent(".dropzone", "dragover", { dataTransfer: data });
    await shoot(page, "desktop-1920x1080-dropzone-dragging");
  });

  await withPage({ viewport: { width: 1920, height: 1080 } }, async (page) => {
    const data = await dragData(page);
    await page.dispatchEvent(".dropzone", "dragenter", { dataTransfer: data });
    await page.dispatchEvent(".dropzone", "drop", { dataTransfer: data });
    await page.waitForTimeout(200);
    const name = await page.locator(".dropzone__filename").innerText();
    console.log("dropped file name rendered:", JSON.stringify(name));
    await page.mouse.move(20, 20);
    await shoot(page, "desktop-1920x1080-file-selected");
  });

  await withPage({ viewport: { width: 1920, height: 1080 } }, async (page) => {
    await page.keyboard.press("Tab");
    await shoot(page, "desktop-1920x1080-focus");
  });

  await withPage({ viewport: { width: 1920, height: 1080 } }, async (page) => {
    await page.hover(".btn--primary");
    await shoot(page, "desktop-1920x1080-button-hover");
  });

  await withPage({ viewport: { width: 1920, height: 1080 } }, async (page) => {
    const box = await page.locator(".btn--primary").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(60);
    await shoot(page, "desktop-1920x1080-button-pressed");
    await page.mouse.up();
  });

  /* ---------- 2x render, directly comparable with the @2x design export ---------- */
  await withPage(
    { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 },
    async (page) => {
      await shoot(page, "desktop-1920x1080@2x");
    },
  );

  /* ---------- narrower desktop + stacked layouts ---------- */
  for (const [name, width, height] of [
    ["desktop-1280x800", 1280, 800],
    ["tablet-1024x900", 1024, 900],
    ["mobile-800x900", 800, 900],
    ["mobile-390x844", 390, 844],
  ]) {
    await withPage({ viewport: { width, height } }, async (page) => {
      await shoot(page, name);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      console.log(name, "horizontal overflow:", overflow);
    });
  }
} finally {
  await browser.close();
}

console.log("done -", BASE_URL);
