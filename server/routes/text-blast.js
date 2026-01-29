/**
 * Text Blast Routes
 * Send SMS messages directly via Twilio
 *
 * POST /api/text-blast/send    - Send text blast
 * POST /api/text-blast/preview - Preview recipients without sending
 */

import { Router } from 'express';
import twilio from 'twilio';
import prisma from '../db.js';

const router = Router();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Opt-out footer added to every message
const OPT_OUT_FOOTER = '\n\nReply STOP to opt out';

/**
 * Helper: Get eligible recipients based on filters
 * Returns people who have phone numbers and are NOT opted out
 */
async function getEligibleRecipients({ groupId, gender, ageGroup }) {
  const where = {
    phone: { not: null },
    isOptedOut: false
  };

  if (groupId) {
    where.groups = {
      some: { groupId }
    };
  }

  if (gender) {
    where.gender = gender;
  }

  if (ageGroup) {
    where.ageGroup = ageGroup;
  }

  const people = await prisma.person.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      gender: true,
      ageGroup: true
    },
    orderBy: { lastName: 'asc' }
  });

  return people;
}

/**
 * Helper: Send SMS to a single recipient
 */
async function sendSingleSMS(to, message) {
  // Format phone number with +1 if needed
  const formattedPhone = to.startsWith('+') ? to : `+1${to}`;

  return twilioClient.messages.create({
    body: message,
    from: TWILIO_PHONE_NUMBER,
    to: formattedPhone
  });
}

/**
 * POST /api/text-blast/preview
 * Body: { groupId?, gender?, ageGroup? }
 *
 * Returns list of people who would receive the text
 */
router.post('/preview', async (req, res) => {
  try {
    const { groupId, gender, ageGroup } = req.body;

    const recipients = await getEligibleRecipients({ groupId, gender, ageGroup });

    // Calculate estimated cost ($0.01 per message for Twilio)
    const estimatedCost = (recipients.length * 0.01).toFixed(2);

    res.json({
      recipientCount: recipients.length,
      estimatedCost: `$${estimatedCost}`,
      recipients: recipients.map(r => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        phone: r.phone,
        gender: r.gender,
        ageGroup: r.ageGroup
      }))
    });
  } catch (error) {
    console.error('Error previewing recipients:', error);
    res.status(500).json({ error: 'Failed to preview recipients' });
  }
});

/**
 * POST /api/text-blast/send
 * Body: { message, groupId?, gender?, ageGroup? }
 *
 * Sends text blast directly via Twilio (one SMS per recipient)
 */
router.post('/send', async (req, res) => {
  try {
    const { message, groupId, gender, ageGroup } = req.body;

    // Validate Twilio configuration
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Twilio credentials not configured');
      return res.status(500).json({ error: 'SMS service not configured' });
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Full message with opt-out footer
    const fullMessage = message.trim() + OPT_OUT_FOOTER;

    if (fullMessage.length > 1600) {
      return res.status(400).json({ error: 'Message too long (max 1600 characters including opt-out text)' });
    }

    // Get recipients
    const recipients = await getEligibleRecipients({ groupId, gender, ageGroup });

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No eligible recipients found' });
    }

    // Send SMS to each recipient individually
    const results = {
      sent: [],
      failed: []
    };

    for (const recipient of recipients) {
      try {
        await sendSingleSMS(recipient.phone, fullMessage);
        results.sent.push({
          name: `${recipient.firstName} ${recipient.lastName}`,
          phone: recipient.phone
        });
      } catch (error) {
        console.error(`Failed to send to ${recipient.phone}:`, error.message);
        results.failed.push({
          name: `${recipient.firstName} ${recipient.lastName}`,
          phone: recipient.phone,
          error: error.message
        });
      }
    }

    // Calculate cost
    const cost = (results.sent.length * 0.01).toFixed(2);

    res.json({
      success: true,
      message: `Text blast sent to ${results.sent.length} recipients`,
      recipientCount: results.sent.length,
      failedCount: results.failed.length,
      cost: `$${cost}`,
      sent: results.sent,
      failed: results.failed.length > 0 ? results.failed : undefined
    });
  } catch (error) {
    console.error('Error sending text blast:', error);
    res.status(500).json({ error: 'Failed to send text blast' });
  }
});

/**
 * GET /api/text-blast/sms-uri
 * Query: { groupId?, gender?, ageGroup? }
 *
 * Returns an SMS URI for native group texting (opens phone's SMS app)
 */
router.get('/sms-uri', async (req, res) => {
  try {
    const { groupId, gender, ageGroup } = req.query;

    const recipients = await getEligibleRecipients({ groupId, gender, ageGroup });

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No eligible recipients found' });
    }

    // Format phone numbers for SMS URI
    const phones = recipients.map(r => r.phone);

    res.json({
      recipientCount: recipients.length,
      phones,
      smsUri: `sms:${phones.join(',')}`,
      smsUriIOS: `sms:/open?addresses=${phones.join(',')}`,
      smsUriAndroid: `sms:${phones.join(',')}`,
      warning: recipients.length > 20
        ? 'Large group texts may not work on all devices. Consider using Text Blast instead.'
        : null
    });
  } catch (error) {
    console.error('Error generating SMS URI:', error);
    res.status(500).json({ error: 'Failed to generate SMS URI' });
  }
});

export default router;
