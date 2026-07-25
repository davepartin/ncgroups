export const ADULT_TEXTABLE_MEMBERSHIPS = new Set([
  'Member',
  'RegularAttender',
  'Visitor'
])

export function isAdultAudiencePerson(person) {
  return person.ageGroup !== 'Adult' || ADULT_TEXTABLE_MEMBERSHIPS.has(person.membershipStatus)
}

export function isTextablePerson(person) {
  return Boolean(person.phone) &&
    ['Legacy', 'OptedIn'].includes(person.smsConsentStatus) &&
    isAdultAudiencePerson(person)
}
