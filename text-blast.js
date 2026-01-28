/**
 * Text Blast Routes
 * Send SMS messages via n8n Twilio webhook
 * 
 * POST /api/text-blast/send    - Send text blast
 * POST /api/text-blast/preview - Preview recipients without sending
 */

import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8n-on-fly-withered-hill-6831.fly.dev/webhook/4ad4d398-9dfe-400f-8599-9226084afb79';

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
 * Sends text blast via n8n webhook
 */
router.post('/send', async (req, res) => {
  try {
    const { message, groupId, gender, ageGroup } = req.body;

    // Validate message
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 1600) {
      return res.status(400).json({ error: 'Message too long (max 1600 characters)' });
    }

    // Get recipients
    const recipients = await getEligibleRecipients({ groupId, gender, ageGroup });

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No eligible recipients found' });
    }

    // Format phone numbers as comma-separated string (without +1 prefix - n8n adds it)
    const numbers = recipients.map(r => r.phone).join(',');

    // Send to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message.trim(),
        numbers
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n webhook error:', errorText);
      return res.status(500).json({ error: 'Failed to send text blast' });
    }

    // Calculate cost
    const cost = (recipients.length * 0.01).toFixed(2);

    res.json({
      success: true,
      message: 'Text blast sent successfully',
      recipientCount: recipients.length,
      cost: `$${cost}`,
      recipients: recipients.map(r => ({
        name: `${r.firstName} ${r.lastName}`,
        phone: r.phone
      }))
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
    // iOS: sms:/open?addresses=1234567890,0987654321
    // Android: sms:1234567890,0987654321
    // We'll return both formats and let the frontend decide
    const phones = recipients.map(r => r.phone);
    
    res.json({
      recipientCount: recipients.length,
      phones,
      // Standard SMS URI (works on most devices)
      smsUri: `sms:${phones.join(',')}`,
      // iOS-specific format
      smsUriIOS: `sms:/open?addresses=${phones.join(',')}`,
      // Android-specific format  
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
