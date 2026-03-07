-- Deduplicate sources by URL, then add unique constraint.
-- Keeps the row with the lowest created_at (oldest / first seen).

-- Step 1: remove duplicates keeping oldest row per URL
DELETE FROM event_sources
WHERE source_id IN (
  SELECT s1.id FROM sources s1
  INNER JOIN sources s2
    ON s1.url = s2.url
    AND s1.url IS NOT NULL
    AND s1.created_at > s2.created_at
);

DELETE FROM sources s1
USING sources s2
WHERE s1.url IS NOT NULL
  AND s1.url = s2.url
  AND s1.created_at > s2.created_at;

-- Step 2: add constraint (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sources_url_unique'
  ) THEN
    ALTER TABLE sources ADD CONSTRAINT sources_url_unique UNIQUE (url);
  END IF;
END $$;
