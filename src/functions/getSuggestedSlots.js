module.exports = async function getSuggestedSlots(month = null, page = null) {
  const CALENDLY_URL = process.env.CALENDLY_URL;
  if (!CALENDLY_URL) return { success: false, error: "CALENDLY_URL not set" };

  let browser = null;
  let ownedPage = false;
  const results = {};

  try {
    if (!page) {
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();
      ownedPage = true;
    }

    const targetUrl = month ? `${CALENDLY_URL}?month=${month}` : CALENDLY_URL;

    console.log(`🌐 Loading calendar: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    const dateButtons = await page.$$(
      `button[aria-label*="Times available"]:not([disabled])`
    );
    for (const button of dateButtons) {
      const ariaLabel = await button.getAttribute("aria-label");
      const dateStr = ariaLabel?.split(" - ")[0];

      await button.click();
      await page.waitForSelector('button[data-container="time-button"]', {
        timeout: 5000,
      });

      const timeButtons = await page.$$(`button[data-container="time-button"]`);
      const times = [];

      for (const timeButton of timeButtons) {
        const time = await timeButton.getAttribute("data-start-time");
        if (time) times.push(time);
      }

      results[dateStr] = times;
    }
    if (Object.keys(results).length === 0) {
      console.warn("⚠️ No available slots found.");
    }

    if (ownedPage && browser) await browser.close();
    return { success: true, slots: results };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (ownedPage && browser) {
      await browser.close();
      console.log("🚪 Browser closed (owned session).");
    }
  }
};
