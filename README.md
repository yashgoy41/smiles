# ChildCheck WhatsApp Screening Bot

A Twilio-powered WhatsApp bot that guides caregivers through a quick 5-question autism screen (M-CHAT–style), stores responses, and provides an admin dashboard.
![image](https://github.com/user-attachments/assets/b1d72822-eeb2-4f63-a951-4a966249efcf)

---

## Features

* **Intro & Commands**

  * `SCREEN` – Start the 5-question screening
  * `CLINIC` – List nearby referral clinics
  * `HELP` – Show the commands menu
  * `STOP` – Unsubscribe and clear session

* **Interactive Screening Flow**

  * Five yes/no questions (reply with `1` or `2`)
  * Responses recorded in `results.json`

* **Immediate Feedback**

  * If ≥ 2 “no” answers → recommends specialist
  * Otherwise → reassuring follow-up

* **Admin Dashboard**

  * HTTP GET `/admin` shows a table of all completed sessions

---

## Prerequisites

* Node.js ≥ 14
* A free Twilio account with WhatsApp Sandbox enabled
* ngrok (or similar) for local webhook tunneling

---

## Setup

1. **Clone & install**

   ```bash
   git clone <repo-url>
   cd whatsapp-bot
   npm install express body-parser twilio dotenv
   ```

2. **Configure environment**
   Create a file named `.env` in the project root with:

   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   ```

3. **Expose your local server**

   ```bash
   ngrok http 3000
   ```

   Copy the HTTPS forwarding URL (e.g. `https://abcd1234.ngrok.io`).

4. **Point Twilio Sandbox webhook**
   In Twilio Console → **Messaging** → **Try it Out** → **WhatsApp Sandbox**
   – Set **When a message comes in** to:

   ```
   https://<your-ngrok-id>.ngrok-free.app/webhook
   ```

   – Method: `POST`
   – Save.

5. **Run the bot**

   ```bash
   node index.js
   ```

   You should see:

   ```
   Bot listening on port 3000
   ```

---

## Usage

1. **Join the sandbox**
   In WhatsApp, message:

   ```
   join <sandbox-code>
   ```

   (displayed in your Twilio Sandbox settings)

2. **Start the flow**

   * Send `SCREEN` → you’ll receive Question 1/5
   * Reply `1` (Yes) or `2` (No) for each question
   * After Q5, you’ll get a summary + next steps

3. **Other commands**

   ```
   HELP    → shows menu
   CLINIC  → lists referral clinics
   STOP    → unsubscribe
   ```

4. **View results**
   Open in your browser:

   ```
   http://localhost:3000/admin
   ```

   Shows a table of `{ phone, timestamp, answers[Q1–Q5] }`.

   ![image](https://github.com/user-attachments/assets/9db1651c-57d2-45b5-a3d6-cd5211512204)

---

## Project Structure

```
.
├── index.js         # Main Express + Twilio webhook logic
├── results.json     # Stored screening results (JSON array)
├── package.json
└── .env             # Twilio credentials (not checked in)
```

---

## Extensibility Ideas

* Replace hard-coded clinics with `clinics.json`
* Load full M-CHAT questions from a JSON file
* Add multi-child profiles per phone number
* Integrate parent-education resources via `RESOURCES` command
* Implement consent notice & data deletion

---

## License

MIT License — feel free to use and adapt!
