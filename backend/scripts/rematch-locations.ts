/**
 * Re-match locations for existing events using the current gazetteer.
 * Updates lat/lon/country/region/geolocation_precision for events where
 * lookupLocation now returns a more specific or different result.
 *
 * Run: npx tsx scripts/rematch-locations.ts
 *
 * By default does a dry-run. Pass --apply to actually update the DB.
 */

import "dotenv/config";
import { pool } from "../src/db/client";
import { lookupLocation, IMPORTANCE_RADIUS } from "../src/utils/gazetteer";

const DRY_RUN = !process.argv.includes("--apply");

interface EventRow {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string | null;
  geolocation_precision: string;
}

async function main() {
  console.log(DRY_RUN ? "DRY RUN — pass --apply to save changes" : "APPLYING changes to DB");
  console.log("");

  const { rows } = await pool.query<EventRow>(
    `SELECT id, title, latitude, longitude, country, region, geolocation_precision FROM events ORDER BY occurred_at DESC`
  );

  console.log(`Checking ${rows.length} events...\n`);

  let changed = 0;
  let skipped = 0;

  for (const ev of rows) {
    const loc = lookupLocation(ev.title);
    if (!loc) { skipped++; continue; }

    const newPrecision = loc.importance === 3 ? "approximate" : "area";
    const latDiff = Math.abs(loc.lat - ev.latitude);
    const lonDiff = Math.abs(loc.lon - ev.longitude);

    // Only update if location changed meaningfully (>0.01° ≈ ~1 km)
    const locationChanged = latDiff > 0.01 || lonDiff > 0.01;
    const metaChanged = loc.country !== ev.country || (loc.region ?? null) !== ev.region;

    if (!locationChanged && !metaChanged) { skipped++; continue; }

    console.log(`[${ev.id.slice(0, 8)}] "${ev.title.slice(0, 60)}"`);
    console.log(`  lat/lon: (${ev.latitude.toFixed(4)}, ${ev.longitude.toFixed(4)}) → (${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)})`);
    console.log(`  country: ${ev.country} → ${loc.country}  region: ${ev.region ?? "-"} → ${loc.region ?? "-"}`);
    console.log(`  precision: ${ev.geolocation_precision} → ${newPrecision}`);
    console.log("");

    if (!DRY_RUN) {
      await pool.query(
        `UPDATE events
         SET latitude = $2, longitude = $3, country = $4, region = $5,
             geolocation_precision = $6, location_radius_km = $7,
             updated_at = NOW()
         WHERE id = $1`,
        [ev.id, loc.lat, loc.lon, loc.country, loc.region ?? null, newPrecision, IMPORTANCE_RADIUS[loc.importance]]
      );
    }

    changed++;
  }

  console.log("─".repeat(60));
  console.log(`Would update: ${changed}  |  unchanged: ${skipped}`);
  if (DRY_RUN && changed > 0) {
    console.log("\nRun with --apply to save changes:");
    console.log("  npx tsx scripts/rematch-locations.ts --apply");
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  pool.end().finally(() => process.exit(1));
});
