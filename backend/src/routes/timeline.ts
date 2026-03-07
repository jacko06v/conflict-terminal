import { FastifyInstance } from "fastify";
import { TimelineRangeSchema } from "../validation/schemas";
import { getTimeline } from "../services/timelineService";

export async function timelineRoutes(app: FastifyInstance): Promise<void> {
  app.get("/timeline", async (request, reply) => {
    const parseResult = TimelineRangeSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid query params" });
    }
    const data = await getTimeline(parseResult.data.range);
    return { data };
  });
}
