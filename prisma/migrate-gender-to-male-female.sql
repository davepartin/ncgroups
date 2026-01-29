-- One-time migration: change gender enum from Guy/Lady to Male/Female
-- Run this ONCE if your database already has the old enum (e.g. on Railway):
--   psql $DATABASE_URL -f prisma/migrate-gender-to-male-female.sql

CREATE TYPE gender_new AS ENUM ('Male', 'Female');

ALTER TABLE people ADD COLUMN gender_tmp gender_new;

UPDATE people
SET gender_tmp = CASE
  WHEN gender::text = 'Guy' THEN 'Male'::gender_new
  WHEN gender::text = 'Lady' THEN 'Female'::gender_new
  ELSE NULL
END;

ALTER TABLE people DROP COLUMN gender;
ALTER TABLE people RENAME COLUMN gender_tmp TO gender;

DROP TYPE gender;
ALTER TYPE gender_new RENAME TO gender;
