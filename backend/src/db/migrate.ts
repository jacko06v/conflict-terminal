import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "./client";
import "dotenv/config";

const MIGRATIONS = [
  "001_initial.sql",
  "002_sources_url_unique.sql",
  "003_sources_url_unique.sql",
  "004_events_tweeted_at.sql",
];

async function migrate() {
  const client = await pool.connect();
  try {
    // Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // If events table already exists, 001 was applied before we had tracking
    const { rows: tableRows } = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'events'`
    );
    if (tableRows.length > 0) {
      await client.query(
        `INSERT INTO schema_migrations (filename) VALUES ('001_initial.sql') ON CONFLICT DO NOTHING`
      );
    }

    const { rows } = await client.query<{ filename: string }>(
      `SELECT filename FROM schema_migrations`
    );
    const applied = new Set(rows.map((r) => r.filename));

    console.log("Running database migrations...");
    for (const file of MIGRATIONS) {
      if (applied.has(file)) {
        console.log(`  ✓ ${file} (already applied)`);
        continue;
      }
      console.log(`  → ${file}`);
      const sql = readFileSync(join(__dirname, "migrations", file), "utf-8");
      await client.query(sql);
      await client.query(
        `INSERT INTO schema_migrations (filename) VALUES ($1)`,
        [file]
      );
    }
    console.log("Migrations completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
