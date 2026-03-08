import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { eventsRoutes } from "./routes/events";
import { statsRoutes } from "./routes/stats";
import { timelineRoutes } from "./routes/timeline";
import { sourcesRoutes } from "./routes/sources";
import { mapRoutes } from "./routes/map";
import { trackingRoutes } from "./routes/tracking";
import { analyticsRoutes } from "./routes/analytics";
import { startScheduler } from "./schedulers/ingestionScheduler";
import { startTweetScheduler } from "./schedulers/tweetScheduler";
import { refreshAircraft } from "./providers/adsbProvider";
import { startAisStream } from "./providers/aisProvider";

import { registerClient, clientCount } from "./websocket/wsServer";

const app = Fastify({ logger: { level: "warn" } });

async function main() {
  // CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  // WebSocket support
  await app.register(websocketPlugin);

  // WebSocket endpoint
  app.get("/ws", { websocket: true }, (connection) => {
    registerClient(connection.socket);
    connection.socket.send(
      JSON.stringify({ type: "connected", payload: { clients: clientCount() } })
    );
  });

  // Health check
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    connected_clients: clientCount(),
  }));

  // API routes
  app.register(eventsRoutes, { prefix: "/api" });
  app.register(statsRoutes, { prefix: "/api" });
  app.register(timelineRoutes, { prefix: "/api" });
  app.register(sourcesRoutes, { prefix: "/api" });
  app.register(mapRoutes, { prefix: "/api" });
  app.register(trackingRoutes, { prefix: "/api" });
  app.register(analyticsRoutes, { prefix: "/api" });

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    console.error(error);
    reply.status(500).send({ error: "Internal server error" });
  });

  const port = parseInt(process.env.PORT ?? "4000");
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`Conflict Terminal API running on http://0.0.0.0:${port}`);

  // Start ingestion scheduler
  startScheduler();
  startTweetScheduler();

  // Start live tracking (aircraft every 60s, vessels via persistent WS)
  refreshAircraft().catch(() => {});
  setInterval(() => refreshAircraft().catch(() => {}), 60_000);
  startAisStream();
}

main().catch((err) => {
  console.error("Server startup failed:", err);
  process.exit(1);
});
