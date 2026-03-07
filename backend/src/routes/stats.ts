import { FastifyInstance } from "fastify";
import { EventFiltersSchema } from "../validation/schemas";
import { getStats } from "../services/statsService";

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/stats", async (request, reply) => {
    const parseResult = EventFiltersSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid query params" });
    }
    const stats = await getStats(parseResult.data);
    return { data: stats };
  });
}
