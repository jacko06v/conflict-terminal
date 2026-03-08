import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";

const CSV_PATH = path.resolve(process.cwd(), "analytics.csv");

// Write CSV header if file doesn't exist
if (!fs.existsSync(CSV_PATH)) {
  fs.writeFileSync(CSV_PATH, "timestamp,country,city,region,referrer,device\n");
}

function appendRow(row: string[]) {
  const escaped = row.map((v) => `"${(v ?? "").replace(/"/g, '""')}"`);
  fs.appendFileSync(CSV_PATH, escaped.join(",") + "\n");
}

function deviceFromUA(ua: string): string {
  if (/mobile|android|iphone|ipad/i.test(ua)) return "mobile";
  if (/tablet/i.test(ua)) return "tablet";
  return "desktop";
}

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.post("/track", async (req, reply) => {
    try {
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "";

      // Skip localhost/private IPs
      if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
        return reply.send({ ok: true });
      }

      const referrer = (req.body as Record<string, string>)?.referrer ?? "";
      const ua = req.headers["user-agent"] ?? "";
      const device = deviceFromUA(ua);

      // Geolocate via ip-api.com (free, no key, 45 req/min)
      let country = "Unknown", city = "Unknown", region = "Unknown";
      try {
        const geo = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,regionName`, {
          signal: AbortSignal.timeout(3000),
        });
        if (geo.ok) {
          const data = await geo.json() as { country?: string; city?: string; regionName?: string };
          country = data.country ?? "Unknown";
          city    = data.city    ?? "Unknown";
          region  = data.regionName ?? "Unknown";
        }
      } catch {
        // geolocation failed — still log the visit
      }

      appendRow([new Date().toISOString(), country, city, region, referrer, device]);
      return reply.send({ ok: true });
    } catch {
      return reply.send({ ok: true });
    }
  });
}
