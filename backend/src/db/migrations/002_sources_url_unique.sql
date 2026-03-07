-- Add unique constraint on sources.url to prevent duplicate source rows
-- for the same article URL across multiple ingestion runs.
-- NULL urls are excluded (multiple NULLs are allowed).

DO $$
BEGIN
  -- First deduplicate existing rows with the same URL, keeping the oldest
  DELETE FROM sources s1
  USING sources s2
  WHERE s1.url IS NOT NULL
    AND s1.url = s2.url
    AND s1.created_at > s2.created_at;

  -- Then add the constraint if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sources_url_unique'
  ) THEN
    ALTER TABLE sources ADD CONSTRAINT sources_url_unique UNIQUE (url);
  END IF;
END $$;
