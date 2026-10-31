export const CONSENT_STATUSES = ['Unknown', 'Legacy', 'OptedIn', 'OptedOut'];

// People who give the church a number are treated as opted in for church texts.
// Existing sms_preferences rows, including STOP / OptedOut, are never overwritten.
export const DEFAULT_NEW_PHONE_CONSENT_STATUS = 'OptedIn';

export function newPhoneConsentCreateData(phone, source, now = new Date()) {
  return {
    phone,
    status: DEFAULT_NEW_PHONE_CONSENT_STATUS,
    source,
    consentedAt: now,
    optedOutAt: null
  };
}

/**
 * Decide how to treat a phone that is being created or changed.
 * Existing rows are never overwritten by the new-number default.
 * Assigning someone onto a STOP / opted-out number keeps that opt-out.
 */
export function resolveIncomingPhoneConsent({ existingPreference, requestedConsent = null, phoneChanged = false }) {
  if (!existingPreference) {
    if (requestedConsent === 'OptedOut') {
      return { action: 'create', status: 'OptedOut' };
    }
    return { action: 'create', status: DEFAULT_NEW_PHONE_CONSENT_STATUS };
  }
  if (existingPreference.status === 'OptedOut' && phoneChanged) {
    return { action: 'keep', status: 'OptedOut' };
  }
  if (requestedConsent) {
    return { action: 'update', status: requestedConsent };
  }
  return { action: 'keep', status: existingPreference.status };
}

/**
 * Seed consent for a newly seen phone without touching an existing record.
 * STOP, staff opt-outs, Unknown, Legacy, and OptedIn all stay as stored.
 */
export async function ensureNewPhoneConsent(prismaClient, phone, source, now = new Date()) {
  const existing = await prismaClient.smsPreference.findUnique({ where: { phone } });
  if (existing) return existing;
  try {
    return await prismaClient.smsPreference.create({
      data: newPhoneConsentCreateData(phone, source, now)
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return prismaClient.smsPreference.findUnique({ where: { phone } });
    }
    throw error;
  }
}

function isoTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function buildConsentSnapshot(preferences, generatedAt = new Date()) {
  const records = (preferences || [])
    .map(preference => ({
      phone: String(preference.phone || ''),
      status: CONSENT_STATUSES.includes(preference.status) ? preference.status : 'Unknown',
      source: preference.source || null,
      consentedAt: isoTimestamp(preference.consentedAt),
      optedOutAt: isoTimestamp(preference.optedOutAt),
      updatedAt: isoTimestamp(preference.updatedAt)
    }))
    .filter(preference => /^\d{10}$/.test(preference.phone))
    .sort((left, right) => left.phone.localeCompare(right.phone));

  const summary = {
    total: records.length,
    optedIn: 0,
    optedOut: 0,
    legacy: 0,
    unknown: 0
  };
  for (const record of records) {
    const key = {
      OptedIn: 'optedIn',
      OptedOut: 'optedOut',
      Legacy: 'legacy',
      Unknown: 'unknown'
    }[record.status];
    summary[key] += 1;
  }

  return {
    version: 1,
    generatedAt: isoTimestamp(generatedAt),
    summary,
    preferences: records
  };
}
