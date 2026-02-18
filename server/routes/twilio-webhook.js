/**
 * Twilio Webhook Routes
 * Handle incoming SMS messages (opt-out/opt-in)
 *
 * POST /api/twilio/webhook - Receives incoming SMS from Twilio
 */

import { Router } from 'express';
import twilio from 'twilio';
import prisma from '../db.js';

const router = Router();

// Twilio client for sending admin notifications
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER;

// Keywords that Twilio recognizes for opt-out
const OPT_OUT_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
const OPT_IN_KEYWORDS = ['START', 'YES', 'UNSTOP'];

/**
 * Send a text notification to the admin (you) when someone opts out.
 * Requires ADMIN_PHONE_NUMBER to be set in your environment variables.
 */
async function notifyAdmin(message) {
  if (!ADMIN_PHONE_NUMBER || !TWILIO_PHONE_NUMBER) {
    console.log('Admin notification skipped — ADMIN_PHONE_NUMBER or TWILIO_PHONE_NUMBER not configured');
    return;
  }
  try {
    const adminPhone = ADMIN_PHONE_NUMBER.startsWith('+') ? ADMIN_PHONE_NUMBER : `+1${ADMIN_PHONE_NUMBER}`;
    await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: adminPhone
    });
    console.log(`Admin notified: ${message}`);
  } catch (err) {
    console.error('Failed to send admin notification:', err.message);
  }
}

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
        const name = `${person.firstName} ${person.lastName}`;
        console.log(`Opted out: ${name} (${phone})`);
        await notifyAdmin(`Opt-out: ${name} replied STOP and has been removed from your list.`);
      } else {
        console.log(`Opt-out received from unknown number: ${phone}`);
        await notifyAdmin(`Opt-out: Unknown number ${phone} replied STOP. They may not be in your database.`);
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

/**
 * POST /api/twilio/status-callback
 *
 * Twilio posts delivery status here after each outgoing message.
 * We handle three failure cases:
 *
 *   21610 - Opted-out recipient: auto-mark as opted out, notify admin.
 *   30005 - Unknown/disconnected number: auto-mark as opted out (inactive),
 *           notify admin to review and remove from the contact list.
 *   30003 - Unreachable handset (phone off or possibly disconnected):
 *           notify admin to review — not auto-removed since it may be temporary.
 */
router.post('/status-callback', async (req, res) => {
  try {
    const { To, MessageStatus, ErrorCode } = req.body;

    if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
      const phone = (To || '').replace(/^\+1/, '').replace(/\D/g, '');
      const person = await prisma.person.findFirst({ where: { phone } });
      const name = person ? `${person.firstName} ${person.lastName}` : null;

      // --- 21610: Recipient previously opted out ---
      if (ErrorCode === '21610') {
        console.log(`Status callback: opted-out error (21610) for ${phone}`);
        if (person) {
          await prisma.person.update({ where: { id: person.id }, data: { isOptedOut: true } });
          console.log(`Auto opted-out: ${name} (${phone})`);
          await notifyAdmin(`Opt-out: ${name} (${phone}) was flagged by Twilio and removed from your list.`);
        } else {
          await notifyAdmin(`Opt-out: ${phone} was flagged by Twilio but isn't in your database. No action needed.`);
        }
      }

      // --- 30005: Number doesn't exist / permanently disconnected ---
      if (ErrorCode === '30005') {
        console.log(`Status callback: unknown/disconnected number (30005) for ${phone}`);
        if (person) {
          // Mark inactive so they're skipped on future blasts
          await prisma.person.update({ where: { id: person.id }, data: { isOptedOut: true } });
          console.log(`Marked inactive (bad number): ${name} (${phone})`);
          await notifyAdmin(`Bad number: ${name} (${phone}) has a disconnected number and was marked inactive. Consider removing them from your list.`);
        } else {
          await notifyAdmin(`Bad number: ${phone} appears disconnected but isn't in your database. No action needed.`);
        }
      }

      // --- 30003: Handset unreachable (possibly temporary — phone off, no signal) ---
      if (ErrorCode === '30003') {
        console.log(`Status callback: unreachable handset (30003) for ${phone}`);
        if (person) {
          // Don't auto-remove — this could be temporary. Just notify.
          await notifyAdmin(`Unreachable: ${name} (${phone}) couldn't be reached. Their phone may have been off, or the number may be disconnected. Worth a review if this keeps happening.`);
        }
        // No notification needed if the person isn't even in our database
      }
    }

    // Twilio expects a 2xx response
    res.sendStatus(204);
  } catch (error) {
    console.error('Status callback error:', error);
    res.sendStatus(204); // Still return 2xx so Twilio doesn't retry
  }
});

export default router;
