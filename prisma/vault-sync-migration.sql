-- One-time production migration for the NC Vault sync.
-- Run against the existing Railway PostgreSQL database before deploying the new app.

ALTER TYPE "MembershipStatus" ADD VALUE IF NOT EXISTS 'MemberChild';
ALTER TYPE "MembershipStatus" ADD VALUE IF NOT EXISTS 'RegularAttenderChild';
ALTER TYPE "MembershipStatus" ADD VALUE IF NOT EXISTS 'Visitor';
ALTER TYPE "MembershipStatus" ADD VALUE IF NOT EXISTS 'VisitorChild';
ALTER TYPE "MembershipStatus" ADD VALUE IF NOT EXISTS 'FourthCircle';

DO $$
BEGIN
  CREATE TYPE "SmsConsentStatus" AS ENUM ('Unknown', 'Legacy', 'OptedIn', 'OptedOut');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE people ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS source_managed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE people ADD COLUMN IF NOT EXISTS source_status TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS source_synced_at TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS people_source_id_key ON people(source_id);

ALTER TABLE groups ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS source_managed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS source_status TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS source_synced_at TIMESTAMP(3);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS groups_source_id_key ON groups(source_id);

CREATE TABLE IF NOT EXISTS sms_preferences (
  phone TEXT PRIMARY KEY,
  status "SmsConsentStatus" NOT NULL DEFAULT 'Unknown',
  source TEXT,
  consented_at TIMESTAMP(3),
  opted_out_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sms_preferences (phone, status, source, consented_at, opted_out_at)
SELECT
  phone,
  CASE
    WHEN BOOL_OR(is_opted_out) THEN 'OptedOut'::"SmsConsentStatus"
    ELSE 'Legacy'::"SmsConsentStatus"
  END,
  'legacy-database',
  CASE WHEN BOOL_OR(is_opted_out) THEN NULL ELSE CURRENT_TIMESTAMP END,
  CASE WHEN BOOL_OR(is_opted_out) THEN CURRENT_TIMESTAMP ELSE NULL END
FROM people
WHERE phone IS NOT NULL AND phone <> ''
GROUP BY phone
ON CONFLICT (phone) DO NOTHING;

CREATE TABLE IF NOT EXISTS vault_sync_state (
  id TEXT PRIMARY KEY,
  last_preview_at TIMESTAMP(3),
  last_applied_at TIMESTAMP(3),
  last_source_hash TEXT,
  last_summary JSONB
);
