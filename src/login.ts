import { chromium, Browser, Page } from "playwright";

async function isAuthenticatedSession(browser: Browser) {
  const ctx = await browser.newContext();
  return !!ctx.cookies("li_at");
}

async function addAuthCookie(browser: Browser) {
  const ctx = await browser.newContext();

  ctx.addCookies([
    {
      name: "li_at",
      value: "TODO",
      domain: ".linkedin.com",
    },
  ]);
}

const LI_URLS = {
  home: "https://www.linkedin.com",
  jobs: "https://www.linkedin.com/jobs",
  jobsSearch: "https://www.linkedin.com/jobs/search",
} as const;

export async function loginWithCookies() {
  const cookiesString = process.env.LI_AT_COOKIE;

  if (!cookiesString) {
    throw new Error("LinkedIn cookie are not set as an environment variable.");
  }

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(LI_URLS.home, { waitUntil: "load" });

  await addAuthCookie(browser);

  await page.reload();

  if (!(await isAuthenticatedSession(browser))) {
    return { exit: true };
  }

  return { browser, page };
}
