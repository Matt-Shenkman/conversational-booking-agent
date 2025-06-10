// src/assistant.js
require('dotenv').config();
const readline = require('readline-sync');
const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getSlotsForMonths  = require('./functions/getSlotsForMonths');
const tryBookSlot = require('./functions/tryBookSlot');
const dayjs = require('dayjs');
const todayStr = dayjs().format('MMMM D, YYYY'); // e.g., "June 9, 2025" 

const functionSchemas = [
    {
      type: "function",
      function: {
          name: "getSlotsForMonths",
          description: "Fetch a list of available Calendly time slots. Optionally filter by one or more ISO months (YYYY-MM).",
          parameters: {
            type: "object",
            properties: {
              months: {
                type: "array",
                items: {
                  type: "string",
                  pattern: "^\\d{4}-\\d{2}$"  // Matches 'YYYY-MM'
                },
                description: "Optional array of ISO 8601 month strings like ['2025-06', '2025-07']"
              }
            }
        }
      }
    },
    {
        type: "function",
        function: {
          name: "tryBookSlot",
          description: "Try to book a Calendly appointment with user details",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Full name of the user. Example: John Doe"
              },
              email: {
                type: "string",
                format: "email",
                description: "User's email. Example: john@example.com"
              },
              datetime: {
                type: "string",
                format: "date-time",
                description: "Desired appointment time in ISO format. Example: 2025-06-15T14:00"
              }
            },
            required: ["name", "email", "datetime"]
          }
        }
      }
  ];
  
  const systemPrompt = `
  You are Chrono, a helpful AI assistant that schedules meetings for users.
  
  📅 Today is ${todayStr}.
  
  Your goal is to help the user schedule an appointment by collecting:
  - Full name
  - Email
  - Desired appointment date and time
  
  🔁 **Function Calls**
  - Only call \`tryBookSlot\` once all three values are collected **and** the user confirms they are ready to book.
  - If the user requests to view available times, call \`getSlotsForMonths\`.
  
  🗓 **Availability Rules**
  - When calling \`getSlotsForMonths\`, you may pass an optional array of specific months (formatted as 'YYYY-MM').
  - If no months are specified, default to the current month through two months from now.
  - ❗️Do NOT allow users to query or book any date beyond two months from the current date.
  - You must validate that the requested date is within the current month or the next two months. 
  - If it is not, **do not throw an error** — instead, gently inform them that bookings are only available for the current and next two months and ask them to choose a closer date.
  
  ⚠️ **Date Validity Constraint**
  - If available slots have already been fetched using \`getSlotsForMonths\`, you must only allow booking on a date that was part of that availability.
  - Do not accept a booking for a date that has not been confirmed as available unless \`getSlotsForMonths\` has not been used yet or is re-requested with an updated month.
  
  🧠 **Behavior**
  - Be conversational, clarify any vague or missing inputs, and confirm all details before scheduling.
  - Do not call \`getSlotsForMonths\` more than once per conversation, unless:
    - \`tryBookSlot\` fails with \`invalid_date\` or \`invalid_time\`, or
    - The user specifically asks for different months.
  `;
  
  
  async function runAssistant(userInput, conversationHistory = []) {
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userInput }
    ];
  
    const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages,
        tools: functionSchemas,
        tool_choice: "auto"
      });
      
      const message = response.choices[0].message;
      
      // Only proceed if assistant asked for a tool
      if (message.tool_calls?.length) {
        const toolCall = message.tool_calls[0];
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        let toolResult;
      
        console.log(`🛠️ Tool call: ${toolCall.function.name}`, toolArgs);
      
        if (toolCall.function.name === "getSlotsForMonths") {
          toolResult = await getSlotsForMonths(toolArgs.months);
        } else if (toolCall.function.name === "tryBookSlot") {
          toolResult = await tryBookSlot(toolArgs.name, toolArgs.email, toolArgs.datetime);
      
          if (!toolResult.success) {
            console.log("❌ Booking failed:", toolResult.error, toolResult.detail || "");
          } else {
            return { end: true, message: "Thanks for booking with Chrono" };
          }
        }
      
        messages.push(message);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      
        const followUp = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages
        });
      
        return followUp.choices[0].message.content;
      }
      
      return message.content;
  }
  
  module.exports = { runAssistant };