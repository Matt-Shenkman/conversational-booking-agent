# Chrono: Conversational Scheduling Assistant

Chrono (named after greek god of time Chronos) is a conversational AI assistant that helps users find and book available Calendly time slots through natural dialogue. It uses OpenAI's GPT to understand user intent and Playwright to automate interactions with Calendly.

---

## ✨ Features

- Natural language interface for scheduling
- Real-time scraping of Calendly availability using Playwright
- Query by specific months (`YYYY-MM` format)
- Restricts bookings to the current month + next 2 months
- Verifies that requested appointment times are actually available
- Modular and extensible function-calling structure

---

## 🚀 Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/chrono-scheduler.git
cd chrono-scheduler
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env` file with the following:

```env
OPENAI_API_KEY=your-openai-api-key
CALENDLY_URL=https://calendly.com/your-calendar-link
```

### 4. Run Chrono

```bash
node index.js
```

Type messages into the console. Type `exit` to quit.

---

## 🛠 Tech Stack

- **Node.js**
- **Playwright** – for browser automation
- **OpenAI GPT-4** – for assistant logic
- **Day.js** – for date handling
- **readline-sync** – for CLI user input

---

## 📦 Project Structure

```
.
├── assistant.js             # OpenAI integration and routing logic
├── functions/
│   ├── getSlotsForMonths.js # Handles multi-month slot retrieval in parrallel
│   └── tryBookSlot.js       # Automates Calendly booking
│   └── getSuggestedSlots.js # Scrapes time slots for a given month
├── index.js                 # Main CLI interface
├── .env                     # Environment configuration
└── README.md
```

---

## 🧠 Assistant Logic

- Defaults to querying the **current month plus two** if no months are specified.
- Assistant only allows booking of times that were confirmed as available.
- Assistant will **only call `getSlotsForMonths` once per session if specified**, unless:
  - A booking fails due to an invalid date/time
  - The user explicitly requests availability for another month that wasn't previously queried.
- User must **confirm name, email, and time** before a booking is attempted.

---

## 💬 Sample Conversation

```
You: Show me slots for July.
Chrono: 🗓 Available slots for July...
You: I’d like to book Wednesday at 10:30am.
Chrono: Just to confirm — Name: Matt Shenkman, Email: mattshenkman@gmail.com, Time: Wednesday at 10:30am. Confirm?
You: Confirm
Chrono: ✅ Booking confirmed!
```

---

## 🧪 Debug Tips

- If scraping fails, inspect or update selectors in `getSuggestedSlots.js` and `tryBookSlot.js`.
- Use `console.log` in each function to trace behavior.
- Use `DEBUG=1 node index.js` to add your own conditional logs.
- I left debug statements on for now as they provide additional context on to requests. Would turn them off in prod.

---

## 📋 Future Improvements

- [ ] Add web UI or chatbot interface
- [ ] Add rescheduling/cancellation support
- [ ] Improve test coverage and add CI/CD

---

## 📄 License

MIT License (or your preferred license)

---

**Chrono** — Bringing intelligent time management to your fingertips.



