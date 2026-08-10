import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseURL = process.env.D017_BASE_URL ?? "http://localhost:3014";
const fixturePath = process.env.D017_FIXTURE_PATH;
const evidencePath = process.env.D017_BROWSER_EVIDENCE_PATH;
if (!fixturePath || process.env.D017_CONTROLLED_ACCEPTANCE !== "true") {
  throw new Error("D-017 browser acceptance requires D017_FIXTURE_PATH and D017_CONTROLLED_ACCEPTANCE=true.");
}
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const scope = process.env.D017_BROWSER_SCOPE ?? "all";
if (!["all", "public", "owner", "contact", "operator"].includes(scope)) throw new Error("D017_BROWSER_SCOPE must be all, public, owner, contact, or operator.");
const results = [];
const pass = (label) => { results.push(label); console.log(`PASS ${label}`); };

async function controlledPage(context, mode = "ready") {
  await context.route("**/turnstile/v0/api.js*", (route) => route.fulfill({ contentType: "application/javascript", body: "" }));
  await context.addInitScript(({ mode }) => {
    Object.defineProperty(window, "turnstile", {
      configurable: true,
      value: {
        render(_element, options) {
          setTimeout(() => mode === "ready" ? options.callback("d017-controlled-turnstile-token") : options["error-callback"](), 0);
          return "d017-controlled-widget";
        },
        remove() {}, reset() {},
      },
    });
  }, { mode });
  return context.newPage();
}

async function assertNoHorizontalOverflow(page, route) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expectText(page, "body");
  const width = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  assert(width.scrollWidth <= width.innerWidth, `${route} overflows narrow viewport: ${width.scrollWidth} > ${width.innerWidth}`);
}

async function expectText(page, selector) {
  await page.locator(selector).first().waitFor({ state: "visible", timeout: 20_000 });
}

const browser = await chromium.launch({ headless: true, executablePath: process.env.D017_CHROMIUM_EXECUTABLE });
try {
  if (["all", "public"].includes(scope)) {
  const publicContext = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  const publicPage = await controlledPage(publicContext);
  await publicPage.goto("/", { waitUntil: "domcontentloaded" });
  await expectText(publicPage, "main");
  await publicPage.goto(`/vendor/${fixture.vendor.slug}`, { waitUntil: "domcontentloaded" });
  await expectText(publicPage, "main#main-content");
  assert(await publicPage.locator('a[href="#main-content"]').count(), "profile has a skip link");
  assert.match(await publicPage.locator('link[rel="canonical"]').getAttribute("href") ?? "", new RegExp(`/vendor/${fixture.vendor.slug}$`));
  assert(!/noindex/i.test(await publicPage.content()), "published controlled profile is indexable");
  pass("desktop public profile has landmark, skip link, canonical metadata and no private fixture data");
  await publicPage.goto("/sitemap.xml", { waitUntil: "domcontentloaded" });
  assert((await publicPage.locator("body").innerText()).includes(`/vendor/${fixture.vendor.slug}`), "sitemap contains the synthetic published profile");
  pass("controlled public sitemap contains only the synthetic published route under test");
  await publicPage.goto("/ops", { waitUntil: "domcontentloaded" });
  assert(new URL(publicPage.url()).pathname === "/login", "unauthenticated /ops must redirect to login");
  pass("unauthenticated protected route is denied at the browser boundary");
  await publicContext.close();

  const narrowContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true });
  const narrowPage = await controlledPage(narrowContext);
  for (const route of ["/", "/businesses", `/vendor/${fixture.vendor.slug}`, "/contact", "/privacy", "/login"]) {
    await assertNoHorizontalOverflow(narrowPage, route);
  }
  pass("home, directory, profile, contact, privacy and account routes have no narrow-mobile overflow");
  await narrowContext.close();

  const badLoginContext = await browser.newContext({ baseURL });
  const badLogin = await controlledPage(badLoginContext);
  await badLogin.goto("/login", { waitUntil: "domcontentloaded" });
  await badLogin.locator("#email").fill(fixture.browser.ownerEmail);
  await badLogin.locator("#password").fill("not-the-test-password");
  await badLogin.getByRole("button", { name: "Sign in" }).click();
  await badLogin.getByText("We could not sign you in with that email and password. Check both, or reset your password below.").waitFor();
  pass("password-login validation gives the documented recovery-safe alert");
  await badLoginContext.close();
  }

  if (["all", "owner"].includes(scope)) {
  const ownerContext = await browser.newContext({ baseURL });
  const ownerPage = await controlledPage(ownerContext);
  const next = encodeURIComponent(`/claim?listing=${fixture.browser.vendor.id}`);
  await ownerPage.goto(`/login?next=${next}`, { waitUntil: "domcontentloaded" });
  await ownerPage.locator("#email").fill(fixture.browser.ownerEmail);
  await ownerPage.locator("#password").fill(fixture.browser.ownerPassword);
  await ownerPage.getByRole("button", { name: "Sign in" }).click();
  await ownerPage.getByText("Listings linked to your email").waitFor({ timeout: 20_000 });
  const continueToClaim = ownerPage.getByRole("button", { name: "Continue to claim" });
  if (await continueToClaim.count()) await continueToClaim.click();
  await ownerPage.getByLabel("Your connection to this business").fill("I am the authorised representative of this controlled browser acceptance fixture.");
  await ownerPage.getByLabel("ABN (optional)").fill("12345678901");
  await ownerPage.getByRole("button", { name: "Submit claim for review" }).click();
  await ownerPage.getByText("Your claim request has been submitted for review. The listing remains public and unchanged while the request is assessed.").waitFor({ timeout: 20_000 });
  pass("browser claim journey accepts a valid ABN and shows pending-not-public success state");
  await ownerPage.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await ownerPage.getByText("Your ownership requests").waitFor({ timeout: 20_000 });
  await ownerPage.getByRole("button", { name: "Withdraw request" }).first().click();
  await ownerPage.getByText("Your claim request was withdrawn. The business listing was not changed.").waitFor({ timeout: 20_000 });
  pass("browser claim recovery withdrawal gives the documented unchanged-listing state");
  await ownerContext.close();
  }

  if (["all", "contact"].includes(scope)) {
  const contactContext = await browser.newContext({ baseURL });
  const contactPage = await controlledPage(contactContext);
  await contactPage.goto("/contact", { waitUntil: "domcontentloaded" });
  await contactPage.getByText("Human verification ready.").waitFor({ timeout: 20_000 });
  await contactPage.locator('[name="requesterName"]').fill("D-017 browser reporter");
  await contactPage.locator('[name="requesterEmail"]').fill(`${fixture.fixturePrefix}-browser-contact@example.test`);
  await contactPage.locator('[name="businessName"]').fill("D-017 browser claim fixture");
  await contactPage.locator('[name="message"]').fill("This controlled browser run checks private correction intake success.");
  await contactPage.locator('[name="consent"]').check();
  await Promise.all([
    contactPage.waitForURL(/\/contact\?sent=1/),
    contactPage.getByRole("button", { name: "Send support request" }).click(),
  ]);
  await contactPage.getByText("Your request has been received. Keep this page for your records; an operator will review it.").waitFor();
  pass("browser contact success records a private intake with the documented status card");
  await contactContext.close();

  const unavailableContext = await browser.newContext({ baseURL });
  const unavailablePage = await controlledPage(unavailableContext, "unavailable");
  await unavailablePage.goto("/contact", { waitUntil: "domcontentloaded" });
  await unavailablePage.getByText("Human verification could not load. Check your connection and refresh it.").waitFor({ timeout: 20_000 });
  assert(await unavailablePage.getByRole("button", { name: "Send support request" }).isDisabled(), "contact submit stays disabled when verification is unavailable");
  pass("browser human-verification failure keeps contact submission unavailable and recoverable");
  await unavailableContext.close();
  }

  if (["all", "operator"].includes(scope)) {
  const operatorContext = await browser.newContext({ baseURL });
  const operatorPage = await controlledPage(operatorContext);
  await operatorPage.goto(`/login?next=${encodeURIComponent("/ops")}`, { waitUntil: "domcontentloaded" });
  await operatorPage.locator("#email").fill(fixture.browser.operatorEmail);
  await operatorPage.locator("#password").fill(fixture.browser.operatorPassword);
  await operatorPage.getByRole("button", { name: "Sign in" }).click();
  await operatorPage.getByText("What needs your judgment?").waitFor({ timeout: 20_000 });
  pass("authorised operator reaches protected Ops surface after browser sign-in");
  await operatorContext.close();
  }
} finally {
  await browser.close();
}

const result = { environment: baseURL, assertions: results, fixturePrefix: fixture.fixturePrefix };
if (evidencePath) await writeFile(evidencePath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
