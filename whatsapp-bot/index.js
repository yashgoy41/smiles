require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// In-memory session store
const sessions = {};

// Path to the results file (JSON array)
const RESULTS_FILE = path.join(__dirname, 'results.json');

// Utility function to record completed screening sessions into a JSON array
function recordSession(from, answers) {
  let data = [];
  try {
    const content = fs.readFileSync(RESULTS_FILE, 'utf8').trim();
    if (content) {
      data = JSON.parse(content);
      if (!Array.isArray(data)) data = [];
    }
  } catch (err) {
    // If file doesn't exist or is invalid, start fresh
    data = [];
  }
  // Append new entry
  data.push({
    phone: from,
    timestamp: new Date().toISOString(),
    answers: answers,
  });
  // Write back as formatted JSON array
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(data, null, 2));
}

app.post('/webhook', (req, res) => {
  const from = req.body.From;      // e.g. "whatsapp:+233XXXXXXXXX"
  const msg = req.body.Body.trim().toLowerCase();

  // Screening questions workflow
  const questions = ['q1', 'q2', 'q3', 'q4', 'q5'];
  const prompts = {
    q1: 'Q1: Does your child enjoy being swung, bounced on your knee, or any playful rough-and-tumble activity? (YES/NO)',
    q2: 'Q2: Does your child take an interest in other children, for example playing or talking with them? (YES/NO)',
    q3: 'Q3: Does your child point with one finger to ask for something (like a toy or snack)? (YES/NO)',
    q4: 'Q4: Does your child point with one finger to share interest (for example, showing you a bird or car)? (YES/NO)',
    q5: 'Q5: Does your child respond when you call their name, even if they’re not looking at you? (YES/NO)',
  };


  // --- add this near the top of app.post, just after const msg = …
  const normalized = msg.trim();

  // HELP command
  if (normalized === 'help') {
    const twiml = new MessagingResponse();
    twiml.message(
      'Resources:\n' +
      '• To start screening: reply SCREEN\n' +
      '• For clinic list: reply CLINIC\n' +
      '• To stop: reply STOP'
    );
    return res.send(twiml.toString());
  }

  // CLINIC command
  if (normalized === 'clinic') {
    const twiml = new MessagingResponse();
    twiml.message(
      'Nearby Clinics:\n' +
      'Accra: Clinic X +233 20 123 4567\n' +
      'Kumasi: Clinic Y +233 50 111 2233'
    );
    return res.send(twiml.toString());
  }

  // SCREEN command
  if (normalized === 'screen') {
    // reset or start the screening flow immediately
    sessions[from] = { step: 'q1', answers: [] };
    const twiml = new MessagingResponse();
    twiml.message(prompts.q1);
    return res.send(twiml.toString());
  }



  const twiml = new MessagingResponse();

  // Initialize a new session if this is a new user
  if (!sessions[from]) {
    sessions[from] = { step: 'opt-in', answers: [] };
  }
  const session = sessions[from];

  // Opt-in logic
  if (session.step === 'opt-in') {
    if (msg === 'yes') {
      session.step = 'q1';
      twiml.message(
        'Q1: Does your child enjoy being swung, bounced on your knee, or any playful rough-and-tumble activity? (YES/NO)'
      );
    } else {
      twiml.message('Hi! Reply YES to begin the 5-question check, or STOP to cancel.');
    }
    return res.send(twiml.toString());
  }

  // Handle STOP command
  if (msg === 'stop') {
    delete sessions[from];
    twiml.message('You’ve unsubscribed. Reply YES anytime to restart.');
    return res.send(twiml.toString());
  }


  // If we're in the middle of the screening questions
  if (questions.includes(session.step)) {
    // Validate reply
    if (msg !== 'yes' && msg !== 'no') {
      twiml.message(`Please reply YES or NO.\n${prompts[session.step]}`);
      return res.send(twiml.toString());
    }

    // Record the answer (1 for NO = at-risk, 0 for YES = typical)
    session.answers.push(msg === 'no' ? 1 : 0);

    const currentIndex = questions.indexOf(session.step);
    const nextIndex = currentIndex + 1;

    if (nextIndex < questions.length) {
      // Move to the next question
      session.step = questions[nextIndex];
      twiml.message(prompts[session.step]);
    } else {
      // All questions answered; compute risk score
      const riskCount = session.answers.reduce((sum, val) => sum + val, 0);

      // Persist the completed session
      recordSession(from, session.answers);

      // Send feedback
      if (riskCount >= 2) {
        twiml.message(
          `Thank you. Some responses suggest developmental concerns.\n` +
          `Please call Clinic X in Accra: +233 XXX XXX XXX`
        );
      } else {
        twiml.message(
          `Thanks! Your child’s responses don’t indicate immediate concerns.\n` +
          `Feel free to re-check anytime or reply HELP for resources.`
        );
      }

      // Reset the user session
      delete sessions[from];
    }

    return res.send(twiml.toString());
  }

  // Fallback for unrecognized commands or text
  twiml.message('Sorry, I didn’t get that. Reply YES to start or STOP to cancel.');
  return res.send(twiml.toString());
});

// Admin endpoint to view all screening results
app.get('/admin', (req, res) => {
  try {
    const raw = fs.readFileSync(RESULTS_FILE, 'utf8').trim();
    const data = raw ? JSON.parse(raw) : [];

    let html = `
      <html><head><title>Screening Results</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f4f4f4; }
      </style>
      </head><body>
      <h1>ChildCheck Screening Results</h1>
      <table>
        <tr>
          <th>Phone</th><th>Timestamp</th>
          <th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Q5</th>
        </tr>`;

    data.forEach(record => {
      html += `
        <tr>
          <td>${record.phone}</td>
          <td>${record.timestamp}</td>
          <td>${record.answers[0]}</td>
          <td>${record.answers[1]}</td>
          <td>${record.answers[2]}</td>
          <td>${record.answers[3]}</td>
          <td>${record.answers[4]}</td>
        </tr>`;
    });

    html += `</table></body></html>`;
    res.send(html);

  } catch (err) {
    res.status(500).send('Error reading results: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot listening on port ${PORT}`));
