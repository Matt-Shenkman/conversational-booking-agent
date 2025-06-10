// src/booking.js
const { chromium } = require('playwright');
const dayjs = require('dayjs');
const CALENDLY_URL = process.env.CALENDLY_URL;


async function bookCalendly({ name, email, datetime }) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log("🌐 Navigating to Calendly...");
    await page.goto(CALENDLY_URL, { waitUntil: 'networkidle' });

    const dateObj = dayjs(datetime);
    const spokenDate = dateObj.format("dddd, MMMM D"); // "Monday, June 10"
    const timeStr = dateObj.format("h:mma").toLowerCase(); // e.g. "11:00am"
    const timeButtonSelector = `button[data-container="time-button"][data-start-time="${timeStr}"]`;
    const dateSelector = `button[aria-label*="${spokenDate}"]`;

    // 📅 Click the correct day
    
    await page.waitForSelector(dateSelector, { timeout: 10000 });
    await page.click(dateSelector);

    // ⏰ Click the correct time slot
    
    await page.waitForSelector(timeButtonSelector, { timeout: 10000 });
    await page.click(timeButtonSelector);

    // ▶️ Click "Next"
    await page.waitForSelector('button[aria-label^="Next"]', { timeout: 10000 });
    await page.click('button[aria-label^="Next"]');

    // 📝 Fill in name and email
    await page.waitForSelector('input[name="full_name"]', { timeout: 10000 });
    await page.fill('input[name="full_name"]', name);
    await page.fill('input[name="email"]', email);

    // ✅ Click "Schedule Event"
    await page.click('button:has-text("Schedule Event")');

    // 🎉 Wait for confirmation
    await page.waitForSelector('h1:has-text("You are scheduled")', { timeout: 10000 });

    await page.waitForSelector('[data-container="details"]', { timeout: 10000 });
    const details = await page.locator('[data-container="details"]');

    // Get title
    const title = await details.locator('h2').textContent();

    // Get host name
    const host = await details.locator('span[class*="_t4Cl8Q2S5qLJhygL_f0"]').textContent();

    // Get time slot
    const timeRange = await details.locator('div').filter({ hasText: 'am' }).nth(0).textContent();

    // Get time zone
    const timeZone = await details.locator('span[class*="q_L_u3RPhr9wdVLh3MdY"]').textContent();

    const linkHandle = await page.locator('span:has-text("Open Invitation")').locator('xpath=..'); // go up to likely <a>
    const invitationLink = await linkHandle.getAttribute('href');

    console.log("\n✅ Booking Confirmation Details:");
    console.log(`📌 Title: ${title.trim()}`);
    console.log(`👤 Host: ${host.trim()}`);
    console.log(`🕒 Time: ${timeRange.trim()}`);
    console.log(`🌍 Time Zone: ${timeZone.trim()}`);
    console.log(`🔗 Invitation Link: ${invitationLink}`);

    await browser.close();
    return { success: true };

  } catch (err) {
    console.error("❌ Booking failed:", err.message);
    await browser.close();
    return { success: false, error: err.message };
  }
}

module.exports = { bookCalendly };
