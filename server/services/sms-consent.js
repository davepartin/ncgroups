const CONSENT_STATUSES = ['Unknown', 'Legacy', 'OptedIn', 'OptedOut'];

/**
 * Twilio reports a send to an unsubscribed recipient either synchronously from
 * messages.create or later on the status callback, so both paths have to record
 * the opt-out.
 */
export const OPTED_OUT_ERROR_CODES = Object.freeze(['21610', '30630']);

export function isOptedOutError(error) {
  return OPTED_OUT_ERROR_CODES.includes(String(error?.code ?? ''));
}

/**
 * Consent is stored per phone number, so every person sharing the number moves
 * together and the preference is kept even when nobody in the directory owns
 * that number.
 */
export function setPhoneConsent(prismaClient, phone, status, source) {
  const now = new Date();
  return prismaClient.$transaction([
    prismaClient.smsPreference.upsert({
      where: { phone },
      create: {
        phone,
        status,
        source,
        consentedAt: status === 'OptedIn' ? now : null,
        optedOutAt: status === 'OptedOut' ? now : null
      },
      update: {
        status,
        source,
        consentedAt: status === 'OptedIn' ? now : undefined,
        optedOutAt: status === 'OptedOut' ? now : null
      }
    }),
    prismaClient.person.updateMany({
      where: { phone },
      data: { isOptedOut: status === 'OptedOut' }
    })
  ]);
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
