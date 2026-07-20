const CONSENT_STATUSES = ['Unknown', 'Legacy', 'OptedIn', 'OptedOut'];

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
