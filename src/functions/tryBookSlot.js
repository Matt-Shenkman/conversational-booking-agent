const { chromium } = require("playwright");
const dayjs = require("dayjs");
require("dotenv").config();

module.exports = async function tryBookSlot(
  name,
  email,
  datetime,
  additionalQuestions = {}
) {
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

  const browser = await chromium.launch({ headless: false });
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

      // Check for additional question fields
      console.log(`🔍 Scanning form for additional question fields...`);

      // Wait a moment for any dynamic content to load
      await page.waitForTimeout(1000);

      // First, let's see ALL form fields to debug
      const allFormFields = await page.$$("input, select, textarea");
      console.log(`📋 Total form fields found: ${allFormFields.length}`);

      for (let i = 0; i < allFormFields.length; i++) {
        const field = allFormFields[i];
        const name = await field.getAttribute("name");
        if (name && name.includes("question")) {
          const type =
            (await field.getAttribute("type")) ||
            (await field.evaluate((el) => el.tagName.toLowerCase()));
          const id = await field.getAttribute("id");
          console.log(
            `   🔎 Field with 'question' in name: name="${name}", type="${type}", id="${id}"`
          );
        }
      }

      // Try multiple selectors to catch different question field patterns
      const questionFields = await page.$$(
        'input[name^="question_"], select[name^="question_"], textarea[name^="question_"], input[name*="question"], select[name*="question"], textarea[name*="question"]'
      );

      // Also try a broader approach - any field that's not name/email
      const additionalFields = await page.$$(
        'input:not([name="full_name"]):not([name="email"]), select:not([name="full_name"]):not([name="email"]), textarea:not([name="full_name"]):not([name="email"])'
      );
      console.log(`📝 Non-name/email fields found: ${additionalFields.length}`);

      if (questionFields.length > 0) {
        console.log(
          `🔍 Found ${questionFields.length} additional question field(s) matching our selector`
        );
        const missingQuestions = [];

        for (const field of questionFields) {
          const fieldName = await field.getAttribute("name");
          const fieldType =
            (await field.getAttribute("type")) ||
            (await field.evaluate((el) => el.tagName.toLowerCase()));
          const isRequired = (await field.getAttribute("required")) !== null;
          const placeholder = (await field.getAttribute("placeholder")) || "";

          // Get the label text if available
          let label = "";
          try {
            const labelElement = await page.$(
              `label[for="${await field.getAttribute("id")}"]`
            );
            if (labelElement) {
              label = await labelElement.textContent();
            }
          } catch (e) {
            // If no label found, try to find nearby text
            try {
              const parentDiv = await field.$(
                'xpath=ancestor::div[contains(@class, "form") or contains(@class, "field")][1]'
              );
              if (parentDiv) {
                const labelText = await parentDiv.$eval("*", (el) => {
                  const text = el.textContent || "";
                  return text.trim().split("\n")[0];
                });
                label = labelText;
              }
            } catch (e2) {
              // Fall back to field name
              label = fieldName.replace("question_", "Question ");
            }
          }

          const questionKey = fieldName;

          console.log(`📝 Question field detected:`, {
            name: fieldName,
            type: fieldType,
            label: label.trim(),
            placeholder: placeholder,
            required: isRequired,
            hasAnswer: !!additionalQuestions[questionKey],
          });

          if (!additionalQuestions[questionKey]) {
            missingQuestions.push({
              name: fieldName,
              type: fieldType,
              label: label.trim(),
              placeholder: placeholder,
              required: isRequired,
            });
          } else {
            console.log(
              `✅ Filling question "${fieldName}" with: "${additionalQuestions[questionKey]}"`
            );
            // Fill in the provided answer
            if (fieldType === "select") {
              await field.selectOption(additionalQuestions[questionKey]);
            } else {
              await field.fill(additionalQuestions[questionKey]);
            }
          }
        }

        if (missingQuestions.length > 0) {
          await browser.close();
          const questionCount = missingQuestions.length;
          const questionSummary = missingQuestions
            .map(
              (q) =>
                `${q.label || q.name}${
                  q.required ? " (required)" : " (optional)"
                }`
            )
            .join(", ");

          console.log(
            `❌ Missing ${questionCount} question(s) - returning to AI for collection:`
          );
          missingQuestions.forEach((q, index) => {
            console.log(
              `   ${index + 1}. Field: "${q.name}" | Label: "${
                q.label || q.name
              }" | Type: ${q.type}${q.required ? " [REQUIRED]" : " [OPTIONAL]"}`
            );
          });

          const fieldMapping = missingQuestions
            .map((q) => `"${q.name}": "user_answer_here"`)
            .join(", ");

          return {
            success: false,
            error: "additional_questions_required",
            message: `Found ${questionCount} additional question${
              questionCount > 1 ? "s" : ""
            } that need${
              questionCount > 1 ? "" : "s"
            } to be answered: ${questionSummary}. Please ask the user for ALL of these at once. IMPORTANT: Use these exact field names as keys in additionalQuestions: {${fieldMapping}}`,
            questions: missingQuestions,
            questionCount: questionCount,
            fieldNames: missingQuestions.map((q) => q.name),
          };
        } else {
          console.log(
            `✅ All additional questions have been answered - proceeding with booking`
          );
        }
      } else {
        console.log(`ℹ️ No additional question fields found on this form`);
      }

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
