/**
 * Shared texting eligibility rules.
 *
 * Adult records are eligible for normal church texting only when their NC
 * membership is one of the three church-connected statuses below. Youth and
 * child records keep their existing age/group behavior, but records with no
 * membership status are never eligible when they are evaluated as adults.
 */
export const ADULT_TEXTABLE_MEMBERSHIPS = Object.freeze([
  'Member',
  'RegularAttender',
  'Visitor'
]);

export function isAdultTextablePerson(person) {
  return person.ageGroup !== 'Adult' || ADULT_TEXTABLE_MEMBERSHIPS.includes(person.membershipStatus);
}

/**
 * Prisma where clause used for every database-backed text recipient query.
 * This is intentionally applied even when the frontend sends explicit IDs so
 * a stale or hand-crafted request cannot text adult records outside the rule.
 */
export function adultTextingEligibilityWhere() {
  return {
    OR: [
      { ageGroup: { not: 'Adult' } },
      { ageGroup: null },
      { ageGroup: 'Adult', membershipStatus: { in: ADULT_TEXTABLE_MEMBERSHIPS } }
    ]
  };
}
