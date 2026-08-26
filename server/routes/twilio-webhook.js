/**
 * Twilio Webhook Routes
 * Handle incoming SMS messages (opt-out/opt-in)
 *
 * POST /api/twilio/webhook - Receives incoming SMS from Twilio
 */

import 'dotenv/config';
import { Router } from 'express';
import twilio from 'twilio';
import prisma from '../db.js';
import { setPhoneConsent } from '../services/sms-consent.js';

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

function validateTwilioWebhook(req, res, next) {
  if (process.env.TWILIO_VALIDATE_WEBHOOKS === 'false') return next();
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.get('X-Twilio-Signature');
  if (!authToken || !signature) return res.status(403).send('Invalid Twilio signature');
  const configuredBase = process.env.TWILIO_WEBHOOK_BASE_URL?.replace(/\/$/, '');
  const requestUrl = configuredBase
    ? `${configuredBase}${req.originalUrl}`
    : `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  if (!twilio.validateRequest(authToken, signature, requestUrl, req.body)) {
    return res.status(403).send('Invalid Twilio signature');
  }
  next();
}

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
router.post('/webhook', validateTwilioWebhook, async (req, res) => {
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
      const people = await prisma.person.findMany({
        where: { phone }
      });

      await setPhoneConsent(prisma, phone, 'OptedOut', 'twilio-stop');
      if (people.length) {
        const names = people.map(person => `${person.firstName} ${person.lastName}`.trim()).join(', ');
        console.log(`Opted out: ${names} (${phone})`);
        await notifyAdmin(`Opt-out: ${names} replied STOP and has been removed from your list.`);
      } else {
        console.log(`Opt-out received from unknown number: ${phone}`);
        await notifyAdmin(`Opt-out: Unknown number ${phone} replied STOP. The preference was saved.`);
      }
    }

    // Check if it's an opt-in keyword
    if (OPT_IN_KEYWORDS.includes(messageText)) {
      // Find person by phone number and mark as opted in
      const people = await prisma.person.findMany({
        where: { phone }
      });

      await setPhoneConsent(prisma, phone, 'OptedIn', 'twilio-start');
      if (people.length) {
        const names = people.map(person => `${person.firstName} ${person.lastName}`.trim()).join(', ');
        console.log(`Opted back in: ${names} (${phone})`);
      } else {
        console.log(`Opt-in received from unknown number and saved: ${phone}`);
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
 *   30005 - Unknown destination handset: notify admin for review, but do not
 *           change consent because this can also be a temporary carrier/device issue.
 *   30003 - Unreachable handset (phone off or possibly disconnected):
 *           notify admin to review — not auto-removed since it may be temporary.
 */
router.post('/status-callback', validateTwilioWebhook, async (req, res) => {
  try {
    const { To, MessageStatus, ErrorCode } = req.body;

    if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
      const phone = (To || '').replace(/^\+1/, '').replace(/\D/g, '');
      const people = await prisma.person.findMany({ where: { phone } });
      const name = people.length ? people.map(person => `${person.firstName} ${person.lastName}`.trim()).join(', ') : null;

      // --- 21610: Recipient previously opted out ---
      if (ErrorCode === '21610') {
        console.log(`Status callback: opted-out error (21610) for ${phone}`);
        await setPhoneConsent(prisma, phone, 'OptedOut', 'twilio-error-21610');
        if (people.length) {
          console.log(`Auto opted-out: ${name} (${phone})`);
          await notifyAdmin(`Opt-out: ${name} (${phone}) was flagged by Twilio and removed from your list.`);
        } else {
          await notifyAdmin(`Opt-out: ${phone} was flagged by Twilio but isn't in your database. No action needed.`);
        }
      }

      // --- 30005: Unknown destination handset (may be temporary) ---
      if (ErrorCode === '30005') {
        console.log(`Status callback: unknown destination handset (30005) for ${phone}; consent unchanged`);
        if (people.length) {
          await notifyAdmin(`Delivery warning: ${name} (${phone}) returned Twilio 30005. The phone may be off, out of signal, disconnected, or affected by a carrier issue. Texting status was not changed.`);
        } else {
          await notifyAdmin(`Delivery warning: ${phone} returned Twilio 30005 but isn't in your database. No action was taken.`);
        }
      }

      // --- 30003: Handset unreachable (possibly temporary — phone off, no signal) ---
      if (ErrorCode === '30003') {
        console.log(`Status callback: unreachable handset (30003) for ${phone}`);
        if (people.length) {
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
