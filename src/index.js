// src/index.js
const { collectBookingDetails } = require('./assistant');
const { getAvailableSlots } = require('./checkAvailability');
const { bookCalendly } = require('./booking');

(async () => {

  try {
    console.clear();
    console.log("🤖 Welcome to CalPal – your AI scheduling assistant!\n");

    // Step 1: Get available dates from Calendly
    const calendlyUrl = process.env.CALENDLY_URL;
    const availableDates = await getAvailableSlots(calendlyUrl);

  if (availableDates.length === 0) {
    console.log("⚠️ No available dates found. Please try again later.");
    process.exit(1);
  }

    // Step 2: Optionally show them to the user
    console.log("📅 The following dates have availability:\n");
    console.log("🔍 availableDates =", availableDates);
    console.log("");

    const bookingInfo = await collectBookingDetails();

    console.log("\n✅ Assistant has collected your booking details:");
    console.log(JSON.stringify(bookingInfo, null, 2));

    // Booking agent integration will go here later
    // await bookCalendly(bookingInfo);
    await bookCalendly(bookingInfo);

  } catch (err) {
    console.error("❌ Something went wrong during the conversation:", err.message);
  }
})();