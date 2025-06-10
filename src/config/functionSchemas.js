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

  module.exports = functionSchemas;