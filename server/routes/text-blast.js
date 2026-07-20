/**
 * Text Blast Routes
 * Send SMS messages directly via Twilio
 *
 * POST /api/text-blast/send    - Send text blast
 * POST /api/text-blast/preview - Preview recipients without sending
 */

import 'dotenv/config';
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
const SENDABLE_CONSENT = new Set(['Legacy', 'OptedIn']);

async function uniqueConsentedRecipients(people) {
  const phones = [...new Set(people.map(person => person.phone).filter(Boolean))];
  const preferences = phones.length
    ? await prisma.smsPreference.findMany({ where: { phone: { in: phones } } })
    : [];
  const byPhone = new Map(preferences.map(preference => [preference.phone, preference.status]));
  const seen = new Set();
  const recipients = [];
  for (const person of people) {
    if (!person.phone || seen.has(person.phone)) continue;
    const status = byPhone.get(person.phone) || (person.isOptedOut ? 'OptedOut' : 'Legacy');
    if (!SENDABLE_CONSENT.has(status)) continue;
    seen.add(person.phone);
    recipients.push({ ...person, smsConsentStatus: status });
  }
  return recipients;
}

async function classifyRawPhones(phones) {
  const cleaned = [...new Set(
    (phones || [])
      .map(phone => String(phone).replace(/\D/g, ''))
      .map(phone => phone.length === 11 && phone.startsWith('1') ? phone.slice(1) : phone)
      .filter(phone => phone.length === 10)
  )];
  const preferences = cleaned.length
    ? await prisma.smsPreference.findMany({ where: { phone: { in: cleaned } } })
    : [];
  const blockedSet = new Set(
    preferences
      .filter(preference => !SENDABLE_CONSENT.has(preference.status))
      .map(preference => preference.phone)
  );
  return {
    cleaned,
    sendable: cleaned.filter(phone => !blockedSet.has(phone)),
    blocked: cleaned.filter(phone => blockedSet.has(phone))
  };
}

/**
 * Helper: Get eligible recipients based on filters
 * Returns people who have phone numbers and are NOT opted out
 */
async function getEligibleRecipients({ recipientIds, groupIds, gender, ageGroup }) {
  // SAFETY CHECK: Prevent accidental "send to everyone"
  // If no specific IDs and no filters are provided, do NOT return all users.
  if ((!recipientIds || recipientIds.length === 0) &&
    (!groupIds || groupIds.length === 0) &&
    !gender &&
    !ageGroup) {
    throw new Error('SAFETY CHECK: No recipients or filters specified. Cannot send to "everyone" implicitly.');
  }

  const where = {
    AND: [{
      OR: [
        { sourceStatus: null },
        { sourceStatus: { not: 'archived' } }
      ]
    }],
    phone: { not: null },
    isOptedOut: false
  };

  // PRIORITY 1: Explicit list of recipients (WYSIWYG from frontend)
  if (recipientIds && recipientIds.length > 0) {
    where.id = { in: recipientIds };
    // We ignore other filters if specific IDs are provided, ensuring exact match with UI
  }
  // PRIORITY 2: Filter-based selection (Fallback)
  else {
    if (groupIds && groupIds.length > 0) {
      // Support multiple groups (OR logic: in group A OR group B)
      where.groups = {
        some: {
          groupId: { in: groupIds }
        }
      };
    }

    if (gender) {
      where.gender = gender;
    }

    if (ageGroup) {
      where.ageGroup = ageGroup;
    }
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

  return uniqueConsentedRecipients(people);
}

/**
 * Helper: Send SMS to a single recipient
 * Includes a statusCallback URL so Twilio posts delivery results back to us,
 * allowing us to catch error 21610 (opted out) and auto-clean the database.
 */
async function sendSingleSMS(to, message) {
  // Format phone number with +1 if needed
  const formattedPhone = to.startsWith('+') ? to : `+1${to}`;

  const params = {
    body: message,
    from: TWILIO_PHONE_NUMBER,
    to: formattedPhone
  };

  // Attach a status callback so Twilio reports delivery failures back to our app.
  // APP_URL is the public Railway backend URL.
  if (process.env.APP_URL) {
    params.statusCallback = `${process.env.APP_URL.replace(/\/$/, '')}/api/twilio/status-callback`;
  }

  return twilioClient.messages.create(params);
}

/**
 * POST /api/text-blast/preview
 * Body: { groupId?, gender?, ageGroup? }
 *
 * Returns list of people who would receive the text
 */
router.post('/preview', async (req, res) => {
  try {
    const { recipientIds, groupIds, gender, ageGroup } = req.body;

    const recipients = await getEligibleRecipients({ recipientIds, groupIds, gender, ageGroup });

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
    const { message, recipientIds, groupIds, gender, ageGroup } = req.body;

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
    const recipients = await getEligibleRecipients({ recipientIds, groupIds, gender, ageGroup });

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
    const { groupId, groupIds, gender, ageGroup } = req.query;
    // Handle both single groupId (legacy) and groupIds array
    const effectiveGroupIds = groupIds ? (Array.isArray(groupIds) ? groupIds : [groupIds]) : (groupId ? [groupId] : []);

    // Note: sms-uri likely doesn't support mass individual recipientIds easily via query params due to length limits
    const recipients = await getEligibleRecipients({ groupIds: effectiveGroupIds, gender, ageGroup });

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

/**
 * POST /api/text-blast/preview-numbers
 * Reports which pasted numbers are sendable before any message is sent.
 */
router.post('/preview-numbers', async (req, res) => {
  try {
    const { phones } = req.body;
    const result = await classifyRawPhones(Array.isArray(phones) ? phones : []);
    res.json({
      validCount: result.cleaned.length,
      sendableCount: result.sendable.length,
      blockedCount: result.blocked.length,
      blocked: result.blocked
    });
  } catch (error) {
    console.error('Error previewing pasted phone numbers:', error);
    res.status(500).json({ error: 'Failed to preview pasted phone numbers' });
  }
});

/**
 * POST /api/text-blast/send-to-numbers
 * Body: { message, phones: string[] }
 *
 * Sends a text blast to a raw list of phone numbers (bypasses contacts DB).
 * Useful for pasting numbers directly from a Google Form or other source.
 */
router.post('/send-to-numbers', async (req, res) => {
  try {
    const { message, phones } = req.body;

    // Validate Twilio configuration
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return res.status(500).json({ error: 'SMS service not configured' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return res.status(400).json({ error: 'At least one phone number is required' });
    }

    // Clean, validate, deduplicate, and exclude known non-consenting numbers.
    const classified = await classifyRawPhones(phones);
    const cleanedPhones = classified.sendable;

    if (cleanedPhones.length === 0) {
      return res.status(400).json({
        error: classified.cleaned.length ? 'All valid numbers are opted out or do not have recorded consent' : 'No valid 10-digit phone numbers found',
        blockedCount: classified.blocked.length
      });
    }

    const fullMessage = message.trim() + OPT_OUT_FOOTER;

    if (fullMessage.length > 1600) {
      return res.status(400).json({ error: 'Message too long (max 1600 characters including opt-out text)' });
    }

    const results = { sent: [], failed: [] };

    for (const phone of cleanedPhones) {
      try {
        await sendSingleSMS(phone, fullMessage);
        results.sent.push(phone);
      } catch (error) {
        console.error(`Failed to send to ${phone}:`, error.message);
        results.failed.push({ phone, error: error.message });
      }
    }

    const cost = (results.sent.length * 0.01).toFixed(2);

    res.json({
      success: true,
      message: `Text blast sent to ${results.sent.length} numbers`,
      sentCount: results.sent.length,
      failedCount: results.failed.length,
      blockedCount: classified.blocked.length,
      blocked: classified.blocked.length > 0 ? classified.blocked : undefined,
      cost: `$${cost}`,
      failed: results.failed.length > 0 ? results.failed : undefined
    });
  } catch (error) {
    console.error('Error sending to numbers:', error);
    res.status(500).json({ error: 'Failed to send text blast' });
  }
});

export { getEligibleRecipients };
export default router;
