require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// In-memory sessions
const sessions = {};

app.post('/webhook', (req, res) => {
  const from = req.body.From;      // e.g. whatsapp:+233XXXXXXXXX
  const msg  = req.body.Body.trim().toLowerCase();
  const twiml = new MessagingResponse();

  // Initialize session
  if (!sessions[from]) sessions[from] = { step:  'opt-in', answers: [] };

  const session = sessions[from];

  // Opt-in logic
  if (session.step === 'opt-in') {
    if (msg === 'yes') {
      session.step = 'q1';
      twiml.message('Q1: Does your child enjoy being swung, bounced on your knee, or any playful rough-and-tumble activity? (YES/NO)');
    } else {
      twiml.message('Hi! Reply YES to begin the 5-question check, or STOP to cancel.');
    }
    return res.send(twiml.toString());
  }

  // STOP handling
  if (msg === 'stop') {
    delete sessions[from];
    twiml.message('You’ve unsubscribed. Reply YES anytime to restart.');
    return res.send(twiml.toString());
  }

  // Screening questions handler
  const questions = [
    'q1', 'q2', 'q3', 'q4', 'q5'
  ];
  const prompts = {
    q1: 'Q1: Does your child enjoy being swung, bounced on your knee, or any playful rough-and-tumble activity? (YES/NO)',
    q2: 'Q2: Does your child take an interest in other children, for example playing or talking with them? (YES/NO)',
    q3: 'Q3: Does your child point with one finger to ask for something (like a toy or snack)? (YES/NO)',
    q4: 'Q4: Does your child point with one finger to share interest (for example, showing you a bird or car)? (YES/NO)',
    q5: 'Q5: Does your child respond when you call their name, even if they’re not looking at you? (YES/NO)',
  };

  // If current msg is a YES/NO and we’re in Qn
  if (questions.includes(session.step)) {
    if (msg !== 'yes' && msg !== 'no') {
      twiml.message(`Please reply YES or NO.\n${prompts[session.step]}`);
      return res.send(twiml.toString());
    }

    // Record answer
    session.answers.push(msg === 'no' ? 1 : 0);
    const currentIndex = questions.indexOf(session.step);
    const nextIndex = currentIndex + 1;

    if (nextIndex < questions.length) {
      session.step = questions[nextIndex];
      twiml.message(prompts[session.step]);
    } else {
      // All 5 answered → compute score
      const riskCount = session.answers.reduce((a, b) => a + b, 0);
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
      delete sessions[from];  // reset session
    }

    return res.send(twiml.toString());
  }

  // Fallback
  twiml.message('Sorry, I didn’t get that. Reply YES to start or STOP to cancel.');
  return res.send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot listening on port ${PORT}`));
