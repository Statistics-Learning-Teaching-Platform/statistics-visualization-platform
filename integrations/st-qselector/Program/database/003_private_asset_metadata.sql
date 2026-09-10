BEGIN;

ALTER TABLE private_assets
  ADD COLUMN IF NOT EXISTS content_length bigint;

UPDATE private_assets
   SET content_length = octet_length(content)
 WHERE content_length IS NULL;

ALTER TABLE private_assets
  ALTER COLUMN content_length SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'private_assets_content_length_check'
  ) THEN
    ALTER TABLE private_assets
      ADD CONSTRAINT private_assets_content_length_check CHECK (content_length >= 0);
  END IF;
END $$;

COMMIT;
