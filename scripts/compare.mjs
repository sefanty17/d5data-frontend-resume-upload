import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchBrowser } from "./browser.mjs";

const EXPECTED_SIZE = { width: 3840, height: 2160 };
const MAX_GLOBAL_DIFF_PERCENT = 2;

const DESIGN = "设计稿/renders/frame-1-20@2x.png";
const MINE = process.env.MINE ?? "screenshots/desktop-1920x1080@2x.png";
const OUT_DIR =
  process.env.COMPARE_OUT_DIR ?? join(tmpdir(), "finish-upload-compare");

function pngSize(buffer, label) {
  if (buffer.length < 24 || buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`${label} is not a PNG file`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const designBuffer = readFileSync(DESIGN);
const mineBuffer = readFileSync(MINE);
const designSize = pngSize(designBuffer, DESIGN);
const mineSize = pngSize(mineBuffer, MINE);

let failed = false;
for (const [label, size] of [
  [DESIGN, designSize],
  [MINE, mineSize],
]) {
  const ok =
    size.width === EXPECTED_SIZE.width && size.height === EXPECTED_SIZE.height;
  console.log(
    `${ok ? "OK  " : "FAIL"} ${label}: ${size.width} x ${size.height} (expected ${EXPECTED_SIZE.width} x ${EXPECTED_SIZE.height})`,
  );
  if (!ok) failed = true;
}
if (failed) {
  console.log(
    "PIXEL COMPARISON ABORTED: both images must be exactly 3840 x 2160; refusing to scale one to the other",
  );
  process.exit(1);
}

const designB64 = designBuffer.toString("base64");
const mineB64 = mineBuffer.toString("base64");

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.setContent("<canvas id=c></canvas>");

const result = await page.evaluate(
  async ({ designB64, mineB64, expectedWidth, expectedHeight }) => {
    const load = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    const [design, mine] = await Promise.all([
      load("data:image/png;base64," + designB64),
      load("data:image/png;base64," + mineB64),
    ]);

    if (
      design.naturalWidth !== expectedWidth ||
      design.naturalHeight !== expectedHeight ||
      mine.naturalWidth !== expectedWidth ||
      mine.naturalHeight !== expectedHeight
    ) {
      throw new Error(
        `decoded sizes differ: design ${design.naturalWidth}x${design.naturalHeight}, implementation ${mine.naturalWidth}x${mine.naturalHeight}`,
      );
    }

    const w = design.naturalWidth;
    const h = design.naturalHeight;

    // Draw at the natural size - no downscaling that could hide a wrong
    // screenshot size.
    const read = (img) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, w, h).data;
    };

    const a = read(design);
    const b = read(mine);

    const diff = new Uint8ClampedArray(w * h * 4);
    let changed = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(
        Math.abs(a[i] - b[i]),
        Math.abs(a[i + 1] - b[i + 1]),
        Math.abs(a[i + 2] - b[i + 2]),
      );
      const p = (i / 4) * 4;
      if (d > 24) {
        changed++;
        diff[p] = 255;
        diff[p + 1] = 40;
        diff[p + 2] = 40;
        diff[p + 3] = 255;
      } else {
        diff[p] = 240;
        diff[p + 1] = 240;
        diff[p + 2] = 240;
        diff[p + 3] = 255;
      }
    }

    const diffCanvas = document.createElement("canvas");
    diffCanvas.width = w;
    diffCanvas.height = h;
    diffCanvas.getContext("2d").putImageData(new ImageData(diff, w, h), 0, 0);

    // Region statistics (CSS pixel coordinates of the 1920x1080 artboard).
    const regions = {
      "hero text": [102, 110, 800, 230],
      illustration: [0, 511, 763, 569],
      card: [875, 103, 943, 922],
      "card title": [1004, 120, 400, 60],
      dropzone: [1004, 221, 685, 420],
      "dropzone icon": [1300, 360, 100, 80],
      "dropzone hint": [1080, 420, 540, 90],
      buttons: [1060, 739, 573, 67],
      stepper: [1170, 900, 360, 50],
    };

    const stats = {};
    for (const [name, [x, y, rw, rh]] of Object.entries(regions)) {
      let regionChanged = 0;
      let total = 0;
      for (let py = Math.round(y * 2); py < Math.round((y + rh) * 2); py++) {
        for (let px = Math.round(x * 2); px < Math.round((x + rw) * 2); px++) {
          const i = (py * w + px) * 4;
          total++;
          if (diff[i] === 255 && diff[i + 1] === 40) regionChanged++;
        }
      }
      stats[name] = +((regionChanged / total) * 100).toFixed(2);
    }

    const pair = (x, y, cw, ch) => {
      const c = document.createElement("canvas");
      c.width = cw * 2;
      c.height = ch * 4 + 8;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(design, x * 2, y * 2, cw * 2, ch * 2, 0, 0, cw * 2, ch * 2);
      ctx.drawImage(mine, x * 2, y * 2, cw * 2, ch * 2, 0, ch * 2 + 8, cw * 2, ch * 2);
      return c.toDataURL("image/png");
    };

    // Full page side by side (design on top, implementation below).
    const sideBySide = document.createElement("canvas");
    sideBySide.width = 1920;
    sideBySide.height = 1080 * 2 + 16;
    const sbCtx = sideBySide.getContext("2d");
    sbCtx.fillStyle = "#d0d7dd";
    sbCtx.fillRect(0, 0, sideBySide.width, sideBySide.height);
    sbCtx.drawImage(design, 0, 0, 3840, 2160, 0, 0, 1920, 1080);
    sbCtx.drawImage(mine, 0, 0, 3840, 2160, 0, 1080 + 16, 1920, 1080);

    return {
      globalDiffPercent: +((changed / (w * h)) * 100).toFixed(2),
      size: [w, h],
      stats,
      diffUrl: diffCanvas.toDataURL("image/png"),
      sideBySideUrl: sideBySide.toDataURL("image/png"),
      crops: {
        stepper: pair(1160, 895, 380, 55),
        buttons: pair(1040, 725, 620, 95),
        "card-header": pair(990, 115, 500, 130),
        hero: pair(90, 110, 760, 230),
        dropzone: pair(990, 360, 720, 160),
      },
    };
  },
  {
    designB64,
    mineB64,
    expectedWidth: EXPECTED_SIZE.width,
    expectedHeight: EXPECTED_SIZE.height,
  },
);

await browser.close();

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, "design-diff-2x.png"),
  Buffer.from(result.diffUrl.split(",")[1], "base64"),
);
writeFileSync(
  join(OUT_DIR, "design-vs-implementation.png"),
  Buffer.from(result.sideBySideUrl.split(",")[1], "base64"),
);
for (const [name, url] of Object.entries(result.crops)) {
  writeFileSync(
    join(OUT_DIR, `design-compare-${name}.png`),
    Buffer.from(url.split(",")[1], "base64"),
  );
}

console.log("size:", result.size.join(" x "));
console.log("global diff:", result.globalDiffPercent + "%");
console.log("region diff:", JSON.stringify(result.stats, null, 1));
console.log("artifacts:", OUT_DIR);
console.log(
  "colour: the Display P3 design PNG is decoded into sRGB by the browser canvas; see README 'Known differences'.",
);
if (result.globalDiffPercent > MAX_GLOBAL_DIFF_PERCENT) {
  console.log(
    `PIXEL COMPARISON FAILED: ${result.globalDiffPercent}% > ${MAX_GLOBAL_DIFF_PERCENT}% threshold`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `PIXEL COMPARISON PASSED: ${result.globalDiffPercent}% <= ${MAX_GLOBAL_DIFF_PERCENT}% threshold`,
  );
}
