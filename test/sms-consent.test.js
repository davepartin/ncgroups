import assert from 'node:assert/strict';
import test from 'node:test';
import { buildConsentSnapshot } from '../server/services/sms-consent.js';

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
