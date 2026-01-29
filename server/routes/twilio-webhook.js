/**
 * Twilio Webhook Routes
 * Handle incoming SMS messages (opt-out/opt-in)
 *
 * POST /api/twilio/webhook - Receives incoming SMS from Twilio
 */

import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// Keywords that Twilio recognizes for opt-out
const OPT_OUT_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
const OPT_IN_KEYWORDS = ['START', 'YES', 'UNSTOP'];

/**
 * POST /api/twilio/webhook
 *
 * Twilio sends incoming SMS messages here.
 * We check for STOP/START keywords and update the person's opt-out status.
 */
router.post('/webhook', async (req, res) => {
  try {
    const { From, Body } = req.body;

    if (!From || !Body) {
      console.log('Twilio webhook: Missing From or Body');
      return res.status(200).send('<Response></Response>');
    }

    // Clean up the phone number (remove +1 prefix if present)
    const phone = From.replace(/^\+1/, '').replace(/\D/g, '');
    const messageText = Body.trim().toUpperCase();

    console.log(`Twilio webhook received: ${phone} sent "${Body}"`);

    // Check if it's an opt-out keyword
    if (OPT_OUT_KEYWORDS.includes(messageText)) {
      // Find person by phone number and mark as opted out
      const person = await prisma.person.findFirst({
        where: { phone }
      });

      if (person) {
        await prisma.person.update({
          where: { id: person.id },
          data: { isOptedOut: true }
        });
        console.log(`Opted out: ${person.firstName} ${person.lastName} (${phone})`);
      } else {
        console.log(`Opt-out received from unknown number: ${phone}`);
      }
    }

    // Check if it's an opt-in keyword
    if (OPT_IN_KEYWORDS.includes(messageText)) {
      // Find person by phone number and mark as opted in
      const person = await prisma.person.findFirst({
        where: { phone }
      });

      if (person) {
        await prisma.person.update({
          where: { id: person.id },
          data: { isOptedOut: false }
        });
        console.log(`Opted back in: ${person.firstName} ${person.lastName} (${phone})`);
      } else {
        console.log(`Opt-in received from unknown number: ${phone}`);
      }
    }

    // Respond with empty TwiML (Twilio expects XML response)
    res.set('Content-Type', 'text/xml');
    res.status(200).send('<Response></Response>');
  } catch (error) {
    console.error('Twilio webhook error:', error);
    // Still return 200 so Twilio doesn't retry
    res.set('Content-Type', 'text/xml');
    res.status(200).send('<Response></Response>');
  }
});

export default router;
