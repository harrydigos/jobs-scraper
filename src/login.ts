import { chromium, BrowserContext } from "playwright";

const SESSION_COOKIE = process.env.LI_AT_COOKIE;

const LI_URLS = {
  home: "https://www.linkedin.com",
  jobs: "https://www.linkedin.com/jobs",
  jobsSearch: "https://www.linkedin.com/jobs/search",
} as const;

async function isAuthenticatedSession(ctx: BrowserContext) {
  const cookies = await ctx.cookies();
  return !!cookies.find((c) => c.value === SESSION_COOKIE);
}

export async function loginWithCookies() {
  if (!SESSION_COOKIE) {
    throw new Error("LinkedIn cookie is missing");
  }

  const browser = await chromium.launch({ headless: false });

  console.log("🟢 Connected, navigating...");

  const page = await browser.newPage();

  await page.goto(LI_URLS.home, { waitUntil: "load" });

  console.log("🟢 Navigated to LinkedIn");

  await page.screenshot({ path: "media/debug.png", fullPage: true });

  const ctx = await browser.newContext();

  await ctx.addCookies([
    {
      name: "li_at",
      value: SESSION_COOKIE,
      domain: ".www.linkedin.com",
      path: "/",
    },
  ]);

  await page.reload();
  console.log(await ctx.cookies());

  const isAuthed = await isAuthenticatedSession(ctx);
  if (!isAuthed) {
    return { exit: true, browser, page };
  }

  return { browser, page, exit: false };
}
