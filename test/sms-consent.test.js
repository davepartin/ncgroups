import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildConsentSnapshot,
  DEFAULT_NEW_PHONE_CONSENT_STATUS,
  ensureNewPhoneConsent,
  newPhoneConsentCreateData,
  resolveIncomingPhoneConsent
} from '../server/services/sms-consent.js';

test('new phone numbers start opted in', () => {
  const now = new Date('2026-10-31T12:00:00Z');
  assert.equal(DEFAULT_NEW_PHONE_CONSENT_STATUS, 'OptedIn');
  assert.deepEqual(newPhoneConsentCreateData('8165551212', 'vault-sync', now), {
    phone: '8165551212',
    status: 'OptedIn',
    source: 'vault-sync',
    consentedAt: now,
    optedOutAt: null
  });
});

test('incoming phones create opted-in consent and never overwrite STOP', () => {
  assert.deepEqual(resolveIncomingPhoneConsent({ existingPreference: null }), {
    action: 'create',
    status: 'OptedIn'
  });
  assert.deepEqual(resolveIncomingPhoneConsent({
    existingPreference: null,
    requestedConsent: 'Unknown'
  }), {
    action: 'create',
    status: 'OptedIn'
  });
  assert.deepEqual(resolveIncomingPhoneConsent({
    existingPreference: null,
    requestedConsent: 'OptedOut'
  }), {
    action: 'create',
    status: 'OptedOut'
  });
  assert.deepEqual(resolveIncomingPhoneConsent({
    existingPreference: { phone: '8165550000', status: 'OptedOut' },
    requestedConsent: 'OptedIn',
    phoneChanged: true
  }), {
    action: 'keep',
    status: 'OptedOut'
  });
  assert.deepEqual(resolveIncomingPhoneConsent({
    existingPreference: { phone: '8165550000', status: 'Unknown' }
  }), {
    action: 'keep',
    status: 'Unknown'
  });
  assert.deepEqual(resolveIncomingPhoneConsent({
    existingPreference: { phone: '8165550000', status: 'Legacy' }
  }), {
    action: 'keep',
    status: 'Legacy'
  });
  assert.deepEqual(resolveIncomingPhoneConsent({
    existingPreference: { phone: '8165550000', status: 'OptedIn' },
    requestedConsent: 'OptedOut'
  }), {
    action: 'update',
    status: 'OptedOut'
  });
  assert.deepEqual(resolveIncomingPhoneConsent({
    existingPreference: { phone: '8165550000', status: 'OptedOut' },
    requestedConsent: 'OptedIn',
    phoneChanged: false
  }), {
    action: 'update',
    status: 'OptedIn'
  });
});

test('ensureNewPhoneConsent seeds opted-in and leaves existing rows alone', async () => {
  const now = new Date('2026-10-31T12:00:00Z');
  const optedOut = { phone: '9135552222', status: 'OptedOut', source: 'twilio-stop' };
  const store = new Map([[optedOut.phone, optedOut]]);
  const prisma = {
    smsPreference: {
      findUnique: async ({ where }) => store.get(where.phone) || null,
      create: async ({ data }) => {
        if (store.has(data.phone)) {
          const error = new Error('Unique constraint failed');
          error.code = 'P2002';
          throw error;
        }
        store.set(data.phone, data);
        return data;
      }
    }
  };

  const created = await ensureNewPhoneConsent(prisma, '8165551212', 'vault-sync', now);
  assert.equal(created.status, 'OptedIn');
  assert.equal(created.source, 'vault-sync');

  const kept = await ensureNewPhoneConsent(prisma, '9135552222', 'vault-sync', now);
  assert.equal(kept.status, 'OptedOut');
  assert.equal(kept.source, 'twilio-stop');
  assert.equal(store.get('9135552222').status, 'OptedOut');
});


test('consent snapshot is phone-level, sorted, and summarized', () => {
  const snapshot = buildConsentSnapshot([
    {
      phone: '9135552222',
      status: 'OptedOut',
      source: 'twilio-stop',
      consentedAt: null,
      optedOutAt: new Date('2026-07-19T10:00:00Z'),
      updatedAt: new Date('2026-07-19T10:00:00Z')
    },
    {
      phone: '8165551111',
      status: 'OptedIn',
      source: 'twilio-start',
      consentedAt: new Date('2026-07-20T10:00:00Z'),
      optedOutAt: null,
      updatedAt: new Date('2026-07-20T10:00:00Z')
    },
    {
      phone: '9135553333',
      status: 'Legacy',
      source: 'migration',
      consentedAt: null,
      optedOutAt: null,
      updatedAt: new Date('2026-07-18T10:00:00Z')
    }
  ], new Date('2026-07-20T12:00:00Z'));

  assert.deepEqual(snapshot.summary, {
    total: 3,
    optedIn: 1,
    optedOut: 1,
    legacy: 1,
    unknown: 0
  });
  assert.deepEqual(snapshot.preferences.map(preference => preference.phone), [
    '8165551111',
    '9135552222',
    '9135553333'
  ]);
  assert.equal(snapshot.preferences[0].consentedAt, '2026-07-20T10:00:00.000Z');
  assert.equal(snapshot.preferences[1].source, 'twilio-stop');
  assert.equal(snapshot.generatedAt, '2026-07-20T12:00:00.000Z');
});

test('consent snapshot ignores invalid phones and normalizes unknown statuses', () => {
  const snapshot = buildConsentSnapshot([
    { phone: '555-1212', status: 'OptedIn' },
    { phone: '9135551212', status: 'Unexpected' }
  ]);

  assert.equal(snapshot.summary.total, 1);
  assert.equal(snapshot.summary.unknown, 1);
  assert.equal(snapshot.preferences[0].status, 'Unknown');
});
