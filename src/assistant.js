// src/assistant.js
require('dotenv').config();
const readline = require('readline-sync');
const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// This tells GPT how to behave
const systemPrompt = `
You are a helpful AI assistant named Chrono who books meetings for users.
Ask for name, email, date (YYYY-MM-DD), and time (HH:MM, 24-hour).
Ask one question at a time and wait for answers.
Once you have all four fields, confirm the info and return it in this format:

{
  "name": "John Doe",
  "email": "john@example.com",
  "datetime": "2025-06-15T14:00"
}

Only return the JSON after all values are collected and confirmed.
Don’t guess — ask the user directly.
`;

const assistantInitialPrompt = `Hi there! I’m Chrono your scheduling assistant. I can help you book a meeting.`
const assistantInitialPrompt2 = 'Let’s get started — I’ll just need a few quick details from you. What is your first and last name?'


async function collectBookingDetails() {
  const messages = [{ role: "system", content: systemPrompt }, { role: "assistant", content: assistantInitialPrompt},  { role: "assistant", content: assistantInitialPrompt2}];
  console.log(`Chrono 🤖: ${messages[messages.length - 2].content}`); //show initial prompt
  while (true) {
    // Show last assistant message
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") {
      console.log(`Chrono 🤖: ${last.content}`);
    }

    // Prompt user for input
    const input = readline.question("> ");
    messages.push({ role: "user", content: input });

    // Ask OpenAI for a reply
    const res = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages,
      temperature: 0.3,
    });

    const reply = res.choices[0].message.content;
    messages.push({ role: "assistant", content: reply });

    // Try to extract JSON if it's ready
    const maybeJson = reply.match(/\{[\s\S]*?\}/);
    if (maybeJson) {
      try {
        const parsed = JSON.parse(maybeJson[0]);
        return parsed;
      } catch (e) {
        // not valid JSON yet — keep looping
      }
    }
  }
}

module.exports = { collectBookingDetails };
