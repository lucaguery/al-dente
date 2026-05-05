import { test, type BrowserContext } from "@playwright/test";

// Diagnostic-only — surfaces every WS open + frame for one onboarding
// session. Used to debug the W1 gate failure where pageB never receives
// the ping.created broadcast.

const BACKEND_URL =
  process.env.E2E_BACKEND_URL ?? "https://al-dente-production.up.railway.app";

function attachListeners(context: BrowserContext, label: string) {
  context.on("page", (p) => {
    p.on("console", (m) => {
      console.log(`[${label}][console.${m.type()}]`, m.text());
    });
    p.on("pageerror", (e) => console.log(`[${label}][pageerror]`, e.message));
    p.on("requestfailed", (r) =>
      console.log(`[${label}][requestfailed]`, r.url(), r.failure()?.errorText),
    );
    p.on("websocket", (ws) => {
      console.log(`[${label}][ws.open]`, ws.url());
      ws.on("framereceived", (f) => {
        const s = typeof f.payload === "string" ? f.payload : "[binary]";
        console.log(`[${label}][ws.recv]`, s.slice(0, 200));
      });
      ws.on("framesent", (f) => {
        const s = typeof f.payload === "string" ? f.payload : "[binary]";
        console.log(`[${label}][ws.send]`, s.slice(0, 200));
      });
      ws.on("close", () => console.log(`[${label}][ws.close]`));
      ws.on("socketerror", (err) => console.log(`[${label}][ws.error]`, err));
    });
  });
}

test("DIAG: one user onboards, dump WS + console for 8s on home page", async ({
  browser,
}) => {
  const ctx = await browser.newContext();
  attachListeners(ctx, "A");

  const page = await ctx.newPage();
  await page.goto("/onboarding/welcome");
  await page.getByRole("button", { name: "Créer un foyer" }).click();
  await page
    .locator("#create-household-name")
    .fill(`Diag-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
  await page.locator("#create-member-name").fill("Diag");
  await page.locator('[role="radio"]').nth(0).click();
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForURL(/\/onboarding\/share-code/);
  await page.getByRole("button", { name: "J'ai prévenu ma partenaire" }).click();
  await page.waitForURL(/\/$/);

  // Read what's actually in localStorage.
  const ls = await page.evaluate(() => ({
    auth_token: localStorage.getItem("auth_token"),
    household_id: localStorage.getItem("household_id"),
    member_id: localStorage.getItem("member_id"),
  }));
  console.log("[A][localStorage]", ls);

  // Sit on the home page for 8s — long enough for partysocket to handshake.
  await page.waitForTimeout(8000);

  // Now POST a ping ourselves (so we can confirm broadcast reaches our own
  // page even though sender adds locally too).
  await page.getByRole("button", { name: "Envoyer un ping" }).click();
  await page.waitForTimeout(3000);

  console.log(`[A][backend]`, BACKEND_URL);
  await ctx.close();
});
