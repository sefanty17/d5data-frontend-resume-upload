import { BASE_URL, launchBrowser, preparePage } from "./browser.mjs";

const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok, extra });
  console.log(ok ? "PASS" : "FAIL", name, extra);
};

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(String(error)));
await preparePage(page);

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const pdfBuffer = Buffer.from("%PDF-1.4 resume");
const dropzone = page.locator(".dropzone");
const errorBox = page.locator('.dropzone__error[role="alert"]');
const liveRegion = page.locator('[role="status"]');

const textOf = async (locator) => (await locator.textContent()) ?? "";

async function waitForFilename(name) {
  await page.waitForFunction(
    (expected) =>
      document.querySelector(".dropzone__filename")?.textContent === expected,
    name,
  );
}

async function waitForNoFilename() {
  await page.waitForFunction(
    () => document.querySelector(".dropzone__filename") === null,
  );
}

async function waitForError(fragment) {
  await page.waitForFunction(
    (needle) =>
      document
        .querySelector(".dropzone__error")
        ?.textContent?.includes(needle) === true,
    fragment,
  );
}

async function waitForNoError() {
  await page.waitForFunction(
    () => document.querySelector(".dropzone__error") === null,
  );
}

async function waitForDragState(active) {
  await page.waitForFunction(
    (expected) =>
      (document.querySelector(".dropzone")?.dataset.dragging === "true") ===
      expected,
    active,
  );
}

async function dropzoneBox() {
  const box = await dropzone.boundingBox();
  return { width: +box.width.toFixed(1), height: +box.height.toFixed(1) };
}

async function pageMetrics() {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
}

async function clickDropzone() {
  const box = await dropzone.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/**
 * Resolve the file chooser opened by an action without leaking a rejected
 * waitForEvent promise when the control is broken (returns null instead).
 */
async function openPickerWith(action) {
  const chooserPromise = page
    .waitForEvent("filechooser", { timeout: 5000 })
    .catch(() => null);
  const actionPromise = action().catch(() => null);
  const [chooser] = await Promise.all([chooserPromise, actionPromise]);
  return chooser;
}

async function upload(chooser, file) {
  if (!chooser) return false;
  await chooser.setFiles(file);
  return true;
}

async function tabToDropzone() {
  await page.evaluate(() => document.activeElement?.blur?.());
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(
      () => document.activeElement?.classList.contains("dropzone__hit") ?? false,
    );
    if (focused) return true;
  }
  return false;
}

try {
  /* 1. click the hit area: the picker opens and the file renders */
  const clickChooser = await openPickerWith(clickDropzone);
  check("click opens the native file picker", clickChooser !== null);
  await upload(clickChooser, {
    name: "jane-doe.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await waitForFilename("jane-doe.pdf");
  check(
    "click upload shows the file name",
    (await textOf(page.locator(".dropzone__filename"))) === "jane-doe.pdf",
  );
  check(
    "file meta shows type and size",
    (await textOf(page.locator(".dropzone__meta"))) === "PDF · 15 B",
    await textOf(page.locator(".dropzone__meta")),
  );
  const liveAfterClick = await textOf(liveRegion);
  check(
    "live region announces the selected file",
    liveAfterClick.includes("jane-doe.pdf selected, 15 B."),
    liveAfterClick,
  );

  /* 2. Replace with another valid file */
  const replaceChooser = await openPickerWith(() =>
    page.getByRole("button", { name: "Replace file", exact: true }).click(),
  );
  check("Replace opens the picker", replaceChooser !== null);
  await upload(replaceChooser, {
    name: "jane-doe-v2.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await waitForFilename("jane-doe-v2.pdf");
  check(
    "Replace swaps the file",
    (await textOf(page.locator(".dropzone__filename"))) === "jane-doe-v2.pdf",
  );

  /* 3. S1 regression: Replace with an invalid file must not swallow the error */
  const invalidReplaceChooser = await openPickerWith(() =>
    page.getByRole("button", { name: "Replace file", exact: true }).click(),
  );
  check("Replace (invalid attempt) opens the picker", invalidReplaceChooser !== null);
  await upload(invalidReplaceChooser, {
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("x"),
  });
  await waitForError("not supported");
  const invalidError = await textOf(errorBox);
  const invalidLive = await textOf(liveRegion);
  check(
    "invalid Replace shows a visible role=alert",
    (await errorBox.count()) === 1 &&
      (await errorBox.isVisible()) &&
      (await errorBox.getAttribute("role")) === "alert",
    invalidError,
  );
  check(
    "invalid Replace keeps the previous file",
    (await textOf(page.locator(".dropzone__filename"))) === "jane-doe-v2.pdf",
  );
  check(
    "invalid Replace updates aria-live with the error",
    invalidLive.includes("not supported") && invalidLive === invalidError,
    invalidLive,
  );
  const invalidReplaceBox = await dropzoneBox();
  check(
    "invalid Replace does not change the drop area box",
    invalidReplaceBox.width === 685 && invalidReplaceBox.height === 420,
    JSON.stringify(invalidReplaceBox),
  );
  const invalidReplaceMetrics = await pageMetrics();
  check(
    "invalid Replace keeps the 1920x1080 page",
    invalidReplaceMetrics.scrollWidth === 1920 &&
      invalidReplaceMetrics.scrollHeight === 1080,
    JSON.stringify(invalidReplaceMetrics),
  );

  /* 4. Remove clears file, error and live region */
  await page.getByRole("button", { name: "Remove" }).click();
  await waitForNoFilename();
  await waitForNoError();
  check(
    "Remove clears the file and the error",
    (await page.locator(".dropzone__filename").count()) === 0 &&
      (await errorBox.count()) === 0,
  );
  check("live region is empty after Remove", (await textOf(liveRegion)) === "");

  /* 5. drag & drop with a synthetic DataTransfer */
  const dataTransfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(
      new File(["%PDF-1.4"], "dropped-resume.pdf", { type: "application/pdf" }),
    );
    return dt;
  });
  await page.dispatchEvent(".dropzone", "dragenter", { dataTransfer });
  await page.dispatchEvent(".dropzone", "dragover", { dataTransfer });
  let dragState = true;
  try {
    await waitForDragState(true);
  } catch {
    dragState = false;
  }
  check("dragenter/dragover set the drag state", dragState);
  await page.dispatchEvent(".dropzone", "drop", { dataTransfer });
  await waitForFilename("dropped-resume.pdf");
  check(
    "drop renders the dropped file",
    (await textOf(page.locator(".dropzone__filename"))) ===
      "dropped-resume.pdf",
  );
  await page.waitForFunction(
    () => document.querySelector(".dropzone")?.dataset.dragging !== "true",
  );
  check(
    "drop clears the drag state",
    (await dropzone.getAttribute("data-dragging")) === null,
  );

  /* 6. dragend resets a drag state that never received a drop */
  await page.dispatchEvent(".dropzone", "dragenter", { dataTransfer });
  await waitForDragState(true);
  await page.evaluate(() =>
    window.dispatchEvent(new DragEvent("dragend", { bubbles: true })),
  );
  await page.waitForFunction(
    () => document.querySelector(".dropzone")?.dataset.dragging !== "true",
  );
  check(
    "window dragend clears a stuck drag state",
    (await dropzone.getAttribute("data-dragging")) === null,
  );
  await page.getByRole("button", { name: "Remove" }).click();
  await waitForNoFilename();

  /* 7. keyboard: Tab, focus ring, Enter and Space */
  check("Tab reaches the drop area", await tabToDropzone());
  const focusRing = await page.evaluate(() => {
    // This Chromium build computes a declared 2px outline as 1.6px on the
    // current Windows host (2 / 1.25 display scale), for every element. Use a
    // control probe declaring exactly 2px so the assertion stays about the
    // ring's declaration instead of a host-specific pixel conversion.
    const probe = document.createElement("div");
    probe.style.outline = "2px solid rgb(27, 90, 255)";
    document.body.appendChild(probe);
    const expectedWidth = getComputedStyle(probe).outlineWidth;
    probe.remove();

    const style = getComputedStyle(document.querySelector(".dropzone"));
    return {
      width: style.outlineWidth,
      expectedWidth,
      offset: style.outlineOffset,
      style: style.outlineStyle,
      color: style.outlineColor,
    };
  });
  check(
    "keyboard focus shows the 2px focus ring",
    focusRing.style === "solid" &&
      focusRing.width === focusRing.expectedWidth &&
      focusRing.offset === "2px" &&
      focusRing.color === "rgb(27, 90, 255)",
    JSON.stringify(focusRing),
  );

  const enterChooser = await openPickerWith(() => page.keyboard.press("Enter"));
  check("Enter opens the picker", enterChooser !== null);
  await upload(enterChooser, {
    name: "keyboard.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await waitForFilename("keyboard.pdf");
  check(
    "Enter uploads the file",
    (await textOf(page.locator(".dropzone__filename"))) === "keyboard.pdf",
  );

  await page.getByRole("button", { name: "Remove" }).click();
  await waitForNoFilename();
  check("Tab reaches the drop area again", await tabToDropzone());
  const spaceChooser = await openPickerWith(() => page.keyboard.press("Space"));
  check("Space opens the picker", spaceChooser !== null);
  await upload(spaceChooser, {
    name: "space.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await waitForFilename("space.pdf");
  check(
    "Space uploads the file",
    (await textOf(page.locator(".dropzone__filename"))) === "space.pdf",
  );

  /* 8. unsupported file type in the empty state */
  await page.getByRole("button", { name: "Remove" }).click();
  await waitForNoFilename();
  const invalidChooser = await openPickerWith(clickDropzone);
  check("invalid file picker opens", invalidChooser !== null);
  await upload(invalidChooser, {
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from("x"),
  });
  await waitForError("not supported");
  const typeError = await textOf(errorBox);
  check(
    "unsupported type shows a visible role=alert",
    (await errorBox.count()) === 1 && (await errorBox.isVisible()),
    typeError,
  );
  const typeLive = await textOf(liveRegion);
  check(
    "unsupported type updates aria-live with the error",
    typeLive.includes("not supported") && typeLive === typeError,
    typeLive,
  );
  check(
    "unsupported type renders no file name",
    (await page.locator(".dropzone__filename").count()) === 0,
  );
  const emptyErrorBox = await dropzoneBox();
  check(
    "unsupported type keeps the drop area box",
    emptyErrorBox.width === 685 && emptyErrorBox.height === 420,
    JSON.stringify(emptyErrorBox),
  );
  const emptyErrorMetrics = await pageMetrics();
  check(
    "unsupported type keeps the 1920x1080 page",
    emptyErrorMetrics.scrollWidth === 1920 &&
      emptyErrorMetrics.scrollHeight === 1080,
    JSON.stringify(emptyErrorMetrics),
  );

  /* 9. 10 MB boundary: exact limit accepted, limit + 1 byte rejected */
  const exactChooser = await openPickerWith(clickDropzone);
  check("10 MB file picker opens", exactChooser !== null);
  await upload(exactChooser, {
    name: "exactly-10mb.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(MAX_FILE_SIZE, 0x20),
  });
  await waitForFilename("exactly-10mb.pdf");
  check(
    "exactly 10 MB is accepted",
    (await textOf(page.locator(".dropzone__filename"))) ===
      "exactly-10mb.pdf",
  );
  check(
    "exactly 10 MB announces its size",
    (await textOf(page.locator(".dropzone__meta"))).includes("10.0 MB") &&
      (await textOf(liveRegion)).includes(
        "exactly-10mb.pdf selected, 10.0 MB.",
      ),
    await textOf(liveRegion),
  );
  check(
    "exactly 10 MB clears the previous error",
    (await errorBox.count()) === 0,
  );

  await page.getByRole("button", { name: "Remove" }).click();
  await waitForNoFilename();
  const oversizeChooser = await openPickerWith(clickDropzone);
  check("10 MB + 1 B picker opens", oversizeChooser !== null);
  await upload(oversizeChooser, {
    name: "oversize.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(MAX_FILE_SIZE + 1, 0x20),
  });
  await waitForError("maximum size is 10 MB");
  const oversizeError = await textOf(errorBox);
  const oversizeLive = await textOf(liveRegion);
  check(
    "10 MB + 1 B is rejected with a visible error",
    (await errorBox.isVisible()) && (await errorBox.getAttribute("role")) === "alert",
    oversizeError,
  );
  check(
    "10 MB + 1 B reports exact bytes and the inclusive limit",
    oversizeError.includes("10,485,761 bytes") &&
      oversizeError.includes("maximum size is 10 MB (10,485,760 bytes)"),
    oversizeError,
  );
  check(
    "10 MB + 1 B updates aria-live with the error",
    oversizeLive.includes("maximum size is 10 MB") &&
      oversizeLive === oversizeError,
    oversizeLive,
  );
  check(
    "10 MB + 1 B renders no file name",
    (await page.locator(".dropzone__filename").count()) === 0,
  );
  const oversizeBox = await dropzoneBox();
  check(
    "10 MB + 1 B keeps the drop area box",
    oversizeBox.width === 685 && oversizeBox.height === 420,
    JSON.stringify(oversizeBox),
  );

  /* Reset before the responsive pass */
  const resetChooser = await openPickerWith(clickDropzone);
  await upload(resetChooser, {
    name: "reset.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await waitForFilename("reset.pdf");
  await page.getByRole("button", { name: "Remove" }).click();
  await waitForNoFilename();
  await waitForNoError();

  /* 10. no horizontal scrollbar at any tested width */
  for (const width of [1920, 1440, 1280, 1024, 800, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(
      (expected) => window.innerWidth === expected,
      width,
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    check(`no horizontal scroll at ${width}px`, overflow <= 0, `overflow=${overflow}`);
  }

  /* 11. filled-state error on mobile: grow the box instead of covering actions */
  await page.setViewportSize({ width: 390, height: 900 });
  await page.waitForFunction(() => window.innerWidth === 390);
  const mobileFileChooser = await openPickerWith(clickDropzone);
  check("mobile file picker opens", mobileFileChooser !== null);
  await upload(mobileFileChooser, {
    name: "mobile-ok.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await waitForFilename("mobile-ok.pdf");
  const mobileReplaceChooser = await openPickerWith(() =>
    page.getByRole("button", { name: "Replace file", exact: true }).click(),
  );
  await upload(mobileReplaceChooser, {
    name: "mobile-bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("x"),
  });
  await waitForError("not supported");
  const mobileErrorLayout = await page.evaluate(() => {
    const rect = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        right: r.right,
        bottom: r.bottom,
      };
    };
    const overlaps = (a, b) =>
      Boolean(a && b) &&
      a.x < b.right &&
      b.x < a.right &&
      a.y < b.bottom &&
      b.y < a.bottom;
    const dropzone = rect(".dropzone");
    const error = rect(".dropzone__error");
    const actions = rect(".dropzone__actions");
    const filename = rect(".dropzone__filename");
    return {
      dropzoneHeight: dropzone.height,
      errorWithinDropzone:
        Boolean(error) &&
        error.bottom <= dropzone.bottom + 0.5 &&
        error.y >= dropzone.y - 0.5,
      overlapsActions: overlaps(error, actions),
      overlapsFilename: overlaps(error, filename),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  check(
    "mobile invalid Replace keeps the error clear of the file actions",
    (await errorBox.isVisible()) &&
      !mobileErrorLayout.overlapsActions &&
      !mobileErrorLayout.overlapsFilename,
    JSON.stringify(mobileErrorLayout),
  );
  check(
    "mobile invalid Replace grows the drop area without horizontal overflow",
    mobileErrorLayout.dropzoneHeight > 220 &&
      mobileErrorLayout.errorWithinDropzone &&
      mobileErrorLayout.scrollWidth === mobileErrorLayout.clientWidth,
    JSON.stringify(mobileErrorLayout),
  );

  check("no console errors", consoleErrors.length === 0, consoleErrors.join(" | "));
} catch (error) {
  results.push({ name: "smoke run completed", ok: false, extra: String(error) });
  console.log("FAIL smoke run completed", String(error));
} finally {
  await browser.close();
  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exitCode = failed.length ? 1 : 0;
  console.log("base url", BASE_URL);
}
