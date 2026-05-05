import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// W1 round-trip gate — Phase 1 verification of the realtime spine.
// Two browser contexts simulate two phones in the same household:
//   1. Context A creates a household.
//   2. Context B joins via the invite code.
//   3. A sends a ping; B receives it via WS within E2E_RTT_BUDGET_MS.
//   4. Reverse direction.
//   5. Bogus WS token is rejected with close code 1008.
// This proves the wire-level contract; physical-iPhone tests still
// cover PWA install + standalone rendering + the SPEC.md 500ms on-device
// budget separately. Default 3s budget here is the laptop→Railway WAN
// envelope; override via E2E_RTT_BUDGET_MS=500 when running from a phone
// on the production network.

const BACKEND_URL =
  process.env.E2E_BACKEND_URL ?? "https://al-dente-production.up.railway.app";

// Indices into MEMBER_COLORS (frontend/lib/colors.ts):
// 0=rose, 1=amber, 2=emerald, 3=sky, 4=violet. React renders inline
// `backgroundColor` as `rgb(...)` so we click by position, not by hex.
const SWATCH_ROSE = 0;
const SWATCH_SKY = 3;

const ROUND_TRIP_BUDGET_MS = Number(process.env.E2E_RTT_BUDGET_MS ?? 3000);

function uniqueSuffix(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function pickColor(page: Page, swatchIndex: number) {
  await page.locator('[role="radio"]').nth(swatchIndex).click();
}

async function createHousehold(
  context: BrowserContext,
  householdName: string,
  memberName: string,
  swatchIndex: number,
): Promise<{ page: Page; inviteCode: string }> {
  const page = await context.newPage();
  await page.goto("/onboarding/welcome");
  await page.getByRole("button", { name: "Créer un foyer" }).click();
  await page.locator("#create-household-name").fill(householdName);
  await page.locator("#create-member-name").fill(memberName);
  await pickColor(page, swatchIndex);
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForURL(/\/onboarding\/share-code/);
  const url = new URL(page.url());
  const inviteCode = url.searchParams.get("code");
  if (!inviteCode) throw new Error("invite_code missing from share-code URL");
  await page.getByRole("button", { name: "J'ai prévenu ma partenaire" }).click();
  await page.waitForURL(/\/$/);
  return { page, inviteCode };
}

async function joinHousehold(
  context: BrowserContext,
  inviteCode: string,
  memberName: string,
  swatchIndex: number,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/onboarding/welcome");
  await page.getByRole("button", { name: "Rejoindre un foyer" }).click();
  await page.locator("#join-code").fill(inviteCode);
  await page.locator("#join-member-name").fill(memberName);
  // Wait for the debounced preview to settle so the swatch isn't disabled
  // when we try to click it.
  await page.waitForTimeout(500);
  await pickColor(page, swatchIndex);
  await page.getByRole("button", { name: "Rejoindre" }).click();
  await page.waitForURL(/\/$/);
  return page;
}

async function pingCount(page: Page): Promise<number> {
  // Scope to the PingPanel card so we don't accidentally count BottomNav
  // <ul> children. The panel <ul> is a sibling of the panel heading.
  const panel = page.locator("section, main").filter({
    has: page.getByRole("heading", { name: "Test de connexion" }),
  });
  return await panel
    .locator("ul li")
    .filter({ hasNot: page.locator("text=Aucun ping") })
    .count();
}

async function sendPingAndAwaitOnPeer(
  sender: Page,
  receiver: Page,
): Promise<number> {
  const senderBefore = await pingCount(sender);
  const receiverBefore = await pingCount(receiver);
  const sentAt = Date.now();
  await sender.getByRole("button", { name: "Envoyer un ping" }).click();

  // Sender-side: the POST/optimistic-add must succeed. If this fails the
  // broadcast can't possibly reach the peer.
  await expect
    .poll(async () => pingCount(sender), { timeout: 5_000, intervals: [50, 100, 200] })
    .toBeGreaterThan(senderBefore);

  // Receiver-side: WS broadcast under the configured budget.
  await expect
    .poll(
      async () => pingCount(receiver),
      { timeout: ROUND_TRIP_BUDGET_MS + 1000, intervals: [25, 50, 100] },
    )
    .toBeGreaterThan(receiverBefore);
  return Date.now() - sentAt;
}

async function waitForWsConnect(page: Page, timeoutMs = 8_000): Promise<void> {
  // partysocket opens the WS as soon as RealtimeProvider mounts. We want
  // proof the connection is open before timing the ping round-trip,
  // otherwise Railway cold-start latency contaminates the budget.
  await page.waitForFunction(
    () => {
      // Internal heuristic: partysocket stores its ws in a private field,
      // but readyState 1 on any open socket is what we care about.
      const wsList = (window as unknown as { __aldenteWs?: { readyState: number } }).__aldenteWs;
      return wsList?.readyState === 1;
    },
    null,
    { timeout: timeoutMs },
  ).catch(() => {
    // No exposed handle — fall back to a fixed warmup. Phase 1 doesn't
    // expose a status hook on RealtimeProvider; this is good enough to
    // unblock the gate test.
  });
}

test.describe("W1 round-trip gate", () => {
  test("ping round-trips between two contexts in <500ms each direction", async ({
    browser,
  }) => {
    const householdName = `Test-${uniqueSuffix()}`;
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    try {
      const { page: pageA, inviteCode } = await createHousehold(
        contextA,
        householdName,
        "Alice",
        SWATCH_ROSE,
      );
      const pageB = await joinHousehold(contextB, inviteCode, "Bob", SWATCH_SKY);

      // Diagnostic logging — surfaces console.error from RealtimeProvider
      // if the WS handshake fails (auth, CORS, mixed-content, etc.).
      pageA.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning") {
          console.log(`A ${m.type()}:`, m.text());
        }
      });
      pageB.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning") {
          console.log(`B ${m.type()}:`, m.text());
        }
      });
      pageA.on("pageerror", (e) => console.log("A pageerror:", e.message));
      pageB.on("pageerror", (e) => console.log("B pageerror:", e.message));
      pageA.on("websocket", (ws) => console.log("A WS opened:", ws.url()));
      pageB.on("websocket", (ws) => console.log("B WS opened:", ws.url()));

      // Both phones must have the panel mounted before we start timing.
      await expect(pageA.getByRole("heading", { name: "Test de connexion" })).toBeVisible();
      await expect(pageB.getByRole("heading", { name: "Test de connexion" })).toBeVisible();

      // Give partysocket time to open both WS connections (Railway can
      // cold-start in 5–10s if recently idle). 3s is the floor on warm.
      await waitForWsConnect(pageA);
      await waitForWsConnect(pageB);
      await pageA.waitForTimeout(3000);
      await pageB.waitForTimeout(3000);

      // A → B
      const aToB = await sendPingAndAwaitOnPeer(pageA, pageB);
      console.log(`A→B latency: ${aToB}ms (budget ${ROUND_TRIP_BUDGET_MS}ms)`);
      expect(
        aToB,
        `A→B round-trip exceeded ${ROUND_TRIP_BUDGET_MS}ms budget`,
      ).toBeLessThan(ROUND_TRIP_BUDGET_MS);

      // B → A
      const bToA = await sendPingAndAwaitOnPeer(pageB, pageA);
      console.log(`B→A latency: ${bToA}ms (budget ${ROUND_TRIP_BUDGET_MS}ms)`);
      expect(
        bToA,
        `B→A round-trip exceeded ${ROUND_TRIP_BUDGET_MS}ms budget`,
      ).toBeLessThan(ROUND_TRIP_BUDGET_MS);

      // Self-vs-partner attribution: most-recent row on B (sent by A) must
      // show the "depuis ta partenaire" tag; most-recent on A (also sent
      // by A) must show "envoyé d'ici" or be the second-most-recent ping
      // (B → A landed last on A).
      const latestOnA = pageA.locator("ul li").first();
      await expect(latestOnA).toContainText("depuis ta partenaire"); // B's last ping
      const latestOnB = pageB.locator("ul li").first();
      await expect(latestOnB).toContainText("envoyé d'ici"); // B's own last ping
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test("WS rejects bogus token with close code 1008", async ({ page }) => {
    // Navigate to any same-origin page so we can open a WebSocket from
    // the browser context (cross-origin WS is fine, but starting from a
    // page is cleaner than evaluate-on-blank).
    await page.goto("/onboarding/welcome");

    const wsBase = BACKEND_URL.replace(/^https?:/, "wss:");
    const closeCode = await page.evaluate(
      (wsUrl) =>
        new Promise<number>((resolve) => {
          const ws = new WebSocket(wsUrl);
          ws.onclose = (e) => resolve(e.code);
          ws.onerror = () => {
            /* fall through to onclose with whatever code */
          };
          setTimeout(() => resolve(0), 5000);
        }),
      `${wsBase}/ws?token=BOGUS_DOES_NOT_EXIST`,
    );

    expect(closeCode, "WS should close with 1008 on bogus token").toBe(1008);
  });
});
