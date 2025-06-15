const { chromium } = require("playwright");
const getSuggestedSlots = require("./getSuggestedSlots");
const dayjs = require("dayjs");
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");

dayjs.extend(isSameOrAfter);

module.exports = async function getSlotsForMonths(monthList = []) {
  const now = dayjs();
  const validMonths = [];

  console.log("🗓 Requested months:", monthList);

  // If no months are passed, default to current + next 2 months
  if (!Array.isArray(monthList) || monthList.length === 0) {
    console.log(
      "ℹ️ No months provided. Defaulting to current and next 2 months."
    );
    for (let i = 0; i < 3; i++) {
      const month = now.add(i, "month").format("YYYY-MM");
      console.log(`➕ Added default month: ${month}`);
      validMonths.push(month);
    }
  } else {
    console.log("🔍 Validating requested months...");
    for (const m of monthList) {
      if (!/^\d{4}-\d{2}$/.test(m)) {
        console.warn(`⚠️ Skipping invalid format: ${m}`);
        continue;
      }

      const inputMonth = dayjs(`${m}-01`);
      const diff = inputMonth.diff(now, "month");

      if (!inputMonth.isValid()) {
        console.warn(`⚠️ Invalid date object: ${m}`);
        continue;
      }

      if (diff < 0 || diff > 2) {
        console.warn(`⛔️ Rejected month out of range: ${m} (diff: ${diff})`);
        continue;
      }

      console.log(`✅ Accepted month: ${m}`);
      validMonths.push(m);
    }

    if (validMonths.length === 0) {
      console.error("❌ No valid months remain after filtering.");
      return {
        success: false,
        error:
          "All provided months are invalid. Must be in YYYY-MM format and within 3-month window from today.",
      };
    }
  }

  const browser = await chromium.launch({ headless: true });
  console.log("🌐 Browser launched. Fetching pages...");

  try {
    const pages = await Promise.all(validMonths.map(() => browser.newPage()));
    const slotPromises = validMonths.map((month, idx) =>
      getSuggestedSlots(month, pages[idx])
    );

    const results = await Promise.all(slotPromises);
    const combinedSlots = {};

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.success) {
        console.log(`✅ Success for ${validMonths[i]}`);
        Object.assign(combinedSlots, result.slots);
      } else {
        console.error(`❌ Failed for ${validMonths[i]}:`, result.error);
      }
    }

    return { success: true, slots: combinedSlots };
  } catch (err) {
    console.error("💥 Unexpected error:", err.message);
    return { success: false, error: err.message };
  } finally {
    await browser.close();
    console.log("🚪 Browser closed.");
  }
};
