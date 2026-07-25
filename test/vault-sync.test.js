import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSyncPlan,
  cleanPhone,
  payloadHash,
  validatePayload
} from '../server/services/vault-sync.js';

function samplePayload(overrides = {}) {
  return {
    source: 'nc-vault',
    version: 1,
    generatedAt: '2026-07-20T12:00:00.000Z',
    groups: [{
      sourceId: 'nc:group:one',
      sourcePath: 'wiki/groups/Group One.md',
      name: 'Group One',
      description: null,
      status: 'active'
    }],
    people: [{
      sourceId: 'nc:person:one',
      sourcePath: 'wiki/people/Jane Doe.md',
      fullName: 'Jane Doe',
      firstName: 'Jane',
      lastName: 'Doe',
      aliases: [],
      phone: '+1 (816) 555-1212',
      email: 'jane@example.com',
      gender: 'Female',
      ageGroup: 'Adult',
      membershipStatus: 'Member',
      status: 'active',
      groupSourceIds: ['nc:group:one']
    }],
    ...overrides
  };
}

test('cleanPhone normalizes US numbers and rejects other lengths', () => {
  assert.equal(cleanPhone('+1 (816) 555-1212'), '8165551212');
  assert.equal(cleanPhone('816.555.1212'), '8165551212');
  assert.equal(cleanPhone('555-1212'), null);
});

test('payload hashes are stable across object key order', () => {
  assert.equal(payloadHash({ b: 2, a: 1 }), payloadHash({ a: 1, b: 2 }));
});

test('validatePayload normalizes phone and de-duplicates group membership', () => {
  const payload = samplePayload();
  payload.people[0].groupSourceIds.push('nc:group:one');
  const validated = validatePayload(payload);
  assert.equal(validated.people[0].phone, '8165551212');
  assert.deepEqual(validated.people[0].groupSourceIds, ['nc:group:one']);
});

test('validatePayload accepts the youth-parent-non-NC membership status', () => {
  const input = samplePayload();
  input.people[0].membershipStatus = 'YouthParentNonNc';
  const validated = validatePayload(input);
  assert.equal(validated.people[0].membershipStatus, 'YouthParentNonNc');
});

test('initial sync adopts one exact existing person and group', () => {
  const payload = validatePayload(samplePayload());
  const currentGroups = [{
    id: 'group-db-1',
    sourceId: null,
    sourceManaged: false,
    sourceStatus: null,
    name: 'Group One',
    description: null
  }];
  const currentPeople = [{
    id: 'person-db-1',
    sourceId: null,
    sourceManaged: false,
    sourceStatus: null,
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '8165551212',
    email: 'jane@example.com',
    gender: 'Female',
    ageGroup: 'Adult',
    membershipStatus: 'Member',
    groups: []
  }];
  const plan = buildSyncPlan(payload, currentPeople, currentGroups);
  assert.equal(plan.summary.people.create, 0);
  assert.equal(plan.summary.people.update, 1);
  assert.equal(plan.summary.groups.create, 0);
  assert.equal(plan.summary.groups.update, 1);
  assert.equal(plan.personMatches.get('nc:person:one'), 'person-db-1');
  assert.equal(plan.groupMatches.get('nc:group:one'), 'group-db-1');
});

test('initial sync safely adopts a renamed person by one unique phone', () => {
  const payload = validatePayload(samplePayload());
  const currentPeople = [{
    id: 'person-db-1',
    sourceId: null,
    sourceManaged: false,
    sourceStatus: null,
    firstName: 'Jane',
    lastName: 'Oldname',
    phone: '8165551212',
    email: null,
    gender: 'Female',
    ageGroup: 'Adult',
    membershipStatus: 'Member',
    groups: []
  }];
  const plan = buildSyncPlan(payload, currentPeople, []);
  assert.equal(plan.summary.people.create, 0);
  assert.equal(plan.summary.people.update, 1);
  assert.equal(plan.summary.people.archive, 0);
  assert.equal(plan.personMatches.get('nc:person:one'), 'person-db-1');
});

test('initial sync adopts a known vault alias before using contact-only matching', () => {
  const input = samplePayload();
  input.people[0].aliases = ['Janie Doe'];
  const payload = validatePayload(input);
  const currentPeople = [{
    id: 'person-db-1',
    sourceId: null,
    sourceManaged: false,
    sourceStatus: null,
    firstName: 'Janie',
    lastName: 'Doe',
    phone: null,
    email: null,
    gender: 'Female',
    ageGroup: 'Adult',
    membershipStatus: 'Member',
    groups: []
  }];
  const plan = buildSyncPlan(payload, currentPeople, []);
  assert.equal(plan.summary.people.create, 0);
  assert.equal(plan.summary.people.archive, 0);
  assert.equal(plan.personMatches.get('nc:person:one'), 'person-db-1');
});

test('shared phones are reported once for safe send de-duplication', () => {
  const input = samplePayload();
  input.people.push({
    ...input.people[0],
    sourceId: 'nc:person:two',
    sourcePath: 'wiki/people/John Doe.md',
    fullName: 'John Doe',
    firstName: 'John',
    lastName: 'Doe'
  });
  const plan = buildSyncPlan(validatePayload(input), [], []);
  assert.equal(plan.summary.phones.records, 2);
  assert.equal(plan.summary.phones.unique, 1);
  assert.equal(plan.summary.phones.shared, 1);
  assert.deepEqual(plan.sharedPhones[0].people, ['Jane Doe', 'John Doe']);
});

test('one legacy person cannot be adopted by two people sharing a phone', () => {
  const input = samplePayload();
  input.people.push({
    ...input.people[0],
    sourceId: 'nc:person:two',
    sourcePath: 'wiki/people/John Doe.md',
    fullName: 'John Doe',
    firstName: 'John',
    lastName: 'Doe'
  });
  const currentPeople = [{
    id: 'person-db-1',
    sourceId: null,
    sourceManaged: false,
    sourceStatus: null,
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '8165551212',
    email: 'jane@example.com',
    gender: 'Female',
    ageGroup: 'Adult',
    membershipStatus: 'Member',
    groups: []
  }];
  const plan = buildSyncPlan(validatePayload(input), currentPeople, []);
  assert.equal(plan.personMatches.get('nc:person:one'), 'person-db-1');
  assert.equal(plan.personMatches.get('nc:person:two'), null);
  assert.equal(plan.summary.people.create, 1);
});

test('unmatched legacy records are previewed for archive, not deletion', () => {
  const payload = validatePayload(samplePayload());
  const currentPeople = [{
    id: 'legacy-person',
    sourceId: null,
    sourceManaged: false,
    sourceStatus: null,
    firstName: 'Old',
    lastName: 'Record',
    phone: '9135559999',
    email: null,
    gender: null,
    ageGroup: 'Adult',
    membershipStatus: 'Other',
    groups: []
  }];
  const currentGroups = [{
    id: 'legacy-group',
    sourceId: null,
    sourceManaged: false,
    sourceStatus: null,
    name: 'Old Group',
    description: null
  }];
  const plan = buildSyncPlan(payload, currentPeople, currentGroups);
  assert.equal(plan.summary.people.archive, 1);
  assert.equal(plan.summary.people.legacyUnmatched, 1);
  assert.equal(plan.summary.groups.archive, 1);
  assert.equal(plan.summary.groups.legacyUnmatched, 1);
  assert.deepEqual(plan.peopleArchiveIds, ['legacy-person']);
  assert.deepEqual(plan.groupsArchiveIds, ['legacy-group']);
  assert.deepEqual(plan.archiveCandidates.people, [{
    name: 'Old Record',
    phoneEnding: '9999',
    previouslyVaultManaged: false
  }]);
  assert.deepEqual(plan.archiveCandidates.groups, [{
    name: 'Old Group',
    previouslyVaultManaged: false
  }]);
});
