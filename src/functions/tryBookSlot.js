const { chromium } = require("playwright");
const dayjs = require("dayjs");
require("dotenv").config();

module.exports = async function tryBookSlot(name, email, datetime) {
  const CALENDLY_URL = process.env.CALENDLY_URL;
  if (!CALENDLY_URL) {
    return { success: false, error: "CALENDLY_URL is not defined in .env" };
  }

  const dateObj = dayjs(datetime);
  if (!dateObj.isValid()) {
    return {
      success: false,
      error: 'Invalid datetime. Use ISO format like "2025-06-12T11:00"',
    };
  }
  const spokenDate = dateObj.format("dddd, MMMM D"); // e.g. "Monday, June 10"
  const timeStr = dateObj.format("h:mma").toLowerCase(); // e.g. "11:00am"
  if (!spokenDate || !timeStr) {
    return {
      success: false,
      error: 'Invalid datetime format. Use ISO format like "2025-06-12T11:00"',
    };
  }
  const month = dateObj.format("YYYY-MM");
  const targetUrl = month ? `${CALENDLY_URL}?month=${month}` : CALENDLY_URL;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const dateSelector = `button[aria-label*="${spokenDate}"]:not([disabled])`;
  const timeButtonSelector = `button[data-container="time-button"][data-start-time="${timeStr}"]`;

  try {
    console.log(
      `📨 Booking request for: ${name}, ${email} at ${spokenDate} ${timeStr}`
    );
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    // Step 1: Select Date
    try {
      await page.waitForSelector(dateSelector, { timeout: 7000 });
      await page.click(dateSelector);
    } catch {
      await browser.close();
      return { success: false, error: "invalid_date" };
    }

    // Step 2: Select Time
    try {
      await page.waitForSelector(timeButtonSelector, { timeout: 7000 });
      await page.click(timeButtonSelector);
    } catch {
      await browser.close();
      return { success: false, error: "invalid_time" };
    }

    console.log(`Time Slot found. Attempting to Book.`);
    // Step 3: Click "Next"
    try {
      await page.waitForSelector('button[aria-label^="Next"]', {
        timeout: 5000,
      });
      await page.click('button[aria-label^="Next"]');
    } catch {
      await browser.close();
      return { success: false, error: "next_button_not_found" };
    }

    // Step 4: Fill Form
    try {
      await page.waitForSelector('input[name="full_name"]', { timeout: 5000 });
      await page.fill('input[name="full_name"]', name);
      await page.fill('input[name="email"]', email);
      await page.click('button:has-text("Schedule Event")');
    } catch {
      await browser.close();
      return { success: false, error: "form_submission_failed" };
    }

    // Step 5: Confirm Booking
    try {
      await page.waitForSelector('h1:has-text("You are scheduled")', {
        timeout: 10000,
      });
    } catch {
      await browser.close();
      return { success: false, error: "confirmation_not_found" };
    }

    await page.waitForSelector('[data-container="details"]', {
      timeout: 10000,
    });
    const details = await page.locator('[data-container="details"]');
    // Get title
    const title = await details.locator("h2").textContent();

    // Get host name
    const host = await details
      .locator('span[class*="_t4Cl8Q2S5qLJhygL_f0"]')
      .textContent();

    // Get time slot
    const timeRange = await details
      .locator("div")
      .filter({ hasText: "am" })
      .nth(0)
      .textContent();

    // Get time zone
    const timeZone = await details
      .locator('span[class*="q_L_u3RPhr9wdVLh3MdY"]')
      .textContent();

    // Click the button with text "Open Invitation"
    const [newPage] = await Promise.all([
      page.context().waitForEvent("page"),
      page.locator('button:has-text("Open Invitation")').click(),
    ]);

    await newPage.waitForLoadState("domcontentloaded");
    const invitationLink = newPage.url();

    console.log("\n✅ Booking Confirmation Details:");
    console.log(`📌 Title: ${title.trim()}`);
    console.log(`👤 Host: ${host.trim()}`);
    console.log(`🕒 Time: ${timeRange.trim()}`);
    console.log(`🌍 Time Zone: ${timeZone.trim()}`);
    console.log(`🔗 Invitation Link: ${invitationLink}`);

    await browser.close();
    return { success: true };
  } catch (error) {
    await browser.close();
    return { success: false, error: "unexpected_error", detail: error.message };
  }
};
