const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function getAvailableSlots(calendlyUrl) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(calendlyUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="calendar-table"]', { timeout: 10000 });

    const dates = await page.$$eval('button[aria-label*="Times available"]:not([disabled])', buttons =>
      buttons.map(btn => btn.getAttribute('aria-label'))
    );

    const result = {};

    for (const dateLabel of dates) {
      console.log(`📆 Fetching times for ${dateLabel}...`);

      // Click the button for that date
      const btn = await page.$(`button[aria-label="${dateLabel}"]`);
      if (!btn) continue;

      await btn.click();
      await page.waitForTimeout(1000); // small wait for times to load

      // Wait for time buttons to appear
      try {
        await page.waitForSelector('[data-container="time-button"]', { timeout: 5000 });
      } catch {
        console.log(`⚠️ No times loaded for ${dateLabel}`);
        continue;
      }

      const html = await page.content();
      const $ = cheerio.load(html);

      const times = [];
      $('[data-container="time-button"]').each((_, el) => {
        const time = $(el).text().trim();
        if (time) times.push(time);
      });

      const dateOnly = dateLabel.replace(' - Times available', '');
      result[dateOnly] = times;
    }

    return result;
  } catch (err) {
    console.error('❌ Failed to retrieve times:', err.message);
    return {};
  } finally {
    await browser.close();
  }
}

module.exports = { getAvailableSlots };
