import { BASE_URL, launchBrowser, preparePage } from "./browser.mjs";

const VIEWPORT = { width: 1920, height: 1080 };
const STACKED_VIEWPORT = { width: 800, height: 900 };

/**
 * Values from 设计稿/raw/node-1-20.json, frame "1:20" (1920 x 1080), after
 * subtracting the frame origin (0, -0.2890625) and rounding.
 *
 * The frame origin matters: absoluteBoundingBox values are 123.71 / 102.71 /
 * 220.71 ..., so the frame-relative integers are 124 / 103 / 221 ...
 *
 * kind: "text" marks the two Figma TEXT nodes. Their widths (394 / 214) are
 * auto-width text-node widths, while the browser lays them out as block boxes
 * (773 / 685). Those two nodes are therefore compared on x / y / height only.
 * The claim is deliberately:
 *   12 container boxes (x/y/w/h) + 2 text nodes (x/y/h).
 */
const EXPECTED = {
  ".card": { x: 875, y: 103, width: 943, height: 922 },
  ".card__title": { x: 1004, y: 133, height: 35, kind: "text" },
  ".dropzone": { x: 1004, y: 221, width: 685, height: 420 },
  ".dropzone__icon": { x: 1317.5, y: 381, width: 58, height: 39 },
  ".dropzone__hint": { x: 1097, y: 434, width: 499, height: 64 },
  ".btn--secondary": { x: 1060, y: 739, width: 272, height: 67 },
  ".btn--primary": { x: 1361, y: 739, width: 272, height: 67 },
  ".stepper": { x: 1175, y: 907, width: 343, height: 32 },
  ".stepper__item--1": { x: 1203, y: 907, width: 32, height: 32 },
  ".stepper__item--2": { x: 1331, y: 907, width: 32, height: 32 },
  ".stepper__item--3": { x: 1459, y: 907, width: 32, height: 32 },
  ".hero__title": { x: 102, y: 124, height: 110, kind: "text" },
  ".hero__lead": { x: 102, y: 254, width: 696, height: 70 },
  ".page__art": { x: 0, y: 511, width: 763, height: 569 },
};

const selectors = Object.keys(EXPECTED);
const textSelectors = selectors.filter((s) => EXPECTED[s].kind === "text");
const problems = [];
const fail = (message) => {
  problems.push(message);
  console.log("FAIL", message);
};

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: VIEWPORT });
await preparePage(page);

const actual = await page.evaluate((list) => {
  const result = {};
  for (const selector of list) {
    const el = document.querySelector(selector);
    if (!el) {
      result[selector] = null;
      continue;
    }
    const r = el.getBoundingClientRect();
    result[selector] = {
      x: +r.x.toFixed(2),
      y: +r.y.toFixed(2),
      width: +r.width.toFixed(2),
      height: +r.height.toFixed(2),
    };
  }
  const doc = document.documentElement;
  return {
    boxes: result,
    scroll: {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      scrollHeight: doc.scrollHeight,
      clientHeight: doc.clientHeight,
    },
  };
}, selectors);

for (const [selector, expected] of Object.entries(EXPECTED)) {
  const got = actual.boxes[selector];
  const isText = expected.kind === "text";
  if (!got) {
    fail(`missing ${selector}`);
    continue;
  }
  const diffs = [];
  const comparedKeys = isText ? ["x", "y", "height"] : ["x", "y", "width", "height"];
  for (const key of comparedKeys) {
    const delta = +(got[key] - expected[key]).toFixed(2);
    if (Math.abs(delta) > 1) {
      diffs.push(
        `${key}: expected ${expected[key]} got ${got[key]} (${delta > 0 ? "+" : ""}${delta})`,
      );
    }
  }
  const label = isText ? "text x/y/h" : "box x/y/w/h";
  if (diffs.length) {
    fail(`${selector} [${label}]: ${diffs.join(" | ")}`);
  } else {
    console.log(`OK   ${selector} [${label}]`);
  }
}

/* The frame is exactly 1920 x 1080 and must not scroll. */
const SCROLL_EXPECTED = {
  scrollWidth: VIEWPORT.width,
  clientWidth: VIEWPORT.width,
  scrollHeight: VIEWPORT.height,
  clientHeight: VIEWPORT.height,
};
console.log("scroll:", JSON.stringify(actual.scroll));
for (const [key, expected] of Object.entries(SCROLL_EXPECTED)) {
  if (actual.scroll[key] !== expected) {
    fail(`scroll: ${key} expected ${expected} got ${actual.scroll[key]}`);
  }
}

/* 800 x 900 must be the stacked composition without horizontal overflow. */
await page.setViewportSize(STACKED_VIEWPORT);
await page.waitForFunction(
  ({ width, height }) => window.innerWidth === width && window.innerHeight === height,
  STACKED_VIEWPORT,
);
await page.evaluate(
  () =>
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    ),
);
const stacked = await page.evaluate(() => {
  const card = document.querySelector(".card").getBoundingClientRect();
  const hero = document.querySelector(".hero").getBoundingClientRect();
  const art = document.querySelector(".page__art");
  const doc = document.documentElement;
  return {
    heroBottom: +hero.bottom.toFixed(1),
    cardTop: +card.top.toFixed(1),
    cardWidth: +card.width.toFixed(1),
    stacked: hero.bottom <= card.top,
    artDisplay: art ? getComputedStyle(art).display : null,
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
  };
});
console.log("800x900 stacked check:", JSON.stringify(stacked), "base:", BASE_URL);

const stackedChecks = [
  ["hero is above the card", stacked.stacked],
  ["card spans the 800px column (736px)", Math.abs(stacked.cardWidth - 736) <= 1],
  [
    "no horizontal overflow at 800x900",
    stacked.scrollWidth === STACKED_VIEWPORT.width &&
      stacked.clientWidth === STACKED_VIEWPORT.width,
  ],
  ["illustration is hidden", stacked.artDisplay === "none"],
];
for (const [name, ok] of stackedChecks) {
  if (ok) console.log(`OK   stacked: ${name}`);
  else fail(`stacked: ${name}`);
}

await browser.close();

console.log("---");
console.log(
  `selectors: ${selectors.length} (${selectors.length - textSelectors.length} container boxes x/y/w/h + ${textSelectors.length} text nodes x/y/h)`,
);
if (problems.length === 0) {
  console.log("LAYOUT VERIFICATION PASSED: frame, scroll and stacked layout match");
} else {
  console.log(`LAYOUT VERIFICATION FAILED: ${problems.length} problem(s)`);
  process.exitCode = 1;
}
