import { FastifyInstance } from "fastify";
import { trackingCache } from "../services/trackingCache";

export async function trackingRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/aircraft — live aircraft positions (military + relevant countries)
  app.get("/aircraft", async (_req, reply) => {
    reply.header("Cache-Control", "no-store");
    return { data: trackingCache.getAircraft() };
  });

  // GET /api/vessels — live vessel positions
  app.get("/vessels", async (_req, reply) => {
    reply.header("Cache-Control", "no-store");
    return { data: trackingCache.getVessels() };
  });
}
