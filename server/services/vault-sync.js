import crypto from 'crypto';

const GENDERS = new Set(['Male', 'Female', null]);
const AGE_GROUPS = new Set(['Adult', 'Youth', 'Child', null]);
const MEMBERSHIP_STATUSES = new Set([
  'Member',
  'MemberChild',
  'RegularAttender',
  'RegularAttenderChild',
  'Visitor',
  'VisitorChild',
  'FourthCircle',
  'YouthParentNonNc',
  'Youth',
  'Other',
  null
]);

export function cleanPhone(value) {
  if (!value) return null;
  let digits = String(value).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function payloadHash(payload) {
  return crypto.createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw badRequest(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function nullableString(value, label) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw badRequest(`${label} must be a string or null`);
  return value.trim() || null;
}

export function validatePayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('Sync payload must be a JSON object');
  }
  if (input.source !== 'nc-vault') throw badRequest('Sync source must be nc-vault');
  if (input.version !== 1) throw badRequest('Unsupported sync payload version');
  if (!Array.isArray(input.people) || !Array.isArray(input.groups)) {
    throw badRequest('Sync payload must include people and groups arrays');
  }
  if (input.people.length > 2000 || input.groups.length > 500) {
    throw badRequest('Sync payload exceeds safety limits');
  }

  const groupIds = new Set();
  const groups = input.groups.map((group, index) => {
    const sourceId = requireString(group.sourceId, `groups[${index}].sourceId`);
    if (groupIds.has(sourceId)) throw badRequest(`Duplicate group sourceId: ${sourceId}`);
    groupIds.add(sourceId);
    return {
      sourceId,
      sourcePath: nullableString(group.sourcePath, `groups[${index}].sourcePath`),
      name: requireString(group.name, `groups[${index}].name`),
      description: nullableString(group.description, `groups[${index}].description`),
      status: nullableString(group.status, `groups[${index}].status`) || 'active'
    };
  });

  const personIds = new Set();
  const people = input.people.map((person, index) => {
    const sourceId = requireString(person.sourceId, `people[${index}].sourceId`);
    if (personIds.has(sourceId)) throw badRequest(`Duplicate person sourceId: ${sourceId}`);
    personIds.add(sourceId);
    const phone = person.phone ? cleanPhone(person.phone) : null;
    if (person.phone && !phone) throw badRequest(`Invalid phone for ${person.fullName || sourceId}`);
    const gender = nullableString(person.gender, `people[${index}].gender`);
    const ageGroup = nullableString(person.ageGroup, `people[${index}].ageGroup`);
    const membershipStatus = nullableString(person.membershipStatus, `people[${index}].membershipStatus`);
    if (!GENDERS.has(gender)) throw badRequest(`Invalid gender for ${person.fullName || sourceId}`);
    if (!AGE_GROUPS.has(ageGroup)) throw badRequest(`Invalid age group for ${person.fullName || sourceId}`);
    if (!MEMBERSHIP_STATUSES.has(membershipStatus)) throw badRequest(`Invalid membership status for ${person.fullName || sourceId}`);
    if (!Array.isArray(person.groupSourceIds)) throw badRequest(`groupSourceIds must be an array for ${person.fullName || sourceId}`);
    const aliases = person.aliases === undefined ? [] : person.aliases;
    if (!Array.isArray(aliases)) throw badRequest(`aliases must be an array for ${person.fullName || sourceId}`);
    const memberGroups = [...new Set(person.groupSourceIds.map(String))];
    const unknownGroups = memberGroups.filter(id => !groupIds.has(id));
    if (unknownGroups.length) {
      throw badRequest(`Unknown group sourceId for ${person.fullName || sourceId}: ${unknownGroups.join(', ')}`);
    }
    return {
      sourceId,
      sourcePath: nullableString(person.sourcePath, `people[${index}].sourcePath`),
      fullName: requireString(person.fullName, `people[${index}].fullName`),
      firstName: requireString(person.firstName, `people[${index}].firstName`),
      lastName: typeof person.lastName === 'string' ? person.lastName.trim() : '',
      aliases: [...new Set(aliases.map(alias => requireString(alias, `people[${index}].aliases`)))].sort(),
      phone,
      email: nullableString(person.email, `people[${index}].email`),
      gender,
      ageGroup,
      membershipStatus,
      status: nullableString(person.status, `people[${index}].status`) || 'active',
      groupSourceIds: memberGroups.sort()
    };
  });

  return {
    source: 'nc-vault',
    version: 1,
    generatedAt: nullableString(input.generatedAt, 'generatedAt') || new Date().toISOString(),
    people,
    groups
  };
}

function normalizedName(firstName, lastName) {
  return `${firstName || ''} ${lastName || ''}`.trim().replace(/\s+/g, ' ').toLowerCase();
}

function sameNullable(left, right) {
  return (left || null) === (right || null);
}

function personChanged(incoming, current, currentGroupSourceIds) {
  return incoming.firstName !== current.firstName ||
    incoming.lastName !== current.lastName ||
    !sameNullable(incoming.phone, current.phone) ||
    !sameNullable(incoming.email, current.email) ||
    !sameNullable(incoming.gender, current.gender) ||
    !sameNullable(incoming.ageGroup, current.ageGroup) ||
    !sameNullable(incoming.membershipStatus, current.membershipStatus) ||
    current.sourceStatus !== incoming.status ||
    incoming.groupSourceIds.join('|') !== currentGroupSourceIds.join('|');
}

function groupChanged(incoming, current) {
  return incoming.name !== current.name ||
    !sameNullable(incoming.description, current.description) ||
    current.sourceStatus !== incoming.status;
}

function findPersonNameMatch(incoming, currentPeople, claimedIds) {
  const bySource = currentPeople.find(person => person.sourceId === incoming.sourceId);
  if (bySource) return { person: bySource, reason: 'sourceId' };

  const names = new Set([
    normalizedName(incoming.firstName, incoming.lastName),
    ...(incoming.aliases || []).map(alias => normalizedName(alias, ''))
  ]);
  const byName = currentPeople.filter(person =>
    !claimedIds.has(person.id) && names.has(normalizedName(person.firstName, person.lastName))
  );
  if (byName.length === 0) return { person: null, reason: 'new' };

  const strong = byName.filter(person =>
    (incoming.phone && person.phone === incoming.phone) ||
    (incoming.email && person.email && person.email.toLowerCase() === incoming.email.toLowerCase())
  );
  if (strong.length === 1) return { person: strong[0], reason: 'name-and-contact' };
  if (strong.length > 1) return { person: null, reason: 'ambiguous', candidates: strong };
  if (byName.length === 1) return { person: byName[0], reason: 'exact-name' };
  return { person: null, reason: 'ambiguous', candidates: byName };
}

function findPersonContactMatch(incoming, currentPeople, claimedIds, incomingPhoneCounts, incomingEmailCounts) {
  const available = currentPeople.filter(person => !claimedIds.has(person.id));
  const byPhone = incoming.phone && incomingPhoneCounts.get(incoming.phone) === 1
    ? available.filter(person => person.phone === incoming.phone)
    : [];
  const normalizedEmail = incoming.email?.toLowerCase();
  const byEmail = normalizedEmail && incomingEmailCounts.get(normalizedEmail) === 1
    ? available.filter(person => person.email && person.email.toLowerCase() === normalizedEmail)
    : [];
  const uniquePhone = byPhone.length === 1 ? byPhone[0] : null;
  const uniqueEmail = byEmail.length === 1 ? byEmail[0] : null;
  if (uniquePhone && uniqueEmail && uniquePhone.id !== uniqueEmail.id) {
    return { person: null, reason: 'ambiguous', candidates: [uniquePhone, uniqueEmail] };
  }
  if (uniqueEmail) return { person: uniqueEmail, reason: 'unique-email' };
  if (uniquePhone) return { person: uniquePhone, reason: 'unique-phone' };
  return { person: null, reason: 'new' };
}

export function buildSyncPlan(payload, currentPeople, currentGroups) {
  const groupMatches = new Map();
  const personMatches = new Map();
  const conflicts = [];
  let groupsCreate = 0;
  let groupsUpdate = 0;
  let groupsUnchanged = 0;
  let peopleCreate = 0;
  let peopleUpdate = 0;
  let peopleUnchanged = 0;

  for (const incoming of payload.groups) {
    const bySource = currentGroups.find(group => group.sourceId === incoming.sourceId);
    const byName = currentGroups.filter(group => group.name.toLowerCase() === incoming.name.toLowerCase());
    if (bySource && byName.some(group => group.id !== bySource.id)) {
      conflicts.push({ type: 'group', sourceId: incoming.sourceId, name: incoming.name, reason: 'Another group already has this name' });
      continue;
    }
    const current = bySource || (byName.length === 1 ? byName[0] : null);
    if (!current && byName.length > 1) {
      conflicts.push({ type: 'group', sourceId: incoming.sourceId, name: incoming.name, reason: 'Multiple groups have this name' });
      continue;
    }
    groupMatches.set(incoming.sourceId, current?.id || null);
    if (!current) groupsCreate += 1;
    else if (groupChanged(incoming, current)) groupsUpdate += 1;
    else groupsUnchanged += 1;
  }

  const claimedPersonIds = new Set();
  const pendingPeople = [];
  const conflictedPeople = new Set();
  const incomingPhoneCounts = new Map();
  const incomingEmailCounts = new Map();
  for (const person of payload.people) {
    if (person.phone) incomingPhoneCounts.set(person.phone, (incomingPhoneCounts.get(person.phone) || 0) + 1);
    if (person.email) {
      const email = person.email.toLowerCase();
      incomingEmailCounts.set(email, (incomingEmailCounts.get(email) || 0) + 1);
    }
  }

  const recordPersonConflict = (incoming, match) => {
    conflictedPeople.add(incoming.sourceId);
    conflicts.push({
      type: 'person',
      sourceId: incoming.sourceId,
      name: incoming.fullName,
      reason: 'Multiple existing people match this vault record',
      candidates: match.candidates.map(person => ({ id: person.id, name: `${person.firstName} ${person.lastName}`.trim(), phone: person.phone }))
    });
  };

  for (const incoming of payload.people) {
    const match = findPersonNameMatch(incoming, currentPeople, claimedPersonIds);
    if (match.reason === 'ambiguous') {
      recordPersonConflict(incoming, match);
      continue;
    }
    if (match.person) {
      personMatches.set(incoming.sourceId, match.person.id);
      claimedPersonIds.add(match.person.id);
    } else {
      pendingPeople.push(incoming);
    }
  }

  for (const incoming of pendingPeople) {
    const match = findPersonContactMatch(incoming, currentPeople, claimedPersonIds, incomingPhoneCounts, incomingEmailCounts);
    if (match.reason === 'ambiguous') {
      recordPersonConflict(incoming, match);
      continue;
    }
    personMatches.set(incoming.sourceId, match.person?.id || null);
    if (match.person) claimedPersonIds.add(match.person.id);
  }

  const peopleById = new Map(currentPeople.map(person => [person.id, person]));
  for (const incoming of payload.people) {
    if (conflictedPeople.has(incoming.sourceId)) continue;
    const currentId = personMatches.get(incoming.sourceId);
    const current = currentId ? peopleById.get(currentId) : null;
    if (!current) {
      peopleCreate += 1;
      continue;
    }
    const groupSourceIds = (current.groups || [])
      .map(item => item.group?.sourceId)
      .filter(Boolean)
      .sort();
    if (personChanged(incoming, current, groupSourceIds)) peopleUpdate += 1;
    else peopleUnchanged += 1;
  }

  const matchedPersonIds = new Set([...personMatches.values()].filter(Boolean));
  const matchedGroupIds = new Set([...groupMatches.values()].filter(Boolean));
  const peopleArchiveIds = currentPeople
    .filter(person => !matchedPersonIds.has(person.id) && person.sourceStatus !== 'archived')
    .map(person => person.id);
  const groupsArchiveIds = currentGroups
    .filter(group => !matchedGroupIds.has(group.id) && group.sourceStatus !== 'archived')
    .map(group => group.id);
  const legacyPeopleArchive = currentPeople.filter(person => peopleArchiveIds.includes(person.id) && !person.sourceManaged).length;
  const legacyGroupsArchive = currentGroups.filter(group => groupsArchiveIds.includes(group.id) && !group.sourceManaged).length;
  const peopleArchiveSet = new Set(peopleArchiveIds);
  const groupsArchiveSet = new Set(groupsArchiveIds);
  const archiveCandidates = {
    people: currentPeople
      .filter(person => peopleArchiveSet.has(person.id))
      .map(person => ({
        name: `${person.firstName || ''} ${person.lastName || ''}`.trim(),
        phoneEnding: person.phone ? person.phone.slice(-4) : null,
        previouslyVaultManaged: Boolean(person.sourceManaged)
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    groups: currentGroups
      .filter(group => groupsArchiveSet.has(group.id))
      .map(group => ({ name: group.name, previouslyVaultManaged: Boolean(group.sourceManaged) }))
      .sort((left, right) => left.name.localeCompare(right.name))
  };

  const phoneMap = new Map();
  for (const person of payload.people) {
    if (!person.phone) continue;
    if (!phoneMap.has(person.phone)) phoneMap.set(person.phone, []);
    phoneMap.get(person.phone).push(person.fullName);
  }
  const sharedPhones = [...phoneMap.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([phone, names]) => ({ phone, people: names }));

  return {
    summary: {
      people: { total: payload.people.length, create: peopleCreate, update: peopleUpdate, unchanged: peopleUnchanged, archive: peopleArchiveIds.length, legacyUnmatched: legacyPeopleArchive },
      groups: { total: payload.groups.length, create: groupsCreate, update: groupsUpdate, unchanged: groupsUnchanged, archive: groupsArchiveIds.length, legacyUnmatched: legacyGroupsArchive },
      phones: { records: payload.people.filter(person => person.phone).length, unique: phoneMap.size, shared: sharedPhones.length },
      conflicts: conflicts.length
    },
    conflicts,
    sharedPhones,
    archiveCandidates,
    personMatches,
    groupMatches,
    peopleArchiveIds,
    groupsArchiveIds
  };
}
