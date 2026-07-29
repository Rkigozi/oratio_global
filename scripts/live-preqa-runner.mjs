import { chromium, devices } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.ORATIO_BASE_URL || "https://oratiotest.netlify.app";
const email = process.env.ORATIO_QA_EMAIL;
const password = process.env.ORATIO_QA_PASSWORD;
const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const outDir = path.resolve("outputs/preqa");
const results = [];

function nowIso() {
  return new Date().toISOString();
}

async function ensureOutDir() {
  await fs.mkdir(outDir, { recursive: true });
}

async function record(name, status, details = {}) {
  results.push({ name, status, ...details });
}

async function runCheck(name, fn) {
  const startedAt = Date.now();
  try {
    const details = await fn();
    await record(name, "pass", { durationMs: Date.now() - startedAt, ...details });
  } catch (error) {
    await record(name, "fail", {
      durationMs: Date.now() - startedAt,
      error: error?.message || String(error),
    });
  }
}

async function makeContext(browser, options = {}) {
  const consoleMessages = [];
  const pageErrors = [];
  const context = await browser.newContext(options);
  context.on("page", (page) => attachPageDiagnostics(page, consoleMessages, pageErrors));
  const page = await context.newPage();
  attachPageDiagnostics(page, consoleMessages, pageErrors);
  return { context, page, consoleMessages, pageErrors };
}

function attachPageDiagnostics(page, consoleMessages, pageErrors) {
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        url: page.url(),
      });
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push({ message: error.message, url: page.url() });
  });
}

async function gotoAndWait(page, route) {
  await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
}

async function visibleText(page, textOrRegex) {
  await page.getByText(textOrRegex).first().waitFor({ state: "visible", timeout: 10000 });
}

async function login(page) {
  if (!email || !password) {
    throw new Error("ORATIO_QA_EMAIL and ORATIO_QA_PASSWORD are required");
  }
  await gotoAndWait(page, "/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
}

async function main() {
  await ensureOutDir();
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  await runCheck("AUTH-001 landing loads logged out", async () => {
    const { context, page, consoleMessages, pageErrors } = await makeContext(browser);
    await gotoAndWait(page, "/landing");
    await visibleText(page, /Oratio/i);
    await visibleText(page, /Sign In/i);
    await visibleText(page, /Create Account/i);
    const url = page.url();
    await context.close();
    return { url, consoleMessages, pageErrors };
  });

  await runCheck("AUTH-002 private routes redirect when logged out", async () => {
    const { context, page, consoleMessages, pageErrors } = await makeContext(browser);
    const routes = ["/", "/feed", "/submit", "/profile", "/profile/settings", "/profile/circle", "/moderate"];
    const redirects = [];
    for (const route of routes) {
      await gotoAndWait(page, route);
      redirects.push({ route, finalUrl: page.url() });
      if (!/\/landing|\/login/.test(new URL(page.url()).pathname)) {
        throw new Error(`${route} did not redirect; final URL ${page.url()}`);
      }
    }
    await context.close();
    return { redirects, consoleMessages, pageErrors };
  });

  await runCheck("AUTH-004 QA Miriam can sign in", async () => {
    const { context, page, consoleMessages, pageErrors } = await makeContext(browser);
    await login(page);
    const url = page.url();
    const body = await page.locator("body").innerText({ timeout: 10000 });
    if (!/Feed|Map|Profile|Submit|Prayer/i.test(body)) {
      throw new Error("Signed-in shell did not show expected app navigation/content");
    }
    await context.close();
    return { url, consoleMessages, pageErrors };
  });

  await runCheck("AUTH-005 invalid credentials are rejected", async () => {
    const { context, page, consoleMessages, pageErrors } = await makeContext(browser);
    await gotoAndWait(page, "/login");
    await page.getByPlaceholder("Email").fill(email || "oratio.qa.miriam@example.com");
    await page.getByPlaceholder("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await visibleText(page, /invalid|incorrect|credentials|email and password/i);
    await context.close();
    return { finalUrl: page.url(), consoleMessages, pageErrors };
  });

  await runCheck("PERF-001 landing desktop load timing", async () => {
    const { context, page, consoleMessages, pageErrors } = await makeContext(browser);
    const start = Date.now();
    await gotoAndWait(page, "/landing");
    await visibleText(page, /Oratio/i);
    const elapsedMs = Date.now() - start;
    await context.close();
    return { elapsedMs, consoleMessages, pageErrors };
  });

  await runCheck("PERF-001 landing mobile viewport load timing", async () => {
    const { context, page, consoleMessages, pageErrors } = await makeContext(browser, {
      ...devices["iPhone 13"],
    });
    const start = Date.now();
    await gotoAndWait(page, "/landing");
    await visibleText(page, /Oratio/i);
    const elapsedMs = Date.now() - start;
    await page.screenshot({ path: path.join(outDir, "landing-iphone13.png"), fullPage: true });
    await context.close();
    return { elapsedMs, screenshot: "outputs/preqa/landing-iphone13.png", consoleMessages, pageErrors };
  });

  await runCheck("PRAY-001 QA Miriam can submit a valid prayer", async () => {
    const { context, page, consoleMessages, pageErrors } = await makeContext(browser);
    await login(page);
    await gotoAndWait(page, "/submit");
    await page.getByPlaceholder(/Share what's on your heart/i).fill(
      `QA smoke test prayer ${nowIso()} - please delete after QA.`
    );
    await page.getByLabel(/Auto-detect/i).click();
    await page.getByPlaceholder("City").fill("London");
    await page.locator("select").selectOption("United Kingdom");
    await page.getByRole("button", { name: /Submit Prayer Request/i }).click();
    await visibleText(page, /Prayer Request Submitted/i);
    await context.close();
    return { finalUrl: page.url(), consoleMessages, pageErrors };
  });

  await runCheck("FEED-001 feed loads after login", async () => {
    const { context, page, consoleMessages, pageErrors } = await makeContext(browser);
    await login(page);
    await gotoAndWait(page, "/feed");
    await visibleText(page, /prayer|feed|around the world/i);
    const body = await page.locator("body").innerText({ timeout: 10000 });
    await context.close();
    return {
      finalUrl: page.url(),
      hasSearch: /Search prayers/i.test(body),
      consoleMessages,
      pageErrors,
    };
  });

  await runCheck("MAP-001 map/home route loads after login", async () => {
    const { context, page, consoleMessages, pageErrors } = await makeContext(browser);
    await login(page);
    await gotoAndWait(page, "/");
    await page.locator("body").waitFor({ state: "visible", timeout: 10000 });
    const body = await page.locator("body").innerText({ timeout: 10000 });
    if (!/map|prayer|near|world|location/i.test(body)) {
      throw new Error("Map/home route did not show expected map/prayer text");
    }
    await context.close();
    return { finalUrl: page.url(), textSample: body.slice(0, 500), consoleMessages, pageErrors };
  });

  await runCheck("PROFILE-001 profile route loads after login", async () => {
    const { context, page, consoleMessages, pageErrors } = await makeContext(browser);
    await login(page);
    await gotoAndWait(page, "/profile");
    await visibleText(page, /qa_miriam|profile|settings|sign out/i);
    await context.close();
    return { finalUrl: page.url(), consoleMessages, pageErrors };
  });

  await runCheck("UI-002/UI-003 landing responds in light and dark media modes", async () => {
    const checks = [];
    for (const scheme of ["light", "dark"]) {
      const { context, page, consoleMessages, pageErrors } = await makeContext(browser, {
        colorScheme: scheme,
      });
      await gotoAndWait(page, "/landing");
      await visibleText(page, /Oratio/i);
      const bg = await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor);
      checks.push({ scheme, bg, consoleMessages, pageErrors });
      await context.close();
    }
    return { checks };
  });

  const summary = {
    baseURL,
    ranAt: nowIso(),
    results,
    totals: {
      pass: results.filter((r) => r.status === "pass").length,
      fail: results.filter((r) => r.status === "fail").length,
    },
  };
  const outPath = path.join(outDir, `preqa-${Date.now()}.json`);
  await fs.writeFile(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ outPath, totals: summary.totals, results }, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
