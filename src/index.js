// index.js
require('dotenv').config();
const readline = require('readline-sync');
const { runAssistant } = require('./assistant');

async function main() {
  console.log("🤖 Chrono, your scheduling assistant, is ready!");

  const conversationHistory = [];

  while (true) {
    const userInput = readline.question("\nYou: ");
    if (userInput.toLowerCase() === 'exit') {
      console.log("👋 Goodbye!");
      break;
    }

    try {
      const response = await runAssistant(userInput, conversationHistory);

      if (response.end) {
        console.log("Chrono: 👋 Ending session after booking.");
        break;
      }

      console.log(`Chrono: ${response}`);

      // Save this turn in the conversation history
      conversationHistory.push({ role: 'user', content: userInput });
      conversationHistory.push({ role: 'assistant', content: response });

    } catch (err) {
      console.error("❌ Error talking to Chrono:", err.message);
    }
  }
}

main();