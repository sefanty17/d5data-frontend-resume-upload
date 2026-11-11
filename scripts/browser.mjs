import { chromium } from "playwright-core";

/**
 * Launch the locally installed browser. playwright-core ships no browser
 * binaries, so we reuse Edge/Chrome that is already on the machine
 * (no download, nothing fetched at runtime).
 */
export async function launchBrowser() {
  const channels = ["msedge", "chrome", "chromium"];
  const errors = [];

  for (const channel of channels) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (error) {
      errors.push(`${channel}: ${error.message.split("\n")[0]}`);
    }
  }

  throw new Error(
    `Could not launch a local Chromium based browser.\n${errors.join("\n")}`,
  );
}

export const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

export async function preparePage(page) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  // Wait for the webfonts and for two frames instead of a fixed sleep, so the
  // measured boxes are the final ones even on a slow machine.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
}
