import assert from 'node:assert/strict';
import test from 'node:test';
import { buildConsentSnapshot, isOptedOutError, setPhoneConsent } from '../server/services/sms-consent.js';

function fakePrismaClient() {
  const operations = [];
  return {
    operations,
    smsPreference: { upsert: args => ({ model: 'smsPreference.upsert', args }) },
    person: { updateMany: args => ({ model: 'person.updateMany', args }) },
    $transaction: async batch => {
      operations.push(...batch);
      return batch;
    }
  };
}

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

test('twilio unsubscribed-recipient errors are recognized from either send path', () => {
  assert.equal(isOptedOutError({ code: 21610 }), true);
  assert.equal(isOptedOutError({ code: '21610' }), true);
  assert.equal(isOptedOutError({ code: 30630 }), true);
  assert.equal(isOptedOutError({ code: 30005 }), false);
  assert.equal(isOptedOutError({ code: 'ECONNRESET' }), false);
  assert.equal(isOptedOutError(undefined), false);
});

test('opting a phone out also opts out everyone sharing that number', async () => {
  const client = fakePrismaClient();
  await setPhoneConsent(client, '9135551212', 'OptedOut', 'twilio-error-21610');

  const [preference, people] = client.operations;
  assert.equal(preference.args.where.phone, '9135551212');
  assert.equal(preference.args.update.status, 'OptedOut');
  assert.equal(preference.args.update.source, 'twilio-error-21610');
  assert.ok(preference.args.update.optedOutAt instanceof Date);
  assert.deepEqual(people.args.where, { phone: '9135551212' });
  assert.deepEqual(people.args.data, { isOptedOut: true });
});

test('opting a phone back in clears the opt-out for everyone sharing that number', async () => {
  const client = fakePrismaClient();
  await setPhoneConsent(client, '9135551212', 'OptedIn', 'twilio-start');

  const [preference, people] = client.operations;
  assert.ok(preference.args.update.consentedAt instanceof Date);
  assert.equal(preference.args.update.optedOutAt, null);
  assert.deepEqual(people.args.data, { isOptedOut: false });
});
