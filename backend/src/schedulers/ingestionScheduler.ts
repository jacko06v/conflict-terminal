import cron from "node-cron";
import { pool } from "../db/client";
import { ingestRawItem } from "../services/eventService";
import { IngestionProvider } from "../providers/base";
import { GdeltProvider } from "../providers/gdeltProvider";
import { FirmsProvider } from "../providers/firmsProvider";
import { RssProvider } from "../providers/rssProvider";
import { broadcast } from "../websocket/wsServer";

// Real providers — all free, no LLM, no paid APIs
const providers: IngestionProvider[] = [
  new GdeltProvider(),   // GDELT DOC API — structured news events, no key
  new FirmsProvider(),   // NASA FIRMS satellite thermal — optional key
  new RssProvider(),     // RSS feeds (Al Jazeera, BBC, ToI, MEE)
];

async function runIngestion(provider: IngestionProvider): Promise<void> {
  const runId = await startIngestionRun(provider.name);
  let fetched = 0;
  let created = 0;
  let updated = 0;

  try {
    const items = await provider.fetchRawItems();
    fetched = items.length;

    for (const item of items) {
      const { event, isNew } = await ingestRawItem(item);
      if (isNew) {
        created++;
        broadcast({ type: "new_event", payload: event });
      } else {
        updated++;
        broadcast({ type: "update_event", payload: event });
      }
    }

    await completeIngestionRun(runId, "completed", fetched, created, updated);
    if (fetched > 0) {
      console.log(
        `[${provider.name}] fetched=${fetched} new=${created} updated=${updated}`
      );
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[${provider.name}] failed:`, errMsg);
    await completeIngestionRun(runId, "failed", fetched, created, updated, errMsg);
  }
}

async function startIngestionRun(providerName: string): Promise<string> {
  const result = await pool.query(
    `INSERT INTO ingestion_runs (provider_name, status) VALUES ($1, 'running') RETURNING id`,
    [providerName]
  );
  return result.rows[0].id as string;
}

async function completeIngestionRun(
  id: string,
  status: string,
  fetched: number,
  created: number,
  updated: number,
  errorLog?: string
): Promise<void> {
  await pool.query(
    `UPDATE ingestion_runs
     SET status = $2, completed_at = NOW(),
         records_fetched = $3, records_created = $4, records_updated = $5,
         error_log = $6
     WHERE id = $1`,
    [id, status, fetched, created, updated, errorLog ?? null]
  );
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function startScheduler(): void {
  // GDELT: every 15 minutes (their data refreshes every 15 min)
  cron.schedule("*/15 * * * *", () => {
    runIngestion(providers[0]).catch(console.error);
  });

  // NASA FIRMS: every 30 minutes (NRT data has ~3h latency anyway)
  cron.schedule("*/30 * * * *", () => {
    runIngestion(providers[1]).catch(console.error);
  });

  // RSS feeds: every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    runIngestion(providers[2]).catch(console.error);
  });

  // Stagger startup runs to avoid hitting multiple APIs simultaneously:
  //  RSS immediately, FIRMS after 8s, GDELT after 20s
  console.log("Running initial ingestion (staggered)...");
  const startupOrder: [IngestionProvider, number][] = [
    [providers[2], 0],      // RSS — first, no rate limit
    [providers[1], 8_000],  // FIRMS — 8s later
    [providers[0], 20_000], // GDELT — 20s later, after RSS finishes
  ];
  for (const [provider, waitMs] of startupOrder) {
    delay(waitMs).then(() => runIngestion(provider)).catch(console.error);
  }

  console.log("Ingestion scheduler started (RSS: 5min, GDELT: 15min, FIRMS: 30min).");
}
