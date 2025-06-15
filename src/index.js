require("dotenv").config();
const readline = require("readline-sync");
const { runAssistant } = require("./assistant");

async function main() {
  console.log("==================================");
  console.log("🤖 Chrono — Your Scheduling Assistant");
  console.log("Type your request to begin. Type 'exit' to quit.");
  console.log("==================================");

  const conversationHistory = [];

  while (true) {
    const userInput = readline.question("\nYou: ").trim();

    if (userInput.toLowerCase() === "exit") {
      console.log("👋 Goodbye! See you next time.");
      break;
    }

    if (userInput === "") {
      console.log("⚠️ Please enter a valid message.");
      continue;
    }

    try {
      const response = await runAssistant(userInput, conversationHistory);

      if (response?.end) {
        console.log(`Chrono: ${response.content}`);
        break;
      }

      console.log(`Chrono: ${response}`);

      conversationHistory.push({ role: "user", content: userInput });
      conversationHistory.push({ role: "assistant", content: response });
    } catch (err) {
      console.error("❌ Error talking to Chrono:", err.message);
    }
  }
}

main();
