#!/bin/sh
set -e

echo "Running migrations..."
npm run migrate

echo "Running seed..."
npm run seed

# Run backfill only if the events table is empty (first run)
EVENT_COUNT=$(node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT COUNT(*) AS c FROM events')
    .then(r => { console.log(r.rows[0].c); pool.end(); })
    .catch(() => { console.log('0'); pool.end(); });
")

if [ "$EVENT_COUNT" = "0" ]; then
  echo "No events found — running backfill (first run)..."
  npm run backfill
else
  echo "Found $EVENT_COUNT events — skipping backfill."
fi

echo "Starting server..."
exec npm run dev
