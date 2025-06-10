// src/assistant.js
require('dotenv').config();
const readline = require('readline-sync');
const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getSlotsForMonths  = require('./functions/getSlotsForMonths');
const tryBookSlot = require('./functions/tryBookSlot');
const systemPrompt = require('./config/systemPrompt');
const functionSchemas = require('./config/functionSchemas');

  
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
        if (message.tool_calls.length > 1) {
          console.warn("⚠️ Multiple tool calls returned — only the first will be processed.");
        }
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
            return { end: true, content: "✅ Your appointment has been booked. Thank you for using Chrono!" };
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