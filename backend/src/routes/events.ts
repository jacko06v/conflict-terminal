import { FastifyInstance } from "fastify";
import { z } from "zod";
import { EventFiltersSchema, UUIDSchema } from "../validation/schemas";
import {
  getEvents,
  getEventById,
  getNearbyEvents,
} from "../services/eventService";

export async function eventsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/events
  app.get("/events", async (request, reply) => {
    const parseResult = EventFiltersSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid query params", details: parseResult.error.flatten() });
    }
    const events = await getEvents(parseResult.data);
    return { data: events, total: events.length };
  });

  // GET /api/events/:id
  app.get<{ Params: { id: string } }>("/events/:id", async (request, reply) => {
    const idParse = UUIDSchema.safeParse(request.params.id);
    if (!idParse.success) {
      return reply.status(400).send({ error: "Invalid event ID" });
    }

    const event = await getEventById(idParse.data);
    if (!event) {
      return reply.status(404).send({ error: "Event not found" });
    }

    // Fetch nearby events (within 50km)
    const nearby = await getNearbyEvents(
      event.latitude,
      event.longitude,
      50,
      event.id
    );

    return { data: { ...event, nearby } };
  });
}
