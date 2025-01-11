import { loginWithCookies } from "./login";

async function main() {
  console.log("🟡 Connecting to a scraping browser");
  try {
    const { exit, browser } = await loginWithCookies();

    if (exit) {
      console.error(
        "Authentication failed. Please check your LinkedIn cookie.",
      );
      return;
    }

    console.log("Successfully authenticated!");

    await browser.close();
  } catch (e) {
    console.error("Error occurred:", e);
  }
}

main();
