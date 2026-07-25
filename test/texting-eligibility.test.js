import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADULT_TEXTABLE_MEMBERSHIPS,
  adultTextingEligibilityWhere,
  isAdultTextablePerson
} from '../server/services/texting-eligibility.js';

test('adult texting allows only members, regular attenders, and visitors', () => {
  assert.deepEqual([...ADULT_TEXTABLE_MEMBERSHIPS], ['Member', 'RegularAttender', 'Visitor']);
  assert.equal(isAdultTextablePerson({ ageGroup: 'Adult', membershipStatus: 'Member' }), true);
  assert.equal(isAdultTextablePerson({ ageGroup: 'Adult', membershipStatus: 'RegularAttender' }), true);
  assert.equal(isAdultTextablePerson({ ageGroup: 'Adult', membershipStatus: 'Visitor' }), true);
  assert.equal(isAdultTextablePerson({ ageGroup: 'Adult', membershipStatus: 'YouthParentNonNc' }), false);
  assert.equal(isAdultTextablePerson({ ageGroup: 'Adult', membershipStatus: 'FourthCircle' }), false);
  assert.equal(isAdultTextablePerson({ ageGroup: 'Adult', membershipStatus: null }), false);
});

test('youth and child records retain their existing texting eligibility', () => {
  assert.equal(isAdultTextablePerson({ ageGroup: 'Youth', membershipStatus: 'RegularAttenderChild' }), true);
  assert.equal(isAdultTextablePerson({ ageGroup: 'Child', membershipStatus: 'MemberChild' }), true);
});

test('server eligibility query includes the adult allowlist', () => {
  assert.deepEqual(adultTextingEligibilityWhere(), {
    OR: [
      { ageGroup: { not: 'Adult' } },
      { ageGroup: null },
      { ageGroup: 'Adult', membershipStatus: { in: ['Member', 'RegularAttender', 'Visitor'] } }
    ]
  });
});
