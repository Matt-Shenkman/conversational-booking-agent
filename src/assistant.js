// src/assistant.js
require('dotenv').config();
const readline = require('readline-sync');
const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getSuggestedSlots  = require('./functions/getSuggestedSlots');
const tryBookSlot = require('./functions/tryBookSlot');
  
  const functionSchemas = [
    {
      type: "function",
      function: {
        name: "getSuggestedSlots",
        description: "Fetch a list of upcoming available scheduled time slots.",
        parameters: {
          type: "object",
          properties: {},
          required: []
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
  
  Your goal is to collect:
  - Full name
  - Email
  - Desired appointment date and time
  
  Only call \`tryBookSlot\` once **all three** are collected and the user confirms they are ready to book.
  
  If the user wants to see available times or the schedule, call \`getSuggestedSlots\`.
  
  Only call \`getSuggestedSlots\` once per conversation, unless \`tryBookSlot\` fails with error type \`invalid_date\` or \`invalid_time\`.
  
  Be conversational and clarify ambiguous input. Confirm before scheduling.
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
      
        if (toolCall.function.name === "getSuggestedSlots") {
          toolResult = await getSuggestedSlots();
        } else if (toolCall.function.name === "tryBookSlot") {
            toolResult = await tryBookSlot(toolArgs.name, toolArgs.email, toolArgs.datetime);

            if (!toolResult.success) {
                console.log("❌ Booking failed:", toolResult.error, toolResult.detail || "");
            } else {
                console.log("✅ Booking confirmed!");
                return "Your appointment is confirmed. Thank you!";
            }
        }
      
        // Now add the tool result to the conversation
        messages.push(message); // <-- push assistant message with tool_calls
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