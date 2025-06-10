const { chromium } = require('playwright');
require('dotenv').config();

module.exports = async function getSuggestedSlots() {
  const CALENDLY_URL = process.env.CALENDLY_URL;
  if (!CALENDLY_URL) {
    return { success: false, error: 'CALENDLY_URL is not defined in .env' };
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = {};

  console.log("🌐 trying to see schedule...");
  try {
    console.log("🌐 Navigating to Calendly...");
    await page.goto(CALENDLY_URL, { waitUntil: 'networkidle' });

    let monthCount = 0;
    const maxMonths = 3;

    while (monthCount < maxMonths) {
      const dateButtons = await page.$$(`button[aria-label*="Times available"]:not([disabled])`);

      for (const button of dateButtons) {
        const ariaLabel = await button.getAttribute('aria-label'); // e.g., "Tuesday, June 10 - Times available"
        const dateStr = ariaLabel?.split(' - ')[0];

        await button.click();
        await page.waitForSelector('button[data-container="time-button"]', { timeout: 5000 });

        const timeButtons = await page.$$(`button[data-container="time-button"]`);
        const times = [];

        for (const timeButton of timeButtons) {
          const time = await timeButton.getAttribute('data-start-time');
          if (time) times.push(time);
        }

        results[dateStr] = times;
      }

      // Try to click "Next Month"
      const nextMonthButton = await page.$('svg[role="img"] path[d*="6.51941"]');
      if (nextMonthButton) {
        await nextMonthButton.click({ force: true });
        await page.waitForTimeout(1000); // wait for calendar to refresh
        monthCount++;
      } else {
        break;
      }
    }
    
    await browser.close();
    return { success: true, slots: results };

  } catch (error) {
    await browser.close();
    return { success: false, error: error.message };
  }
};
